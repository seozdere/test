BEGIN;

-- Tehlikeli / eski izinleri temizle
DROP POLICY IF EXISTS "Allow all access" ON public.classlog_storage;
DROP POLICY IF EXISTS config_read ON public.classlog_config;
DROP POLICY IF EXISTS config_write ON public.classlog_config;
DROP POLICY IF EXISTS qr_read ON public.classlog_qr_tokens;
DROP POLICY IF EXISTS qr_write ON public.classlog_qr_tokens;

-- Kullanılmayan eski tabloları kilitle
ALTER TABLE public.classlog_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classlog_qr_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS classlog_config_deny_all ON public.classlog_config;
CREATE POLICY classlog_config_deny_all
ON public.classlog_config
FOR ALL
TO public
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS classlog_qr_tokens_deny_all ON public.classlog_qr_tokens;
CREATE POLICY classlog_qr_tokens_deny_all
ON public.classlog_qr_tokens
FOR ALL
TO public
USING (false)
WITH CHECK (false);

-- Direct API erişimini tamamen kapat
REVOKE ALL ON TABLE public.classlog_config FROM anon, authenticated;
REVOKE ALL ON TABLE public.classlog_qr_tokens FROM anon, authenticated;

COMMIT;
