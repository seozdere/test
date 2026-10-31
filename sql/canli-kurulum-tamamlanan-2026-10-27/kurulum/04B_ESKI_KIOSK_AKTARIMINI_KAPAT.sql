-- Kullanilmayan ESKI kiosk/QR admin aktarimini kapatir. Yeni sinav cihaz onayi etkilenmez.
-- Mevcut ogrenci/puan verilerini ve normal ogretmen oturumlarini degistirmez.
-- Varsa aktif eski kiosk oturumlarinin suresini bitirir; kayit silmez.
BEGIN;
DO $$ BEGIN
 IF to_regprocedure('public.cl_issue_kiosk_session(text,text,text,text)') IS NULL
 OR md5(pg_get_functiondef('public.cl_issue_kiosk_session(text,text,text,text)'::regprocedure)) <> 'd2fd886ade1cc21914f1b5a42a63e5a0' THEN
  RAISE EXCEPTION 'Kiosk function differs from reviewed live definition; stop and review';
 END IF;
 IF public.cl_speech_exam_enabled() THEN RAISE EXCEPTION 'Speech access must remain disabled at this step'; END IF;
END $$;
CREATE OR REPLACE FUNCTION public.cl_issue_kiosk_session(p_token text,p_class_name text,p_subject_id text,p_term_id text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 RETURN jsonb_build_object('ok',false,'reason','legacy_kiosk_disabled');
END;
$$;
REVOKE ALL ON FUNCTION public.cl_issue_kiosk_session(text,text,text,text) FROM PUBLIC,anon,authenticated;
UPDATE public.classlog_sessions SET expires_at=now() WHERE session_kind='kiosk' AND expires_at>now();
NOTIFY pgrst, 'reload schema';
SELECT jsonb_build_object(
 'legacy_kiosk_disabled',true,
 'anon_execute',has_function_privilege('anon','public.cl_issue_kiosk_session(text,text,text,text)','EXECUTE'),
 'authenticated_execute',has_function_privilege('authenticated','public.cl_issue_kiosk_session(text,text,text,text)','EXECUTE'),
 'active_legacy_kiosk_sessions',(SELECT count(*) FROM public.classlog_sessions WHERE session_kind='kiosk' AND expires_at>now()),
 'speech_server_enabled',public.cl_speech_exam_enabled()
) AS eski_kiosk_kapatma_kontrolu;
COMMIT;
