// Đổi PHIEN mỗi lần cập nhật app để máy tải bản mới.
const PHIEN = 'kstuyen-50';
const FILES = ['./', './index.html', './xlsx.full.min.js', './manifest.webmanifest', './icon-192.png', './icon-512.png', './xa/38.json'];

// Bản 48: cất TỪNG file (một file phụ lỗi không làm hỏng cả lần cập nhật), hỏi thẳng máy chủ (không lấy bản HTTP cache cũ).
// Trang chính không cất được thì báo lỗi để máy giữ bản app cũ đang chạy tốt.
self.addEventListener('install', e => {
  e.waitUntil(caches.open(PHIEN).then(c => Promise.all(FILES.map(f =>
    fetch(new Request(f, {cache: 'reload'})).then(r => { if (!r.ok) throw new Error(f + ' ' + r.status); return c.put(f, r); })
      .catch(err => { if (f === './index.html') throw err; console.warn('sw: bỏ qua', f, err); })))));
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
  // Kiểm bản quyền (sw.js?kq=…): luôn hỏi thẳng máy chủ, không trả bản đã lưu.
  if (new URL(e.request.url).searchParams.has('kq')) return;
  // Trang chính: có mạng thì lấy bản mới, mất mạng thì dùng bản đã lưu.
  // cache:'no-cache' = hỏi lại máy chủ mỗi lần mở, không dùng bản HTTP cache 10 phút của GitHub Pages.
  if (e.request.mode === 'navigate') {
    let q; try { q = new Request(e.request, {cache: 'no-cache'}); } catch (_) { q = e.request; }
    e.respondWith(fetch(q).then(r => {
      // Chỉ cất khi đúng trang app (có BAN_APP) — wifi quán / khách sạn trả trang đăng nhập 200 thì không cất nhầm (bản 48).
      if (r.ok && (r.headers.get('content-type') || '').includes('text/html')) {
        r.clone().text().then(t => { if (t.includes('const BAN_APP=')) return caches.open(PHIEN).then(c => c.put('./index.html', new Response(t, {headers: {'Content-Type': 'text/html; charset=utf-8'}}))); }).catch(() => {});
      }
      return r;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(e.request, {ignoreSearch: true}).then(r => r || fetch(e.request)));
});
