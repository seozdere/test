BEGIN READ ONLY;
-- After installation/activation: configuration only, no names, scores or tokens.
SELECT public.cl_speech_exam_enabled() AS server_enabled;
SELECT c.relname,c.relrowsecurity AS rls_enabled
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN
 ('classlog_speech_rubrics','classlog_speech_exams','classlog_speech_results','classlog_speech_board_grants','classlog_speech_devices');
SELECT r.rolname,
 has_function_privilege(r.rolname,'public.cl_speech_device_rpc(text,text,text,jsonb)','EXECUTE') AS device_rpc_access,
 has_function_privilege(r.rolname,'public.cl_speech_exam_rpc(text,text,jsonb)','EXECUTE') AS rpc_access,
 has_function_privilege(r.rolname,'public.cl_speech_exam_snapshot(uuid,boolean)','EXECUTE') AS internal_snapshot_access,
 has_table_privilege(r.rolname,'public.classlog_speech_results','SELECT,INSERT,UPDATE,DELETE') AS direct_scores_access
FROM pg_roles r WHERE r.rolname IN ('anon','authenticated');

COMMIT;
