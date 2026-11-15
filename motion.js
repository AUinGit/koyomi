(function(){
const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
const hero=document.querySelector(".hero");
const cv=document.getElementById("sky");
const ctx=cv.getContext("2d");
let W=0,H=0,DPR=1,mode=3,parts=[],visible=true,raf=0,last=0;
const ptr={x:-1e4,y:-1e4,px:0,py:0,tx:0,ty:0,vx:0,lastX:null};
let wind=0;

/* ---------- dial entrance ---------- */
const dial=document.getElementById("dial");
if(reduced){dial.classList.add("drawn")}
else new IntersectionObserver((es,o)=>es.forEach(e=>{if(e.isIntersecting){dial.classList.add("drawn");o.disconnect()}}),{threshold:.25}).observe(dial);

if(reduced){cv.style.display="none";return}

/* ---------- sizing ---------- */
function size(){
  const r=hero.getBoundingClientRect();
  DPR=Math.min(2,window.devicePixelRatio||1);
  W=r.width;H=r.height;
  cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);
  ctx.setTransform(DPR,0,0,DPR,0,0);
}
new ResizeObserver(()=>{size();if(!parts.length)seed()}).observe(hero);

/* ---------- particles per season ---------- */
const rnd=(a,b)=>a+Math.random()*(b-a);
const LEAF=["#b5562c","#c9793a","#a8442a","#cf9442","#8e3b22"];
const PETAL=["#e2a3ae","#d98a9a","#eab8bf","#cf7b8d"];
function make(top){
  const z=rnd(.35,1);
  const p={z,x:rnd(-20,W+20),y:top?rnd(-H*.25,-10):rnd(-20,H),ph:rnd(0,Math.PI*2),rot:rnd(0,Math.PI*2),spin:rnd(-.03,.03),flip:rnd(0,Math.PI*2),fs:rnd(.02,.06)};
  if(mode===3){p.r=rnd(.7,2.6)*z;p.vy=rnd(.18,.5)*z+.08;p.sw=rnd(.2,.6)}
  if(mode===0){p.r=rnd(4,7.5)*z;p.vy=rnd(.25,.6)*z+.1;p.vx=rnd(.15,.5);p.sw=rnd(.4,1);p.c=PETAL[Math.floor(Math.random()*PETAL.length)]}
  if(mode===2){p.r=rnd(6,11)*z;p.vy=rnd(.35,.8)*z+.15;p.vx=rnd(-.1,.3);p.sw=rnd(.6,1.4);p.c=LEAF[Math.floor(Math.random()*LEAF.length)]}
  if(mode===1){p.y=rnd(H*.25,H);p.r=rnd(1.4,2.6)*z;p.dir=rnd(0,Math.PI*2);p.sp=rnd(.15,.45);p.pulse=rnd(.012,.03)}
  return p;
}
function seed(){
  const area=W*H;
  const n={3:area/9000,0:area/26000,2:area/34000,1:area/30000}[mode];
  const cap={3:[50,160],0:[22,60],2:[14,40],1:[18,46]}[mode];
  parts=Array.from({length:Math.round(Math.max(cap[0],Math.min(cap[1],n)))},()=>make(false));
}
/* soft glow sprite for fireflies */
const glow=document.createElement("canvas");glow.width=glow.height=64;
{const g=glow.getContext("2d"),gr=g.createRadialGradient(32,32,0,32,32,32);
 gr.addColorStop(0,"rgba(214,226,120,1)");gr.addColorStop(.18,"rgba(176,196,70,.75)");gr.addColorStop(.5,"rgba(150,170,60,.18)");gr.addColorStop(1,"rgba(150,170,60,0)");
 g.fillStyle=gr;g.fillRect(0,0,64,64)}

function leaf(r){
  ctx.beginPath();ctx.moveTo(0,-r);
  ctx.quadraticCurveTo(r*.85,-r*.2,0,r);
  ctx.quadraticCurveTo(-r*.85,-r*.2,0,-r);
  ctx.fill();
  ctx.globalAlpha*=.5;ctx.lineWidth=.6;ctx.strokeStyle="#5a2a14";
  ctx.beginPath();ctx.moveTo(0,-r*.9);ctx.lineTo(0,r*1.25);ctx.stroke();
}
function petal(r){
  ctx.beginPath();
  ctx.moveTo(0,r);
  ctx.bezierCurveTo(r*.9,r*.4,r*.75,-r*.7,r*.18,-r);
  ctx.lineTo(0,-r*.72);ctx.lineTo(-r*.18,-r);
  ctx.bezierCurveTo(-r*.75,-r*.7,-r*.9,r*.4,0,r);
  ctx.fill();
}

function step(dt,t){
  ctx.clearRect(0,0,W,H);
  wind+=(ptr.vx*.04-wind)*.04*dt;
  for(const p of parts){
    /* gentle push away from the pointer */
    const dx=p.x-ptr.x,dy=p.y-ptr.y,d2=dx*dx+dy*dy;
    let ax=0,ay=0;
    if(d2<14400){const d=Math.sqrt(d2)||1,f=(1-d/120)*.9;ax=dx/d*f;ay=dy/d*f*.6}
    if(mode===1){
      p.dir+=rnd(-.08,.08)*dt;
      p.x+=(Math.cos(p.dir)*p.sp+ax)*dt;p.y+=(Math.sin(p.dir)*p.sp*.7-.04+ay)*dt;
      if(p.x<-20)p.x=W+20;if(p.x>W+20)p.x=-20;if(p.y<H*.15)p.dir=Math.PI/2;if(p.y>H+10)p.dir=-Math.PI/2;
      const a=Math.pow((Math.sin(t*p.pulse*.06+p.ph)+1)/2,2.2);
      const s=p.r*14*(.6+a*.6);
      ctx.globalAlpha=.15+a*.85*p.z;
      ctx.drawImage(glow,p.x-s/2,p.y-s/2,s,s);
      continue;
    }
    p.ph+=.012*dt;p.rot+=p.spin*dt;p.flip+=p.fs*dt;
    p.x+=(Math.sin(p.ph)*p.sw*.5+(p.vx||0)+wind*p.z+ax)*dt;
    p.y+=(p.vy+ay)*dt;
    if(p.y>H+24||p.x>W+40||p.x<-40){Object.assign(p,make(true))}
    ctx.save();ctx.translate(p.x,p.y);
    if(mode===3){
      ctx.globalAlpha=.12+.32*p.z;ctx.fillStyle="#2f4b6e";
      ctx.beginPath();ctx.arc(0,0,p.r,0,Math.PI*2);ctx.fill();
      if(p.r>1.9){ctx.globalAlpha=.05;ctx.beginPath();ctx.arc(0,0,p.r*2.6,0,Math.PI*2);ctx.fill()}
    }else{
      ctx.rotate(p.rot);ctx.scale(1,Math.max(.12,Math.abs(Math.cos(p.flip))));
      ctx.globalAlpha=(mode===0?.55:.72)*(.45+.55*p.z);ctx.fillStyle=p.c;
      mode===0?petal(p.r):leaf(p.r);
    }
    ctx.restore();
  }
  ctx.globalAlpha=1;
}

/* ---------- parallax ---------- */
function parallax(dt){
  ptr.px+=(ptr.tx-ptr.px)*.06*dt;ptr.py+=(ptr.ty-ptr.py)*.06*dt;
  ptr.vx*=Math.pow(.9,dt);
  hero.style.setProperty("--px",ptr.px.toFixed(4));
  hero.style.setProperty("--py",ptr.py.toFixed(4));
}
let sy=0;
const onScroll=()=>{const y=Math.min(window.scrollY,innerHeight*1.3);if(y!==sy){sy=y;hero.style.setProperty("--sy",y.toFixed(1))}};
addEventListener("scroll",onScroll,{passive:true});onScroll();

hero.addEventListener("pointermove",e=>{
  const r=hero.getBoundingClientRect();
  ptr.x=e.clientX-r.left;ptr.y=e.clientY-r.top;
  ptr.tx=(ptr.x/r.width-.5)*2;ptr.ty=(ptr.y/r.height-.5)*2;
  if(ptr.lastX!==null)ptr.vx=e.clientX-ptr.lastX;ptr.lastX=e.clientX;
});
hero.addEventListener("pointerleave",()=>{ptr.x=ptr.y=-1e4;ptr.tx=ptr.ty=0;ptr.lastX=null});

/* ---------- loop ---------- */
function loop(now){
  const dt=Math.min(3,(now-(last||now))/16.667)||1;last=now;
  step(dt,now);parallax(dt);
  raf=requestAnimationFrame(loop);
}
function run(){if(!raf&&visible&&!document.hidden){last=0;raf=requestAnimationFrame(loop)}}
function stop(){cancelAnimationFrame(raf);raf=0}
new IntersectionObserver(es=>{visible=es[0].isIntersecting;visible?run():stop()}).observe(hero);
document.addEventListener("visibilitychange",()=>document.hidden?stop():run());

addEventListener("koyomi:season",e=>{
  if(e.detail===mode&&parts.length)return;
  mode=e.detail;size();seed();run();
});
})();
