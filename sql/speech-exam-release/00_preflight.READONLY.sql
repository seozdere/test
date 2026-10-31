-- OPTIONAL MANUAL INSPECTION ONLY. No writes, no student/session/token rows.
-- Do not paste credentials or student data into the output you share.
SELECT n.nspname AS schema_name,e.extname,e.extversion
FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE e.extname='pgcrypto';
SELECT table_name,column_name,data_type
FROM information_schema.columns
WHERE table_schema='public' AND table_name IN ('classlog_teachers','classlog_sessions','classlog_storage')
ORDER BY table_name,ordinal_position;
SELECT p.oid::regprocedure AS signature,pg_get_functiondef(p.oid) AS definition
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN
('cl_check_session','cl_get_session_row','cl_is_teacher_authorized','cl_get_settings_blob','cl_term_prefix','cl_issue_kiosk_session');
SELECT to_regprocedure('realtime.send(jsonb,text,text,boolean)') AS realtime_send;
SELECT r.rolname AS role_name,
has_schema_privilege(r.rolname,'public','CREATE') AS public_schema_create
FROM pg_roles r WHERE r.rolname IN ('anon','authenticated');

-- Existing speech tables mean 01 must NOT be rerun. Do not drop tables to bypass this.
SELECT to_regclass('public.classlog_speech_exams') AS existing_exams,
 to_regclass('public.classlog_speech_results') AS existing_results,
 to_regprocedure('public.cl_speech_exam_rpc(text,text,jsonb)') AS existing_rpc;
SELECT r.rolname, n.nspname, has_schema_privilege(r.rolname,n.oid,'CREATE') AS untrusted_create
FROM pg_roles r CROSS JOIN pg_namespace n
WHERE r.rolname IN ('anon','authenticated') AND n.nspname IN ('public','extensions');
