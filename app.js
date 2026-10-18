'use strict';
const canvas=document.getElementById('ocean'),ctx=canvas.getContext('2d',{alpha:false}),organism=document.createElement('canvas'),ink=organism.getContext('2d');
const G=window.MedusaGeometry,M=window.MusicModel,A=window.medusaAudio,TAU=Math.PI*2;
const params={energy:0,flow:1,light:.75,hue:0};
const population=new M.Population(2);window.medusaPopulation=population;
let w=0,h=0,dpr=1,last=null,lastPaint=0,time=0,age=0,phase=0,wave=0,travel=0,seed=2,paused=matchMedia('(prefers-reduced-motion: reduce)').matches,pointer=0,targetPointer=0,dirty=true,audioSession=false,beatGlow=0,bodyLight=.75,soft=M.empty(),groupScale=1,growth=.25,pulseRate=.82,lastUI=0;
let sound=M.empty(),visual={...params},bodyAlpha=1;
const controls=document.getElementById('controls'),toggle=document.getElementById('panelToggle');
function panel(open){controls.hidden=!open;toggle.setAttribute('aria-expanded',String(open));document.getElementById('toggleIcon').textContent=open?'−':'+';}
panel(false);toggle.onclick=()=>{panel(controls.hidden);if(!controls.hidden)window.closeMusicPanel?.();};
// Reel recording renders a fixed 540×960 world at 2× (1080×1920 pixels), letterboxed on screen.
function resize(){const ow=w,oh=h;if(window.reelActive){w=540;h=960;dpr=2;}else{w=innerWidth;h=innerHeight;dpr=Math.min(devicePixelRatio||1,1.5);}
 // Keep swimmers in the same relative place when the frame changes size (e.g. entering 9:16 recording).
 if(ow&&oh&&(ow!==w||oh!==h)&&typeof population!=='undefined')for(const m of population.members){if(m.x===undefined)continue;const sx=w/ow,sy=h/oh;m.x*=sx;m.y*=sy;m.vx*=sx;m.vy*=sy;if(m.chain)for(const n of m.chain){n.x*=sx;n.px*=sx;n.y*=sy;n.py*=sy;}}canvas.width=organism.width=Math.round(w*dpr);canvas.height=organism.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ink.setTransform(dpr,0,0,dpr,0,0);dirty=true;}addEventListener('resize',resize);resize();
