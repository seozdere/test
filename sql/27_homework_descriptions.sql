-- Run once in the Supabase SQL Editor before publishing the updated frontend.
-- Existing marks, notes and RPC functions are not changed.
BEGIN;

CREATE TABLE IF NOT EXISTS public.classlog_homework_descriptions (
    term_id TEXT NOT NULL,
    class_name TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    homework_date DATE NOT NULL,
    description TEXT NOT NULL CHECK (char_length(description) <= 1500),
    revision INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (term_id, class_name, subject_id, homework_date)
);
ALTER TABLE public.classlog_homework_descriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.classlog_homework_descriptions FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.cl_get_homework_descriptions(
    p_token TEXT, p_class_name TEXT, p_subject_id TEXT, p_term_id TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp AS $$
DECLARE v_view JSONB; v_term TEXT; v_items JSONB;
BEGIN
    v_view := public.cl_get_teacher_view(p_token, p_class_name, p_subject_id, p_term_id);
    IF NOT COALESCE((v_view->>'ok')::boolean, false) THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'unauthorized');
    END IF;
    v_term := COALESCE(p_term_id, public.cl_get_settings_blob()->>'activeTermId', '');
    SELECT COALESCE(jsonb_object_agg(homework_date::text,
        jsonb_build_object('text', description, 'revision', revision)), '{}'::jsonb)
    INTO v_items FROM public.classlog_homework_descriptions
    WHERE term_id = v_term AND class_name = p_class_name AND subject_id = p_subject_id;
    RETURN jsonb_build_object('ok', true, 'descriptions', v_items);
END;
$$;

CREATE OR REPLACE FUNCTION public.cl_get_parent_homework_descriptions(
    p_parent_token TEXT, p_subject_id TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp AS $$
DECLARE v_view JSONB; v_class TEXT; v_term TEXT; v_items JSONB;
BEGIN
    v_view := public.cl_get_parent_view(p_parent_token, p_subject_id);
    IF NOT COALESCE((v_view->>'ok')::boolean, false) THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'unauthorized');
    END IF;
    SELECT class_name INTO v_class FROM public.classlog_parent_links
    WHERE token = p_parent_token AND active = true;
    IF v_class IS NULL THEN RETURN jsonb_build_object('ok', false); END IF;
    v_term := COALESCE(public.cl_get_settings_blob()->>'activeTermId', '');
    SELECT COALESCE(jsonb_object_agg(homework_date::text,
        jsonb_build_object('text', description, 'revision', revision)), '{}'::jsonb)
    INTO v_items FROM public.classlog_homework_descriptions
    WHERE term_id = v_term AND class_name = v_class AND subject_id = p_subject_id;
    RETURN jsonb_build_object('ok', true, 'descriptions', v_items);
END;
$$;

CREATE OR REPLACE FUNCTION public.cl_save_homework_description(
    p_token TEXT, p_class_name TEXT, p_subject_id TEXT, p_term_id TEXT,
    p_date DATE, p_text TEXT, p_expected_revision INTEGER
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp AS $$
DECLARE v_view JSONB; v_term TEXT; v_revision INTEGER;
BEGIN
    IF (public.cl_get_session_row(p_token)).session_kind IS DISTINCT FROM 'teacher' THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'unauthorized');
    END IF;
    v_view := public.cl_get_teacher_view(p_token, p_class_name, p_subject_id, p_term_id);
    IF NOT COALESCE((v_view->>'ok')::boolean, false) THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'unauthorized');
    END IF;
    v_term := COALESCE(public.cl_get_settings_blob()->>'activeTermId', '');
    IF COALESCE(p_term_id, v_term) <> v_term THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'archive');
    END IF;
    IF p_date IS NULL OR p_text IS NULL OR char_length(p_text) > 1500
       OR p_expected_revision IS NULL OR p_expected_revision < 0 THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'invalid');
    END IF;
    IF p_expected_revision = 0 THEN
        INSERT INTO public.classlog_homework_descriptions
            (term_id, class_name, subject_id, homework_date, description)
        VALUES (v_term, p_class_name, p_subject_id, p_date, btrim(p_text))
        ON CONFLICT DO NOTHING RETURNING revision INTO v_revision;
    ELSE
        UPDATE public.classlog_homework_descriptions
        SET description = btrim(p_text), revision = revision + 1, updated_at = now()
        WHERE term_id = v_term AND class_name = p_class_name AND subject_id = p_subject_id
          AND homework_date = p_date AND revision = p_expected_revision
        RETURNING revision INTO v_revision;
    END IF;
    IF v_revision IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'conflict'); END IF;
    RETURN jsonb_build_object('ok', true, 'revision', v_revision);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cl_get_homework_descriptions(TEXT,TEXT,TEXT,TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cl_get_parent_homework_descriptions(TEXT,TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cl_save_homework_description(TEXT,TEXT,TEXT,TEXT,DATE,TEXT,INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cl_get_homework_descriptions(TEXT,TEXT,TEXT,TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cl_get_parent_homework_descriptions(TEXT,TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cl_save_homework_description(TEXT,TEXT,TEXT,TEXT,DATE,TEXT,INTEGER) TO anon, authenticated;
COMMIT;
