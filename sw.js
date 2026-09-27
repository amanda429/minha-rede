// Guarda os arquivos do app para ele abrir mesmo sem internet.
// Sempre tenta a versão mais nova primeiro; sem conexão, usa a cópia guardada.
// Ao publicar mudanças grandes, troque o número da VERSAO.
const VERSAO = 'minha-rede-v9';
const ARQUIVOS = ['./', 'index.html', 'styles.css', 'config.js', 'app.js', 'manifest.webmanifest',
  'img/icone-192.png', 'img/icone-512.png', 'img/favicon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((chaves) => Promise.all(chaves.filter((k) => k !== VERSAO).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((resp) => {
        const copia = resp.clone();
        caches.open(VERSAO).then((c) => c.put(e.request, copia));
        return resp;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('index.html')))
  );
});
