-- Salt okunur. Öğrenci, parola veya oturum belirteci okumaz.
SELECT jsonb_build_object(
 'storage',to_regclass('public.classlog_storage') IS NOT NULL,
 'parent_links',to_regclass('public.classlog_parent_links') IS NOT NULL,
 'session_check',to_regprocedure('public.cl_check_session(text)') IS NOT NULL,
 'session_row',to_regprocedure('public.cl_get_session_row(text)') IS NOT NULL,
 'class_authorization',to_regprocedure('public.cl_is_teacher_authorized(public.classlog_teachers,text,text)') IS NOT NULL,
 'settings',to_regprocedure('public.cl_get_settings_blob()') IS NOT NULL,
 'term_prefix',to_regprocedure('public.cl_term_prefix(text)') IS NOT NULL,
 'rename',to_regprocedure('public.cl_rename_student(text,text,text,text,text)') IS NOT NULL,
 'existing_duty',to_regclass('public.classlog_duty_years') IS NOT NULL
) AS notik_duty_preflight;
