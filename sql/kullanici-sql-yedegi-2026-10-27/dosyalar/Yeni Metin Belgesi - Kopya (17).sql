UPDATE classlog_teachers
SET password_hash = crypt('Reset12345', gen_salt('bf')),
    password = NULL,
    active = TRUE
WHERE username = 'admin';

DELETE FROM classlog_sessions
WHERE teacher_id = (
    SELECT id FROM classlog_teachers WHERE username = 'admin'
);
