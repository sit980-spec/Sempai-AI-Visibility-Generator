import { useState, useRef, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Cell,
} from "recharts";

const S = {
  navy1:"#0a1628", navy2:"#0e2040", navy3:"#132645", navy4:"#1d3a60",
  green:"#2edf8f", greenD:"#1fb872",
  coral:"#ff6b78", gold:"#f5c842", sky:"#5bb8ff", purple:"#b39dfa",
  text:"#edf3ff", muted:"#7aa0bc", mutedL:"#9dbad0",
  border:"#1e3d66", borderL:"#264d80",
};

const PLATFORMS = [
  { id:"ai_overview", name:"AI Overview",  short:"AI Ov.",    color:S.sky,     icon:"G" },
  { id:"ai_mode",     name:"AI Mode",       short:"AI Mode",   color:"#34d399", icon:"M" },
  { id:"chatgpt",     name:"ChatGPT",        short:"ChatGPT",   color:S.green,   icon:"⚡" },
  { id:"gemini",      name:"Gemini",          short:"Gemini",    color:S.coral,   icon:"◆" },
  { id:"perplexity",  name:"Perplexity",      short:"Perplx.",   color:S.purple,  icon:"◈" },
  { id:"copilot",     name:"Copilot",          short:"Copilot",   color:S.gold,    icon:"✦" },
];

/* ── Encoding ──────────────────────────────────────────────────────────────── */
function decodeBuffer(buffer) {
  const bytes = new Uint8Array(buffer);
  if ((bytes[0]===0xFF&&bytes[1]===0xFE)||(bytes[0]===0xFE&&bytes[1]===0xFF))
    return new TextDecoder("utf-16").decode(buffer);
  if (bytes[0]===0xEF&&bytes[1]===0xBB&&bytes[2]===0xBF)
    return new TextDecoder("utf-8").decode(buffer).replace(/^\uFEFF/,"");
  return new TextDecoder("utf-8").decode(buffer);
}

/* ── TSV/CSV parser ────────────────────────────────────────────────────────── */
function parseDelimited(text) {
  const firstLine = text.split("\n")[0];
  const sep = firstLine.includes("\t") ? "\t" : ",";
  const rows=[], row=[], cell="";
  let r=[], c="", inQ=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i], nx=text[i+1];
    if(ch==='"'){
      if(inQ&&nx==='"'){c+='"';i++;}
      else inQ=!inQ;
    } else if(ch===sep&&!inQ){
      r.push(c.trim()); c="";
    } else if((ch==="\n"||(ch==="\r"&&nx==="\n"))&&!inQ){
      if(ch==="\r")i++;
      r.push(c.trim()); c="";
      if(r.some(x=>x)) rows.push(r);
      r=[];
    } else { c+=ch; }
  }
  if(c||r.length){r.push(c.trim());if(r.some(x=>x))rows.push(r);}
  return rows;
}

/* ── Platform detection ────────────────────────────────────────────────────── */
function detectPlatform(headers, rows) {
  const hLower = headers.map(h=>h.toLowerCase());
  // Direct header match
  if(headers.some(h=>h==="AI Overview")) return "ai_overview";
  if(hLower.some(h=>h.includes("ai overview"))) return "ai_overview";
  if(headers.some(h=>h==="AI Mode")) return "ai_mode";
  if(hLower.some(h=>h==="ai mode"||h.includes("ai_mode"))) return "ai_mode";

  const mi = headers.findIndex(h=>h==="Model");
  if(mi>=0){
    const models=[...new Set(rows.map(r=>(r[mi]||"").toLowerCase()).filter(Boolean))];
    const ms=models.join(" ");
    if(ms.includes("ai mode")||ms.includes("google ai mode")) return "ai_mode";
    if(ms.includes("chatgpt")||ms.includes("gpt")) return "chatgpt";
    if(ms.includes("gemini")) return "gemini";
    if(ms.includes("perplexity")) return "perplexity";
    if(ms.includes("copilot")) return "copilot";
    // If Fanout Queries present but no recognized model → likely AI Mode
    if(headers.some(h=>h==="Fanout Queries")&&ms==="") return "ai_mode";
  }
  if(hLower.some(h=>h==="copilot")) return "copilot";
  if(hLower.some(h=>h==="chatgpt")) return "chatgpt";
  if(hLower.some(h=>h==="gemini")) return "gemini";
  if(hLower.some(h=>h==="perplexity")) return "perplexity";
  return null;
}

/* ── Brand variants ────────────────────────────────────────────────────────── */
function generateBrandVariants(input){
  if(!input) return [];
  const raw=input.toLowerCase().trim();
  const variants=new Set();
  variants.add(raw);
  const noExt=raw.replace(/\.(pl|com|eu|net|org|io|co|de|fr|uk|shop|store|online)$/,"");
  if(noExt!==raw) variants.add(noExt);
  if(noExt.includes("-")){
    variants.add(noExt.replace(/-/g,""));
    noExt.split("-").forEach(s=>s.length>2&&variants.add(s));
  }
  if(noExt.includes(" ")){
    variants.add(noExt.replace(/ /g,""));
    variants.add(noExt.replace(/ /g,"-"));
    noExt.split(" ").forEach(s=>s.length>2&&variants.add(s));
  }
  const stop=new Set(["sklep","shop","store","online","pl","com","net","eu","the","and"]);
  return [...variants].filter(v=>v.length>1&&!stop.has(v));
}

/* ── Parse buffer ──────────────────────────────────────────────────────────── */
function parseAhrefsBuffer(buffer, brandKey, brandVariants, filename){
  const text=decodeBuffer(buffer);
  const all=parseDelimited(text);
  if(all.length<2) return null;
  const headers=all[0].map(h=>h.replace(/^"|"$/g,"").trim());
  const rows=all.slice(1);
  let pid=detectPlatform(headers,rows);
  if(!pid&&filename){
    const fn=filename.toLowerCase();
    if(fn.includes("ai_mode")||fn.includes("ai-mode")||fn.includes("aimode")) pid="ai_mode";
    else if(fn.includes("ai_overview")||fn.includes("overview")) pid="ai_overview";
    else if(fn.includes("chatgpt")||fn.includes("chat_gpt")) pid="chatgpt";
    else if(fn.includes("gemini")) pid="gemini";
    else if(fn.includes("perplexity")) pid="perplexity";
    else if(fn.includes("copilot")) pid="copilot";
  }
  const mentionsIdx=headers.findIndex(h=>h==="Mentions");
  const linkIdx=headers.findIndex(h=>h==="Link URL");
  const kwIdx=headers.findIndex(h=>h==="Keyword");
  const volIdx=headers.findIndex(h=>h==="Volume");
  if(mentionsIdx<0) return null;
  const bk=brandKey.toLowerCase().trim();
  const variants=brandVariants?.length>0?brandVariants.map(v=>v.toLowerCase()):[bk];
  const parsed=rows.map(r=>{
    const mentionsRaw=(r[mentionsIdx]||"").toLowerCase();
    const linkRaw=(r[linkIdx]||"").toLowerCase();
    const keyword=r[kwIdx]||"";
    const volume=parseInt(r[volIdx]||"0")||0;
    const matchedVariant=variants.find(v=>v&&mentionsRaw.includes(v))||null;
    const mentioned=!!matchedVariant;
    const domainKey=bk.includes(".")?bk:bk+".";
    const cited=linkRaw.includes(bk)||linkRaw.includes(domainKey);
    const otherMentions=mentionsRaw.split(/[,\n]+/).map(m=>m.trim()).filter(m=>m&&!variants.some(v=>m.includes(v)));
    return{keyword,volume,mentioned,cited,otherMentions,matchedVariant};
  }).filter(r=>r.keyword);
  const variantHits={};
  parsed.forEach(r=>{if(r.matchedVariant) variantHits[r.matchedVariant]=(variantHits[r.matchedVariant]||0)+1;});
  return{platformId:pid,rows:parsed,headers,variantHits};
}

/* ── Aggregate (merges existing + new rows) ────────────────────────────────── */
function aggregatePlatform(rows, variantHits, existing){
  const allRows = existing ? [...(existing._rows||[]), ...rows] : rows;
  const allVH = {...(existing?.variantHits||{})};
  Object.entries(variantHits||{}).forEach(([v,c])=>{ allVH[v]=(allVH[v]||0)+c; });
  const total=allRows.length;
  const mentions=allRows.filter(r=>r.mentioned).length;
  const citations=allRows.filter(r=>r.cited).length;
  const compSet={};
  allRows.forEach(r=>r.otherMentions.forEach(c=>{compSet[c]=(compSet[c]||0)+1;}));
  const topBrand=allRows.filter(r=>r.mentioned).sort((a,b)=>(b.volume||0)-(a.volume||0)).slice(0,10).map(r=>({kw:r.keyword,vol:r.volume||0}));
  const topGap=allRows.filter(r=>!r.mentioned&&r.otherMentions.length>0).sort((a,b)=>(b.volume||0)-(a.volume||0)).slice(0,10).map(r=>({kw:r.keyword,vol:r.volume||0,comps:r.otherMentions.slice(0,2)}));
  return{total,mentions,citations,compSet,variantHits:allVH,topBrand,topGap,_rows:allRows};
}

/* ── Particles ─────────────────────────────────────────────────────────────── */
function ParticleBg(){
  const ref=useRef(null);
  useEffect(()=>{
    const canvas=ref.current; if(!canvas) return;
    const ctx=canvas.getContext("2d"); let raf;
    canvas.width=canvas.offsetWidth; canvas.height=canvas.offsetHeight;
    const W=canvas.width,H=canvas.height;
    const pts=Array.from({length:35},()=>({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.2,vy:(Math.random()-.5)*.2,r:Math.random()*1+.3,a:Math.random()*.3+.1}));
    function draw(){
      ctx.clearRect(0,0,W,H);
      pts.forEach(p=>{
        p.x+=p.vx; p.y+=p.vy;
        if(p.x<0)p.x=W; if(p.x>W)p.x=0; if(p.y<0)p.y=H; if(p.y>H)p.y=0;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle="rgba(46,223,143,"+(p.a*.15)+")"; ctx.fill();
      });
      for(let i=0;i<pts.length;i++) for(let j=i+1;j<pts.length;j++){
        const d=Math.hypot(pts[i].x-pts[j].x,pts[i].y-pts[j].y);
        if(d<90){
          ctx.beginPath(); ctx.moveTo(pts[i].x,pts[i].y); ctx.lineTo(pts[j].x,pts[j].y);
          ctx.strokeStyle="rgba(46,223,143,"+((1-d/90)*.04)+")"; ctx.lineWidth=1; ctx.stroke();
        }
      }
      raf=requestAnimationFrame(draw);
    }
    draw(); return()=>cancelAnimationFrame(raf);
  },[]);
  return <canvas ref={ref} style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}}/>;
}

