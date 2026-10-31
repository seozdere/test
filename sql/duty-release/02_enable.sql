BEGIN;
DO $$ DECLARE t text; BEGIN
 IF to_regprocedure('public.cl_duty_rpc(text,text,jsonb)') IS NULL THEN RAISE EXCEPTION 'Önce 01_install.sql'; END IF;
 IF has_schema_privilege('anon','public','CREATE') OR has_schema_privilege('authenticated','public','CREATE') THEN RAISE EXCEPTION 'public şemasında güvensiz CREATE yetkisi'; END IF;
 FOREACH t IN ARRAY ARRAY['years','roster','exemptions','rounds','round_members','days','assignments','audit_log'] LOOP
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid=('public.classlog_duty_'||t)::regclass)
  OR has_table_privilege('anon','public.classlog_duty_'||t,'SELECT,INSERT,UPDATE,DELETE')
  OR has_table_privilege('authenticated','public.classlog_duty_'||t,'SELECT,INSERT,UPDATE,DELETE') THEN RAISE EXCEPTION 'Nöbet tablo erişimi güvenli değil: %',t; END IF;
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.cl_duty_enabled() RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $$ SELECT true $$;
GRANT EXECUTE ON FUNCTION public.cl_duty_rpc(text,text,jsonb),public.cl_duty_parent(text,uuid) TO anon,authenticated;
COMMIT;
SELECT true AS notik_duty_enabled;
