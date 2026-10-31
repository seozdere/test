-- ClassLog Pro v34
-- Operational alignment for debug/sync metadata in teacher and parent views.

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
        'settings', v_settings,
        'server_ts', NOW(),
        'base_updated_at', v_base_row.last_updated,
        'subject_updated_at', v_subject_row.last_updated
    );
END;
$$;
