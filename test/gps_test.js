// Kiểm các hàm thuần GPS chính xác trong index.html: node test/gps_test.js
'use strict';
const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const a=html.indexOf('const VN=(()=>{'),b=html.indexOf('/* === HẾT HÀM THUẦN === */');
if(a<0||b<0)throw new Error('Không thấy đoạn hàm thuần');
const T=new Function(html.slice(a,b)+';return {VN,haversine,gpsLoc,gpsXongSom,gpsMau,hcTinh,docSo,mocNhap,nanTuyen,GPS_CHE_DO,NEN,chuSo,giongMa,giongDay,giongKhoa,giongGop,giongLenh,giongChuan,giongCho,GIONG_CHO,giongSua,GIONG_SAI,giongLaTu,giongSuaCu,giongLaLenh,vnVe84,dxfDoc,cadKieu,cadDonVi,aciRgb,cadChu,tcvn3,fontTC,denDoc,denDat,denDem,denLoai};')();
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
console.log('17. Bản vẽ CAD phủ lên: VN-2000 → WGS-84, đọc DXF');
{let maxE=0;for(const [la,lo] of [[19.80,105.78],[20.35,105.20],[19.40,106.05]]){const v=T.VN.tu84(la,lo,105),q=T.vnVe84(v[0],v[1],105),w=T.VN.tu84(q[0],q[1],105);
    maxE=Math.max(maxE,Math.hypot(w[0]-v[0],w[1]-v[1]),Math.abs(q[0]-la)*110574,Math.abs(q[1]-lo)*105000)}
  ok(maxE<0.001,`vnVe84 ngược đúng VN.tu84 (sai lớn nhất ${(maxE*1000).toFixed(3)} mm)`);
  ok(T.cadKieu([588000,2190000])==='vn'&&T.cadKieu([0,0])==='rieng'&&T.cadKieu([12000,5000])==='rieng','cadKieu: toạ độ VN-2000 / toạ độ riêng');
  ok(T.cadDonVi(4)===0.001&&T.cadDonVi(6)===1&&T.cadDonVi(0)===1,'cadDonVi: mm → 0,001; m → 1; không ghi → 1');
  ok(T.aciRgb(1)===0xFF0000&&T.aciRgb(7)===-1&&T.aciRgb(3)===0x00FF00&&T.aciRgb(250)===0x333333&&T.aciRgb(255)===0xFFFFFF&&T.aciRgb(10)===0xFF0000&&T.aciRgb(11)===0xFF8080,'aciRgb: bảng màu AutoCAD');
  ok(T.cadChu('C\\U+1ED9t %%c12')==='Cột Ø12'&&T.cadChu('{\\fArial|b0;Đường}\\PQH 1/500',true)==='Đường\nQH 1/500','cadChu: \\U+, %%c, mã MTEXT');
  const L=a=>a.map(x=>String(x)).join('\n')+'\n';
  const dxf=L([0,'SECTION',2,'HEADER',9,'$INSUNITS',70,6,0,'ENDSEC',
    0,'SECTION',2,'TABLES',0,'TABLE',2,'LAYER',0,'LAYER',2,'QH_DUONG',70,0,62,1,0,'LAYER',2,'AN',70,1,62,3,0,'LAYER',2,'TAT',70,0,62,-5,0,'ENDTAB',0,'ENDSEC',
    0,'SECTION',2,'BLOCKS',0,'BLOCK',8,'0',2,'B1',70,0,10,0,20,0,0,'LINE',8,'0',62,0,10,0,20,0,11,1,21,0,0,'INSERT',8,'0',2,'B2',10,1,20,0,0,'ENDBLK',
      0,'BLOCK',8,'0',2,'B2',70,0,10,0,20,0,0,'CIRCLE',8,'0',10,0,20,0,40,0.5,0,'ENDBLK',0,'ENDSEC',
    0,'SECTION',2,'ENTITIES',
      0,'LINE',8,'QH_DUONG',10,588000,20,2190000,11,588100,21,2190000,
      0,'LWPOLYLINE',8,'AN',90,2,70,1,10,0,20,0,42,1,10,10,20,0,
      0,'INSERT',8,'QH_DUONG',62,2,2,'B1',10,10,20,10,41,2,42,2,50,90,
      0,'POLYLINE',8,'TAT',66,1,70,0,0,'VERTEX',8,'TAT',10,0,20,0,0,'VERTEX',8,'TAT',10,5,20,5,0,'SEQEND',
      0,'TEXT',8,'QH_DUONG',10,5,20,5,40,2.5,1,'Đ\\U+01B0\\U+1EDDng',50,0,
      0,'MTEXT',8,'QH_DUONG',10,0,20,0,40,3,71,1,1,'L\\U+00F4\\PA1',
      0,'HATCH',8,'QH_DUONG',
      0,'LINE',8,'QH_DUONG',67,1,10,0,20,0,11,9,21,9,
    0,'ENDSEC',0,'EOF']);
  const k=T.dxfDoc(dxf.replace(/\n/g,'\r\n')),ly=n=>k.ly.findIndex(l=>l.n===n);
  ok(k.ins===6&&k.ly[ly('AN')].an&&k.ly[ly('TAT')].an&&!k.ly[ly('QH_DUONG')].an,'DXF: $INSUNITS, lớp đóng băng / tắt để ẩn');
  ok(k.st.length-1===5,`DXF: 5 nét (LINE, LWPOLYLINE, LINE + CIRCLE trong block lồng, POLYLINE), bỏ HATCH và nét paper space (đếm ${k.st.length-1})`);
  const net=i=>{const a=k.st[i],b=k.st[i+1],r=[];for(let j=a;j<b;j++)r.push([k.xy[2*j],k.xy[2*j+1]]);return r};
  ok(net(0).length===2&&net(0)[1][0]===588100&&k.co[0]===0xFF0000,'DXF: LINE toạ độ thật, màu theo lớp (đỏ)');
  const p1=net(1),cao=Math.min(...p1.map(p=>p[1]));
  ok(k.kin[1]===1&&p1.length>10&&Math.abs(cao+5)<0.05,`DXF: LWPOLYLINE độ phình 1 = nửa vòng tròn bán kính 5 xuống dưới (thấp nhất ${cao.toFixed(3)})`);
  const p2=net(2);
  ok(Math.hypot(p2[0][0]-10,p2[0][1]-10)<1e-9&&Math.hypot(p2[1][0]-10,p2[1][1]-12)<1e-9&&k.co[2]===0xFFFF00,'DXF: INSERT xoay 90°, tỷ lệ 2 → nét (10,10)–(10,12), màu BYBLOCK theo INSERT (vàng)');
  const p3=net(3),cx=p3.reduce((s,p)=>s+p[0],0)/p3.length,cy=p3.reduce((s,p)=>s+p[1],0)/p3.length;
  ok(Math.hypot(cx-10,cy-12)<0.01&&Math.abs(Math.hypot(p3[0][0]-cx,p3[0][1]-cy)-1)<0.01&&k.li[3]===ly('QH_DUONG'),'DXF: block lồng 2 tầng: vòng tròn tâm (10,12) bán kính 1, lớp 0 lấy lớp INSERT');
  ok(k.li[4]===ly('TAT')&&net(4).length===2,'DXF: POLYLINE + VERTEX + SEQEND');
  ok(k.tx.length===2&&k.tx[0].s==='Đường'&&k.tx[0].h===2.5&&k.tx[1].s==='Lô\nA1'&&k.tx[1].ay===3,`DXF: TEXT \\U+ ra chữ có dấu, MTEXT \\P xuống dòng, gắn trên-trái (${JSON.stringify(k.tx.map(t=>t.s))})`);
  ok(k.dem.bo.HATCH===1,'DXF: đếm loại bỏ qua (HATCH)');
  let loi='';try{T.dxfDoc('AutoCAD Binary DXF\r\n\u001a')}catch(e){loi=e.message}
  ok(/nhị phân/.test(loi),'DXF nhị phân: báo rõ');
  ok(T.tcvn3('Céng hoµ x· héi chñ nghÜa ViÖt Nam')==='Cộng hoà xã hội chủ nghĩa Việt Nam'&&T.tcvn3('§­êng d©y',true)==='ĐƯỜNG DÂY'&&T.tcvn3('Đường')==='Đường','tcvn3: bảng TCVN3 → Unicode, font …H viết hoa, chữ Unicode giữ nguyên');
  ok(T.fontTC('.VnTime').tc&&!T.fontTC('.VnTime').hoa&&T.fontTC('.VnArial NarrowH').hoa&&T.fontTC('vnromanc.shx').tc&&!T.fontTC('VNI-Times').tc&&!T.fontTC('arial.ttf').tc,'fontTC: nhận font TCVN3 (.Vn…, vnromanc), không nhầm VNI / Arial');
  {const d2=L([0,'SECTION',2,'TABLES',0,'TABLE',2,'STYLE',0,'STYLE',2,'VN',70,0,3,'',1001,'ACAD',1000,'.VnTime',0,'STYLE',2,'VNH',70,0,3,'',1001,'ACAD',1000,'.VnArialH',0,'STYLE',2,'AR',70,0,3,'arial.ttf',0,'ENDTAB',0,'ENDSEC',
      0,'SECTION',2,'ENTITIES',0,'TEXT',8,'0',10,0,20,0,40,1,1,'lo¹i 1 (QL1A míi)',7,'VN',0,'TEXT',8,'0',10,0,20,0,40,1,1,'tñ ®iÖn',7,'VNH',0,'TEXT',8,'0',10,0,20,0,40,1,1,'lo¹i',7,'AR',
      0,'MTEXT',8,'0',10,0,20,0,40,1,1,'{\\f.VnTime|b0;§­êng}',7,'AR',0,'ENDSEC',0,'EOF']),k2=T.dxfDoc(d2);
    ok(k2.tx.map(t=>t.s).join('|')==='loại 1 (QL1A mới)|TỦ ĐIỆN|lo¹i|Đường',`DXF: chữ kiểu font TCVN3 ra Unicode, kiểu Arial giữ nguyên (${k2.tx.map(t=>t.s).join('|')})`)}
  ok(/ggt:\{ten:'Google',zMax:20,url:\(z,x,y\)=>`https:\/\/mt\$\{\(x\+y\)&3\}\.google\.com\/vt\/lyrs=s&x=/.test(html)&&/if\(DB\.nenNguon==='ggt'\)return GT\.loi\?'esri':'ggt'/.test(html)&&/src==='ggt'&&\+\+GT\.hong>=6/.test(html),'nguồn Google không khoá (như IRT): mt0-3.google.com, hỏng 6 ô liền thì về Esri');
  {const c1=T.denDat('5;LT8,5;','L100'),c2=T.denDat(c1,'L150'),c3=T.denDat(c2,'hong'),c4=T.denDat(c3,'SD'),c5=T.denDat(c4,'hong');
    ok(c1==='5;LT8,5;Đèn LED 100W;'&&c2==='5;LT8,5;Đèn LED 150W;'&&c3==='5;LT8,5;Đèn LED 150W;Đèn hỏng;'&&c4==='5;LT8,5;Đèn sợi đốt;Đèn hỏng;'&&c5==='5;LT8,5;Đèn sợi đốt;',
      `denDat: đổi loại đèn thay ô cũ, giữ dấu hỏng, bấm Hỏng lần hai thì bỏ (${[c1,c2,c3,c4,c5].join(' | ')})`)}
  {const d=T.denDoc('7;LT8,5;đèn led 150w;ĐÈN HỎNG;'),d2=T.denDoc('7;LT8,5;Đèn LED 150W ghi chú;'),e=T.denDat('8','hong');
    ok(d.loai==='L150'&&d.hong&&!d2.loai&&!d2.hong&&e==='8;Đèn hỏng;'&&T.denDat('','L100')===';Đèn LED 100W;'&&T.denLoai('Đèn sợi đốt 75W')==='SD',
      'denDoc / denLoai: nhận chữ hoa thường, không nhầm ghi chú dài; mã chưa có ô thì thêm đúng dạng')}
  {const c=T.denDem([{code:'1;Đèn LED 100W;'},{code:'2;Đèn LED 100W;Đèn hỏng;'},{code:'3;Đèn sợi đốt;'},{code:'4;Đèn hỏng;'},{code:'5;LT8,5;'}]);
    ok(c.L100===2&&c.L150===0&&c.SD===1&&c.hong===2&&c.tong===4,`denDem: đếm đèn theo loại + hỏng (${JSON.stringify(c)})`)}
  ok(/data-den="L100"/.test(html)&&/data-den="L150"/.test(html)&&/data-den="SD"/.test(html)&&/data-den="hong"/.test(html)&&/data-che="cs"/.test(html)&&/data-che="tt"/.test(html)&&
     /if\(tool==='den'\)\{const k=DB\.denBut/.test(html)&&/book_append_sheet\(wb,ws4,'Chieu sang'\)/.test(html)&&/DB\.che==='tt'&&BASE_TT\[kind\]/.test(html),
     'thanh nhanh chiếu sáng: 4 nút đèn, chuyển phần CS / HA / TT, chạm đèn đổi loại, sheet Excel Chieu sang, danh sách trung thế');
  ok(/noi=!!a&&denCo\(a\)&&k!=='hong'/.test(html)&&/D\.poles\.some\(p=>parse\(p\.code\)\.so\)\?'Đ1':'1'/.test(html)&&/if\(DB\.che==='cs'\)\{const q=denGan\(xy,/.test(html)&&
     /Math\.max\(12,Math\.min\(26,10\*V\.s\)\)/.test(html)&&/const lk=denLoai\(v\);if\(lk&&lk!=='hong'\)/.test(html),
     'chiếu sáng (soát 21/11): đèn sau cột hạ áp không chép dây / số hạ áp (Đ1…), Hỏng chỗ trống không nối dây, GPS theo phần CS cả khi chọn Dời, chạm thu nhỏ không đổi nhầm đèn, chip ô nhập một loại đèn');
  ok(/<div id="mapctl"><button id="b-nen" class="mb"/.test(html)&&/<button id="b-cad" class="mb"/.test(html)&&/<button id="b-fit" class="mb"/.test(html)&&!/<header class="top">[\s\S]{0,600}id="b-nen"[\s\S]{0,200}<\/header>/.test(html),'nút 🛰 / 📐 CAD / ⤢ nổi trên bản đồ, không còn trong đầu trang');
  ok(/closest\('#status,#mapctl'\)/.test(html),'chạm nút nổi không đặt cột');
  ok(/\$\('#b-cad'\)\.addEventListener\('click',\(\)=>showNen\('cad'\)\)/.test(html)&&/if\(nenChe==='cad'\)\{showCad\(\);return\}/.test(html)&&/function showCad\(\)\{[\s\S]{0,700}\$\{cadPhan\(\)\}/.test(html),'nút 📐 mở thẳng bảng CAD (nạp .dxf)');
  ok(/accept="\.json,\.dxf,application\/json"/.test(html)&&/if\(e\.target\.id==='imp'\)\{\s*if\(\/\\\.\(dxf\|dwg\)\$\/i\.test\(fl\[0\]\.name\)\)\{closePanel\(\);await cadNap\(fl\[0\]\);return\}/.test(html),'☰ Mở file nhận .dxf → nạp CAD');
  ok(/function khungVe\(v,w,h\)/.test(html)&&/const CL=o\.print\?null:khungVe\(v,w,h\)/.test(html)&&/sorted\(\)\.filter\(p=>inW\(p\.x,p\.y\)\)/.test(html)&&/const pre=s\+'#'\+k\+'#'\+kk\+/.test(html),'tốc độ: chỉ dựng phần trong khung nhìn, khoá nhãn theo ô khung');
  ok((()=>{try{let n=0;for(const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g)){new Function(m[1]);n++}return n>0}catch(e){console.log('   cú pháp: '+e.message);return false}})(),'mã trang không lỗi cú pháp (21/11: trùng tên biến m trong showNen làm trắng trang, các chốt khác vẫn đạt)');
  ok(/function cadPhan\(\)\{[\s\S]{0,200}<label class="big\$\{ds\.length\?'':' pri'\}"[^\n]*\n\s*\$\{ds\.map\(cadDong\)\.join\(''\)\}/.test(html),'bảng CAD: ô «+ Nạp bản vẽ .dxf» đứng đầu, nổi màu khi chưa có bản vẽ');
  {const c=T.denDat('3;LT8,5;Đèn LED 100W;Đèn hỏng;','L60'),d=T.denDem([{code:'1;Đèn LED 60W;'},{code:'2;đèn led 60w;Đèn hỏng;'},{code:'3;Đèn LED 100W;'}]);
    ok(c==='3;LT8,5;Đèn LED 60W;Đèn hỏng;'&&T.denLoai('Đèn LED 60W')==='L60'&&T.denLoai('Đèn LED 600W')===''&&d.L60===2&&d.L100===1&&d.hong===1&&d.tong===3,
      `đèn LED 60W: đổi loại giữ hỏng, đếm riêng (${c} · ${JSON.stringify(d)})`)}
  ok(/data-den="L60"/.test(html)&&/\.tools\.che-cs\{grid-template-columns:repeat\(8,/.test(html)&&/`LED 60W: \$\{c\.L60\}`/.test(html)&&/60W \$\{c\.L60\}/.test(html),'nút LED 60W trên thanh chiếu sáng (7 ô), đếm ở thanh trạng thái + Excel');
  ok(/function denKhung\(d,x,y,rw,rh\)/.test(html)&&/<rect class="db db-\$\{d\.loai\|\|'x'\}\$\{d\.hong\?' dbh':''\}"/.test(html)&&/\.db-L60\{fill:#8E44AD\}\.db-L100\{fill:#2E9E5B\}\.db-L150\{fill:#2F6FD0\}\.db-SD\{fill:#F0A30A\}/.test(html)&&
     /const b=denKhung\(denDoc\(q\.p\.code\),q\.x,q\.y,q\.Rw,q\.Rh\);if\(b\)add\(/.test(html)&&!/class="dn dn-/.test(html),'đèn vẽ thẻ màu có chữ 60 / 100 / 150 / SĐ (không còn chấm nhỏ), nhãn số cột tránh thẻ');
  ok(/r\.dd\.concat\(boDen\?r\.gc\.filter\(t=>!denLoai\(t\)&&!denSlTok\(t\)\):r\.gc\)/.test(html)&&/labelLines\(p,r,!o\.print\)/.test(html)&&/for\(const l of labelLines\(p,r\)\)\{txt\(/.test(html),'nhãn màn hình bỏ chữ «Đèn LED …» (đã có thẻ đèn), ảnh xuất + DXF vẫn ghi');
  ok(/if\(d\.hong\)\{const r=f\(Math\.max\(rw,rh\)\+11\);s\+=`<circle class="dnl"[^`]*<circle class="dnh"/.test(html)&&/\.dnh\{[^}]*stroke-dasharray/.test(html)&&!/class="dnh" d="M/.test(html),'đèn hỏng: vòng đỏ nét đứt, không gạch chéo (gạch chéo = bóng thu hồi)');
  ok(/const DL=\{L60:\['KS_DEN_LED60',6\],L100:\['KS_DEN_LED100',3\],L150:\['KS_DEN_LED150',5\],L200:\['KS_DEN_LED200',34\],SD:\['KS_DEN_SOIDOT',30\],x:\['KS_DEN_CHUA_RO',8\]\}/.test(html)&&/a\(0,'INSERT',8,ly,66,1,2,ly,/.test(html)&&/a\(0,'SEQEND',8,ly\)/.test(html)&&
     /'ATTDEF',8,'0'/.test(html)&&/if\(d\.hong\)ins\('KS_DEN_HONG',x,y,'KS_DEN_HONG'\)/.test(html)&&/'THỐNG KÊ ĐÈN CHIẾU SÁNG'/.test(html)&&/2,'DASHED',70,0/.test(html),'DXF: đèn mỗi loại một lớp + block thuộc tính SO_COT / LOAI_DEN / TINH_TRANG, hỏng lớp KS_DEN_HONG, bảng thống kê');
  ok(/\{L60:'LED 60W',L100:'LED 100W',L150:'LED 150W',L200:'LED 200W',SD:'SOI DOT'\}\[d\.loai\]\|\|'CHUA RO',d\.hong\?'HONG':'TOT',String\(d\.n\)\]/.test(html),'DXF: giá trị thuộc tính đèn không dấu (trích bảng trong AutoCAD đọc được, không ra mã \\U+)');
  {const c=T.denDat('4;LT8,5;Đèn LED 150W;Đèn hỏng;','L200'),d=T.denDem([{code:'1;Đèn LED 200W;'},{code:'2;đèn led 200w;Đèn hỏng;'},{code:'3;Đèn LED 150W;'}]);
    ok(c==='4;LT8,5;Đèn LED 200W;Đèn hỏng;'&&T.denLoai('Đèn LED 200W')==='L200'&&T.denLoai('Đèn LED 2000W')===''&&d.L200===2&&d.L150===1&&d.hong===1&&d.tong===3,
      `đèn LED 200W: đổi loại giữ hỏng, đếm riêng (${c} · ${JSON.stringify(d)})`)}
  ok(/data-den="L200"/.test(html)&&/\.db-L200\{fill:#8D5524\}/.test(html)&&/\.ic-den\.L200\{/.test(html)&&/200W \$\{c\.L200\}/.test(html)&&/`LED 200W: \$\{c\.L200\}`/.test(html)&&/L200:'200'/.test(html),'LED 200W: nút (8 ô), thẻ nâu «200», đếm ở thanh trạng thái + Excel');
  {const T2=new Function(html.slice(html.indexOf('const VN=(()=>{'),html.indexOf('/* === HẾT HÀM THUẦN === */'))+';return {denSoBong,denBo,denSlTok,denDoc,denDem,denDat}')();
    const c2=T2.denSoBong('5;LT8,5;Đèn LED 100W;Đèn hỏng;',2),c3=T2.denSoBong(c2,3),c1=T2.denSoBong(c3,1),b=T2.denBo('5;LT8,5;Đèn LED 150W;2 bóng;Đèn hỏng;ghi chú;');
    const d=T2.denDem([{code:'1;Đèn LED 100W;2 bóng;'},{code:'2;Đèn LED 100W;'},{code:'3;Đèn LED 150W;3 bóng;Đèn hỏng;'},{code:'4;LT8,5;'}]),dd=T2.denDoc(c3);
    ok(c2==='5;LT8,5;Đèn LED 100W;2 bóng;Đèn hỏng;'&&c3==='5;LT8,5;Đèn LED 100W;3 bóng;Đèn hỏng;'&&c1==='5;LT8,5;Đèn LED 100W;Đèn hỏng;'&&dd.n===3&&dd.loai==='L100'&&dd.hong&&
       b==='5;LT8,5;ghi chú;'&&T2.denDoc('7;Đèn LED 60W;').n===1&&T2.denSlTok('2 BÓNG')===2&&T2.denSlTok('12 bóng')===0&&d.L100===3&&d.L150===3&&d.hong===3&&d.tong===6&&
       T2.denDat(c3,'L200')==='5;LT8,5;Đèn LED 200W;3 bóng;Đèn hỏng;',
      `số bóng: thêm / bớt «n bóng», bỏ đèn giữ cột + ghi chú, đếm theo bóng, đổi loại giữ số bóng (${c3} · ${b} · ${JSON.stringify(d)})`)}
  ok(/<section id="dsheet"/.test(html)&&/if\(denCo\(q\)&&k!=='hong'\)moDen\(q\)/.test(html)&&/\$\('#ds-xoa'\)/.test(html)&&/if\(ke\.length===2&&!hasEdge\(ke\[0\],ke\[1\]\)\)D\.edges\.push/.test(html)&&
     /\(p\.id===editId\|\|p\.id===denId\)&&!o\.print/.test(html)&&/\(editId\|\|''\)\+\(denId\|\|''\)/.test(html),'chạm đèn mở bảng chi tiết (đổi loại / số bóng / hỏng / bỏ đèn / xoá cột nối lại dây), vòng chọn + khoá vẽ theo denId');
  ok(/'SO_BONG'\]\[i\]/.test(html)&&/c\[k\]\.n\+=d\.n/.test(html)&&/'Số bóng','Tình trạng'/.test(html)&&/\(d\.n>1\?'×'\+d\.n:''\)/.test(html)&&/!denLoai\(t\)&&!denSlTok\(t\)/.test(html),'số bóng: thẻ ×n, Excel cột Số bóng, DXF thuộc tính SO_BONG + bảng đếm theo bóng, nhãn màn hình không lặp');
  ok(/<section id="qsheet"/.test(html)&&/<div id="nhanh"/.test(html)&&/if\(q&&DB\.che!=='cs'\)\{moCot\(q\);return\}/.test(html)&&/const kb=cotBut\(\);if\(kb\)\{cotNhanh\(q\.x,q\.y,null,kb\);return\}/.test(html)&&
     /kb=cotBut\(\);if\(kb\)\{cotNhanh\(xy\.x,xy\.y,fix,kb\);return\}/.test(html)&&/function xoaCotNoi\(p\)/.test(html)&&(html.match(/xoaCotNoi\(p\)\}\);/g)||[]).length===2,
     'Hạ / Trung: chạm cột mở bảng gọn (loại cột, dây, đặc điểm, nhổ bỏ, thu hồi, xoá cột nối dây), chọn sẵn loại cột ở phím phải → chạm trống / GPS thêm cột loại đó');
  ok(/function veNhanh\(\)/.test(html)&&/veNhanh\(\);if\(dau\)return/.test(html)&&/data-nh="mic"/.test(html)&&/data-nh="doan"/.test(html)&&/\$\('#nhanh \.mic'\)\?\.classList\.add\('on'\)/.test(html),'phím nhanh bên phải: 🎤 + loại cột + đoạn mới, vẽ lại khi đổi phần, 🎤 sáng cùng ô nhập');
  {const G=new Function(html.slice(html.indexOf('const VN=(()=>{'),html.indexOf('/* === HẾT HÀM THUẦN === */'))+';return {giongDen,GIONG_CHO,xaGiai,xaTim}')();const d=G.giongDen;
   const a=d('đèn led 150 hai bóng','cs'),b=d('trung thế cột ly tâm 12 dây ac 70','ha'),c=d('tủ điều khiển chiếu sáng','ha'),e=d('đèn hỏng','ha'),f=d('sợi đốt','cs'),
     g=d('bỏ đèn','cs'),h=d('cột lt10 néo','cs'),i=d('chuyển sang chiếu sáng','tt'),j=d('đèn 200 oát','ha'),k=d('hết hỏng','cs'),l=d('Đèn một trăm rưỡi','cs'),m=d('cột 12 hỏng','ha'),o=d('cột 100 mét','cs');
   ok(a.loai==='L150'&&a.n===2&&a.con===''&&b.che==='tt'&&b.con==='cột ly tâm 12 dây ac 70'&&!b.loai&&c.che===''&&c.con==='tủ điều khiển chiếu sáng'&&e.hong===true&&e.con===''&&
      f.loai==='SD'&&g.bo&&h.con==='cột lt10 néo'&&!h.loai&&h.hong==null&&i.che==='cs'&&i.con===''&&j.loai==='L200'&&k.hong===false&&l.loai==='L150'&&m.hong==null&&!o.loai&&G.GIONG_CHO.tu>=2500&&G.GIONG_CHO.tu<=3500,
      'giongDen: đổi phần đầu câu / sau «sang», LED 60–200 W, số bóng, sợi đốt, hỏng / hết hỏng, bỏ đèn; «cột 12», «tủ điều khiển chiếu sáng» không đụng; chờ tự điền ~3 s')}
  ok(/giongCho\(k,!!t\.trim\(\)\)\);giongTuHen\(\)\};/.test(html)&&/function giongTuDien\(\)/.test(html)&&/if\(giongLam\(v\)\)return;giongXoa\(\);apGiong\(v\);giongMoi\(\)/.test(html)&&/const dn=giongDen\(text,DB\.che\)/.test(html)&&/clearTimeout\(giongTuH\);giongTuH=null\}/.test(html),
     '🎤 im 3 giây là tự điền (đếm lại mỗi lần câu đổi, huỷ khi xoá / tắt), apGiong đọc đổi phần + đèn trước');
  ok(/function zpCot\(\)/.test(html)&&/function zpDay\(\)/.test(html)&&/'0_ZP_0-COT_Hien_trang'/.test(html)&&/'0_ZP_0-COT_Thu_hoi'/.test(html)&&/0_ZP_0-DZ_\$\{cap\}_/.test(html)&&
     /a\(0,'POLYLINE',8,d\.ly/.test(html)&&/a\(0,'POINT',8,'KS_DIEM'/.test(html)&&/,'0_ZP_TEN_COT'\);/.test(html)&&!/'KS_DAY'/.test(html)&&/book_append_sheet\(wb,wsK,'Khoi luong'\)/.test(html),
     'DXF chuẩn LispcadZP: block ZP_COT_*, layer 0_ZP_0-COT_ / 0_ZP_0-DZ_ (polyline theo tuyến), tên cột 0_ZP_TEN_COT, vẫn giữ POINT KS_DIEM; Excel thêm sheet Khoi luong');
  /* 22/11 tự ghi xã mới theo GPS */
  {const o={t:'Tỉnh T',x:[['Xã Vuông','1',[105,19,105.01,19.01],[[[10500000,1900000,1000,0,0,1000,-1000,0]]]],
      ['Phường Lỗ','2',[105.02,19,105.05,19.03],[[[10502000,1900000,3000,0,0,3000,-3000,0],[10503000,1901000,1000,0,0,1000,-1000,0]]]]]};
    const X=new Function(html.slice(html.indexOf('const VN=(()=>{'),html.indexOf('/* === HẾT HÀM THUẦN === */'))+';return {xaGiai,xaTim}')(),ds=X.xaGiai(o);
    ok(ds.length===2&&Math.abs(ds[0].P[0][0][2]-105.01)<1e-9,'xaGiai: cộng dồn delta nguyên → độ');
    ok((X.xaTim(ds,19.005,105.005)||{}).n==='Xã Vuông','xaTim: điểm trong xã');
    ok((X.xaTim(ds,19.005,105.025)||{}).n==='Phường Lỗ','xaTim: điểm trong phường (ngoài lỗ)');
    const l=X.xaTim(ds,19.015,105.035);ok(!l||l.gan,'xaTim: điểm trong lỗ không nhận là trong phường');
    const g=X.xaTim(ds,19.0095,105.0115);ok(g&&g.gan&&g.n==='Xã Vuông','xaTim: khe ~150 m ngoài ranh → xã gần nhất, gan:true');
    ok(X.xaTim(ds,19.5,105.5)===null,'xaTim: xa mọi xã → null')}
  ok(/function diaDiem\(/.test(html)&&/if\(gps\)diaDiem\(p\)/.test(html),'chấm cột GPS gọi diaDiem (xã + đường)');
  ok(/photon\.komoot\.io\/reverse\?lat=\$\{p\.lat\}&lon=\$\{p\.lon\}&lang=default/.test(html),'Photon có lang=default (không đổi tên sang tiếng Anh)');
  ok(/'Xã \/ phường \(mới\)','Đường \(© OpenStreetMap\)'/.test(html),'Excel sheet GPS có cột xã + đường ghi nguồn OSM');
  ok(/'\.\/xa\/38\.json'/.test(fs.readFileSync(path.join(__dirname,'..','sw.js'),'utf8')),'sw.js lưu sẵn xa/38.json (mất mạng vẫn tra xã)');
  /* 22/11 KTT theo GPS */
  {const K=new Function(html.slice(html.indexOf('const VN=(()=>{'),html.indexOf('/* === HẾT HÀM THUẦN === */'))+';return {VN,kttGoiY,tinhKhop}')();
    ok(K.VN.TINH.length===63&&new Set(K.VN.TINH.map(r=>r[0])).size===63,'VN.TINH đủ 63 tỉnh cũ, không trùng tên');
    const kt=n=>(K.VN.TINH.find(r=>r[0]===n)||[])[1];
    ok(kt('Thanh Hóa')===105&&kt('Nghệ An')===104.75&&kt('Nam Định')===105.5&&kt('Lạng Sơn')===107.25&&kt('Cà Mau')===104.5&&kt('Lai Châu')===103,'KTT mẫu đúng TT 973/2001 (Thanh Hóa, Nghệ An, Nam Định, Lạng Sơn, Cà Mau, Lai Châu)');
    ok(K.VN.TINH.every(r=>r[2]>=r[4][0]&&r[2]<=r[4][1]&&r[3]>=r[4][2]&&r[3]<=r[4][3]),'tâm tỉnh nằm trong khung bao');
    const a=K.kttGoiY(19.8067,105.7852,'Tỉnh Thanh Hóa');ok(a&&a.t==='Thanh Hóa'&&a.v===105&&a.chac,'TP Thanh Hóa + tỉnh mới tra từ ranh xã → 105°, chắc');
    const b=K.kttGoiY(19.0,105.4);ok(b&&b.t==='Nghệ An'&&b.v===104.75&&b.chac,'giữa Nghệ An → 104°45′, chắc');
    const v=K.kttGoiY(18.68,105.68);ok(v&&!v.chac&&v.ds.includes(104.75)&&v.ds.includes(105.5),'Vinh sát ranh Hà Tĩnh → không chắc, nêu cả hai KTT (chỉ báo, không tự đổi)');
    const c=K.kttGoiY(20.42,106.17,'Ninh Bình');ok(c&&!c.chac,'Ninh Bình mới có 2 KTT (105 / 105°30′) → không tự chắc theo tỉnh mới');
    const e=K.kttGoiY(21.03,105.85);ok(e&&e.v===105,'Hà Nội → 105°');
    ok(K.kttGoiY(13.5,100.5)===null,'ngoài Việt Nam → null');
    ok(K.tinhKhop('Thanh Hoá','Tỉnh Thanh Hóa')&&K.tinhKhop('Thừa Thiên Huế','Huế')&&!K.tinhKhop('Hà Nam','Nam Định'),'tinhKhop so tên mềm')}
  ok(/kttXet\(p\);duongTra\(p\)/.test(html)&&/function kttXet\(p\)/.test(html),'cột GPS gọi kttXet (tự đổi KTT khi chắc)');
  /* 22/11 đoạn mới: số tiếp / lộ mới, có / không dây */
  {const L=new Function(html.slice(html.indexOf('const VN=(()=>{'),html.indexOf('/* === HẾT HÀM THUẦN === */'))+';return {soLoMoi}')().soLoMoi;
    ok(L(['1','2','3'],'3')==='L2.1'&&L(['01','02'],'02')==='L2.01','dãy số trơn → lộ mới L2.1 (giữ độ rộng số)');
    ok(L(['L1.01','L1.02'],'L1.02')==='L2.01'&&L(['L1-5','L2-3'],'L1-5')==='L3-1','có L<n> → lộ lớn nhất + 1, số về 1');
    ok(L(['T1.L1.C05','T1.L2.C03'],'T1.L2.C03')==='T1.L3.C01','T1.L2.C03 → T1.L3.C01')}
  ok(/if\(prev&&!khongDay\(\)\)D\.edges\.push/.test(html)&&/data-nh="day"/.test(html)&&/data-nh="doanso"/.test(html),'nút Có dây / Không dây + Số tiếp / Lộ mới; addPole bỏ dây khi tắt');
  ok((html.match(/D\.doanMoi=1/g)||[]).length===3&&/md=D\.doanMoi\?DB\.doanSo\|\|'':''/.test(html),'ba lối «đoạn mới» (nút, giọng nói, bảng cột) đều đặt cờ cho đèn đầu đoạn');
  {const Q=new Function(html.slice(html.indexOf('const VN=(()=>{'),html.indexOf('/* === HẾT HÀM THUẦN === */'))+';return {soLoMoi,soTuMoi}')();
    ok(Q.soLoMoi(['T1.L1.05','T1.L2.03','T2.L1.04'],'T2.L1.04')==='T2.L2.01','lộ mới chỉ xét lộ cùng tủ: T2.L1 → T2.L2 (không T2.L3)');
    ok(Q.soTuMoi(['1','2'],'2')==='T2.L1.1'&&Q.soTuMoi(['L1.05','L2.03'],'L2.03')==='T2.L1.01','tủ mới từ dãy chưa có T → T2.L1.1 / T2.L1.01');
    ok(Q.soTuMoi(['T1.L1.C05','T1.L2.C03'],'T1.L2.C03')==='T2.L1.C01'&&Q.soTuMoi(['T1.L1.05','T3.L2.07'],'T1.L1.05')==='T4.L1.01','tủ mới: tủ lớn nhất + 1, lộ 1, số về 1')}
  ok(/const HINH_NH=\[\['tba'/.test(html)&&/data-nh="hinh"/.test(html)&&/CẦUDAO\)\//.test(html),'nút TBA / Cột đơn / Cột đôi / Cầu dao (Hạ, Trung); «Cầu dao» là dạng cột');
  ok(/#nhanh button\{width:34px/.test(html)&&/\.mb\{width:34px/.test(html),'nút bên phải thu ×0,6 (34 px)');
  /* chốt trong code */
  ok(/function nenVe\(\)\{nenNen\(\);if\(D&&D\.cad&&D\.cad\.length\)try\{cadVe\(/.test(html),'nenVe vẽ thêm bản vẽ CAD sau ảnh nền');
  ok(!/nenCv\.style\.opacity=String\(DB\.nenMo/.test(html),'độ đậm ảnh nền dùng globalAlpha (không làm mờ nét CAD)');
  ok(/indexedDB\.open\('kstuyen_cad',1\)/.test(html)&&!/localStorage\.setItem\([^)]*cad/i.test(html),'nét CAD lưu IndexedDB, không vào localStorage');
}
console.log(`\n${nOk} đạt, ${nSai} sai`);process.exit(nSai?1:0);
