-- Run once before deploying. Adds independent speaking-topic storage only.
BEGIN;
CREATE TABLE IF NOT EXISTS public.classlog_speech_topics (
 term_id TEXT NOT NULL, class_name TEXT NOT NULL, subject_id TEXT NOT NULL,
 topics JSONB NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(topics)='array'),
 revision INTEGER NOT NULL DEFAULT 1, updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(term_id,class_name,subject_id)
);
ALTER TABLE public.classlog_speech_topics ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.classlog_speech_topics FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.cl_get_speech_topics(
    p_token TEXT, p_class_name TEXT, p_subject_id TEXT, p_term_id TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp AS $$
DECLARE v_view JSONB; v_term TEXT; v_items JSONB; v_revision INTEGER;
BEGIN
    v_view := public.cl_get_teacher_view(p_token, p_class_name, p_subject_id, p_term_id);
    IF NOT COALESCE((v_view->>'ok')::boolean, false) THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'unauthorized');
    END IF;
    v_term := COALESCE(p_term_id, public.cl_get_settings_blob()->>'activeTermId', '');
    SELECT topics, revision INTO v_items, v_revision FROM public.classlog_speech_topics
    WHERE term_id = v_term AND class_name = p_class_name AND subject_id = p_subject_id;
    RETURN jsonb_build_object('ok', true, 'topics', COALESCE(v_items, '[]'::jsonb), 'revision', COALESCE(v_revision, 0));
END;
$$;
CREATE OR REPLACE FUNCTION public.cl_get_parent_speech_topics(
    p_parent_token TEXT, p_subject_id TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp AS $$
DECLARE v_view JSONB; v_class TEXT; v_term TEXT; v_items JSONB; v_revision INTEGER;
BEGIN
    v_view := public.cl_get_parent_view(p_parent_token, p_subject_id);
    IF NOT COALESCE((v_view->>'ok')::boolean, false) THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'unauthorized');
    END IF;
    SELECT class_name INTO v_class FROM public.classlog_parent_links
    WHERE token = p_parent_token AND active = true;
    IF v_class IS NULL THEN RETURN jsonb_build_object('ok', false); END IF;
    v_term := COALESCE(public.cl_get_settings_blob()->>'activeTermId', '');
    SELECT topics, revision INTO v_items, v_revision FROM public.classlog_speech_topics
    WHERE term_id = v_term AND class_name = v_class AND subject_id = p_subject_id;
    RETURN jsonb_build_object('ok', true, 'topics', COALESCE(v_items, '[]'::jsonb), 'revision', COALESCE(v_revision, 0));
END;
$$;
CREATE OR REPLACE FUNCTION public.cl_save_speech_topics(p_token TEXT,p_class_name TEXT,p_subject_id TEXT,p_term_id TEXT,p_topics JSONB,p_expected_revision INTEGER)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $$
DECLARE v_view JSONB; v_term TEXT; v_revision INTEGER;
BEGIN
 IF (public.cl_get_session_row(p_token)).session_kind IS DISTINCT FROM 'teacher' THEN RETURN jsonb_build_object('ok',false,'reason','unauthorized'); END IF;
 v_view := public.cl_get_teacher_view(p_token,p_class_name,p_subject_id,p_term_id);
 IF NOT COALESCE((v_view->>'ok')::boolean,false) THEN RETURN jsonb_build_object('ok',false,'reason','unauthorized'); END IF;
 v_term := COALESCE(public.cl_get_settings_blob()->>'activeTermId','');
 IF COALESCE(p_term_id,v_term) <> v_term THEN RETURN jsonb_build_object('ok',false,'reason','archive'); END IF;
 IF p_topics IS NULL OR jsonb_typeof(p_topics) <> 'array' OR p_expected_revision IS NULL OR p_expected_revision < 0 THEN RETURN jsonb_build_object('ok',false,'reason','invalid'); END IF;
 IF jsonb_array_length(p_topics)>200 THEN RETURN jsonb_build_object('ok',false,'reason','invalid'); END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_topics) t WHERE jsonb_typeof(t)<>'string' OR length(btrim(t #>> '{}'))=0 OR length(t #>> '{}')>500) THEN RETURN jsonb_build_object('ok',false,'reason','invalid'); END IF;
 IF p_expected_revision=0 THEN
 INSERT INTO public.classlog_speech_topics(term_id,class_name,subject_id,topics) VALUES(v_term,p_class_name,p_subject_id,p_topics) ON CONFLICT DO NOTHING RETURNING revision INTO v_revision;
 ELSE
 UPDATE public.classlog_speech_topics SET topics=p_topics,revision=revision+1,updated_at=now() WHERE term_id=v_term AND class_name=p_class_name AND subject_id=p_subject_id AND revision=p_expected_revision RETURNING revision INTO v_revision;
 END IF;
 IF v_revision IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','conflict'); END IF;
 RETURN jsonb_build_object('ok',true,'revision',v_revision);
END; $$;
REVOKE EXECUTE ON FUNCTION public.cl_get_speech_topics(TEXT,TEXT,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cl_get_speech_topics(TEXT,TEXT,TEXT,TEXT) TO anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.cl_get_parent_speech_topics(TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cl_get_parent_speech_topics(TEXT,TEXT) TO anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.cl_save_speech_topics(TEXT,TEXT,TEXT,TEXT,JSONB,INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cl_save_speech_topics(TEXT,TEXT,TEXT,TEXT,JSONB,INTEGER) TO anon,authenticated;
COMMIT;
