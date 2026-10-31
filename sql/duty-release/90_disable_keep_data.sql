BEGIN;
CREATE OR REPLACE FUNCTION public.cl_duty_enabled() RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $$ SELECT false $$;
REVOKE ALL ON FUNCTION public.cl_duty_rpc(text,text,jsonb),public.cl_duty_parent(text,uuid) FROM PUBLIC,anon,authenticated;
COMMIT;
-- Nöbetler, onaylar, kimlikler ve geçmiş korunur. Normal kurulum adımı değildir.
