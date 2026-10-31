-- ═══════════════════════════════════════════════════════════════════════════
--  ClassLog Pro — Güvenlik Yaması Yükseltmesi (Security Patch v3.1)
--  Açıklama: classlog_storage tablosundaki anonim (herkesin) yazma iznini
--            kaldırır ve sadece yetkili öğretmen oturumlarıyla izin verir.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Eski Tehlikeli İzinleri Kaldır ─────────────────────────────────────────
DROP POLICY IF EXISTS "storage_insert" ON classlog_storage;
DROP POLICY IF EXISTS "storage_update" ON classlog_storage;
DROP POLICY IF EXISTS "storage_delete" ON classlog_storage;

-- ── 2. Yeni Güvenli Yazma RPC Fonksiyonları (Sadece Token ile) ───────────────

CREATE OR REPLACE FUNCTION cl_save_records(p_token TEXT, p_id TEXT, p_records JSONB, p_class_records JSONB)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_caller classlog_teachers%ROWTYPE;
    v_base_id TEXT;
BEGIN
    v_caller := cl_check_session(p_token);
    IF v_caller.id IS NULL THEN RETURN false; END IF;

    -- Token'ı olan bir öğretmenin yetkisini tam sınırlamak isterseniz buraya v_caller.classes kontrolü eklenebilir.
    
    INSERT INTO classlog_storage (id, records, "classRecords", last_updated)
    VALUES (p_id, COALESCE(p_records, '{}'::JSONB), COALESCE(p_class_records, '{}'::JSONB), NOW())
    ON CONFLICT (id) DO UPDATE SET 
        records = EXCLUDED.records,
        "classRecords" = EXCLUDED."classRecords",
        last_updated = NOW();

    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION cl_save_base(p_token TEXT, p_id TEXT, p_students JSONB, p_notes JSONB)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_caller classlog_teachers%ROWTYPE;
BEGIN
    v_caller := cl_check_session(p_token);
    IF v_caller.id IS NULL THEN RETURN false; END IF;

    INSERT INTO classlog_storage (id, students, notes, last_updated)
    VALUES (p_id, COALESCE(p_students, '[]'::JSONB), COALESCE(p_notes, '{}'::JSONB), NOW())
    ON CONFLICT (id) DO UPDATE SET 
        students = EXCLUDED.students,
        notes = EXCLUDED.notes,
        last_updated = NOW();

    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION cl_save_settings(p_token TEXT, p_subjects JSONB, p_term_string TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_caller classlog_teachers%ROWTYPE;
BEGIN
    v_caller := cl_check_session(p_token);
    IF v_caller.id IS NULL OR v_caller.role != 'admin' THEN RETURN false; END IF;

    INSERT INTO classlog_storage (id, records, last_updated)
    VALUES ('__settings__', jsonb_build_object('subjects', p_subjects, 'termString', p_term_string), NOW())
    ON CONFLICT (id) DO UPDATE SET 
        records = EXCLUDED.records,
        last_updated = NOW();

    RETURN true;
END;
$$;

-- ── 3. Storage Tablosu İçin Gread-Only Policy ──────────────────────────────
-- Çakışmayı önlemek için önce var olan policy'yi siliyoruz
DROP POLICY IF EXISTS "storage_read_secure" ON classlog_storage;

-- Velilerin ve öğrencilerin veriyi okuyabilmesi için SELECT anonu açık kalmalıdır.
CREATE POLICY "storage_read_secure" ON classlog_storage FOR SELECT USING (true);

-- Not: Bu SQL dosyası çalıştırıldıktan sonra, data.js içerisindeki "upsert" 
-- çağrılarının kaldırılıp, bu yukarıdaki RPC fonksiyonlarıyla ('cl_save_base' vs.) 
-- verinin gönderilmesi gerekmektedir.