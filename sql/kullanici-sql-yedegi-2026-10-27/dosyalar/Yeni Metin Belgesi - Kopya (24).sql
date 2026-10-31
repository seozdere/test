-- ═══════════════════════════════════════════════════════════════════════════
--  ClassLog Pro — Supabase Migration v3.0
--  ÖNEMLİ: Supabase Dashboard → SQL Editor → Tümünü yapıştır → Run
--  YENİ: RPC tabanlı güvenli auth · Session token sistemi
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Gerekli extension ──────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── 1. Öğretmen tablosu ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS classlog_teachers (
    id         BIGSERIAL PRIMARY KEY,
    username   TEXT UNIQUE NOT NULL,
    password   TEXT NOT NULL,
    name       TEXT NOT NULL,
    role       TEXT NOT NULL DEFAULT 'teacher',
    classes    TEXT[] DEFAULT '{}',
    active     BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Session tablosu ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS classlog_sessions (
    id         BIGSERIAL PRIMARY KEY,
    teacher_id BIGINT NOT NULL REFERENCES classlog_teachers(id) ON DELETE CASCADE,
    token      TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON classlog_sessions(token);

-- ── 3. Ana veri deposu ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS classlog_storage (
    id           TEXT PRIMARY KEY,
    students     JSONB DEFAULT '[]',
    records      JSONB DEFAULT '{}',
    "classRecords" JSONB DEFAULT '{}',
    notes        JSONB DEFAULT '{}',
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Eski versiyondan gelenler için eksik sütunları ekle (ALTER TABLE)
ALTER TABLE classlog_storage ADD COLUMN IF NOT EXISTS "classRecords" JSONB DEFAULT '{}';
ALTER TABLE classlog_storage ADD COLUMN IF NOT EXISTS notes JSONB DEFAULT '{}';

-- ── 4. İlk admin hesabı ────────────────────────────────────────────────────
INSERT INTO classlog_teachers (username, password, name, role, classes, active)
VALUES ('admin', 'serkan5j98', 'Sistem Yöneticisi', 'admin', '{}', true)
ON CONFLICT (username) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════
--  GÜVENLİ AUTH RPC'leri (SECURITY DEFINER — anon bypass)
-- ══════════════════════════════════════════════════════════════════════════

-- ── cl_authenticate: Giriş ────────────────────────────────────────────────
-- Şifreyi ASLA istemciye döndürmez. Session token üretir.
CREATE OR REPLACE FUNCTION cl_authenticate(p_username TEXT, p_password TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_teacher classlog_teachers%ROWTYPE;
    v_token   TEXT;
BEGIN
    -- Süresi dolmuş session'ları temizle (fırsat temizliği)
    DELETE FROM classlog_sessions WHERE expires_at < NOW();

    SELECT * INTO v_teacher
    FROM classlog_teachers
    WHERE username = lower(trim(p_username))
      AND password = p_password;

    IF NOT FOUND THEN
        RETURN '{"ok":false,"reason":"wrong"}'::JSONB;
    END IF;

    IF NOT v_teacher.active THEN
        RETURN '{"ok":false,"reason":"inactive"}'::JSONB;
    END IF;

    -- Güvenli rastgele token üret (64 hex char = 256 bit entropi)
    v_token := encode(gen_random_bytes(32), 'hex');

    -- Session kaydet (12 saat geçerli)
    INSERT INTO classlog_sessions (teacher_id, token, expires_at)
    VALUES (v_teacher.id, v_token, NOW() + INTERVAL '12 hours');

    RETURN jsonb_build_object(
        'ok',            true,
        'session_token', v_token,
        'teacher',       jsonb_build_object(
            'id',       v_teacher.id,
            'username', v_teacher.username,
            'name',     v_teacher.name,
            'role',     v_teacher.role,
            'classes',  v_teacher.classes,
            'active',   v_teacher.active
        )
    );
END;
$$;

-- ── cl_check_session: Session doğrulama (iç kullanım) ────────────────────
CREATE OR REPLACE FUNCTION cl_check_session(p_token TEXT)
RETURNS classlog_teachers LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_teacher classlog_teachers%ROWTYPE;
BEGIN
    SELECT t.* INTO v_teacher
    FROM classlog_sessions s
    JOIN classlog_teachers t ON t.id = s.teacher_id
    WHERE s.token = p_token
      AND s.expires_at > NOW()
      AND t.active = true;
    RETURN v_teacher;  -- NOT FOUND → NULL döner
END;
$$;

-- ── cl_logout: Oturumu sonlandır ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION cl_logout(p_token TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    DELETE FROM classlog_sessions WHERE token = p_token;
    RETURN true;
END;
$$;

-- ── cl_list_teachers: Öğretmen listesi (admin only, şifresiz) ─────────────
CREATE OR REPLACE FUNCTION cl_list_teachers(p_token TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_caller classlog_teachers%ROWTYPE;
BEGIN
    v_caller := cl_check_session(p_token);
    IF v_caller.id IS NULL OR v_caller.role != 'admin' THEN
        RETURN '[]'::JSONB;
    END IF;

    RETURN (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id',       id,
            'username', username,
            'name',     name,
            'role',     role,
            'classes',  classes,
            'active',   active
        ) ORDER BY name), '[]'::JSONB)
        FROM classlog_teachers
    );
END;
$$;

-- ── cl_save_teacher: Öğretmen ekle/güncelle (admin only) ──────────────────
CREATE OR REPLACE FUNCTION cl_save_teacher(p_token TEXT, p_teacher JSONB)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_caller classlog_teachers%ROWTYPE;
    v_id     BIGINT;
BEGIN
    v_caller := cl_check_session(p_token);
    IF v_caller.id IS NULL OR v_caller.role != 'admin' THEN
        RETURN false;
    END IF;

    v_id := (p_teacher->>'id')::BIGINT;

    IF v_id IS NOT NULL THEN
        -- Güncelle
        UPDATE classlog_teachers SET
            name    = p_teacher->>'name',
            username= lower(p_teacher->>'username'),
            role    = p_teacher->>'role',
            active  = (p_teacher->>'active')::BOOLEAN,
            classes = ARRAY(SELECT jsonb_array_elements_text(p_teacher->'classes')),
            password= CASE WHEN p_teacher->>'password' IS NOT NULL AND p_teacher->>'password' != ''
                           THEN p_teacher->>'password' ELSE password END
        WHERE id = v_id;
    ELSE
        -- Ekle
        INSERT INTO classlog_teachers (username, password, name, role, active, classes)
        VALUES (
            lower(p_teacher->>'username'),
            p_teacher->>'password',
            p_teacher->>'name',
            COALESCE(p_teacher->>'role', 'teacher'),
            COALESCE((p_teacher->>'active')::BOOLEAN, true),
            ARRAY(SELECT jsonb_array_elements_text(p_teacher->'classes'))
        );
    END IF;
    RETURN true;
EXCEPTION WHEN unique_violation THEN
    RETURN false;
END;
$$;

-- ── cl_delete_teacher: Öğretmen sil (admin only) ──────────────────────────
CREATE OR REPLACE FUNCTION cl_delete_teacher(p_token TEXT, p_id BIGINT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_caller classlog_teachers%ROWTYPE;
BEGIN
    v_caller := cl_check_session(p_token);
    IF v_caller.id IS NULL OR v_caller.role != 'admin' THEN
        RETURN false;
    END IF;
    -- Admin kendini silemez
    IF v_caller.id = p_id THEN RETURN false; END IF;
    DELETE FROM classlog_teachers WHERE id = p_id;
    RETURN true;
END;
$$;

-- ── cl_change_password: Şifre değiştir ───────────────────────────────────
CREATE OR REPLACE FUNCTION cl_change_password(p_token TEXT, p_new_password TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_caller classlog_teachers%ROWTYPE;
BEGIN
    v_caller := cl_check_session(p_token);
    IF v_caller.id IS NULL THEN RETURN false; END IF;
    IF length(trim(p_new_password)) < 6 THEN RETURN false; END IF;
    UPDATE classlog_teachers SET password = trim(p_new_password) WHERE id = v_caller.id;
    RETURN true;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════════════════

ALTER TABLE classlog_teachers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE classlog_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE classlog_storage   ENABLE ROW LEVEL SECURITY;

-- classlog_teachers: ANON OKUYAMAZ (tüm şifreler gizli)
-- Auth sadece cl_authenticate RPC ile yapılır (SECURITY DEFINER = RLS bypass)
DROP POLICY IF EXISTS "teachers_read"  ON classlog_teachers;
DROP POLICY IF EXISTS "teachers_write" ON classlog_teachers;
DROP POLICY IF EXISTS "teachers_deny_all" ON classlog_teachers;
CREATE POLICY "teachers_deny_all" ON classlog_teachers FOR ALL USING (false);

-- classlog_sessions: ANON OKUYAMAZ/YAZAMAZ
-- Session işlemleri SECURITY DEFINER RPC'ler üzerinden gider
DROP POLICY IF EXISTS "sessions_read"  ON classlog_sessions;
DROP POLICY IF EXISTS "sessions_write" ON classlog_sessions;
DROP POLICY IF EXISTS "sessions_deny_all" ON classlog_sessions;
CREATE POLICY "sessions_deny_all" ON classlog_sessions FOR ALL USING (false);

-- classlog_storage: Anon okuma + yazma (realtime için gerekli)
DROP POLICY IF EXISTS "storage_read"  ON classlog_storage;
DROP POLICY IF EXISTS "storage_write" ON classlog_storage;
DROP POLICY IF EXISTS "storage_deny_all" ON classlog_storage;
DROP POLICY IF EXISTS "storage_insert" ON classlog_storage;
DROP POLICY IF EXISTS "storage_update" ON classlog_storage;
DROP POLICY IF EXISTS "storage_delete" ON classlog_storage;

CREATE POLICY "storage_read"   ON classlog_storage FOR SELECT USING (true);
CREATE POLICY "storage_insert" ON classlog_storage FOR INSERT WITH CHECK (true);
CREATE POLICY "storage_update" ON classlog_storage FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "storage_delete" ON classlog_storage FOR DELETE USING (true);

-- ── Realtime için publish ──────────────────────────────────────────────────
ALTER TABLE classlog_storage REPLICA IDENTITY FULL;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE classlog_storage;
EXCEPTION WHEN others THEN NULL; END; $$;

-- Süresi dolmuş session temizleme (opsiyonel, pg_cron varsa):
-- SELECT cron.schedule('cleanup_sessions','0 */6 * * *',
--   'DELETE FROM classlog_sessions WHERE expires_at < NOW()');

-- ── Tamamlandı ────────────────────────────────────────────────────────────
SELECT 'ClassLog Pro v3.0 Migration başarıyla tamamlandı 🔐' AS durum;
