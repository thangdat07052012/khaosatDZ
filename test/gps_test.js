// Kiểm các hàm thuần GPS chính xác trong index.html: node test/gps_test.js
'use strict';
const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const a=html.indexOf('const VN=(()=>{'),b=html.indexOf('/* === HẾT HÀM THUẦN === */');
if(a<0||b<0)throw new Error('Không thấy đoạn hàm thuần');
const T=new Function(html.slice(a,b)+';return {VN,haversine,gpsLoc,gpsXongSom,gpsMau,hcTinh,docSo,mocNhap,nanTuyen,GPS_CHE_DO,NEN,chuSo,giongMa,giongDay,giongKhoa,giongGop,giongLenh,giongChuan,giongCho,GIONG_CHO,giongSua,GIONG_SAI,giongLaTu,giongSuaCu,giongLaLenh};')();
let nOk=0,nSai=0;
const ok=(c,m)=>{if(c){nOk++;console.log('  ✓ '+m)}else{nSai++;console.log('  ✗ '+m)}};
// số ngẫu nhiên có hạt giống (kết quả lặp lại được)
let seed=12345;const rnd=()=>(seed=(seed*1103515245+12345)%2147483648)/2147483648;
const gauss=()=>{let u=0,v=0;while(!u)u=rnd();while(!v)v=rnd();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};
const LAT=19.80,LON=105.78,KX=111320*Math.cos(LAT*Math.PI/180),KY=110574;
const dich=(lat,lon,dN,dE)=>({lat:lat+dN/KY,lon:lon+dE/KX});
const kc=(p,q)=>Math.hypot((p.lon-q.lon)*KX,(p.lat-q.lat)*KY);

console.log('1. Gộp lần đo: bỏ khởi động, lọc ngoại lai, trọng số 1/acc²');
{const ds=[];
  ds.push({...dich(LAT,LON,40,30),acc:25,ts:300});     // vị trí cũ trong bộ nhớ
  ds.push({...dich(LAT,LON,8,-6),acc:12,ts:1300});     // acc còn giảm mạnh
  for(let i=2;i<10;i++)ds.push({...dich(LAT,LON,gauss()*1.2,gauss()*1.2),acc:3+rnd(),ts:300+i*1000});
  ds.push({...dich(LAT,LON,14,0),acc:4,ts:10300});    // ngoại lai (nhảy 14 m)
  ds.push({...dich(LAT,LON,0,0),acc:15,ts:10500});    // acc > 10 m
  const r=T.gpsLoc(ds),e=kc(r,{lat:LAT,lon:LON});
  console.log(`   kết quả: lệch ${e.toFixed(2)} m, acc ${r.acc.toFixed(2)} m, phân tán ${r.pt.toFixed(2)} m, dùng ${r.n}/${r.tong}, bỏ đầu ${r.boDau}, bỏ acc ${r.boAcc}, bỏ ngoại lai ${r.boNgoai}`);
  ok(r.boDau===2,'bỏ 2 lần đầu (vị trí cũ + acc còn giảm mạnh)');
  ok(r.boNgoai>=1,'loại được lần nhảy 14 m (ngoại lai theo trung vị)');
  ok(r.boAcc===1,'bỏ lần acc > 10 m');
  ok(e<1.5,'điểm trung bình cách điểm thật < 1,5 m');
  const tb=ds.slice(2).reduce((s,q)=>({lat:s.lat+q.lat/(ds.length-2),lon:s.lon+q.lon/(ds.length-2)}),{lat:0,lon:0});
  ok(e<kc(tb,{lat:LAT,lon:LON}),`tốt hơn trung bình thường (${kc(tb,{lat:LAT,lon:LON}).toFixed(2)} m)`);
}
{const A=dich(LAT,LON,0,0),B=dich(LAT,LON,0,3);
  const ds=[{...A,acc:2,ts:0},{...A,acc:2,ts:2000},{...B,acc:8,ts:3000},{...A,acc:2,ts:4000},{...B,acc:8,ts:5000}];
  const r=T.gpsLoc(ds);ok(kc(r,A)<0.5,`trọng số 1/acc²: nghiêng về lần đo tốt (cách A ${kc(r,A).toFixed(2)} m, B cách 3 m)`)}
ok(T.gpsMau(2.9)==='xanh'&&T.gpsMau(3)==='vang'&&T.gpsMau(6)==='vang'&&T.gpsMau(6.1)==='do'&&T.gpsMau(null)==='','màu: xanh < 3, vàng 3–6, đỏ > 6');

console.log('2. Xong sớm');
{const ds=[];let tSom=null;
  for(let i=0;i<10;i++){ds.push({...dich(LAT,LON,gauss()*0.6,gauss()*0.6),acc:2.5,ts:300+i*1000});const t=ds[ds.length-1].ts;if(tSom===null&&T.gpsXongSom(ds,t))tSom=t}
  ok(tSom!==null&&tSom>=4000&&tSom<=5500,`tín hiệu tốt (1 lần/s) xong sớm lúc ${tSom} ms (≥ 4 s)`);
  const xau=[];let s2=null;
  for(let i=0;i<10;i++){xau.push({...dich(LAT,LON,gauss()*4,gauss()*4),acc:7,ts:300+i*1000});if(s2===null&&T.gpsXongSom(xau,xau[xau.length-1].ts))s2=i}
  ok(s2===null,'tín hiệu xấu (phân tán 4 m) không xong sớm, đo hết giờ');
  const acc9=[];let s3=null;
  for(let i=0;i<10;i++){acc9.push({...dich(LAT,LON,gauss()*0.5,gauss()*0.5),acc:9,ts:300+i*1000});if(s3===null&&T.gpsXongSom(acc9,acc9[acc9.length-1].ts))s3=i}
  ok(s3===null,'máy báo sai số 9 m (dù điểm chụm) không xong sớm');
  ok(T.GPS_CHE_DO.chuan.ms===10000&&T.GPS_CHE_DO.nhanh.ms===5000&&T.GPS_CHE_DO.ky.ms===20000,'chế độ 5 / 10 / 20 s');
}

