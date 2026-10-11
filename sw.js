// Đổi PHIEN mỗi lần cập nhật app để máy tải bản mới.
const PHIEN = 'kstuyen-1';
const FILES = ['./', './index.html', './xlsx.full.min.js', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(PHIEN).then(c => c.addAll(FILES)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== PHIEN).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Trang chính: có mạng thì lấy bản mới, mất mạng thì dùng bản đã lưu.
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then(r => {
      const copy = r.clone();
      caches.open(PHIEN).then(c => c.put('./index.html', copy));
      return r;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(e.request, {ignoreSearch: true}).then(r => r || fetch(e.request)));
});
