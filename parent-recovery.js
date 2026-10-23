// Parent failures must retain the complete shared URL, including its id.
(function () {
    const retryKey = 'notik-parent-retry:' + location.pathname + location.search;
    let timer = null;
    let bootTimer = null;
    let failed = false;
    let loaded = false;

    function scheduleReload() {
        if (timer || navigator.onLine === false) return;
        try {
            const last = Number(sessionStorage.getItem(retryKey) || 0);
            if (Date.now() - last < 300000) return;
        } catch (_) { return; } // Without storage, automatic reload could loop.
        timer = setTimeout(() => {
            timer = null;
            if (!failed || navigator.onLine === false) return;
            try { sessionStorage.setItem(retryKey, String(Date.now())); }
            catch (_) { return; }
            location.reload();
        }, 5000);
    }

    function fail() {
        failed = true;
        clearTimeout(bootTimer);
        const panel = document.getElementById('parentConnectionError');
        if (panel) panel.hidden = false;
        const loading = document.getElementById('loadingScreen');
        if (loading) loading.style.display = 'none';
        scheduleReload();
    }

    function ready() {
        loaded = true;
        failed = false;
        clearTimeout(bootTimer);
        clearTimeout(timer);
        timer = null;
        const panel = document.getElementById('parentConnectionError');
        if (panel) panel.hidden = true;
    }

    window.ParentRecovery = { fail, ready };
    window.addEventListener('online', () => { if (failed) scheduleReload(); });
    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('parentRetryButton')?.addEventListener('click', () => location.reload());
        if (!loaded && new URLSearchParams(location.search).get('id')) {
            if (failed) fail();
            else bootTimer = setTimeout(fail, 25000);
        }
    });
    // Install/update protection even when the parent visits without opening admin.
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(() => {});
})();
