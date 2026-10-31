-- ClassLog Pro v37
-- Board open/close polling fallback
-- Apply AFTER v36.

BEGIN;

CREATE TABLE IF NOT EXISTS public.classlog_board_presence (
    client_token TEXT PRIMARY KEY,
    board_id     TEXT NOT NULL,
    board_code   TEXT NOT NULL,
    state        TEXT NOT NULL DEFAULT 'waiting',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at   TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS public.classlog_board_commands (
    id                   BIGSERIAL PRIMARY KEY,
    presence_token       TEXT NOT NULL REFERENCES public.classlog_board_presence(client_token) ON DELETE CASCADE,
    board_id             TEXT NOT NULL,
    board_code           TEXT NOT NULL,
    command_type         TEXT NOT NULL,
    payload              JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at           TIMESTAMPTZ NOT NULL,
    issued_by_teacher_id BIGINT
);

CREATE INDEX IF NOT EXISTS idx_classlog_board_presence_lookup
    ON public.classlog_board_presence(board_id, board_code, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_classlog_board_commands_lookup
    ON public.classlog_board_commands(presence_token, id DESC, expires_at DESC);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'classlog_board_presence_state_check'
    ) THEN
        ALTER TABLE public.classlog_board_presence
            ADD CONSTRAINT classlog_board_presence_state_check
            CHECK (state IN ('waiting', 'active'));
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'classlog_board_commands_type_check'
    ) THEN
        ALTER TABLE public.classlog_board_commands
            ADD CONSTRAINT classlog_board_commands_type_check
            CHECK (command_type IN ('unlock', 'lock'));
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.cl_upsert_board_presence(
    p_board_id TEXT,
    p_board_code TEXT,
    p_client_token TEXT,
    p_state TEXT DEFAULT 'waiting',
    p_ttl_seconds INTEGER DEFAULT 45
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $fn$
    WITH purge_commands AS (
        DELETE FROM public.classlog_board_commands
        WHERE expires_at <= NOW()
    ),
    purge_presence AS (
        DELETE FROM public.classlog_board_presence
        WHERE expires_at <= NOW()
    ),
    validated AS (
        SELECT
            trim(p_client_token) AS client_token,
            trim(p_board_id) AS board_id,
            trim(p_board_code) AS board_code,
            CASE WHEN p_state = 'active' THEN 'active' ELSE 'waiting' END AS state_value,
            GREATEST(15, LEAST(COALESCE(p_ttl_seconds, 45), 180)) AS ttl_seconds
        WHERE COALESCE(trim(p_board_id), '') <> ''
          AND COALESCE(trim(p_client_token), '') <> ''
          AND length(trim(p_client_token)) >= 12
          AND COALESCE(trim(p_board_code), '') ~ '^\d{6}$'
    ),
    upserted AS (
        INSERT INTO public.classlog_board_presence (
            client_token,
            board_id,
            board_code,
            state,
            created_at,
            updated_at,
            expires_at
        )
        SELECT
            client_token,
            board_id,
            board_code,
            state_value,
            NOW(),
            NOW(),
            NOW() + make_interval(secs => ttl_seconds)
        FROM validated
        ON CONFLICT (client_token) DO UPDATE SET
            board_id = EXCLUDED.board_id,
            board_code = EXCLUDED.board_code,
            state = EXCLUDED.state,
            updated_at = NOW(),
            expires_at = EXCLUDED.expires_at
        RETURNING 1
    )
    SELECT EXISTS(SELECT 1 FROM upserted);
$fn$;

CREATE OR REPLACE FUNCTION public.cl_poll_board_command(
    p_client_token TEXT,
    p_last_command_id BIGINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
AS $fn$
    WITH purge_commands AS (
        DELETE FROM public.classlog_board_commands
        WHERE expires_at <= NOW()
    ),
    purge_presence AS (
        DELETE FROM public.classlog_board_presence
        WHERE expires_at <= NOW()
    ),
    presence AS (
        SELECT client_token
        FROM public.classlog_board_presence
        WHERE client_token = trim(p_client_token)
          AND expires_at > NOW()
    ),
    command_row AS (
        SELECT id, command_type, payload, expires_at
        FROM public.classlog_board_commands
        WHERE presence_token = (SELECT client_token FROM presence LIMIT 1)
          AND expires_at > NOW()
          AND (p_last_command_id IS NULL OR id > p_last_command_id)
        ORDER BY id DESC
        LIMIT 1
    )
    SELECT COALESCE(
        (
            SELECT jsonb_build_object(
                'ok', true,
                'command_id', id,
                'command_type', command_type,
                'payload', COALESCE(payload, '{}'::JSONB),
                'expires_at', expires_at
            )
            FROM command_row
        ),
        '{"ok":false}'::JSONB
    );
$fn$;

CREATE OR REPLACE FUNCTION public.cl_issue_board_command(
    p_token TEXT,
    p_board_id TEXT,
    p_board_code TEXT,
    p_command_type TEXT,
    p_payload JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
AS $fn$
    WITH purge_commands AS (
        DELETE FROM public.classlog_board_commands
        WHERE expires_at <= NOW()
    ),
    purge_presence AS (
        DELETE FROM public.classlog_board_presence
        WHERE expires_at <= NOW()
    ),
    auth_row AS (
        SELECT
            public.cl_check_session(p_token) AS teacher_row,
            public.cl_get_session_row(p_token) AS session_row,
            NULLIF(trim(COALESCE(p_payload->'context'->>'className', '')), '') AS class_name,
            NULLIF(trim(COALESCE(p_payload->'context'->>'subjectId', '')), '') AS subject_id
    ),
    authorized AS (
        SELECT
            (teacher_row).id AS teacher_id,
            public.cl_is_teacher_authorized(teacher_row, class_name, subject_id) AS allowed
        FROM auth_row
        WHERE (teacher_row).id IS NOT NULL
          AND (session_row).id IS NOT NULL
          AND (session_row).session_kind = 'teacher'
    ),
    presence AS (
        SELECT client_token
        FROM public.classlog_board_presence
        WHERE board_id = trim(p_board_id)
          AND board_code = trim(p_board_code)
          AND expires_at > NOW()
        ORDER BY updated_at DESC
        LIMIT 1
    ),
    inserted AS (
        INSERT INTO public.classlog_board_commands (
            presence_token,
            board_id,
            board_code,
            command_type,
            payload,
            created_at,
            expires_at,
            issued_by_teacher_id
        )
        SELECT
            (SELECT client_token FROM presence),
            trim(p_board_id),
            trim(p_board_code),
            trim(p_command_type),
            COALESCE(p_payload, '{}'::JSONB),
            NOW(),
            NOW() + INTERVAL '90 seconds',
            (SELECT teacher_id FROM authorized)
        WHERE EXISTS (SELECT 1 FROM authorized)
          AND (
              (SELECT class_name FROM auth_row) IS NULL
              OR EXISTS (SELECT 1 FROM authorized WHERE allowed)
          )
          AND EXISTS (SELECT 1 FROM presence)
          AND COALESCE(trim(p_board_id), '') <> ''
          AND COALESCE(trim(p_board_code), '') ~ '^\d{6}$'
          AND COALESCE(trim(p_command_type), '') IN ('unlock', 'lock')
        RETURNING id
    )
    SELECT CASE
        WHEN NOT EXISTS (SELECT 1 FROM authorized) THEN '{"ok":false,"reason":"unauthorized"}'::JSONB
        WHEN COALESCE(trim(p_board_id), '') = '' OR COALESCE(trim(p_board_code), '') !~ '^\d{6}$' THEN '{"ok":false,"reason":"invalid_board"}'::JSONB
        WHEN COALESCE(trim(p_command_type), '') NOT IN ('unlock', 'lock') THEN '{"ok":false,"reason":"invalid_command"}'::JSONB
        WHEN (SELECT class_name FROM auth_row) IS NOT NULL AND NOT EXISTS (SELECT 1 FROM authorized WHERE allowed) THEN '{"ok":false,"reason":"forbidden"}'::JSONB
        WHEN NOT EXISTS (SELECT 1 FROM presence) THEN '{"ok":false,"reason":"board_not_found"}'::JSONB
        ELSE jsonb_build_object(
            'ok', true,
            'command_id', (SELECT id FROM inserted LIMIT 1)
        )
    END;
$fn$;

ALTER TABLE public.classlog_board_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classlog_board_commands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS classlog_board_presence_deny_all ON public.classlog_board_presence;
CREATE POLICY classlog_board_presence_deny_all
ON public.classlog_board_presence
FOR ALL
TO public
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS classlog_board_commands_deny_all ON public.classlog_board_commands;
CREATE POLICY classlog_board_commands_deny_all
ON public.classlog_board_commands
FOR ALL
TO public
USING (false)
WITH CHECK (false);

REVOKE ALL ON TABLE public.classlog_board_presence FROM anon, authenticated;
REVOKE ALL ON TABLE public.classlog_board_commands FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.cl_upsert_board_presence(TEXT, TEXT, TEXT, TEXT, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cl_poll_board_command(TEXT, BIGINT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cl_issue_board_command(TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.cl_upsert_board_presence(TEXT, TEXT, TEXT, TEXT, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cl_poll_board_command(TEXT, BIGINT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cl_issue_board_command(TEXT, TEXT, TEXT, TEXT, JSONB) TO anon, authenticated;

ALTER FUNCTION public.cl_upsert_board_presence(TEXT, TEXT, TEXT, TEXT, INTEGER) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_poll_board_command(TEXT, BIGINT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_issue_board_command(TEXT, TEXT, TEXT, TEXT, JSONB) SET search_path = public, extensions, pg_temp;

COMMIT;
