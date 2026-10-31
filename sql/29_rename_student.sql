-- Additive migration. No data is changed until the rename button is used.
BEGIN;
CREATE OR REPLACE FUNCTION public.cl_rename_student(p_token TEXT,p_class_name TEXT,p_term_id TEXT,p_old_name TEXT,p_new_name TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $$
DECLARE v_base TEXT; v_term TEXT; v_row RECORD; v_doc JSONB; v_students JSONB; v_field TEXT; v_map JSONB; v_day RECORD; v_next JSONB; v_ids TEXT[];
BEGIN
 IF (public.cl_get_session_row(p_token)).session_kind IS DISTINCT FROM 'teacher'
 OR NOT COALESCE(public.cl_is_teacher_authorized(public.cl_check_session(p_token),p_class_name,NULL),false) THEN
 RETURN jsonb_build_object('ok',false,'reason','unauthorized'); END IF;
 v_term:=COALESCE(public.cl_get_settings_blob()->>'activeTermId','');
 IF COALESCE(p_term_id,v_term)<>v_term THEN RETURN jsonb_build_object('ok',false,'reason','archive'); END IF;
 p_new_name:=btrim(p_new_name);
 IF p_old_name IS NULL OR p_new_name IS NULL OR p_new_name='' OR length(p_new_name)>200 OR p_new_name~E'[\n\r]' THEN RETURN jsonb_build_object('ok',false,'reason','invalid'); END IF;
 IF p_old_name=p_new_name THEN RETURN jsonb_build_object('ok',false,'reason','same'); END IF;
 v_base:=public.cl_term_prefix(NULLIF(v_term,''))||p_class_name;
 -- Serialize storage writes during the atomic migration, including concurrent inserts.
 LOCK TABLE public.classlog_storage IN SHARE ROW EXCLUSIVE MODE;
 SELECT students INTO v_students FROM public.classlog_storage WHERE id=v_base;
 IF NOT COALESCE(v_students ? p_old_name,false) THEN RETURN jsonb_build_object('ok',false,'reason','missing'); END IF;
 IF v_students ? p_new_name THEN RETURN jsonb_build_object('ok',false,'reason','conflict'); END IF;
 SELECT array_agg(id) INTO v_ids FROM public.classlog_storage WHERE id=v_base OR left(id,length(v_base)+1)=v_base||'_';
 -- Validate every destination before writing anything. Unknown schemas fail closed.
 FOR v_row IN SELECT * FROM public.classlog_storage WHERE id=ANY(v_ids) LOOP
  v_doc:=to_jsonb(v_row);
  IF NOT (v_doc ? 'records') OR NOT (v_doc ? 'class_records' OR v_doc ? 'classRecords') THEN RAISE EXCEPTION 'Unsupported storage schema'; END IF;
  IF COALESCE(v_doc->'notes','{}'::jsonb) ? p_new_name THEN RETURN jsonb_build_object('ok',false,'reason','conflict'); END IF;
  FOREACH v_field IN ARRAY ARRAY['records','class_records','classRecords'] LOOP
   IF jsonb_typeof(v_doc->v_field)='object' THEN
    FOR v_day IN SELECT * FROM jsonb_each(v_doc->v_field) LOOP
     IF v_day.value ? p_new_name THEN RETURN jsonb_build_object('ok',false,'reason','conflict'); END IF;
    END LOOP;
   END IF;
  END LOOP;
 END LOOP;
 FOR v_row IN SELECT * FROM public.classlog_storage WHERE id=ANY(v_ids) LOOP
  v_doc:=to_jsonb(v_row);
  FOREACH v_field IN ARRAY ARRAY['records','class_records','classRecords'] LOOP
   IF jsonb_typeof(v_doc->v_field)='object' THEN
    v_map:=v_doc->v_field;
    FOR v_day IN SELECT * FROM jsonb_each(v_map) LOOP
     IF v_day.value ? p_old_name THEN
      v_next:=(v_day.value-p_old_name)||jsonb_build_object(p_new_name,v_day.value->p_old_name);
      v_map:=jsonb_set(v_map,ARRAY[v_day.key],v_next);
     END IF;
    END LOOP;
    EXECUTE format('UPDATE public.classlog_storage SET %I=$1 WHERE id=$2',v_field) USING v_map,v_row.id;
   END IF;
  END LOOP;
  IF jsonb_typeof(v_doc->'notes')='object' AND (v_doc->'notes') ? p_old_name THEN
   UPDATE public.classlog_storage SET notes=((v_doc->'notes')-p_old_name)||jsonb_build_object(p_new_name,v_doc->'notes'->p_old_name) WHERE id=v_row.id;
  END IF;
 END LOOP;
 SELECT jsonb_agg(CASE WHEN value=p_old_name THEN p_new_name ELSE value END ORDER BY ord) INTO v_students FROM jsonb_array_elements_text(v_students) WITH ORDINALITY AS names(value,ord);
 UPDATE public.classlog_storage SET students=v_students WHERE id=v_base;
 RETURN jsonb_build_object('ok',true,'ids',v_ids);
END; $$;
REVOKE ALL ON FUNCTION public.cl_rename_student(TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cl_rename_student(TEXT,TEXT,TEXT,TEXT,TEXT) TO anon,authenticated;
COMMIT;
