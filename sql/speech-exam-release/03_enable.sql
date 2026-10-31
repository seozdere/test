-- EXPLICIT ACTIVATION, not part of the initial installation.
-- First use ONLY in an isolated Supabase test project with synthetic students.
-- Production requires installed auth definitions review and real two-device tests.
-- Client release flags remain independent; this file does not enable the website.
BEGIN;
DO $$
DECLARE item text; role_name text;
BEGIN
 IF to_regprocedure('public.cl_speech_exam_rpc(text,text,jsonb)') IS NULL
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
 FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
  IF EXISTS (SELECT 1 FROM pg_namespace n WHERE n.nspname IN ('public','extensions')
   AND has_schema_privilege(role_name,n.oid,'CREATE')) THEN
   RAISE EXCEPTION 'Unsafe schema CREATE privilege for %; review separately',role_name;
  END IF;
  FOREACH item IN ARRAY ARRAY['classlog_speech_rubrics','classlog_speech_exams','classlog_speech_results','classlog_speech_board_grants'] LOOP
   IF to_regclass('public.'||item) IS NULL THEN RAISE EXCEPTION 'Missing table %',item; END IF;
   IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.'||item))
    OR EXISTS (SELECT 1 FROM pg_policy WHERE polrelid=to_regclass('public.'||item))
    OR has_table_privilege(role_name,'public.'||item,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') THEN
    RAISE EXCEPTION 'Unexpected direct access or RLS configuration on % for %',item,role_name;
   END IF;
  END LOOP;
  FOREACH item IN ARRAY ARRAY['public.cl_speech_exam_snapshot(uuid,boolean)','public.cl_speech_exam_signal(uuid,integer)','public.cl_speech_exam_enabled()','public.cl_speech_scores_valid(jsonb)'] LOOP
   IF has_function_privilege(role_name,item,'EXECUTE') THEN
    RAISE EXCEPTION 'Internal helper is exposed: % for %',item,role_name;
   END IF;
  END LOOP;
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.cl_speech_exam_enabled() RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $$ SELECT true $$;
REVOKE ALL ON FUNCTION public.cl_speech_exam_enabled() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.cl_speech_exam_rpc(text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cl_speech_exam_rpc(text,text,jsonb) TO anon,authenticated;
-- RPC itself still checks the ClassLog teacher session/class/subject or board grant.
NOTIFY pgrst, 'reload schema';
COMMIT;
