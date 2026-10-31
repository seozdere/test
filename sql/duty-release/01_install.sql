-- NoTik Nöbet v1. Eklemeli kurulum. Üretimde yalnızca kullanıcı çalıştırır.
-- Aynı sürüm tekrar kurulabilir; kurulum erişimi kapatır, kayıtları silmez.
BEGIN;
DO $$ BEGIN
 IF to_regclass('public.classlog_storage') IS NULL
 OR to_regclass('public.classlog_parent_links') IS NULL
 OR to_regprocedure('public.cl_check_session(text)') IS NULL
 OR to_regprocedure('public.cl_get_session_row(text)') IS NULL
 OR to_regprocedure('public.cl_is_teacher_authorized(public.classlog_teachers,text,text)') IS NULL
 OR to_regprocedure('public.cl_get_settings_blob()') IS NULL
 OR to_regprocedure('public.cl_term_prefix(text)') IS NULL THEN
 RAISE EXCEPTION 'NoTik temel şema/yetki bağımlılıkları eksik. Kurulum geri alındı.'; END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.classlog_duty_years (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_name text NOT NULL, label text NOT NULL,
 starts_on date NOT NULL, ends_on date NOT NULL, term_ids text[] NOT NULL,
 daily_count smallint NOT NULL DEFAULT 2 CHECK(daily_count BETWEEN 1 AND 3),
 use_reserve boolean NOT NULL DEFAULT true, archived boolean NOT NULL DEFAULT false,
 revision bigint NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(ends_on>=starts_on AND ends_on-starts_on<=400), UNIQUE(class_name,starts_on)
);
CREATE TABLE IF NOT EXISTS public.classlog_duty_roster (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), year_id uuid NOT NULL REFERENCES public.classlog_duty_years(id),
 source_name text NOT NULL, display_name text NOT NULL, joined_on date NOT NULL, left_on date,
 created_at timestamptz NOT NULL DEFAULT now(), CHECK(left_on IS NULL OR left_on>=joined_on),
 UNIQUE(year_id,id), UNIQUE(year_id,source_name)
);
ALTER TABLE public.classlog_duty_years ADD COLUMN IF NOT EXISTS roster_dirty boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS public.classlog_duty_exemptions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), year_id uuid NOT NULL, student_id uuid NOT NULL,
 starts_on date NOT NULL, ends_on date, reason text NOT NULL DEFAULT '',
 kind text NOT NULL DEFAULT 'inactive' CHECK(kind IN ('inactive','exempt')),
 revoked boolean NOT NULL DEFAULT false, CHECK(ends_on IS NULL OR ends_on>=starts_on),
 FOREIGN KEY(year_id,student_id) REFERENCES public.classlog_duty_roster(year_id,id)
);
CREATE TABLE IF NOT EXISTS public.classlog_duty_rounds (
 year_id uuid NOT NULL REFERENCES public.classlog_duty_years(id), number integer NOT NULL CHECK(number>0),
 opened_on date NOT NULL, PRIMARY KEY(year_id,number)
);
CREATE TABLE IF NOT EXISTS public.classlog_duty_round_members (
 year_id uuid NOT NULL, round_no integer NOT NULL, student_id uuid NOT NULL, eligible_on date NOT NULL,
 PRIMARY KEY(year_id,round_no,student_id),
 FOREIGN KEY(year_id,round_no) REFERENCES public.classlog_duty_rounds(year_id,number),
 FOREIGN KEY(year_id,student_id) REFERENCES public.classlog_duty_roster(year_id,id)
);
CREATE TABLE IF NOT EXISTS public.classlog_duty_days (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), year_id uuid NOT NULL REFERENCES public.classlog_duty_years(id), day date NOT NULL,
 kind text NOT NULL DEFAULT 'school' CHECK(kind IN ('school','holiday','half_day','closed')),
 reason text NOT NULL DEFAULT '', publication text NOT NULL DEFAULT 'draft' CHECK(publication IN ('draft','published','closed')),
 revision bigint NOT NULL DEFAULT 1, UNIQUE(year_id,day), UNIQUE(year_id,id)
);
CREATE TABLE IF NOT EXISTS public.classlog_duty_assignments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), year_id uuid NOT NULL, day_id uuid NOT NULL, student_id uuid NOT NULL,
 slot smallint NOT NULL CHECK(slot BETWEEN 0 AND 3), round_no integer, name_snapshot text NOT NULL,
 status text NOT NULL DEFAULT 'planned' CHECK(status IN ('planned','pending','completed','not_completed','cancelled')),
 is_current boolean NOT NULL DEFAULT true, replaces uuid REFERENCES public.classlog_duty_assignments(id),
 confirmed_by bigint, confirmed_at timestamptz, explanation text NOT NULL DEFAULT '',
 FOREIGN KEY(year_id,day_id) REFERENCES public.classlog_duty_days(year_id,id),
 FOREIGN KEY(year_id,student_id) REFERENCES public.classlog_duty_roster(year_id,id),
 FOREIGN KEY(year_id,round_no) REFERENCES public.classlog_duty_rounds(year_id,number),
 CHECK(status<>'completed' OR (slot>0 AND confirmed_by IS NOT NULL AND confirmed_at IS NOT NULL))
);
-- Each day's capacity is a snapshot. Settings affect newly generated plans only.
ALTER TABLE public.classlog_duty_days ADD COLUMN IF NOT EXISTS daily_count smallint CHECK(daily_count BETWEEN 1 AND 3);
UPDATE public.classlog_duty_days d SET daily_count=y.daily_count FROM public.classlog_duty_years y WHERE y.id=d.year_id AND d.daily_count IS NULL;
ALTER TABLE public.classlog_duty_days ALTER COLUMN daily_count SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS cl_duty_current_slot ON public.classlog_duty_assignments(day_id,slot) WHERE is_current;
CREATE UNIQUE INDEX IF NOT EXISTS cl_duty_current_student ON public.classlog_duty_assignments(day_id,student_id) WHERE is_current;
CREATE UNIQUE INDEX IF NOT EXISTS cl_duty_completed_student ON public.classlog_duty_assignments(day_id,student_id) WHERE status='completed';
CREATE UNIQUE INDEX IF NOT EXISTS cl_duty_completed_slot ON public.classlog_duty_assignments(day_id,slot) WHERE status='completed';
CREATE INDEX IF NOT EXISTS cl_duty_student_results ON public.classlog_duty_assignments(year_id,student_id,status);
CREATE INDEX IF NOT EXISTS cl_duty_exempt_dates ON public.classlog_duty_exemptions(year_id,student_id,starts_on);
CREATE TABLE IF NOT EXISTS public.classlog_duty_audit_log (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, year_id uuid NOT NULL REFERENCES public.classlog_duty_years(id),
 operation_id uuid NOT NULL UNIQUE, actor_id bigint NOT NULL, action text NOT NULL, reason text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(), revision bigint NOT NULL,
 request jsonb NOT NULL, before_value jsonb NOT NULL, after_value jsonb NOT NULL,
 algorithm text NOT NULL DEFAULT 'duty-1', seed text, result jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS cl_duty_audit_year ON public.classlog_duty_audit_log(year_id,revision);

CREATE OR REPLACE FUNCTION public.cl_duty_enabled() RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $$ SELECT false $$;
CREATE OR REPLACE FUNCTION public.cl_duty_today() RETURNS date LANGUAGE sql STABLE SET search_path=pg_catalog AS $$ SELECT (now() AT TIME ZONE 'Europe/Istanbul')::date $$;
CREATE OR REPLACE FUNCTION public.cl_duty_diff(p_before jsonb,p_after jsonb) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog AS $$
DECLARE k text; v jsonb; output jsonb:='{}';
BEGIN
 FOR k,v IN SELECT * FROM jsonb_each(p_before) LOOP
  IF v IS NOT DISTINCT FROM p_after->k THEN CONTINUE; END IF;
  IF jsonb_typeof(v)='array' THEN
   SELECT COALESCE(jsonb_agg(x),'[]') INTO v FROM jsonb_array_elements(v) x WHERE NOT COALESCE(p_after->k,'[]') @> jsonb_build_array(x);
  END IF;
  output:=output||jsonb_build_object(k,v);
 END LOOP;
 RETURN output;
END $$;
CREATE OR REPLACE FUNCTION public.cl_duty_eligible(p_year uuid,p_student uuid,p_day date) RETURNS boolean
LANGUAGE sql STABLE SET search_path=pg_catalog,public AS $$
 SELECT EXISTS(SELECT 1 FROM public.classlog_duty_roster r WHERE r.year_id=p_year AND r.id=p_student
 AND r.joined_on<=p_day AND (r.left_on IS NULL OR r.left_on>p_day)
 AND NOT EXISTS(SELECT 1 FROM public.classlog_duty_exemptions e WHERE e.year_id=p_year AND e.student_id=r.id
 AND NOT e.revoked AND e.starts_on<=p_day AND (e.ends_on IS NULL OR e.ends_on>=p_day)))
$$;

CREATE OR REPLACE FUNCTION public.cl_duty_progress(p_year uuid,p_published boolean DEFAULT false) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 WITH credits AS (
  SELECT r.id,(SELECT count(*) FROM public.classlog_duty_assignments a JOIN public.classlog_duty_days d ON d.id=a.day_id WHERE a.student_id=r.id AND a.status='completed' AND (NOT p_published OR d.publication<>'draft')) AS done
  FROM public.classlog_duty_roster r WHERE r.year_id=p_year
 ), rights AS (
  SELECT m.student_id,m.round_no,row_number() OVER(PARTITION BY m.student_id ORDER BY m.round_no) AS ordinal
  FROM public.classlog_duty_round_members m WHERE m.year_id=p_year AND public.cl_duty_eligible(p_year,m.student_id,m.eligible_on)
 ), next_right AS (
  SELECT c.id,c.done,(SELECT min(round_no) FROM rights r WHERE r.student_id=c.id AND r.ordinal>c.done) AS next_round FROM credits c
 ), active_round AS (
  SELECT COALESCE(min(next_round) FILTER(WHERE public.cl_duty_eligible(p_year,id,public.cl_duty_today())),(SELECT COALESCE(max(round_no),0)+1 FROM rights)) AS number FROM next_right
 ) SELECT jsonb_build_object('round',ar.number,'students',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',n.id,'next_round',n.next_round,'completed',EXISTS(SELECT 1 FROM rights r WHERE r.student_id=n.id AND r.round_no=ar.number AND r.ordinal<=n.done),'member',EXISTS(SELECT 1 FROM rights r WHERE r.student_id=n.id AND r.round_no=ar.number))) FROM next_right n),'[]')) FROM active_round ar
$$;

CREATE OR REPLACE FUNCTION public.cl_duty_snapshot(p_year uuid,p_parent boolean DEFAULT false) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT jsonb_build_object('year',to_jsonb(y),'today',public.cl_duty_today(),'progress',public.cl_duty_progress(p_year,p_parent),
 'source_names',CASE WHEN p_parent THEN '[]'::jsonb ELSE COALESCE((SELECT s.students FROM public.classlog_storage s WHERE s.id=public.cl_term_prefix(NULLIF(COALESCE(public.cl_get_settings_blob()->>'activeTermId',''),''))||y.class_name),'[]') END,
 'roster',COALESCE((SELECT jsonb_agg(CASE WHEN p_parent THEN jsonb_build_object('id',r.id,'display_name',r.display_name) ELSE to_jsonb(r) END ORDER BY r.display_name) FROM public.classlog_duty_roster r WHERE r.year_id=y.id),'[]'),
 'days',COALESCE((SELECT jsonb_agg(CASE WHEN p_parent THEN to_jsonb(d)-'reason' ELSE to_jsonb(d) END ORDER BY d.day) FROM public.classlog_duty_days d WHERE d.year_id=y.id AND (NOT p_parent OR d.publication<>'draft')),'[]'),
 'assignments',COALESCE((SELECT jsonb_agg(CASE WHEN p_parent THEN jsonb_build_object('id',a.id,'day_id',a.day_id,'student_id',a.student_id,'slot',a.slot,'status',CASE WHEN a.status='planned' AND d.day<public.cl_duty_today() THEN 'pending' ELSE a.status END,'is_current',a.is_current,'name_snapshot',a.name_snapshot) ELSE to_jsonb(a) END ORDER BY d.day,a.slot)
 FROM public.classlog_duty_assignments a JOIN public.classlog_duty_days d ON d.id=a.day_id WHERE a.year_id=y.id AND (NOT p_parent OR (d.publication<>'draft' AND a.is_current))),'[]'),
 'counts',COALESCE((SELECT jsonb_object_agg(r.id::text,(SELECT count(*) FROM public.classlog_duty_assignments a JOIN public.classlog_duty_days d ON d.id=a.day_id WHERE a.student_id=r.id AND a.status='completed' AND (NOT p_parent OR d.publication<>'draft'))) FROM public.classlog_duty_roster r WHERE r.year_id=y.id),'{}'),
 'exemptions',CASE WHEN p_parent THEN '[]'::jsonb ELSE COALESCE((SELECT jsonb_agg(to_jsonb(e)) FROM public.classlog_duty_exemptions e WHERE e.year_id=y.id),'[]') END,
 'rounds',CASE WHEN p_parent THEN '[]'::jsonb ELSE COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.number) FROM public.classlog_duty_rounds t WHERE t.year_id=y.id),'[]') END,
 'members',CASE WHEN p_parent THEN '[]'::jsonb ELSE COALESCE((SELECT jsonb_agg(to_jsonb(m)) FROM public.classlog_duty_round_members m WHERE m.year_id=y.id),'[]') END)
 FROM public.classlog_duty_years y WHERE y.id=p_year
