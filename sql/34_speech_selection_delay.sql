-- NoTik: tamamlanan ogrenciyi son basarili puandan sonra 10 saniye goster.
-- Mevcut 01-06 kurulumu uzerine uygulanir. Kurulum SQL'lerini tekrar calistirmayin.
-- Puanlar silinmez; sinav bitirilmez; auth/RLS/RPC izinleri degistirilmez.
-- Sunucu gorunurlugu son tarihle sinirlar. Istemci tek seferlik zamanlayici kullanir;
-- cron, polling, yeni Realtime aboneligi veya ek puan kaydi gerekmez.
BEGIN;
ALTER TABLE public.classlog_speech_exams
 ADD COLUMN IF NOT EXISTS selection_expires_at timestamptz;

DO $patch$
DECLARE
 definition text;
 old_save text := 'active_student_id=CASE WHEN active_student_id=v_student AND NOT v_scores @> ''[null]''::jsonb THEN NULL ELSE active_student_id END';
 new_save text := 'selection_expires_at=CASE WHEN active_student_id=v_student THEN CASE WHEN NOT v_scores @> ''[null]''::jsonb THEN now()+interval ''10 seconds'' ELSE NULL END ELSE selection_expires_at END /* speech-selection-delay-v1 */';
 old_select text := 'SET active_student_id=v_student,revision=revision+1';
 old_finish text := 'SET status=''finished'',active_student_id=NULL,finished_at=now()';
 old_reply text := '''activeStudentId'',v_exam.active_student_id)';
BEGIN
 IF to_regprocedure('public.cl_speech_exam_rpc(text,text,jsonb)') IS NULL
 OR to_regprocedure('public.cl_speech_exam_snapshot(uuid,boolean)') IS NULL THEN
  RAISE EXCEPTION 'Once mevcut konusma sinavi kurulumu tamamlanmali';
 END IF;
 definition := pg_get_functiondef('public.cl_speech_exam_rpc(text,text,jsonb)'::regprocedure);
 IF position('/* speech-selection-delay-v1 */' IN definition)=0 THEN
  IF (length(definition)-length(replace(definition,old_save,'')))/length(old_save)<>1
   OR (length(definition)-length(replace(definition,old_select,'')))/length(old_select)<>1
   OR (length(definition)-length(replace(definition,old_finish,'')))/length(old_finish)<>1
   OR (length(definition)-length(replace(definition,old_reply,'')))/length(old_reply)<>2 THEN
   RAISE EXCEPTION 'RPC tanimi beklenenden farkli; hicbir degisiklik uygulanmadi';
  END IF;
  definition := replace(definition,old_save,new_save);
  definition := replace(definition,old_select,'SET active_student_id=v_student,selection_expires_at=NULL,revision=revision+1');
  definition := replace(definition,old_finish,'SET status=''finished'',active_student_id=NULL,selection_expires_at=NULL,finished_at=now()');
  definition := replace(definition,old_reply,'''activeStudentId'',v_exam.active_student_id,''selectionExpiresAt'',floor(extract(epoch FROM v_exam.selection_expires_at)*1000),''serverTime'',floor(extract(epoch FROM now())*1000))');
  definition := replace(definition,'-- Completing a student''s rubric clears the board selection, never the exam or scores.','-- A completed rubric stays visible for 10 seconds; scores and the exam persist.');
  EXECUTE definition;
 END IF;
END $patch$;

-- Keep the existing internal function signature, owner, grants and security scope.
-- Expiry affects presentation only; teacher history still contains all scores.
CREATE OR REPLACE FUNCTION public.cl_speech_exam_snapshot(p_id uuid,p_board boolean DEFAULT false) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,extensions,pg_temp AS $$
 SELECT jsonb_build_object('id',e.id,'className',e.class_name,'subjectId',e.subject_id,
 'termId',e.term_id,'date',e.exam_date,'status',e.status,'revision',e.revision,'topic',e.signal_topic,
 'activeStudentId',visible.student_id,'rubric',e.rubric,
 'selectionExpiresAt',CASE WHEN visible.student_id IS NOT NULL THEN floor(extract(epoch FROM e.selection_expires_at)*1000) ELSE NULL END,
 'serverTime',floor(extract(epoch FROM now())*1000),
 'students',CASE WHEN p_board THEN COALESCE((SELECT jsonb_agg(s) FROM jsonb_array_elements(e.students) s WHERE s->>'id'=visible.student_id::text),'[]') ELSE e.students END,
 'results',COALESCE((SELECT jsonb_object_agg(r.student_id::text,jsonb_build_object('scores',r.scores,'revision',r.revision))
 FROM public.classlog_speech_results r WHERE r.exam_id=e.id AND (NOT p_board OR r.student_id=visible.student_id)),'{}'))
 FROM public.classlog_speech_exams e
 CROSS JOIN LATERAL (SELECT CASE WHEN e.selection_expires_at IS NOT NULL AND e.selection_expires_at<=now()
  THEN NULL ELSE e.active_student_id END AS student_id) visible
 WHERE e.id=p_id
$$;
NOTIFY pgrst, 'reload schema';
COMMIT;

SELECT jsonb_build_object(
 'delay_seconds',10,
 'delay_installed',position('/* speech-selection-delay-v1 */' IN pg_get_functiondef('public.cl_speech_exam_rpc(text,text,jsonb)'::regprocedure))>0,
 'server_enabled',public.cl_speech_exam_enabled(),
 'snapshot_public_access',has_function_privilege('anon','public.cl_speech_exam_snapshot(uuid,boolean)','EXECUTE'),
 'direct_scores_access',has_table_privilege('anon','public.classlog_speech_results','SELECT,INSERT,UPDATE,DELETE')
) AS ogrenci_gosterim_kontrolu;
