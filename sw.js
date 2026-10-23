// NoTik — Service Worker
const CACHE = 'classlog-v519';
const STATIC = [
  './word-hunter.css?v=3',
  './word-hunter-data.js?v=1',
  './word-hunter-core.js?v=2',
  './word-hunter.js?v=2',
  './parent-mobile-header.css?v=18',
  './parent-mobile-header.js?v=14',
  './assets/tool-backgrounds/timer.jpg',
  './assets/tool-backgrounds/student-picker.jpg',
  './assets/tool-backgrounds/grade-calculator.jpg',
  './punctuation-game.css?v=17',
  './punctuation-game-data.js?v=4',
  './punctuation-game.js?v=15',
  './game-presentation.js?v=1',
  './game-presentation.css?v=47',
  './assets/game-backgrounds/school-1.jpg',
  './assets/game-backgrounds/school-2.jpg',
  './assets/game-backgrounds/school-3.jpg',
  './assets/game-backgrounds/school-4.jpg',
  './assets/game-backgrounds/school-5.jpg',
  './assets/game-backgrounds/school-6.jpg',
  './assets/game-backgrounds/school-7.jpg',

  './spelling-game.css?v=2',
  './spelling-game-data.js?v=4',
  './spelling-game.js?v=16',
  './',
  './index.html',
  './admin.html',
  './style.css',
  './style.css?v=217',
  './data.js',
  './data.js?v=17',
  './admin.js',
  './admin.js?v=33',
  './admin-layout.js?v=16',
  './admin-layout.css?v=27',
  './application-backup.js?v=1',
  './record-export.js?v=1',
  './parent.js',
  './parent.js?v=100',
  './tools-sections.js?v=2',
  './parent-recovery.js?v=1',
  './speech-topics.js?v=5',
  './grade-calculator.js?v=3',
  './student-picker.js?v=8',
  './turkish-game-dictionary.js?v=4',
  './word-market-data.js?v=1',
  './secret-word-data.js?v=1',
  './classroom-games.js?v=36',
  './classroom-games.css?v=39',
  './sentence-game-data.js?v=1',
  './sentence-game.js?v=4',
  './chess-game.js?v=4',
  './chess-game.css?v=4',
  './learning-games.css?v=7',
  './millionaire-game.css?v=26',
  './millionaire-game.js?v=16',
  './millionaire-general-bank.js?v=2',
  './millionaire-general2-bank.js?v=1',
  './millionaire-turkish-bank.js?v=2',
  './millionaire-turkish-docx-bank.js?v=2',
  './millionaire-turkish-extra-bank.js?v=1',
  './millionaire-turkish-sorular3-bank.js?v=2',
  './millionaire-background.jpg',
  './puzzle-core.js?v=1',
  './learning-games.js?v=17',
  './vendor/chess/chess.mjs',
  './pwa.js',
  './pwa.js?v=4',
  './manifest.json',
  './notik-logo.png',
  './notik-rounded-192.png?v=2',
  './notik-rounded-512.png?v=2',
  './notik-rounded-180.png',
  './favicon.svg',
  'https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

const parentPage = new URL('./parent.html', self.registration.scope);
function isParentURL(url) {
  return url.origin === parentPage.origin &&
    [parentPage.pathname, parentPage.pathname.replace(/\.html$/, ''), parentPage.pathname.replace(/\.html$/, '/')].includes(url.pathname);
}
async function parentShell(response, expectedSearch) {
  if (!response || !response.ok) throw new Error('Parent unavailable');
  if (response.url) {
    const finalURL = new URL(response.url);
    if (!isParentURL(finalURL) || (expectedSearch !== undefined && finalURL.search !== expectedSearch)) throw new Error('Wrong parent response');
  } else if (response.redirected) throw new Error('Unknown parent redirect');
  const html = await response.clone().text();
  if (!/<body\b[^>]*class=["'][^"']*\bparent-page\b[^"']*["']/i.test(html) ||
      !/id=["']mainDashboard["']/i.test(html)) throw new Error('Wrong parent content');
  // Strip the cached response URL so one shared link cannot adopt another link's id.
  return new Response(html, { status: 200, headers: {'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'} });
}

function parentUnavailable() {
  return new Response(`<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NoTik — Veli bağlantısı</title><body style="font-family:system-ui;background:#F4F5FC;color:#49445F;text-align:center;padding:48px 20px"><h1>Veli sayfasına bağlanılamadı</h1><p>İnternet bağlantınızı kontrol edin. Aynı veli bağlantısında yeniden denenecek.</p><button onclick="location.reload()" style="padding:12px 20px">Sayfayı yenile</button><script>
    (function(){
      const key='notik-parent-retry:'+location.pathname+location.search;
      let timer;
      function retry(){
        if(timer || navigator.onLine===false)return;
        try { if(Date.now()-Number(sessionStorage.getItem(key)||0)<300000)return; } catch(_){return;}
        timer=setTimeout(function(){
          timer=null;
          if(navigator.onLine===false)return;
          try {sessionStorage.setItem(key,String(Date.now()));}catch(_){return;}
          location.reload();
        },5000);
      }
      window.addEventListener('online',retry);retry();
    })();
  </script></body></html>`, {status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
}

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => Promise.allSettled([
      ...STATIC.map(url => c.add(url)),
      fetch(parentPage.href, {redirect:'follow',cache:'no-store'})
        .then(response => parentShell(response, '')).then(shell => c.put(parentPage.href, shell))
    ])).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const requestURL = new URL(e.request.url);
  if (requestURL.hostname.endsWith('.supabase.co')) return;
  if ((e.request.mode === 'navigate' || e.request.destination === 'document')
      && isParentURL(requestURL)) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE).catch(() => null);
      try {
        // A host may normalize /parent.html to /parent. Only return a validated
        // parent document with the same query; never expose a login redirect.
        const response = await parentShell(await fetch(e.request, {redirect:'follow',cache:'no-store'}), requestURL.search);
        if (cache) await cache.put(parentPage.href, response.clone()).catch(() => {});
        return response;
      } catch (_) {
        try { if (cache) return await parentShell(await cache.match(parentPage.href)); } catch (_) {}
        return parentUnavailable();
      }
    })());
    return;
  }
  if (e.request.mode === 'navigate' || e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request)
        .then(resp => {
          if (resp && resp.status === 200) {
            const clone = resp.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return resp;
        })
        .catch(() => caches.match(e.request).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => cached);
    })
  );
});
