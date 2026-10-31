-- NoTik: ayni puana ikinci kez basildiginda o olcutu puanlanmamis yap.
-- Mevcut sinav kurulumu ve 34 guncellemesi uzerine uygulanir.
-- Yalnizca save isleminin puan dogrulamasi degisir: 1-10 veya JSON null.
-- Kayitlar, yetkiler, RLS, sinav durumu ve diger fonksiyonlar korunur.
BEGIN;
DO $patch$
DECLARE
 definition text;
 old_check text := 'IF v_key !~ ''^[0-9]$'' OR jsonb_typeof(v_score)<>''number'' OR v_score::text !~ ''^([1-9]|10)$'' THEN';
 new_check text := 'IF v_key !~ ''^[0-9]$'' OR (v_score<>''null''::jsonb AND (jsonb_typeof(v_score)<>''number'' OR v_score::text !~ ''^([1-9]|10)$'')) THEN /* speech-score-toggle-v1 */';
BEGIN
 IF to_regprocedure('public.cl_speech_exam_rpc(text,text,jsonb)') IS NULL THEN
  RAISE EXCEPTION 'Once mevcut konusma sinavi kurulumu tamamlanmali';
 END IF;
 definition := pg_get_functiondef('public.cl_speech_exam_rpc(text,text,jsonb)'::regprocedure);
 IF position('/* speech-score-toggle-v1 */' IN definition)=0 THEN
  IF (length(definition)-length(replace(definition,old_check,'')))/length(old_check)<>1 THEN
   RAISE EXCEPTION 'RPC tanimi beklenenden farkli; hicbir degisiklik uygulanmadi';
  END IF;
  EXECUTE replace(definition,old_check,new_check);
 END IF;
END $patch$;
NOTIFY pgrst, 'reload schema';
COMMIT;

SELECT jsonb_build_object(
 'score_toggle_installed',position('/* speech-score-toggle-v1 */' IN pg_get_functiondef('public.cl_speech_exam_rpc(text,text,jsonb)'::regprocedure))>0,
 'server_enabled',public.cl_speech_exam_enabled(),
 'snapshot_public_access',has_function_privilege('anon','public.cl_speech_exam_snapshot(uuid,boolean)','EXECUTE'),
 'direct_scores_access',has_table_privilege('anon','public.classlog_speech_results','SELECT,INSERT,UPDATE,DELETE')
) AS puan_geri_alma_kontrolu;