console.log('3. Hiệu chỉnh tại mốc');
{const kt=105,t0=Date.UTC(2026,10,1,1,0,0);
  const thatMoc={lat:LAT,lon:LON},bias={dN:2.4,dE:-1.7};     // GPS lệch 2,4 m Bắc, 1,7 m Tây
  const doMoc=dich(LAT,LON,bias.dN,bias.dE);
  const Xt=T.VN.tu84(thatMoc.lat,thatMoc.lon,kt),Xd=T.VN.tu84(doMoc.lat,doMoc.lon,kt);
  const M1={ten:'M1',t:t0,lat:doMoc.lat,lon:doMoc.lon,dX:Xt[0]-Xd[0],dY:Xt[1]-Xd[1]};
  ok(Math.abs(M1.dX+bias.dN)<0.1&&Math.abs(M1.dY+bias.dE)<0.1,`độ lệch mốc dX ${M1.dX.toFixed(3)}, dY ${M1.dY.toFixed(3)} (≈ −2,4 / +1,7)`);
  const cotThat=dich(LAT,LON,300,400),cotDo=dich(cotThat.lat,cotThat.lon,bias.dN,bias.dE);
  const h=T.hcTinh([M1],cotDo.lat,cotDo.lon,t0+20*60000),V=T.VN.tu84(cotDo.lat,cotDo.lon,kt),Vt=T.VN.tu84(cotThat.lat,cotThat.lon,kt);
  const sai=Math.hypot(V[0]+h.dX-Vt[0],V[1]+h.dY-Vt[1]);
  ok(h&&h.ten==='M1'&&sai<0.02,`cột cách 500 m, 20 phút: sau hiệu chỉnh lệch ${(sai*1000).toFixed(1)} mm (trước ${Math.hypot(bias.dN,bias.dE).toFixed(2)} m)`);
  ok(T.hcTinh([M1],dich(LAT,LON,1200,0).lat,LON,t0)===null,'cột cách 1,2 km → chưa hiệu chỉnh');
  ok(T.hcTinh([M1],cotDo.lat,cotDo.lon,t0+75*60000)===null,'cột đo sau 75 phút → chưa hiệu chỉnh');
  const M2={ten:'M2',t:t0+30*60000,...dich(LAT,LON,0,800),dX:-1,dY:1};
  const h2=T.hcTinh([M1,M2],dich(LAT,LON,0,200).lat,dich(LAT,LON,0,200).lon,t0+5*60000);
  ok(h2.n===2&&h2.ten==='M1 + M2'&&h2.dX<M1.dX+1e-9===false||(h2.dX>M1.dX&&h2.dX<M2.dX),`hai mốc: nội suy dX ${h2.dX.toFixed(2)} nằm giữa ${M1.dX.toFixed(2)} và ${M2.dX}, nghiêng về M1 gần hơn`);
  ok(Math.abs(h2.dX-M1.dX)<Math.abs(h2.dX-M2.dX),'mốc gần (chỗ và giờ) nặng ký hơn');
  ok(T.docSo('2 195 123,456')===2195123.456&&T.docSo('2.195.123,456')===2195123.456&&T.docSo('2195123.456')===2195123.456&&T.docSo('585432,1')===585432.1,'đọc số kiểu Việt Nam');
  const r1=T.mocNhap('585 432,1','2 195 123,4',kt);ok(r1.doi&&r1.X===2195123.4,'gõ ngược X/Y → tự đổi chỗ');
  const r2=T.mocNhap('19,8','105,78',kt);ok(r2.kieu==='latlon'&&Math.abs(r2.X-Xt[0])<1e-6,'nhập vĩ độ / kinh độ thật → đổi sang VN-2000');
}

