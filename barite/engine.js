/* موتور محاسبهٔ مدل امکان‌سنجی کارخانهٔ باریت سایا
   همان منطق فایل امکان‌سنجی (HTML) و گوگل‌شیت؛ مبالغ داخلی به تومان. */

const nf0=new Intl.NumberFormat('fa-IR',{maximumFractionDigits:0});
const nf1=new Intl.NumberFormat('fa-IR',{maximumFractionDigits:1});
const nf2=new Intl.NumberFormat('fa-IR',{maximumFractionDigits:2});
// مبالغ داخلی همیشه به تومان ذخیره می‌شوند؛ نمایش بر اساس واحد انتخابی
const mult=()=> (S&&S.g&&S.g.unit==='toman')?1:10;
const uName=()=> mult()===10?'ریال':'تومان';
function money(v){ if(v===null||!isFinite(v)) return '—'; v=v*mult(); const a=Math.abs(v);
  if(a>=1e9) return nf2.format(v/1e9)+' میلیارد '+uName(); if(a>=1e6) return nf2.format(v/1e6)+' میلیون '+uName(); return nf0.format(v)+' '+uName();}
const toLatin=s=>s.replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[٫]/g,'.');
function fmtIn(v){ if(v===''||v===null||!isFinite(v)) return ''; return Number(v).toLocaleString('en-US',{maximumFractionDigits:4}); }
function reformat(el){
  const raw=el.value, pos=el.selectionStart||raw.length;
  const before=toLatin(raw.slice(0,pos)).replace(/[^0-9.\-]/g,'').length;
  let clean=toLatin(raw).replace(/[^0-9.\-]/g,'');
  const neg=clean.startsWith('-'); clean=clean.replace(/-/g,'');
  const dot=clean.indexOf('.'); let ip=dot>=0?clean.slice(0,dot):clean, dp=dot>=0?clean.slice(dot+1).replace(/\./g,''):null;
  ip=ip.replace(/^0+(?=\d)/,'');
  let f=(neg?'-':'')+(ip?ip.replace(/\B(?=(\d{3})+(?!\d))/g,','):(dp!==null?'0':''))+(dp!==null?'.'+dp:'');
  el.value=f;
  let i=0,c=0; while(i<f.length && c<before){ if(/[0-9.\-]/.test(f[i])) c++; i++; }
  try{ el.setSelectionRange(i,i); }catch(e){}
  const v=parseFloat((neg?'-':'')+(ip||'0')+(dp?'.'+dp:'')); return isFinite(v)?v:0;
}
const lbl=l=> l.replace('تومان',uName());
let uid=1; const nid=()=> 's'+(Date.now().toString(36))+(uid++);

const DEFAULTS={
  g:{unit:'rial',invest:100e9,horizon:60,price:20e6,proc:1e6,bag:1e6,bagSize:1.5,overhead:0,capacity:2000,
     loanRate:30,loanMonths:2,finCash:false,tax:25,disc:30,vatRate:10,vatRec:true,targetSg:4.2},
  loans:[{name:'وام سرمایه در گردش (خرید مواد)',amount:20e9,rate:18,use:'wc',start:1,grace:0,graceMode:'pay',term:12,method:'bullet',fee:0,dep:0,on:true},
         {name:'وام تبصره با تنفس',amount:50e9,rate:18,use:'fixed',start:0,grace:12,graceMode:'pay',term:36,method:'annuity',fee:0,dep:0,on:true}],
  stock:[{name:'موجودی انبار',qty:0,price:1.96e6,tons:500,freight:0,sg:4.0,psg:4.2,rec:30,start:1,paid:true}],
  fg:[{name:'موجودی پودر',qty:0,cost:14.24e6,tons:300,price:0,psg:4.2,start:1,paid:true}],
  mines:[{name:'معدن ۱ (پیمانکاری)',tons:350,contract:3e9,freight:1e6,sg:3.8,psg:4.2,rec:30,start:1,dur:12,loan:true}],
  buys:[{name:'تأمین‌کننده ۱',tons:0,price:2.5e6,freight:1e6,sg:4.0,psg:4.2,rec:70,start:1,dur:0,vat:true,loan:true}],
  bourse:[{name:'بورس کالا — ایمیدرو',tons:1000,priceRial:19600,comm:2.5,freight:1e6,sg:4.0,psg:4.2,rec:30,start:1,dur:0,loan:true}]
};

