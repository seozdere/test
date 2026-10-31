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
    v_expiry := NOW() + INTERVAL '15 minutes';
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
