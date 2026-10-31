-- Turn off the speech feature without deleting exams, scores or student records.
-- Requires the speech schema/RPC installation. Does not finish active exams.
BEGIN;
CREATE OR REPLACE FUNCTION public.cl_speech_exam_enabled() RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $$ SELECT false $$;
REVOKE ALL ON FUNCTION public.cl_speech_exam_enabled(),public.cl_speech_exam_rpc(text,text,jsonb),public.cl_speech_device_rpc(text,text,text,jsonb)
 FROM PUBLIC,anon,authenticated;
UPDATE public.classlog_speech_board_grants SET revoked_at=now() WHERE revoked_at IS NULL;
DO $$ DECLARE exam record; BEGIN
 FOR exam IN SELECT signal_topic,revision FROM public.classlog_speech_exams WHERE status='active' LOOP
  PERFORM public.cl_speech_exam_signal(exam.signal_topic,exam.revision);
 END LOOP;
END $$;
NOTIFY pgrst, 'reload schema';
COMMIT;
