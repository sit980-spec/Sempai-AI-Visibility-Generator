import { useState, useRef, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, AreaChart, Area,
} from "recharts";

const S = {
  navy1: "#07111f", navy2: "#0c1a2e", navy3: "#112240", navy4: "#1a3358",
  green: "#2edf8f", greenD: "#20b571", coral: "#ff5c6a",
  gold: "#f5c842", sky: "#4da6ff", purple: "#a78bfa",
  text: "#e8f0ff", muted: "#4a7090", border: "#1a3354",
};

const PLATFORMS = [
  { id: "ai_overview", name: "AI Overview",  short: "AI Overview", color: S.sky,     icon: "G" },
  { id: "ai_mode",     name: "AI Mode",       short: "AI Mode",     color: "#34d399", icon: "M" },
  { id: "chatgpt",     name: "ChatGPT",        short: "ChatGPT",     color: S.green,   icon: "⚡" },
  { id: "gemini",      name: "Gemini",          short: "Gemini",      color: S.coral,   icon: "◆" },
  { id: "perplexity",  name: "Perplexity",      short: "Perplexity",  color: S.purple,  icon: "◈" },
  { id: "copilot",     name: "Copilot",          short: "Copilot",     color: S.gold,    icon: "✦" },
];

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = line.split(",").map(v => v.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ""; });
    return obj;
  });
}

function parseBrandedSearches(rows) {
  if (!rows.length) return [];
  const first = rows[0];
  const dateCol = ["month","date","okres","miesiąc"].find(k => first[k] !== undefined) || Object.keys(first)[0];
  const valCol  = ["searches","branded_searches","count","wyszukiwania","liczba"].find(k => first[k] !== undefined) || Object.keys(first)[1];
  return rows.map(r => ({ month: r[dateCol] || "—", v: parseFloat(r[valCol]) || 0 }));
}

