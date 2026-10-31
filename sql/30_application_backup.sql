-- Read-only application backup. Does not modify any application records.
BEGIN;
CREATE OR REPLACE FUNCTION public.cl_export_application_backup(p_token TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $$
DECLARE v_table TEXT; v_rows JSONB; v_tables JSONB:='{}'::jsonb;
BEGIN
 IF (public.cl_get_session_row(p_token)).session_kind IS DISTINCT FROM 'teacher'
 OR (public.cl_check_session(p_token)).role IS DISTINCT FROM 'admin' THEN
  RETURN jsonb_build_object('ok',false,'reason','unauthorized');
 END IF;
 FOREACH v_table IN ARRAY ARRAY['classlog_storage','classlog_parent_links','classlog_homework_descriptions','classlog_speech_topics'] LOOP
  IF to_regclass('public.'||v_table) IS NULL THEN
   RETURN jsonb_build_object('ok',false,'reason','missing_table','table',v_table);
  END IF;
  EXECUTE format('SELECT COALESCE(jsonb_agg(to_jsonb(t)),''[]''::jsonb) FROM public.%I t',v_table) INTO v_rows;
  v_tables:=v_tables||jsonb_build_object(v_table,v_rows);
 END LOOP;
 RETURN jsonb_build_object('ok',true,'format','notik-application-backup','version',1,
 'exported_at',now(),'settings',public.cl_get_settings_blob(),'tables',v_tables,
 'scope','All application classes and terms; excludes authentication, teacher accounts, database schema and policies');
END; $$;
REVOKE ALL ON FUNCTION public.cl_export_application_backup(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cl_export_application_backup(TEXT) TO anon,authenticated;
COMMIT;
