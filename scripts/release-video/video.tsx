import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import type { ProductionManifest } from '../../packages/contracts/src/production-manifest.js';
import type { Timeline } from '../../packages/timeline/src/timeline.js';

export type ShowcaseProps = { manifest: ProductionManifest; timeline: Timeline };
const C = {paper:'#fff6df', ink:'#173d3b', teal:'#237e70', mint:'#a4ddc5', coral:'#fc9c87', pink:'#edbbda', yellow:'#f6cc53'};
const font = '"Avenir Next", "Trebuchet MS", sans-serif';
const clamp = (x:number) => Math.max(0,Math.min(1,x));

function Star({x,y,size=34,rotate=0,color=C.yellow}:{x:number;y:number;size?:number;rotate?:number;color?:string}) {
  return <svg style={{position:'absolute',left:x,top:y,transform:`rotate(${rotate}deg)`}} width={size} height={size} viewBox="0 0 100 100"><path d="M50 3 62 34 96 27 74 53 93 82 60 73 46 99 38 67 5 62 32 45 24 14 48 32Z" fill={color} stroke={C.ink} strokeWidth="5" strokeLinejoin="round"/></svg>;
}

export function Doc({size=280,frame=0,mood='happy',color=C.paper}:{size?:number;frame?:number;mood?:string;color?:string}) {
  const bounce=Math.sin(frame/12)*5;
  const blink=frame%109>103;
  return <svg width={size} height={size*1.18} viewBox="0 0 260 310" style={{overflow:'visible',transform:`translateY(${bounce}px) rotate(${Math.sin(frame/28)*2}deg)`}}>
    <ellipse cx="134" cy="291" rx="84" ry="10" fill={C.ink} opacity=".10"/>
    <g stroke={C.ink} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M87 247 81 278 61 280M175 247 183 278 203 280" fill="none"/>
      <path d="M43 144Q10 152 14 189M216 144Q247 129 244 102" fill="none"/>
      <path d="M47 24Q47 15 58 16L176 16 217 59 217 235Q217 249 202 249L59 249Q43 249 43 235Z" fill={color}/>
      <path d="M176 17V58H216" fill={C.yellow}/>
      <path d="M71 82H163M71 101H145" strokeWidth="6" opacity=".4"/>
      {blink?<path d="M82 145H104M151 145H173"/>:<><ellipse cx="93" cy="145" rx="8" ry={mood==='sleepy'?3:13} fill={C.ink}/><ellipse cx="162" cy="145" rx="8" ry={mood==='sleepy'?3:13} fill={C.ink}/></>}
      <path d={mood==='sleepy'?'M116 183H141':'M112 175Q128 196 145 175'} fill="none" strokeWidth="6"/>
      <circle cx="73" cy="171" r="11" fill={C.coral} stroke="none"/><circle cx="183" cy="171" r="11" fill={C.coral} stroke="none"/>
      <path d="m234 101 11 1 9-14M14 188l-7 8m7-8 9 10" fill="none" strokeWidth="5"/>
    </g>
  </svg>;
}