const G_FIELDS=[
 ['invest','سرمایهٔ ثابت (تومان)','m'],['horizon','مدت طرح (ماه)','n'],
 ['price','قیمت فروش هر تن پودر، بدون ارزش افزوده (تومان) — فرضی','m'],
 ['proc','هزینهٔ فراوری هر تن خوراک (تومان)','m'],['bag','قیمت هر جامبوبگ (تومان)','m'],['bagSize','ظرفیت جامبوبگ (تن)','n',0.1],
 ['overhead','هزینهٔ ثابت ماهانه: حقوق، سربار (تومان)','m'],['capacity','ظرفیت خوراک کارخانه (تن در ماه)','n'],
 ['loanRate','نرخ هزینهٔ مالی سالانه (٪)','n'],['loanMonths','مدت درگیری پول تا وصول فروش (ماه)','n'],
 ['tax','مالیات بر درآمد (٪)','n'],['disc','نرخ تنزیل سالانه برای NPV (٪)','n'],
 ['vatRate','نرخ ارزش افزوده (٪)','n'],['targetSg','عیار هدف محصول (API)','n',0.01],
 ['vatRec','ارزش افزودهٔ خرید قابل کسر است','c'],
 ['finCash','هزینهٔ مالی از جریان نقدی هم کسر شود','c']
];
const COMMON_TAIL=[['freight','کرایه حمل هر تن تا کارخانه (تومان)','m'],['sg','عیار خوراک (وزن مخصوص)','n',0.01],['psg','عیار محصول پس از فراوری','n',0.01],
 ['rec','ریکاوری (٪)','n'],['wpct','باطلهٔ قابل فروش (٪ خوراک)','n'],['wprice','قیمت فروش هر تن باطله (تومان)','m'],['start','ماه شروع','n'],['dur','مدت (ماه)؛ صفر = تا پایان طرح','n']];
const FIELDS={
 loans:[['name','عنوان تسهیلات','t'],['amount','مبلغ وام (تومان)','m'],['rate','نرخ سود سالانه (٪)','n'],
   ['use','محل مصرف','s',[['wc','سرمایه در گردش'],['fixed','سرمایهٔ ثابت']]],
   ['start','ماه دریافت؛ صفر = همزمان با سرمایه‌گذاری','n'],['grace','دوران تنفس (ماه)','n'],
   ['graceMode','سود دوران تنفس','s',[['pay','ماهانه پرداخت می‌شود'],['cap','به اصل وام اضافه می‌شود']]],
   ['term','مدت بازپرداخت پس از تنفس (ماه)','n'],
   ['method','روش بازپرداخت','s',[['annuity','اقساط مساوی'],['equal','اصل مساوی + سود'],['bullet','سررسیدی: سود ماهانه، اصل در پایان']]],
   ['fee','کارمزد یکجا (٪)','n'],['dep','سپردهٔ مسدودی (٪)','n'],['on','فعال','c']],
 stock:[['name','عنوان موجودی','t'],['qty','مقدار موجودی (تن)','n'],['price','قیمت میانگین خرید هر تن (تومان)','m'],['tons','مصرف ماهانه از موجودی (تن)','n'],
   ['freight','کرایهٔ باقی‌مانده تا کارخانه هر تن (تومان)','m'],['sg','عیار موجودی (وزن مخصوص)','n'],['psg','عیار محصول پس از فراوری','n'],['rec','ریکاوری (٪)','n'],['wpct','باطلهٔ قابل فروش (٪ خوراک)','n'],['wprice','قیمت فروش هر تن باطله (تومان)','m'],['start','ماه شروع مصرف','n'],['paid','بهای خرید قبلاً پرداخت شده','c']],
 fg:[['name','عنوان موجودی','t'],['qty','مقدار موجودی پودر (تن)','n'],['cost','بهای تمام‌شدهٔ میانگین هر تن (تومان)','m'],['tons','فروش ماهانه از موجودی (تن)','n'],
   ['price','قیمت فروش هر تن؛ صفر = قیمت کلی (تومان)','m'],['psg','عیار محصول','n'],['start','ماه شروع فروش','n'],['paid','بهای تولید قبلاً پرداخت شده','c']],
 mines:[['name','نام معدن','t'],['tons','تناژ دریافتی ماهانه (تن)','n'],['contract','هزینهٔ پیمانکاری ماهانه (تومان)','m'],...COMMON_TAIL.map(f=>f[0]==='dur'?['dur','تعداد ماه برداشت؛ صفر = تا پایان طرح','n']:f)],
 buys:[['name','نام تأمین‌کننده','t'],['tons','تناژ خرید ماهانه (تن)','n'],['price','قیمت خرید هر تن (تومان)','m'],...COMMON_TAIL,['vat','فاکتور با ارزش افزوده','c']],
 bourse:[['name','عنوان عرضه','t'],['tons','تناژ خرید ماهانه (تن)','n'],['priceRial','قیمت معامله (ریال بر کیلو)','n'],['comm','کارمزد بورس (در هزار)','n',0.1],...COMMON_TAIL]
};
const TYPES=['stock','fg','mines','buys','bourse'];
const COLORS={loans:'var(--loan)',fg:'var(--fg)',stock:'var(--stock)',mines:'var(--mine)',buys:'var(--buy)',bourse:'var(--bourse)'};
const TYPE_FA={loans:'تسهیلات',fg:'موجودی محصول',stock:'موجودی مواد',mines:'پیمانکاری',buys:'خرید',bourse:'بورس'};
// مدت مصرف موجودی از مقدار و نرخ مصرف به دست می‌آید
const isInv=t=> t==='stock'||t==='fg';
const spOf=(type,s,g)=> type==='fg' && s.price>0 ? +s.price : +g.price;
const durOf=(type,s)=> isInv(type)? (s.tons>0? Math.ceil(s.qty/s.tons):0) : (s.dur>0? s.dur : null); // null یعنی تا پایان طرح