$$;

-- All internal helpers are inaccessible to browser roles; RPC below is the sole entry.
-- Generator operates only on transaction-local temporary state. Preview never writes a plan.
CREATE OR REPLACE FUNCTION public.cl_duty_generate(p_year uuid,p_from date,p_to date,p_seed text,p_replace date[] DEFAULT '{}',p_only date[] DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE y public.classlog_duty_years%ROWTYPE; v_day record; chosen record; s integer; rn integer; nxt integer;
 used uuid[]; output jsonb:='[]'; slots jsonb; members jsonb; rounds jsonb; warnings jsonb:='[]'; target integer;
BEGIN
 SELECT * INTO STRICT y FROM public.classlog_duty_years WHERE id=p_year;
 IF y.roster_dirty THEN RAISE EXCEPTION 'Ana öğrenci listesi değişti. Öğrenciler bölümünden listeyi eşitleyin.'; END IF;
 IF p_from IS NULL OR p_to IS NULL OR p_to<p_from OR p_from<y.starts_on OR p_to>y.ends_on OR p_from<public.cl_duty_today() THEN RAISE EXCEPTION 'Geçersiz veya geçmiş plan aralığı'; END IF;
 IF p_seed IS NULL OR length(p_seed)<8 OR length(p_seed)>100 THEN RAISE EXCEPTION 'Geçersiz kura tohumu'; END IF;
 DROP TABLE IF EXISTS pg_temp.duty_candidates; DROP TABLE IF EXISTS pg_temp.duty_members; DROP TABLE IF EXISTS pg_temp.duty_rounds; DROP TABLE IF EXISTS pg_temp.duty_history;
 CREATE TEMP TABLE duty_candidates(id uuid PRIMARY KEY,done integer,booked integer,last_day date,weekday_count integer DEFAULT 0) ON COMMIT DROP;
 CREATE TEMP TABLE duty_members(student_id uuid,round_no integer,eligible_on date,PRIMARY KEY(student_id,round_no)) ON COMMIT DROP;
 CREATE TEMP TABLE duty_rounds(number integer PRIMARY KEY,opened_on date) ON COMMIT DROP;
 CREATE TEMP TABLE duty_history(student_id uuid,day date) ON COMMIT DROP;
 CREATE INDEX ON duty_history(student_id,day); CREATE INDEX ON duty_history(day,student_id);
 INSERT INTO duty_history SELECT a.student_id,d.day FROM public.classlog_duty_assignments a JOIN public.classlog_duty_days d ON d.id=a.day_id
 WHERE a.year_id=p_year AND a.slot>0 AND (a.status='completed' OR (a.is_current AND a.status IN ('planned','pending') AND d.kind='school'
 AND NOT(d.day BETWEEN p_from AND p_to AND (p_only IS NULL OR d.day=ANY(p_only)) AND (d.publication='draft' OR d.day=ANY(p_replace)))));
 INSERT INTO duty_candidates
 SELECT r.id,(SELECT count(*) FROM public.classlog_duty_assignments a WHERE a.student_id=r.id AND a.status='completed'),
 (SELECT count(*) FROM public.classlog_duty_assignments a JOIN public.classlog_duty_days d ON d.id=a.day_id
 WHERE a.student_id=r.id AND a.is_current AND a.slot>0 AND a.status IN ('planned','pending') AND d.kind='school'
 AND NOT(d.day BETWEEN p_from AND p_to AND (p_only IS NULL OR d.day=ANY(p_only)) AND (d.publication='draft' OR d.day=ANY(p_replace)))),
 (SELECT max(d.day) FROM public.classlog_duty_assignments a JOIN public.classlog_duty_days d ON d.id=a.day_id WHERE a.student_id=r.id AND a.status='completed'),0
 FROM public.classlog_duty_roster r WHERE r.year_id=p_year;
 INSERT INTO duty_members SELECT student_id,round_no,eligible_on FROM public.classlog_duty_round_members m
 WHERE m.year_id=p_year AND public.cl_duty_eligible(p_year,m.student_id,m.eligible_on);
 INSERT INTO duty_rounds SELECT number,opened_on FROM public.classlog_duty_rounds WHERE year_id=p_year;
 FOR v_day IN SELECT * FROM public.classlog_duty_days WHERE year_id=p_year AND day BETWEEN p_from AND p_to AND (p_only IS NULL OR day=ANY(p_only)) ORDER BY day LOOP
  IF v_day.kind<>'school' OR (v_day.publication<>'draft' AND NOT v_day.day=ANY(p_replace)) THEN CONTINUE; END IF;
  IF EXISTS(SELECT 1 FROM public.classlog_duty_assignments WHERE day_id=v_day.id AND status IN ('completed','not_completed')) THEN CONTINUE; END IF;
  used:='{}'; slots:='[]';
  FOR s IN 1..y.daily_count+CASE WHEN y.use_reserve THEN 1 ELSE 0 END LOOP
   target:=CASE WHEN s>y.daily_count THEN 0 ELSE s END;
   SELECT * INTO chosen FROM duty_candidates c WHERE public.cl_duty_eligible(p_year,c.id,v_day.day) AND NOT c.id=ANY(used) LIMIT 1;
   IF NOT FOUND THEN
    IF target>0 THEN warnings:=warnings||jsonb_build_object('day',v_day.day,'message','Yeterli uygun öğrenci yok; görev yeri boş bırakıldı.'); END IF;
    CONTINUE;
   END IF;
   -- Ensure every eligible candidate has at least one uncovered entitlement.
   -- Reservations cover rights, never completed counters. Credit allocation is derived.
   LOOP
    SELECT min(m.round_no) INTO rn FROM duty_candidates c CROSS JOIN LATERAL
     (SELECT round_no FROM duty_members WHERE student_id=c.id ORDER BY round_no OFFSET (c.done+c.booked) LIMIT 1) m
     WHERE public.cl_duty_eligible(p_year,c.id,v_day.day) AND NOT c.id=ANY(used);
    EXIT WHEN rn IS NOT NULL;
    SELECT COALESCE(max(number),0)+1 INTO nxt FROM duty_rounds;
    IF nxt>10000 THEN RAISE EXCEPTION 'Plan sınırı aşıldı'; END IF;
    INSERT INTO duty_rounds VALUES(nxt,v_day.day);
    INSERT INTO duty_members SELECT id,nxt,v_day.day FROM duty_candidates WHERE public.cl_duty_eligible(p_year,id,v_day.day);
   END LOOP;
   SELECT c.*,m.round_no INTO chosen FROM duty_candidates c CROSS JOIN LATERAL
    (SELECT round_no FROM duty_members WHERE student_id=c.id ORDER BY round_no OFFSET (c.done+c.booked) LIMIT 1) m
    WHERE public.cl_duty_eligible(p_year,c.id,v_day.day) AND NOT c.id=ANY(used)
    ORDER BY m.round_no,c.done,
     -- Avoid immediate repeats, without making all future rounds repeat the first pair order.
     CASE WHEN (SELECT count(*) FROM public.classlog_duty_days school WHERE school.year_id=p_year AND school.kind='school' AND school.day>COALESCE((SELECT max(h.day) FROM duty_history h WHERE h.student_id=c.id AND h.day<v_day.day),y.starts_on-10) AND school.day<v_day.day)<2 THEN 1 ELSE 0 END,
     -- Completed-service age is grouped in school weeks, allowing balanced ties.
     (SELECT count(*)/5 FROM public.classlog_duty_days school WHERE school.year_id=p_year AND school.kind='school' AND school.day>COALESCE(c.last_day,y.starts_on-1) AND school.day<v_day.day) DESC,
     (SELECT count(*)::numeric / greatest(1,(SELECT count(*) FROM public.classlog_duty_days od WHERE od.year_id=p_year AND od.kind='school' AND od.day<=v_day.day AND extract(isodow FROM od.day)=extract(isodow FROM v_day.day)))
      FROM duty_history h WHERE h.student_id=c.id AND extract(isodow FROM h.day)=extract(isodow FROM v_day.day)),
     (SELECT count(*) FROM duty_history a JOIN duty_history b ON a.day=b.day WHERE a.student_id=c.id AND b.student_id=ANY(used)),
     md5(p_seed||v_day.day::text||target::text||c.id::text),c.id LIMIT 1;
   slots:=slots||jsonb_build_object('student_id',chosen.id,'slot',target,'round_no',chosen.round_no,'explanation',CASE WHEN target=0 THEN 'Yedek önerisi; tur hakkı ve görev sayısı tüketilmedi.' ELSE chosen.round_no||'. turdaki açık hak; toplam '||chosen.done||' onaylı görev. Tarih, gün ve eşleşme dengesi ardından kura.' END);
   used:=array_append(used,chosen.id);
   IF target>0 THEN UPDATE duty_candidates SET booked=booked+1 WHERE id=chosen.id; INSERT INTO duty_history VALUES(chosen.id,v_day.day); END IF;
  END LOOP;
  output:=output||jsonb_build_object('day',v_day.day,'day_id',v_day.id,'daily_count',y.daily_count,'slots',slots);
 END LOOP;
 SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY number),'[]') INTO rounds FROM duty_rounds t;
 SELECT COALESCE(jsonb_agg(to_jsonb(m) ORDER BY round_no,student_id),'[]') INTO members FROM duty_members m;
 RETURN jsonb_build_object('days',output,'rounds',rounds,'members',members,'warnings',warnings,'seed',p_seed,'algorithm','duty-1','revision',y.revision);