/* ── Signal Scanner ────────────────────────────────────────────────────────── */
function SignalScanner({proc}){
  const ref=useRef(null);
  useEffect(()=>{
    const canvas=ref.current; if(!canvas) return;
    const ctx=canvas.getContext("2d"); let frame=0,raf;
    const W=canvas.offsetWidth||800;
    canvas.width=W; canvas.height=90;
    const gap=W/PLATFORMS.length;
    const nodes=PLATFORMS.map((p,i)=>({
      x:gap*i+gap/2, y:44, color:p.color, label:p.short,
      score:proc[p.id]?.total>0?Math.round((proc[p.id].mentions/proc[p.id].total)*100):0,
      has:proc[p.id]?.total>0,
    }));
    function draw(){
      ctx.clearRect(0,0,W,90); frame++;
      for(let i=0;i<nodes.length-1;i++){
        const a=nodes[i],b=nodes[i+1];
        ctx.beginPath(); ctx.moveTo(a.x+18,a.y); ctx.lineTo(b.x-18,b.y);
        ctx.strokeStyle="#264d8044"; ctx.lineWidth=1; ctx.stroke();
        const t=(frame*.016+i*.2)%1;
        const px=(a.x+18)+((b.x-18)-(a.x+18))*t;
        ctx.beginPath(); ctx.arc(px,a.y,2.5,0,Math.PI*2);
        ctx.fillStyle=(a.has?S.green:"#264d80")+"cc"; ctx.fill();
      }
      nodes.forEach(n=>{
        const pulse=(frame*.022)%1;
        ctx.beginPath(); ctx.arc(n.x,n.y,16+pulse*14,0,Math.PI*2);
        ctx.strokeStyle=n.color+Math.floor((1-pulse)*60).toString(16).padStart(2,"0");
        ctx.lineWidth=1.5; ctx.stroke();
        const g=ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,16);
        g.addColorStop(0,n.color+(n.has?"30":"0a")); g.addColorStop(1,n.color+"04");
        ctx.beginPath(); ctx.arc(n.x,n.y,16,0,Math.PI*2);
        ctx.fillStyle=g; ctx.fill();
        ctx.strokeStyle=n.color+(n.has?"99":"2a"); ctx.lineWidth=2; ctx.stroke();
        ctx.fillStyle=n.has?n.color:S.mutedL;
        ctx.font="bold 11px monospace"; ctx.textAlign="center";
        ctx.fillText(n.score+"%",n.x,n.y+4);
        ctx.fillStyle=S.mutedL; ctx.font="9px monospace";
        ctx.fillText(n.label,n.x,n.y+25);
      });
      raf=requestAnimationFrame(draw);
    }
    draw(); return()=>cancelAnimationFrame(raf);
  },[proc]);
  return <canvas ref={ref} width={800} height={90} style={{width:"100%",display:"block"}}/>;
}

/* ── Drop Zone ─────────────────────────────────────────────────────────────── */
function DropZone({onFiles}){
  const [drag,setDrag]=useState(false);
  const ref=useRef();
  const go=files=>Array.from(files).forEach(file=>{const r=new FileReader();r.onload=e=>onFiles(file.name,e.target.result);r.readAsArrayBuffer(file);});
  return(
    <div onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)}
      onDrop={e=>{e.preventDefault();setDrag(false);go(e.dataTransfer.files);}} onClick={()=>ref.current.click()}
      style={{border:"2px dashed "+(drag?S.green:S.borderL),borderRadius:14,padding:"32px 24px",cursor:"pointer",textAlign:"center",background:drag?S.green+"0a":"transparent",transition:"all .2s"}}>
      <input ref={ref} type="file" accept=".csv" multiple style={{display:"none"}} onChange={e=>go(e.target.files)}/>
      <div style={{fontSize:32,marginBottom:8}}>📂</div>
      <div style={{fontSize:15,fontWeight:700,color:S.text,marginBottom:5}}>Upuść pliki CSV z Ahrefs lub kliknij</div>
      <div style={{fontSize:12,color:S.mutedL}}>UTF-8 i UTF-16 · AI Overview, AI Mode, ChatGPT, Gemini, Perplexity, Copilot — auto-detekcja</div>
    </div>
  );
}

const Tip=({active,payload,label})=>{
  if(!active||!payload?.length) return null;
  return(
    <div style={{background:S.navy3,border:"1px solid "+S.borderL,borderRadius:8,padding:"10px 14px"}}>
      <div style={{fontSize:10,color:S.muted,marginBottom:5}}>{label}</div>
      {payload.map((p,i)=><div key={i} style={{fontSize:12,color:p.color,fontWeight:700}}>{p.name}: {p.value}</div>)}
    </div>
  );
};

