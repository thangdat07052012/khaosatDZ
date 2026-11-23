/* Chạy test/gps_test.js TRONG TRÌNH DUYỆT khi máy không có Node (máy Truong không cài Node).
   Cách dùng: ở thư mục app chạy `python -m http.server 8765`, mở http://127.0.0.1:8765/ rồi dán vào console / preview_eval:
     fetch('test/chay_trinh_duyet.js').then(r=>r.text()).then(t=>(0,eval)(t)).then(r=>console.log(r.tom,r.sai))
   Trả {thoat, tom «N đạt, M sai», sai: [dòng ✗], dong: [mọi dòng in]}. Phần test DXF thật (mục 18) chỉ chạy được ở đây vì cần cả trang
   (buildDxf, D…); chạy Node thuần thì mục đó in «bỏ qua». Test tạm thay D rồi trả lại — không ghi vào dữ liệu app. */
(async()=>{
  const goc=location.href.replace(/[?#].*$/,'').replace(/[^/]*$/,'');
  const lay=async u=>{const r=await fetch(goc+u,{cache:'no-store'});if(!r.ok)throw new Error(u+': '+r.status);return r.text()};
  const tep={'index.html':await lay('index.html'),'sw.js':await lay('sw.js')},ma=await lay('test/gps_test.js');
  const dong=[];let thoat=null;
  const require=m=>m==='fs'?{readFileSync:p=>{const t=tep[String(p).split('/').pop()];if(t==null)throw new Error('thiếu '+p);return t}}:{join:(...a)=>a.join('/')};
  const process={hrtime:{bigint:()=>BigInt(Math.round(performance.now()*1e6))},exit:c=>{thoat=c}};
  const console_={log:(...a)=>dong.push(a.join(' '))};
  new Function('require','process','console','__dirname',ma)(require,process,console_,'/test');
  return {thoat,tom:dong[dong.length-1],sai:dong.filter(l=>/^\s*✗/.test(l)),dong};
})()
