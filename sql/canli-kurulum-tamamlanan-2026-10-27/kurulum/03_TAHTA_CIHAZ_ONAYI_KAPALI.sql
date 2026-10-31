-- First installation only, after 01 and 02. Access stays disabled until 05.
BEGIN;
DO $$ BEGIN
 IF to_regprocedure('public.cl_speech_exam_enabled()') IS NULL OR public.cl_speech_exam_enabled() THEN
  RAISE EXCEPTION 'Install 01/02 with speech access disabled before device setup';
 END IF;
END $$;
CREATE TABLE public.classlog_speech_devices (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), secret_hash text UNIQUE NOT NULL,
 request_code text UNIQUE, requested_class text NOT NULL,
 requested_at timestamptz NOT NULL DEFAULT now(), request_expires_at timestamptz NOT NULL,
 approved_by bigint, approved_at timestamptz, class_name text, subject_id text, term_id text,
 label text NOT NULL DEFAULT 'Sınıf tahtası', revoked_at timestamptz
);
CREATE INDEX classlog_speech_devices_context ON public.classlog_speech_devices(class_name,subject_id,term_id);
CREATE INDEX classlog_speech_devices_requests ON public.classlog_speech_devices(requested_class,requested_at);
ALTER TABLE public.classlog_speech_devices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.classlog_speech_devices FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.cl_speech_scope_topic(p_class text,p_subject text,p_term text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path=pg_catalog,public,extensions,pg_temp AS $$
 SELECT 'speech_scope_'||encode(digest(jsonb_build_array(p_class,p_subject,p_term)::text,'sha256'),'hex')
$$;
CREATE FUNCTION public.cl_speech_device_signal(p_topic text,p_revision integer DEFAULT 0) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,extensions,pg_temp AS $$
BEGIN
 PERFORM realtime.send(jsonb_build_object('revision',p_revision),'changed',p_topic,false);
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Speech notification unavailable';
END $$;

-- Every change notifies the approved class device, including exam finish.
CREATE OR REPLACE FUNCTION public.cl_speech_exam_signal(p_topic uuid,p_revision integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,extensions,pg_temp AS $$
DECLARE e public.classlog_speech_exams%ROWTYPE;
BEGIN
 PERFORM public.cl_speech_device_signal('speech_change_'||p_topic::text,p_revision);
 SELECT * INTO e FROM public.classlog_speech_exams WHERE signal_topic=p_topic;
 IF FOUND THEN PERFORM public.cl_speech_device_signal(public.cl_speech_scope_topic(e.class_name,e.subject_id,e.term_id),p_revision); END IF;
END $$;

-- Insert notification is deferred until the exam and its results commit.
CREATE FUNCTION public.cl_speech_exam_created_signal() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,extensions,pg_temp AS $$
BEGIN
 PERFORM public.cl_speech_device_signal(public.cl_speech_scope_topic(NEW.class_name,NEW.subject_id,NEW.term_id),NEW.revision);
 RETURN NEW;
END $$;
CREATE TRIGGER classlog_speech_exam_created AFTER INSERT ON public.classlog_speech_exams
 FOR EACH ROW EXECUTE FUNCTION public.cl_speech_exam_created_signal();

CREATE FUNCTION public.cl_speech_device_rpc(p_action text,p_device_secret text DEFAULT NULL,p_teacher_token text DEFAULT NULL,p_payload jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,extensions,pg_temp AS $$
DECLARE
 d public.classlog_speech_devices%ROWTYPE; t public.classlog_teachers%ROWTYPE;
 s public.classlog_sessions%ROWTYPE; e public.classlog_speech_exams%ROWTYPE;
 h text; c text; sub text; term text; code text; value jsonb; topic text;
BEGIN
 IF NOT public.cl_speech_exam_enabled() THEN RETURN jsonb_build_object('ok',false,'reason','disabled'); END IF;
 IF p_payload IS NULL OR jsonb_typeof(p_payload)<>'object' THEN RETURN jsonb_build_object('ok',false,'reason','invalid'); END IF;
 IF p_action IN ('request','read') THEN
  IF p_device_secret IS NULL OR p_device_secret !~ '^[0-9a-f]{64}$' THEN RETURN jsonb_build_object('ok',false,'reason','unauthorized'); END IF;
  SELECT class_name INTO c FROM public.classlog_parent_links WHERE token=p_payload->>'parentToken' AND active=true;
  IF c IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','unauthorized'); END IF;
  h:=encode(digest(p_device_secret,'sha256'),'hex'); topic:='speech_device_'||h;
  SELECT * INTO d FROM public.classlog_speech_devices WHERE secret_hash=h;
  IF FOUND AND (d.revoked_at IS NOT NULL OR d.requested_class<>c) THEN RETURN jsonb_build_object('ok',false,'reason','unauthorized'); END IF;
  IF p_action='request' AND d.approved_at IS NULL THEN
   -- A valid parent link may request approval, never approve itself or read grades.
   -- Limit request creation/renewal for that class to 20 per hour.
   IF d.id IS NOT NULL AND d.request_expires_at>now() THEN
    RETURN jsonb_build_object('ok',true,'value',jsonb_build_object('status','pending','code',d.request_code,'deviceTopic',topic,'expiresAt',floor(extract(epoch FROM d.request_expires_at)*1000)));
   END IF;
   IF (SELECT count(*) FROM public.classlog_speech_devices WHERE requested_class=c AND requested_at>now()-interval '1 hour')>=20 THEN
    RETURN jsonb_build_object('ok',false,'reason','rate_limit');
   END IF;
   code:=upper(encode(gen_random_bytes(4),'hex'));
   IF d.id IS NULL THEN
    INSERT INTO public.classlog_speech_devices(secret_hash,request_code,requested_class,request_expires_at)
     VALUES(h,code,c,now()+interval '10 minutes') RETURNING * INTO d;
   ELSE
    UPDATE public.classlog_speech_devices SET request_code=code,requested_at=now(),request_expires_at=now()+interval '10 minutes'
     WHERE id=d.id RETURNING * INTO d;
   END IF;
  END IF;
  IF d.id IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','unauthorized'); END IF;
  IF d.approved_at IS NULL THEN
   RETURN jsonb_build_object('ok',true,'value',jsonb_build_object('status',CASE WHEN d.request_expires_at>now() THEN 'pending' ELSE 'expired' END,
    'code',CASE WHEN d.request_expires_at>now() THEN d.request_code ELSE NULL END,'deviceTopic',topic,'expiresAt',floor(extract(epoch FROM d.request_expires_at)*1000)));
  END IF;
  SELECT * INTO t FROM public.classlog_teachers WHERE id=d.approved_by AND active=true;
  IF t.id IS NULL OR d.class_name<>c OR NOT COALESCE(public.cl_is_teacher_authorized(t,d.class_name,d.subject_id),false) THEN
   RETURN jsonb_build_object('ok',false,'reason','unauthorized');
  END IF;
  SELECT * INTO e FROM public.classlog_speech_exams WHERE class_name=d.class_name AND subject_id=d.subject_id AND term_id=d.term_id AND status='active';
  RETURN jsonb_build_object('ok',true,'value',jsonb_build_object('status','approved','deviceTopic',topic,
   'scopeTopic',public.cl_speech_scope_topic(d.class_name,d.subject_id,d.term_id),
   'exam',CASE WHEN e.id IS NULL THEN NULL ELSE public.cl_speech_exam_snapshot(e.id,true) END));
 END IF;

 s:=public.cl_get_session_row(p_teacher_token); t:=public.cl_check_session(p_teacher_token);
 IF s.id IS NULL OR t.id IS NULL OR s.session_kind IS DISTINCT FROM 'teacher' THEN RETURN jsonb_build_object('ok',false,'reason','unauthorized'); END IF;
 IF p_action='revoke' THEN
  SELECT * INTO d FROM public.classlog_speech_devices WHERE id=(p_payload->>'id')::uuid FOR UPDATE;
  IF d.id IS NULL OR NOT COALESCE(public.cl_is_teacher_authorized(t,d.class_name,d.subject_id),false) THEN RETURN jsonb_build_object('ok',false,'reason','forbidden'); END IF;
  UPDATE public.classlog_speech_devices SET revoked_at=now() WHERE id=d.id;
  PERFORM public.cl_speech_device_signal('speech_device_'||d.secret_hash);
  RETURN jsonb_build_object('ok',true,'value',true);
 END IF;
 c:=nullif(btrim(p_payload->>'className'),''); sub:=nullif(btrim(p_payload->>'subjectId'),'');
 term:=COALESCE(nullif(p_payload->>'termId',''),public.cl_get_settings_blob()->>'activeTermId','');
 IF c IS NULL OR sub IS NULL OR NOT COALESCE(public.cl_is_teacher_authorized(t,c,sub),false) THEN RETURN jsonb_build_object('ok',false,'reason','forbidden'); END IF;
 IF p_action='list' THEN
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id',id,'label',label,'approvedAt',approved_at) ORDER BY approved_at),'[]') INTO value
   FROM public.classlog_speech_devices WHERE class_name=c AND subject_id=sub AND term_id=term AND approved_at IS NOT NULL AND revoked_at IS NULL;
  RETURN jsonb_build_object('ok',true,'value',value);
 END IF;
 IF p_action='approve' THEN
  code:=upper(regexp_replace(COALESCE(p_payload->>'code',''),'[^A-Za-z0-9]','','g'));
  SELECT * INTO d FROM public.classlog_speech_devices WHERE request_code=code AND request_expires_at>now() AND approved_at IS NULL AND revoked_at IS NULL FOR UPDATE;
  IF d.id IS NULL OR d.requested_class<>c THEN RETURN jsonb_build_object('ok',false,'reason','code'); END IF;
  UPDATE public.classlog_speech_devices SET approved_by=t.id,approved_at=now(),class_name=c,subject_id=sub,term_id=term,
   label=COALESCE(nullif(left(btrim(p_payload->>'label'),60),''),'Sınıf tahtası'),request_code=NULL WHERE id=d.id;
  PERFORM public.cl_speech_device_signal('speech_device_'||d.secret_hash);
  RETURN jsonb_build_object('ok',true,'value',true);
 END IF;
 RETURN jsonb_build_object('ok',false,'reason','invalid');
EXCEPTION WHEN unique_violation THEN RETURN jsonb_build_object('ok',false,'reason','retry');
 WHEN invalid_text_representation THEN RETURN jsonb_build_object('ok',false,'reason','invalid');
END $$;
REVOKE ALL ON FUNCTION public.cl_speech_scope_topic(text,text,text),public.cl_speech_device_signal(text,integer),public.cl_speech_exam_created_signal(),public.cl_speech_device_rpc(text,text,text,jsonb) FROM PUBLIC,anon,authenticated;
-- Device RPC remains inaccessible until explicit activation (05).
NOTIFY pgrst, 'reload schema';
COMMIT;