for(const key of ['energy','flow','light']){const input=document.getElementById(key);input.oninput=()=>{params[key]=+input.value/100;document.getElementById(key+'Val').textContent=input.value+'%';dirty=true;};}
document.querySelectorAll('[data-hue]').forEach(b=>b.onclick=()=>{params.hue=+b.dataset.hue;params.white=!!b.dataset.white;document.querySelectorAll('[data-hue]').forEach(x=>{const active=x===b;x.classList.toggle('active',active);x.setAttribute('aria-pressed',String(active));});dirty=true;});
function resetWorld(nextSeed){time=age=phase=wave=travel=0;seed=nextSeed;population.reset(seed);sound=M.empty();soft=M.empty();beatGlow=0;groupScale=1;growth=.25;dirty=true;}
A.addEventListener('session',()=>{audioSession=true;paused=false;resetWorld(A.seed);});
A.addEventListener('change',()=>{dirty=true;if(A.status==='ended'){population.finished=true;if(A.duration){age=1;growth=1;time=A.elapsed;}}syncControls();});
function syncControls(){
 const locked=audioSession;document.getElementById('manualFields').disabled=locked;document.getElementById('manualBadge').textContent=locked?'AUDIO':'MANUAL';
 document.getElementById('manualHint').textContent=locked?'參數由音樂驅動。即時來源的暫停只停止水母，來源仍會播放。':'連接音樂後，下列參數會由聲音驅動。';
 document.getElementById('pause').textContent=(audioSession?A.status!=='playing':paused)?'▷ 繼續':'Ⅱ 暫停';
 document.getElementById('pause').disabled=audioSession&&!['playing','paused','ready'].includes(A.status);
 document.getElementById('reset').textContent=audioSession?'開始新曲':'↻ 重新生長';
 document.getElementById('reset').disabled=audioSession&&!A.buffer&&!A.stream;
}
window.pauseMedusa=async()=>{try{if(audioSession)await A.toggle();else paused=!paused;}catch(e){A.message=A.errorText(e);A.notify();}last=null;dirty=true;syncControls();};
document.getElementById('pause').onclick=window.pauseMedusa;
document.getElementById('reset').onclick=async()=>{if(audioSession){try{await A.restart();}catch(e){A.message=A.errorText(e);A.notify();}}else resetWorld(++seed);};
window.manualMedusa=()=>{A.disconnect('已切換為手動演算。');audioSession=false;paused=false;resetWorld(++seed);syncControls();};
let exitTimer;
function revealExit(){if(!document.body.classList.contains('immersed'))return;document.body.classList.add('show-exit');clearTimeout(exitTimer);exitTimer=setTimeout(()=>document.body.classList.remove('show-exit'),2500);}
// Immersive view uses real fullscreen when the browser allows it; the CSS overlay stays as fallback.
window.immerseMedusa=()=>{const el=document.documentElement,req=el.requestFullscreen||el.webkitRequestFullscreen;if(req&&!document.fullscreenElement){try{const r=req.call(el,{navigationUI:'hide'});r?.catch?.(()=>{});}catch(e){}}document.body.classList.add('immersed');document.activeElement?.blur();revealExit();dirty=true;};
document.getElementById('immersive').onclick=window.immerseMedusa;
function exit(){if(document.fullscreenElement||document.webkitFullscreenElement)(document.exitFullscreen||document.webkitExitFullscreen).call(document)?.catch?.(()=>{});document.body.classList.remove('immersed','show-exit');clearTimeout(exitTimer);document.getElementById('immersive').focus();dirty=true;}
document.getElementById('exit').onclick=exit;
const onFull=()=>{if(!document.fullscreenElement&&!document.webkitFullscreenElement&&document.body.classList.contains('immersed'))exit();resize();};document.addEventListener('fullscreenchange',onFull);document.addEventListener('webkitfullscreenchange',onFull);
addEventListener('keydown',e=>{if(e.key==='Escape')exit();if(/INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target.tagName))return;if(e.code==='Space'){e.preventDefault();window.pauseMedusa();}if(e.key.toLowerCase()==='m'&&A.mode==='file'){A.muted=!A.muted;A.setVolume(A.volume);A.notify();}});
addEventListener('pointermove',e=>{targetPointer=(e.clientX/w-.5)*2;revealExit();});addEventListener('pointerdown',revealExit);addEventListener('pointerout',e=>{if(!e.relatedTarget)targetPointer=0;});document.addEventListener('visibilitychange',()=>{last=null;dirty=true;});
let bodyA=190,bodyB=275,bodyWhite=false;
// Tone at mix t: hue → hue, or hue → white (saturation drains, lightness rises).
function tone(t,light,a){const m=M.clamp(t),shift=audioSession?visual.hue*.3:visual.hue;if(bodyWhite)return `hsla(${bodyA+shift},${100-88*m}%,${light+(94-light)*m*.85}%,${a})`;const d=((bodyB-bodyA+540)%360)-180;return `hsla(${bodyA+d*m+shift},100%,${light}%,${a})`;}
// Interwoven two-tone: each line takes its own fixed mix, spread evenly by the golden ratio.
// Bell lines fade between the two tones along their length; tentacles take their tone from where they sit around the bell.
const along=f=>f,loop=f=>.5-.5*Math.cos(f*TAU);let around=a=>.5;
function stroke(points,t,alpha,width=.65){
 // t is a fixed 0–1 mix, or a function of position along the line (drawn in short chunks).
 const d=((bodyB-bodyA+540)%360)-180,shift=audioSession?visual.hue*.3:visual.hue,a=M.clamp(alpha*(.3+bodyLight*.9)*bodyAlpha),light=62+bodyLight*12;
 const n=typeof t==='function'?8:1,len=points.length-1;
 for(let c=0;c<n;c++){const s0=Math.floor(len*c/n),s1=Math.floor(len*(c+1)/n),mix=n>1?t((c+.5)/n):t;ink.beginPath();for(let i=s0;i<=s1;i++){const p=points[i];if(i===s0)ink.moveTo(p[0],p[1]);else ink.lineTo(p[0],p[1]);}ink.strokeStyle=tone(mix,light,a);ink.lineWidth=width;ink.stroke();}
}
// Species presets: proportions for the same parametric body. `ear` is how each species listens:
// band weights for contraction power, reaction time (s), startle sensitivity, depth steering and glow.
// Shared by drawJelly, swimStep and the selector.
const SPECIES={
 original:{name:'原創混合',latin:'MEDUSA',bellH:.91,scallop:1,tentN:40,tentLen:1,tentAmp:1,armN:8,armLen:1,armW:1,organs:1,freq:[.6,1],amp:1.8,flex:.12,thrust:1,contract:.3,sea:{n:100,rgb:[133,162,205],speed:1,size:1,alpha:1},ear:{bass:.8,mid:.3,treble:.2,react:.3,startle:.5,depth:.4,glow:.3}},
 chrysaora:{name:'太平洋海刺水母',latin:'CHRYSAORA FUSCESCENS',bellH:.85,scallop:2.2,tentN:24,tentLen:1.6,tentAmp:1.1,armN:4,armLen:1.55,armW:1.5,organs:0,freq:[.7,1.1],amp:2,flex:.16,thrust:1.1,contract:.3,sea:{n:160,rgb:[150,175,145],speed:.8,size:1.15,alpha:1.1},ear:{bass:.7,mid:.6,treble:.2,react:.3,startle:.6,depth:.4,glow:.2}},
 aurelia:{name:'海月水母',latin:'AURELIA AURITA',bellH:.42,scallop:.5,tentN:180,tentLen:.12,tentAmp:.25,armN:4,armLen:.45,armW:.7,organs:1.6,freq:[.5,.9],amp:2.4,flex:.3,thrust:.8,contract:.32,sea:{n:120,rgb:[170,186,210],speed:.9,size:1,alpha:1},ear:{bass:.5,mid:.4,treble:.3,react:1,startle:.2,depth:.25,glow:.3}},
 aequorea:{name:'多管發光水母',latin:'AEQUOREA VICTORIA',bellH:.55,scallop:.3,tentN:100,tentLen:.7,tentAmp:.5,armN:4,armLen:.3,armW:.45,organs:0,canals:100,dots:{n:100,rim:true},freq:[.8,1.2],amp:1.4,flex:.1,thrust:.7,contract:.3,sea:{n:55,rgb:[115,150,205],speed:.6,size:.85,alpha:.8},ear:{bass:.3,mid:.3,treble:.9,react:.4,startle:.4,depth:.3,glow:1}},
 cyanea:{name:'獅鬃水母',latin:'CYANEA CAPILLATA',bellH:.6,scallop:1.6,tentN:150,tentLen:2.1,tentAmp:1.2,armN:8,armLen:1.3,armW:1.8,organs:0,freq:[.3,.5],amp:2.2,flex:.22,thrust:.9,contract:.35,sea:{n:80,rgb:[140,195,215],speed:.45,size:.95,alpha:.9},ear:{bass:1.2,mid:.2,treble:.05,react:1.4,startle:.1,depth:.5,glow:.1}},
 pelagia:{name:'夜光游水母',latin:'PELAGIA NOCTILUCA',bellH:1,scallop:1.4,tentN:8,tentLen:1.9,tentAmp:1,armN:4,armLen:1.4,armW:1.1,organs:0,dots:{n:70,rim:false},freq:[1.4,2],amp:2.4,flex:.14,thrust:1.3,contract:.25,sea:{n:90,rgb:[205,160,190],speed:1.1,size:1,alpha:1},ear:{bass:.4,mid:.4,treble:.8,react:.12,startle:1,depth:.5,glow:.8}}
};
let speciesKey='original';try{const saved=localStorage.getItem('medusa-species');if(SPECIES[saved])speciesKey=saved;}catch(e){}
const sea={n:100,rgb:[133,162,205],speed:1,size:1,alpha:1};
function setSpecies(key){if(!SPECIES[key])return;speciesKey=key;try{localStorage.setItem('medusa-species',key);}catch(e){}const sel=document.getElementById('species');if(sel)sel.value=key;const sig=document.getElementById('speciesSig');if(sig)sig.textContent=SPECIES[key].latin;dirty=true;}
function dot(p,t,alpha,r){const d=((bodyB-bodyA+540)%360)-180,shift=audioSession?visual.hue*.3:visual.hue;ink.beginPath();ink.arc(p[0],p[1],r,0,TAU);ink.fillStyle=tone(t,70+bodyLight*15,M.clamp(alpha*(.3+bodyLight*.9)*bodyAlpha));ink.fill();}
// Swimming physics. The body obeys thrust, quadratic drag, slight negative buoyancy and slow turning;
// music only decides when to contract, how hard, and which way the jelly would like to go.
function jellyRadius(member){const bornAge=Math.max(0,time-member.born),birthScale=member.id===0?1:.25+.75*(1-Math.exp(-bornAge/16));return Math.min(w*(w<700?.27:.25),h*.23,Math.max(40,h-170)/4.2)*growth*groupScale*member.size*birthScale;}
const ease=x=>x*x*(3-2*x);
function swimStep(m,dt){
 const sp=SPECIES[speciesKey],r=jellyRadius(m),hsh=k=>{const x=Math.sin(m.seed*12.9898+k*78.233)*43758.5453;return x-Math.floor(x);};
 if(m.vx===undefined){m.x=m.x??(m.id?w*(.2+.6*hsh(5)):w*.5);m.y=m.y??(m.id?h*(.35+.4*hsh(6)):h*.5);m.vx=m.vy=0;m.ang=m.id?(hsh(7)-.5)*.8:0;m.t=hsh(8)*2;m.n=0;m.beats=0;m.c=0;}
 // Natural pulse frequency for this species; volume (or the energy slider) moves it inside that range.
 // Personal hearing: each species weighs the bands differently and reacts at its own speed.
 const ear=sp.ear;if(audioSession){m.lvl=M.smooth(m.lvl??0,M.clamp(sound.bass*ear.bass+sound.mid*ear.mid+sound.treble*ear.treble),dt,ear.react);m.fluxAvg=M.smooth(m.fluxAvg??sound.flux,sound.flux,dt,2);m.eng=M.smooth(m.eng??0,sound.energy,dt,ear.react*2);}
 // Preferred depth: each jelly holds a slowly wandering water layer (brighter music lifts it) by pulsing
 // more when too deep and less — or not at all — when too high, the way real jellies keep station.
 const zTop=72+r*1.15,zBot=Math.max(zTop+r*.8,h-85-r*.9),span=Math.max(1,zBot-zTop);
 m.pd=zTop+span*M.clamp(.55+.3*Math.sin(time*.025+hsh(15)*TAU)+.12*Math.sin(time*.061+hsh(16)*TAU)-(audioSession?(soft.centroid-.4)*ear.depth*.8:0),.15,.85);
 const depthErr=(m.y-m.pd)/span;m.depthErr=depthErr;
 // With music every beat still contracts the bell, but above its layer the stroke gives little or no lift.
 m.lift=audioSession?M.clamp(1+(depthErr-.04)*6,0,1.6):1;
 const drive=audioSession?m.eng??0:params.energy,f=(sp.freq[0]+(sp.freq[1]-sp.freq[0])*M.clamp(drive))*(1+(hsh(9)-.5)*.12)*(audioSession?1:.65+.35*params.energy)*M.clamp(1+depthErr*1.2,.55,1.4),T=1/f,Tc=T*sp.contract,Tr=T*.5;
 m.t+=dt;
 // Decide when the next contraction starts: on a beat the species can keep up with, otherwise after its natural period.
 const ready=m.t>=Tc+Tr*.85;let go=false;
 if(audioSession){if(sound.beat){m.beats++;const interval=sound.bpm?60/sound.bpm:T,every=Math.max(1,Math.round(T/interval));if(ready&&m.beats>=every)go=true;}if(ready&&m.t>=T*1.7&&!(A.features?.silent>1))go=true;if(ear.startle&&m.t>=Tc+Tr*.5&&sound.flux>(m.fluxAvg??0)*(3-ear.startle*1.2)+.12){go=true;m.startled=1;}if(m.t>=T*4)go=true;}
 else if(m.t>=T&&!(m.rest>0))go=true;
 m.rest=Math.max(0,(m.rest??0)-dt);
 // Too high: free mode skips the pulse; with music the beat is kept (only a startle is skipped) and the stroke is softened instead.
 if(go&&depthErr<-.04&&!m.diveT&&(!audioSession||m.startled)){go=false;m.startled=0;m.t=Math.min(m.t,Tc+Tr);}
 if(m.kick&&m.t>=Tc){go=true;m.kick=0;}
 if(go){m.c0=m.c??0;m.t=0;m.n++;m.beats=0;m.power=audioSession?.55+(m.lvl??0)*.9+beatGlow*.25+(m.startled?.3:0):.18+params.energy*.7;if(!audioSession)m.power*=M.clamp(1+depthErr*3,.25,1.6);m.startled=0;}
 // Three stages: fast contraction, slower recovery, then coast.
 // Contraction starts from wherever the bell is (no snap); recovery is slower than the squeeze.
 const prev=m.c??0,c0=m.c0??0;m.c=m.t<Tc?c0+(1-c0)*ease(m.t/Tc):m.t<Tc+Tr?1-ease((m.t-Tc)/Tr):0;
 m.cyc=(m.cyc??hsh(14)*TAU)+dt*TAU/T;
 // Thrust follows the rate of contraction, along the bell axis (apex direction).
 const dirX=Math.sin(m.ang),dirY=-Math.cos(m.ang),squeezeRaw=Math.max(0,m.c-prev)/Math.max(dt,1e-3);m.sqz=M.smooth(m.sqz??0,squeezeRaw,dt,.12);const squeeze=m.sqz;
 // Ocean current (music only): stereo balance sets the horizontal flow; it varies a little with depth and
 // weakens near the side walls, so jellies drift with the water instead of steering sideways themselves.
 let ux=0;if(audioSession){const l0=24+r*1.42,r0=Math.max(l0,w-24-r*1.42),gap=soft.pan>0?r0-m.x:m.x-l0;ux=soft.pan*w*.09*(1+.3*Math.sin(m.y/h*3+time*.1))*M.clamp(gap/(r*1.5));}
 m.ux=ux;const thrust=squeeze*r*5*sp.thrust*(m.power??.5)*(m.lift??1),speed=Math.hypot(m.vx-ux,m.vy);
 // Heft: bigger bells with longer tentacles carry more water, so they speed up, slow down and turn more slowly.
 const heft=M.clamp(Math.sqrt(r/180)*(1+.25*sp.tentLen),.7,2.6);
 m.vx+=(dirX*thrust-(m.vx-ux)*speed*2.4/r-(m.vx-ux)*.35)/heft*dt;
 m.vy+=(dirY*thrust-m.vy*speed*2.4/r-m.vy*.35+r*(audioSession?.075:.05))/heft*dt;
 // Steering target: wandering point, nudged by brightness (depth) and stereo balance, kept inside the frame and away from others.
 m.wt=(m.wt??hsh(10)*100)+dt*.05;
 let tx=w*(.5+.32*Math.sin(m.wt*1.3+hsh(11)*6)),ty=h*(.5+.25*Math.sin(m.wt*.9+hsh(12)*6)-(audioSession?(soft.centroid-.4)*ear.depth:0));
 for(const o of population.members){if(o===m||o.vx===undefined||!Number.isFinite(o.x))continue;const dx=m.x-o.x,dy=m.y-o.y,d=Math.hypot(dx,dy)||1,near=(r+jellyRadius(o))*1.4;if(d<near){tx+=dx/d*(near-d)*2;ty+=dy/d*(near-d)*2;}}
 // After touching a wall the jelly keeps heading away from it for a few seconds.
 if(m.reflex&&m.reflex.t>0){m.reflex.t-=dt;const k=Math.max(0,m.reflex.t/3);tx+=m.reflex.nx*w*.35*k;ty+=m.reflex.ny*h*.35*k;}
 {const l0=24+r*1.42,r0=Math.max(l0,w-24-r*1.42),t0=72+r*1.15,b0=Math.max(t0+r*.8,h-85-r*.9);tx=M.clamp(tx,l0,r0);ty=M.clamp(ty,t0,b0);}
 const want=Math.atan2(tx-m.x,-(ty-m.y)),diff=Math.atan2(Math.sin(want-m.ang),Math.cos(want-m.ang));
 // Turning happens mostly while contracting (uneven bell squeeze); a weak righting pull keeps the apex roughly up.
 // Angular inertia: torque builds an angular velocity that eases in and out instead of snapping.
 // Free mode: the jelly only drives itself upward; sideways travel happens only after touching a boundary.
 // With music the jelly may only lean slightly toward its goal (±20°); the current does the sideways work.
 // Now and then a jelly leans over and swims sideways or slightly downward for a few strokes, then rights itself.
 m.nextDive=m.nextDive??time+25+hsh(17)*50;
 if(!m.diveT&&time>=m.nextDive&&depthErr>-.1){m.diveT=5+hsh(18)*4;m.diveAim=(m.x<w/2?1:-1)*(1.35+hsh(19)*.5);m.nextDive=time+40+hsh(20+m.n%7)*60;}
 if(m.diveT){m.diveT=Math.max(0,m.diveT-dt);}
 const aim=m.diveT?m.diveAim:audioSession?M.clamp(want,-.35,.35):0;
 const steer=Math.atan2(Math.sin(aim-m.ang),Math.cos(aim-m.ang))*(audioSession&&!m.diveT?1:1.1);
 const reflexTurn=m.reflex&&m.reflex.t>(audioSession?1.8:.8)?Math.atan2(Math.sin(m.reflex.aim-m.ang),Math.cos(m.reflex.aim-m.ang))*m.reflex.force:0;
 m.av=(m.av??0)+(((steer*(.25+squeeze*.5)*.6+reflexTurn-Math.sin(m.ang)*.1)-(m.av??0))*2.2/heft)*dt;m.ang+=m.av*dt;if(Math.abs(m.ang)>1.9){m.ang=Math.sign(m.ang)*1.9;m.av*=.5;}
 m.tAng=M.smooth(m.tAng??m.ang,m.ang,dt,.3+.35*sp.tentLen);
 m.x+=m.vx*dt;m.y+=m.vy*dt;
 m.sq=M.smooth(m.sq??0,Math.min(1,squeeze*Tc*.6),dt,.25);
 const left=24+r*1.42,right=Math.max(left,w-24-r*1.42),top=72+r*1.15,bottom=Math.max(top+r*.8,h-85-r*.9);
 // Touch reflex: the margin feels the wall (surface / rock) and squeezes unevenly to turn away.
 let nx=0,ny=0;
 if(m.x<left){m.x=left;m.vx=Math.abs(m.vx)*.3;nx=1;}if(m.x>right){m.x=right;m.vx=-Math.abs(m.vx)*.3;nx=-1;}if(m.y<top){m.y=top;m.vy=Math.abs(m.vy)*.3;ny=1;}if(m.y>bottom){m.y=bottom;m.vy=-Math.abs(m.vy)*.3;ny=-1;}
 m.touchCool=Math.max(0,(m.touchCool??0)-dt);
 if((nx||ny)&&!m.touchCool){const nl=Math.hypot(nx,ny);nx/=nl;ny/=nl;const facing=Math.max(0,-(dirX*nx+dirY*ny));let away=Math.atan2(nx,-ny);if(Math.abs(away)>1.6){const side=nx?Math.sign(nx):audioSession||Math.abs(m.ang)>.15?(m.ang>=0?1:-1):(m.x<w/2?1:-1);away=side*(ny>0&&!nx?(audioSession?1.5:1.25):Math.min(1.85,Math.abs(away)));}
  m.reflex={nx,ny,t:3,aim:away,force:.6+facing*1.2};if(!audioSession&&ny>0)m.rest=2.5+hsh(13)*2;m.kick=1;m.touchCool=1.2;}
 chainStep(m,dt,r);
}
// Trailing chain: a verlet rope hanging from the bell rim in screen space. Tentacles and arms read their
// bend from it, so they stream behind on thrust, swing out on turns and drift back while coasting.
const CHAIN=20;
function chainStep(m,dt,r){
 const sp=SPECIES[speciesKey],total=Math.max(sp.tentLen*2.05,sp.armLen*1.75,.4)*r,seg=total/(CHAIN-1);
 const ax=Math.sin(m.tAng??m.ang),ay=-Math.cos(m.tAng??m.ang),soft=1/(1+.6*sp.tentLen);
 if(!m.chain){m.chain=[];for(let i=0;i<CHAIN;i++){const p=[m.x-ax*seg*i,m.y-ay*seg*i];m.chain.push({x:p[0],y:p[1],px:p[0],py:p[1]});}}
 if(dt<=0)return;
 const k=Math.min(dt,.05),turb=r*(audioSession?.25+sound.flux*1.2+sound.density*.4:.25+visual.flow*.3);
 for(let i=1;i<CHAIN;i++){const n=m.chain[i],vx=(n.x-n.px)*.94,vy=(n.y-n.py)*.94;n.px=n.x;n.py=n.y;
  const fx=Math.sin(time*.9+i*.7+m.seed)*turb+(m.ux??0)*(i/CHAIN)*1.5,fy=r*.5+Math.cos(time*.7+i*.5+m.seed*2)*turb*.4;n.x+=vx+fx*k*k;n.y+=vy+fy*k*k;}
 const a=m.chain[0];a.x=a.px=m.x;a.y=a.py=m.y;
 for(let it=0;it<4;it++){
  for(let i=1;i<CHAIN;i++){const p=m.chain[i-1],n=m.chain[i],dx=n.x-p.x,dy=n.y-p.y,d=Math.hypot(dx,dy)||1,f=(d-seg)/d;
   if(i===1){n.x-=dx*f;n.y-=dy*f;}else{n.x-=dx*f*.5;n.y-=dy*f*.5;p.x+=dx*f*.5;p.y+=dy*f*.5;}}
  // Root stiffness: the first nodes stay close to the bell axis, the tips are free.
  for(let i=1;i<CHAIN;i++){const st=.22*(1-i/CHAIN)**2*soft,n=m.chain[i];n.x+=(m.x-ax*seg*i-n.x)*st;n.y+=(m.y-ay*seg*i-n.y)*st;}
 }
}
// Body-local displacement at distance d (bell radii) below the rim.
function chainLag(m,r){
 const c=m.chain;if(!c)return null;const sp=SPECIES[speciesKey],total=Math.max(sp.tentLen*2.05,sp.armLen*1.75,.4),seg=total/(CHAIN-1);
 const ca=Math.cos(m.ang),sa=Math.sin(m.ang),ax=sa,ay=-ca;
 const local=[];for(let i=0;i<CHAIN;i++){const dx=(c[i].x-(m.x-ax*seg*r*i))/r,dy=(c[i].y-(m.y-ay*seg*r*i))/r;local.push([dx*ca+dy*sa,-dx*sa+dy*ca]);}
 return d=>{const f=Math.max(0,Math.min(CHAIN-1.001,d/seg)),i=Math.floor(f),t=f-i,a=local[i],b=local[i+1];return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];};
}
function drawJelly(member){
 const sp=SPECIES[speciesKey];
 const mobile=w<700,count=population.members.length;
 const bornAge=Math.max(0,time-member.born);
 if(member.vx===undefined)swimStep(member,0);
 const radius=jellyRadius(member),mph=member.cyc??phase,breath=.6-1.6*(member.c??0);
 const view={cx:member.x,cy:member.y,radius,yaw:Math.sin(time*.11+member.seed)*.35+pointer*.13,pitch:-.29+Math.sin(time*.17+member.id)*.045,roll:member.ang+pointer*.04};
 const state={lag:chainLag(member,radius),stream:member.sq??0,phase:mph,breath,pulseAmp:sp.amp*.65,flex:sp.flex,wave:wave+member.id*.8,flow:visual.flow,pointer:pointer*.5,seed:member.seed,pulsePower:M.clamp(member.power??.5,.5,1.1),spread:1+soft.width*.16,ribbonWidth:audioSession?member.ribbon*(.72+soft.mid*.6):1,detail:audioSession?soft.treble:0,bellH:sp.bellH,scallop:sp.scallop,tentN:sp.tentN,tentLen:sp.tentLen,tentAmp:sp.tentAmp*(1.15-.55*(member.sq??0)),armN:sp.armN,armLen:sp.armLen,armW:sp.armW};
 around=a=>.5+.5*Math.sin(a+view.yaw*2);bodyWhite=audioSession?!!member.white:!!params.white;bodyA=audioSession?member.a??190:190;bodyB=audioSession?member.b??275:275;bodyAlpha=member.id===0?1:M.clamp((bornAge/7)**1.5,.04,1);
 // Newborns glow dimly and ease into the music over ~6s; beat flash scales with body size.
 const mature=member.id===0?1:1-Math.exp(-bornAge/5);const life=.6+.4*M.clamp((growth-.25)/.75);bodyLight=M.clamp((visual.light*(.25+.75*mature)+(audioSession?beatGlow*.09*member.size*mature+(soft.treble-.3)*sp.ear.glow*.18*mature:0))*life);
 const proj=p=>G.project(p,view),steps=count>3?48:72,rings=count>3?40:70,radials=count>3?48:80,strands=count>3?9:15;
 const tSteps=sp.tentN>60?Math.max(10,Math.round(steps*Math.min(1,sp.tentLen)*.5)):steps;
 for(let i=0;i<sp.tentN;i++){let pts=[];for(let k=0;k<=tSteps;k++)pts.push(proj(G.tentacle(k/tSteps,i,state)));stroke(pts,around(i*TAU/sp.tentN),.24+(i%4)*.065,i%7===0?.85:.5);}
 for(let i=0;i<sp.armN;i++){
  for(let strand=0;strand<strands;strand++){const edge=strand/(strands-1)*2-1;let pts=[];for(let k=0;k<=steps;k++)pts.push(proj(G.ribbon(k/steps,edge,i,state)));stroke(pts,around(i*TAU/sp.armN+member.seed*.13),.23+(.5+.5*Math.cos(strand*.7))*.14,.65);}
  for(let k=2;k<40;k+=3){let pts=[];for(let j=0;j<=12;j++)pts.push(proj(G.ribbon(k/40,j/6-1,i,state)));stroke(pts,around(i*TAU/sp.armN+member.seed*.13),.065,.5);}
 }
 for(let ring=1;ring<=rings;ring++){const v=ring/rings;let pts=[];for(let k=0;k<=100;k++)pts.push(proj(G.bell(v,k/100*TAU,state)));stroke(pts,loop,.17+.2*v+.09*Math.sin(v*35-wave),.65);}
 for(let j=0;j<radials;j++){const a=j/radials*TAU;let pts=[];for(let k=1;k<=steps;k++){const v=k/steps,p=G.bell(v,a,state);p[1]+=Math.sin(v*19-wave*1.7+a*6)*.014*Math.sin(v*Math.PI);pts.push(proj(p));}stroke(pts,along,.13+(j%13===0?.28:0),j%13===0?.9:.5);}
 for(let layer=0;layer<4;layer++){let pts=[];for(let k=0;k<=150;k++){const p=G.bell(1-layer*.007,k/150*TAU,state);p[1]+=layer*.008;pts.push(proj(p));}stroke(pts,loop,.32,layer===0?1.15:.7);}
 if(sp.organs)for(let organ=0;organ<4;organ++)for(let strand=0;strand<5;strand++){let pts=[];for(let k=0;k<=40;k++){const a=k/40*TAU,rr=(.09+strand*.009)*sp.organs,theta=organ*TAU/4+time*.06;pts.push(proj([Math.cos(theta)*.19*sp.organs+Math.cos(a)*rr,-sp.bellH*.31+Math.sin(a)*rr*.5,Math.sin(theta)*.19*sp.organs+Math.sin(a)*rr]));}stroke(pts,around(organ*TAU/4+time*.06),sp.organs>1?.16:.10,.65);}
 // Aequorea: bright radial canals; light organs on the rim (or warts on the bell) that light up with the treble.
 if(sp.canals)for(let j=0;j<sp.canals;j++){const a=j/sp.canals*TAU;let pts=[];for(let k=2;k<=24;k++)pts.push(proj(G.bell(k/24*.97,a,state)));stroke(pts,along,.2,.55);}
 if(sp.dots){const lit=.35+.65*(audioSession?soft.treble:.5);for(let k=0;k<sp.dots.n;k++){const hsh=Math.sin(k*91.7+member.seed)*43758.5,r=hsh-Math.floor(hsh),a=sp.dots.rim?k/sp.dots.n*TAU:r*TAU,v=sp.dots.rim?.985:.25+.7*((k*.618)%1),on=((k*.618034)%1)<lit;dot(proj(G.bell(v,a,state)),sp.dots.rim?around(a):r,on?.85+beatGlow*.3:.18,Math.max(.6,radius*(sp.dots.rim?.012:.009)));}}
}
function render(){
 // Pure black water for every species; only the drifting particles carry each habitat's character.
 ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);ink.clearRect(0,0,w,h);ink.globalCompositeOperation='lighter';
 const want=SPECIES[speciesKey].sea,k=1-Math.exp(-.016/1.2);for(const key of ['n','speed','size','alpha'])sea[key]+=(want[key]-sea[key])*k;for(let c=0;c<3;c++)sea.rgb[c]+=(want.rgb[c]-sea.rgb[c])*k;
 const rgb=sea.rgb.map(Math.round).join(','),count=Math.round(sea.n);
 for(let i=0;i<count;i++){const depth=(i%9)/9,x=((Math.sin(i*127.1)*.5+.5)*w+Math.sin(wave*.05+i)*visual.flow*25+w)%w,y=((Math.cos(i*91.7)*.5+.5)*h-time*(2+depth*7)*(visual.flow+.25)*sea.speed+h*100)%h;ctx.beginPath();ctx.arc(x,y,(i%19===0?2.5:depth*.9+.2)*sea.size,0,TAU);ctx.fillStyle=`rgba(${rgb},${(.025+depth*.13+sound.treble*.09)*sea.alpha})`;ctx.fill();}
 for(const member of population.members)drawJelly(member);
 ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=.85*visual.light;ctx.filter=`blur(${9*dpr}px)`;ctx.drawImage(organism,0,0,w,h);ctx.globalAlpha=.6*visual.light;ctx.filter=`blur(${2.8*dpr}px)`;ctx.drawImage(organism,0,0,w,h);ctx.filter='none';ctx.globalAlpha=1;ctx.drawImage(organism,0,0,w,h);ctx.restore();
 if(window.reelActive&&window.reelWatermark){ctx.save();ctx.textAlign='center';ctx.fillStyle='rgba(220,232,238,.55)';ctx.font='300 13px Inter,Helvetica Neue,sans-serif';ctx.fillText('M◈DUSA',w/2,h*.17);ctx.font='300 8px Inter,Helvetica Neue,sans-serif';ctx.fillStyle='rgba(160,180,195,.5)';ctx.fillText(SPECIES[speciesKey].latin+' · SONIC ORGANISM',w/2,h*.17+15);ctx.restore();}
 dirty=false;
}
function meters(){
 const secs=audioSession?A.elapsed:age;document.getElementById('age').textContent=String(Math.floor(secs/60)).padStart(2,'0')+':'+String(Math.floor(secs%60)).padStart(2,'0');
 document.getElementById('growth').textContent=growth.toFixed(3);document.getElementById('pulse').textContent=pulseRate.toFixed(2);document.getElementById('population').textContent=population.members.length;
 document.getElementById('state').textContent=audioSession?({playing:'音樂驅動',paused:'已暫停',ready:'音樂就緒',ended:'本曲結束',idle:'音訊已斷開',error:'等待音訊'})[A.status]||'準備音訊':paused?'已暫停':'自由演算';
 if(audioSession)for(const key of ['energy','flow','light']){document.getElementById(key).value=visual[key]*100;document.getElementById(key+'Val').textContent=Math.round(visual[key]*100)+'%';}
 window.updateMusicMeters?.(sound,population.members.length);
}
function frame(now){
 requestAnimationFrame(frame);if(document.hidden){last=null;return;}if(now-lastPaint<32)return;
 const dt=last===null?0:Math.min((now-last)/1000,.12);last=now;lastPaint=now;
 const running=audioSession?A.status==='playing':!paused;
 if(running){
  if(audioSession){sound=A.sample(dt);time=A.elapsed;age=Math.max(age,A.duration?A.elapsed/A.duration:1-Math.exp(-A.elapsed/180));growth=.25+.75*age;population.update(sound,dt,time);}
  else {sound=M.empty();time+=dt;age+=dt*(.25+params.energy*1.5);growth=.25+.75*(1-Math.exp(-age/85));}
  beatGlow=audioSession&&sound.beat?1:beatGlow*Math.exp(-dt*3.5);if(audioSession){visual.energy=.02+sound.energy*.3;visual.flow=.65+sound.flux*.2+sound.density*.15;visual.light=M.clamp(.2+sound.energy*.3+sound.treble*.25);visual.hue=M.smooth(visual.hue,30-sound.centroid*55,dt,1.5);}else visual={...params};
  {const fr=SPECIES[speciesKey].freq,dr=audioSession?soft.energy??sound.energy:params.energy;pulseRate=fr[0]+(fr[1]-fr[0])*M.clamp(dr);}
  phase+=dt*pulseRate*TAU;if(sound.beat){const target=3*Math.PI/2;const delta=Math.atan2(Math.sin(target-phase),Math.cos(target-phase));phase+=delta*.06;}
  for(const k of ['pan','centroid','mid','treble','width'])soft[k]=M.smooth(soft[k],sound[k],dt,.7);soft.bass=M.smooth(soft.bass,sound.bass,dt,.25);soft.energy=M.smooth(soft.energy??0,sound.energy,dt,1.5);
  for(const m of population.members)swimStep(m,dt);
  wave+=dt*(.8+visual.flow*1.4);travel+=dt*(.08+visual.energy*.14+visual.flow*.035)*(.6+.8*Math.max(0,-Math.cos(phase))+beatGlow*.4);
  pointer=M.smooth(pointer,targetPointer,dt,.4);groupScale=M.smooth(groupScale,1/Math.sqrt(1+(population.members.length-1)*.12),dt,3);render();
 }else if(dirty){if(!audioSession)visual={...params};render();}
 if(now-lastUI>120||dirty){meters();lastUI=now;}
}
syncControls();requestAnimationFrame(frame);
setSpecies(speciesKey);{const w0=SPECIES[speciesKey].sea;Object.assign(sea,w0,{rgb:[...w0.rgb]});}document.getElementById('species').onchange=e=>setSpecies(e.target.value);
