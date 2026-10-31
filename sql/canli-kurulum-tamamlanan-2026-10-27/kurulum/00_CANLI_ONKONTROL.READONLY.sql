-- SALT OKUNUR. SQL Editor'da tum dosyayi calistirin.
-- Tek JSON sonuc verir. Kayit, ogrenci, puan, sifre veya oturum token'i okumaz.
-- Hata veren eski izin SQL'ini tekrar uygulamaz; kurulu nesneleri/izinleri listeler.
BEGIN READ ONLY;
WITH expected(name) AS (VALUES
 ('classlog_storage'),('classlog_config'),('classlog_qr_tokens'),
 ('classlog_teachers'),('classlog_sessions'),('classlog_parent_links'),
 ('classlog_speech_rubrics'),('classlog_speech_exams'),('classlog_speech_results'),
 ('classlog_speech_board_grants'),('classlog_speech_devices')
), tables AS (
 SELECT e.name,c.oid,c.relrowsecurity AS rls_enabled
 FROM expected e LEFT JOIN pg_class c ON c.oid=to_regclass('public.'||e.name)
), roles AS (SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated'))
SELECT jsonb_build_object(
 'tables', (SELECT jsonb_agg(jsonb_build_object('name',name,'exists',oid IS NOT NULL,'rls',rls_enabled) ORDER BY name) FROM tables),
 'table_permissions', (SELECT jsonb_agg(jsonb_build_object('table',t.name,'role',r.rolname,
   'select',has_table_privilege(r.rolname,t.oid,'SELECT'),
   'insert',has_table_privilege(r.rolname,t.oid,'INSERT'),
   'update',has_table_privilege(r.rolname,t.oid,'UPDATE'),
   'delete',has_table_privilege(r.rolname,t.oid,'DELETE')) ORDER BY t.name,r.rolname)
   FROM tables t CROSS JOIN roles r WHERE t.oid IS NOT NULL),
 'policies', (SELECT COALESCE(jsonb_agg(jsonb_build_object('table',tablename,'name',policyname,
   'roles',roles,'command',cmd,'using',qual,'check',with_check) ORDER BY tablename,policyname),'[]')
   FROM pg_policies WHERE schemaname='public' AND tablename IN (SELECT name FROM expected)),
 'auth_functions', (SELECT COALESCE(jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,
   'definition',pg_get_functiondef(p.oid)) ORDER BY p.oid::regprocedure::text),'[]')
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'
   AND p.proname IN ('cl_check_session','cl_get_session_row','cl_is_teacher_authorized','cl_issue_kiosk_session','cl_get_settings_blob','cl_term_prefix')),
 'speech_functions', (SELECT COALESCE(jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,
   'security_definer',p.prosecdef,'settings',p.proconfig,'definition_hash',md5(pg_get_functiondef(p.oid)),
   'anon_execute',has_function_privilege('anon',p.oid,'EXECUTE'),
   'authenticated_execute',has_function_privilege('authenticated',p.oid,'EXECUTE')) ORDER BY p.oid::regprocedure::text),'[]')
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname LIKE 'cl_speech_%'),
 'schema_create', (SELECT jsonb_agg(jsonb_build_object('schema',n.nspname,'role',r.rolname,
   'create',has_schema_privilege(r.rolname,n.oid,'CREATE')) ORDER BY n.nspname,r.rolname)
   FROM pg_namespace n CROSS JOIN roles r WHERE n.nspname IN ('public','extensions')),
 'pgcrypto', (SELECT jsonb_agg(jsonb_build_object('schema',n.nspname,'version',e.extversion))
   FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE e.extname='pgcrypto'),
 'realtime_send', to_regprocedure('realtime.send(jsonb,text,text,boolean)')::text
) AS yayin_oncesi_denetim;
COMMIT;

-- Schema metadata only; never student/session records.
SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('classlog_teachers','classlog_sessions','classlog_storage','classlog_parent_links') ORDER BY table_name,ordinal_position;
