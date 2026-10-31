-- ClassLog Pro - Final Bootstrap
-- Clean install / clean rebuild SQL
-- Includes:
-- - base schema
-- - hashed password auth
-- - scoped kiosk sessions
-- - parent read-only access
-- - RLS + privilege lockdown
--
-- Important:
-- 1. Best for fresh environments.
-- 2. Do not run blindly on an existing production database without review.
-- 3. After applying, create the first admin user with a strong password.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -------------------------------------------------------------------
-- Tables
-- -------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS classlog_teachers (
    id            BIGSERIAL PRIMARY KEY,
    username      TEXT UNIQUE NOT NULL,
    password      TEXT,
    password_hash TEXT,
    name          TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'teacher',
    classes       TEXT[] DEFAULT '{}',
    subjects      TEXT[] DEFAULT '{}',
    active        BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE classlog_teachers
    ALTER COLUMN password DROP NOT NULL;

ALTER TABLE classlog_teachers
    ADD COLUMN IF NOT EXISTS password_hash TEXT,
    ADD COLUMN IF NOT EXISTS subjects TEXT[] DEFAULT '{}';

CREATE TABLE IF NOT EXISTS classlog_sessions (
    id                   BIGSERIAL PRIMARY KEY,
    teacher_id           BIGINT NOT NULL REFERENCES classlog_teachers(id) ON DELETE CASCADE,
    token                TEXT UNIQUE NOT NULL,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    expires_at           TIMESTAMPTZ NOT NULL,
    session_kind         TEXT DEFAULT 'teacher',
    scope_class_name     TEXT,
    scope_subject_id     TEXT,
    scope_term_id        TEXT,
    issued_by_teacher_id BIGINT
);

UPDATE classlog_sessions
SET session_kind = 'teacher'
WHERE COALESCE(session_kind, '') = '';

ALTER TABLE classlog_sessions
    ALTER COLUMN session_kind SET DEFAULT 'teacher';

ALTER TABLE classlog_sessions
    ALTER COLUMN session_kind SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'classlog_sessions_kind_check'
    ) THEN
        ALTER TABLE classlog_sessions
            ADD CONSTRAINT classlog_sessions_kind_check
            CHECK (session_kind IN ('teacher', 'kiosk'));
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS classlog_storage (
    id             TEXT PRIMARY KEY,
    students       JSONB DEFAULT '[]'::JSONB,
    records        JSONB DEFAULT '{}'::JSONB,
    "classRecords" JSONB DEFAULT '{}'::JSONB,
    notes          JSONB DEFAULT '{}'::JSONB,
    last_updated   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE classlog_storage
    ADD COLUMN IF NOT EXISTS students JSONB DEFAULT '[]'::JSONB,
    ADD COLUMN IF NOT EXISTS records JSONB DEFAULT '{}'::JSONB,
    ADD COLUMN IF NOT EXISTS "classRecords" JSONB DEFAULT '{}'::JSONB,
    ADD COLUMN IF NOT EXISTS notes JSONB DEFAULT '{}'::JSONB,
    ADD COLUMN IF NOT EXISTS last_updated TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS classlog_parent_links (
    class_name TEXT PRIMARY KEY,
    token      TEXT UNIQUE NOT NULL,
    active     BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_classlog_sessions_token
    ON classlog_sessions(token);

CREATE INDEX IF NOT EXISTS idx_classlog_sessions_kind_expires
    ON classlog_sessions(session_kind, expires_at);

CREATE INDEX IF NOT EXISTS idx_classlog_parent_links_token
    ON classlog_parent_links(token);

-- -------------------------------------------------------------------
-- Default settings row
-- -------------------------------------------------------------------

INSERT INTO classlog_storage (id, records, last_updated)
VALUES (
    '__settings__',
    jsonb_build_object(
        'subjects',
        jsonb_build_array(
            jsonb_build_object('id', 'turkce', 'label', 'Türkçe', 'emoji', '📖', 'color', '#6366F1', 'showInParent', true),
            jsonb_build_object('id', 'mat', 'label', 'Matematik', 'emoji', '📐', 'color', '#0EA5E9', 'showInParent', true),
            jsonb_build_object('id', 'fen', 'label', 'Fen Bilimleri', 'emoji', '🔬', 'color', '#10B981', 'showInParent', true),
            jsonb_build_object('id', 'sosyal', 'label', 'Sosyal Bilgiler', 'emoji', '🌍', 'color', '#F59E0B', 'showInParent', true)
        ),
        'termString', NULL,
        'activeTermId', NULL,
        'terms', '[]'::JSONB
    ),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- -------------------------------------------------------------------
-- Legacy compatibility
-- -------------------------------------------------------------------

UPDATE classlog_teachers
SET password_hash = crypt(password, gen_salt('bf'))
WHERE COALESCE(password_hash, '') = ''
  AND COALESCE(password, '') <> '';

UPDATE classlog_teachers
SET password = NULL
WHERE COALESCE(password, '') <> ''
  AND COALESCE(password_hash, '') <> '';

-- -------------------------------------------------------------------
-- Helper functions
-- -------------------------------------------------------------------

CREATE OR REPLACE FUNCTION cl_extract_storage_class(p_id TEXT)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
    v_raw TEXT;
BEGIN
    v_raw := CASE
        WHEN position('__' IN p_id) > 0 THEN split_part(p_id, '__', 2)
        ELSE p_id
    END;
    RETURN split_part(v_raw, '_', 1);
END;
$$;

CREATE OR REPLACE FUNCTION cl_extract_storage_subject(p_id TEXT)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
    v_raw TEXT;
BEGIN
    v_raw := CASE
        WHEN position('__' IN p_id) > 0 THEN split_part(p_id, '__', 2)
        ELSE p_id
    END;
    IF position('_' IN v_raw) = 0 THEN
        RETURN NULL;
    END IF;
    RETURN split_part(v_raw, '_', 2);
END;
$$;

CREATE OR REPLACE FUNCTION cl_extract_storage_term(p_id TEXT)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
    IF position('__' IN p_id) > 0 THEN
        RETURN split_part(p_id, '__', 1);
    END IF;
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION cl_term_prefix(p_term_id TEXT)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
    IF p_term_id IS NULL OR trim(p_term_id) = '' THEN
        RETURN '';
    END IF;
    RETURN trim(p_term_id) || '__';
END;
$$;

CREATE OR REPLACE FUNCTION cl_get_settings_blob()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_settings JSONB;
BEGIN
    SELECT records INTO v_settings
    FROM classlog_storage
    WHERE id = '__settings__';

    RETURN COALESCE(v_settings, '{}'::JSONB);
END;
$$;

CREATE OR REPLACE FUNCTION cl_check_session(p_token TEXT)
RETURNS classlog_teachers LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_teacher classlog_teachers%ROWTYPE;
BEGIN
    SELECT t.* INTO v_teacher
    FROM classlog_sessions s
    JOIN classlog_teachers t ON t.id = s.teacher_id
    WHERE s.token = p_token
      AND s.expires_at > NOW()
      AND t.active = true;

    RETURN v_teacher;
END;
$$;

CREATE OR REPLACE FUNCTION cl_get_session_row(p_token TEXT)
RETURNS classlog_sessions LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_session classlog_sessions%ROWTYPE;
BEGIN
    SELECT *
    INTO v_session
    FROM classlog_sessions
    WHERE token = p_token
      AND expires_at > NOW();

    RETURN v_session;
END;
$$;

CREATE OR REPLACE FUNCTION cl_is_teacher_authorized(
    p_teacher classlog_teachers,
    p_class_name TEXT,
    p_subject_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
BEGIN
    IF p_teacher.id IS NULL THEN
        RETURN false;
    END IF;

    IF p_teacher.role = 'admin' THEN
        RETURN true;
    END IF;

    IF COALESCE(array_length(p_teacher.classes, 1), 0) > 0
       AND NOT (p_class_name = ANY (p_teacher.classes)) THEN
        RETURN false;
    END IF;

    IF p_subject_id IS NOT NULL
       AND COALESCE(array_length(p_teacher.subjects, 1), 0) > 0
       AND NOT (p_subject_id = ANY (p_teacher.subjects)) THEN
        RETURN false;
    END IF;

    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION cl_session_scope_matches(
    p_session classlog_sessions,
    p_class_name TEXT,
    p_subject_id TEXT,
    p_term_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
DECLARE
    v_term_id TEXT;
BEGIN
    IF p_session.id IS NULL THEN
        RETURN false;
    END IF;

    IF p_session.session_kind = 'teacher' THEN
        RETURN true;
    END IF;

    v_term_id := NULLIF(trim(COALESCE(p_term_id, '')), '');

    IF COALESCE(p_session.scope_class_name, '') <> COALESCE(p_class_name, '') THEN
        RETURN false;
    END IF;

    IF COALESCE(p_session.scope_subject_id, '') <> COALESCE(p_subject_id, '') THEN
        RETURN false;
    END IF;

    IF COALESCE(p_session.scope_term_id, '') <> COALESCE(v_term_id, '') THEN
        RETURN false;
    END IF;

    RETURN true;
END;
$$;

-- -------------------------------------------------------------------
-- App-facing RPCs
-- -------------------------------------------------------------------

CREATE OR REPLACE FUNCTION cl_authenticate(p_username TEXT, p_password TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_teacher classlog_teachers%ROWTYPE;
    v_token   TEXT;
BEGIN
    DELETE FROM classlog_sessions WHERE expires_at < NOW();

    SELECT * INTO v_teacher
    FROM classlog_teachers
    WHERE username = lower(trim(p_username))
      AND password_hash = crypt(p_password, password_hash);

    IF NOT FOUND THEN
        RETURN '{"ok":false,"reason":"wrong"}'::JSONB;
    END IF;

    IF NOT v_teacher.active THEN
        RETURN '{"ok":false,"reason":"inactive"}'::JSONB;
    END IF;

    v_token := encode(gen_random_bytes(32), 'hex');

    INSERT INTO classlog_sessions (teacher_id, token, expires_at, session_kind)
    VALUES (v_teacher.id, v_token, NOW() + INTERVAL '12 hours', 'teacher');

    RETURN jsonb_build_object(
        'ok', true,
        'session_token', v_token,
        'session_kind', 'teacher',
        'teacher', jsonb_build_object(
            'id',       v_teacher.id,
            'username', v_teacher.username,
            'name',     v_teacher.name,
            'role',     v_teacher.role,
            'classes',  COALESCE(v_teacher.classes, '{}'),
            'subjects', COALESCE(v_teacher.subjects, '{}'),
            'active',   v_teacher.active
        )
    );
END;
$$;

CREATE OR REPLACE FUNCTION cl_logout(p_token TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    DELETE FROM classlog_sessions WHERE token = p_token;
    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION cl_issue_kiosk_session(
    p_token TEXT,
    p_class_name TEXT,
    p_subject_id TEXT,
    p_term_id TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_caller classlog_teachers%ROWTYPE;
    v_token TEXT;
    v_term_id TEXT;
    v_expiry TIMESTAMPTZ;
BEGIN
    DELETE FROM classlog_sessions WHERE expires_at < NOW();

    v_caller := cl_check_session(p_token);
    IF v_caller.id IS NULL THEN
        RETURN '{"ok":false,"reason":"unauthorized"}'::JSONB;
    END IF;

    IF NOT cl_is_teacher_authorized(v_caller, p_class_name, p_subject_id) THEN
        RETURN '{"ok":false,"reason":"forbidden"}'::JSONB;
    END IF;

    v_term_id := NULLIF(trim(COALESCE(p_term_id, '')), '');
    v_expiry := NOW() + INTERVAL '10 minutes';
    v_token := encode(gen_random_bytes(32), 'hex');

    INSERT INTO classlog_sessions (
        teacher_id,
        token,
        expires_at,
        session_kind,
        scope_class_name,
        scope_subject_id,
        scope_term_id,
        issued_by_teacher_id
    )
    VALUES (
        v_caller.id,
        v_token,
        v_expiry,
        'kiosk',
        p_class_name,
        p_subject_id,
        v_term_id,
        v_caller.id
    );

    RETURN jsonb_build_object(
        'ok', true,
        'session_token', v_token,
        'session_kind', 'kiosk',
        'expires_at', v_expiry,
        'teacher', jsonb_build_object(
            'id',       v_caller.id,
            'username', v_caller.username,
            'name',     v_caller.name,
            'role',     v_caller.role,
            'classes',  ARRAY[p_class_name],
            'subjects', ARRAY[p_subject_id],
            'active',   v_caller.active
        )
    );
END;
$$;

CREATE OR REPLACE FUNCTION cl_list_teachers(p_token TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_caller classlog_teachers%ROWTYPE;
    v_session classlog_sessions%ROWTYPE;
BEGIN
    v_session := cl_get_session_row(p_token);
    v_caller := cl_check_session(p_token);

    IF v_caller.id IS NULL OR v_session.session_kind <> 'teacher' OR v_caller.role != 'admin' THEN
        RETURN '[]'::JSONB;
    END IF;

    RETURN (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id',       id,
            'username', username,
            'name',     name,
            'role',     role,
            'classes',  classes,
            'subjects', subjects,
            'active',   active
        ) ORDER BY name), '[]'::JSONB)
        FROM classlog_teachers
    );
END;
$$;

CREATE OR REPLACE FUNCTION cl_save_teacher(p_token TEXT, p_teacher JSONB)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_caller classlog_teachers%ROWTYPE;
    v_session classlog_sessions%ROWTYPE;
    v_id BIGINT;
    v_hash TEXT;
BEGIN
    v_session := cl_get_session_row(p_token);
    v_caller := cl_check_session(p_token);

    IF v_caller.id IS NULL OR v_session.session_kind <> 'teacher' OR v_caller.role != 'admin' THEN
        RETURN false;
    END IF;

    v_id := NULLIF(p_teacher->>'id', '')::BIGINT;
    v_hash := CASE
        WHEN COALESCE(p_teacher->>'password', '') <> '' THEN crypt(p_teacher->>'password', gen_salt('bf'))
        ELSE NULL
    END;

    IF v_id IS NOT NULL THEN
        UPDATE classlog_teachers SET
            name          = p_teacher->>'name',
            username      = lower(p_teacher->>'username'),
            role          = p_teacher->>'role',
            active        = COALESCE((p_teacher->>'active')::BOOLEAN, true),
            classes       = ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_teacher->'classes', '[]'::JSONB))),
            subjects      = ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_teacher->'subjects', '[]'::JSONB))),
            password_hash = COALESCE(v_hash, password_hash),
            password      = NULL
        WHERE id = v_id;
    ELSE
        IF v_hash IS NULL THEN
            RETURN false;
        END IF;

        INSERT INTO classlog_teachers (username, password, password_hash, name, role, active, classes, subjects)
        VALUES (
            lower(p_teacher->>'username'),
            NULL,
            v_hash,
            p_teacher->>'name',
            COALESCE(p_teacher->>'role', 'teacher'),
            COALESCE((p_teacher->>'active')::BOOLEAN, true),
            ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_teacher->'classes', '[]'::JSONB))),
            ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_teacher->'subjects', '[]'::JSONB)))
        );
    END IF;

    RETURN true;
