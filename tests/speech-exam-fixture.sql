-- SYNTHETIC LOCAL POSTGRES ONLY. Never run on Supabase.
CREATE ROLE anon; CREATE ROLE authenticated;
CREATE SCHEMA extensions; CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
CREATE TABLE public.classlog_teachers(id bigint PRIMARY KEY, role text, classes text[], subjects text[], active boolean);
CREATE TABLE public.classlog_sessions(id bigint PRIMARY KEY,teacher_id bigint,token text,session_kind text,expires_at timestamptz);
CREATE TABLE public.classlog_storage(id text PRIMARY KEY,students jsonb,records jsonb);
-- Matches the relevant semantics of the reviewed bootstrap without passwords/data.
CREATE FUNCTION public.cl_check_session(p_token text) RETURNS public.classlog_teachers LANGUAGE sql AS $$ SELECT t.* FROM public.classlog_teachers t JOIN public.classlog_sessions s ON s.teacher_id=t.id WHERE s.token=p_token AND s.expires_at>now() AND t.active=true $$;
CREATE FUNCTION public.cl_get_session_row(p_token text) RETURNS public.classlog_sessions LANGUAGE sql AS $$ SELECT * FROM public.classlog_sessions WHERE token=p_token AND expires_at>now() $$;
CREATE FUNCTION public.cl_is_teacher_authorized(t public.classlog_teachers,c text,s text) RETURNS boolean LANGUAGE sql AS $$ SELECT t.id IS NOT NULL AND (t.role='admin' OR ((coalesce(array_length(t.classes,1),0)=0 OR c=ANY(t.classes)) AND (s IS NULL OR coalesce(array_length(t.subjects,1),0)=0 OR s=ANY(t.subjects)))) $$;
CREATE FUNCTION public.cl_get_settings_blob() RETURNS jsonb LANGUAGE sql AS $$ SELECT '{"activeTermId":"sample-term"}'::jsonb $$;
CREATE FUNCTION public.cl_term_prefix(t text) RETURNS text LANGUAGE sql AS $$ SELECT CASE WHEN t IS NULL OR trim(t)='' THEN '' ELSE trim(t)||'__' END $$;
INSERT INTO public.classlog_teachers VALUES (1,'teacher',ARRAY['Sample A'],ARRAY['turkce'],true),(2,'teacher',ARRAY['Sample B'],ARRAY['turkce'],true);
INSERT INTO public.classlog_sessions VALUES (1,1,'synthetic-teacher-token','teacher',now()+interval '1 hour'),(2,1,'synthetic-kiosk-token','kiosk',now()+interval '1 hour'),(3,2,'synthetic-other-token','teacher',now()+interval '1 hour'),(4,1,'synthetic-expired-token','teacher',now()-interval '1 hour');
INSERT INTO public.classlog_storage VALUES ('sample-term__Sample A','["Sample Student A","Sample Student B"]','{}'),('sample-term__Sample B','["Sample Student C"]','{}');
CREATE SCHEMA realtime;
CREATE TABLE realtime.test_signals(payload jsonb,event text,topic text,private boolean);
CREATE FUNCTION realtime.send(payload jsonb,event text,topic text,private boolean) RETURNS void LANGUAGE sql AS $$ INSERT INTO realtime.test_signals VALUES(payload,event,topic,private) $$;
