// Đổi PHIEN mỗi lần cập nhật app để máy tải bản mới.
const PHIEN = 'kstuyen-23';
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
  // Ảnh nền vệ tinh (máy chủ ngoài): để trình duyệt tự tải, không lưu vào bộ nhớ app.
  if (new URL(e.request.url).origin !== location.origin) return;
  // Trang chính: có mạng thì lấy bản mới, mất mạng thì dùng bản đã lưu.
  // cache:'no-cache' = hỏi lại máy chủ mỗi lần mở, không dùng bản HTTP cache 10 phút của GitHub Pages.
  if (e.request.mode === 'navigate') {
    let q; try { q = new Request(e.request, {cache: 'no-cache'}); } catch (_) { q = e.request; }
    e.respondWith(fetch(q).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(PHIEN).then(c => c.put('./index.html', copy)); }
      return r;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(e.request, {ignoreSearch: true}).then(r => r || fetch(e.request)));
});