function ParticleBg() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf;
    canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight;
    const W = canvas.width, H = canvas.height;
    const pts = Array.from({ length: 40 }, () => ({
      x: Math.random()*W, y: Math.random()*H,
      vx:(Math.random()-.5)*.25, vy:(Math.random()-.5)*.25,
      r: Math.random()*1.2+.4, a: Math.random()*.4+.1,
    }));
    function draw() {
      ctx.clearRect(0,0,W,H);
      pts.forEach(p => {
        p.x+=p.vx; p.y+=p.vy;
        if(p.x<0)p.x=W; if(p.x>W)p.x=0;
        if(p.y<0)p.y=H; if(p.y>H)p.y=0;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(46,223,143,${p.a*.2})`; ctx.fill();
      });
      for(let i=0;i<pts.length;i++) for(let j=i+1;j<pts.length;j++){
        const d=Math.hypot(pts[i].x-pts[j].x,pts[i].y-pts[j].y);
        if(d<85){
          ctx.beginPath(); ctx.moveTo(pts[i].x,pts[i].y); ctx.lineTo(pts[j].x,pts[j].y);
          ctx.strokeStyle=`rgba(46,223,143,${(1-d/85)*.05})`; ctx.lineWidth=1; ctx.stroke();
        }
      }
      raf=requestAnimationFrame(draw);
    }
    draw();
    return ()=>cancelAnimationFrame(raf);
  },[]);
  return <canvas ref={ref} style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}}/>;
}

function SignalScanner({ data }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let frame = 0, raf;
    const W = canvas.offsetWidth || 800;
    canvas.width = W; canvas.height = 90;
    const gap = W / PLATFORMS.length;
    const nodes = PLATFORMS.map((p,i) => ({
      x: gap*i+gap/2, y:48, color:p.color, label:p.short,
      score: data[p.id]?.total>0 ? Math.round((data[p.id].mentions/data[p.id].total)*100) : 0,
    }));
    function draw() {
      ctx.clearRect(0,0,W,90); frame++;
      for(let i=0;i<nodes.length-1;i++){
        const a=nodes[i],b=nodes[i+1];
        ctx.beginPath(); ctx.moveTo(a.x+18,a.y); ctx.lineTo(b.x-18,b.y);
        ctx.strokeStyle="#1a335455"; ctx.lineWidth=1; ctx.stroke();
        const t=(frame*.016+i*.2)%1;
        const px=(a.x+18)+((b.x-18)-(a.x+18))*t;
        ctx.beginPath(); ctx.arc(px,a.y,2.5,0,Math.PI*2);
        ctx.fillStyle=S.green+"cc"; ctx.fill();
      }
      nodes.forEach(n=>{
        const pulse=(frame*.022)%1;
        ctx.beginPath(); ctx.arc(n.x,n.y,17+pulse*15,0,Math.PI*2);
        ctx.strokeStyle=n.color+Math.floor((1-pulse)*66).toString(16).padStart(2,"0");
        ctx.lineWidth=1.5; ctx.stroke();
        const g=ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,17);
        g.addColorStop(0,n.color+"28"); g.addColorStop(1,n.color+"04");
        ctx.beginPath(); ctx.arc(n.x,n.y,17,0,Math.PI*2);
        ctx.fillStyle=g; ctx.fill(); ctx.strokeStyle=n.color+"88"; ctx.lineWidth=2; ctx.stroke();
        ctx.fillStyle=n.color; ctx.font="bold 11px monospace"; ctx.textAlign="center";
        ctx.fillText(n.score+"%",n.x,n.y+4);
        ctx.fillStyle=S.muted; ctx.font="9px monospace";
        ctx.fillText(n.label,n.x,n.y+27);
      });
      raf=requestAnimationFrame(draw);
    }
    draw();
    return ()=>cancelAnimationFrame(raf);
  },[data]);
  return <canvas ref={ref} width={800} height={90} style={{width:"100%",display:"block"}}/>;
}

function DropZone({ label, color=S.green, onData, hasData }) {
  const [drag, setDrag] = useState(false);
  const ref = useRef();
  const handle = file => {
    const r = new FileReader();
    r.onload = e => onData(parseCSV(e.target.result));
    r.readAsText(file);
  };
  return (
    <div
      onDragOver={e=>{e.preventDefault();setDrag(true);}}
      onDragLeave={()=>setDrag(false)}
      onDrop={e=>{e.preventDefault();setDrag(false);if(e.dataTransfer.files[0])handle(e.dataTransfer.files[0]);}}
      onClick={()=>ref.current.click()}
      style={{border:`1.5px dashed ${drag?color:hasData?color+"88":S.border}`,borderRadius:10,padding:"16px 8px",cursor:"pointer",textAlign:"center",background:drag?color+"12":hasData?color+"09":"transparent",transition:"all .2s"}}>
      <input ref={ref} type="file" accept=".csv" style={{display:"none"}} onChange={e=>{if(e.target.files[0])handle(e.target.files[0]);}}/>
      <div style={{fontSize:18,marginBottom:4}}>{hasData?"✅":"📂"}</div>
      <div style={{fontSize:10,fontFamily:"monospace",color:hasData?color:S.muted}}>{hasData?"Załadowano":"Upuść CSV"}</div>
      {label&&<div style={{fontSize:9,color:"#233550",marginTop:2}}>{label}</div>}
    </div>
  );
}

const Tip = ({active,payload,label}) => {
  if(!active||!payload?.length) return null;
  return (
    <div style={{background:S.navy3,border:`1px solid ${S.border}`,borderRadius:8,padding:"10px 14px"}}>
      <div style={{fontSize:10,color:S.muted,marginBottom:5}}>{label}</div>
      {payload.map((p,i)=><div key={i} style={{fontSize:12,color:p.color,fontWeight:700}}>{p.name}: {p.value}</div>)}
    </div>
  );
};

function buildReport({brand,comps,proc,sovData,totalQ,totalM,totalC,visM,visC,avgSOV,bs,best,worst}) {
  const date = new Date().toLocaleDateString("pl-PL",{year:"numeric",month:"long",day:"numeric"});
  const trendPct = bs.length>=2 ? Math.round(((bs[bs.length-1].v-bs[0].v)/Math.max(bs[0].v,1))*100) : null;
  const rows = PLATFORMS.map(p => {
    const d=proc[p.id];
    const allM=d.mentions+comps.reduce((s,c)=>s+(d.compData[c]?.mentions||0),0);
    const sov=allM>0?Math.round((d.mentions/allM)*100):0;
    const mR=d.total>0?Math.round((d.mentions/d.total)*100):0;
    const cR=d.total>0?Math.round((d.citations/d.total)*100):0;
    return {...p,...d,sov,mR,cR};
  });
  const compRows = comps.map(c=>({
    name:c,
    mentions:PLATFORMS.reduce((s,p)=>s+(proc[p.id]?.compData[c]?.mentions||0),0),
    citations:PLATFORMS.reduce((s,p)=>s+(proc[p.id]?.compData[c]?.citations||0),0),
  }));

  return `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8"/>
<title>Sempai AI Visibility — ${brand.name||"Raport"}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800;900&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'DM Sans',sans-serif;background:#fff;color:#1a2a3a;font-size:14px;line-height:1.6}
.page{max-width:960px;margin:0 auto;padding:52px 44px}
.header{border-bottom:3px solid #2edf8f;padding-bottom:28px;margin-bottom:36px}
.logo{display:flex;align-items:center;gap:10px;margin-bottom:18px}
.s{width:38px;height:38px;background:#0c1a2e;border-radius:9px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:19px;color:#2edf8f;border:1.5px solid #2edf8f55;flex-shrink:0}
.brand{font-size:19px;font-weight:800;color:#07111f}
.badge{font-size:10px;font-weight:700;color:#2edf8f;background:#2edf8f15;border:1px solid #2edf8f44;border-radius:4px;padding:2px 8px;letter-spacing:1px;text-transform:uppercase}
h1{font-size:28px;font-weight:900;color:#07111f;letter-spacing:-.5px;margin-bottom:8px}
.meta{color:#4a7090;font-size:13px}
.meta strong{color:#1a2a3a}
.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:36px}
.kpi{background:#f8faff;border:1px solid #dde8f5;border-radius:12px;padding:20px 16px;border-top:3px solid}
.kl{font-size:9px;text-transform:uppercase;letter-spacing:1px;font-weight:700;color:#4a7090;margin-bottom:8px}
.kv{font-size:30px;font-weight:900;line-height:1;margin-bottom:4px}
.ks{font-size:10px;color:#8899aa}
.pb-wrap{margin-top:10px;height:4px;background:#e0eaf5;border-radius:2px;overflow:hidden}
.pb{height:100%;border-radius:2px}
section{margin-bottom:40px}
h2{font-size:17px;font-weight:800;color:#07111f;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid #eef2f8;display:flex;align-items:center;gap:10px}
h2 .num{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;background:#2edf8f18;border-radius:6px;color:#2edf8f;font-size:12px;font-weight:900;flex-shrink:0}
table{width:100%;border-collapse:collapse;font-size:13px}
thead tr{background:#f2f7ff}
th{padding:11px 13px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.8px;font-weight:700;color:#4a7090;border-bottom:2px solid #dde8f5}
td{padding:11px 13px;border-bottom:1px solid #f0f5fb;vertical-align:middle}
tr:last-child td{border-bottom:none}
tr:hover td{background:#f8fbff}
.tag{display:inline-block;padding:2px 9px;border-radius:5px;font-size:11px;font-weight:700}
.bar-row{display:flex;align-items:center;gap:9px}
.bar-bg{height:7px;width:64px;background:#e0eaf5;border-radius:3px;overflow:hidden;flex-shrink:0}
.bar-fg{height:100%;border-radius:3px}
.green{color:#1db872} .mid{color:#d4a017} .red{color:#e03050}
.insight-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.ins{padding:14px 16px;border-radius:10px;border:1px solid;display:flex;gap:11px}
.ins-icon{font-size:15px;font-weight:900;flex-shrink:0;line-height:1.4}
.ins-text{font-size:12px;line-height:1.6;color:#3a5570}
.bs-row{display:flex;flex-wrap:wrap;gap:10px}
.bs-card{background:#f8faff;border:1px solid #dde8f5;border-radius:9px;padding:12px 14px;text-align:center;min-width:72px}
.bs-m{font-size:9px;color:#4a7090;font-weight:700;text-transform:uppercase;margin-bottom:4px;letter-spacing:.5px}
.bs-v{font-size:18px;font-weight:900;color:#07111f}
.bs-bar{margin-top:7px;height:4px;background:#e0eaf5;border-radius:2px;overflow:hidden}
.footer{margin-top:52px;padding-top:22px;border-top:1px solid #e8f0f5;display:flex;justify-content:space-between;align-items:center}
.ft-name{font-weight:800;color:#07111f;font-size:13px}
.ft-sub{font-size:11px;color:#4a7090;margin-top:2px}
.benchmark-row td{background:#f0fff8!important;font-weight:600}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}@page{margin:1.5cm}}
</style>
</head>
<body>
<div class="page">
<div class="header">
  <div class="logo">
    <div class="s">S</div>
    <span class="brand">sempai</span>
    <span class="badge">AI Visibility</span>
  </div>
  <h1>Raport Widoczności AI</h1>
  <p class="meta">
    Klient: <strong>${brand.name||"—"}</strong>
    ${brand.url?` &middot; URL: <strong>${brand.url}</strong>`:""}
    ${brand.industry?` &middot; Branża: <strong>${brand.industry}</strong>`:""}
    &middot; Data: ${date}
    ${comps.length>0?` &middot; Konkurenci: <strong>${comps.join(", ")}</strong>`:""}
  </p>
</div>
<div class="kpi-grid">
  <div class="kpi" style="border-top-color:#2edf8f">
    <div class="kl">AI Share of Voice</div>
    <div class="kv" style="color:#2edf8f">${avgSOV}%</div>
    <div class="ks">Średnia SOV platform</div>
    <div class="pb-wrap"><div class="pb" style="width:${avgSOV}%;background:#2edf8f"></div></div>
  </div>
  <div class="kpi" style="border-top-color:#4da6ff">
    <div class="kl">Visibility Score</div>
    <div class="kv" style="color:#4da6ff">${visM}%</div>
    <div class="ks">Mention Rate</div>
    <div class="pb-wrap"><div class="pb" style="width:${visM}%;background:#4da6ff"></div></div>
  </div>
  <div class="kpi" style="border-top-color:#a78bfa">
    <div class="kl">Citation Score</div>
    <div class="kv" style="color:#a78bfa">${visC}%</div>
    <div class="ks">Citation Rate</div>
    <div class="pb-wrap"><div class="pb" style="width:${visC}%;background:#a78bfa"></div></div>
  </div>
  <div class="kpi" style="border-top-color:#f5c842">
    <div class="kl">Łączne zapytania</div>
    <div class="kv" style="color:#f5c842">${totalQ.toLocaleString("pl-PL")}</div>
    <div class="ks">${totalM} wzm. · ${totalC} cyt.</div>
  </div>
</div>
<section>
  <h2><span class="num">01</span> AI Share of Voice — per platforma</h2>
  <table>
    <thead><tr>
      <th>Platforma</th><th>Zapytań</th><th>Wzmianki</th><th>Cytowania</th>
      <th>SOV %</th><th>Mention Rate</th><th>Citation Rate</th>
    </tr></thead>
    <tbody>
      ${rows.map(r=>`<tr>
        <td><span class="tag" style="background:${r.color}18;color:${r.color}">${r.icon} ${r.name}</span></td>
        <td>${r.total}</td>
        <td><strong style="color:#1db872">${r.mentions}</strong></td>
        <td><strong style="color:#2a7abf">${r.citations}</strong></td>
        <td><div class="bar-row"><div class="bar-bg"><div class="bar-fg" style="width:${r.sov}%;background:${r.color}"></div></div><strong>${r.sov}%</strong></div></td>
        <td class="${r.mR>=50?"green":r.mR>=25?"mid":"red"}">${r.mR}%</td>
        <td class="${r.cR>=30?"green":r.cR>=15?"mid":"red"}">${r.cR}%</td>
      </tr>`).join("")}
    </tbody>
  </table>
</section>
${compRows.length>0?`
<section>
  <h2><span class="num">02</span> Analiza konkurencji</h2>
  <table>
    <thead><tr><th>Podmiot</th><th>Łączne wzmianki</th><th>Łączne cytowania</th><th>Różnica wzm.</th></tr></thead>
    <tbody>
      <tr class="benchmark-row">
        <td><span class="tag" style="background:#2edf8f18;color:#1db872">✦ ${brand.name||"Twoja marka"}</span></td>
        <td><strong style="color:#1db872">${totalM}</strong></td>
        <td><strong style="color:#2a7abf">${totalC}</strong></td>
        <td><span class="tag" style="background:#2edf8f18;color:#1db872">Benchmark</span></td>
      </tr>
      ${compRows.map(c=>{const diff=totalM-c.mentions;return`<tr><td>${c.name}</td><td>${c.mentions}</td><td>${c.citations}</td><td class="${diff>=0?"green":"red"}">${diff>=0?"+":""}${diff}</td></tr>`;}).join("")}
    </tbody>
  </table>
</section>`:""}
${bs.length>0?`
<section>
  <h2><span class="num">0${compRows.length>0?3:2}</span> Wzrost Branded Searches</h2>
  ${trendPct!==null?`<p style="font-size:13px;color:#3a5570;margin-bottom:16px">Trend: <strong style="color:${trendPct>=0?"#1db872":"#e03050"}">${trendPct>=0?"+":""}${trendPct}%</strong> &nbsp;(${bs[0].v.toLocaleString("pl-PL")} → ${bs[bs.length-1].v.toLocaleString("pl-PL")})</p>`:""}
  <div class="bs-row">
    ${(()=>{const max=Math.max(...bs.map(b=>b.v));return bs.map(x=>`<div class="bs-card"><div class="bs-m">${x.month}</div><div class="bs-v">${x.v.toLocaleString("pl-PL")}</div><div class="bs-bar"><div style="width:${max>0?Math.round((x.v/max)*100):0}%;height:100%;background:#2edf8f;border-radius:2px"></div></div></div>`).join("")})()}
  </div>
</section>`:""}
<section>
  <h2><span class="num">★</span> Kluczowe spostrzeżenia i rekomendacje</h2>
  <div class="insight-grid">
    ${best?`<div class="ins" style="background:#2edf8f08;border-color:#2edf8f2a"><span class="ins-icon" style="color:#1db872">↑</span><span class="ins-text"><strong>Najlepsza platforma:</strong> ${best.platform} z SOV ${best.sov}% — koncentrować działania optymalizacyjne na utrzymaniu tej pozycji.</span></div>`:""}
    ${worst&&worst!==best?`<div class="ins" style="background:#ff5c6a08;border-color:#ff5c6a2a"><span class="ins-icon" style="color:#e03050">↓</span><span class="ins-text"><strong>Platforma do poprawy:</strong> ${worst.platform} (SOV ${worst.sov}%) — wdrożyć dedykowaną strategię treści.</span></div>`:""}
    ${visM>visC?`<div class="ins" style="background:#a78bfa08;border-color:#a78bfa2a"><span class="ins-icon" style="color:#a78bfa">!</span><span class="ins-text"><strong>Dysproporcja wzmianki/cytowania:</strong> ${visM}% vs ${visC}% — priorytet: structured data, E-E-A-T.</span></div>`:`<div class="ins" style="background:#2edf8f08;border-color:#2edf8f2a"><span class="ins-icon" style="color:#1db872">✓</span><span class="ins-text"><strong>Zdrowa korelacja</strong> wzmianek (${visM}%) i cytowań (${visC}%) — dobry autorytet techniczny.</span></div>`}
    <div class="ins" style="background:#4da6ff08;border-color:#4da6ff2a"><span class="ins-icon" style="color:#4da6ff">◈</span><span class="ins-text"><strong>Zasięg AI:</strong> ${brand.name||"Marka"} widoczna w <strong>${PLATFORMS.filter(p=>proc[p.id]?.mentions>0).length}/${PLATFORMS.length}</strong> platformach AI.${PLATFORMS.filter(p=>proc[p.id]?.mentions===0).length>0?" Brak wzmianek: "+PLATFORMS.filter(p=>proc[p.id]?.mentions===0).map(p=>p.short).join(", ")+".":""}</span></div>
    ${trendPct!==null?`<div class="ins" style="background:#f5c84208;border-color:#f5c8422a"><span class="ins-icon" style="color:#d4a017">📈</span><span class="ins-text"><strong>Brand Lift:</strong> Branded searches ${trendPct>=0?"wzrosły":"spadły"} o <strong>${Math.abs(trendPct)}%</strong> — ${trendPct>=0?"widoczność AI generuje realny wzrost świadomości marki.":"warto zintensyfikować działania content marketingowe."}</span></div>`:""}
    <div class="ins" style="background:#f5c84208;border-color:#f5c8422a"><span class="ins-icon" style="color:#d4a017">→</span><span class="ins-text"><strong>Strategia 3-6 mies.:</strong> FAQ, how-to, schema markup, authority linki i wzmianki w zewnętrznych źródłach.</span></div>
  </div>
</section>
<div class="footer">
  <div><div class="ft-name">sempai · Let us perform!</div><div class="ft-sub">sempai.pl · AI Visibility Report Generator</div></div>
  <div style="font-size:11px;color:#8899aa">Raport wygenerowany: ${date}</div>
</div>
</div></body></html>`;
}

export default function App() {
  const [tab, setTab] = useState("setup");
  const [brand, setBrand] = useState({ name:"", url:"", industry:"", competitors:"" });
  const [csvData, setCsvData] = useState({});
  const [bsCsv, setBsCsv]     = useState(null);
  const [bsManual, setBsManual] = useState([
    {month:"Sty",v:1200},{month:"Lut",v:1450},{month:"Mar",v:1380},
    {month:"Kwi",v:1680},{month:"Maj",v:1920},{month:"Cze",v:2250},
  ]);
  const [promptCopied, setPromptCopied] = useState(false);

  const bs = bsCsv ? parseBrandedSearches(bsCsv) : bsManual;
  const comps = brand.competitors ? brand.competitors.split(",").map(c=>c.trim()).filter(Boolean) : [];

  const proc = {};
  PLATFORMS.forEach(p => {
    const rows = csvData[p.id] || [];
    const total = rows.length;
    const mentions  = rows.filter(r=>r.brand_mentioned==="1"||r.brand_mentioned?.toLowerCase()==="true").length;
    const citations = rows.filter(r=>r.brand_cited==="1"    ||r.brand_cited?.toLowerCase()==="true").length;
    const compData  = {};
    comps.forEach((c,i) => {
      compData[c] = {
        mentions:  rows.filter(r=>r[`comp${i+1}_mentioned`]==="1").length,
        citations: rows.filter(r=>r[`comp${i+1}_cited`]    ==="1").length,
      };
    });
    proc[p.id] = { total, mentions, citations, compData };
  });

  const totalQ = PLATFORMS.reduce((s,p)=>s+(proc[p.id]?.total    ||0),0);
  const totalM = PLATFORMS.reduce((s,p)=>s+(proc[p.id]?.mentions  ||0),0);
  const totalC = PLATFORMS.reduce((s,p)=>s+(proc[p.id]?.citations ||0),0);
  const visM   = totalQ>0 ? Math.round((totalM/totalQ)*100) : 0;
  const visC   = totalQ>0 ? Math.round((totalC/totalQ)*100) : 0;

  const sovData = PLATFORMS.map(p => {
    const d = proc[p.id];
    const allM = d.mentions + comps.reduce((s,c)=>s+(d.compData[c]?.mentions||0),0);
    return { platform:p.short, color:p.color, sov:allM>0?Math.round((d.mentions/allM)*100):0, mentions:d.mentions, citations:d.citations, total:d.total };
  });

  const active  = sovData.filter(d=>d.total>0);
  const avgSOV  = active.length>0 ? Math.round(active.reduce((s,d)=>s+d.sov,0)/active.length) : 0;
  const ranked  = [...active].sort((a,b)=>b.sov-a.sov);
  const best    = ranked[0], worst = ranked[ranked.length-1];

  const radarData = PLATFORMS.map(p=>({
    platform: p.short,
    Wzmianki:  proc[p.id]?.total>0?Math.round((proc[p.id].mentions  /proc[p.id].total)*100):0,
    Cytowania: proc[p.id]?.total>0?Math.round((proc[p.id].citations /proc[p.id].total)*100):0,
  }));

  const openReport = () => {
    const html = buildReport({brand,comps,proc,sovData,totalQ,totalM,totalC,visM,visC,avgSOV,bs,best,worst});
    window.open(URL.createObjectURL(new Blob([html],{type:"text/html;charset=utf-8"})),"_blank");
  };

  const downloadReport = () => {
    const html = buildReport({brand,comps,proc,sovData,totalQ,totalM,totalC,visM,visC,avgSOV,bs,best,worst});
    const a = document.createElement("a");
    a.href = "data:text/html;charset=utf-8,"+encodeURIComponent(html);
    a.download = `Sempai_AIVisibility_${brand.name||"Raport"}_${new Date().toISOString().slice(0,10)}.html`;
    a.click();
  };

  const genPrompt = () => {
    const pRows = PLATFORMS.map(p=>{const d=proc[p.id];const mR=d.total>0?Math.round((d.mentions/d.total)*100):0;const cR=d.total>0?Math.round((d.citations/d.total)*100):0;return `• ${p.name}: ${d.mentions}/${d.total} wzm. (${mR}%), ${d.citations} cyt. (${cR}%)`;}).join("\n");
    return `Jesteś ekspertem ds. AI Visibility. Przygotuj raport w języku polskim jako .docx.\n\nKLIENT: ${brand.name||"[KLIENT]"} | URL: ${brand.url||"—"} | Branża: ${brand.industry||"—"}\nKONKURENCI: ${comps.join(", ")||"brak"}\n\nDANE:\nSOV: ${avgSOV}% | Mentions: ${visM}% | Citations: ${visC}% | Zapytań: ${totalQ}\n${pRows}\n${best?`Najlepsza: ${best.platform} SOV ${best.sov}%`:""}${worst&&worst!==best?` | Do poprawy: ${worst.platform} SOV ${worst.sov}%`:""}\n\nSEKCJE:\n1. AI Share of Voice (4 akapity)\n2. Brand Mentions (4)\n3. Visibility Score Mentions (3)\n4. Visibility Score Citations (4)\n5. Branded Searches (3)\n6. Komentarz całościowy: mocne strony x3, obszary do poprawy x3, strategia 3-6 mies. (5)\n\nJęzyk: polski | każdy wniosek = konkretna liczba | porównania do konkurencji\n[ZAŁĄCZ PLIK .DOCX Z RAPORTEM]`;
  };

  const TABS = [
    {id:"setup",label:"① Klient"},
    {id:"import",label:"② Import CSV"},
    {id:"dashboard",label:"③ Dashboard"},
    {id:"report",label:"④ Raport"},
    {id:"prompt",label:"⑤ Prompt"},
  ];

  return (
    <div style={{minHeight:"100vh",background:S.navy1,color:S.text,fontFamily:"'DM Sans','Segoe UI',sans-serif"}}>
      <div style={{background:S.navy2,borderBottom:`1px solid ${S.border}`,position:"relative",overflow:"hidden",minHeight:118}}>
        <ParticleBg/>
        <div style={{position:"relative",maxWidth:1000,margin:"0 auto",padding:"24px 28px 0"}}>
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20}}>
            <div style={{width:42,height:42,borderRadius:10,flexShrink:0,background:`linear-gradient(135deg,${S.green}20,${S.navy4})`,border:`1.5px solid ${S.green}55`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:20,color:S.green}}>S</div>
            <div>
              <div style={{display:"flex",alignItems:"baseline",gap:10}}>
                <span style={{fontSize:21,fontWeight:800,color:S.text}}>sempai</span>
                <span style={{fontSize:11,fontWeight:700,color:S.green,background:S.green+"18",border:`1px solid ${S.green}44`,borderRadius:5,padding:"1px 8px",letterSpacing:"1.2px",textTransform:"uppercase"}}>AI Visibility</span>
              </div>
              <div style={{fontSize:10,color:S.muted,letterSpacing:"2px",textTransform:"uppercase",marginTop:1}}>Report Generator · Let us perform!</div>
            </div>
          </div>
          <div style={{display:"flex",overflowX:"auto"}}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"9px 20px",background:"transparent",border:"none",borderBottom:tab===t.id?`2px solid ${S.green}`:"2px solid transparent",color:tab===t.id?S.green:S.muted,fontSize:13,fontWeight:600,cursor:"pointer",transition:"all .15s",whiteSpace:"nowrap"}}>{t.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{maxWidth:1000,margin:"0 auto",padding:"30px 28px 60px"}}>

        {tab==="setup"&&(
          <div>
            <STitle>Dane klienta</STitle>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
              <Inp label="Nazwa klienta / marki *" value={brand.name} set={v=>setBrand(b=>({...b,name:v}))} ph="np. TechCorp Polska"/>
              <Inp label="URL strony" value={brand.url} set={v=>setBrand(b=>({...b,url:v}))} ph="np. techcorp.pl"/>
              <Inp label="Branża *" value={brand.industry} set={v=>setBrand(b=>({...b,industry:v}))} ph="np. SaaS / CRM / E-commerce"/>
              <Inp label="Konkurenci (oddziel przecinkami)" value={brand.competitors} set={v=>setBrand(b=>({...b,competitors:v}))} ph="Salesforce, HubSpot, Pipedrive"/>
            </div>
            {comps.length>0&&(
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:20}}>
                {comps.map((c,i)=>{const cols=[S.green,S.sky,S.coral,S.gold,S.purple,"#34d399"];return <span key={i} style={{padding:"4px 13px",borderRadius:20,fontSize:12,fontWeight:700,background:cols[i%6]+"1a",border:`1px solid ${cols[i%6]}44`,color:cols[i%6]}}>{c}</span>;})}
              </div>
            )}
            <Card>
              <CLabel>Format CSV — platformy Ahrefs</CLabel>
              <pre style={{fontSize:11,color:S.green,background:S.navy1,padding:"12px 14px",borderRadius:8,border:`1px solid ${S.border}`,overflow:"auto",lineHeight:1.9,margin:"0 0 12px",fontFamily:"monospace"}}>{`query,brand_mentioned,brand_cited,comp1_mentioned,comp1_cited\nbest crm software,1,1,1,0\ntop marketing tools,1,0,1,1`}</pre>
              <CLabel>Format CSV — Branded Searches</CLabel>
              <pre style={{fontSize:11,color:S.coral,background:S.navy1,padding:"12px 14px",borderRadius:8,border:`1px solid ${S.border}`,overflow:"auto",lineHeight:1.9,margin:0,fontFamily:"monospace"}}>{`month,searches\nStyczeń,1200\nLuty,1450`}</pre>
            </Card>
            <Btn onClick={()=>setTab("import")} disabled={!(brand.name&&brand.industry)}>Dalej → Import CSV</Btn>
          </div>
        )}

        {tab==="import"&&(
          <div>
            <STitle>Import danych CSV</STitle>
            <p style={{fontSize:13,color:S.muted,marginBottom:20}}>Wgraj CSV dla każdej platformy z Ahrefs. Brak pliku = wynik 0.</p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:12,marginBottom:26}}>
              {PLATFORMS.map(p=>(
                <DropZone key={p.id} label={p.short} color={p.color} hasData={!!csvData[p.id]} onData={rows=>setCsvData(d=>({...d,[p.id]:rows}))}/>
              ))}
            </div>
            <Card style={{marginBottom:20}}>
              <CLabel>📈 Branded Searches — CSV lub ręcznie</CLabel>
              <div style={{display:"grid",gridTemplateColumns:"180px 1fr",gap:20,alignItems:"start"}}>
                <div>
                  <DropZone label="Branded Searches CSV" color={S.coral} hasData={!!bsCsv} onData={rows=>setBsCsv(rows)}/>
                  {bsCsv&&<button onClick={()=>setBsCsv(null)} style={{marginTop:8,fontSize:11,color:S.muted,background:"none",border:`1px solid ${S.border}`,borderRadius:6,padding:"4px 10px",cursor:"pointer",width:"100%"}}>✕ Usuń CSV</button>}
                </div>
                <div>
                  <div style={{fontSize:10,color:S.muted,marginBottom:8,fontWeight:700}}>{bsCsv?`✅ Auto-import: ${bs.length} rekordów`:"Dane ręczne"}</div>
                  {!bsCsv?(
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                      {bsManual.map((item,i)=>(
                        <div key={i}>
                          <div style={{fontSize:9,color:S.muted,marginBottom:3,fontWeight:700,textTransform:"uppercase"}}>{item.month}</div>
                          <input type="number" value={item.v} onChange={e=>setBsManual(arr=>arr.map((x,j)=>j===i?{...x,v:+e.target.value}:x))} style={{width:"100%",boxSizing:"border-box",background:S.navy1,border:`1px solid ${S.border}`,borderRadius:6,padding:"7px",color:S.text,fontSize:12,fontFamily:"monospace"}}/>
                        </div>
                      ))}
                    </div>
                  ):(
                    <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                      {bs.map((x,i)=>(
                        <div key={i} style={{background:S.navy1,border:`1px solid ${S.border}`,borderRadius:8,padding:"8px 12px",textAlign:"center",minWidth:70}}>
                          <div style={{fontSize:9,color:S.muted,fontWeight:700,textTransform:"uppercase"}}>{x.month}</div>
                          <div style={{fontSize:15,fontWeight:900,color:S.coral}}>{x.v.toLocaleString("pl-PL")}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
            <div style={{display:"flex",gap:12}}>
              <Btn onClick={()=>setTab("setup")} muted>← Wróć</Btn>
              <Btn onClick={()=>setTab("dashboard")}>Dashboard →</Btn>
            </div>
          </div>
        )}

        {tab==="dashboard"&&(
          <div>
            <STitle>Dashboard Widoczności AI</STitle>
            <Card style={{marginBottom:18}}><CLabel>◈ AI Signal Scanner</CLabel><SignalScanner data={proc}/></Card>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:18}}>
              {[
                {label:"AI Share of Voice",value:avgSOV+"%",color:S.green,sub:"Średnia SOV"},
                {label:"Visibility Score",  value:visM+"%",  color:S.sky,   sub:"Mention Rate"},
                {label:"Citation Score",    value:visC+"%",  color:S.purple,sub:"Citation Rate"},
                {label:"Łączne zapytania",  value:totalQ,    color:S.gold,  sub:"Wszystkie platformy"},
              ].map((k,i)=>(
                <div key={i} style={{background:S.navy2,border:`1px solid ${k.color}1a`,borderRadius:12,padding:"18px 16px",position:"relative",overflow:"hidden"}}>
                  <div style={{position:"absolute",top:-20,right:-20,width:80,height:80,borderRadius:"50%",background:k.color+"0b"}}/>
                  <div style={{fontSize:9,color:S.muted,textTransform:"uppercase",letterSpacing:"1px",fontWeight:700,marginBottom:8}}>{k.label}</div>
                  <div style={{fontSize:32,fontWeight:900,color:k.color,lineHeight:1}}>{k.value}</div>
                  <div style={{fontSize:9,color:"#233550",marginTop:5}}>{k.sub}</div>
                  {typeof k.value==="string"&&k.value.endsWith("%")&&<div style={{marginTop:10,height:3,background:S.navy4,borderRadius:2,overflow:"hidden"}}><div style={{width:k.value,height:"100%",background:k.color,borderRadius:2}}/></div>}
                </div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"3fr 2fr",gap:14,marginBottom:14}}>
              <Card>
                <CLabel>AI Share of Voice — per platforma</CLabel>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={sovData} margin={{top:10,right:10,left:-22,bottom:0}}>
                    <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={S.green}/><stop offset="100%" stopColor={S.greenD+"77"}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="2 4" stroke={S.border}/>
                    <XAxis dataKey="platform" tick={{fill:S.muted,fontSize:10}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:S.muted,fontSize:10}} axisLine={false} tickLine={false} domain={[0,100]}/>
                    <Tooltip content={<Tip/>}/>
                    <Bar dataKey="sov" name="SOV %" fill="url(#g1)" radius={[5,5,0,0]} label={{position:"top",fill:S.green,fontSize:9,formatter:v=>v+"%"}}/>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card>
                <CLabel>Radar widoczności</CLabel>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={radarData} margin={{top:14,right:22,left:22,bottom:10}}>
                    <PolarGrid stroke={S.border}/>
                    <PolarAngleAxis dataKey="platform" tick={{fill:S.muted,fontSize:9}}/>
                    <PolarRadiusAxis angle={30} domain={[0,100]} tick={{fill:"#233550",fontSize:8}}/>
                    <Radar name="Wzmianki"  dataKey="Wzmianki"  stroke={S.green} fill={S.green} fillOpacity={0.12} strokeWidth={2}/>
                    <Radar name="Cytowania" dataKey="Cytowania" stroke={S.sky}   fill={S.sky}   fillOpacity={0.12} strokeWidth={2}/>
                    <Legend wrapperStyle={{fontSize:11,color:S.muted}}/>
                  </RadarChart>
                </ResponsiveContainer>
              </Card>
            </div>
            <Card style={{marginBottom:14}}>
              <CLabel>Wzmianki vs Cytowania</CLabel>
              <ResponsiveContainer width="100%" height={185}>
                <BarChart data={sovData} margin={{top:8,right:10,left:-22,bottom:0}}>
                  <CartesianGrid strokeDasharray="2 4" stroke={S.border}/>
                  <XAxis dataKey="platform" tick={{fill:S.muted,fontSize:10}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:S.muted,fontSize:10}} axisLine={false} tickLine={false}/>
                  <Tooltip content={<Tip/>}/><Legend wrapperStyle={{fontSize:11,color:S.muted}}/>
                  <Bar dataKey="mentions"  name="Wzmianki"  fill={S.green} radius={[3,3,0,0]}/>
                  <Bar dataKey="citations" name="Cytowania" fill={S.sky}   radius={[3,3,0,0]}/>
                  <Bar dataKey="total"     name="Zapytania" fill={S.navy4} radius={[3,3,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </Card>
            {bs.length>0&&(
              <Card style={{marginBottom:14}}>
                <CLabel>📈 Branded Searches {bsCsv?"— auto-import":"— dane ręczne"}</CLabel>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={bs.map(x=>({month:x.month,searches:x.v}))} margin={{top:8,right:10,left:-22,bottom:0}}>
                    <defs><linearGradient id="bsg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={S.coral} stopOpacity={0.28}/><stop offset="100%" stopColor={S.coral} stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="2 4" stroke={S.border}/>
                    <XAxis dataKey="month" tick={{fill:S.muted,fontSize:10}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:S.muted,fontSize:10}} axisLine={false} tickLine={false}/>
                    <Tooltip content={<Tip/>}/>
                    <Area type="monotone" dataKey="searches" name="Branded Searches" stroke={S.coral} fill="url(#bsg)" strokeWidth={2.5} dot={{fill:S.coral,r:4,strokeWidth:0}}/>
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            )}
            <Card style={{marginBottom:16}}>
              <CLabel>Tabela szczegółowa</CLabel>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead><tr style={{borderBottom:`1px solid ${S.border}`}}>
                    {["Platforma","Zapytań","Wzmianki","Cytowania","SOV %","Mention %","Citation %"].map(h=>(
                      <th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:9,color:S.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.8px"}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {PLATFORMS.map(p=>{
                      const d=proc[p.id];
                      const allM=d.mentions+comps.reduce((s,c)=>s+(d.compData[c]?.mentions||0),0);
                      const sov=allM>0?Math.round((d.mentions/allM)*100):0;
                      const mR=d.total>0?Math.round((d.mentions/d.total)*100):0;
                      const cR=d.total>0?Math.round((d.citations/d.total)*100):0;
                      return (
                        <tr key={p.id} style={{borderBottom:`1px solid ${S.navy3}`}}>
                          <td style={{padding:"10px 12px"}}><span style={{background:p.color+"20",color:p.color,borderRadius:5,padding:"2px 8px",fontSize:11,fontWeight:700}}>{p.icon} {p.short}</span></td>
                          <td style={{padding:"10px 12px",color:S.muted,fontFamily:"monospace"}}>{d.total}</td>
                          <td style={{padding:"10px 12px",color:S.green,fontFamily:"monospace",fontWeight:700}}>{d.mentions}</td>
                          <td style={{padding:"10px 12px",color:S.sky,  fontFamily:"monospace",fontWeight:700}}>{d.citations}</td>
                          <td style={{padding:"10px 12px"}}>
                            <div style={{display:"flex",alignItems:"center",gap:7}}>
                              <div style={{width:40,height:5,background:S.navy4,borderRadius:2,overflow:"hidden"}}><div style={{width:sov+"%",height:"100%",background:`linear-gradient(90deg,${S.green},${S.sky})`,borderRadius:2}}/></div>
                              <span style={{fontFamily:"monospace",fontSize:11,color:S.text}}>{sov}%</span>
                            </div>
                          </td>
                          <td style={{padding:"10px 12px",fontFamily:"monospace",color:mR>=50?S.green:mR>=25?S.gold:S.coral}}>{mR}%</td>
                          <td style={{padding:"10px 12px",fontFamily:"monospace",color:cR>=30?S.green:cR>=15?S.gold:S.coral}}>{cR}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
            <Card>
              <CLabel>✦ Spostrzeżenia Sempai</CLabel>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {best&&<Ins color={S.green}  i="↑" t={`Najlepsza platforma: ${best.platform} — SOV ${best.sov}%`}/>}
                {worst&&worst!==best&&<Ins color={S.coral} i="↓" t={`Platforma do poprawy: ${worst.platform} — SOV ${worst.sov}%`}/>}
                {visM>visC?<Ins color={S.purple} i="!" t={`Dysproporcja wzm. (${visM}%) vs cyt. (${visC}%) — priorytet: tech SEO`}/>
                          :<Ins color={S.green}  i="✓" t="Dobra korelacja wzmianek i cytowań — strona OK technicznie"/>}
                <Ins color={S.sky} i="◈" t={`${brand.name||"Marka"} widoczna w ${PLATFORMS.filter(p=>proc[p.id]?.mentions>0).length}/${PLATFORMS.length} platformach AI`}/>
              </div>
            </Card>
            <Btn onClick={()=>setTab("report")} style={{marginTop:22}}>Generuj Raport →</Btn>
          </div>
        )}

        {tab==="report"&&(
          <div>
            <STitle>Raport statyczny</STitle>
            <p style={{fontSize:13,color:S.muted,marginBottom:24}}>Otwórz podgląd → <strong style={{color:S.text}}>Ctrl+P → Zapisz jako PDF</strong>, albo pobierz .html i otwórz w Word.</p>
            <div style={{display:"flex",gap:12,marginBottom:28}}>
              <button onClick={openReport} style={{padding:"12px 24px",background:S.green+"18",border:`1px solid ${S.green}55`,borderRadius:10,color:S.green,fontSize:13,fontWeight:700,cursor:"pointer"}}>🔍 Otwórz podgląd raportu</button>
              <button onClick={downloadReport} style={{padding:"12px 24px",background:S.sky+"18",border:`1px solid ${S.sky}55`,borderRadius:10,color:S.sky,fontSize:13,fontWeight:700,cursor:"pointer"}}>⬇ Pobierz .html</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
              {[
                {n:"01",title:"AI Share of Voice",desc:"Tabela SOV z progress barami i color-coded wskaźnikami",color:S.green},
                {n:"02",title:"Analiza konkurencji",desc:`${comps.length>0?comps.length+" konkurentów z benchmarkiem":"Dodaj konkurentów w ① Klient"}`,color:S.sky},
                {n:"03",title:"Branded Searches",desc:`${bs.length} miesięcy${bsCsv?" — auto-import":""}`,color:S.coral},
                {n:"★", title:"Spostrzeżenia",desc:"Automatyczne wnioski i rekomendacje strategiczne",color:S.gold},
              ].map((s,i)=>(
                <div key={i} style={{padding:"14px 16px",background:s.color+"08",border:`1px solid ${s.color}22`,borderRadius:10,display:"flex",gap:12}}>
                  <span style={{color:s.color,fontWeight:900,fontSize:16,flexShrink:0,minWidth:24,textAlign:"center"}}>{s.n}</span>
                  <div>
                    <div style={{fontWeight:700,color:S.text,fontSize:13,marginBottom:2}}>{s.title}</div>
                    <div style={{fontSize:11,color:S.muted,lineHeight:1.5}}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <Card>
              <CLabel>Podgląd KPI</CLabel>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
                {[{l:"AI SOV",v:avgSOV+"%",c:S.green},{l:"Mentions",v:visM+"%",c:S.sky},{l:"Citations",v:visC+"%",c:S.purple},{l:"Zapytań",v:totalQ,c:S.gold}].map((k,i)=>(
                  <div key={i} style={{textAlign:"center",padding:"12px",background:S.navy1,borderRadius:8,border:`1px solid ${k.c}22`}}>
                    <div style={{fontSize:9,color:S.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:4}}>{k.l}</div>
                    <div style={{fontSize:22,fontWeight:900,color:k.c}}>{k.v}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {tab==="prompt"&&(
          <div>
            <STitle>Gotowy Prompt</STitle>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
              {[{label:"Klient",value:brand.name||"—",color:S.green},{label:"Branża",value:brand.industry||"—",color:S.sky},{label:"Konkurenci",value:comps.length>0?comps.join(", "):"—",color:S.coral}].map((x,i)=>(
                <div key={i} style={{background:S.navy2,border:`1px solid ${x.color}1a`,borderRadius:10,padding:"13px 15px"}}>
                  <div style={{fontSize:9,color:S.muted,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.8px",fontWeight:700}}>{x.label}</div>
                  <div style={{fontSize:13,fontWeight:800,color:x.color,wordBreak:"break-word"}}>{x.value}</div>
                </div>
              ))}
            </div>
            <div style={{position:"relative"}}>
              <pre style={{background:S.navy1,border:`1px solid ${S.border}`,borderRadius:12,padding:"22px 24px",fontSize:12,lineHeight:1.85,color:"#3a6080",overflow:"auto",maxHeight:460,whiteSpace:"pre-wrap",fontFamily:"monospace"}}>{genPrompt()}</pre>
              <button onClick={()=>{navigator.clipboard.writeText(genPrompt());setPromptCopied(true);setTimeout(()=>setPromptCopied(false),2000);}} style={{position:"absolute",top:14,right:14,background:promptCopied?S.green+"22":S.navy3,border:`1px solid ${promptCopied?S.green:S.border}`,borderRadius:8,padding:"8px 18px",color:promptCopied?S.green:S.muted,fontSize:12,fontWeight:700,cursor:"pointer",transition:"all .2s"}}>
                {promptCopied?"✓ Skopiowano!":"⎘ Kopiuj"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const STitle = ({children}) => (
  <div style={{marginBottom:22}}>
    <h2 style={{margin:0,fontSize:18,fontWeight:800,color:S.text}}>{children}</h2>
    <div style={{width:34,height:2,background:`linear-gradient(90deg,${S.green},transparent)`,marginTop:7}}/>
  </div>
);

const Inp = ({label,value,set,ph}) => {
  const [f,setF] = useState(false);
  return (
    <div>
      <label style={{display:"block",fontSize:9,color:S.muted,marginBottom:5,fontWeight:700,letterSpacing:"0.8px",textTransform:"uppercase"}}>{label}</label>
      <input value={value} onChange={e=>set(e.target.value)} placeholder={ph} onFocus={()=>setF(true)} onBlur={()=>setF(false)}
        style={{width:"100%",boxSizing:"border-box",background:S.navy2,border:`1px solid ${f?S.green+"66":S.border}`,borderRadius:8,padding:"10px 13px",color:S.text,fontSize:13,outline:"none",transition:"border .15s"}}/>
    </div>
  );
};

const Card = ({children,style}) => (
  <div style={{background:S.navy2,border:`1px solid ${S.border}`,borderRadius:12,padding:"18px 20px",...style}}>{children}</div>
);

const CLabel = ({children,style}) => (
  <div style={{fontSize:9,color:S.muted,marginBottom:12,fontWeight:700,letterSpacing:"1.2px",textTransform:"uppercase",...style}}>{children}</div>
);

const Ins = ({color,i,t}) => (
  <div style={{display:"flex",gap:10,padding:"10px 14px",background:color+"0b",border:`1px solid ${color}22`,borderRadius:8}}>
    <span style={{color,fontWeight:900,fontSize:14,flexShrink:0}}>{i}</span>
    <span style={{fontSize:12,color:S.muted,lineHeight:1.55}}>{t}</span>
  </div>
);

const Btn = ({children,onClick,disabled,muted,style}) => (
  <button onClick={onClick} disabled={disabled} style={{marginTop:18,padding:"11px 26px",background:disabled||muted?"transparent":S.green+"18",border:`1px solid ${disabled?S.border:muted?S.muted+"44":S.green+"55"}`,borderRadius:10,color:disabled?S.border:muted?S.muted:S.green,fontSize:13,fontWeight:700,cursor:disabled?"not-allowed":"pointer",letterSpacing:"0.2px",transition:"all .15s",...style}}>{children}</button>
);
