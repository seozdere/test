-- EXPLICIT activation only after LIVE preflight review, closed-install checks and kiosk risk resolution.
BEGIN;
DO $$
DECLARE item text; role_name text;
BEGIN
 IF to_regprocedure('public.cl_speech_exam_rpc(text,text,jsonb)') IS NULL
 OR to_regprocedure('public.cl_speech_device_rpc(text,text,text,jsonb)') IS NULL
 OR to_regprocedure('public.cl_check_session(text)') IS NULL
 OR to_regprocedure('public.cl_get_session_row(text)') IS NULL
 OR to_regprocedure('public.cl_is_teacher_authorized(public.classlog_teachers,text,text)') IS NULL
 OR to_regprocedure('public.cl_get_settings_blob()') IS NULL
 OR to_regprocedure('public.cl_term_prefix(text)') IS NULL THEN
  RAISE EXCEPTION 'Required speech/auth functions are missing';
 END IF;
 IF to_regprocedure('realtime.send(jsonb,text,text,boolean)') IS NULL THEN
  RAISE EXCEPTION 'Required Realtime broadcast function is missing';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace
  WHERE e.extname='pgcrypto' AND n.nspname IN ('public','extensions')) THEN
  RAISE EXCEPTION 'pgcrypto must be installed in public or extensions';
 END IF;
 IF EXISTS (SELECT 1 FROM public.classlog_sessions WHERE session_kind='kiosk' AND expires_at>now()) THEN
  RAISE EXCEPTION 'Active legacy kiosk sessions remain; complete 04B first';
 END IF;
 FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
  IF to_regprocedure('public.cl_issue_kiosk_session(text,text,text,text)') IS NOT NULL
   AND has_function_privilege(role_name,'public.cl_issue_kiosk_session(text,text,text,text)','EXECUTE') THEN
   RAISE EXCEPTION 'Legacy kiosk RPC remains exposed; complete 04B first';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_namespace n WHERE n.nspname IN ('public','extensions')
   AND has_schema_privilege(role_name,n.oid,'CREATE')) THEN
   RAISE EXCEPTION 'Unsafe schema CREATE privilege for %; review separately',role_name;
  END IF;
  FOREACH item IN ARRAY ARRAY['classlog_speech_rubrics','classlog_speech_exams','classlog_speech_results','classlog_speech_board_grants','classlog_speech_devices'] LOOP
   IF to_regclass('public.'||item) IS NULL THEN RAISE EXCEPTION 'Missing table %',item; END IF;
   IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.'||item))
    OR EXISTS (SELECT 1 FROM pg_policy WHERE polrelid=to_regclass('public.'||item))
    OR has_table_privilege(role_name,'public.'||item,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') THEN
    RAISE EXCEPTION 'Unexpected direct access or RLS configuration on % for %',item,role_name;
   END IF;
  END LOOP;
  FOREACH item IN ARRAY ARRAY['public.cl_speech_exam_snapshot(uuid,boolean)','public.cl_speech_exam_signal(uuid,integer)','public.cl_speech_exam_enabled()','public.cl_speech_scores_valid(jsonb)','public.cl_speech_device_signal(text,integer)','public.cl_speech_exam_created_signal()','public.cl_speech_scope_topic(text,text,text)'] LOOP
   IF has_function_privilege(role_name,item,'EXECUTE') THEN
    RAISE EXCEPTION 'Internal helper is exposed: % for %',item,role_name;
   END IF;
  END LOOP;
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.cl_speech_exam_enabled() RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $$ SELECT true $$;
REVOKE ALL ON FUNCTION public.cl_speech_exam_enabled() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.cl_speech_exam_rpc(text,text,jsonb),public.cl_speech_device_rpc(text,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cl_speech_exam_rpc(text,text,jsonb), public.cl_speech_device_rpc(text,text,text,jsonb) TO anon,authenticated;
-- RPC itself still checks the ClassLog teacher session/class/subject or board grant.
NOTIFY pgrst, 'reload schema';
COMMIT;
