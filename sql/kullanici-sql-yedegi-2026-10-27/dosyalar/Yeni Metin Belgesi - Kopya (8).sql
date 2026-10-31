BEGIN;

ALTER TABLE public.classlog_storage
    ADD COLUMN IF NOT EXISTS parent_notice JSONB;

CREATE OR REPLACE FUNCTION public.cl_normalize_parent_notice(p_notice JSONB)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
AS $fn$
    SELECT CASE
        WHEN p_notice IS NULL THEN NULL
        WHEN trim(COALESCE(p_notice->>'text', '')) = '' THEN NULL
        WHEN NULLIF(trim(COALESCE(p_notice->>'expires_at', '')), '') IS NOT NULL
             AND (NULLIF(trim(COALESCE(p_notice->>'expires_at', '')), '')::timestamptz) <= NOW() THEN NULL
        ELSE jsonb_strip_nulls(
            jsonb_build_object(
                'text', trim(COALESCE(p_notice->>'text', '')),
                'expires_at', NULLIF(trim(COALESCE(p_notice->>'expires_at', '')), '')::timestamptz
            )
        )
    END
$fn$;

CREATE OR REPLACE FUNCTION public.cl_get_parent_notice(
    p_token TEXT,
    p_class_name TEXT
)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
AS $fn$
    WITH caller AS (
        SELECT public.cl_check_session(p_token) AS teacher
    ),
    session_row AS (
        SELECT public.cl_get_session_row(p_token) AS session
    ),
    allowed AS (
        SELECT
            (caller.teacher).id IS NOT NULL
            AND (session_row.session).id IS NOT NULL
            AND (session_row.session).session_kind = 'teacher'
            AND public.cl_is_teacher_authorized((caller.teacher), p_class_name, NULL) AS ok
        FROM caller, session_row
    ),
    settings AS (
        SELECT public.cl_get_settings_blob() AS settings
    ),
    storage_id AS (
        SELECT public.cl_term_prefix(NULLIF(settings.settings->>'activeTermId', '')) || p_class_name AS id
        FROM settings
    ),
    base_row AS (
        SELECT s.parent_notice
        FROM public.classlog_storage s
        JOIN storage_id i ON i.id = s.id
    )
    SELECT CASE
        WHEN NOT COALESCE((SELECT ok FROM allowed), false) THEN '{"ok":false,"reason":"unauthorized"}'::jsonb
        ELSE jsonb_build_object(
            'ok', true,
            'parent_notice', public.cl_normalize_parent_notice((SELECT parent_notice FROM base_row))
        )
    END
$fn$;

CREATE OR REPLACE FUNCTION public.cl_get_parent_notice_by_token(
    p_parent_token TEXT
)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
AS $fn$
    WITH link_row AS (
        SELECT class_name
        FROM public.classlog_parent_links
        WHERE token = p_parent_token
          AND active = true
    ),
    settings AS (
        SELECT public.cl_get_settings_blob() AS settings
    ),
    storage_id AS (
        SELECT public.cl_term_prefix(NULLIF(settings.settings->>'activeTermId', '')) || link_row.class_name AS id
        FROM settings, link_row
    ),
    base_row AS (
        SELECT s.parent_notice
        FROM public.classlog_storage s
        JOIN storage_id i ON i.id = s.id
    )
    SELECT CASE
        WHEN NOT EXISTS (SELECT 1 FROM link_row) THEN '{"ok":false,"reason":"invalid"}'::jsonb
        ELSE jsonb_build_object(
            'ok', true,
            'parent_notice', public.cl_normalize_parent_notice((SELECT parent_notice FROM base_row))
        )
    END
$fn$;

CREATE OR REPLACE FUNCTION public.cl_save_parent_notice(
    p_token TEXT,
    p_class_name TEXT,
    p_notice JSONB
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $fn$
    WITH caller AS (
        SELECT public.cl_check_session(p_token) AS teacher
    ),
    session_row AS (
        SELECT public.cl_get_session_row(p_token) AS session
    ),
    allowed AS (
        SELECT
            (caller.teacher).id IS NOT NULL
            AND (session_row.session).id IS NOT NULL
            AND (session_row.session).session_kind = 'teacher'
            AND public.cl_is_teacher_authorized((caller.teacher), p_class_name, NULL) AS ok
        FROM caller, session_row
    ),
    settings AS (
        SELECT public.cl_get_settings_blob() AS settings
    ),
    storage_id AS (
        SELECT public.cl_term_prefix(NULLIF(settings.settings->>'activeTermId', '')) || p_class_name AS id
        FROM settings
    ),
    upsert_row AS (
        INSERT INTO public.classlog_storage (id, students, notes, parent_notice, last_updated)
        SELECT
            storage_id.id,
            '[]'::jsonb,
            '{}'::jsonb,
            public.cl_normalize_parent_notice(p_notice),
            NOW()
        FROM storage_id
        WHERE COALESCE((SELECT ok FROM allowed), false)
        ON CONFLICT (id) DO UPDATE SET
            parent_notice = public.cl_normalize_parent_notice(p_notice),
            last_updated = NOW()
        RETURNING true
    )
    SELECT COALESCE((SELECT true FROM upsert_row LIMIT 1), false)
$fn$;

REVOKE EXECUTE ON FUNCTION public.cl_normalize_parent_notice(JSONB) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cl_get_parent_notice(TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cl_get_parent_notice_by_token(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cl_save_parent_notice(TEXT, TEXT, JSONB) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.cl_get_parent_notice(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cl_get_parent_notice_by_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cl_save_parent_notice(TEXT, TEXT, JSONB) TO anon, authenticated;

ALTER FUNCTION public.cl_normalize_parent_notice(JSONB) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_get_parent_notice(TEXT, TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_get_parent_notice_by_token(TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_save_parent_notice(TEXT, TEXT, JSONB) SET search_path = public, extensions, pg_temp;

COMMIT;

SELECT 'ClassLog Pro v38 parent notice bar applied' AS status;