function Speaker({frame}:{frame:number}) {
  return <svg width="150" height="166" viewBox="0 0 150 166" style={{transform:`rotate(${Math.sin(frame/10)*4}deg)`}}><g stroke={C.ink} strokeWidth="5" strokeLinejoin="round"><rect x="18" y="15" width="113" height="129" rx="25" fill={C.pink}/><circle cx="75" cy="94" r="33" fill={C.ink}/><circle cx="75" cy="94" r={13+Math.sin(frame/4)*2} fill={C.coral}/><circle cx="54" cy="43" r="5" fill={C.ink}/><circle cx="95" cy="43" r="5" fill={C.ink}/><path d="M41 145v12m68-12v12" strokeLinecap="round"/></g></svg>;
}
function Film({frame}:{frame:number}) {
  return <svg width="165" height="160" viewBox="0 0 165 160" style={{transform:`rotate(${Math.sin(frame/13)*3}deg)`}}><g stroke={C.ink} strokeWidth="5" strokeLinejoin="round"><rect x="8" y="41" width="145" height="105" rx="17" fill={C.teal}/><rect x="8" y="25" width="145" height="31" rx="8" fill={C.paper} transform={`rotate(${-5-Math.max(0,Math.sin(frame/18))*7} 10 52)`}/><path d="m30 25-16 27m59-27L57 52m59-27-16 27m53-27-16 27"/><path d="m65 77 34 20-34 21Z" fill={C.yellow}/></g></svg>;
}
function Pill({children,color=C.yellow,rotate=-2}:{children:React.ReactNode;color?:string;rotate?:number}) {
  return <span style={{display:'inline-block',background:color,border:`3px solid ${C.ink}`,borderRadius:40,padding:'9px 22px',fontWeight:800,fontSize:20,transform:`rotate(${rotate}deg)`,boxShadow:`4px 4px 0 ${C.ink}`}}>{children}</span>;
}
function Terminal({lines,title='your terminal, now with ambition',width=714}:{lines:string[];title?:string;width?:number}) {
  return <div style={{width,background:C.ink,color:C.paper,border:`4px solid ${C.ink}`,borderRadius:22,boxShadow:`10px 10px 0 ${C.coral}`,overflow:'hidden'}}><div style={{display:'flex',alignItems:'center',gap:9,padding:'16px 20px',borderBottom:'1px solid #ffffff35'}}>{[C.coral,C.yellow,C.mint].map(c=><i key={c} style={{height:12,width:12,borderRadius:'50%',background:c}}/>)}<span style={{marginLeft:12,fontSize:15,opacity:.8,fontFamily:font}}>{title}</span></div><pre style={{fontSize:18,lineHeight:1.65,padding:'22px 26px 26px',margin:0,fontFamily:'Menlo, monospace',whiteSpace:'pre-wrap'}}>{lines.map((line,i)=><div key={i} style={{color:line.startsWith('#')?'#a4ddc5':C.paper}}>{line||' '}</div>)}</pre></div>;
}
const headlines=[<>Your docs.<br/>With a pulse.</>,<>A tiny<br/>explanation factory.</>,<>Give it a desk<br/>to dance on.</>,<>Training wheels.<br/>Movie reels.</>,<>Your ideas get<br/>a speaking part.</>,<>The goodie bag<br/>has receipts.</>,<>Your agent can hold<br/>the clapperboard.</>,<>Less wall of text.<br/><span style={{color:C.teal}}>More aha!</span></>];
const labels=['MEET EXPLAIN-TO-ME','THE RECIPE','GET SET UP','YOUR FIRST VIDEO','YOUR OWN DOCUMENT','REVIEW & REVISE','THE ROBOT ROUTE','GO MAKE SOMETHING CLICK'];