/* ── Report builder ────────────────────────────────────────────────────────── */
function buildReport(args){
  const{brand,proc,totalQ,totalM,totalC,visM,visC,avgSOV,allComps,compCounts,best,worst,editableComment,topBrandKws,topGapKws}=args;
  const date=new Date().toLocaleDateString("pl-PL",{year:"numeric",month:"long",day:"numeric"});
  const rows=PLATFORMS.map(p=>{
    const d=proc[p.id];
    const allM=d.mentions+allComps.reduce((s,c)=>s+(d.compSet[c]||0),0);
    const sovR=allM>0?(d.mentions/allM)*100:0;
    const sov=sovR<1&&sovR>0?Math.round(sovR*10)/10:Math.round(sovR);
    const mRr=d.total>0?(d.mentions/d.total)*100:0;
    const mR=mRr<1&&mRr>0?Math.round(mRr*10)/10:Math.round(mRr);
    const cRr=d.total>0?(d.citations/d.total)*100:0;
    const cR=cRr<1&&cRr>0?Math.round(cRr*10)/10:Math.round(cRr);
    return{...p,...d,sov,mR,cR};
  });
  const compRows=allComps.slice(0,8).map(c=>({name:c,mentions:PLATFORMS.reduce((s,p)=>s+(proc[p.id].compSet[c]||0),0)}));
  const css=[
    "@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800;900&display=swap');",
    "*{margin:0;padding:0;box-sizing:border-box}",
    "body{font-family:'DM Sans',sans-serif;background:#fff;color:#1a2a3a;font-size:14px;line-height:1.6}",
    ".page{max-width:960px;margin:0 auto;padding:52px 44px}",
    ".header{border-bottom:3px solid #2edf8f;padding-bottom:28px;margin-bottom:36px}",
    ".logo{display:flex;align-items:center;gap:10px;margin-bottom:18px}",
    ".s{width:38px;height:38px;background:#0e2040;border-radius:9px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:19px;color:#2edf8f;border:1.5px solid #2edf8f55;flex-shrink:0}",
    ".bn{font-size:19px;font-weight:800;color:#07111f}",
    ".badge{font-size:10px;font-weight:700;color:#2edf8f;background:#2edf8f15;border:1px solid #2edf8f44;border-radius:4px;padding:2px 8px;letter-spacing:1px;text-transform:uppercase}",
    "h1{font-size:28px;font-weight:900;color:#07111f;letter-spacing:-.5px;margin-bottom:8px}",
    ".meta{color:#4a7090;font-size:13px} .meta strong{color:#1a2a3a}",
    ".kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:36px}",
    ".kpi{background:#f8faff;border:1px solid #dde8f5;border-radius:12px;padding:20px 16px;border-top:3px solid}",
    ".kl{font-size:9px;text-transform:uppercase;letter-spacing:1px;font-weight:700;color:#4a7090;margin-bottom:8px}",
    ".kv{font-size:30px;font-weight:900;line-height:1;margin-bottom:4px}",
    ".ks{font-size:10px;color:#8899aa}",
    ".pb-wrap{margin-top:10px;height:4px;background:#e0eaf5;border-radius:2px;overflow:hidden}",
    ".pb{height:100%;border-radius:2px}",
    "section{margin-bottom:40px}",
    "h2{font-size:17px;font-weight:800;color:#07111f;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid #eef2f8;display:flex;align-items:center;gap:10px}",
    ".num{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;background:#2edf8f18;border-radius:6px;color:#2edf8f;font-size:12px;font-weight:900;flex-shrink:0}",
    "table{width:100%;border-collapse:collapse;font-size:13px}",
    "thead tr{background:#f2f7ff}",
    "th{padding:11px 13px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.8px;font-weight:700;color:#4a7090;border-bottom:2px solid #dde8f5}",
    "td{padding:11px 13px;border-bottom:1px solid #f0f5fb;vertical-align:middle}",
    "tr:last-child td{border-bottom:none} tr:hover td{background:#f8fbff}",
    ".tag{display:inline-block;padding:2px 9px;border-radius:5px;font-size:11px;font-weight:700}",
    ".bar-row{display:flex;align-items:center;gap:9px}",
    ".bar-bg{height:7px;width:64px;background:#e0eaf5;border-radius:3px;overflow:hidden;flex-shrink:0}",
    ".bar-fg{height:100%;border-radius:3px}",
    ".green{color:#1db872} .mid{color:#d4a017} .red{color:#e03050}",
    ".ig{display:grid;grid-template-columns:1fr 1fr;gap:12px}",
    ".ins{padding:14px 16px;border-radius:10px;border:1px solid;display:flex;gap:11px}",
    ".ii{font-size:15px;font-weight:900;flex-shrink:0;line-height:1.4}",
    ".it{font-size:12px;line-height:1.6;color:#3a5570}",
    ".comment-box{background:#f8faff;border:1px solid #dde8f5;border-left:4px solid #2edf8f;border-radius:8px;padding:22px 24px;margin-bottom:20px}",
    ".comment-box p{margin-bottom:12px;color:#2a3a4a;line-height:1.75}",
    ".comment-box p:last-child{margin-bottom:0}",
    ".comment-title{font-size:13px;font-weight:800;color:#07111f;margin-bottom:14px;text-transform:uppercase;letter-spacing:.5px}",
    ".footer{margin-top:52px;padding-top:22px;border-top:1px solid #e8f0f5;display:flex;justify-content:space-between;align-items:center}",
    "@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}@page{margin:1.5cm}}",
  ].join("\n");

  const rowsHtml=rows.map(r=>[
    "<tr>",
    '<td><span class="tag" style="background:'+r.color+'18;color:'+r.color+'">'+r.icon+" "+r.name+"</span></td>",
    "<td>"+r.total+"</td>",
    '<td><strong style="color:#1db872">'+r.mentions+"</strong></td>",
    '<td><strong style="color:#2a7abf">'+r.citations+"</strong></td>",
    '<td><div class="bar-row"><div class="bar-bg"><div class="bar-fg" style="width:'+r.sov+'%;background:'+r.color+'"></div></div><strong>'+r.sov+"%</strong></div></td>",
    '<td class="'+(r.mR>=50?"green":r.mR>=25?"mid":"red")+'">'+r.mR+"%</td>",
    '<td class="'+(r.cR>=30?"green":r.cR>=15?"mid":"red")+'">'+r.cR+"%</td>",
    "</tr>",
  ].join("")).join("");

  const compHtml=compRows.length>0?[
    "<section>",
    '<h2><span class="num">02</span> Konkurenci wykryci z danych AI</h2>',
    "<table><thead><tr><th>Marka</th><th>Łączne wzmianki</th><th>vs. "+(brand.name||"Twoja marka")+"</th></tr></thead><tbody>",
    '<tr style="background:#f0fff8"><td><span class="tag" style="background:#2edf8f18;color:#1db872">★ '+(brand.name||"Twoja marka")+'</span></td><td><strong style="color:#1db872">'+totalM+"</strong></td><td><span class=\"tag\" style=\"background:#2edf8f18;color:#1db872\">Benchmark</span></td></tr>",
    compRows.map(c=>{const diff=totalM-c.mentions;return"<tr><td>"+c.name+"</td><td>"+c.mentions+"</td><td class=\""+(diff>=0?"green":"red")+"\">"+(diff>=0?"+":"")+diff+"</td></tr>";}).join(""),
    "</tbody></table></section>",
  ].join(""):"";

  const commentLines=editableComment!==null?editableComment.split("\n"):null;
  const autoComment=[
    "<p>Niniejszy raport przedstawia wyniki analizy widoczności marki <strong>"+(brand.name||"klienta")+"</strong> w odpowiedziach generowanych przez modele AI. Analiza obejmuje <strong>"+totalQ.toLocaleString("pl-PL")+" zapytań</strong> na platformach AI.</p>",
    avgSOV>=30?"<p><strong>AI Share of Voice "+avgSOV+"%</strong> — silna pozycja.</p>":
    avgSOV>=10?"<p><strong>AI Share of Voice "+avgSOV+"%</strong> — umiarkowana widoczność. Główna dźwignia: treści FAQ i how-to.</p>":
    "<p><strong>AI Share of Voice "+avgSOV+"%</strong> — niska widoczność. Kluczowe: entity recognition (Wikipedia, Wikidata) i content pod zapytania branżowe.</p>",
    "<p><strong>Mentions: "+totalM+" | Citations: "+totalC+"</strong></p>",
    best?"<p>Najlepsza platforma: <strong>"+best.platform+"</strong> (SOV "+best.sov+"%)."+( worst&&worst!==best?" Do poprawy: "+worst.platform+" (SOV "+worst.sov+"%).":"")+"</p>":"",
  ].join("");

  const finalCommentHtml=commentLines
    ?"<section><h2><span class=\"num\">★</span> Komentarz analityczny</h2><div class=\"comment-box\"><div class=\"comment-title\">Podsumowanie widoczności AI</div>"+commentLines.filter(Boolean).map(l=>"<p>"+l+"</p>").join("")+"</div></section>"
    :"<section><h2><span class=\"num\">★</span> Komentarz analityczny</h2><div class=\"comment-box\"><div class=\"comment-title\">Podsumowanie widoczności AI</div>"+autoComment+"</div></section>";

  const kqHtml=(()=>{
    if(!topBrandKws?.length&&!topGapKws?.length) return "";
    const br=(topBrandKws||[]).map(([kw,vol])=>"<tr><td>"+kw+"</td><td style=\"text-align:right;color:#1db872;font-weight:700\">"+(vol>0?vol.toLocaleString("pl-PL"):"—")+"</td></tr>").join("");
    const gr=(topGapKws||[]).map(([kw,{vol,comps}])=>"<tr><td>"+kw+"</td><td style=\"text-align:right;color:#e03050\">"+comps.join(", ")+"</td><td style=\"text-align:right;color:#4a7090;font-size:11px\">"+(vol>0?vol.toLocaleString("pl-PL"):"—")+"</td></tr>").join("");
    return "<section><h2><span class=\"num\">03</span> Zapytania kluczowe</h2><div style=\"display:grid;grid-template-columns:1fr 1fr;gap:20px\">"+(br?"<div><h3 style=\"font-size:13px;font-weight:700;color:#1db872;margin-bottom:10px\">🎯 Z wzmianką marki</h3><table><thead><tr><th>Zapytanie</th><th style=\"text-align:right\">Vol.</th></tr></thead><tbody>"+br+"</tbody></table></div>":"")+(gr?"<div><h3 style=\"font-size:13px;font-weight:700;color:#e03050;margin-bottom:10px\">⚠️ Luki — marka nieobecna</h3><table><thead><tr><th>Zapytanie</th><th style=\"text-align:right\">Wymienia</th><th style=\"text-align:right\">Vol.</th></tr></thead><tbody>"+gr+"</tbody></table></div>":"")+"</div></section>";
  })();

  const insHtml=[
    '<div class="ig">',
    best?'<div class="ins" style="background:#2edf8f08;border-color:#2edf8f2a"><span class="ii" style="color:#1db872">↑</span><span class="it"><strong>Najlepsza: '+best.platform+'</strong> SOV '+best.sov+'%</span></div>':"",
    worst&&worst!==best?'<div class="ins" style="background:#ff5c6a08;border-color:#ff5c6a2a"><span class="ii" style="color:#e03050">↓</span><span class="it"><strong>Do działania: '+worst.platform+'</strong> SOV '+worst.sov+'%</span></div>':"",
    '<div class="ins" style="background:#4da6ff08;border-color:#4da6ff2a"><span class="ii" style="color:#4da6ff">◈</span><span class="it"><strong>Strategia:</strong> FAQ, schema markup, link building pod AI.</span></div>',
    "</div>",
  ].join("");

  return[
    "<!DOCTYPE html><html lang=\"pl\"><head><meta charset=\"UTF-8\"/>",
    "<title>Sempai AI Visibility — "+(brand.name||"Raport")+"</title>",
    "<style>"+css+"</style></head><body><div class=\"page\">",
    "<div class=\"header\">",
    "<div class=\"logo\"><div class=\"s\">S</div><span class=\"bn\">sempai</span><span class=\"badge\">AI Visibility</span></div>",
    "<h1>Raport Widoczności AI</h1>",
    "<p class=\"meta\">Klient: <strong>"+(brand.name||"—")+"</strong>",
    brand.url?" · URL: <strong>"+brand.url+"</strong>":"",
    brand.industry?" · Branża: <strong>"+brand.industry+"</strong>":"",
    " · Data: "+date+"</p></div>",
    "<div class=\"kpi-grid\">",
    "<div class=\"kpi\" style=\"border-top-color:#2edf8f\"><div class=\"kl\">AI Share of Voice</div><div class=\"kv\" style=\"color:#2edf8f\">"+avgSOV+"%</div><div class=\"ks\">"+(avgSOV>=30?"Silna pozycja":avgSOV>=10?"Umiarkowana":"Niska — działaj")+"</div><div class=\"pb-wrap\"><div class=\"pb\" style=\"width:"+Math.min(avgSOV,100)+"%;background:#2edf8f\"></div></div></div>",
    "<div class=\"kpi\" style=\"border-top-color:#5bb8ff\"><div class=\"kl\">Visibility Score</div><div class=\"kv\" style=\"color:#5bb8ff\">"+visM+"%</div><div class=\"ks\">"+totalM+" wzmianek</div><div class=\"pb-wrap\"><div class=\"pb\" style=\"width:"+Math.min(visM,100)+"%;background:#5bb8ff\"></div></div></div>",
    "<div class=\"kpi\" style=\"border-top-color:#b39dfa\"><div class=\"kl\">Citation Score</div><div class=\"kv\" style=\"color:#b39dfa\">"+visC+"%</div><div class=\"ks\">"+totalC+" cytowań</div><div class=\"pb-wrap\"><div class=\"pb\" style=\"width:"+Math.min(visC,100)+"%;background:#b39dfa\"></div></div></div>",
    "<div class=\"kpi\" style=\"border-top-color:#f5c842\"><div class=\"kl\">Zapytania łącznie</div><div class=\"kv\" style=\"color:#f5c842\">"+totalQ.toLocaleString("pl-PL")+"</div><div class=\"ks\">"+PLATFORMS.filter(p=>proc[p.id].total>0).length+" platform</div></div>",
    "</div>",
    "<section><h2><span class=\"num\">01</span> AI Share of Voice — per platforma</h2>",
    "<table><thead><tr><th>Platforma</th><th>Zapytań</th><th>Wzmianki</th><th>Cytowania</th><th>SOV %</th><th>Mention Rate</th><th>Citation Rate</th></tr></thead>",
    "<tbody>"+rowsHtml+"</tbody></table></section>",
    compHtml, kqHtml, finalCommentHtml,
    "<section><h2><span class=\"num\">★</span> Kluczowe spostrzeżenia</h2>"+insHtml+"</section>",
    "<div class=\"footer\"><div style=\"font-weight:800;color:#07111f\">sempai · Let us perform!</div>",
    "<div style=\"font-size:11px;color:#8899aa\">Wygenerowano: "+date+"</div></div>",
    "</div></body></html>",
  ].join("");
}