var S=null;
function fresh(){ const x=JSON.parse(JSON.stringify(DEFAULTS)); [...TYPES,'loans'].forEach(k=>x[k].forEach(s=>s.id=nid())); return x; }

// ---------- محاسبات ----------
function feedCost(type,s,g){
  if(type==='fg'){ const c=+s.cost||0; return {fg:true,material:c,comm:0,vat:0,freight:0,proc:0,loan:0,finMonthly:0,perFeed:0,cashPerFeed:0,pack:0,perProduct:c,perProductNet:c,wasteRev:0,cashPerProduct:s.paid?0:c}; }
  const L=(g.loanRate/100)*(g.loanMonths/12), V=g.vatRate/100;
  const b={material:0,comm:0,vatPaid:0,loanBase:0};
  if(type==='stock'){ b.material=+s.price||0; b.loanBase=b.material; }
  if(type==='mines'){ b.material = s.tons>0? s.contract/s.tons : 0; b.loanBase=b.material; }
  if(type==='buys'){ b.material=s.price; b.vatPaid= s.vat? s.price*V:0; b.loanBase=s.price+b.vatPaid; }
  if(type==='bourse'){ const p=s.priceRial*100; b.material=p; b.comm=p*s.comm/1000; b.vatPaid=(p+b.comm)*V; b.loanBase=p+b.comm+b.vatPaid; }
  b.vat = g.vatRec? 0 : b.vatPaid;
  b.freight=+s.freight||0; b.proc=+g.proc||0;
  // هزینهٔ مالی: پول درگیر در خرید و حمل، از هر منبعی که تأمین شود
  b.finBase = b.loanBase + b.freight; b.finMonthly = b.finBase*(g.loanRate/1200);
  b.loan = b.finBase*L;
  b.perFeed = b.material+b.comm+b.vat+b.freight+b.proc+b.loan;
  b.cashPerFeed = b.perFeed - (type==='stock' && s.paid ? b.material : 0) - (g.finCash? 0 : b.loan); // خروج نقدی واقعی
  b.pack = g.bagSize>0? g.bag/g.bagSize : 0;
  const r=s.rec/100; b.perProduct = r>0? b.perFeed/r + b.pack : Infinity;
  b.wasteRev = (+s.wpct||0)/100*(+s.wprice||0);                       // درآمد باطله به ازای هر تن خوراک
  b.perProductNet = r>0? (b.perFeed-b.wasteRev)/r + b.pack : Infinity; // بهای خالص پس از کسر فروش باطله
  return b;
}
function allSources(){ const out=[]; TYPES.forEach(t=>S[t].forEach(s=>out.push({type:t,s}))); return out; }

