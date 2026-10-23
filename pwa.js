(function () {
    if (typeof window === 'undefined') return;

    // Installation stays available from the browser menu, without a page banner.
    window.addEventListener('beforeinstallprompt', event => event.preventDefault());

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(() => {});
    }
})();
