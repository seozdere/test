-- ClassLog Pro - v3.3 Security Hardening
-- Applies after v3.0, security patch v3.1 and v3.2.
-- Adds:
-- - hashed teacher passwords
-- - server-side class/subject authorization for writes
-- - parent access tokens + secure parent read RPC
-- - authenticated teacher read RPC
-- - closed direct table reads for classlog_storage

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE classlog_teachers
    ADD COLUMN IF NOT EXISTS password_hash TEXT;

UPDATE classlog_teachers
SET password_hash = crypt(password, gen_salt('bf'))
WHERE COALESCE(password_hash, '') = ''
  AND COALESCE(password, '') <> '';

CREATE TABLE IF NOT EXISTS classlog_parent_links (
    class_name  TEXT PRIMARY KEY,
    token       TEXT UNIQUE NOT NULL,
    active      BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_classlog_parent_links_token
    ON classlog_parent_links(token);

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

CREATE OR REPLACE FUNCTION cl_term_prefix(p_term_id TEXT)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
    IF p_term_id IS NULL OR trim(p_term_id) = '' THEN
        RETURN '';
    END IF;
    RETURN trim(p_term_id) || '__';
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

    INSERT INTO classlog_sessions (teacher_id, token, expires_at)
    VALUES (v_teacher.id, v_token, NOW() + INTERVAL '12 hours');

    RETURN jsonb_build_object(
        'ok', true,
        'session_token', v_token,
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

CREATE OR REPLACE FUNCTION cl_save_teacher(p_token TEXT, p_teacher JSONB)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_caller classlog_teachers%ROWTYPE;
    v_id     BIGINT;
    v_hash   TEXT;
BEGIN
    v_caller := cl_check_session(p_token);
    IF v_caller.id IS NULL OR v_caller.role != 'admin' THEN
        RETURN false;
    END IF;

    v_id := NULLIF(p_teacher->>'id', '')::BIGINT;
    v_hash := CASE
        WHEN COALESCE(p_teacher->>'password', '') <> '' THEN crypt(p_teacher->>'password', gen_salt('bf'))
        ELSE NULL
    END;

    IF v_id IS NOT NULL THEN
        UPDATE classlog_teachers SET
            name         = p_teacher->>'name',
            username     = lower(p_teacher->>'username'),
            role         = p_teacher->>'role',
            active       = COALESCE((p_teacher->>'active')::BOOLEAN, true),
            classes      = ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_teacher->'classes', '[]'::JSONB))),
            subjects     = ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_teacher->'subjects', '[]'::JSONB))),
            password_hash= COALESCE(v_hash, password_hash)
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

CREATE OR REPLACE FUNCTION cl_change_password(p_token TEXT, p_new_password TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_caller classlog_teachers%ROWTYPE;
BEGIN
    v_caller := cl_check_session(p_token);
    IF v_caller.id IS NULL THEN
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
BEGIN
    v_caller := cl_check_session(p_token);
    IF v_caller.id IS NULL THEN
        RETURN '{"ok":false}'::JSONB;
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
    v_caller   classlog_teachers%ROWTYPE;
    v_settings JSONB;
    v_term_id  TEXT;
    v_base_id  TEXT;
    v_subject_row classlog_storage%ROWTYPE;
    v_base_row classlog_storage%ROWTYPE;
BEGIN
    v_caller := cl_check_session(p_token);
    IF v_caller.id IS NULL THEN
        RETURN '{"ok":false,"reason":"unauthorized"}'::JSONB;
    END IF;

    IF NOT cl_is_teacher_authorized(v_caller, p_class_name, p_subject_id) THEN
        RETURN '{"ok":false,"reason":"forbidden"}'::JSONB;
    END IF;

    v_settings := cl_get_settings_blob();
    v_term_id := COALESCE(NULLIF(trim(p_term_id), ''), NULLIF(v_settings->>'activeTermId', ''));
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
        'settings', v_settings
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
    v_parent_token TEXT;
BEGIN
    v_caller := cl_check_session(p_token);
    IF v_caller.id IS NULL THEN
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
            token = classlog_parent_links.token,
            active = true,
            updated_at = NOW()
        RETURNING token INTO v_parent_token;
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
    v_link     classlog_parent_links%ROWTYPE;
    v_settings JSONB;
    v_term_id  TEXT;
    v_base_id  TEXT;
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
        'settings', v_settings
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
    v_class_name TEXT;
    v_subject_id TEXT;
BEGIN
    v_caller := cl_check_session(p_token);
    IF v_caller.id IS NULL THEN
        RETURN false;
    END IF;

    v_class_name := cl_extract_storage_class(p_id);
    v_subject_id := cl_extract_storage_subject(p_id);

    IF NOT cl_is_teacher_authorized(v_caller, v_class_name, v_subject_id) THEN
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
    v_class_name TEXT;
BEGIN
    v_caller := cl_check_session(p_token);
    IF v_caller.id IS NULL THEN
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

ALTER TABLE classlog_storage ENABLE ROW LEVEL SECURITY;
ALTER TABLE classlog_parent_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "storage_read" ON classlog_storage;
DROP POLICY IF EXISTS "storage_insert" ON classlog_storage;
DROP POLICY IF EXISTS "storage_update" ON classlog_storage;
DROP POLICY IF EXISTS "storage_delete" ON classlog_storage;
DROP POLICY IF EXISTS "storage_read_secure" ON classlog_storage;
DROP POLICY IF EXISTS "storage_deny_all_v33" ON classlog_storage;
CREATE POLICY "storage_deny_all_v33" ON classlog_storage
FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "parent_links_deny_all" ON classlog_parent_links;
CREATE POLICY "parent_links_deny_all" ON classlog_parent_links
FOR ALL USING (false) WITH CHECK (false);
