-- SALT OKUNUR: tek JSON sonuc. Kayit veya puan degistirmez.
BEGIN READ ONLY;
WITH expected(name) AS (VALUES ('classlog_speech_rubrics'),('classlog_speech_exams'),('classlog_speech_results'),('classlog_speech_board_grants'),('classlog_speech_devices')),
roles(name) AS (VALUES ('anon'),('authenticated'))
SELECT jsonb_build_object(
 'server_enabled',public.cl_speech_exam_enabled(),
 'tables',(SELECT jsonb_agg(jsonb_build_object('name',e.name,'exists',c.oid IS NOT NULL,'rls_enabled',c.relrowsecurity) ORDER BY e.name) FROM expected e LEFT JOIN pg_class c ON c.oid=to_regclass('public.'||e.name)),
 'permissions',(SELECT jsonb_agg(jsonb_build_object(
  'role',r.name,
  'rpc_access',has_function_privilege(r.name,'public.cl_speech_exam_rpc(text,text,jsonb)','EXECUTE'),
  'device_rpc_access',has_function_privilege(r.name,'public.cl_speech_device_rpc(text,text,text,jsonb)','EXECUTE'),
  'internal_snapshot_access',has_function_privilege(r.name,'public.cl_speech_exam_snapshot(uuid,boolean)','EXECUTE'),
  'direct_scores_access',has_table_privilege(r.name,'public.classlog_speech_results','SELECT,INSERT,UPDATE,DELETE'),
  'any_direct_exam_table_access',EXISTS(SELECT 1 FROM expected e WHERE has_table_privilege(r.name,to_regclass('public.'||e.name),'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'))
 ) ORDER BY r.name) FROM roles r)
) AS kapali_kurulum_kontrolu;
COMMIT;