EXCEPTION
    WHEN unique_violation THEN
        RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION cl_delete_teacher(p_token TEXT, p_id BIGINT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_caller classlog_teachers%ROWTYPE;
    v_session classlog_sessions%ROWTYPE;
BEGIN
    v_session := cl_get_session_row(p_token);
    v_caller := cl_check_session(p_token);

    IF v_caller.id IS NULL OR v_session.session_kind <> 'teacher' OR v_caller.role != 'admin' THEN
        RETURN false;
    END IF;

    IF v_caller.id = p_id THEN
        RETURN false;
    END IF;

    DELETE FROM classlog_teachers WHERE id = p_id;
    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION cl_change_password(p_token TEXT, p_new_password TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_caller classlog_teachers%ROWTYPE;
    v_session classlog_sessions%ROWTYPE;
BEGIN
    v_session := cl_get_session_row(p_token);
    v_caller := cl_check_session(p_token);

    IF v_caller.id IS NULL OR v_session.session_kind <> 'teacher' THEN
        RETURN false;
    END IF;

    IF length(trim(p_new_password)) < 8 THEN
        RETURN false;
    END IF;

    UPDATE classlog_teachers
    SET password_hash = crypt(trim(p_new_password), gen_salt('bf')),
        password = NULL
    WHERE id = v_caller.id;

    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION cl_get_settings(p_token TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_caller classlog_teachers%ROWTYPE;
    v_session classlog_sessions%ROWTYPE;
BEGIN
    v_session := cl_get_session_row(p_token);
    v_caller := cl_check_session(p_token);

    IF v_caller.id IS NULL OR v_session.session_kind <> 'teacher' THEN
        RETURN '{"ok":false,"reason":"unauthorized"}'::JSONB;
    END IF;

    RETURN jsonb_build_object(
        'ok', true,
        'settings', cl_get_settings_blob()
    );
END;
$$;

CREATE OR REPLACE FUNCTION cl_get_teacher_view(
    p_token TEXT,
    p_class_name TEXT,
    p_subject_id TEXT,
    p_term_id TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_caller classlog_teachers%ROWTYPE;
    v_session classlog_sessions%ROWTYPE;
    v_settings JSONB;
    v_term_id TEXT;
    v_base_id TEXT;
    v_subject_row classlog_storage%ROWTYPE;
    v_base_row classlog_storage%ROWTYPE;
    v_requested_term TEXT;
BEGIN
    v_session := cl_get_session_row(p_token);
    v_caller := cl_check_session(p_token);

    IF v_caller.id IS NULL OR v_session.id IS NULL THEN
        RETURN '{"ok":false,"reason":"unauthorized"}'::JSONB;
    END IF;

    v_settings := cl_get_settings_blob();
    v_requested_term := NULLIF(trim(COALESCE(p_term_id, '')), '');

    IF v_session.session_kind = 'kiosk' THEN
        IF NOT cl_session_scope_matches(v_session, p_class_name, p_subject_id, v_requested_term) THEN
            RETURN '{"ok":false,"reason":"forbidden"}'::JSONB;
        END IF;
        v_term_id := COALESCE(v_requested_term, v_session.scope_term_id);
    ELSE
        IF NOT cl_is_teacher_authorized(v_caller, p_class_name, p_subject_id) THEN
            RETURN '{"ok":false,"reason":"forbidden"}'::JSONB;
        END IF;
        v_term_id := COALESCE(v_requested_term, NULLIF(v_settings->>'activeTermId', ''));
    END IF;

    v_base_id := cl_term_prefix(v_term_id) || p_class_name;

    SELECT * INTO v_base_row
    FROM classlog_storage
    WHERE id = v_base_id;

    SELECT * INTO v_subject_row
    FROM classlog_storage
    WHERE id = v_base_id || '_' || p_subject_id;

    RETURN jsonb_build_object(
        'ok', true,
        'class_name', p_class_name,
        'subject_id', p_subject_id,
        'term_id', v_term_id,
        'students', COALESCE(v_base_row.students, '[]'::JSONB),
        'notes', COALESCE(v_base_row.notes, '{}'::JSONB),
        'records', COALESCE(v_subject_row.records, '{}'::JSONB),
        'classRecords', COALESCE(v_subject_row."classRecords", '{}'::JSONB),
        'settings', v_settings,
        'server_ts', NOW(),
        'base_updated_at', v_base_row.last_updated,
        'subject_updated_at', v_subject_row.last_updated
    );
END;
$$;

CREATE OR REPLACE FUNCTION cl_get_parent_link(
    p_token TEXT,
    p_class_name TEXT
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_caller classlog_teachers%ROWTYPE;
    v_session classlog_sessions%ROWTYPE;
    v_parent_token TEXT;
BEGIN
    v_session := cl_get_session_row(p_token);
    v_caller := cl_check_session(p_token);

    IF v_caller.id IS NULL OR v_session.session_kind <> 'teacher' THEN
        RETURN '{"ok":false,"reason":"unauthorized"}'::JSONB;
    END IF;

    IF NOT cl_is_teacher_authorized(v_caller, p_class_name, NULL) THEN
        RETURN '{"ok":false,"reason":"forbidden"}'::JSONB;
    END IF;

    SELECT token INTO v_parent_token
    FROM classlog_parent_links
    WHERE class_name = p_class_name
      AND active = true;

    IF v_parent_token IS NULL THEN
        v_parent_token := encode(gen_random_bytes(24), 'hex');
        INSERT INTO classlog_parent_links (class_name, token, active, updated_at)
        VALUES (p_class_name, v_parent_token, true, NOW())
        ON CONFLICT (class_name) DO UPDATE SET
            token = COALESCE(classlog_parent_links.token, EXCLUDED.token),
            active = true,
            updated_at = NOW()
        RETURNING token INTO v_parent_token;
    ELSE
        UPDATE classlog_parent_links
        SET active = true,
            updated_at = NOW()
        WHERE class_name = p_class_name;
    END IF;

    RETURN jsonb_build_object(
        'ok', true,
        'class_name', p_class_name,
        'parent_token', v_parent_token
    );
END;
$$;

CREATE OR REPLACE FUNCTION cl_get_parent_view(
    p_parent_token TEXT,
    p_subject_id TEXT
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_link classlog_parent_links%ROWTYPE;
    v_settings JSONB;
    v_parent_settings JSONB;
    v_term_id TEXT;
    v_base_id TEXT;
    v_base_row classlog_storage%ROWTYPE;
    v_subject_row classlog_storage%ROWTYPE;
BEGIN
    SELECT * INTO v_link
    FROM classlog_parent_links
    WHERE token = p_parent_token
      AND active = true;

    IF v_link.class_name IS NULL THEN
        RETURN '{"ok":false,"reason":"invalid"}'::JSONB;
    END IF;

    v_settings := cl_get_settings_blob();

    IF EXISTS (
        SELECT 1
        FROM jsonb_array_elements(COALESCE(v_settings->'subjects', '[]'::JSONB)) AS subject_item
        WHERE subject_item->>'id' = p_subject_id
          AND COALESCE((subject_item->>'showInParent')::BOOLEAN, true) = false
    ) THEN
        RETURN '{"ok":false,"reason":"hidden"}'::JSONB;
    END IF;

    v_parent_settings := jsonb_build_object(
        'subjects',
        COALESCE((
            SELECT jsonb_agg(subject_item)
            FROM jsonb_array_elements(COALESCE(v_settings->'subjects', '[]'::JSONB)) AS subject_item
            WHERE COALESCE((subject_item->>'showInParent')::BOOLEAN, true) = true
        ), '[]'::JSONB),
        'termString', v_settings->>'termString',
        'activeTermId', NULLIF(v_settings->>'activeTermId', ''),
        'terms', COALESCE(v_settings->'terms', '[]'::JSONB)
    );

    v_term_id := NULLIF(v_settings->>'activeTermId', '');
    v_base_id := cl_term_prefix(v_term_id) || v_link.class_name;

    SELECT * INTO v_base_row
    FROM classlog_storage
    WHERE id = v_base_id;

    SELECT * INTO v_subject_row
    FROM classlog_storage
    WHERE id = v_base_id || '_' || p_subject_id;

    RETURN jsonb_build_object(
        'ok', true,
        'class_name', v_link.class_name,
        'subject_id', p_subject_id,
        'term_id', v_term_id,
        'students', COALESCE(v_base_row.students, '[]'::JSONB),
        'notes', COALESCE(v_base_row.notes, '{}'::JSONB),
        'records', COALESCE(v_subject_row.records, '{}'::JSONB),
        'classRecords', COALESCE(v_subject_row."classRecords", '{}'::JSONB),
        'settings', v_parent_settings,
        'server_ts', NOW(),
        'base_updated_at', v_base_row.last_updated,
        'subject_updated_at', v_subject_row.last_updated
    );
END;
$$;

CREATE OR REPLACE FUNCTION cl_save_records(
    p_token TEXT,
    p_id TEXT,
    p_records JSONB,
    p_class_records JSONB
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_caller classlog_teachers%ROWTYPE;
    v_session classlog_sessions%ROWTYPE;
    v_class_name TEXT;
    v_subject_id TEXT;
    v_term_id TEXT;
BEGIN
    v_session := cl_get_session_row(p_token);
    v_caller := cl_check_session(p_token);

    IF v_caller.id IS NULL OR v_session.id IS NULL THEN
        RETURN false;
    END IF;

    v_class_name := cl_extract_storage_class(p_id);
    v_subject_id := cl_extract_storage_subject(p_id);
    v_term_id := cl_extract_storage_term(p_id);

    IF v_session.session_kind = 'kiosk' THEN
        IF NOT cl_session_scope_matches(v_session, v_class_name, v_subject_id, v_term_id) THEN
            RETURN false;
        END IF;
    ELSIF NOT cl_is_teacher_authorized(v_caller, v_class_name, v_subject_id) THEN
        RETURN false;
    END IF;

    INSERT INTO classlog_storage (id, records, "classRecords", last_updated)
    VALUES (p_id, COALESCE(p_records, '{}'::JSONB), COALESCE(p_class_records, '{}'::JSONB), NOW())
    ON CONFLICT (id) DO UPDATE SET
        records = EXCLUDED.records,
        "classRecords" = EXCLUDED."classRecords",
        last_updated = NOW();

    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION cl_save_base(
    p_token TEXT,
    p_id TEXT,
    p_students JSONB,
    p_notes JSONB
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_caller classlog_teachers%ROWTYPE;
    v_session classlog_sessions%ROWTYPE;
    v_class_name TEXT;
BEGIN
    v_session := cl_get_session_row(p_token);
    v_caller := cl_check_session(p_token);

    IF v_caller.id IS NULL OR v_session.id IS NULL THEN
        RETURN false;
    END IF;

    IF v_session.session_kind <> 'teacher' THEN
        RETURN false;
    END IF;

    v_class_name := cl_extract_storage_class(p_id);

    IF NOT cl_is_teacher_authorized(v_caller, v_class_name, NULL) THEN
        RETURN false;
    END IF;

    INSERT INTO classlog_storage (id, students, notes, last_updated)
    VALUES (p_id, COALESCE(p_students, '[]'::JSONB), COALESCE(p_notes, '{}'::JSONB), NOW())
    ON CONFLICT (id) DO UPDATE SET
        students = EXCLUDED.students,
        notes = EXCLUDED.notes,
        last_updated = NOW();

    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION cl_save_settings(p_token TEXT, p_subjects JSONB, p_term_string TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_caller classlog_teachers%ROWTYPE;
    v_session classlog_sessions%ROWTYPE;
BEGIN
    v_session := cl_get_session_row(p_token);
    v_caller := cl_check_session(p_token);

    IF v_caller.id IS NULL OR v_session.session_kind <> 'teacher' OR v_caller.role != 'admin' THEN
        RETURN false;
    END IF;

    INSERT INTO classlog_storage (id, records, last_updated)
    VALUES ('__settings__', jsonb_build_object('subjects', p_subjects, 'termString', p_term_string), NOW())
    ON CONFLICT (id) DO UPDATE SET
        records = classlog_storage.records || EXCLUDED.records,
        last_updated = NOW();

    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION cl_save_settings_v2(p_token TEXT, p_settings JSONB)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_caller classlog_teachers%ROWTYPE;
    v_session classlog_sessions%ROWTYPE;
BEGIN
    v_session := cl_get_session_row(p_token);
    v_caller := cl_check_session(p_token);

    IF v_caller.id IS NULL OR v_session.session_kind <> 'teacher' OR v_caller.role != 'admin' THEN
        RETURN false;
    END IF;

    INSERT INTO classlog_storage (id, records, last_updated)
    VALUES ('__settings__', p_settings, NOW())
    ON CONFLICT (id) DO UPDATE SET
        records = EXCLUDED.records,
        last_updated = NOW();

    RETURN true;
END;
$$;

-- -------------------------------------------------------------------
-- RLS lockdown
-- -------------------------------------------------------------------

ALTER TABLE classlog_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE classlog_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE classlog_storage ENABLE ROW LEVEL SECURITY;
ALTER TABLE classlog_parent_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teachers_read" ON classlog_teachers;
DROP POLICY IF EXISTS "teachers_write" ON classlog_teachers;
DROP POLICY IF EXISTS "teachers_deny_all" ON classlog_teachers;
CREATE POLICY "teachers_deny_all" ON classlog_teachers
FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "sessions_read" ON classlog_sessions;
DROP POLICY IF EXISTS "sessions_write" ON classlog_sessions;
DROP POLICY IF EXISTS "sessions_deny_all" ON classlog_sessions;
CREATE POLICY "sessions_deny_all" ON classlog_sessions
FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "storage_read" ON classlog_storage;
DROP POLICY IF EXISTS "storage_insert" ON classlog_storage;
DROP POLICY IF EXISTS "storage_update" ON classlog_storage;
DROP POLICY IF EXISTS "storage_delete" ON classlog_storage;
DROP POLICY IF EXISTS "storage_read_secure" ON classlog_storage;
DROP POLICY IF EXISTS "storage_deny_all_v33" ON classlog_storage;
DROP POLICY IF EXISTS "storage_deny_all" ON classlog_storage;
CREATE POLICY "storage_deny_all" ON classlog_storage
FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "parent_links_deny_all" ON classlog_parent_links;
CREATE POLICY "parent_links_deny_all" ON classlog_parent_links
FOR ALL USING (false) WITH CHECK (false);

-- -------------------------------------------------------------------
-- Direct table privilege lockdown
-- -------------------------------------------------------------------

REVOKE ALL ON TABLE classlog_teachers FROM anon, authenticated;
REVOKE ALL ON TABLE classlog_sessions FROM anon, authenticated;
REVOKE ALL ON TABLE classlog_storage FROM anon, authenticated;
REVOKE ALL ON TABLE classlog_parent_links FROM anon, authenticated;

-- -------------------------------------------------------------------
-- Function EXECUTE lockdown
-- -------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.cl_check_session(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cl_get_settings_blob() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cl_extract_storage_class(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cl_extract_storage_subject(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cl_extract_storage_term(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cl_term_prefix(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cl_is_teacher_authorized(classlog_teachers, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cl_get_session_row(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cl_session_scope_matches(classlog_sessions, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.cl_authenticate(TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cl_logout(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cl_change_password(TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cl_issue_kiosk_session(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
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
GRANT EXECUTE ON FUNCTION public.cl_issue_kiosk_session(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
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

-- -------------------------------------------------------------------
-- Harden SECURITY DEFINER search_path
-- -------------------------------------------------------------------

ALTER FUNCTION public.cl_authenticate(TEXT, TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_check_session(TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_get_settings_blob() SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_extract_storage_class(TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_extract_storage_subject(TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_extract_storage_term(TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_term_prefix(TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_is_teacher_authorized(classlog_teachers, TEXT, TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_get_session_row(TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_session_scope_matches(classlog_sessions, TEXT, TEXT, TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_logout(TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_issue_kiosk_session(TEXT, TEXT, TEXT, TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_list_teachers(TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_save_teacher(TEXT, JSONB) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_delete_teacher(TEXT, BIGINT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_change_password(TEXT, TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_get_settings(TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_get_teacher_view(TEXT, TEXT, TEXT, TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_get_parent_link(TEXT, TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_get_parent_view(TEXT, TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_save_base(TEXT, TEXT, JSONB, JSONB) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_save_records(TEXT, TEXT, JSONB, JSONB) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_save_settings(TEXT, JSONB, TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_save_settings_v2(TEXT, JSONB) SET search_path = public, extensions, pg_temp;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

COMMIT;

-- -------------------------------------------------------------------
-- First admin user
-- -------------------------------------------------------------------
-- Run this once after bootstrap and replace the password:
--
-- INSERT INTO classlog_teachers (
--     username, password, password_hash, name, role, classes, subjects, active
-- ) VALUES (
--     'admin',
--     NULL,
--     crypt('CHANGE_THIS_ADMIN_PASSWORD', gen_salt('bf')),
--     'Sistem Yöneticisi',
--     'admin',
--     '{}',
--     '{}',
--     TRUE
-- )
-- ON CONFLICT (username) DO UPDATE SET
--     password = NULL,
--     password_hash = EXCLUDED.password_hash,
--     name = EXCLUDED.name,
--     role = EXCLUDED.role,
--     classes = EXCLUDED.classes,
--     subjects = EXCLUDED.subjects,
--     active = EXCLUDED.active;

SELECT 'ClassLog Pro final bootstrap hazır' AS status;