END $$;

CREATE OR REPLACE FUNCTION public.cl_duty_store_plan(p_year uuid,p_plan jsonb,p_selected date[]) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE d jsonb; a jsonb; dayid uuid;
BEGIN
 INSERT INTO public.classlog_duty_rounds(year_id,number,opened_on)
 SELECT p_year,(r->>'number')::integer,(r->>'opened_on')::date FROM jsonb_array_elements(p_plan->'rounds') r ON CONFLICT DO NOTHING;
 INSERT INTO public.classlog_duty_round_members(year_id,round_no,student_id,eligible_on)
 SELECT p_year,(m->>'round_no')::integer,(m->>'student_id')::uuid,(m->>'eligible_on')::date FROM jsonb_array_elements(p_plan->'members') m ON CONFLICT DO NOTHING;
 FOR d IN SELECT value FROM jsonb_array_elements(p_plan->'days') LOOP
  IF p_selected IS NOT NULL AND NOT (d->>'day')::date=ANY(p_selected) THEN CONTINUE; END IF;
  dayid:=(d->>'day_id')::uuid;
  UPDATE public.classlog_duty_assignments SET is_current=false,status='cancelled' WHERE day_id=dayid AND is_current AND status IN ('planned','pending','cancelled');
  FOR a IN SELECT value FROM jsonb_array_elements(d->'slots') LOOP
   INSERT INTO public.classlog_duty_assignments(year_id,day_id,student_id,slot,round_no,name_snapshot,explanation)
   SELECT p_year,dayid,r.id,(a->>'slot')::smallint,(a->>'round_no')::integer,r.display_name,a->>'explanation' FROM public.classlog_duty_roster r WHERE r.id=(a->>'student_id')::uuid AND r.year_id=p_year;
  END LOOP;
  UPDATE public.classlog_duty_days SET revision=revision+1,daily_count=(d->>'daily_count')::smallint WHERE id=dayid;
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.cl_duty_rpc(p_token text,p_action text,p_payload jsonb DEFAULT '{}') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
<<duty>>
DECLARE teacher public.classlog_teachers%ROWTYPE; sess public.classlog_sessions%ROWTYPE;
 y public.classlog_duty_years%ROWTYPE; a public.classlog_duty_assignments%ROWTYPE; d public.classlog_duty_days%ROWTYPE;
 op uuid; yr uuid; request jsonb; old jsonb; result jsonb; plan jsonb; entry jsonb; names jsonb; n text; student uuid;
 startday date; endday date; selected date[]; replacement date[]; seed text; reason text; status text; slotno integer;
