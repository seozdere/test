WITH sensitive_tables AS (
    SELECT unnest(ARRAY[
        'classlog_storage',
        'classlog_parent_links',
        'classlog_sessions',
        'classlog_teachers',
        'classlog_config',
        'classlog_qr_tokens'
    ]::text[]) AS table_name
),
table_audit AS (
    SELECT
        'table' AS section,
        st.table_name AS item,
        CASE
            WHEN c.relrowsecurity
             AND NOT (
                 has_table_privilege('anon', format('public.%I', st.table_name), 'SELECT')
              OR has_table_privilege('anon', format('public.%I', st.table_name), 'INSERT')
              OR has_table_privilege('anon', format('public.%I', st.table_name), 'UPDATE')
              OR has_table_privilege('anon', format('public.%I', st.table_name), 'DELETE')
              OR has_table_privilege('authenticated', format('public.%I', st.table_name), 'SELECT')
              OR has_table_privilege('authenticated', format('public.%I', st.table_name), 'INSERT')
              OR has_table_privilege('authenticated', format('public.%I', st.table_name), 'UPDATE')
              OR has_table_privilege('authenticated', format('public.%I', st.table_name), 'DELETE')
             )
            THEN 'OK'
            ELSE 'CHECK'
        END AS status,
        jsonb_build_object(
            'rls_enabled', c.relrowsecurity,
            'anon_select', has_table_privilege('anon', format('public.%I', st.table_name), 'SELECT'),
            'anon_insert', has_table_privilege('anon', format('public.%I', st.table_name), 'INSERT'),
            'anon_update', has_table_privilege('anon', format('public.%I', st.table_name), 'UPDATE'),
            'anon_delete', has_table_privilege('anon', format('public.%I', st.table_name), 'DELETE'),
            'authenticated_select', has_table_privilege('authenticated', format('public.%I', st.table_name), 'SELECT'),
            'authenticated_insert', has_table_privilege('authenticated', format('public.%I', st.table_name), 'INSERT'),
            'authenticated_update', has_table_privilege('authenticated', format('public.%I', st.table_name), 'UPDATE'),
            'authenticated_delete', has_table_privilege('authenticated', format('public.%I', st.table_name), 'DELETE')
        ) AS details
    FROM sensitive_tables st
    JOIN pg_class c
      ON c.relname = st.table_name
    JOIN pg_namespace n
      ON n.oid = c.relnamespace
     AND n.nspname = 'public'
),
policy_audit AS (
    SELECT
        'policy' AS section,
        st.table_name AS item,
        CASE
            WHEN COUNT(*) FILTER (
                WHERE p.policyname IS NOT NULL
                  AND (
                      COALESCE(p.qual, 'false') <> 'false'
                   OR COALESCE(p.with_check, 'false') <> 'false'
                  )
            ) = 0
            THEN 'OK'
            ELSE 'CHECK'
        END AS status,
        jsonb_build_object(
            'risky_policy_count',
            COUNT(*) FILTER (
                WHERE p.policyname IS NOT NULL
                  AND (
                      COALESCE(p.qual, 'false') <> 'false'
                   OR COALESCE(p.with_check, 'false') <> 'false'
                  )
            ),
            'policies',
            COALESCE(
                jsonb_agg(
                    jsonb_build_object(
                        'name', p.policyname,
                        'cmd', p.cmd,
                        'roles', p.roles,
                        'using', p.qual,
                        'with_check', p.with_check
                    )
                    ORDER BY p.policyname
                ) FILTER (WHERE p.policyname IS NOT NULL),
                '[]'::jsonb
            )
        ) AS details
    FROM sensitive_tables st
    LEFT JOIN pg_policies p
      ON p.schemaname = 'public'
     AND p.tablename = st.table_name
    GROUP BY st.table_name
),
function_audit AS (
    SELECT
        'function' AS section,
        p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS item,
        CASE
            WHEN p.prosecdef THEN 'INFO'
            ELSE 'CHECK'
        END AS status,
        jsonb_build_object(
            'security_definer', p.prosecdef,
            'anon_execute', has_function_privilege('anon', p.oid, 'EXECUTE'),
            'authenticated_execute', has_function_privilege('authenticated', p.oid, 'EXECUTE'),
            'search_path',
            COALESCE(
                (
                    SELECT regexp_replace(cfg, '^search_path=', '')
                    FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
                    WHERE cfg LIKE 'search_path=%'
                    LIMIT 1
                ),
                ''
            )
        ) AS details
    FROM pg_proc p
    JOIN pg_namespace n
      ON n.oid = p.pronamespace
     AND n.nspname = 'public'
    WHERE p.proname IN (
        'cl_get_teacher_view',
        'cl_save_teacher',
        'cl_delete_teacher',
        'cl_get_settings',
        'cl_save_settings',
        'cl_get_parent_link',
        'cl_get_parent_view',
        'cl_issue_kiosk_session',
        'cl_issue_board_command',
        'cl_poll_board_command',
        'cl_upsert_board_presence'
    )
),
parent_model_audit AS (
    SELECT
        'parent_model' AS section,
        'classlog_parent_links' AS item,
        CASE
            WHEN EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'classlog_parent_links'
                  AND column_name IN ('expires_at', 'revoked_at', 'is_active')
            )
            THEN 'INFO'
            ELSE 'INFO'
        END AS status,
        jsonb_build_object(
            'has_expires_at',
            EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'classlog_parent_links'
                  AND column_name = 'expires_at'
            ),
            'has_revoked_at',
            EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'classlog_parent_links'
                  AND column_name = 'revoked_at'
            ),
            'has_is_active',
            EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'classlog_parent_links'
                  AND column_name = 'is_active'
            )
        ) AS details
)
SELECT *
FROM (
    SELECT * FROM table_audit
    UNION ALL
    SELECT * FROM policy_audit
    UNION ALL
    SELECT * FROM function_audit
    UNION ALL
    SELECT * FROM parent_model_audit
) x
ORDER BY
    CASE section
        WHEN 'table' THEN 1
        WHEN 'policy' THEN 2
        WHEN 'function' THEN 3
        WHEN 'parent_model' THEN 4
        ELSE 5
    END,
    item;
