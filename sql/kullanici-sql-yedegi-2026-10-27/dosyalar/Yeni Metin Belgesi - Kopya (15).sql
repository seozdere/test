-- ClassLog Pro v35
-- Security lockdown patch
-- Apply AFTER v34.
--
-- Goals:
-- 1. Revoke default PUBLIC/anon/authenticated EXECUTE access from internal helper functions.
-- 2. Grant EXECUTE only to the frontend-facing RPCs that the app actually needs.
-- 3. Remove legacy plaintext passwords after bcrypt migration.
-- 4. Tighten direct table privileges in addition to RLS.
-- 5. Force review of any admin password inherited from old bootstrap migrations.

BEGIN;

-- -------------------------------------------------------------------
-- Legacy schema compatibility
-- v3.0 created classlog_teachers.password as NOT NULL, but v3.3 moved
-- authentication to password_hash and may write NULL into password.
-- -------------------------------------------------------------------
ALTER TABLE classlog_teachers
    ALTER COLUMN password DROP NOT NULL;

-- -------------------------------------------------------------------
-- Legacy plaintext password cleanup
-- -------------------------------------------------------------------
UPDATE classlog_teachers
SET password = NULL
WHERE COALESCE(password, '') <> ''
  AND COALESCE(password_hash, '') <> '';

-- If your environment was created from the old v3.0 migration, rotate the
-- admin password immediately from the application or with a one-off SQL update.

-- -------------------------------------------------------------------
-- Direct table privilege lockdown
-- RLS is already enabled, but explicit privilege revocation reduces
-- accidental exposure via direct PostgREST/table access.
-- -------------------------------------------------------------------
REVOKE ALL ON TABLE classlog_teachers FROM anon, authenticated;
REVOKE ALL ON TABLE classlog_sessions FROM anon, authenticated;
REVOKE ALL ON TABLE classlog_storage FROM anon, authenticated;
REVOKE ALL ON TABLE classlog_parent_links FROM anon, authenticated;

-- -------------------------------------------------------------------
-- Function EXECUTE lockdown
-- PostgreSQL grants EXECUTE on newly created functions to PUBLIC by
-- default, so we explicitly revoke first.
-- -------------------------------------------------------------------

-- Internal helpers: nobody from client roles should call these directly.
REVOKE EXECUTE ON FUNCTION public.cl_check_session(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cl_get_settings_blob() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cl_extract_storage_class(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cl_extract_storage_subject(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cl_term_prefix(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cl_is_teacher_authorized(classlog_teachers, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

-- App-facing RPCs: frontend uses anon key, so anon/authenticated need EXECUTE.
REVOKE EXECUTE ON FUNCTION public.cl_authenticate(TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cl_logout(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cl_change_password(TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cl_list_teachers(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cl_save_teacher(TEXT, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cl_delete_teacher(TEXT, BIGINT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cl_get_settings(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cl_get_teacher_view(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cl_get_parent_link(TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cl_get_parent_view(TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cl_save_base(TEXT, TEXT, JSONB, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cl_save_records(TEXT, TEXT, JSONB, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cl_save_settings(TEXT, JSONB, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cl_save_settings_v2(TEXT, JSONB) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.cl_authenticate(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cl_logout(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cl_change_password(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cl_list_teachers(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cl_save_teacher(TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cl_delete_teacher(TEXT, BIGINT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cl_get_settings(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cl_get_teacher_view(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cl_get_parent_link(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cl_get_parent_view(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cl_save_base(TEXT, TEXT, JSONB, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cl_save_records(TEXT, TEXT, JSONB, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cl_save_settings(TEXT, JSONB, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cl_save_settings_v2(TEXT, JSONB) TO anon, authenticated;

-- Harden SECURITY DEFINER function resolution.
ALTER FUNCTION public.cl_authenticate(TEXT, TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_check_session(TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_logout(TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_list_teachers(TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_save_teacher(TEXT, JSONB) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_delete_teacher(TEXT, BIGINT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_change_password(TEXT, TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_get_settings_blob() SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_get_settings(TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_get_teacher_view(TEXT, TEXT, TEXT, TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_get_parent_link(TEXT, TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_get_parent_view(TEXT, TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_save_base(TEXT, TEXT, JSONB, JSONB) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_save_records(TEXT, TEXT, JSONB, JSONB) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_save_settings(TEXT, JSONB, TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_save_settings_v2(TEXT, JSONB) SET search_path = public, extensions, pg_temp;

-- Future-proofing: functions created later should not be executable by
-- PUBLIC/anon/authenticated unless explicitly granted.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

COMMIT;

SELECT 'ClassLog Pro v35 security lockdown applied' AS status;