BEGIN
 IF NOT public.cl_duty_enabled() THEN RETURN jsonb_build_object('ok',false,'reason','disabled'); END IF;
 sess:=public.cl_get_session_row(p_token); teacher:=public.cl_check_session(p_token);
 IF teacher.id IS NULL OR sess.id IS NULL OR sess.session_kind IS DISTINCT FROM 'teacher' THEN RETURN jsonb_build_object('ok',false,'reason','unauthorized'); END IF;
 IF p_payload IS NULL OR jsonb_typeof(p_payload)<>'object' OR octet_length(p_payload::text)>100000 THEN RAISE EXCEPTION 'Geçersiz istek'; END IF;
 IF p_action='list' THEN
  IF NOT COALESCE(public.cl_is_teacher_authorized(teacher,p_payload->>'className',NULL),false) THEN RETURN jsonb_build_object('ok',false,'reason','forbidden'); END IF;
  RETURN jsonb_build_object('ok',true,'value',COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY starts_on DESC) FROM public.classlog_duty_years t WHERE t.class_name=p_payload->>'className'),'[]'));
 END IF;
 IF p_action='create' THEN
  IF NOT COALESCE(public.cl_is_teacher_authorized(teacher,p_payload->>'className',NULL),false) THEN RETURN jsonb_build_object('ok',false,'reason','forbidden'); END IF;
  -- serialize first creation and overlapping school years, before there is a year row to lock
  PERFORM pg_advisory_xact_lock(hashtextextended('notik-duty:'||(p_payload->>'className'),0));
 ELSE
  yr:=(p_payload->>'yearId')::uuid;
  SELECT * INTO y FROM public.classlog_duty_years WHERE id=yr FOR UPDATE;
  IF NOT FOUND OR NOT COALESCE(public.cl_is_teacher_authorized(teacher,y.class_name,NULL),false) THEN RETURN jsonb_build_object('ok',false,'reason','forbidden'); END IF;
  IF p_action='get' THEN RETURN jsonb_build_object('ok',true,'value',public.cl_duty_snapshot(yr)); END IF;
  IF p_action='audit' THEN RETURN jsonb_build_object('ok',true,'value',COALESCE((SELECT jsonb_agg(to_jsonb(l)-'request'-'result' ORDER BY l.revision DESC) FROM public.classlog_duty_audit_log l WHERE year_id=yr),'[]')); END IF;
  IF p_action='preview' THEN
   IF (p_payload->>'revision')::bigint IS DISTINCT FROM y.revision THEN RETURN jsonb_build_object('ok',false,'reason','conflict'); END IF;
   SELECT COALESCE(array_agg(value::date),'{}') INTO replacement FROM jsonb_array_elements_text(COALESCE(p_payload->'replacePublished','[]'));
   SELECT array_agg(value::date) INTO selected FROM jsonb_array_elements_text(COALESCE(p_payload->'selectedDates','[]'));
   plan:=public.cl_duty_generate(yr,(p_payload->>'from')::date,(p_payload->>'to')::date,p_payload->>'seed',replacement,selected);
   RETURN jsonb_build_object('ok',true,'value',plan||jsonb_build_object('fingerprint',md5(plan::text)));
  END IF;
 END IF;
 op:=(p_payload->>'operationId')::uuid;
 IF op IS NULL THEN RAISE EXCEPTION 'İşlem kimliği gerekli'; END IF;
 request:=jsonb_build_object('action',p_action,'payload',p_payload);
 SELECT l.result INTO result FROM public.classlog_duty_audit_log l WHERE operation_id=op AND actor_id=teacher.id AND l.request=duty.request;
 IF FOUND THEN RETURN result; END IF;
 IF EXISTS(SELECT 1 FROM public.classlog_duty_audit_log WHERE operation_id=op) THEN RAISE EXCEPTION 'İşlem kimliği farklı içerikle kullanıldı'; END IF;
 IF p_action<>'create' AND (p_payload->>'revision')::bigint IS DISTINCT FROM y.revision THEN RETURN jsonb_build_object('ok',false,'reason','conflict'); END IF;
 reason:=left(COALESCE(p_payload->>'reason',''),500);
 old:=COALESCE(public.cl_duty_snapshot(yr),'{}');
 IF p_action='create' THEN
  startday:=(p_payload->>'start')::date; endday:=(p_payload->>'end')::date;
  IF EXISTS(SELECT 1 FROM public.classlog_duty_years WHERE class_name=p_payload->>'className' AND starts_on<=endday AND ends_on>=startday) THEN RAISE EXCEPTION 'Bu sınıf için çakışan öğretim yılı var'; END IF;
  n:=COALESCE(public.cl_get_settings_blob()->>'activeTermId','');
  SELECT students INTO names FROM public.classlog_storage WHERE id=public.cl_term_prefix(NULLIF(n,''))||(p_payload->>'className');
  IF jsonb_typeof(names) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Sınıf öğrenci listesi bulunamadı'; END IF;
  INSERT INTO public.classlog_duty_years(class_name,label,starts_on,ends_on,term_ids,daily_count,use_reserve)
  VALUES(p_payload->>'className',left(p_payload->>'label',100),startday,endday,ARRAY[n],COALESCE((p_payload->>'dailyCount')::smallint,2),COALESCE((p_payload->>'useReserve')::boolean,true)) RETURNING * INTO y; yr:=y.id;
  INSERT INTO public.classlog_duty_days(year_id,day,kind,daily_count) SELECT yr,x::date,CASE WHEN extract(isodow FROM x)>=6 THEN 'closed' ELSE 'school' END,y.daily_count FROM generate_series(startday::timestamp,endday::timestamp,'1 day') x;
  INSERT INTO public.classlog_duty_roster(year_id,source_name,display_name,joined_on) SELECT yr,value,value,startday FROM (SELECT DISTINCT btrim(value) value FROM jsonb_array_elements_text(names)) t WHERE value<>'';
 ELSIF p_action='apply_plan' THEN
  IF y.archived THEN RAISE EXCEPTION 'Arşiv yılında yeni plan oluşturulamaz'; END IF;
  SELECT array_agg(value::date) INTO selected FROM jsonb_array_elements_text(p_payload->'selectedDates');
  IF selected IS NULL THEN RAISE EXCEPTION 'Uygulanacak tarih seçilmedi'; END IF;
  SELECT COALESCE(array_agg(value::date),'{}') INTO replacement FROM jsonb_array_elements_text(COALESCE(p_payload->'replacePublished','[]'));
  IF cardinality(replacement)>0 AND (p_payload->>'confirmPublished') IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'Yayımlanmış değişiklik için açık onay gerekli'; END IF;
  IF cardinality(replacement)>0 AND btrim(reason)='' THEN RAISE EXCEPTION 'Yayın değişikliği gerekçesi gerekli'; END IF;
  -- Recompute only selected dates. Unselected reservations stay fixed; partial acceptance is revalidated.
  seed:=p_payload->>'seed';
  plan:=public.cl_duty_generate(yr,(p_payload->>'from')::date,(p_payload->>'to')::date,seed,replacement,selected);
  IF p_payload->>'fingerprint' IS DISTINCT FROM md5(plan::text) THEN RAISE EXCEPTION 'Önizleme değişti; seçili günleri yeniden önizleyin'; END IF;
  IF EXISTS(SELECT 1 FROM unnest(selected) x WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(plan->'days') v WHERE (v->>'day')::date=x)) THEN RAISE EXCEPTION 'Seçili gün planlanabilir değil'; END IF;
  IF cardinality(selected)<>(SELECT jsonb_array_length(plan->'days')) THEN RAISE EXCEPTION 'Tekrarlanan veya geçersiz tarih seçimi'; END IF;
  PERFORM public.cl_duty_store_plan(yr,plan,selected);
 ELSIF p_action='publish' THEN
  IF y.roster_dirty THEN RAISE EXCEPTION 'Önce öğrenci listesini eşitleyin'; END IF;
  startday:=(p_payload->>'from')::date; endday:=(p_payload->>'to')::date;
  IF endday<startday OR startday<y.starts_on OR endday>y.ends_on THEN RAISE EXCEPTION 'Geçersiz tarih aralığı'; END IF;
  IF EXISTS(SELECT 1 FROM public.classlog_duty_assignments aa JOIN public.classlog_duty_days dd ON dd.id=aa.day_id WHERE aa.year_id=yr AND dd.day BETWEEN startday AND endday AND aa.is_current AND aa.status IN ('planned','pending') AND dd.kind='school' AND NOT public.cl_duty_eligible(yr,aa.student_id,dd.day)) THEN RAISE EXCEPTION 'Yayın aralığında uygun olmayan öğrenci var; önce değiştirin'; END IF;
  UPDATE public.classlog_duty_days SET publication='published',revision=revision+1 WHERE year_id=yr AND day BETWEEN startday AND endday AND publication='draft';
 ELSIF p_action='result' THEN
  SELECT * INTO a FROM public.classlog_duty_assignments WHERE id=(p_payload->>'assignmentId')::uuid AND year_id=yr;
  IF NOT FOUND THEN RAISE EXCEPTION 'Görev bulunamadı'; END IF;
  SELECT * INTO d FROM public.classlog_duty_days WHERE id=a.day_id;
  status:=p_payload->>'status';
  IF d.day>public.cl_duty_today() OR status NOT IN ('pending','completed','not_completed') THEN RAISE EXCEPTION 'Gelecek gün onaylanamaz veya durum geçersiz'; END IF;
  IF a.slot=0 THEN RAISE EXCEPTION 'Önce yedeği asıl göreve aktarın'; END IF;
  IF status='completed' AND (d.kind<>'school' OR NOT public.cl_duty_eligible(yr,a.student_id,d.day)) THEN RAISE EXCEPTION 'Tatil/pasiflik çelişkisi; önce takvim veya uygunluk kaydını düzeltin'; END IF;
  IF a.status='completed' OR NOT a.is_current THEN
   IF btrim(reason)='' THEN RAISE EXCEPTION 'Geçmiş düzeltme gerekçesi gerekli'; END IF;
  END IF;
  UPDATE public.classlog_duty_assignments SET status=duty.status,confirmed_by=teacher.id,confirmed_at=now() WHERE id=a.id;
 ELSIF p_action='record_history' THEN
  SELECT * INTO d FROM public.classlog_duty_days WHERE year_id=yr AND day=(p_payload->>'day')::date;
  student:=(p_payload->>'studentId')::uuid; slotno:=(p_payload->>'slot')::integer; status:=p_payload->>'status';
  IF d.id IS NULL OR d.kind<>'school' OR NOT public.cl_duty_eligible(yr,student,d.day) OR slotno IS NULL OR slotno<1 OR slotno>d.daily_count OR status NOT IN ('planned','pending','completed','not_completed') THEN RAISE EXCEPTION 'Geçersiz gün, görev yeri veya uygun olmayan öğrenci'; END IF;
  IF d.day>public.cl_duty_today() AND status<>'planned' THEN RAISE EXCEPTION 'Gelecek nöbet tamamlanmış/tutulmamış sayılamaz'; END IF;
  IF btrim(reason)='' THEN RAISE EXCEPTION 'Manuel kayıt gerekçesi gerekli'; END IF;
  IF d.publication<>'draft' AND (p_payload->>'confirmPublished') IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'Yayımlanmış gün için açık onay gerekli'; END IF;
  IF EXISTS(SELECT 1 FROM public.classlog_duty_assignments aa WHERE aa.day_id=d.id AND aa.slot=slotno AND aa.is_current AND aa.status<>'cancelled') THEN RAISE EXCEPTION 'Bu görev yeri dolu. Mevcut görevde Onay/düzelt veya Değiştir kullanın'; END IF;
  UPDATE public.classlog_duty_assignments aa SET is_current=false WHERE aa.day_id=d.id AND aa.slot=slotno AND aa.is_current AND aa.status='cancelled';
  UPDATE public.classlog_duty_assignments aa SET is_current=false WHERE aa.day_id=d.id AND aa.student_id=student AND aa.is_current AND aa.status='cancelled';
  INSERT INTO public.classlog_duty_assignments(year_id,day_id,student_id,slot,status,name_snapshot,confirmed_by,confirmed_at,explanation)
  SELECT yr,d.id,student,slotno,duty.status,r.display_name,CASE WHEN duty.status<>'planned' THEN teacher.id END,CASE WHEN duty.status<>'planned' THEN now() END,'Öğretmen kaydı: '||reason FROM public.classlog_duty_roster r WHERE r.id=student AND r.year_id=yr;
  UPDATE public.classlog_duty_days SET revision=revision+1 WHERE id=d.id;
 ELSIF p_action='calendar' THEN
  startday:=(p_payload->>'from')::date; endday:=(p_payload->>'to')::date; status:=p_payload->>'kind';
  IF startday IS NULL OR endday IS NULL OR endday<startday OR startday<y.starts_on OR endday>y.ends_on OR status NOT IN ('school','holiday','half_day','closed') THEN RAISE EXCEPTION 'Geçersiz takvim aralığı'; END IF;
  IF btrim(reason)='' THEN RAISE EXCEPTION 'Takvim değişikliği gerekçesi gerekli'; END IF;
  IF status<>'school' AND EXISTS(SELECT 1 FROM public.classlog_duty_assignments aa JOIN public.classlog_duty_days dd ON dd.id=aa.day_id WHERE aa.year_id=yr AND dd.day BETWEEN startday AND endday AND aa.status='completed') AND (p_payload->>'confirmCompleted') IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'Onaylı görevlerle çelişiyor. İptal önizlemesini açıkça onaylayın'; END IF;
  UPDATE public.classlog_duty_days SET kind=duty.status,reason=duty.reason,revision=revision+1 WHERE year_id=yr AND day BETWEEN startday AND endday;
  IF status<>'school' THEN UPDATE public.classlog_duty_assignments aa SET status='cancelled' FROM public.classlog_duty_days dd WHERE aa.day_id=dd.id AND dd.year_id=yr AND dd.day BETWEEN startday AND endday AND (aa.is_current OR aa.status='completed'); END IF;
 ELSIF p_action='exempt' THEN
  student:=(p_payload->>'studentId')::uuid; startday:=(p_payload->>'from')::date; endday:=(p_payload->>'to')::date;
  IF NOT EXISTS(SELECT 1 FROM public.classlog_duty_roster WHERE id=student AND year_id=yr) OR startday IS NULL OR startday<y.starts_on OR startday>y.ends_on OR (endday IS NOT NULL AND (endday<startday OR endday>y.ends_on)) THEN RAISE EXCEPTION 'Geçersiz öğrenci/tarih'; END IF;
  IF EXISTS(SELECT 1 FROM public.classlog_duty_assignments aa JOIN public.classlog_duty_days dd ON dd.id=aa.day_id WHERE aa.student_id=student AND aa.status='completed' AND dd.day>=startday AND (endday IS NULL OR dd.day<=endday)) THEN RAISE EXCEPTION 'Onaylı geçmiş pasif yapılamaz; önce hatalı gerçekleşmeyi düzeltin'; END IF;
  INSERT INTO public.classlog_duty_exemptions(year_id,student_id,starts_on,ends_on,reason,kind) VALUES(yr,student,startday,endday,reason,COALESCE(p_payload->>'kind','inactive'));
 ELSIF p_action='revoke_exemption' THEN
  UPDATE public.classlog_duty_exemptions SET revoked=true WHERE id=(p_payload->>'exemptionId')::uuid AND year_id=yr;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pasiflik bulunamadı'; END IF;
 ELSIF p_action='replace' THEN
  SELECT * INTO a FROM public.classlog_duty_assignments WHERE id=(p_payload->>'assignmentId')::uuid AND year_id=yr AND is_current;
  IF NOT FOUND OR a.status='completed' THEN RAISE EXCEPTION 'Görev değiştirilemez; tamamlanan kaydı önce düzeltin'; END IF;
  SELECT * INTO d FROM public.classlog_duty_days WHERE id=a.day_id;
  student:=(p_payload->>'studentId')::uuid;
  IF d.kind<>'school' OR NOT public.cl_duty_eligible(yr,student,d.day) OR student=a.student_id OR a.slot=0 THEN RAISE EXCEPTION 'Uygun olmayan görev/öğrenci'; END IF;
  IF btrim(reason)='' THEN RAISE EXCEPTION 'Değiştirme gerekçesi gerekli'; END IF;
  IF d.publication<>'draft' AND (p_payload->>'confirmPublished') IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'Yayımlanmış değişiklik için açık onay gerekli'; END IF;
  UPDATE public.classlog_duty_assignments SET is_current=false,status=CASE WHEN d.day<=public.cl_duty_today() THEN 'not_completed' ELSE 'cancelled' END WHERE id=a.id;
  UPDATE public.classlog_duty_assignments SET is_current=false,status='cancelled' WHERE day_id=d.id AND slot=0 AND student_id=student AND is_current;
  UPDATE public.classlog_duty_assignments aa SET is_current=false WHERE aa.day_id=d.id AND aa.student_id=student AND aa.is_current AND aa.status='cancelled';
  INSERT INTO public.classlog_duty_assignments(year_id,day_id,student_id,slot,name_snapshot,replaces,explanation)
  SELECT yr,d.id,student,a.slot,display_name,a.id,'Öğretmen değişikliği: '||reason FROM public.classlog_duty_roster WHERE id=student AND year_id=yr;
  UPDATE public.classlog_duty_days SET revision=revision+1 WHERE id=d.id;
 ELSIF p_action='sync_roster' THEN
  n:=COALESCE(public.cl_get_settings_blob()->>'activeTermId','');
  SELECT students INTO names FROM public.classlog_storage WHERE id=public.cl_term_prefix(NULLIF(n,''))||y.class_name;
  IF jsonb_typeof(names) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Mevcut sınıf listesi yok'; END IF;
  startday:=greatest(y.starts_on,public.cl_duty_today());
  IF startday>y.ends_on THEN RAISE EXCEPTION 'Geçmiş yılda liste eşitlemesi yapılamaz'; END IF;
  UPDATE public.classlog_duty_roster SET left_on=startday WHERE year_id=yr AND left_on IS NULL AND NOT names ? source_name;
  INSERT INTO public.classlog_duty_roster(year_id,source_name,display_name,joined_on) SELECT yr,value,value,startday FROM (SELECT DISTINCT btrim(value) value FROM jsonb_array_elements_text(names)) t WHERE value<>'' ON CONFLICT DO NOTHING;
  -- Existing identities are never resurrected by a name match after departure.
  UPDATE public.classlog_duty_years SET roster_dirty=EXISTS(SELECT 1 FROM public.classlog_duty_roster r WHERE r.year_id=yr AND r.left_on IS NOT NULL AND names ? r.source_name),term_ids=CASE WHEN n=ANY(term_ids) THEN term_ids ELSE array_append(term_ids,n) END WHERE id=yr;
  -- Newcomers join the earliest current (not historical) round, without past debt.
  INSERT INTO public.classlog_duty_round_members(year_id,round_no,student_id,eligible_on)
  SELECT yr,t.number,r.id,greatest(startday,t.opened_on) FROM public.classlog_duty_roster r CROSS JOIN LATERAL
   (SELECT number,opened_on FROM public.classlog_duty_rounds WHERE year_id=yr AND number>=COALESCE((
     SELECT min(q.round_no) FROM public.classlog_duty_roster rr CROSS JOIN LATERAL (
      SELECT mm.round_no FROM public.classlog_duty_round_members mm WHERE mm.student_id=rr.id AND mm.year_id=yr AND public.cl_duty_eligible(yr,rr.id,mm.eligible_on)
      ORDER BY mm.round_no OFFSET (SELECT count(*) FROM public.classlog_duty_assignments aa WHERE aa.student_id=rr.id AND aa.status='completed') LIMIT 1
     ) q WHERE rr.year_id=yr AND rr.joined_on<startday AND public.cl_duty_eligible(yr,rr.id,startday)
    ),(SELECT COALESCE(max(number),0)+1 FROM public.classlog_duty_rounds WHERE year_id=yr))) t
  WHERE r.year_id=yr AND r.joined_on=startday ON CONFLICT DO NOTHING;
 ELSIF p_action='rejoin' THEN
  student:=(p_payload->>'studentId')::uuid;
  SELECT to_jsonb(r) INTO entry FROM public.classlog_duty_roster r WHERE r.id=student AND r.year_id=yr AND r.left_on IS NOT NULL;
  IF entry IS NULL THEN RAISE EXCEPTION 'Ayrılmış öğrenci bulunamadı'; END IF;
  n:=COALESCE(public.cl_get_settings_blob()->>'activeTermId','');
  SELECT students INTO names FROM public.classlog_storage WHERE id=public.cl_term_prefix(NULLIF(n,''))||y.class_name;
  IF NOT COALESCE(names ? (entry->>'source_name'),false) THEN RAISE EXCEPTION 'Bu isim mevcut ana öğrenci listesinde yok'; END IF;
  startday:=public.cl_duty_today();
  IF startday<y.starts_on OR startday>y.ends_on OR btrim(reason)='' THEN RAISE EXCEPTION 'Geçerli tarih ve eşleştirme gerekçesi gerekli'; END IF;
  IF (p_payload->>'sameStudent')='true' THEN
   IF (entry->>'left_on')::date<startday THEN INSERT INTO public.classlog_duty_exemptions(year_id,student_id,starts_on,ends_on,reason) VALUES(yr,student,(entry->>'left_on')::date,startday-1,'Okuldan ayrılma ve dönüş aralığı'); END IF;
   UPDATE public.classlog_duty_roster SET left_on=NULL WHERE id=student;
  ELSIF (p_payload->>'sameStudent')='false' THEN
   UPDATE public.classlog_duty_roster SET source_name=source_name||' [arşiv '||id::text||']' WHERE id=student;
   INSERT INTO public.classlog_duty_roster(year_id,source_name,display_name,joined_on) VALUES(yr,entry->>'source_name',entry->>'display_name',startday) RETURNING id INTO student;
   INSERT INTO public.classlog_duty_round_members(year_id,round_no,student_id,eligible_on)
   SELECT yr,number,student,greatest(opened_on,startday) FROM public.classlog_duty_rounds WHERE year_id=yr AND number>=(public.cl_duty_progress(yr)->>'round')::integer ON CONFLICT DO NOTHING;
  ELSE RAISE EXCEPTION 'Aynı öğrenci / yeni öğrenci seçimi gerekli'; END IF;
  UPDATE public.classlog_duty_years SET roster_dirty=EXISTS(SELECT 1 FROM public.classlog_duty_roster r WHERE r.year_id=yr AND r.left_on IS NOT NULL AND names ? r.source_name) WHERE id=yr;
 ELSIF p_action='settings' THEN
  UPDATE public.classlog_duty_years SET daily_count=COALESCE((p_payload->>'dailyCount')::smallint,daily_count),use_reserve=COALESCE((p_payload->>'useReserve')::boolean,use_reserve),archived=COALESCE((p_payload->>'archived')::boolean,archived) WHERE id=yr;
 ELSE RAISE EXCEPTION 'Bilinmeyen nöbet işlemi'; END IF;
 UPDATE public.classlog_duty_years SET revision=revision+1 WHERE id=yr RETURNING * INTO y;
 result:=jsonb_build_object('ok',true,'value',public.cl_duty_snapshot(yr));
 INSERT INTO public.classlog_duty_audit_log(year_id,operation_id,actor_id,action,reason,revision,request,before_value,after_value,seed,result)
 VALUES(yr,op,teacher.id,p_action,reason,y.revision,request,public.cl_duty_diff(old,result->'value'),public.cl_duty_diff(result->'value',old),seed,jsonb_build_object('ok',true,'replayed',true,'yearId',yr,'revision',y.revision));
 PERFORM public.cl_duty_signal(yr,y.revision);
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.cl_duty_signal(p_year uuid,p_revision bigint) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF to_regprocedure('realtime.send(jsonb,text,text,boolean)') IS NOT NULL THEN
  PERFORM realtime.send(jsonb_build_object('revision',p_revision),'changed','duty_change_'||p_year::text,false);
 END IF;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Nöbet bildirimi gönderilemedi; kayıt korunuyor';