function simulate(excludeId,Hopt,ignoreDur){
  const g=S.g, H=Math.max(1,Math.round(Hopt||g.horizon)), cf=[-g.invest], rows=[];
  const src=allSources().filter(x=>x.s.id!==excludeId && x.s.on!==false && x.s.tons>0).map(x=>({...x,b:feedCost(x.type,x.s,g)}));
  let totWaste=0, cum=-g.invest, totProd=0, totCost=0, totAcc=0, totFeed=0, sgF=0, sgP=0, maxFeed=0, maxFeedM=0, totNet=0;
  let totFin=0, maxArrive=0, maxArriveM=0, maxBack=0, maxBackM=0, overM=0, firstOver=null;
  const cap = g.capacity>0? +g.capacity : Infinity;
  const queue=[]; // انبار مواد اولیهٔ فراوری‌نشده (FIFO)
  src.forEach(x=>{ x.left = isInv(x.type)? +x.s.qty : Infinity; });
  for(let t=1;t<=H;t++){
    let feed=0,prod=0,rev=0,cost=0,arrive=0;
    // ۱) ورود مواد و پرداخت هزینهٔ تأمین در همان ماه
    src.forEach(x=>{ const s=x.s;
      if(x.type==='fg'){ if(t>=s.start && x.left>0){ const q=Math.min(+s.tons,x.left); x.left-=q;
          prod+=q; rev+=q*spOf('fg',s,g); cost+=q*x.b.cashPerProduct; totAcc+=q*x.b.perProduct; sgP+=q*s.psg; } return; }
      if(t>=s.start && (x.type==='stock' ? x.left>0 : (ignoreDur || !(s.dur>0) || t<s.start+s.dur))){
        const tons = x.type==='stock'? Math.min(+s.tons,x.left) : +s.tons; if(x.type==='stock') x.left-=tons;
        cost += tons*(x.b.cashPerFeed - x.b.proc); arrive+=tons;
        queue.push({x,tons,t0:t}); }});
    // ۲) فراوری تا سقف ظرفیت؛ مازاد به ماه بعد منتقل می‌شود
    let capLeft=cap;
    while(queue.length && capLeft>1e-9){
      const lot=queue[0], x=lot.x, s=x.s, q=Math.min(lot.tons,capLeft), p=q*s.rec/100;
      const waitFin = q*x.b.finMonthly*(t-lot.t0);  // هزینهٔ مالی ماه‌های ماندن در انبار
      totFin += q*x.b.loan + waitFin;
      cost += q*x.b.proc + p*x.b.pack + (g.finCash? waitFin : 0);
      totAcc += q*(x.b.perFeed - x.b.wasteRev) + p*x.b.pack + waitFin;
      rev += q*x.b.wasteRev + p*g.price; totWaste+=q*x.b.wasteRev;
      feed+=q; prod+=p; sgF+=q*s.sg; sgP+=p*s.psg;
      lot.tons-=q; capLeft-=q; if(lot.tons<=1e-9) queue.shift();
    }
    const backlog=queue.reduce((a,l)=>a+l.tons,0);
    if(arrive>maxArrive){maxArrive=arrive;maxArriveM=t;}
    if(backlog>maxBack){maxBack=backlog;maxBackM=t;}
    if(arrive>cap){ overM++; if(firstOver===null) firstOver=t; }
    const pbt=rev-cost-g.overhead, tax=Math.max(0,pbt)*g.tax/100, net=pbt-tax;
    cum+=net; cf.push(net); totProd+=prod; totCost+=cost; totFeed+=feed; totNet+=net;
    if(feed>maxFeed){maxFeed=feed;maxFeedM=t;}
    rows.push({t,arrive,feed,backlog,prod,rev,cost,oh:g.overhead,tax,net,cum,pbt});
  }
  const backEnd=queue.reduce((a,l)=>a+l.tons,0), backEndVal=queue.reduce((a,l)=>a+l.tons*(l.x.b.perFeed-l.x.b.proc),0);
  // payback
  let pb=null, c=-g.invest;
  for(let i=1;i<cf.length;i++){ const prev=c; c+=cf[i]; if(c>=0 && prev<0){ pb=(i-1)+(-prev)/cf[i]; break; } }
  const rm=Math.pow(1+g.disc/100,1/12)-1;
  const npv=cf.reduce((a,v,i)=>a+v/Math.pow(1+rm,i),0);
  return {totFin,totWaste,src,rows,cf,pb,npv,irr:irr(cf),totProd,totCost,totFeed,totNet,
          avgCost: totProd>0? totAcc/totProd : null, sgF: totFeed>0? sgF/totFeed:null, sgP: totProd>0? sgP/totProd:null,
          maxFeed,maxFeedM,maxArrive,maxArriveM,maxBack,maxBackM,overM,firstOver,backEnd,backEndVal,H, end:cum};
}
function irr(cf){
  const f=r=>cf.reduce((a,v,i)=>a+v/Math.pow(1+r,i),0);
  let lo=-0.5, hi=1, flo=f(lo), fhi=f(hi); if(!(flo*fhi<0)) return null;
  for(let i=0;i<120;i++){ const m=(lo+hi)/2, fm=f(m); if(flo*fm<=0){hi=m;}else{lo=m;flo=fm;} }
  return Math.pow(1+(lo+hi)/2,12)-1;
}
// دورهٔ بازگشت مستقل از افق: تا ۶۰۰ ماه با مدت واقعی منابع، و اگر نشد با فرض ادامهٔ منابع
const CAP=1200; // ۱۰۰ سال
function lastMonth(excludeId){ let m=0; allSources().forEach(({type,s})=>{ if(s.id!==excludeId && s.on!==false && s.tons>0){ const d=durOf(type,s); m=Math.max(m, d===null? CAP : s.start+d-1); } }); return Math.min(m,CAP); }
function paybackInfo(excludeId){
  const g=S.g, L=simulate(excludeId,CAP,false);
  if(L.pb!==null){ const net=L.rows[Math.min(Math.ceil(L.pb),CAP)-1].net; return {pb:L.pb, kind: L.pb<=g.horizon?'in':'beyond', net}; }
  let end=lastMonth(excludeId); if(end>0 && end<CAP){ for(let t=CAP;t>end;t--){ const r=L.rows[t-1]; if(r.feed>0||r.prod>0){ end=t; break; } } }
  const row=end>0? L.rows[end-1] : null;
  const cumEnd=row? row.cum : -g.invest, net=row? row.net : 0;
  const rec=(cumEnd+g.invest)/g.invest*100;
  if(net>0 && end<CAP) return {pb:end+(-cumEnd)/net, kind:'ext', rec, end, net};
  if(net>0) return {pb:end+(-cumEnd)/net, kind:'slow', rec, end, net};
  return {pb:null, kind:'never', rec, end, net};
}
const pbText=P=> P.kind==='never'? 'برنمی‌گردد' : P.kind==='slow'? 'بیش از ۱۰۰ سال' : (P.kind==='ext'?'≈ ':'')+nf1.format(P.pb)+' ماه';
function pbSub(P){
  const g=S.g, H=nf0.format(g.horizon), need=nf0.format(Math.ceil(P.pb||0)), R=simulate(null);
  const endTxt = R.end+g.invest>0 ? nf0.format((R.end+g.invest)/g.invest*100)+'٪ سرمایه برگشته است' : 'هنوز هیچ بخشی از سرمایه برنگشته است';
  const netTxt = 'سود خالص ماهانه حدود '+money(P.net)+'.';
  if(P.kind==='in') return nf1.format(P.pb/12)+' سال؛ داخل طرح '+H+' ماهه. '+netTxt;
  if(P.kind==='beyond') return 'طرح '+H+' ماهه کافی نیست؛ طرح باید حداقل '+need+' ماهه ('+nf1.format(P.pb/12)+' سال) باشد. در پایان ماه '+H+' '+endTxt+'. '+netTxt;
  if(P.kind==='ext') return 'منابع با مدت محدود تا ماه '+nf0.format(P.end)+' تمام می‌شوند. برای بازگشت کامل، طرح باید حدود '+need+' ماهه باشد و ترکیب منابع ماه آخر ادامه پیدا کند. '+netTxt;
  if(P.kind==='slow') return netTxt+' این سود برای برگشت سرمایه در ۱۰۰ سال هم کافی نیست؛ قیمت فروش، ریکاوری یا تناژ را بالا ببرید.';
  return 'سود خالص ماهانه مثبت نیست ('+money(P.net)+') و با هیچ مدت طرحی سرمایه برنمی‌گردد.';
}