console.log('4. Nắn tuyến theo khoảng đo (5 cột, GPS lệch ngẫu nhiên ±5 m, khoảng thật 30 m)');
{const chay=(seedv,in1)=>{seed=seedv;
    const that=[],nodes=[],spans=[];let x=2195000,y=585000,hg=0.3;
    for(let i=0;i<5;i++){that.push([x,y]);hg+=(rnd()-0.5)*0.3;x+=30*Math.cos(hg);y+=30*Math.sin(hg)}
    that.forEach((p,i)=>nodes.push({id:'c'+i,X:p[0]+(rnd()*2-1)*5,Y:p[1]+(rnd()*2-1)*5,s:4}));
    for(let i=1;i<5;i++)spans.push({a:'c'+(i-1),b:'c'+i,L:30,s:0.01});
    const r=T.nanTuyen(nodes,spans);
    const d=(P,i)=>Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]);
    const truoc=[],sau=[],dichs=[];
    const P0=nodes.map(n=>[n.X,n.Y]),P1=nodes.map(n=>r.pos[n.id]);
    for(let i=1;i<5;i++){truoc.push(Math.abs(d(P0,i)-30));sau.push(Math.abs(d(P1,i)-30))}
    nodes.forEach((n,i)=>dichs.push(Math.hypot(P1[i][0]-P0[i][0],P1[i][1]-P0[i][1])));
    const rms=P=>Math.sqrt(P.reduce((s,p,i)=>s+(p[0]-that[i][0])**2+(p[1]-that[i][1])**2,0)/5);
    if(in1)console.log(`   ví dụ: sai khoảng trước ${truoc.map(v=>v.toFixed(2)).join(' / ')} m → sau ${sau.map(v=>v.toFixed(4)).join(' / ')} m; dịch ${dichs.map(v=>v.toFixed(2)).join(' / ')} m; ${r.vong} vòng; RMS so điểm thật ${rms(P0).toFixed(2)} → ${rms(P1).toFixed(2)} m`);
    return {sMax:Math.max(...sau),dMax:Math.max(...dichs),tMax:Math.max(...truoc),rms0:rms(P0),rms1:rms(P1),vong:r.vong}};
  const r0=chay(777,true);
  ok(r0.sMax<0.1,`sai khoảng sau nắn ${r0.sMax.toFixed(4)} m < 0,1 m (trước ${r0.tMax.toFixed(2)} m)`);
  ok(r0.dMax<8,`dịch cột hợp lý: lớn nhất ${r0.dMax.toFixed(2)} m`);
  let sM=0,dM=0,tot=0,vM=0;for(let k=0;k<300;k++){const q=chay(1000+k);sM=Math.max(sM,q.sMax);dM=Math.max(dM,q.dMax);vM=Math.max(vM,q.vong);if(q.rms1<=q.rms0+1e-9)tot++}
  ok(sM<0.1,`300 lần ngẫu nhiên: sai khoảng lớn nhất ${sM.toFixed(4)} m, dịch lớn nhất ${dM.toFixed(2)} m, ≤ ${vM} vòng lặp`);
  ok(tot>=240,`nắn làm điểm gần điểm thật hơn trong ${tot}/300 lần`);
  // neo: cột đầu, cuối đã hiệu chỉnh mốc (σ nhỏ) thì ít dịch
  seed=99;const nodes=[],spans=[];for(let i=0;i<5;i++)nodes.push({id:'c'+i,X:i*30+(rnd()*2-1)*5,Y:(rnd()*2-1)*5,s:i===0||i===4?0.5:4});
  for(let i=1;i<5;i++)spans.push({a:'c'+(i-1),b:'c'+i,L:30,s:0.01});
  const r=T.nanTuyen(nodes,spans),dv=i=>Math.hypot(r.pos['c'+i][0]-nodes[i].X,r.pos['c'+i][1]-nodes[i].Y);
  ok(dv(0)<1&&dv(4)<1&&Math.max(dv(0),dv(4))<Math.max(dv(1),dv(2),dv(3))/2,`cột neo (đã hiệu chỉnh) dịch ít: ${dv(0).toFixed(2)} / ${dv(4).toFixed(2)} m, cột giữa tới ${Math.max(dv(1),dv(2),dv(3)).toFixed(2)} m`);
  // tuyến dài có nhánh: tốc độ
  const N=300,nd=[],sp=[];for(let i=0;i<N;i++){nd.push({id:'p'+i,X:i*30+gauss()*3,Y:gauss()*3,s:4});if(i)sp.push({a:'p'+(i-1),b:'p'+i,L:30,s:0.01})}
  for(let i=0;i<20;i++){nd.push({id:'n'+i,X:150*30+gauss()*3,Y:(i+1)*30+gauss()*3,s:4});sp.push({a:i?'n'+(i-1):'p150',b:'n'+i,L:30,s:0.01})}
  const t0=process.hrtime.bigint(),rr=T.nanTuyen(nd,sp),ms=Number(process.hrtime.bigint()-t0)/1e6;
  const sMax=Math.max(...sp.map(s=>Math.abs(Math.hypot(rr.pos[s.a][0]-rr.pos[s.b][0],rr.pos[s.a][1]-rr.pos[s.b][1])-30)));
  ok(ms<1500&&sMax<0.1,`tuyến 320 cột có nhánh: ${ms.toFixed(0)} ms, ${rr.vong} vòng, sai khoảng lớn nhất ${sMax.toFixed(4)} m`);
  ok(Math.abs(T.VN.kTL(500000)-0.9999)<1e-9&&T.VN.kTL(600000)>0.9999,'hệ số tỉ lệ lưới chiếu k0 = 0,9999 ở kinh tuyến trục');
}
console.log('9. (03/11) Bỏ lần trùng, bỏ lần đang đi');
{const ds=[];for(let i=0;i<10;i++){const q={...dich(LAT,LON,gauss()*1.5,gauss()*1.5),acc:3,ts:500+i*1000,tsd:1e12+i*1000};ds.push(q);ds.push({...q,ts:q.ts+300},{...q,ts:q.ts+600})}
  const r=T.gpsLoc(ds);ok(r.boTrung===20,`bỏ 20 lần trùng giờ máy (bỏ ${r.boTrung})`);ok(r.n<=10,`chỉ còn ≤ 10 lần thật (${r.n})`);
  const ds1=ds.filter((q,i)=>i%3===0),r1=T.gpsLoc(ds1);ok(Math.abs(r.acc-r1.acc)<1e-9,'±m giống hệt khi không có lần trùng (trùng không làm ±m nhỏ giả)')}
{const ds=[];for(let i=0;i<4;i++)ds.push({...dich(LAT,LON,-20+i*5,0),acc:3,ts:500+i*1000,tsd:2e12+i*1000,v:1.4});   // đang đi tới cột
  for(let i=4;i<12;i++)ds.push({...dich(LAT,LON,gauss()*1,gauss()*1),acc:3,ts:500+i*1000,tsd:2e12+i*1000,v:0.1});
  const r=T.gpsLoc(ds),e=kc(r,{lat:LAT,lon:LON});ok(r.boDau+r.boDiChuyen===4,`bỏ đủ 4 lần đang đi (khởi động ${r.boDau} + đang đi ${r.boDiChuyen})`);ok(e<1.2,`điểm đo cách chân cột < 1,2 m (${e.toFixed(2)} m)`);ok(!r.diChuyen,'không báo "đang di chuyển" vì có lần đứng yên')}
{const ds=[];for(let i=0;i<6;i++)ds.push({...dich(LAT,LON,i*3,0),acc:3,ts:500+i*1000,tsd:3e12+i*1000,v:2});
  const r=T.gpsLoc(ds);ok(r.diChuyen&&r.canh,'đi suốt cả phiên: báo "đang di chuyển", không cho xong sớm');ok(!T.gpsXongSom(ds,6000),'không xong sớm khi đang đi')}

