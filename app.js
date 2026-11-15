(function(){
const DAY=864e5, JST=9*36e5;
const D="〇一二三四五六七八九";
const kn=n=>{if(n<10)return D[n];const t=Math.floor(n/10),u=n%10;return(t>1?D[t]:"")+"十"+(u?D[u]:"")};
const POS=["初候","次候","末候"];
const WEEK="日月火水木金土";
const $=id=>document.getElementById(id);

/* ---- JST day numbers (days since 1970-01-01 in Japan time) ---- */
const dayOf=ms=>Math.floor((ms+JST)/DAY);
const ymd=day=>{const d=new Date(day*DAY);return{y:d.getUTCFullYear(),m:d.getUTCMonth()+1,d:d.getUTCDate(),w:d.getUTCDay()}};
const dayFrom=(y,m,d)=>Date.UTC(y,m-1,d)/DAY;

/* ---- sun's apparent ecliptic longitude (Meeus, low precision, ~0.01°) ---- */
const rad=Math.PI/180;
function sunLon(jd){
  const T=(jd-2451545)/36525;
  const L0=280.46646+36000.76983*T+.0003032*T*T;
  const M=(357.52911+35999.05029*T-.0001537*T*T)*rad;
  const C=(1.914602-.004817*T-.000014*T*T)*Math.sin(M)+(.019993-.000101*T)*Math.sin(2*M)+.000289*Math.sin(3*M);
  const om=(125.04-1934.136*T)*rad;
  return((L0+C-.00569-.00478*Math.sin(om))%360+360)%360;
}
function crossing(target,jd){
  for(let k=0;k<12;k++){
    const diff=((target-sunLon(jd))%360+540)%360-180;
    jd+=diff*365.2422/360;
    if(Math.abs(diff)<1e-7)break;
  }
  return jd;
}
const jdToMs=jd=>(jd-2440587.5)*DAY;

/* one cycle = 立春 of year Y up to (not incl.) 立春 of Y+1; 73 boundaries */
const cache={};
function cycle(Y){
  if(cache[Y])return cache[Y];
  const g0=Date.UTC(Y,1,4)/DAY+2440587.5;
  const starts=[];
  for(let i=0;i<=72;i++)starts.push(dayOf(jdToMs(crossing((315+5*i)%360,g0+i*365.2422/72))));
  return cache[Y]=starts;
}
function build(day){
  const y=ymd(day).y;
  let Y=y,st=cycle(Y);
  if(day<st[0]){Y=y-1;st=cycle(Y)}
  const kos=KO.map((k,i)=>({i,kanji:k[0],yomi:k[1],desc:k[4],start:st[i],next:st[i+1],len:st[i+1]-st[i],sekki:Math.floor(i/3),pos:i%3,season:Math.floor(i/18)}));
  const cur=kos.find(k=>day>=k.start&&day<k.next);
  return{Y,st,kos,cur,day};
}

/* ---- formatting ---- */
const jd=x=>{const a=ymd(x);return kn(a.m)+"月"+kn(a.d)+"日"};
const ad=x=>{const a=ymd(x);return a.m+"月"+a.d+"日"};
function wareki(x){
  const a=ymd(x),v=a.y*1e4+a.m*100+a.d;
  let era,n;
  if(v>=20190501){era="令和";n=a.y-2018}else if(v>=19890108){era="平成";n=a.y-1988}else{era="昭和";n=a.y-1925}
  return era+(n===1?"元":kn(n))+"年";
}

const today=dayOf(Date.now());
let S,sel=0,first=true;

/* ---- dial geometry ---- */
const C=420;
const P=(r,a)=>[(C+r*Math.cos(a)).toFixed(2),(C+r*Math.sin(a)).toFixed(2)];
const sector=(r0,r1,a0,a1)=>{const l=a1-a0>Math.PI?1:0;const[a,b]=P(r1,a0),[c,d]=P(r1,a1),[e,f]=P(r0,a1),[g,h]=P(r0,a0);return`M${a} ${b}A${r1} ${r1} 0 ${l} 1 ${c} ${d}L${e} ${f}A${r0} ${r0} 0 ${l} 0 ${g} ${h}Z`};
const deg=a=>a*180/Math.PI;
const radial=(r,a)=>{const[x,y]=P(r,a);return`transform="translate(${x} ${y}) rotate(${Math.cos(a)<0?deg(a)+180:deg(a)})"`};
const tang=(r,a)=>{let d=deg(a)+90;const[x,y]=P(r,a);if(Math.sin(a)>.05)d-=180;return`transform="translate(${x} ${y}) rotate(${d})"`};

function drawDial(){
  const{st,kos,day}=S,N=st[72]-st[0];
  const ang=x=>(x-st[0])/N*Math.PI*2-Math.PI/2;
  let s=`<g class="ticks">`;
  for(let x=st[0];x<st[72];x++){
    const a=ang(x),q=ymd(x),big=q.d===1;
    const[x1,y1]=P(376,a),[x2,y2]=P(big?394:382,a);
    s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#1f1b17" stroke-opacity="${big?.55:.16}" stroke-width="${big?1.1:.7}"/>`;
    if(q.d===15)s+=`<text class="mo-label" text-anchor="middle" dominant-baseline="central" ${tang(406,ang(x+.5))}>${q.m}</text>`;
  }
  s+=`</g><g class="ring r-season">`;
  for(let q=0;q<4;q++){
    const a0=ang(st[q*18]),a1=ang(st[q*18+18]);
    s+=`<path d="${sector(198,232,a0,a1)}" fill="${SEASON[q].c}" stroke="#f3ede2" stroke-width="2"/>`;
    s+=`<text class="se-label" text-anchor="middle" dominant-baseline="central" ${tang(215,(a0+a1)/2)}>${SEASON[q].n}</text>`;
  }
  s+=`</g><g class="ring r-sekki">`;
  for(let j=0;j<24;j++){
    const a0=ang(st[j*3]),a1=ang(st[j*3+3]);
    s+=`<path d="${sector(240,296,a0,a1)}" fill="${SEASON[Math.floor(j/6)].c}" fill-opacity=".05" stroke="#1f1b17" stroke-opacity=".14" stroke-width=".8"/>`;
    s+=`<text class="sk-label" text-anchor="middle" dominant-baseline="central" ${tang(268,(a0+a1)/2)}>${SEKKI[j][0]}</text>`;
  }
  s+=`</g>`;
  const op=[.12,.2,.3];
  kos.forEach(k=>{
    const a0=ang(k.start),a1=ang(k.next);
    s+=`<path class="ko" style="--d:${k.i}" data-i="${k.i}" d="${sector(302,370,a0,a1)}" fill="${SEASON[k.season].c}" fill-opacity="${op[k.pos]}" stroke="#f3ede2" stroke-width="1.6"><title>${k.kanji}（${k.yomi}）${ad(k.start)}〜</title></path>`;
    s+=`<g class="lab" id="l${k.i}" style="--d:${k.i}"><text class="ko-label" text-anchor="middle" dominant-baseline="central" ${radial(336,(a0+a1)/2)}>${k.kanji}</text></g>`;
  });
  const ta=ang(day+.5);const[n1,n2]=P(190,ta),[n3,n4]=P(398,ta),[n5,n6]=P(414,ta);
  const sweep=-(deg(ta)+90);
  s+=`<g class="needle" style="--sweep:${sweep.toFixed(2)}deg"><line x1="${n1}" y1="${n2}" x2="${n3}" y2="${n4}" stroke="#c23b22" stroke-width="1.2" stroke-dasharray="2 3"/><circle class="pulse" cx="${n5}" cy="${n6}" r="5" fill="none" stroke="#c23b22" stroke-width="1"/><circle cx="${n5}" cy="${n6}" r="5" fill="#c23b22"/><circle cx="${n1}" cy="${n2}" r="2.5" fill="#c23b22"/></g>`;
  s+=`<circle class="ring" cx="${C}" cy="${C}" r="186" fill="none" stroke="#1f1b17" stroke-opacity=".12"/>`;
  const dl=$("dial"),was=dl.classList.contains("drawn");
  dl.classList.remove("drawn");dl.innerHTML=s;
  if(was){void dl.getBoundingClientRect();requestAnimationFrame(()=>requestAnimationFrame(()=>dl.classList.add("drawn")))}
}

let lastCenter=-1;
const center=k=>{if(k.i===lastCenter)return;lastCenter=k.i;const c=document.querySelector(".dial-center");c.classList.remove("cswap");void c.offsetWidth;c.classList.add("cswap");$("cNum").textContent="第"+kn(k.i+1)+"候";$("cKanji").textContent=k.kanji;$("cSekki").textContent=SEKKI[k.sekki][0]+"・"+POS[k.pos]};
function select(i,anim=true){
  const{kos,cur}=S;sel=(i+72)%72;const k=kos[sel];
  $("dial").querySelectorAll(".ko").forEach(p=>p.classList.toggle("sel",+p.dataset.i===sel));
  $("dial").querySelectorAll(".lab").forEach(l=>l.classList.toggle("sel",l.id==="l"+sel));
  center(k);
  $("panel").style.setProperty("--sc",SEASON[k.season].c);
  $("pNum").textContent="第"+kn(k.i+1)+"候　"+SEKKI[k.sekki][0]+"・"+POS[k.pos];
  $("pSeason").textContent=SEASON[k.season].n+"・"+SEASON[k.season].cn;
  $("pKanji").textContent=k.kanji;$("pYomi").textContent=k.yomi;$("pDesc").textContent=k.desc;
  $("pPeriod").innerHTML=`<b>${ad(k.start)}</b>　から　<b>${ad(k.next-1)}</b>　まで（${kn(k.len)}日間）`+(k.i===cur.i?`　<span style="color:var(--shu)">・ ${S.day===today?"いま":"選んだ日"}</span>`:"");
  if(anim){const b=$("pBody");b.classList.remove("swap");void b.offsetWidth;b.classList.add("swap")}
}

function render(day){
  S=build(day);
  const{kos,cur}=S,isToday=day===today,q=ymd(day);
  const nextK=kos[(cur.i+1)%72],elapsed=day-cur.start,left=cur.next-day;
  document.documentElement.style.setProperty("--accent",SEASON[cur.season].c);

  /* hero */
  const hero=document.querySelector(".hero");hero.classList.toggle("again",!first);
  const hk=$("hKanji");hk.style.setProperty("--n",cur.kanji.length);
  hk.innerHTML=[...cur.kanji].map((c,i)=>`<span class="ch" style="--d:${i}">${c}</span>`).join("");
  $("swm").textContent=SEASON[cur.season].n;
  window.dispatchEvent(new CustomEvent("koyomi:season",{detail:cur.season}));
  $("hYomi").textContent=cur.yomi;
  $("hSeal").innerHTML=kn(cur.i+1)+"<small>候</small>";
  $("eyebrow").textContent=isToday?"今日の候":"選んだ日の候";
  $("wareki").innerHTML=`${wareki(day)}<strong>${jd(day)}</strong>${WEEK[q.w]}曜日`;
  $("until").innerHTML=`${SEKKI[cur.sekki][0]}の${POS[cur.pos]}、${kn(elapsed+1)}日目。<br>`+(left===1?`明日から、次の候「<em>${nextK.kanji}</em>」。`:`次の候「<em>${nextK.kanji}</em>」まで、あと${kn(left)}日。`);
  $("progress").innerHTML=Array.from({length:cur.len},(_,i)=>`<i class="${i<elapsed?"on":i===elapsed?"now":""}"></i>`).join("");
  $("poem").innerHTML=`<p class="sk">${SEKKI[cur.sekki][0]}<span>・</span>${POS[cur.pos]}</p><p class="desc">${cur.desc}</p><p class="period">${jd(cur.start)}から${jd(cur.next-1)}まで</p><p class="period">第${kn(cur.i+1)}候　${SEASON[cur.season].n}・${SEASON[cur.season].cn}</p>`;
  $("pick").value=`${q.y}-${String(q.m).padStart(2,"0")}-${String(q.d).padStart(2,"0")}`;
  $("reset").hidden=isToday;
  $("today").textContent=isToday?"いまの候へ":"選んだ日の候へ";
  if(!first)["hYomi","poem","until","wareki","swm"].forEach(id=>{const e=$(id);e.classList.remove("fade");void e.offsetWidth;e.classList.add("fade")});

  /* dial + panel */
  drawDial();
  select(cur.i,!first);

  /* triptych */
  const sk=SEKKI[cur.sekki];
  $("tHead").innerHTML=`<span class="roman">ii. &nbsp;The Three Faces of ${ROMAJI[cur.sekki]}</span>${sk[0]}の三候`;
  $("tLead").textContent=`${isToday?"いま":"この日"}は二十四節気の「${sk[0]}（${sk[1]}）」。ひとつの節気は、初候・次候・末候の三つの小さな季節からなります。`;
  $("trip").innerHTML=[0,1,2].map(p=>{const k=kos[cur.sekki*3+p];return`<article class="card${k.i===cur.i?" now":""}" style="--i:${p}"><div class="wm">${POS[p][0]}</div><div class="v"><span class="k">${k.kanji}</span><span class="y">${k.yomi}</span></div><div class="t"><div class="pos">${POS[p]}　第${kn(k.i+1)}候</div><p>${k.desc}</p><div class="d">${ad(k.start)} — ${ad(k.next-1)}</div></div></article>`}).join("");
  $("seasons").innerHTML=SEASON.map((s,i)=>`<div class="sw${i===cur.season?" cur":""}" style="--c:${s.c};--i:${i}"><div class="name">${s.n}</div><div class="cn">${s.cn}</div><div class="hex">${s.c}</div></div>`).join("");
  if(!first){const sl=$("hSeal");sl.style.animation="none";void sl.offsetWidth;sl.style.animation="stamp .55s .7s cubic-bezier(.3,1.6,.5,1) forwards"}
  $("foot").textContent=`${wareki(day)}　${SEASON[cur.season].n}　${cur.kanji}`;
  first=false;
}

/* events (bound once) */
const dial=$("dial");
const wrap=document.querySelector(".dial-wrap");
new ResizeObserver(()=>wrap.style.setProperty("--dw",wrap.getBoundingClientRect().width+"px")).observe(wrap);
dial.addEventListener("click",e=>{const p=e.target.closest(".ko");if(p)select(+p.dataset.i)});
dial.addEventListener("mouseover",e=>{const p=e.target.closest(".ko");if(p)center(S.kos[+p.dataset.i])});
dial.addEventListener("mouseleave",()=>center(S.kos[sel]));
$("prev").onclick=()=>select(sel-1);$("next").onclick=()=>select(sel+1);$("today").onclick=()=>select(S.cur.i);
document.addEventListener("keydown",e=>{if(e.target.tagName==="INPUT")return;if(e.key==="ArrowLeft")select(sel-1);if(e.key==="ArrowRight")select(sel+1)});
$("pick").addEventListener("change",e=>{const v=e.target.value;if(!v)return;const[y,m,d]=v.split("-").map(Number);if(y<2001||y>2099)return;render(dayFrom(y,m,d))});
$("reset").onclick=()=>render(today);

render(today);

/* reveal */
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}}),{threshold:.12});
document.querySelectorAll(".rv").forEach(el=>io.observe(el));
window.addEventListener("beforeprint",()=>document.querySelectorAll(".rv").forEach(el=>el.classList.add("in")));
})();
