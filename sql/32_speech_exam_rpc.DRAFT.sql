-- REVIEW DRAFT; depends on 31. No changes to existing auth, kiosk or class data.
-- Three independent gates remain CLOSED: entry.js, api.mjs, and this function.
BEGIN;
CREATE FUNCTION public.cl_speech_exam_enabled() RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $$ SELECT false $$;

-- Internal serializer. Board callers get only the active student, never roster/history.
CREATE FUNCTION public.cl_speech_exam_snapshot(p_id uuid,p_board boolean DEFAULT false) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,extensions,pg_temp AS $$
 SELECT jsonb_build_object('id',e.id,'className',e.class_name,'subjectId',e.subject_id,
 'termId',e.term_id,'date',e.exam_date,'status',e.status,'revision',e.revision,'topic',e.signal_topic,
 'activeStudentId',e.active_student_id,'rubric',e.rubric,
 'students',CASE WHEN p_board THEN COALESCE((SELECT jsonb_agg(s) FROM jsonb_array_elements(e.students) s WHERE s->>'id'=e.active_student_id::text),'[]') ELSE e.students END,
 'results',COALESCE((SELECT jsonb_object_agg(r.student_id::text,jsonb_build_object('scores',r.scores,'revision',r.revision))
 FROM public.classlog_speech_results r WHERE r.exam_id=e.id AND (NOT p_board OR r.student_id=e.active_student_id)),'{}'))
 FROM public.classlog_speech_exams e WHERE e.id=p_id
$$;