console.log('10. (07/11) JS = Python = PROJ: VN.tu84 so 4 điểm PROJ 9.8.1 (EPSG:4326 -> 5897)');
// Cùng 4 điểm DIEM_PROJ trong Lisp-CAD/LispcadZP/tools/vn2000/thu_vn2000.py (Python lệch 0,0000 m).
for(const [lat,lon,xn,ye] of [[19.8,105.78,2190303.7714,581524.8993],[20.3,105.2,2245474.6586,520691.4638],
  [19.4,104.9,2145843.2410,489301.4412],[21.0,105.85,2323187.6113,588172.1495]]){
  const [x,y]=T.VN.tu84(lat,lon,105),d=Math.hypot(x-xn,y-ye);
  ok(d<0.002,`(${lat}, ${lon}): x=${x.toFixed(4)} y=${y.toFixed(4)} lệch ${d.toFixed(4)} m`)}

console.log('11. (07/11) Ảnh nền vệ tinh: ô Web Mercator');
{const N=T.NEN,[x,y]=N.oTai(19.8,105.78,17),a=N.goc(x,y,17),b=N.goc(x+1,y+1,17);
  ok(a.lat>=19.8&&b.lat<19.8&&a.lon<=105.78&&b.lon>105.78,`ô z17 (${x},${y}) chứa điểm (19.8, 105.78)`);
  ok(x===104049&&y===58179,'số ô z17 = 104049/58179 (tính bằng Python theo công thức OSM)');
  ok(Math.abs(N.goc(0,0,1).lat-85.0511)<1e-3&&N.goc(1,1,1).lon===0,'góc ô z1 = 85,0511° / 0°');
  ok(N.z(19.8,1.11)===17&&N.z(19.8,0.01)===18&&N.z(19.8,1e5)===3,'mức phóng theo m/điểm ảnh, kẹp 3..18 (Esri z19 vùng VN là ô trống "Map data not yet available")');
  ok(N.z(19.8,0.85)===18&&N.z(19.8,0.01,20)===20&&N.z(19.8,0.3,20)===19,'mức phóng làm tròn LÊN cho nét (0,85 m/điểm → z18), trần theo nguồn (Google z20)');
  const L=N.ds(19.81,105.77,19.79,105.79,19);
  ok(L.length>0&&L.length<=64&&L.every(t=>t.z===L[0].z)&&L[0].z<19,`khung 2 km: ${L.length} ô, tự hạ còn z${L[0].z}`);
  ok(N.url(17,104049,58179).endsWith('/tile/17/58179/104049'),'URL Esri thứ tự z/y/x')}

console.log('12. (07/11) Giọng nói → ô: chuSo / giongMa');
{const {chuSo:C,giongMa:G}=T,J=JSON.stringify,eq=(a,b)=>J(a)===J(b);
  for(const [s,v] of [['một trăm hai','120'],['một trăm hai mươi','120'],['hai trăm tư','240'],['chín lăm','95'],['ba mươi lăm','35'],
    ['hai mươi mốt','21'],['một trăm linh năm','105'],['tám rưỡi','8,5'],['mười rưỡi','10,5'],['một nghìn hai','1200'],['mười hai','12']])
    ok(C(s)===v,`chuSo «${s}» → ${C(s)} (cần ${v})`);
  ok(C('dây a bê xê bốn nhân một trăm hai mươi')==='dây abc4x120','«a bê xê bốn nhân một trăm hai mươi» → '+C('dây a bê xê bốn nhân một trăm hai mươi'));
  ok(C('bê tông ly tâm tám mét rưỡi')==='lt8,5m','«bê tông ly tâm tám mét rưỡi» → '+C('bê tông ly tâm tám mét rưỡi'));
  ok(C('constructor toString')==='constructor tostring','từ lạ (constructor) không làm hỏng');
  let g=G('cột số 5 bê tông ly tâm tám rưỡi dây a bê xê bốn nhân một trăm hai mươi khoảng cột ba lăm mét hòm h bốn hai cái néo');
  ok(g.so==='5'&&eq(g.cotHT,['LT8,5'])&&eq(g.dayHT,['ABC4x120'])&&g.kc===35&&g.h4===2&&eq(g.dd,['Néo'])&&!g.con,
    'câu đủ: số 5 · LT8,5 · ABC4x120 · 35 m · H4×2 · Néo → '+g.hieu.join(' · ')+(g.con?' | thừa: '+g.con:''));
  g=G('thay dây thành ABC 4x95');ok(eq(g.dayTT,['ABC4x95'])&&!g.dayHT,'«thay dây thành ABC 4x95» → ô Thay dây');
  g=G('dây ABC 4x120 thay bằng ABC 4x95');ok(eq(g.dayHT,['ABC4x120'])&&eq(g.dayTT,['ABC4x95']),'«A thay bằng B» → hiện trạng A, thay B');
  g=G('cột gỗ thay bằng ly tâm 8,5');ok(eq(g.cotHT,['Cột gỗ'])&&eq(g.cotTT,['LT8,5']),'«cột gỗ thay bằng ly tâm 8,5» → '+g.hieu.join(' · '));
  g=G('cột 1.2 chữ hắt tám mét rưỡi');ok(g.so==='1.2'&&eq(g.cotHT,['H8,5']),'«cột 1.2 chữ hắt tám mét rưỡi» → số 1.2, H8,5 → '+g.hieu.join(' · '));
  g=G('cột tám rưỡi dây vặn xoắn bốn nhân chín lăm');ok(g.so==null&&eq(g.cotHT,['LT8,5'])&&eq(g.dayHT,['ABC4x95']),'«cột tám rưỡi» = LT8,5 (không phải số cột) → '+g.hieu.join(' · '));
  g=G('số 3 ba mươi mét');ok(g.so==='3'&&g.kc===30,'«số 3 ba mươi mét» → số 3, khoảng 30');
  g=G('khoảng cách bốn mươi mét');ok(g.kc===40,'«khoảng cách bốn mươi mét» → 40');
  g=G('sau công tơ 2x10');ok(eq(g.sau,['CXV2x10']),'«sau công tơ 2x10» → CXV2x10');
  g=G('2 công tơ ba pha');ok(g.p3===2,'«2 công tơ ba pha» → 3 pha × 2');
  g=G('hai hòm h1 và tủ');ok(g.h1===2&&g.tuMoi===1,'«hai hòm h1 và tủ» → H1×2, Tủ×1');
  g=G('tủ bù');ok(eq(g.gc,['Tủ bù']),'«tủ bù» → Ghi chú Tủ bù');
  g=G('cột chiếu sáng');ok(g.shape==='cs','«cột chiếu sáng» → ký hiệu CS');
  g=G('cột đôi vuông');ok(g.shape==='vuong'&&g.doi===true,'«cột đôi vuông» → vuông + đôi');
  g=G('cột số 12 nhổ bỏ thu hồi dây');ok(g.so==='12'&&eq(g.cotTT,['Nhổ bỏ'])&&eq(g.dayTT,['Thu hồi']),'«nhổ bỏ, thu hồi dây» → '+g.hieu.join(' · '));
  g=G('néo góc ghi chú cột nằm sát nhà dân');ok(eq(g.dd,['Néo','Góc'])&&eq(g.gc,['Cột nằm sát nhà dân']),'«… ghi chú …» → ghi chú nguyên văn');
  g=G('đổi sang ABC 4x95');ok(eq(g.dayTT,['ABC4x95']),'«đổi sang ABC 4x95» → ô Thay dây');
  g=G('dây abc 4x120',{day:['Abc 4x120']});ok(eq(g.dayHT,['Abc 4x120']),'bám đúng chữ trong danh sách chọn của app');
  g=G('xin chào bà con');ok(!g.hieu.length,'câu không có gì → không điền');
  g=G('cột số 5 abcxyz');ok(g.so==='5'&&/abcxyz/.test(g.con),'từ không hiểu → báo "bỏ qua"');
}

