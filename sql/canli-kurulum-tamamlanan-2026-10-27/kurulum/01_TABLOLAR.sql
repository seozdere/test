-- RELEASE PACKAGE: first installation only. Run after 00_preflight.READONLY.sql review.
-- Adds speech exam tables only. Does not activate access or modify existing class data.
-- Reviewed against Desktop/sql/"Yeni Metin Belgesi - Kopya (12).txt" bootstrap.
-- Actual installed schema/version MUST be checked separately before deployment.
BEGIN;
DO $$ BEGIN
 IF to_regprocedure('public.cl_check_session(text)') IS NULL
 OR to_regprocedure('public.cl_get_session_row(text)') IS NULL
 OR to_regprocedure('public.cl_is_teacher_authorized(public.classlog_teachers,text,text)') IS NULL
 OR to_regprocedure('public.cl_term_prefix(text)') IS NULL
 OR to_regprocedure('public.cl_get_settings_blob()') IS NULL THEN
  RAISE EXCEPTION 'Missing reviewed ClassLog auth dependencies';
 END IF;
END $$;

CREATE FUNCTION public.cl_speech_scores_valid(p_scores jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog,public,extensions,pg_temp AS $$
BEGIN
 IF p_scores IS NULL OR jsonb_typeof(p_scores)<>'array' OR jsonb_array_length(p_scores)<>10 THEN RETURN false; END IF;
 RETURN NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_scores) x WHERE x <> 'null'::jsonb
   AND (jsonb_typeof(x)<>'number' OR x::text !~ '^([1-9]|10)$'));
END $$;
CREATE TABLE public.classlog_speech_rubrics (
 version text PRIMARY KEY, criteria jsonb NOT NULL CHECK(jsonb_typeof(criteria)='array' AND jsonb_array_length(criteria)=10)
);
INSERT INTO public.classlog_speech_rubrics VALUES ('tr-speaking-1', '[
 "Konuya bağlı kalarak amaca uygun konuşma",
 "Konuşmayı giriş, gelişme ve sonuç bütünlüğü içerisinde sunma",
 "Düşüncelerini açık, tutarlı ve örneklerle destekleyerek ifade etme",
 "Konuya uygun, çeşitli ve zengin sözcükler kullanma",
 "Dil bilgisi kurallarına uygun, doğru ve anlamlı cümleler kurma",
 "Gereksiz tekrar, dolgu sözcükleri ve uzun duraksamalar olmadan akıcı konuşma",
 "Sözcükleri doğru, açık ve anlaşılır biçimde seslendirme (telaffuz)",
 "Ses düzeyini, vurgu ve tonlamayı konuşmaya uygun kullanma",
 "Jest, mimik ve beden dilini konuşmayla uyumlu kullanma",
 "Uygun hitap ve bitirme ifadeleri kullanarak konuşmayı ayrılan sürede tamamlama"
]');
CREATE TABLE public.classlog_speech_exams (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_name text NOT NULL,
 subject_id text NOT NULL, term_id text NOT NULL, exam_date date NOT NULL,
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','finished')),
 rubric jsonb NOT NULL, students jsonb NOT NULL CHECK(jsonb_typeof(students)='array'),
 active_student_id uuid, revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 signal_topic uuid NOT NULL DEFAULT gen_random_uuid(),
 created_by bigint NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz
);
CREATE UNIQUE INDEX classlog_speech_one_active_class ON public.classlog_speech_exams(class_name) WHERE status='active';
CREATE INDEX classlog_speech_history ON public.classlog_speech_exams(class_name,subject_id,term_id,created_at DESC);
CREATE TABLE public.classlog_speech_results (
 exam_id uuid NOT NULL REFERENCES public.classlog_speech_exams(id), student_id uuid NOT NULL,
 scores jsonb NOT NULL DEFAULT '[null,null,null,null,null,null,null,null,null,null]' CHECK(public.cl_speech_scores_valid(scores)),
 revision integer NOT NULL DEFAULT 0 CHECK(revision>=0), last_mutation_id uuid,
 last_patch jsonb, updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(exam_id,student_id)
);
CREATE TABLE public.classlog_speech_board_grants (
 token_hash text PRIMARY KEY, exam_id uuid NOT NULL REFERENCES public.classlog_speech_exams(id),
 issuer_session_id bigint NOT NULL, expires_at timestamptz NOT NULL, revoked_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX classlog_speech_board_exam ON public.classlog_speech_board_grants(exam_id);
ALTER TABLE public.classlog_speech_rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classlog_speech_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classlog_speech_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classlog_speech_board_grants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.classlog_speech_rubrics,public.classlog_speech_exams,public.classlog_speech_results,public.classlog_speech_board_grants FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.cl_speech_scores_valid(jsonb) FROM PUBLIC,anon,authenticated;
-- No client table policies. All client access is through the guarded RPC only.
COMMIT;
