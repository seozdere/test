DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM classlog_teachers
        WHERE lower(trim(username)) = 'admin'
    ) THEN
        UPDATE classlog_teachers
        SET
            username = 'admin',
            name = COALESCE(name, 'Sistem Yöneticisi'),
            role = 'admin',
            active = TRUE,
            password_hash = crypt('Admin2026!Reset', gen_salt('bf')),
            password = NULL
        WHERE lower(trim(username)) = 'admin';
    ELSE
        INSERT INTO classlog_teachers (
            username,
            password,
            password_hash,
            name,
            role,
            classes,
            subjects,
            active
        )
        VALUES (
            'admin',
            NULL,
            crypt('Admin2026!Reset', gen_salt('bf')),
            'Sistem Yöneticisi',
            'admin',
            '{}',
            '{}',
            TRUE
        );
    END IF;
END $$;

DELETE FROM classlog_sessions
WHERE teacher_id IN (
    SELECT id
    FROM classlog_teachers
    WHERE lower(trim(username)) = 'admin'
);