export function Showcase({manifest,timeline}:ShowcaseProps) {
  const frame=useCurrentFrame();
  const {fps}=useVideoConfig();
  const ms=frame/fps*1000;
  const index=Math.max(0,timeline.scenes.findIndex(s=>frame>=s.from && frame<s.from+s.durationInFrames));
  const scene=timeline.scenes[index]!;
  const f=frame-scene.from;
  const enter=spring({frame:f,fps,config:{damping:18,stiffness:150}});
  const exit=interpolate(f,[scene.durationInFrames-6,scene.durationInFrames],[1,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
  const caption=timeline.chunks.find(c=>ms>=c.startMs && ms<c.endMs)?.text;
  const smallTitle=index===1||index===6;
  return <AbsoluteFill style={{background:C.paper,color:C.ink,fontFamily:font,overflow:'hidden'}}>
    <AbsoluteFill style={{backgroundImage:'radial-gradient(#173d3b18 1.4px, transparent 1.4px)',backgroundSize:'24px 24px'}}/>
    <div style={{position:'absolute',width:600,height:600,borderRadius:'50%',background:index%2?C.pink:C.mint,opacity:.28,right:-190,top:-280}}/>
    <div style={{position:'absolute',left:48,right:48,top:30,display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:17,fontWeight:800,letterSpacing:1.3}}><span>explain<span style={{color:C.teal}}>→</span>to<span style={{color:C.teal}}>→</span>me</span><span style={{fontSize:14}}>THE OPEN SOURCE HELLO · v0.2.0</span></div>
    <div style={{position:'absolute',left:48,right:48,top:76,height:3,background:C.ink,opacity:.15}}/>
    <div style={{opacity:exit,transform:`translateY(${(1-enter)*30}px)`,position:'absolute',inset:0}}>
      <div style={{position:'absolute',top:108,left:66,fontSize:16,fontWeight:900,letterSpacing:2,color:C.teal}}>{String(index+1).padStart(2,'0')} / {labels[index]}</div>
      <div style={{position:'absolute',top:145,left:62,fontSize:smallTitle?57:66,lineHeight:1.05,fontWeight:900,letterSpacing:-2.8}}>{headlines[index]}</div>
      {index===0&&<>
        <div style={{position:'absolute',left:68,top:330,fontSize:28,lineHeight:1.4,width:650}}>Turn local documents into narrated,<br/>captioned explainer videos.</div>
        <div style={{position:'absolute',left:70,top:440}}><Pill>tiny movie studio. sensible shoes.</Pill></div>
        <div style={{position:'absolute',left:864,top:175}}><Doc size={290} frame={frame} mood={f<70?'sleepy':'happy'}/></div>
        <Star x={1090} y={145} rotate={frame/3}/><Star x={810} y={425} size={48} color={C.coral}/>
      </>}
      {index===1&&<>
        <div style={{position:'absolute',top:335,left:73,right:73,display:'flex',justifyContent:'space-between'}}>{['your words','reviewed plan','local voice','movie + captions'].map((label,i)=><div key={label} style={{position:'relative',textAlign:'center',width:230,opacity:clamp(f/15-i*.4),transform:`translateY(${Math.sin(f/20+i)*4}px)`}}><div style={{height:155,display:'flex',justifyContent:'center',alignItems:'center'}}>{i===0?<Doc size={124} frame={f}/>:i===1?<div style={{width:139,height:136,background:C.yellow,border:`5px solid ${C.ink}`,borderRadius:19,transform:'rotate(-4deg)',fontSize:75,fontWeight:900,lineHeight:'136px'}}>{'{ }'}</div>:i===2?<Speaker frame={f}/>:<Film frame={f}/>}</div><div style={{fontSize:23,fontWeight:800,marginTop:22}}>{label}</div>{i<3&&<span style={{position:'absolute',right:-35,top:62,fontSize:36}}>→</span>}</div>)}</div>
      </>}
      {index===2&&<>
        <div style={{position:'absolute',left:67,top:320,display:'flex',gap:14}}><Pill color={C.mint}>macOS</Pill><Pill color={C.yellow}>Node 24+</Pill><Pill color={C.pink}>FFmpeg + Git</Pill></div>
        <div style={{position:'absolute',left:70,top:415,fontSize:28,lineHeight:1.5}}>Clone → install → browser → doctor<br/><span style={{fontSize:23,color:C.teal}}>Exact commands in the README.</span></div>
        <div style={{position:'absolute',left:826,top:125}}><Doc size={250} frame={f}/></div><div style={{position:'absolute',left:886,top:475}}><Pill color={C.coral}>tools? check.</Pill></div>
      </>}
      {index===3&&<>
        <div style={{position:'absolute',left:69,top:313}}><Terminal width={780} title="from the repo root · pinned pnpm installed" lines={['pnpm explain-to-me build \\', '  --manifest fixtures/golden-manifests/whisper-vs-tts.json \\', '  --tts apple --voice Samantha \\', '  --duration 60s --output out/first-movie']}/></div>
        <div style={{position:'absolute',left:882,top:248}}><Film frame={f}/></div><div style={{position:'absolute',left:857,top:455,fontSize:25,fontWeight:800,width:260,lineHeight:1.35}}>No extra LLM.<br/>Just press build.</div>
      </>}
      {index===4&&<>
        <div style={{position:'absolute',left:69,top:319}}><Terminal lines={['pnpm explain-to-me build my-idea.md \\', '  --director template --tts apple \\', '  --duration 60s --output out/my-idea', '', '# Optional: local director + Kokoro']} /></div>
        <div style={{position:'absolute',left:896,top:230}}><Doc size={210} frame={f} color={C.mint}/></div><div style={{position:'absolute',left:848,top:487}}><Pill color={C.pink}>your words, on stage</Pill></div>
      </>}
      {index===5&&<>
        <div style={{position:'absolute',left:68,top:327,display:'flex',flexDirection:'column',gap:13}}>{['video.mp4 + audio.wav','captions.vtt + captions.srt','manifest.json + report.json'].map((x,i)=><div key={x} style={{background:[C.mint,C.yellow,C.pink][i],border:`3px solid ${C.ink}`,borderRadius:16,width:610,padding:'14px 23px',fontFamily:'Menlo, monospace',fontSize:23,boxShadow:`5px 5px 0 ${C.ink}`,transform:`rotate(${i%2?-1:1}deg)`}}>{x}</div>)}</div>
        <div style={{position:'absolute',left:861,top:200}}><Doc size={230} frame={f}/></div><div style={{position:'absolute',left:862,top:495,fontSize:23,fontWeight:900}}>Watch. Listen. Review.</div>
      </>}
      {index===6&&<>
        <div style={{position:'absolute',left:70,top:315,fontSize:28,lineHeight:1.5}}>Copy the README installer prompt.<br/>Paste it into your coding agent.<br/>Keep stories in a private workspace.</div>
        <div style={{position:'absolute',left:72,top:475}}><Pill color={C.mint}>you get final cut.</Pill></div>
        <div style={{position:'absolute',left:902,top:195,transform:`translateY(${Math.sin(f/16)*5}px)`}}><svg width="245" height="265" viewBox="0 0 245 265"><g stroke={C.ink} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"><path d="M123 46V17"/><circle cx="123" cy="15" r="10" fill={C.coral}/><rect x="28" y="48" width="190" height="145" rx="36" fill={C.mint}/><rect x="51" y="80" width="143" height="67" rx="21" fill={C.ink}/><circle cx="87" cy="112" r="10" fill={C.yellow}/><circle cx="158" cy="112" r="10" fill={C.yellow}/><path d="M102 169h41M69 194l-7 40m109-40 7 40M28 130 7 146m211-16 20-21"/><path d="M38 236h56v18H38zm118 0h55v18h-55z" fill={C.coral}/></g></svg></div>
      </>}
      {index===7&&<>
        <div style={{position:'absolute',left:69,top:327,fontSize:28,lineHeight:1.5}}>Grab the code. Make something click.</div>
        <div style={{position:'absolute',left:70,top:399}}><Pill color={C.yellow}>github.com/TommyAllsup/explain-to-me</Pill></div>
        <div style={{position:'absolute',left:72,top:488,fontSize:18,color:C.teal,width:690,lineHeight:1.4}}>v0.2 core: technical whiteboard · 720p / 24 fps<br/>Cartoons + music: custom release showcase<br/>Music: “Business As Usual” · Tommy Allsup</div>
        <div style={{position:'absolute',left:909,top:181}}><Doc size={245} frame={f} color={C.yellow}/></div>
        {Array.from({length:12},(_,i)=><Star key={i} x={780+(i*73)%450} y={100+(i*67)%415} size={18+i%3*7} rotate={f+i*27} color={[C.yellow,C.pink,C.coral][i%3]!}/>)}
      </>}
    </div>
    <div style={{position:'absolute',left:56,right:56,bottom:48,minHeight:65,borderRadius:17,background:C.ink,color:C.paper,padding:'15px 25px',fontSize:24,fontWeight:600,lineHeight:1.32,textAlign:'center',boxSizing:'border-box'}}>{caption}</div>
    <div style={{position:'absolute',left:56,bottom:20,right:56,display:'flex',gap:6}}>{timeline.scenes.map((s,i)=><div key={s.sceneId} style={{height:5,flex:1,borderRadius:9,background:i<index?C.teal:i===index?C.coral:'#173d3b25'}}/>)}</div>
  </AbsoluteFill>;
}