END $$;

-- Old clients can still edit their original roster. Mark reconciliation explicitly;
-- never guess that removing one name and adding another identifies the same child.
CREATE OR REPLACE FUNCTION public.cl_duty_roster_changed() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE yy record;
BEGIN
 IF NEW.students IS NOT DISTINCT FROM OLD.students THEN RETURN NEW; END IF;
 FOR yy IN SELECT y.id FROM public.classlog_duty_years y WHERE NOT y.archived AND EXISTS(
  SELECT 1 FROM unnest(y.term_ids) t WHERE NEW.id=public.cl_term_prefix(NULLIF(t,''))||y.class_name) ORDER BY y.id LOOP
  UPDATE public.classlog_duty_years SET roster_dirty=true,revision=revision+1 WHERE id=yy.id;
 END LOOP;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS cl_duty_roster_changed ON public.classlog_storage;
CREATE TRIGGER cl_duty_roster_changed AFTER UPDATE OF students ON public.classlog_storage FOR EACH ROW EXECUTE FUNCTION public.cl_duty_roster_changed();

CREATE OR REPLACE FUNCTION public.cl_duty_rename_student(p_token text,p_class_name text,p_term_id text,p_old_name text,p_new_name text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE answer jsonb; yy record; before_doc jsonb; actor public.classlog_teachers%ROWTYPE; previous_dirty boolean;
BEGIN
 actor:=public.cl_check_session(p_token);
 IF actor.id IS NULL OR (public.cl_get_session_row(p_token)).session_kind IS DISTINCT FROM 'teacher' OR NOT COALESCE(public.cl_is_teacher_authorized(actor,p_class_name,NULL),false) THEN RETURN jsonb_build_object('ok',false,'reason','unauthorized'); END IF;
 -- Same lock order as the original rename: storage, then the relevant year rows.
 LOCK TABLE public.classlog_storage IN SHARE ROW EXCLUSIVE MODE;
 answer:=public.cl_rename_student(p_token,p_class_name,p_term_id,p_old_name,p_new_name);
 IF NOT COALESCE((answer->>'ok')::boolean,false) THEN RETURN answer; END IF;
 FOR yy IN SELECT y.* FROM public.classlog_duty_years y WHERE y.class_name=p_class_name AND COALESCE(p_term_id,public.cl_get_settings_blob()->>'activeTermId','')=ANY(y.term_ids) ORDER BY y.id FOR UPDATE LOOP
  before_doc:=public.cl_duty_snapshot(yy.id);
  UPDATE public.classlog_duty_roster SET source_name=btrim(p_new_name),display_name=btrim(p_new_name) WHERE year_id=yy.id AND source_name=p_old_name;
  -- Keep historical name snapshots. Current screens identify by UUID.
  UPDATE public.classlog_duty_years y SET roster_dirty=EXISTS(
   SELECT 1 FROM public.classlog_storage s WHERE s.id=public.cl_term_prefix(NULLIF(COALESCE(p_term_id,public.cl_get_settings_blob()->>'activeTermId',''),''))||p_class_name
   AND (EXISTS(SELECT 1 FROM jsonb_array_elements_text(s.students) n WHERE NOT EXISTS(SELECT 1 FROM public.classlog_duty_roster r WHERE r.year_id=y.id AND r.source_name=n AND r.left_on IS NULL))
    OR EXISTS(SELECT 1 FROM public.classlog_duty_roster r WHERE r.year_id=y.id AND r.left_on IS NULL AND NOT s.students ? r.source_name)))
   WHERE y.id=yy.id;
  INSERT INTO public.classlog_duty_audit_log(year_id,operation_id,actor_id,action,reason,revision,request,before_value,after_value)
  VALUES(yy.id,gen_random_uuid(),actor.id,'rename','Ana öğrenci listesinde ad değişikliği',yy.revision,jsonb_build_object('old',p_old_name,'new',p_new_name),public.cl_duty_diff(before_doc,public.cl_duty_snapshot(yy.id)),public.cl_duty_diff(public.cl_duty_snapshot(yy.id),before_doc));
  PERFORM public.cl_duty_signal(yy.id,yy.revision);
 END LOOP;
 RETURN answer;
END $$;

CREATE OR REPLACE FUNCTION public.cl_duty_parent(p_parent_token text,p_year_id uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE cls text; yr uuid; term text;
BEGIN
 IF NOT public.cl_duty_enabled() THEN RETURN jsonb_build_object('ok',false,'reason','disabled'); END IF;
 SELECT class_name INTO cls FROM public.classlog_parent_links WHERE token=p_parent_token AND active;
 IF cls IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','unauthorized'); END IF;
 term:=COALESCE(public.cl_get_settings_blob()->>'activeTermId','');
 SELECT id INTO yr FROM public.classlog_duty_years WHERE class_name=cls AND term=ANY(term_ids) AND NOT archived AND (p_year_id IS NULL OR id=p_year_id) ORDER BY starts_on DESC LIMIT 1;
 RETURN jsonb_build_object('ok',true,'value',CASE WHEN yr IS NULL THEN NULL ELSE public.cl_duty_snapshot(yr,true) END);
END $$;

CREATE OR REPLACE FUNCTION public.cl_duty_export_backup(p_token text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE backup jsonb; t text; rows jsonb;
BEGIN
 IF (public.cl_check_session(p_token)).role IS DISTINCT FROM 'admin' OR (public.cl_get_session_row(p_token)).session_kind IS DISTINCT FROM 'teacher' THEN RETURN jsonb_build_object('ok',false,'reason','unauthorized'); END IF;
 backup:=public.cl_export_application_backup(p_token);
 IF NOT COALESCE((backup->>'ok')::boolean,false) THEN RETURN backup; END IF;
 FOREACH t IN ARRAY ARRAY['years','roster','exemptions','rounds','round_members','days','assignments','audit_log'] LOOP
  EXECUTE format('SELECT COALESCE(jsonb_agg(to_jsonb(x)),''[]''::jsonb) FROM public.classlog_duty_%I x',t) INTO rows;
  backup:=jsonb_set(backup,ARRAY['tables','classlog_duty_'||t],rows);
 END LOOP;
 RETURN backup||jsonb_build_object('duty_schema_version',1);
END $$;

-- Enable RLS and remove table/helper privileges, including PostgreSQL's PUBLIC EXECUTE default.
DO $$ DECLARE t text; f record; BEGIN
 FOREACH t IN ARRAY ARRAY['years','roster','exemptions','rounds','round_members','days','assignments','audit_log'] LOOP
  EXECUTE format('ALTER TABLE public.classlog_duty_%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.classlog_duty_%I FROM PUBLIC,anon,authenticated',t);
 END LOOP;
 FOR f IN SELECT p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname LIKE 'cl_duty_%' LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature);
 END LOOP;
 REVOKE ALL ON SEQUENCE public.classlog_duty_audit_log_id_seq FROM PUBLIC,anon,authenticated;
END $$;
-- Identity maintenance extends the already-authorized legacy rename, even when duty UI is disabled.
GRANT EXECUTE ON FUNCTION public.cl_duty_rename_student(text,text,text,text,text) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.cl_duty_export_backup(text) TO anon,authenticated;
COMMIT;