-- Optional signal transport: no personal information or credentials in payload.
-- Public invalidation channels do not authorize reads. Only the RPC does.
CREATE FUNCTION public.cl_speech_exam_signal(p_topic uuid,p_revision integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,extensions,pg_temp AS $$
BEGIN
 IF to_regprocedure('realtime.send(jsonb,text,text,boolean)') IS NOT NULL THEN
  PERFORM realtime.send(jsonb_build_object('revision',p_revision),'changed','speech_change_'||p_topic::text,false);
 END IF;
EXCEPTION WHEN OTHERS THEN
 -- A notification outage must not roll back a successful grade write.
 RAISE WARNING 'Speech exam notification unavailable';
END $$;

CREATE FUNCTION public.cl_speech_exam_rpc(p_token text,p_action text,p_payload jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,extensions,pg_temp AS $$
DECLARE
 v_teacher public.classlog_teachers%ROWTYPE; v_session public.classlog_sessions%ROWTYPE;
 v_exam public.classlog_speech_exams%ROWTYPE; v_result public.classlog_speech_results%ROWTYPE;
 v_grant public.classlog_speech_board_grants%ROWTYPE; v_class text; v_subject text; v_term text;
 v_students jsonb; v_rubric jsonb; v_value jsonb; v_scores jsonb; v_patch jsonb; v_key text; v_score jsonb;
 v_student uuid; v_mutation uuid; v_id uuid; v_secret text; v_expiry timestamptz;
BEGIN
 IF NOT public.cl_speech_exam_enabled() THEN RETURN jsonb_build_object('ok',false,'reason','disabled'); END IF;
 IF p_token IS NULL OR length(p_token)<16 OR length(p_token)>512 OR p_payload IS NULL OR jsonb_typeof(p_payload)<>'object' THEN
  RETURN jsonb_build_object('ok',false,'reason','unauthorized');
 END IF;

 IF p_action='board' THEN
  SELECT * INTO v_grant FROM public.classlog_speech_board_grants
  WHERE token_hash=encode(digest(p_token,'sha256'),'hex') AND revoked_at IS NULL AND expires_at>now();
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'reason','unauthorized'); END IF;
  SELECT * INTO v_session FROM public.classlog_sessions WHERE id=v_grant.issuer_session_id AND session_kind='teacher' AND expires_at>now();
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'reason','unauthorized'); END IF;
  v_teacher:=public.cl_check_session(v_session.token);
  SELECT * INTO v_exam FROM public.classlog_speech_exams WHERE id=v_grant.exam_id;
  IF NOT COALESCE(public.cl_is_teacher_authorized(v_teacher,v_exam.class_name,v_exam.subject_id),false) THEN
   RETURN jsonb_build_object('ok',false,'reason','unauthorized');
  END IF;
  IF v_exam.status<>'active' THEN RETURN jsonb_build_object('ok',true,'value',jsonb_build_object('id',v_exam.id,'status','finished')); END IF;
  v_value:=public.cl_speech_exam_snapshot(v_exam.id,true)||jsonb_build_object('expiresAt',floor(extract(epoch FROM least(v_grant.expires_at,v_session.expires_at))*1000));
  RETURN jsonb_build_object('ok',true,'value',v_value);
 END IF;

 v_session:=public.cl_get_session_row(p_token); v_teacher:=public.cl_check_session(p_token);
 IF v_teacher.id IS NULL OR v_session.id IS NULL OR v_session.session_kind IS DISTINCT FROM 'teacher' THEN
  RETURN jsonb_build_object('ok',false,'reason','unauthorized');
 END IF;
 IF p_action IN ('list','create') THEN
  v_class:=nullif(btrim(p_payload->>'className'),''); v_subject:=nullif(btrim(p_payload->>'subjectId'),'');
  v_term:=COALESCE(nullif(p_payload->>'termId',''),public.cl_get_settings_blob()->>'activeTermId','');
  IF v_class IS NULL OR v_subject IS NULL OR NOT COALESCE(public.cl_is_teacher_authorized(v_teacher,v_class,v_subject),false) THEN
   RETURN jsonb_build_object('ok',false,'reason','forbidden');
  END IF;
  IF p_action='list' THEN
   SELECT COALESCE(jsonb_agg(jsonb_build_object('id',id,'date',exam_date,'status',status) ORDER BY created_at DESC),'[]') INTO v_value
   FROM public.classlog_speech_exams WHERE class_name=v_class AND subject_id=v_subject AND term_id=v_term;
   RETURN jsonb_build_object('ok',true,'value',v_value);
  END IF;
  IF v_term<>COALESCE(public.cl_get_settings_blob()->>'activeTermId','') THEN RETURN jsonb_build_object('ok',false,'reason','archive'); END IF;
  SELECT students INTO v_students FROM public.classlog_storage WHERE id=public.cl_term_prefix(nullif(v_term,''))||v_class;
  IF v_students IS NULL OR jsonb_typeof(v_students)<>'array' OR jsonb_array_length(v_students)=0 OR jsonb_array_length(v_students)>1000 THEN
   RETURN jsonb_build_object('ok',false,'reason','roster');
  END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(v_students) s WHERE jsonb_typeof(s)<>'string') THEN RETURN jsonb_build_object('ok',false,'reason','roster'); END IF;
  SELECT jsonb_agg(jsonb_build_object('id',gen_random_uuid(),'name',name) ORDER BY ord) INTO v_students
  FROM jsonb_array_elements_text(v_students) WITH ORDINALITY AS s(name,ord);
  SELECT jsonb_build_object('version',version,'criteria',criteria) INTO v_rubric FROM public.classlog_speech_rubrics WHERE version='tr-speaking-1';
  IF v_rubric IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','rubric'); END IF;
  INSERT INTO public.classlog_speech_exams(class_name,subject_id,term_id,exam_date,rubric,students,created_by)
  VALUES(v_class,v_subject,v_term,(p_payload->>'date')::date,v_rubric,v_students,v_teacher.id) RETURNING * INTO v_exam;
  INSERT INTO public.classlog_speech_results(exam_id,student_id) SELECT v_exam.id,(s->>'id')::uuid FROM jsonb_array_elements(v_students) s;
  RETURN jsonb_build_object('ok',true,'value',public.cl_speech_exam_snapshot(v_exam.id));
 END IF;

 v_id:=(p_payload->>'id')::uuid;
 SELECT * INTO v_exam FROM public.classlog_speech_exams WHERE id=v_id FOR UPDATE;
 IF NOT FOUND OR NOT COALESCE(public.cl_is_teacher_authorized(v_teacher,v_exam.class_name,v_exam.subject_id),false) THEN
  RETURN jsonb_build_object('ok',false,'reason','forbidden');
 END IF;
 IF p_action='get' THEN RETURN jsonb_build_object('ok',true,'value',public.cl_speech_exam_snapshot(v_exam.id)); END IF;
 IF p_action='revoke_board' THEN
  UPDATE public.classlog_speech_board_grants SET revoked_at=now() WHERE exam_id=v_id AND revoked_at IS NULL;
  PERFORM public.cl_speech_exam_signal(v_exam.signal_topic,v_exam.revision);
  RETURN jsonb_build_object('ok',true,'value',true);
 END IF;
 IF p_action='finish' AND v_exam.status='finished' THEN RETURN jsonb_build_object('ok',true,'value',public.cl_speech_exam_snapshot(v_id)); END IF;
 IF v_exam.status<>'active' THEN RETURN jsonb_build_object('ok',false,'reason','finished'); END IF;
 IF p_action='issue_board' THEN
  v_secret:=encode(gen_random_bytes(32),'hex'); v_expiry:=least(now()+interval '15 minutes',v_session.expires_at);
  UPDATE public.classlog_speech_board_grants SET revoked_at=now() WHERE exam_id=v_id AND revoked_at IS NULL;
  INSERT INTO public.classlog_speech_board_grants(token_hash,exam_id,issuer_session_id,expires_at)
  VALUES(encode(digest(v_secret,'sha256'),'hex'),v_id,v_session.id,v_expiry);
  PERFORM public.cl_speech_exam_signal(v_exam.signal_topic,v_exam.revision);
  RETURN jsonb_build_object('ok',true,'value',jsonb_build_object('token',v_secret,'expiresAt',floor(extract(epoch FROM v_expiry)*1000)));
 END IF;
 IF p_action='save' THEN
  v_student:=(p_payload->>'studentId')::uuid; v_mutation:=(p_payload->>'mutationId')::uuid; v_patch:=p_payload->'patch';
  IF v_mutation IS NULL OR v_patch IS NULL OR jsonb_typeof(v_patch)<>'object' OR v_patch='{}'::jsonb THEN RETURN jsonb_build_object('ok',false,'reason','invalid'); END IF;
  SELECT * INTO v_result FROM public.classlog_speech_results WHERE exam_id=v_id AND student_id=v_student FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'reason','student'); END IF;
  IF v_result.last_mutation_id=v_mutation AND v_result.last_patch=v_patch THEN
   RETURN jsonb_build_object('ok',true,'value',jsonb_build_object('revision',v_result.revision,'examRevision',v_exam.revision,'activeStudentId',v_exam.active_student_id));
  END IF;
  IF v_result.revision IS DISTINCT FROM (p_payload->>'expectedRevision')::integer THEN RETURN jsonb_build_object('ok',false,'reason','conflict'); END IF;
  v_scores:=v_result.scores;
  FOR v_key,v_score IN SELECT * FROM jsonb_each(v_patch) LOOP
   IF v_key !~ '^[0-9]$' OR jsonb_typeof(v_score)<>'number' OR v_score::text !~ '^([1-9]|10)$' THEN RETURN jsonb_build_object('ok',false,'reason','invalid'); END IF;
   v_scores:=jsonb_set(v_scores,ARRAY[v_key],v_score,false);
  END LOOP;
  UPDATE public.classlog_speech_results SET scores=v_scores,revision=revision+1,last_mutation_id=v_mutation,last_patch=v_patch,updated_at=now()
  WHERE exam_id=v_id AND student_id=v_student RETURNING * INTO v_result;
  -- Completing a student's rubric clears the board selection, never the exam or scores.
  UPDATE public.classlog_speech_exams SET revision=revision+1,
   active_student_id=CASE WHEN active_student_id=v_student AND NOT v_scores @> '[null]'::jsonb THEN NULL ELSE active_student_id END
   WHERE id=v_id RETURNING * INTO v_exam;
  v_value:=jsonb_build_object('revision',v_result.revision,'examRevision',v_exam.revision,'activeStudentId',v_exam.active_student_id);
 ELSIF p_action IN ('select','finish') THEN
  IF v_exam.revision IS DISTINCT FROM (p_payload->>'expectedRevision')::integer THEN RETURN jsonb_build_object('ok',false,'reason','conflict'); END IF;
  IF p_action='select' THEN
   v_student:=(p_payload->>'studentId')::uuid;
   IF v_student IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.classlog_speech_results WHERE exam_id=v_id AND student_id=v_student) THEN RETURN jsonb_build_object('ok',false,'reason','student'); END IF;
   UPDATE public.classlog_speech_exams SET active_student_id=v_student,revision=revision+1 WHERE id=v_id RETURNING * INTO v_exam;
  ELSE
   UPDATE public.classlog_speech_exams SET status='finished',active_student_id=NULL,finished_at=now(),revision=revision+1 WHERE id=v_id RETURNING * INTO v_exam;
   -- Existing board grants may read only the non-personal 'finished' response
   -- until their normal expiry; no scores remain accessible after completion.
  END IF;
  v_value:=public.cl_speech_exam_snapshot(v_id);
 ELSE RETURN jsonb_build_object('ok',false,'reason','invalid');
 END IF;
 PERFORM public.cl_speech_exam_signal(v_exam.signal_topic,v_exam.revision);
 RETURN jsonb_build_object('ok',true,'value',v_value);
EXCEPTION
 WHEN unique_violation THEN RETURN jsonb_build_object('ok',false,'reason','conflict');
 WHEN invalid_text_representation OR datetime_field_overflow OR check_violation OR not_null_violation THEN RETURN jsonb_build_object('ok',false,'reason','invalid');
END $$;
REVOKE ALL ON FUNCTION public.cl_speech_exam_enabled(),public.cl_speech_exam_snapshot(uuid,boolean),public.cl_speech_exam_signal(uuid,integer),public.cl_speech_exam_rpc(text,text,jsonb) FROM PUBLIC,anon,authenticated;
-- NO GRANT in this draft. Release is a separate, reviewed manual step.
-- Do not add grade tables to a public Realtime publication.
COMMIT;
