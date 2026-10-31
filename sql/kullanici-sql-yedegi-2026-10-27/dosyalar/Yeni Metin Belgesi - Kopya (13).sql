-- ClassLog Pro v36
-- Scoped kiosk sessions + parent subject visibility enforcement
-- Apply AFTER v35.

BEGIN;

ALTER TABLE classlog_sessions
    ADD COLUMN IF NOT EXISTS session_kind TEXT,
    ADD COLUMN IF NOT EXISTS scope_class_name TEXT,
    ADD COLUMN IF NOT EXISTS scope_subject_id TEXT,
    ADD COLUMN IF NOT EXISTS scope_term_id TEXT,
    ADD COLUMN IF NOT EXISTS issued_by_teacher_id BIGINT;

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

CREATE INDEX IF NOT EXISTS idx_classlog_sessions_kind_expires
ON classlog_sessions(session_kind, expires_at);

CREATE OR REPLACE FUNCTION cl_extract_storage_term(p_id TEXT)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
    IF position('__' IN p_id) > 0 THEN
        RETURN split_part(p_id, '__', 1);
    END IF;
    RETURN NULL;
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
    v_id     BIGINT;
    v_hash   TEXT;
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
    v_caller   classlog_teachers%ROWTYPE;
    v_session  classlog_sessions%ROWTYPE;
    v_settings JSONB;
    v_term_id  TEXT;
    v_base_id  TEXT;
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
    v_link     classlog_parent_links%ROWTYPE;
    v_settings JSONB;
    v_parent_settings JSONB;
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
        records = EXCLUDED.records,
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

REVOKE EXECUTE ON FUNCTION public.cl_extract_storage_term(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cl_get_session_row(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cl_session_scope_matches(classlog_sessions, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.cl_issue_kiosk_session(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cl_issue_kiosk_session(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

ALTER FUNCTION public.cl_extract_storage_term(TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_get_session_row(TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_session_scope_matches(classlog_sessions, TEXT, TEXT, TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_authenticate(TEXT, TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_issue_kiosk_session(TEXT, TEXT, TEXT, TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_list_teachers(TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_save_teacher(TEXT, JSONB) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_delete_teacher(TEXT, BIGINT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_change_password(TEXT, TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_get_settings(TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_get_teacher_view(TEXT, TEXT, TEXT, TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_get_parent_link(TEXT, TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_get_parent_view(TEXT, TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_save_records(TEXT, TEXT, JSONB, JSONB) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_save_base(TEXT, TEXT, JSONB, JSONB) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_save_settings(TEXT, JSONB, TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.cl_save_settings_v2(TEXT, JSONB) SET search_path = public, extensions, pg_temp;

COMMIT;

SELECT 'ClassLog Pro v36 scoped kiosk security applied' AS status;