/* ── MAIN APP ──────────────────────────────────────────────────────────────── */
export default function App(){
  const[tab,setTab]=useState("guide");
  const[brand,setBrand]=useState({name:"",url:"",industry:""});
  const[parsedData,setParsedData]=useState({});
  const[loadedFiles,setLoadedFiles]=useState({});
  const[rawBuffers,setRawBuffers]=useState({});
  const[errors,setErrors]=useState([]);
  const[allDetectedMentions,setAllDetectedMentions]=useState([]);
  const[brandMentionKey,setBrandMentionKey]=useState("");
  const[brandVariants,setBrandVariants]=useState([]);
  const[removedAutoVariants,setRemovedAutoVariants]=useState(new Set());
  const[variantInput,setVariantInput]=useState("");
  const[allVariantHits,setAllVariantHits]=useState({});
  const[promptCopied,setPromptCopied]=useState(false);
  const[unknownFiles,setUnknownFiles]=useState([]);
  const[editableComment,setEditableComment]=useState(null);
  const[fileCount,setFileCount]=useState({});

  const autoKey=(brand.url||brand.name).toLowerCase().replace(/^https?:\/\/(www\.)?/,"").replace(/\..*$/,"").trim()||brand.name.toLowerCase().split(/\s+/)[0];
  const brandKey=brandMentionKey.trim()||autoKey;
  const autoVariants=generateBrandVariants(brand.url||brand.name).filter(v=>!removedAutoVariants.has(v));
  const variantsInUse=[...new Set([...autoVariants,...brandVariants])];

  useEffect(()=>{
    if(!brandKey||Object.keys(rawBuffers).length===0) return;
    const next={}, mergedHits={};
    Object.entries(rawBuffers).forEach(([fname,buf])=>{
      try{
        const r=parseAhrefsBuffer(buf,brandKey,variantsInUse,fname);
        if(r?.platformId){
          next[r.platformId]=aggregatePlatform(r.rows,r.variantHits,next[r.platformId]);
          Object.entries(r.variantHits||{}).forEach(([v,c])=>{mergedHits[v]=(mergedHits[v]||0)+c;});
        }
      }catch(_){}
    });
    if(Object.keys(next).length>0){setParsedData(next);setAllVariantHits(mergedHits);}
  },[brandKey,brandVariants]); // eslint-disable-line

  const handleFiles=(filename,buffer)=>{
    try{
      const result=parseAhrefsBuffer(buffer,brandKey,variantsInUse,filename);
      if(!result||!result.platformId){
        const diagText=decodeBuffer(buffer);
        const diagRows=parseDelimited(diagText);
        const diagHeaders=diagRows.length>0?diagRows[0].map(h=>h.replace(/^"|"$/g,"").trim()).filter(Boolean):[];
        const models=diagRows.length>1&&diagHeaders.includes("Model")?[...new Set(diagRows.slice(1,6).map(r=>r[diagHeaders.indexOf("Model")]||"").filter(Boolean))]:[];
        setErrors(e=>[...e,"Nie rozpoznano platformy: "+filename+" | Nagłówki: "+diagHeaders.slice(0,8).join(", ")+(models.length>0?" | Model: "+models.join(", "):"")]);
        setUnknownFiles(prev=>[...prev,{filename,headers:diagHeaders,models}]);
        return;
      }
      setParsedData(d=>{
        const existing=d[result.platformId];
        return{...d,[result.platformId]:aggregatePlatform(result.rows,result.variantHits,existing)};
      });
      setAllVariantHits(prev=>{
        const merged={...prev};
        Object.entries(result.variantHits||{}).forEach(([v,c])=>{merged[v]=(merged[v]||0)+c;});
        return merged;
      });
      setLoadedFiles(f=>{
        const existing=f[result.platformId];
        return{...f,[result.platformId]:existing?existing+" + "+filename:filename};
      });
      setFileCount(fc=>({...fc,[result.platformId]:(fc[result.platformId]||0)+1}));
      setRawBuffers(rb=>({...rb,[filename]:buffer}));
      setErrors(e=>e.filter(x=>!x.includes(filename)));
      setUnknownFiles(prev=>prev.filter(u=>u.filename!==filename));
      const text=decodeBuffer(buffer);
      const allRows=parseDelimited(text);
      if(allRows.length>1){
        const headers=allRows[0].map(h=>h.replace(/^"|"$/g,"").trim());
        const mi=headers.findIndex(h=>h==="Mentions");
        if(mi>=0){
          const found=new Set();
          allRows.slice(1).forEach(r=>{if(r[mi]) r[mi].toLowerCase().split(/[,\n]+/).map(m=>m.trim()).filter(Boolean).forEach(m=>found.add(m));});
          setAllDetectedMentions(prev=>[...new Set([...prev,...found])].filter(Boolean).sort());
        }
      }
    }catch(err){setErrors(e=>[...e,"Błąd: "+filename+": "+err.message]);}
  };

  const proc={};
  PLATFORMS.forEach(p=>{proc[p.id]=parsedData[p.id]||{total:0,mentions:0,citations:0,compSet:{},topBrand:[],topGap:[]};});

  const kwBrandMap={},kwGapMap={};
  PLATFORMS.forEach(p=>{
    (proc[p.id].topBrand||[]).forEach(({kw,vol})=>{if(!kwBrandMap[kw]||kwBrandMap[kw]<vol)kwBrandMap[kw]=vol;});
    (proc[p.id].topGap||[]).forEach(({kw,vol,comps})=>{if(!kwGapMap[kw])kwGapMap[kw]={vol,comps};});
  });
  const topBrandKws=Object.entries(kwBrandMap).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const topGapKws=Object.entries(kwGapMap).sort((a,b)=>b[1].vol-a[1].vol).slice(0,8);

  const compCounts={};
  PLATFORMS.forEach(p=>{Object.entries(proc[p.id]?.compSet||{}).forEach(([n,cnt])=>{compCounts[n]=(compCounts[n]||0)+cnt;});});
  const allComps=Object.entries(compCounts).sort((a,b)=>b[1]-a[1]).map(([n])=>n).filter(n=>n&&n.length>1);

  const totalQ=PLATFORMS.reduce((s,p)=>s+(proc[p.id].total||0),0);
  const totalM=PLATFORMS.reduce((s,p)=>s+(proc[p.id].mentions||0),0);
  const totalC=PLATFORMS.reduce((s,p)=>s+(proc[p.id].citations||0),0);

  const fmtPct=(v,total)=>{
    if(v===0) return "0%";
    if(v<1&&total>0){const count=Math.round((v/100)*total);if(count<2) return "1 na "+total.toLocaleString("pl-PL")+" zap."; return v.toFixed(1)+"% ("+count+" zap.)";}
    if(v<1) return v.toFixed(1)+"%";
    return v+"%";
  };
  const fmtPctSimple=v=>v===0?"0%":(v<1?v.toFixed(1)+"%":v+"%");
  const pct=(num,den)=>{if(den===0) return 0; const v=(num/den)*100; if(v===0) return 0; if(v<0.1) return 0.1; if(v<1) return Math.round(v*10)/10; return Math.round(v);};
  const visM=pct(totalM,totalQ);
  const visC=pct(totalC,totalQ);

  const sovData=PLATFORMS.map(p=>{
    const d=proc[p.id];
    const allM=d.mentions+allComps.reduce((s,c)=>s+(d.compSet[c]||0),0);
    const sovRaw=allM>0?(d.mentions/allM)*100:0;
    const sov=sovRaw<1&&sovRaw>0?Math.round(sovRaw*10)/10:Math.round(sovRaw);
    const presRaw=d.total>0?((d.mentions+d.citations*.5)/d.total)*100:0;
    const presence=presRaw<.1?0:presRaw<1?Math.round(presRaw*10)/10:Math.round(presRaw);
    return{platform:p.short,color:p.color,sov,mentions:d.mentions,citations:d.citations,total:d.total,presence};
  });

  const active=sovData.filter(d=>d.total>0);
  const avgSOVraw=active.length>0?active.reduce((s,d)=>s+d.sov,0)/active.length:0;
  const avgSOV=avgSOVraw<1&&avgSOVraw>0?Math.round(avgSOVraw*10)/10:Math.round(avgSOVraw);
  const ranked=[...active].sort((a,b)=>b.sov-a.sov);
  const best=ranked[0],worst=ranked[ranked.length-1];

  const radarData=PLATFORMS.map(p=>({
    platform:p.short,
    Wzmianki:proc[p.id].total>0?parseFloat(((proc[p.id].mentions/proc[p.id].total)*100).toFixed(1)):0,
    Cytowania:proc[p.id].total>0?parseFloat(((proc[p.id].citations/proc[p.id].total)*100).toFixed(1)):0,
  }));

  const buildArgs=()=>({brand,proc,totalQ,totalM,totalC,visM,visC,avgSOV,allComps,compCounts,best,worst,editableComment,topBrandKws,topGapKws});
  const openReport=()=>{const html=buildReport(buildArgs());window.open(URL.createObjectURL(new Blob([html],{type:"text/html;charset=utf-8"})),"_blank");};
  const downloadReport=()=>{const html=buildReport(buildArgs());const a=document.createElement("a");a.href="data:text/html;charset=utf-8,"+encodeURIComponent(html);a.download="Sempai_AIVisibility_"+(brand.name||"Raport")+"_"+new Date().toISOString().slice(0,10)+".html";a.click();};

  const genPrompt=()=>{
    const pRows=PLATFORMS.map(p=>{const d=proc[p.id];const mR=d.total>0?Math.round((d.mentions/d.total)*100):0;const cR=d.total>0?Math.round((d.citations/d.total)*100):0;return"* "+p.name+": "+d.mentions+"/"+d.total+" wzm. ("+mR+"%), "+d.citations+" cyt. ("+cR+"%)";}).join("\n");
    const compStr=allComps.slice(0,5).map(c=>c+": "+compCounts[c]+" wzm.").join(", ");
    return["Jesteś ekspertem ds. AI Visibility. Przygotuj raport w języku polskim jako .docx.","","KLIENT: "+(brand.name||"[KLIENT]")+" | URL: "+(brand.url||"-")+" | Branża: "+(brand.industry||"-"),"KONKURENCI: "+(compStr||"brak"),"","WYNIKI:","SOV: "+avgSOV+"% | Mentions: "+visM+"% | Citations: "+visC+"% | Zapytań: "+totalQ,pRows,best?"Najlepsza: "+best.platform+" SOV "+best.sov+"%":"",worst&&worst!==best?"Do poprawy: "+worst.platform+" SOV "+worst.sov+"%":"","","SEKCJE RAPORTU:","1. AI Share of Voice (4 akapity)","2. Brand Mentions (4)","3. Visibility Score Mentions (3)","4. Visibility Score Citations (4)","5. Analiza konkurencji (3)","6. Komentarz: mocne x3, do poprawy x3, strategia 3-6 mies. (5)","","Język: polski | każdy wniosek = konkretna liczba"].filter(x=>x!==undefined).join("\n");
  };

  const TABS=[
    {id:"guide",label:"⓪ Instrukcja"},
    {id:"setup",label:"① Klient"},
    {id:"import",label:"② Import CSV"},
    {id:"dashboard",label:"③ Dashboard"},
    {id:"report",label:"④ Raport"},
    {id:"prompt",label:"⑤ Prompt"},
  ];

  return(
    <div style={{minHeight:"100vh",background:S.navy1,color:S.text,fontFamily:"'DM Sans','Segoe UI',sans-serif"}}>
      {/* HEADER */}
      <div style={{background:S.navy2,borderBottom:"1px solid "+S.borderL,position:"relative",overflow:"hidden",minHeight:114}}>
        <ParticleBg/>
        <div style={{position:"relative",maxWidth:1000,margin:"0 auto",padding:"22px 28px 0"}}>
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:18}}>
            <div style={{width:40,height:40,borderRadius:10,flexShrink:0,background:"linear-gradient(135deg,"+S.green+"22,"+S.navy4+")",border:"1.5px solid "+S.green+"55",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:20,color:S.green}}>S</div>
            <div>
              <div style={{display:"flex",alignItems:"baseline",gap:10}}>
                <span style={{fontSize:20,fontWeight:800,color:S.text}}>sempai</span>
                <span style={{fontSize:11,fontWeight:700,color:S.green,background:S.green+"18",border:"1px solid "+S.green+"44",borderRadius:5,padding:"1px 8px",letterSpacing:"1.2px",textTransform:"uppercase"}}>AI Visibility</span>
              </div>
              <div style={{fontSize:10,color:S.mutedL,letterSpacing:"2px",textTransform:"uppercase",marginTop:1}}>Report Generator · Let us perform!</div>
            </div>
          </div>
          <div style={{display:"flex",overflowX:"auto",gap:2}}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"8px 18px",background:tab===t.id?S.green+"12":"transparent",border:"none",borderBottom:tab===t.id?"2px solid "+S.green:"2px solid transparent",color:tab===t.id?S.green:S.mutedL,fontSize:13,fontWeight:600,cursor:"pointer",transition:"all .15s",whiteSpace:"nowrap",borderRadius:"6px 6px 0 0"}}>{t.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{maxWidth:1000,margin:"0 auto",padding:"28px 28px 60px"}}>

        {/* ── GUIDE ── */}
        {tab==="guide"&&(
          <div>
            <STitle>Jak korzystać z narzędzia</STitle>

            <div style={{background:"linear-gradient(135deg,"+S.navy2+","+S.navy3+")",border:"1px solid "+S.green+"33",borderRadius:14,padding:"22px 26px",marginBottom:22}}>
              <div style={{fontSize:11,color:S.green,fontWeight:700,textTransform:"uppercase",letterSpacing:"1.5px",marginBottom:8}}>Co to jest?</div>
              <div style={{fontSize:16,fontWeight:800,color:S.text,marginBottom:14,lineHeight:1.4}}>Narzędzie analizuje jak często marka pojawia się w odpowiedziach AI</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
                {[
                  {icon:"🔍",title:"Mentions",desc:"Ile razy AI wymienia markę z nazwy w odpowiedzi na zapytania branżowe"},
                  {icon:"🔗",title:"Citations",desc:"Ile razy AI cytuje stronę marki jako źródło w odpowiedzi"},
                  {icon:"📊",title:"AI Share of Voice",desc:"Jaki % przestrzeni AI zajmuje marka vs. konkurenci w tej samej kategorii"},
                ].map((x,i)=>(
                  <div key={i} style={{background:S.navy1,borderRadius:10,padding:"14px 16px",border:"1px solid "+S.borderL}}>
                    <div style={{fontSize:20,marginBottom:8}}>{x.icon}</div>
                    <div style={{fontSize:13,fontWeight:800,color:S.text,marginBottom:4}}>{x.title}</div>
                    <div style={{fontSize:11,color:S.mutedL,lineHeight:1.6}}>{x.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:22}}>
              {[
                {n:1,color:S.sky,title:"Otwórz Ahrefs → AI visibility → AI responses",body:"W lewym menu kliknij AI visibility, następnie AI responses. Wybierz właściwy projekt i kraj."},
                {n:2,color:S.green,title:"Wybierz platformę z filtra",body:"Kliknij nazwę platformy: AI Overview, AI Mode, ChatGPT, Gemini, Perplexity lub Copilot. Eksportuj każdą osobno."},
                {n:3,color:S.coral,title:'Kliknij Export → pobierz CSV',body:"Kliknij Export przy liczbie wyników (np. \"489 results\") — eksportuje WSZYSTKIE wyniki. Ahrefs zapisuje w UTF-16, narzędzie obsługuje to automatycznie."},
                {n:4,color:S.gold,title:"Powtórz dla każdej platformy → wgraj wszystko naraz",body:"W kroku ② Import CSV możesz upuścić wszystkie pliki jednocześnie. Platforma wykrywana automatycznie. Wiele plików tej samej platformy? Dane zostaną połączone."},
                {n:5,color:S.green,title:"Ustaw nazwę klienta i gotowe 🚀",body:"W kroku ① Klient wpisz nazwę marki i domenę. System wykryje wzmianki, wyliczy wskaźniki i wygeneruje raport."},
              ].map((s,i)=>(
                <div key={i} style={{display:"flex",gap:14,padding:"16px 18px",background:S.navy2,border:"1px solid "+S.borderL,borderRadius:12,alignItems:"flex-start"}}>
                  <div style={{width:34,height:34,borderRadius:"50%",background:s.color+"20",border:"2px solid "+s.color+"55",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:900,color:s.color,flexShrink:0}}>{s.n}</div>
                  <div>
                    <div style={{fontSize:13,fontWeight:800,color:S.text,marginBottom:5}}>{s.title}</div>
                    <div style={{fontSize:12,color:S.mutedL,lineHeight:1.7}}>{s.body}</div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={()=>setTab("setup")} style={{padding:"11px 26px",background:S.green+"18",border:"1px solid "+S.green+"55",borderRadius:10,color:S.green,fontSize:14,fontWeight:700,cursor:"pointer"}}>
              Zaczynamy → ① Klient
            </button>
          </div>
        )}

        {/* ── SETUP ── */}
        {tab==="setup"&&(
          <div>
            <STitle>Dane klienta</STitle>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:18}}>
              <Inp label="Nazwa klienta / marki *" value={brand.name} set={v=>setBrand(b=>({...b,name:v}))} ph="np. Gardenspace"/>
              <Inp label="URL / domena marki *" value={brand.url} set={v=>setBrand(b=>({...b,url:v}))} ph="gardenspace.pl"/>
              <Inp label="Branża" value={brand.industry} set={v=>setBrand(b=>({...b,industry:v}))} ph="np. Meble ogrodowe / E-commerce" span2/>
            </div>
            {(brand.name||brand.url)&&autoVariants.length>0&&(
              <Card style={{marginBottom:14}}>
                <CLabel>Warianty nazwy marki wykrywane w kolumnie Mentions</CLabel>
                <div style={{fontSize:12,color:S.mutedL,marginBottom:10,lineHeight:1.6}}>
                  Kliknij <strong style={{color:S.coral}}>✕</strong> aby usunąć. Dodaj własny wariant → Enter.
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
                  {autoVariants.map((v,i)=>(
                    <span key={i} style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 10px 3px 11px",borderRadius:16,fontSize:11,fontWeight:700,background:S.green+"18",border:"1px solid "+S.green+"33",color:S.green}}>
                      {v}
                      <button onClick={()=>setRemovedAutoVariants(prev=>new Set([...prev,v]))} style={{background:"none",border:"none",cursor:"pointer",color:S.green+"88",fontSize:13,lineHeight:1,padding:0,display:"flex",alignItems:"center"}}>✕</button>
                    </span>
                  ))}
                  {brandVariants.map((v,i)=>(
                    <span key={"c"+i} style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 10px 3px 11px",borderRadius:16,fontSize:11,fontWeight:700,background:S.sky+"18",border:"1px solid "+S.sky+"33",color:S.sky}}>
                      {v}
                      <button onClick={()=>setBrandVariants(prev=>prev.filter(x=>x!==v))} style={{background:"none",border:"none",cursor:"pointer",color:S.sky+"88",fontSize:13,lineHeight:1,padding:0,display:"flex",alignItems:"center"}}>✕</button>
                    </span>
                  ))}
                  {(removedAutoVariants.size>0||brandVariants.length>0)&&(
                    <button onClick={()=>{setRemovedAutoVariants(new Set());setBrandVariants([]);}} style={{padding:"3px 10px",borderRadius:16,fontSize:11,background:"transparent",border:"1px solid "+S.border,color:S.muted,cursor:"pointer"}}>↺ Reset</button>
                  )}
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <input value={variantInput} onChange={e=>setVariantInput(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter"&&variantInput.trim()){setBrandVariants(prev=>[...new Set([...prev,variantInput.trim()])]);setVariantInput("");}}}
                    placeholder="Wpisz własny wariant i naciśnij Enter"
                    style={{flex:1,background:S.navy1,border:"1px solid "+S.borderL,borderRadius:8,padding:"8px 12px",color:S.text,fontSize:12,outline:"none"}}/>
                  <button onClick={()=>{if(variantInput.trim()){setBrandVariants(prev=>[...new Set([...prev,variantInput.trim()])]);setVariantInput("");}}} style={{padding:"8px 14px",background:S.sky+"18",border:"1px solid "+S.sky+"44",borderRadius:8,color:S.sky,fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Dodaj</button>
                </div>
              </Card>
            )}
            <Btn onClick={()=>setTab("import")} disabled={!(brand.name&&brand.url)}>Dalej → Import CSV</Btn>
          </div>
        )}

        {/* ── IMPORT ── */}
        {tab==="import"&&(
          <div>
            <STitle>Import plików CSV z Ahrefs</STitle>
            <p style={{fontSize:13,color:S.mutedL,marginBottom:18}}>Wgraj wszystkie pliki naraz — platforma i encoding wykrywane automatycznie. Wiele plików tej samej platformy zostanie połączonych.</p>
            <DropZone onFiles={handleFiles}/>

            {/* Detection panel */}
            {allDetectedMentions.length>0&&(
              <div style={{marginTop:14,padding:"16px 18px",background:S.navy3,border:"1px solid "+(totalM>0?S.green+"55":S.gold+"55"),borderRadius:12}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                  <span style={{fontSize:18}}>{totalM>0?"✅":"⚠️"}</span>
                  <div>
                    {totalM>0
                      ?<div style={{fontSize:13,color:S.green,fontWeight:700}}>Marka wykryta — {totalM} wzmianek, {totalC} cytowań</div>
                      :<div style={{fontSize:13,color:S.gold,fontWeight:700}}>Nie znaleziono „{brandKey}" — wybierz wariant poniżej</div>}
                    <div style={{fontSize:11,color:S.mutedL,marginTop:2}}>Sprawdzano: {variantsInUse.slice(0,6).join(", ")}{variantsInUse.length>6?" +"+(variantsInUse.length-6)+" więcej":""}</div>
                  </div>
                </div>
                {Object.keys(allVariantHits).length>0&&(
                  <div style={{marginBottom:12}}>
                    <div style={{fontSize:10,color:S.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",marginBottom:7}}>Dopasowania</div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      {Object.entries(allVariantHits).sort((a,b)=>b[1]-a[1]).map(([variant,count],i)=>(
                        <div key={i} style={{padding:"3px 12px",borderRadius:8,background:S.green+"18",border:"1px solid "+S.green+"33",fontSize:12}}>
                          <span style={{color:S.green,fontWeight:700}}>{variant}</span>
                          <span style={{color:S.mutedL,marginLeft:6,fontSize:11}}>{count}×</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {totalM===0&&(
                  <div style={{marginBottom:10}}>
                    <div style={{fontSize:10,color:S.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",marginBottom:7}}>Marki w danych — kliknij swoją</div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
                      {allDetectedMentions.map((m,i)=>{
                        const cols=[S.sky,S.coral,S.gold,S.purple,"#34d399",S.green];
                        const isActive=brandMentionKey===m;
                        return(<button key={i} onClick={()=>setBrandMentionKey(isActive?"":m)} style={{padding:"4px 14px",borderRadius:20,fontSize:12,fontWeight:700,cursor:"pointer",background:isActive?cols[i%6]+"33":cols[i%6]+"12",border:"1px solid "+(isActive?cols[i%6]:cols[i%6]+"44"),color:cols[i%6]}}>{m}</button>);
                      })}
                    </div>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <input value={brandMentionKey} onChange={e=>setBrandMentionKey(e.target.value)} placeholder="lub wpisz ręcznie..."
                        style={{flex:1,background:S.navy2,border:"1px solid "+S.borderL,borderRadius:8,padding:"8px 12px",color:S.text,fontSize:12,outline:"none",fontFamily:"monospace"}}/>
                      {brandMentionKey&&<button onClick={()=>setBrandMentionKey("")} style={{padding:"6px 12px",background:"transparent",border:"1px solid "+S.border,borderRadius:8,color:S.muted,fontSize:11,cursor:"pointer"}}>✕</button>}
                    </div>
                  </div>
                )}
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginTop:10}}>
                  {[{label:"Wzmianki",val:totalM,color:S.green},{label:"Cytowania",val:totalC,color:S.sky},{label:"Zapytania",val:totalQ,color:S.purple}].map((s,i)=>(
                    <div key={i} style={{background:S.navy1,borderRadius:8,padding:"10px 12px",border:"1px solid "+s.color+"22"}}>
                      <div style={{fontSize:9,color:S.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:4}}>{s.label}</div>
                      <div style={{fontSize:20,fontWeight:900,color:s.color}}>{s.val.toLocaleString("pl-PL")}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Platform status grid */}
            {Object.keys(loadedFiles).length>0&&(
              <div style={{marginTop:18,display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
                {PLATFORMS.map(p=>{
                  const fname=loadedFiles[p.id];
                  const d=proc[p.id];
                  const cnt=fileCount[p.id]||0;
                  return(
                    <div key={p.id} style={{padding:"12px 14px",background:S.navy2,border:"1px solid "+(fname?p.color+"44":S.borderL),borderRadius:10}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                        <span style={{background:p.color+"20",color:p.color,borderRadius:5,padding:"2px 8px",fontSize:11,fontWeight:700}}>{p.icon} {p.short}</span>
                        {fname?<span style={{fontSize:10,color:S.green}}>✅{cnt>1?" ×"+cnt:""}</span>:<span style={{fontSize:10,color:S.muted}}>—</span>}
                      </div>
                      {fname
                        ?<div style={{fontSize:11,color:S.text,fontFamily:"monospace"}}>{d.total.toLocaleString("pl-PL")} zap. · <span style={{color:S.green}}>{d.mentions}</span> wzm. · <span style={{color:S.sky}}>{d.citations}</span> cyt.</div>
                        :<div style={{fontSize:11,color:S.muted}}>Brak danych</div>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Competitors */}
            {allComps.length>0&&(
              <Card style={{marginTop:16}}>
                <CLabel>Konkurenci wykryci automatycznie</CLabel>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {allComps.slice(0,12).map((c,i)=>{
                    const cols=[S.sky,S.coral,S.gold,S.purple,"#34d399",S.green];
                    return<span key={i} style={{padding:"3px 12px",borderRadius:20,fontSize:12,fontWeight:700,background:cols[i%6]+"18",border:"1px solid "+cols[i%6]+"44",color:cols[i%6]}}>{c} <span style={{opacity:.7,fontWeight:400}}>({compCounts[c]})</span></span>;
                  })}
                </div>
              </Card>
            )}

            {/* Unknown files */}
            {unknownFiles.length>0&&(
              <div style={{marginTop:14,padding:"14px 16px",background:S.gold+"0a",border:"1px solid "+S.gold+"33",borderRadius:10}}>
                <div style={{fontSize:11,color:S.gold,fontWeight:700,marginBottom:10}}>⚠️ Nierozpoznana platforma — przypisz ręcznie:</div>
                {unknownFiles.map((uf,fi)=>(
                  <div key={fi} style={{marginBottom:10}}>
                    <div style={{fontSize:10,color:S.mutedL,marginBottom:6,fontFamily:"monospace"}}>📄 {uf.filename}</div>
                    <div style={{fontSize:10,color:S.muted,marginBottom:8}}>Nagłówki: <span style={{color:S.mutedL}}>{uf.headers.slice(0,6).join(", ")}</span>{uf.models.length>0&&<span> | Model: <strong style={{color:S.text}}>{uf.models.join(", ")}</strong></span>}</div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      {PLATFORMS.map(p=>(
                        <button key={p.id} onClick={()=>{
                          const buf=Object.entries(rawBuffers).find(([k])=>k===uf.filename)?.[1];
                          if(!buf) return;
                          try{
                            const r=parseAhrefsBuffer(buf,brandKey,variantsInUse,uf.filename);
                            const agg=aggregatePlatform(r?r.rows:[],r?r.variantHits:{},parsedData[p.id]);
                            setParsedData(d=>({...d,[p.id]:agg}));
                            setLoadedFiles(f=>({...f,[p.id]:uf.filename}));
                            setUnknownFiles(prev=>prev.filter((_,i)=>i!==fi));
                            setErrors(e=>e.filter(x=>!x.includes(uf.filename)));
                          }catch(_){}
                        }} style={{padding:"4px 12px",borderRadius:14,fontSize:11,fontWeight:700,cursor:"pointer",background:p.color+"18",border:"1px solid "+p.color+"44",color:p.color}}>{p.icon} {p.short}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {errors.length>0&&unknownFiles.length===0&&(
              <div style={{marginTop:14,padding:"12px 16px",background:S.coral+"0f",border:"1px solid "+S.coral+"33",borderRadius:10}}>
                {errors.map((e,i)=><div key={i} style={{fontSize:12,color:S.coral}}>{e}</div>)}
              </div>
            )}
            <div style={{display:"flex",gap:10,marginTop:18}}>
              <Btn onClick={()=>setTab("setup")} muted>← Wróć</Btn>
              <Btn onClick={()=>setTab("dashboard")}>Dashboard →</Btn>
            </div>
          </div>
        )}

        {/* ── DASHBOARD ── */}
        {tab==="dashboard"&&(
          <div>
            <STitle>Dashboard Widoczności AI</STitle>

            {/* Signal Scanner */}
            <Card style={{marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                <div>
                  <div style={{fontSize:9,color:S.muted,fontWeight:700,letterSpacing:"1.2px",textTransform:"uppercase",marginBottom:3}}>◈ AI Signal Scanner</div>
                  <div style={{fontSize:11,color:S.mutedL}}>% w środku = Mention Rate · Świecące = dane załadowane</div>
                </div>
              </div>
              <SignalScanner proc={proc}/>
            </Card>

            {/* KPI row */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
              {[
                {label:"AI Share of Voice",value:fmtPctSimple(avgSOV),color:S.green,sub:totalM+" wzm. / "+totalQ+" zap."},
                {label:"Mention Rate",value:fmtPct(visM,totalQ),color:S.sky,sub:totalM+" na "+totalQ+" zap."},
                {label:"Citation Rate",value:fmtPct(visC,totalQ),color:S.purple,sub:totalC+" na "+totalQ+" zap."},
                {label:"Łączne zapytania",value:totalQ.toLocaleString("pl-PL"),color:S.gold,sub:PLATFORMS.filter(p=>proc[p.id].total>0).length+" platform aktywnych"},
              ].map((k,i)=>(
                <div key={i} style={{background:S.navy2,border:"1px solid "+k.color+"22",borderTop:"3px solid "+k.color,borderRadius:12,padding:"16px 14px"}}>
                  <div style={{fontSize:9,color:S.muted,textTransform:"uppercase",letterSpacing:"1px",fontWeight:700,marginBottom:6}}>{k.label}</div>
                  <div style={{fontSize:28,fontWeight:900,color:k.color,lineHeight:1,marginBottom:4}}>{k.value}</div>
                  <div style={{fontSize:10,color:S.mutedL}}>{k.sub}</div>
                </div>
              ))}
            </div>

            {/* Charts row */}
            <div style={{display:"grid",gridTemplateColumns:"3fr 2fr",gap:12,marginBottom:12}}>
              <Card>
                <CLabel>AI Share of Voice — per platforma</CLabel>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={sovData} margin={{top:8,right:8,left:-22,bottom:0}}>
                    <CartesianGrid strokeDasharray="2 4" stroke={S.borderL}/>
                    <XAxis dataKey="platform" tick={{fill:S.mutedL,fontSize:10}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:S.mutedL,fontSize:10}} axisLine={false} tickLine={false} domain={[0,100]}/>
                    <Tooltip content={<Tip/>}/>
                    <Bar dataKey="sov" name="SOV %" radius={[5,5,0,0]} label={{position:"top",fill:S.green,fontSize:9,formatter:v=>(v<1&&v>0?v.toFixed(1):v)+"%"}}>
                      {sovData.map((d,i)=><Cell key={i} fill={d.color} fillOpacity={0.85}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card>
                <CLabel>Radar widoczności</CLabel>
                <ResponsiveContainer width="100%" height={210}>
                  <RadarChart data={radarData} margin={{top:10,right:20,left:20,bottom:8}}>
                    <PolarGrid stroke={S.borderL}/>
                    <PolarAngleAxis dataKey="platform" tick={{fill:S.mutedL,fontSize:9}}/>
                    <PolarRadiusAxis angle={30} domain={[0,100]} tick={{fill:"#264d80",fontSize:8}}/>
                    <Radar name="Wzmianki" dataKey="Wzmianki" stroke={S.green} fill={S.green} fillOpacity={0.15} strokeWidth={2}/>
                    <Radar name="Cytowania" dataKey="Cytowania" stroke={S.sky} fill={S.sky} fillOpacity={0.15} strokeWidth={2}/>
                    <Legend wrapperStyle={{fontSize:11,color:S.mutedL}}/>
                  </RadarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Mentions vs Citations */}
            <Card style={{marginBottom:12}}>
              <CLabel>Wzmianki vs Cytowania vs Zapytania</CLabel>
              <ResponsiveContainer width="100%" height={170}>
                <BarChart data={sovData} margin={{top:6,right:8,left:-22,bottom:0}}>
                  <CartesianGrid strokeDasharray="2 4" stroke={S.borderL}/>
                  <XAxis dataKey="platform" tick={{fill:S.mutedL,fontSize:10}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:S.mutedL,fontSize:10}} axisLine={false} tickLine={false}/>
                  <Tooltip content={<Tip/>}/>
                  <Legend wrapperStyle={{fontSize:11,color:S.mutedL}}/>
                  <Bar dataKey="mentions" name="Wzmianki" fill={S.green} radius={[3,3,0,0]}/>
                  <Bar dataKey="citations" name="Cytowania" fill={S.sky} radius={[3,3,0,0]}/>
                  <Bar dataKey="total" name="Zapytania" fill={S.navy4} radius={[3,3,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Competitors chart */}
            {allComps.length>0&&(
              <Card style={{marginBottom:12}}>
                <CLabel>Konkurenci — łączne wzmianki w AI</CLabel>
                <ResponsiveContainer width="100%" height={Math.min(40*Math.min(allComps.length+1,9)+40,380)}>
                  <BarChart data={[{name:brand.name||"Twoja marka",count:totalM},...allComps.slice(0,7).map(c=>({name:c,count:compCounts[c]}))]} layout="vertical" margin={{top:6,right:50,left:10,bottom:0}}>
                    <CartesianGrid strokeDasharray="2 4" stroke={S.borderL} horizontal={false}/>
                    <XAxis type="number" tick={{fill:S.mutedL,fontSize:10}} axisLine={false} tickLine={false}/>
                    <YAxis dataKey="name" type="category" tick={{fill:S.text,fontSize:11}} axisLine={false} tickLine={false} width={130}/>
                    <Tooltip content={<Tip/>}/>
                    <Bar dataKey="count" name="Wzmianki" radius={[0,4,4,0]} label={{position:"right",fill:S.mutedL,fontSize:10}}>
                      {[{name:brand.name||"Twoja marka"},...allComps.slice(0,7).map(c=>({name:c}))].map((_,i)=>(
                        <Cell key={i} fill={[S.green,S.sky,S.coral,S.gold,S.purple,"#34d399",S.sky,S.coral][i]||S.sky}/>
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* Detail table */}
            <Card style={{marginBottom:12}}>
              <CLabel>Tabela szczegółowa</CLabel>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead>
                    <tr style={{borderBottom:"2px solid "+S.borderL}}>
                      {["Platforma","Zapytań","Wzmianki","Cytowania","SOV %","Mention %","Citation %"].map(h=>(
                        <th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:9,color:S.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.8px"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PLATFORMS.map(p=>{
                      const d=proc[p.id];
                      const allM=d.mentions+allComps.reduce((s,c)=>s+(d.compSet[c]||0),0);
                      const sovRaw2=allM>0?(d.mentions/allM)*100:0;
                      const sov=sovRaw2<1&&sovRaw2>0?Math.round(sovRaw2*10)/10:Math.round(sovRaw2);
                      const mRraw=d.total>0?(d.mentions/d.total)*100:0;
                      const mR=mRraw<1&&mRraw>0?Math.round(mRraw*10)/10:Math.round(mRraw);
                      const cRraw=d.total>0?(d.citations/d.total)*100:0;
                      const cR=cRraw<1&&cRraw>0?Math.round(cRraw*10)/10:Math.round(cRraw);
                      return(
                        <tr key={p.id} style={{borderBottom:"1px solid "+S.navy3,opacity:d.total>0?1:0.35}}>
                          <td style={{padding:"9px 12px"}}><span style={{background:p.color+"20",color:p.color,borderRadius:5,padding:"2px 8px",fontSize:11,fontWeight:700}}>{p.icon} {p.short}</span></td>
                          <td style={{padding:"9px 12px",color:S.mutedL,fontFamily:"monospace"}}>{d.total.toLocaleString("pl-PL")}</td>
                          <td style={{padding:"9px 12px",color:S.green,fontFamily:"monospace",fontWeight:700}}>{d.mentions}</td>
                          <td style={{padding:"9px 12px",color:S.sky,fontFamily:"monospace",fontWeight:700}}>{d.citations}</td>
                          <td style={{padding:"9px 12px"}}>
                            <div style={{display:"flex",alignItems:"center",gap:6}}>
                              <div style={{width:44,height:6,background:S.navy4,borderRadius:3,overflow:"hidden"}}><div style={{width:Math.max(sov,sov>0?4:0)+"%",height:"100%",background:p.color,borderRadius:3,minWidth:sov>0?3:0}}/></div>
                              <span style={{fontFamily:"monospace",fontSize:11,color:S.text,fontWeight:700}}>{fmtPct(sov)}</span>
                            </div>
                          </td>
                          <td style={{padding:"9px 12px"}}><span style={{fontFamily:"monospace",fontSize:11,color:mR>=50?S.green:mR>=25?S.gold:S.coral,fontWeight:700}}>{fmtPct(mR,d.total)}</span></td>
                          <td style={{padding:"9px 12px"}}><span style={{fontFamily:"monospace",fontSize:11,color:cR>=30?S.green:cR>=15?S.gold:S.coral,fontWeight:700}}>{fmtPct(cR,d.total)}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Quick Wins */}
            <Card style={{border:"1px solid "+S.gold+"33"}}>
              <CLabel>⚡ Opportunities & Spostrzeżenia</CLabel>
              <div style={{display:"flex",gap:8,padding:"8px 12px",background:S.gold+"08",border:"1px solid "+S.gold+"22",borderRadius:8,marginBottom:14,fontSize:11,color:S.mutedL,lineHeight:1.5}}>
                <span style={{color:S.gold,flexShrink:0}}>⚠️</span>
                <span>Rekomendacje generowane automatycznie — przed wdrożeniem zweryfikuj z kontekstem branżowym.</span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {(()=>{
                  const ops=[];
                  const zeroPlatforms=PLATFORMS.filter(p=>proc[p.id].total>0&&proc[p.id].mentions===0);
                  if(zeroPlatforms.length>0) ops.push({tag:"QUICK WIN",color:S.green,icon:"🎯",title:"Nieobecne platformy",body:zeroPlatforms.map(p=>p.name).join(", ")+" — marka ma dane ale zero wzmianek."});
                  if(totalC>0&&totalM===0) ops.push({tag:"QUICK WIN",color:S.green,icon:"🔗",title:"Cytowana, ale nieznana",body:"Strona cytowana "+totalC+"x ale marka nie wymieniana. Dodaj branding signals w treściach."});
                  if(totalM>0&&totalC>totalM*2) ops.push({tag:"QUICK WIN",color:S.sky,icon:"📎",title:"Cytowania >> wzmianki",body:"AI cytuje "+totalC+"x vs "+totalM+" wzmianek. Wzmocnij entity: Wikipedia, Wikidata."});
                  const topC=allComps[0];
                  if(topC&&compCounts[topC]>totalM*1.5) ops.push({tag:"PRIORYTET",color:S.coral,icon:"⚔️",title:"Konkurent dominuje",body:topC+" ma "+compCounts[topC]+" wzm. vs "+totalM+". Przeanalizuj ich treści i stwórz odpowiedniki."});
                  if(visM>0&&visC<visM/3) ops.push({tag:"QUICK WIN",color:S.purple,icon:"🏗️",title:"Tech gap — słabe cytowania",body:"Marka znana ("+visM+"% mentions) ale rzadko cytowana ("+visC+"%). Wdróż schema markup, structured data."});
                  if(best) ops.push({tag:"INSIGHT",color:S.green,icon:"↑",title:"Najlepsza: "+best.platform,body:"SOV "+best.sov+"% — "+(best.sov>=30?"silna pozycja do utrzymania.":best.sov>=10?"umiarkowana, rozbuduj FAQ i how-to.":"niska baza, twórz dedykowany content.")});
                  if(worst&&worst!==best) ops.push({tag:"INSIGHT",color:S.coral,icon:"↓",title:"Do działania: "+worst.platform,body:"SOV "+worst.sov+"% — "+(worst.sov===0?"brak obecności. Zbadaj zapytania tej platformy.":"najniższy SOV, twórz content w formacie tego modelu.")});
                  ops.push({tag:"SZANSA",color:S.gold,icon:"🔄",title:"Content freshness",body:"Modele AI preferują świeże treści. Aktualizuj strony kluczowe z datą, dodaj FAQ z aktualnymi danymi."});
                  if(ops.length<6) ops.push({tag:"QUICK WIN",color:S.green,icon:"🌐",title:"Entity building",body:"Zadbaj o wzmianki w zewnętrznych źródłach: katalogi branżowe, media, Wikipedia."});
                  return ops.slice(0,6).map((op,i)=>(
                    <div key={i} style={{padding:"12px 14px",background:op.color+"08",border:"1px solid "+op.color+"22",borderRadius:10}}>
                      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:6}}>
                        <span style={{fontSize:14}}>{op.icon}</span>
                        <span style={{fontSize:9,fontWeight:800,color:op.color,background:op.color+"20",borderRadius:4,padding:"1px 6px",letterSpacing:"0.8px",textTransform:"uppercase"}}>{op.tag}</span>
                        <span style={{fontSize:11,fontWeight:700,color:S.text}}>{op.title}</span>
                      </div>
                      <div style={{fontSize:11,color:S.mutedL,lineHeight:1.6}}>{op.body}</div>
                    </div>
                  ));
                })()}
              </div>
            </Card>

            <Btn onClick={()=>setTab("report")} style={{marginTop:20}}>Generuj Raport →</Btn>
          </div>
        )}

        {/* ── REPORT ── */}
        {tab==="report"&&(()=>{
          const autoCommentText=[
            "Klient: "+(brand.name||"[marka]")+(brand.url?" ("+brand.url+")":"")+(brand.industry?" | Branża: "+brand.industry:""),
            "",
            "Niniejszy raport przedstawia wyniki analizy widoczności marki w odpowiedziach generowanych przez modele AI. Analiza obejmuje "+totalQ.toLocaleString("pl-PL")+" zapytań na 6 platformach AI.",
            "",
            "AI Share of Voice: "+avgSOV+"% — "+(avgSOV>=30?"silna pozycja wśród konkurentów.":avgSOV>=10?"umiarkowana widoczność — wyraźny potencjał wzrostu.":"niska widoczność — kluczowe działania contentowe i entity building."),
            "Mention Rate: "+fmtPctSimple(visM)+" ("+totalM+" wzmianek na "+totalQ.toLocaleString("pl-PL")+" zapytań)",
            "Citation Rate: "+fmtPctSimple(visC)+" ("+totalC+" cytowań)",
            "",
            totalM===0&&totalC>0?"Marka cytowana przez AI ("+totalC+"x) ale nie wymieniana z nazwy — 'anonimowy ekspert'. Priorytet: entity signals (Wikipedia, Wikidata, About Us).":
            totalM>0&&totalC>totalM*5?"Wysoka dysproporcja: AI cytuje "+totalC+"x vs "+totalM+" wzmianek. Priorytet: branded anchor texty, wzmianki w mediach.":
            totalM>0?"Marka widoczna — "+totalM+" wzmianek. Kolejny krok: zwiększenie częstotliwości przez content plan (FAQ, how-to, porównania).":
            "Brak wzmianek i cytowań. Start: structured data i treści pod zapytania branżowe.",
            "",
            best?"Najlepsza platforma: "+best.platform+" (SOV "+best.sov+"%)"+( worst&&worst!==best?" | Do poprawy: "+worst.platform+" (SOV "+worst.sov+"%)":""):"",
            allComps.length>0?"Wykryci konkurenci: "+allComps.slice(0,4).map(c=>c+" ("+compCounts[c]+" wzm.)").join(", "):"",
            "",
            "Rekomendacje 3-6 mies.: (1) FAQ/how-to pod zapytania z niskim SOV. (2) Schema markup (Organization, FAQPage). (3) Monitoring i optymalizacja wzmianek.",
          ].filter(Boolean).join("\n");
          const commentText=editableComment!==null?editableComment:autoCommentText;
          return(
            <div>
              <STitle>Raport statyczny</STitle>
              <Card style={{marginBottom:18,border:"1px solid "+S.coral+"33"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                  <CLabel>✏️ Komentarz analityczny — edytuj przed wygenerowaniem</CLabel>
                  {editableComment!==null&&(<button onClick={()=>setEditableComment(null)} style={{fontSize:11,color:S.muted,background:"transparent",border:"1px solid "+S.border,borderRadius:6,padding:"3px 10px",cursor:"pointer"}}>↺ Przywróć auto</button>)}
                </div>
                <textarea value={commentText} onChange={e=>setEditableComment(e.target.value)}
                  style={{width:"100%",boxSizing:"border-box",background:S.navy1,border:"1px solid "+S.borderL,borderRadius:8,padding:"12px 14px",color:S.text,fontSize:12,lineHeight:1.7,outline:"none",resize:"vertical",minHeight:200,fontFamily:"inherit"}}/>
                <div style={{fontSize:10,color:S.muted,marginTop:5}}>Każda linia = osobny akapit w raporcie HTML.</div>
              </Card>
              {(topBrandKws.length>0||topGapKws.length>0)&&(
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:18}}>
                  {topBrandKws.length>0&&(
                    <Card style={{border:"1px solid "+S.green+"33"}}>
                      <CLabel>🎯 Top zapytania z wzmianką marki</CLabel>
                      <div style={{display:"flex",flexDirection:"column",gap:5}}>
                        {topBrandKws.map(([kw,vol],i)=>(
                          <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"5px 10px",background:S.navy1,borderRadius:6}}>
                            <span style={{fontSize:12,color:S.text,flex:1,marginRight:8,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{kw}</span>
                            {vol>0&&<span style={{fontSize:10,color:S.mutedL,fontFamily:"monospace",flexShrink:0}}>{vol.toLocaleString("pl-PL")}</span>}
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                  {topGapKws.length>0&&(
                    <Card style={{border:"1px solid "+S.coral+"33"}}>
                      <CLabel>⚠️ Luki — konkurenci wymieniani, marka nie</CLabel>
                      <div style={{display:"flex",flexDirection:"column",gap:5}}>
                        {topGapKws.map(([kw,{vol,comps}],i)=>(
                          <div key={i} style={{padding:"5px 10px",background:S.navy1,borderRadius:6}}>
                            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:2}}>
                              <span style={{fontSize:12,color:S.text,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{kw}</span>
                              {vol>0&&<span style={{fontSize:10,color:S.mutedL,fontFamily:"monospace",flexShrink:0}}>{vol.toLocaleString("pl-PL")}</span>}
                            </div>
                            <div style={{fontSize:10,color:S.coral}}>AI wymienia: {comps.join(", ")}</div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </div>
              )}
              <div style={{display:"flex",gap:10,marginBottom:18}}>
                <button onClick={openReport} style={{padding:"11px 22px",background:S.green+"18",border:"1px solid "+S.green+"55",borderRadius:10,color:S.green,fontSize:13,fontWeight:700,cursor:"pointer"}}>🔍 Otwórz podgląd</button>
                <button onClick={downloadReport} style={{padding:"11px 22px",background:S.sky+"18",border:"1px solid "+S.sky+"55",borderRadius:10,color:S.sky,fontSize:13,fontWeight:700,cursor:"pointer"}}>⬇ Pobierz .html</button>
              </div>
              <Card>
                <CLabel>Podgląd KPI</CLabel>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
                  {[{l:"AI SOV",v:fmtPctSimple(avgSOV),c:S.green},{l:"Mentions",v:fmtPct(visM,totalQ),c:S.sky},{l:"Citations",v:fmtPct(visC,totalQ),c:S.purple},{l:"Zapytań",v:totalQ.toLocaleString("pl-PL"),c:S.gold}].map((k,i)=>(
                    <div key={i} style={{textAlign:"center",padding:"12px",background:S.navy1,borderRadius:8,border:"1px solid "+k.c+"22",borderTop:"2px solid "+k.c}}>
                      <div style={{fontSize:9,color:S.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:4}}>{k.l}</div>
                      <div style={{fontSize:22,fontWeight:900,color:k.c}}>{k.v}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          );
        })()}

        {/* ── PROMPT ── */}
        {tab==="prompt"&&(
          <div>
            <STitle>Gotowy Prompt</STitle>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:18}}>
              {[
                {label:"Klient",value:brand.name||"—",color:S.green},
                {label:"URL",value:brand.url||"—",color:S.sky},
                {label:"Konkurenci (auto)",value:allComps.slice(0,3).join(", ")||"—",color:S.coral},
              ].map((x,i)=>(
                <div key={i} style={{background:S.navy2,border:"1px solid "+x.color+"22",borderRadius:10,padding:"12px 14px"}}>
                  <div style={{fontSize:9,color:S.muted,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.8px",fontWeight:700}}>{x.label}</div>
                  <div style={{fontSize:13,fontWeight:800,color:x.color,wordBreak:"break-word"}}>{x.value}</div>
                </div>
              ))}
            </div>
            <div style={{position:"relative"}}>
              <pre style={{background:S.navy1,border:"1px solid "+S.borderL,borderRadius:12,padding:"20px 22px",fontSize:12,lineHeight:1.8,color:S.mutedL,overflow:"auto",maxHeight:440,whiteSpace:"pre-wrap",fontFamily:"monospace"}}>{genPrompt()}</pre>
              <button onClick={()=>{navigator.clipboard.writeText(genPrompt());setPromptCopied(true);setTimeout(()=>setPromptCopied(false),2000);}}
                style={{position:"absolute",top:12,right:12,background:promptCopied?S.green+"22":S.navy3,border:"1px solid "+(promptCopied?S.green:S.borderL),borderRadius:8,padding:"7px 16px",color:promptCopied?S.green:S.mutedL,fontSize:12,fontWeight:700,cursor:"pointer",transition:"all .2s"}}>
                {promptCopied?"✓ Skopiowano!":"⎘ Kopiuj"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────── */
const STitle=({children})=>(
  <div style={{marginBottom:20}}>
    <h2 style={{margin:0,fontSize:17,fontWeight:800,color:S.text}}>{children}</h2>
    <div style={{width:32,height:2,background:"linear-gradient(90deg,"+S.green+",transparent)",marginTop:6}}/>
  </div>
);
const Inp=({label,value,set,ph,span2})=>{
  const[f,setF]=useState(false);
  return(
    <div style={span2?{gridColumn:"1/-1"}:{}}>
      <label style={{display:"block",fontSize:9,color:S.muted,marginBottom:5,fontWeight:700,letterSpacing:"0.8px",textTransform:"uppercase"}}>{label}</label>
      <input value={value} onChange={e=>set(e.target.value)} placeholder={ph} onFocus={()=>setF(true)} onBlur={()=>setF(false)}
        style={{width:"100%",boxSizing:"border-box",background:S.navy2,border:"1px solid "+(f?S.green+"66":S.borderL),borderRadius:8,padding:"9px 12px",color:S.text,fontSize:13,outline:"none",transition:"border .15s"}}/>
    </div>
  );
};
const Card=({children,style})=>(<div style={{background:S.navy2,border:"1px solid "+S.borderL,borderRadius:12,padding:"16px 18px",...style}}>{children}</div>);
const CLabel=({children})=>(<div style={{fontSize:9,color:S.muted,marginBottom:10,fontWeight:700,letterSpacing:"1.2px",textTransform:"uppercase"}}>{children}</div>);
const Btn=({children,onClick,disabled,muted,style})=>(
  <button onClick={onClick} disabled={disabled}
    style={{marginTop:16,padding:"10px 24px",background:disabled||muted?"transparent":S.green+"18",border:"1px solid "+(disabled?S.border:muted?S.muted+"44":S.green+"55"),borderRadius:10,color:disabled?S.borderL:muted?S.muted:S.green,fontSize:13,fontWeight:700,cursor:disabled?"not-allowed":"pointer",transition:"all .15s",...style}}>
    {children}
  </button>
);
