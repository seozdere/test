BEGIN;

ALTER TABLE public.classlog_storage
    ADD COLUMN IF NOT EXISTS parent_ticker JSONB;

CREATE OR REPLACE FUNCTION public.cl_get_parent_ticker(
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
        SELECT s.parent_ticker
        FROM public.classlog_storage s
        JOIN storage_id i ON i.id = s.id
    )
    SELECT CASE
        WHEN NOT COALESCE((SELECT ok FROM allowed), false) THEN '{"ok":false,"reason":"unauthorized"}'::jsonb
        ELSE jsonb_build_object(
            'ok', true,
            'parent_ticker', public.cl_normalize_parent_notice((SELECT parent_ticker FROM base_row))
        )
    END
$fn$;

CREATE OR REPLACE FUNCTION public.cl_get_parent_ticker_by_token(
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
        SELECT s.parent_ticker
        FROM public.classlog_storage s
        JOIN storage_id i ON i.id = s.id
    )
    SELECT CASE
        WHEN NOT EXISTS (SELECT 1 FROM link_row) THEN '{"ok":false,"reason":"invalid"}'::jsonb
        ELSE jsonb_build_object(
            'ok', true,
            'parent_ticker', public.cl_normalize_parent_notice((SELECT parent_ticker FROM base_row))
        )
    END
$fn$;

CREATE OR REPLACE FUNCTION public.cl_save_parent_ticker(
    p_token TEXT,
    p_class_name TEXT,
    p_ticker JSONB
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
        INSERT INTO public.classlog_storage (id, students, notes, parent_ticker, last_updated)
        SELECT
            storage_id.id,
            '[]'::jsonb,
            '{}'::jsonb,
            public.cl_normalize_parent_notice(p_ticker),
            NOW()
        FROM storage_id
        WHERE COALESCE((SELECT ok FROM allowed), false)
        ON CONFLICT (id) DO UPDATE SET
            parent_ticker = public.cl_normalize_parent_notice(p_ticker),
            last_updated = NOW()
        RETURNING true
    )
    SELECT COALESCE((SELECT true FROM upsert_row LIMIT 1), false)
$fn$;

REVOKE EXECUTE ON FUNCTION public.cl_get_parent_ticker(TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cl_get_parent_ticker_by_token(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cl_save_parent_ticker(TEXT, TEXT, JSONB) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.cl_get_parent_ticker(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cl_get_parent_ticker_by_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cl_save_parent_ticker(TEXT, TEXT, JSONB) TO anon, authenticated;

ALTER FUNCTION public.cl_get_parent_ticker(TEXT, TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_get_parent_ticker_by_token(TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_save_parent_ticker(TEXT, TEXT, JSONB) SET search_path = public, extensions, pg_temp;

COMMIT;

SELECT 'ClassLog parent ticker system applied' AS status;