console.log('13. (07/11) Bộ nhớ giọng nói: giongDay / giongKhoa / giongGop / giongMa(…, cụm đã dạy)');
{const {giongDay:Dy,giongKhoa:K,giongGop:Gp,giongMa:G}=T,J=JSON.stringify,eq=(a,b)=>J(a)===J(b);
  let d=Dy('nhớ cột cao là ly tâm 12');ok(d&&d.noi==='cột cao'&&d.la==='ly tâm 12','«nhớ cột cao là ly tâm 12» → '+J(d));
  d=Dy('Ghi nhớ khi nói cột cao thì hiểu là ly tâm mười hai.');ok(d&&d.noi==='cột cao'&&d.la==='ly tâm mười hai','«ghi nhớ khi nói … thì hiểu là …» → '+J(d));
  d=Dy('dạy "trụ góc" là néo góc');ok(d&&d.noi==='trụ góc'&&d.la==='néo góc','«dạy "trụ góc" là néo góc» → '+J(d));
  d=Dy('Quên cột cao');ok(d&&d.quen==='cột cao','«quên cột cao» → '+J(d));
  ok(Dy('cột số 5 ly tâm 8,5')===null&&Dy('nhớ ghi chú cột nghiêng')===null,'câu thường (kể cả «nhớ ghi chú …» không có «là») → không phải câu dạy');
  ok(Dy('nhớ néo là Néo')===null,'dạy cụm giống hệt nghĩa → bỏ');
  ok(K('Trạm Năm')===K('trạm 5'),'khoá so khớp: «Trạm Năm» = «trạm 5»');
  let r=Gp([],[{noi:'cột cao',la:'ly tâm 12'}],true);ok(r.them===1&&r.list.length===1,'thêm cụm mới');
  r=Gp(r.list,[{noi:'Cột Cao',la:'ly tâm 14'}],true);ok(r.sua===1&&r.list.length===1&&r.list[0].la==='ly tâm 14','dạy lại cụm cũ (khác hoa / thường) → sửa, không nhân đôi');
  r=Gp(r.list,[{noi:'cột cao',la:'ly tâm 10'},{noi:'trụ góc',la:'néo góc'},{noi:'',la:'x'},{noi:1,la:'y'},null],false);
  ok(r.them===1&&r.list[0].la==='ly tâm 14'&&r.list.length===2,'gộp từ file: cụm trùng giữ bản máy này, bỏ cụm hỏng');
  const tu=[{noi:'cột cao',la:'ly tâm 12'},{noi:'trụ góc',la:'néo góc'},{noi:'cạnh trường',la:'ghi chú gần trường học'},{noi:'trạm năm',la:'cột số 5'}];
  let g=G('cột cao',{},[]);ok(!g.cotHT&&/cao/.test(g.con),'chưa dạy: «cột cao» không hiểu');
  g=G('cột số 7 cột cao trụ góc',{},tu);ok(g.so==='7'&&eq(g.cotHT,['LT12'])&&eq(g.dd,['Néo','Góc'])&&eq(g.nho,['cột cao','trụ góc'])&&!g.con,'đã dạy: «cột số 7 cột cao trụ góc» → '+g.hieu.join(' · '));
  g=G('Cột Cao, dây vặn xoắn bốn nhân chín lăm',{},tu);ok(eq(g.cotHT,['LT12'])&&eq(g.dayHT,['ABC4x95']),'hoa / thường, dấu phẩy vẫn khớp → '+g.hieu.join(' · '));
  g=G('cột cạnh trường',{},tu);ok(eq(g.gc,['Gần trường học']),'cụm dạy thành ghi chú → '+J(g.gc));
  g=G('trạm 5 khoảng ba mươi mét',{},tu);ok(g.so==='5'&&g.kc===30,'«trạm năm» dạy bằng chữ, nói «trạm 5» vẫn khớp → '+g.hieu.join(' · '));
  g=G('cột cao',{},[{noi:'cao',la:'chữ hắt tám rưỡi'},{noi:'cột cao',la:'ly tâm 12'}]);ok(eq(g.cotHT,['LT12']),'cụm dài khớp trước, cụm ngắn không ăn vào chữ vừa thay → '+J(g.cotHT));
  g=G('cột số 7 ghi chú cột cao sát nhà',{},tu);ok(g.so==='7'&&!g.cotHT&&eq(g.gc,['Cột cao sát nhà']),'phần «ghi chú …» của câu nói giữ nguyên văn, không thay');
  g=G('cột cao',{cot:['LT 12']},tu);ok(eq(g.cotHT,['LT 12']),'cụm dạy vẫn bám chữ trong danh sách chọn của app → '+J(g.cotHT));
}
console.log('14. (07/11) Khẩu lệnh cuối câu: giongLenh');
{const {giongLenh:Lh,giongMa:G,giongDay:Dy}=T;
  const c=(s,k,con)=>{const r=Lh(s);ok(r.lenh===k&&(con===undefined||r.con===con),`«${s}» → ${r.lenh}${r.lenh?' | '+r.con:''} (cần ${k}${con!==undefined?' | '+con:''})`)};
  c('cột số 5 ly tâm 12 điền','dien','cột số 5 ly tâm 12');
  c('Cột số 5 ly tâm 12. Điền.','dien','Cột số 5 ly tâm 12');
  c('ok điền','dien','');
  c('tiếp','tiep','');
  c('dây abc 4x95 cột tiếp theo','tiep','dây abc 4x95');
  c('khoảng ba lăm mét sang cột kế tiếp','tiep','khoảng ba lăm mét');
  c('cột có tiếp địa',null);
  c('nối tiếp',null);
  c('ghi chú cạnh trạm dừng',null);
  c('ghi chú gần xã Quảng Điền',null);
  c('dừng lại','dung','');
  c('cột số 9 néo dừng','dung','cột số 9 néo');
  c('sang đoạn mới','doan','');
  c('bắt đầu đoạn mới','doan','');
  c('nói lại','xoa','');
  c('cột số 5 xoá câu','xoa','cột số 5');
  c('cột số 5 xóa hết','xoa','cột số 5');
  c('cột số 5 điền ly tâm 12 điền','dien','cột số 5 ly tâm 12');
  c('cột số 5 ly tâm 12',null);
  c('',null,'');
  let r=Lh('nhớ cột cao là ly tâm 12 điền'),d=Dy(r.con);ok(r.lenh==='dien'&&d&&d.noi==='cột cao','«nhớ … là … điền» → dạy cụm, bỏ «điền» → '+JSON.stringify(d));
  r=Lh('cột số 7 ly tâm 12 tiếp');const g=G(r.con);ok(r.lenh==='tiep'&&g.so==='7'&&!g.con,'«… tiếp» → phần trước lệnh điền đủ: '+g.hieu.join(' · '));
  r=Lh('  cột   số 5   điền  ');ok(r.lenh==='dien'&&r.con==='cột số 5','khoảng trắng thừa → «cột số 5»');
}
console.log('15. (07/11) Lệnh nghe nhầm + làm khi máy chưa chốt câu: giongChuan, bản app tự tải');
{const {giongLenh:Lh,giongChuan:C}=T;
  const n=(s,v)=>ok(C(s)===v,`giongChuan «${s}» → «${C(s)}» (cần «${v}»)`);
  n('Điện.','điền');n(' điện ','điền');n('Đền','điền');n('Rừng lại','dừng');n('giừng','dừng');n('Tiết.','tiếp');
  n('đoàn mới','đoạn mới');n('Đoạn với','đoạn mới');n('xoá','nói lại');
  n('cột số 5 điện','cột số 5 điện');n('trạm điện','trạm điện');n('rừng cao su','rừng cao su');n('','');
  const c=(s,k,con)=>{const r=Lh(s);ok(r.lenh===k&&(con===undefined||r.con===con),`«${s}» → ${r.lenh}${r.lenh?' | '+r.con:''} (cần ${k}${con!==undefined?' | '+con:''})`)};
  c('cột số 5 '+C('Điện.'),'dien','cột số 5');
  c('hòm H4 Điền','dien','hòm H4');
  c('cột BTLT Điền','dien','cột BTLT');
  c('dây ABC 4x95 Điền.','dien','dây ABC 4x95');
  c('cột BTLT '+C('Điền'),'dien','cột BTLT');
  c('Cột số 5 Điền','dien','Cột số 5');
  c('ghi chú gần xã Quảng Điền',null);
  c('đường Phong Điền',null);
  c('cột số 6 tiếp tục','tiep','cột số 6');
  c('ngừng lại','dung','');
  c('cột số 9 ngừng','dung','cột số 9');
  c('cột số 5 '+C('Rừng'),'dung','cột số 5');
  c('cột số 5 '+C('đoán mới'),'doan','cột số 5');
  /* chốt trong code: nghe chữ tạm (chưa chốt) cũng làm lệnh; trang tự tải bản mới */
  const gb=html.slice(html.indexOf('function giongBat'),html.indexOf('function giongMoi'));
  ok(/const k=giongLenh\(v,DB\.giongTu\)\.lenh;[^\n]*if\(k\)giongGo=setTimeout\(lam,giongCho\(k,/.test(gb),'giongBat: câu (cả chữ tạm) kết thúc bằng lệnh → hẹn làm theo giongCho, không chờ máy chốt');
  /* 07/11 tốc độ: chốt câu làm gần như ngay, chữ tạm chờ ngắn, «tiếp»/«dừng» chờ lâu hơn «điền»; mở phiên nghe mới nhanh */
  const {giongCho,GIONG_CHO}=T;
  ok(giongCho('dien',false)<=50&&giongCho('tiep',false)<=50,'giongCho: máy đã chốt câu → làm ngay (≤ 50 ms)');
  ok(giongCho('dien',true)<=500&&giongCho('xoa',true)<=500&&giongCho('doan',true)<=500,'giongCho: chữ tạm «điền / nói lại / đoạn mới» chờ ≤ 0,5 s');
  ok(giongCho('tiep',true)>giongCho('dien',true)&&giongCho('tiep',true)<=800&&giongCho('dung',true)<=800,'giongCho: «tiếp», «dừng» chờ lâu hơn «điền» (tiếp địa) nhưng ≤ 0,8 s');
  ok(GIONG_CHO.go<=800&&GIONG_CHO.go>giongCho('tiep',true)-1&&GIONG_CHO.lai<=80,'GIONG_CHO: gõ tay chờ ≤ 0,8 s, mở phiên nghe mới ≤ 80 ms');
  ok(/giongHen=setTimeout\(giongBat,GIONG_CHO\.lai\)/.test(gb)&&/function giongMoi\(\)\{[^\n]*setTimeout\(giongBat,GIONG_CHO\.lai\)/.test(html),'giongBat / giongMoi mở phiên nghe mới sau GIONG_CHO.lai');
  ok(/catch\(e\)\{GHE=null;if\(!thu\)\{giongHen=setTimeout\(\(\)=>giongBat\(1\),/.test(gb),'giongBat: mở micro lỗi (mở lại sớm quá) → thử lại 1 lần rồi mới báo');
  ok(/function hocDoc\(code\)/.test(html)&&/vals=hocDoc\(p\.code\)\[kind\]/.test(html),'learned đọc mã qua hocDoc (nhớ theo chuỗi mã), không parse lại mọi cột mỗi lần');
  ok(!/<script src="xlsx\.full\.min\.js"/.test(html)&&/function napXlsx\(\)/.test(html)&&/async function xuatXlsx\(\)\{\s*if\(!window\.XLSX\)\{try\{await napXlsx\(\)\}/.test(html),'xlsx.full.min.js chỉ nạp khi xuất Excel (napXlsx), không nạp lúc mở app');
  ok(/fin\.trim\(\)\|\|giongChuan\(tam,DB\.giongBo\)/.test(gb),'giongBat: máy tắt phiên chưa chốt → giữ chữ tạm');
  ok(/controllerchange/.test(html)&&/function taiLai\(\)\{try\{saveNow\(\)\}/.test(html),'có bản app mới → lưu rồi tự tải lại');
  ok(/id="ban-app">Bản app: \$\{BAN_APP\}/.test(html),'☰ luôn hiện «Bản app: …» (lấy từ BAN_APP, không cần bộ nhớ đệm)');
  const sw=fs.readFileSync(path.join(__dirname,'..','sw.js'),'utf8'),ph=(sw.match(/const PHIEN = '([^']+)'/)||[])[1],ba=(html.match(/const BAN_APP='([^']+)'/)||[])[1];
  ok(ph&&ph===ba,`BAN_APP (${ba}) trùng PHIEN sw.js (${ph}) — đổi bản thì đổi cả hai`);
  ok(/'\.\/xlsx\.full\.min\.js'/.test(sw),'sw.js vẫn lưu sẵn xlsx.full.min.js (xuất Excel khi mất mạng)');
}
console.log('16. (07/11) Cụm hay nghe sai có sẵn, khẩu lệnh nghe nhầm cuối câu, cụm dạy thay chữ');
{const {giongSua:S,GIONG_SAI,giongChuan:C,giongLenh:Lh,giongLaTu,giongSuaCu,giongLaLenh,giongMa}=T;
  const s=(x,v,bo)=>{const r=S(x,bo);ok(r===v,`giongSua «${x}»${bo?' (tắt '+bo.join(',')+')':''} → «${r}» (cần «${v}»)`)};
  s('cuộc số 5 lý tâm 12','cột số 5 ly tâm 12');s('Cuộc số 5','Cột số 5');
  s('giây ABC 4x95 rẻ nhánh','dây ABC 4x95 rẽ nhánh');s('hòn công to số 3','hòm công tơ số 3');
  s('cột tép 8m tiếp đĩa','cột thép 8m tiếp địa');s('khoản 30 mết','khoảng 30 mét');s('ghi trú gần cổng','ghi chú gần cổng');
  s('gốc cây to','gốc cây to');s('gốc đường','góc đường');s('cốt thép','cốt thép');s('cốt số 5','cột số 5');
  s('cuộc, cuộc.','cột, cột.');s('khoảng 30m','khoảng 30m');s('trong rừng','trong rừng');s('bê-tông','bê tông');
  s('cuộc số 5','cuộc số 5',['cuộc']);s('','');
  ok(new Set(GIONG_SAI.map(x=>x[0])).size===GIONG_SAI.length&&GIONG_SAI.length>=60,`GIONG_SAI: ${GIONG_SAI.length} cụm, không trùng «nghe sai»`);
  ok(GIONG_SAI.every(([a,b])=>S(b)===b),'giongSua: chữ đúng của mọi cụm sửa lại vẫn y nguyên (không sửa vòng)');
  ok(GIONG_SAI.every(([a])=>S(a)!==a),'giongSua: mọi «nghe sai» đều được sửa');
  ok(C('nhớ cuộc là cột')==='nhớ cuộc là cột'&&C('quên giây')==='quên giây','giongChuan: câu dạy / quên giữ nguyên chữ máy nghe');
  ok(C('cuộc số 5 lý tâm')==='cột số 5 ly tâm'&&C('cuộc số 5',['cuộc'])==='cuộc số 5'&&C('Điện.')==='điền','giongChuan: sửa cụm hay nghe sai (tắt được), lệnh nghe nhầm cả câu vẫn đổi');
  const c=(x,k,con,tu)=>{const r=Lh(x,tu);ok(r.lenh===k&&(con===undefined||r.con===con),`«${x}»${tu?' (cụm dạy)':''} → ${r.lenh}${r.lenh?' | '+r.con:''} (cần ${k}${con!==undefined?' | '+con:''})`)};
  c('cột BTLT điên','dien','cột BTLT');c('cột số 5 diễn','dien','cột số 5');c('cột số 5 điện','dien','cột số 5');
  c('tủ điện',null);c('cột điện',null);c('trạm biến áp điện',null);c('hòm công tơ điện',null);c('ghi chú mất điện',null);
  c('cột số 5 tiết','tiep','cột số 5');c('bản vẽ chi tiết',null);c('thời tiết',null);c('cột số 9 tiếp địa',null);
  c('cột số 9 giừng','dung','cột số 9');c('đoàn mới','doan','');c('cột 3 đoạn mời','doan','cột 3');c('cột số 5 lói lại','xoa','cột số 5');
  const tu=[{noi:'chốt',la:'điền'},{noi:'ok em',la:'Điền.'}];
  c('cột số 5 chốt','dien','cột số 5',tu);c('cột số 5 ok em','dien','cột số 5',tu);c('chốt','dien','',tu);c('cột số 5 chốt',null);
  ok(giongLaLenh('điền')==='dien'&&giongLaLenh('Tiếp.')==='tiep'&&giongLaLenh('cột')===null&&giongLaLenh('cột số 5 điền')===null,'giongLaLenh: chỉ cụm đúng một khẩu lệnh');
  ok(giongLaTu('cột')&&giongLaTu('Công tơ')&&giongLaTu('điền')&&giongLaTu('ly tâm 12')&&giongLaTu('H4')&&!giongLaTu('gần cổng trường')&&!giongLaTu(''),'giongLaTu: chữ app biết / số / mã / khẩu lệnh → thay chữ; câu khác → ghi chú');
  const cu=[{noi:'cuộc',la:'ghi chú Cột'},{noi:'điên',la:'ghi chú Điền'},{noi:'cổng',la:'ghi chú gần cổng trường'},{noi:'a b c',la:'ghi chú cột'}],m=giongSuaCu(cu);
  ok(m!==cu&&m[0].la==='cột'&&m[1].la==='điền'&&m[2]===cu[2]&&m[3]===cu[3],'giongSuaCu: «cuộc» → «ghi chú Cột» (bản cũ lưu nhầm) thành thay chữ, «điên» thành khẩu lệnh; ghi chú thật / cụm dài giữ nguyên → '+JSON.stringify(m));
  const sach=[{noi:'cuộc',la:'cột'}];ok(giongSuaCu(sach)===sach&&giongSuaCu(undefined)===undefined,'giongSuaCu: không có gì đổi → trả lại đúng danh sách cũ');
  const H=(x,tu,bo)=>JSON.stringify(giongMa(x,{},tu,bo).hieu),dung=H('cột số 5 ly tâm 12');
  ok(dung!=='[]'&&H('cuộc số 5 lý tâm 12')===dung,'giongMa: «cuộc số 5 lý tâm 12» đọc như «cột số 5 ly tâm 12» → '+dung);
  ok(H('cuộc số 5 lý tâm 12',[{noi:'cuộc',la:'cột'},{noi:'lý tâm',la:'ly tâm'}],['cuộc','lý tâm'])===dung,'giongMa: tắt cụm có sẵn mà có cụm tự dạy cùng chữ → theo cụm dạy');
  ok(H('cột số 5 ly tâm 12',[{noi:'cột',la:'điền'}])===dung,'giongMa: cụm dạy là khẩu lệnh không thay chữ trong câu');
  /* chốt trong code */
  const ngoai=html.slice(0,a)+html.slice(b),nL=(ngoai.match(/giongLenh\(/g)||[]).length,nLt=(ngoai.match(/giongLenh\([^;]{0,40}?,DB\.giongTu\)/g)||[]).length;
  ok(nL>=6&&nL===nLt,`mọi lời gọi giongLenh ngoài khối thuần đều đưa DB.giongTu (${nLt}/${nL}) — khẩu lệnh Truong dạy dùng được ở mọi chỗ`);
  ok(!/giongMa\([^;]{0,40}?,DB\.giongTu\)/.test(ngoai)&&/giongMa\(text,giongDs\(\),DB\.giongTu,DB\.giongBo\)/.test(ngoai),'giongMa ngoài khối thuần đưa cả DB.giongBo (cụm Truong tắt)');
  const gb=html.slice(html.indexOf('function giongBat'),html.indexOf('function giongMoi'));
  ok(/fin=giongChuan\(f,DB\.giongBo\)/.test(gb)&&/giongChuan\(f\+' '\+t,DB\.giongBo\)/.test(gb),'giongBat: câu máy nghe qua giongChuan có cụm hay nghe sai (trừ cụm đã tắt)');
  ok(/function giongLuu\(noi,la\)\{const ds=giongDs\(\);if\(!giongMa\(la,ds\)\.hieu\.length&&!giongLaTu\(la\)\)la='ghi chú '\+la/.test(html),'giongLuu: «hiểu là» toàn chữ app biết / khẩu lệnh → thay chữ, không lưu thành ghi chú');
  ok(/HẾT HÀM THUẦN === \*\/\r?\n[^\n]*\r?\n\{const L=giongSuaCu\(DB\.giongTu\);if\(L!==DB\.giongTu\)DB\.giongTu=L\}/.test(html)&&/function giongNhap\(L\)\{[^\n]*L=giongSuaCu\(L\)/.test(html),'mở app / mở file .json: cụm dạy bản cũ lưu nhầm ghi chú tự nâng cấp (giongSuaCu)');
  ok(/data-a="gs-bat"/.test(html)&&/a==='gs-bat'/.test(html)&&/GIONG_SAI\.map\(/.test(ngoai),'📖 hiện danh sách cụm có sẵn, bấm tắt / bật từng cụm (DB.giongBo)');
  ok(!/giongBo/.test(html.slice(html.indexOf('function xuatJson'),html.indexOf('function xuatJson')+1500)),'giongBo (cụm tắt) chỉ lưu trên máy, không đi kèm file .json');
}
console.log(`\n${nOk} đạt, ${nSai} sai`);process.exit(nSai?1:0);