// ---------- تسهیلات ----------
function loanSchedule(L){
  const fl={}, add=(t,k,v)=>{ (fl[t]=fl[t]||{in:0,fee:0,dep:0,int:0,prin:0})[k]+=v; };
  const A=+L.amount||0; if(!(A>0)) return null;
  const r=(+L.rate||0)/1200, t0=Math.max(0,Math.round(+L.start||0)), gr=Math.max(0,Math.round(+L.grace||0)), n=Math.max(1,Math.round(+L.term||1));
  const fee=A*(+L.fee||0)/100, dep=A*(+L.dep||0)/100;
  add(t0,'in',A); add(t0,'fee',fee); add(t0,'dep',dep);
  let B=A, totInt=0;
  for(let t=t0+1;t<=t0+gr;t++){ const i=B*r; if(L.graceMode==='cap') B+=i; else add(t,'int',i); totInt+=i; }
  const first=t0+gr+1, end=t0+gr+n; let inst=0;
  if(L.method==='annuity'){ inst = r>0? B*r/(1-Math.pow(1+r,-n)) : B/n;
    for(let t=first;t<=end;t++){ const i=B*r, p=inst-i; add(t,'int',i); add(t,'prin',p); B-=p; totInt+=i; } }
  else if(L.method==='equal'){ const p=B/n; inst=p+B*r;
    for(let t=first;t<=end;t++){ const i=B*r; add(t,'int',i); add(t,'prin',p); B-=p; totInt+=i; } }
  else { inst=B*r; for(let t=first;t<=end;t++){ const i=B*r; add(t,'int',i); totInt+=i; if(t===end) add(t,'prin',B); } }
  if(dep) add(end,'dep',-dep);
  const v=[]; for(let t=t0;t<=end;t++){ const f=fl[t]; v.push(f? f.in-f.fee-f.dep-f.int-f.prin : 0); }
  return {fl,t0,first,end,inst,totInt,fee,net:A-fee-dep,eff:irr(v)};
}
function activeLoans(){ return (S.loans||[]).filter(l=>l.on!==false && +l.amount>0).map(l=>({l,sc:loanSchedule(l)})); }
function equity(Rs){
  const N=Rs.rows.length, g=S.g, fin=new Array(N+1).fill(0), intr=new Array(N+1).fill(0), fees=new Array(N+1).fill(0);
  activeLoans().forEach(({sc})=>{ for(const t in sc.fl){ const k=+t; if(k>N) continue; const f=sc.fl[t];
    fin[k]+=f.in-f.fee-f.dep-f.int-f.prin; intr[k]+=f.int; fees[k]+=f.fee; } });
  const eq=[Rs.cf[0]+fin[0]], shield=[0]; let c=eq[0]; const cum=[c];
  for(let t=1;t<=N;t++){ const sh=Math.min(intr[t]+fees[t], Math.max(0,Rs.rows[t-1].pbt))*g.tax/100; shield.push(sh);
    const v=Rs.cf[t]+fin[t]+sh; eq.push(v); c+=v; cum.push(c); }
  return {eq,cum,fin,intr,fees,shield};
}
function cashStats(flow,cum,H){
  let mn=Infinity, mi=0; cum.forEach((v,i)=>{ if(v<mn){mn=v;mi=i;} });
  let pb=null; for(let t=mi+1;t<cum.length;t++){ if(cum[t]>=0){ pb=(t-1)+(-cum[t-1])/flow[t]; break; } }
  if(mn>=0) pb=0;
  let neg=0, worst=0, firstNeg=null; for(let t=1;t<=Math.min(H,flow.length-1);t++){ if(flow[t]<0){ neg++; if(firstNeg===null) firstNeg=t; } worst=Math.min(worst,flow[t]); }
  return {peak:Math.max(0,-mn), peakM:mi, pb, neg, worst, firstNeg, endCum:cum[Math.min(H,cum.length-1)]};
}

