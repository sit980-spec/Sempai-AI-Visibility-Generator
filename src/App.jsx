import { useState, useRef, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from "recharts";

const S = {
  navy1:"#07111f", navy2:"#0c1a2e", navy3:"#112240", navy4:"#1a3358",
  green:"#2edf8f", greenD:"#20b571", coral:"#ff5c6a",
  gold:"#f5c842", sky:"#4da6ff", purple:"#a78bfa",
  text:"#e8f0ff",
  muted:"#7aabbf",   // brighter — readable on dark bg
  dim:"#3a6070",     // for truly secondary info
  border:"#1a3354",
  // Explain box: white text on slightly lighter dark bg
  exBg:"#0a1825",
  exBorder:"#1e3a52",
};

const PLATFORMS = [
  { id:"ai_overview", name:"AI Overview",  color:S.sky,    icon:"G" },
  { id:"ai_mode",     name:"AI Mode",      color:"#34d399",icon:"M" },
  { id:"chatgpt",     name:"ChatGPT",      color:S.green,  icon:"⚡" },
  { id:"gemini",      name:"Gemini",       color:S.coral,  icon:"◆" },
  { id:"perplexity",  name:"Perplexity",   color:S.purple, icon:"◈" },
  { id:"copilot",     name:"Copilot",      color:S.gold,   icon:"✦" },
];

const INDUSTRIES = {
  ecommerce:{ label:"Sklep (e-commerce)", icon:"🛍️", types:[
    {id:"knives",label:"Noże / EDC / Survival"},{id:"military",label:"Militaria / Taktyczne"},
    {id:"garden",label:"Meble i akcesoria ogrodowe"},{id:"furniture",label:"Meble i wyposażenie wnętrz"},
    {id:"outdoor",label:"Outdoor / Camping / Sport"},{id:"tools",label:"Narzędzia / Elektronika"},
    {id:"fashion",label:"Odzież / Obuwie / Moda"},{id:"food",label:"Żywność / Zdrowie"},
    {id:"pets",label:"Zoologia / Zwierzęta"},{id:"other_shop",label:"Inny sklep"},
  ]},
  wholesale:{ label:"Hurtownia / B2B", icon:"🏭", types:[
    {id:"wh_tools",label:"Hurtownia narzędzi"},{id:"wh_food",label:"Hurtownia spożywcza"},{id:"wh_other",label:"Inna hurtownia B2B"},
  ]},
  blog:{ label:"Blog / Serwis informacyjny", icon:"📝", types:[
    {id:"blog_tech",label:"Blog technologiczny"},{id:"blog_lifestyle",label:"Blog lifestyle / podróże"},{id:"blog_niche",label:"Blog niszowy"},
  ]},
  service:{ label:"Usługi / SaaS", icon:"⚙️", types:[
    {id:"agency",label:"Agencja / Marketing"},{id:"saas",label:"Oprogramowanie / SaaS"},{id:"local",label:"Usługi lokalne"},
  ]},
};

const TOPIC_HINTS = {
  knives:["noże EDC","noże składane","noże survivalowe","ostrzenie noży","stal do noży","noże kuchenne"],
  military:["sprzęt militarny","replika broni","paintball","airsoft","kamizelka taktyczna","lornetka"],
  garden:["meble ogrodowe","zestaw wypoczynkowy ogród","parasol ogrodowy","leżak ogrodowy","szklarnia"],
  furniture:["meble do salonu","sofa narożna","stolik kawowy","szafa przesuwna","łóżko tapicerowane"],
  outdoor:["plecak turystyczny","namiot kempingowy","latarka czołowa","śpiwór","but trekkingowy"],
  tools:["wiertarka","szlifierka","klucz udarowy","elektronarzędzia","narzędzia ręczne"],
  fashion:["kurtka zimowa","buty sportowe","torba damska","zegarek","odzież robocza"],
  food:["suplementy diety","żywność ekologiczna","proteiny","herbata","kawa specialty"],
  pets:["karma dla psa","zabawki dla kota","akwarium","klatka dla ptaka","smycz"],
  default:["recenzja","porównanie","opinie","jak wybrać","najlepszy","tani","polecany"],
};

// Keywords that are clearly OFF-TOPIC per industry — filter from gap analysis
const INDUSTRY_FILTERS = {
  knives:    ["ekspres", "kawa", "herbata", "czapka", "buty", "odzież", "mebel", "ogród"],
  military:  ["ekspres", "kawa", "herbata", "czapka z daszkiem", "buty", "odzież", "mebel", "ogród"],
  garden:    ["nóż", "noże", "broń", "militari", "airsof", "ekspres", "kawa"],
  furniture: ["nóż", "noże", "broń", "militari", "ekspres", "kawa"],
  outdoor:   ["ekspres", "kawa", "herbata", "mebel"],
  tools:     ["ekspres", "kawa", "nóż", "broń", "militari", "moda"],
  default:   [],
};

function isTopicRelevant(kw, industryType) {
  const filters = INDUSTRY_FILTERS[industryType] || INDUSTRY_FILTERS.default;
  const kwLow = kw.toLowerCase();
  return !filters.some(f => kwLow.includes(f));
}

function decodeBuffer(buffer) {
  const b = new Uint8Array(buffer);
  if ((b[0]===0xFF&&b[1]===0xFE)||(b[0]===0xFE&&b[1]===0xFF)) return new TextDecoder("utf-16").decode(buffer);
  if (b[0]===0xEF&&b[1]===0xBB&&b[2]===0xBF) return new TextDecoder("utf-8").decode(buffer).slice(1);
  return new TextDecoder("utf-8").decode(buffer);
}

function parseCSV(text) {
  const firstNL = text.indexOf("\n");
  const firstLine = firstNL > 0 ? text.slice(0, firstNL) : text;
  let tabs = 0, commas = 0, inQ = false;
  for (const ch of firstLine) {
    if (ch==='"') inQ=!inQ;
    else if (!inQ) { if (ch==="\t") tabs++; else if (ch===",") commas++; }
  }
  const sep = tabs > commas ? "\t" : ",";
  const rows = [];
  let row = [], cell = "", inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], nx = text[i+1];
    if (ch==='"') { if (inQuote&&nx==='"') { cell+='"'; i++; } else inQuote=!inQuote; }
    else if (ch===sep&&!inQuote) { row.push(cell); cell=""; }
    else if ((ch==="\n"||(ch==="\r"&&nx==="\n"))&&!inQuote) {
      if (ch==="\r") i++;
      row.push(cell); cell="";
      if (row.some(c=>c.trim())) rows.push(row.map(c=>c.trim().replace(/^\uFEFF/,"")));
      row=[];
    } else { cell+=ch; }
  }
  if (cell||row.length) { row.push(cell); if (row.some(c=>c.trim())) rows.push(row.map(c=>c.trim())); }
  return rows;
}

function detectPlatform(headers, filename, rows) {
  const h = headers.map(x=>x.toLowerCase().replace(/[^a-z0-9 ]/g,"").trim());

  // 1. Check header column names first (most reliable)
  if (h.some(x=>x==="ai overview")) return "ai_overview";
  if (h.some(x=>x==="ai mode")) return "ai_mode";

  // 2. Check filename
  const fn = (filename||"").toLowerCase();
  if (fn.includes("ai_mode")||fn.includes("ai-mode")||fn.includes("aimode")) return "ai_mode";
  if (fn.includes("overview")) return "ai_overview";
  if (fn.includes("chatgpt")||fn.includes("gpt")) return "chatgpt";
  if (fn.includes("gemini")) return "gemini";
  if (fn.includes("perplexity")) return "perplexity";
  if (fn.includes("copilot")) return "copilot";

  // 3. Check Model column — Ahrefs stores exact platform name there (ChatGPT, Gemini, etc.)
  //    Only look at short values (real platform names are 1-3 words, response text is long)
  const mi = headers.findIndex(x=>x==="Model");
  if (mi >= 0 && rows && rows.length > 0) {
    const modelVals = rows.slice(0, 20)
      .map(r => (r[mi]||"").trim())
      .filter(v => v.length > 0 && v.length < 30); // platform names are short
    const combined = modelVals.join(" ").toLowerCase();
    if (combined.includes("chatgpt") || combined.includes("gpt")) return "chatgpt";
    if (combined.includes("gemini")) return "gemini";
    if (combined.includes("perplexity")) return "perplexity";
    if (combined.includes("copilot")) return "copilot";
    if (combined.includes("ai mode") || combined.includes("aimode")) return "ai_mode";
  }

  return null;
}

function parseFile(buffer, filename, brandVariants) {
  const text = decodeBuffer(buffer);
  const rows = parseCSV(text);
  if (rows.length < 2) return { error:"Plik pusty" };
  const headers = rows[0].map(h=>h.replace(/^"|"$/g,"").trim());
  const platformId = detectPlatform(headers, filename, rows.slice(1));
  const mentionsIdx = headers.findIndex(h=>h==="Mentions");
  const kwIdx = headers.findIndex(h=>h==="Keyword");
  const volIdx = headers.findIndex(h=>h==="Volume");
  const linkIdx = headers.findIndex(h=>h==="Link URL");
  if (mentionsIdx < 0) return { error:"Brak kolumny Mentions. Nagłówki: "+headers.join(", "), headers, platformId };
  const bv = (brandVariants||[]).map(v=>v.toLowerCase().trim()).filter(Boolean);
  const data = rows.slice(1);
  let mentions=0, citations=0, withAnyBrand=0;
  const compSet={}, variantHits={};
  const topBrand=[], topGap=[];
  data.forEach(r=>{
    const kw = kwIdx>=0 ? r[kwIdx]||"" : "";
    if (!kw) return;
    const vol = volIdx>=0 ? (parseInt(r[volIdx])||0) : 0;
    const mentRaw = mentionsIdx>=0 ? r[mentionsIdx]||"" : "";
    const linkRaw = linkIdx>=0 ? r[linkIdx]||"" : "";
    const mentLow = mentRaw.toLowerCase();
    const linkLow = linkRaw.toLowerCase();
    const hasAnyBrand = mentRaw.trim().length > 0;
    if (hasAnyBrand) withAnyBrand++;
    const matched = bv.find(v=>v&&mentLow.split(/[\n,]+/).some(m=>m.trim()===v||m.trim().includes(v)))||null;
    const mentioned = !!matched;
    const cited = bv.some(v=>v&&linkLow.includes(v));
    if (mentioned) { mentions++; if (matched) variantHits[matched]=(variantHits[matched]||0)+1; }
    if (cited) citations++;
    const comps = mentRaw.split(/[\n,]+/).map(m=>m.trim().toLowerCase()).filter(m=>m&&m.length>1&&!bv.some(v=>m===v||m.includes(v)));
    comps.forEach(c=>{ compSet[c]=(compSet[c]||0)+1; });
    if (mentioned) topBrand.push({kw,vol});
    else if (comps.length>0) topGap.push({kw,vol,comps:comps.slice(0,3)});
  });
  topBrand.sort((a,b)=>b.vol-a.vol);
  topGap.sort((a,b)=>b.vol-a.vol);
  return { platformId, headers, total:data.filter(r=>kwIdx>=0&&r[kwIdx]).length, mentions, citations, withAnyBrand, compSet, variantHits, topBrand:topBrand.slice(0,12), topGap:topGap.slice(0,12), error:null };
}

function fmtN(n) { return (n||0).toLocaleString("pl-PL"); }
function fmtP(num,den) { if(!den)return"0%"; const v=(num/den)*100; if(v===0)return"0%"; if(v<0.1)return"<0.1%"; if(v<1)return v.toFixed(1)+"%"; return Math.round(v)+"%"; }
function calcSOV(brandM, compSet) { const ct=Object.values(compSet||{}).reduce((s,v)=>s+v,0); return brandM+ct>0?Math.round((brandM/(brandM+ct))*100):0; }

const Tip=({active,payload,label})=>{ if(!active||!payload?.length)return null; return <div style={{background:S.navy3,border:"1px solid "+S.border,borderRadius:8,padding:"9px 13px"}}><div style={{fontSize:10,color:S.muted,marginBottom:4}}>{label}</div>{payload.map((p,i)=><div key={i} style={{fontSize:12,color:p.color,fontWeight:700}}>{p.name}: {p.value}</div>)}</div>; };
function ParticleBg() { const ref=useRef(null); useEffect(()=>{ const canvas=ref.current; if(!canvas)return; const ctx=canvas.getContext("2d"); let raf; canvas.width=canvas.offsetWidth; canvas.height=canvas.offsetHeight; const W=canvas.width,H=canvas.height; const pts=Array.from({length:25},()=>({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.2,vy:(Math.random()-.5)*.2,r:Math.random()*1.2+.3})); function draw(){ctx.clearRect(0,0,W,H);pts.forEach(p=>{p.x+=p.vx;p.y+=p.vy;if(p.x<0)p.x=W;if(p.x>W)p.x=0;if(p.y<0)p.y=H;if(p.y>H)p.y=0;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle="rgba(46,223,143,0.12)";ctx.fill();}); raf=requestAnimationFrame(draw);} draw(); return ()=>cancelAnimationFrame(raf); },[]);  return <canvas ref={ref} style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}}/>; }
const Card = ({ children, style }) => (
  <div style={{ background: S.navy2, border: "1px solid " + S.border, borderRadius: 12, padding: "18px 20px", ...style }}>
    {children}
  </div>
);

// Section label — white/bright on dark
const SL = ({ color, children }) => (
  <div style={{ fontSize: 10, color: color || "#c0d8e8", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 10 }}>
    {children}
  </div>
);

// Explanation box — ALWAYS high contrast: bright text on dark tinted bg
const Explain = ({ children, type = "info" }) => {
  const styles = {
    info:    { bg: "#0a1e30", border: "#1e4060", icon: "💡", color: "#90c8e0" },
    warn:    { bg: "#1a1200", border: "#4a3500", icon: "⚠️", color: "#f5c842" },
    success: { bg: "#001a0e", border: "#004020", icon: "✅", color: "#2edf8f" },
    step:    { bg: "#10081e", border: "#2a1060", icon: "👉", color: "#c0a0ff" },
  };
  const s = styles[type] || styles.info;
  return (
    <div style={{ fontSize: 12, color: s.color, lineHeight: 1.7, padding: "10px 14px", background: s.bg, borderRadius: 8, borderLeft: "3px solid " + s.border, marginBottom: 12 }}>
      <span style={{ marginRight: 8 }}>{s.icon}</span>{children}
    </div>
  );
};

const STitle = ({ children }) => (
  <div style={{ marginBottom: 22 }}>
    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: S.text }}>{children}</h2>
    <div style={{ width: 32, height: 3, background: "linear-gradient(90deg," + S.green + ",transparent)", marginTop: 6 }} />
  </div>
);

const Inp = ({ label, value, set, ph, span2, help }) => {
  const [f, setF] = useState(false);
  return (
    <div style={span2 ? { gridColumn: "1/-1" } : {}}>
      <label style={{ display: "block", fontSize: 10, color: "#90b8c8", marginBottom: 5, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase" }}>{label}</label>
      <input value={value} onChange={e => set(e.target.value)} placeholder={ph}
        onFocus={() => setF(true)} onBlur={() => setF(false)}
        style={{ width: "100%", boxSizing: "border-box", background: S.navy1, border: "1px solid " + (f ? S.green + "88" : S.border), borderRadius: 8, padding: "10px 13px", color: S.text, fontSize: 13, outline: "none", transition: "border .15s" }} />
      {help && <div style={{ fontSize: 11, color: "#7aabbf", marginTop: 4 }}>{help}</div>}
    </div>
  );
};

// InfoBox — numbered step or fact box
const InfoBox = ({ n, color, title, children }) => (
  <div style={{ display: "flex", gap: 14, padding: "16px 18px", background: S.navy2, border: "1px solid " + (color || S.border), borderRadius: 12, marginBottom: 10 }}>
    {n && <div style={{ width: 32, height: 32, borderRadius: "50%", background: (color || S.green) + "22", border: "2px solid " + (color || S.green) + "66", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: color || S.green, flexShrink: 0 }}>{n}</div>}
    <div style={{ flex: 1 }}>
      {title && <div style={{ fontSize: 13, fontWeight: 800, color: S.text, marginBottom: 5 }}>{title}</div>}
      <div style={{ fontSize: 12, color: "#9abfd0", lineHeight: 1.75 }}>{children}</div>
    </div>
  </div>
);

export default function App() {
  const [tab,setTab]=useState("guide");
  const [brand,setBrand]=useState({name:"",url:"",industry:"",industryType:""});
  const [files,setFiles]=useState({});
  const [rawBuffers,setRawBuffers]=useState({});
  const [unknownFiles,setUnknownFiles]=useState([]);
  const [loadingFile,setLoadingFile]=useState(null);
  const [errors,setErrors]=useState([]);
  const [brandVariants,setBrandVariants]=useState([]);
  const [removedVariants,setRemovedVariants]=useState(new Set());
  const [brandMentionKey,setBrandMentionKey]=useState("");
  const [variantInput,setVariantInput]=useState("");
  const [allMentionsInData,setAllMentionsInData]=useState([]);
  const [editableComment,setEditableComment]=useState(null);
  const [reportChecks,setReportChecks]=useState({});
  // Per-section editable content for the report
  const [reportSections,setReportSections]=useState({
    intro: null, sov: null, mentions: null, competitors: null, strategy: null
  });
  const updateSection = (key, val) => setReportSections(s=>({...s,[key]:val}));
  const [promptCopied,setPromptCopied]=useState(false);

  const stopWords=new Set(["sklep","shop","store","online","pl","com","net","eu","www"]);
  function makeAutoVariants(input){
    if(!input)return[];
    const raw=input.toLowerCase().trim();
    const v=new Set([raw]);
    const noExt=raw.replace(/\.(pl|com|eu|net|org|io|co|de|shop|store)$/,"");
    if(noExt!==raw)v.add(noExt);
    if(noExt.includes("-")){v.add(noExt.replace(/-/g,""));noExt.split("-").forEach(s=>s.length>2&&v.add(s));}
    if(noExt.includes(" ")){v.add(noExt.replace(/ /g,""));noExt.split(" ").forEach(s=>s.length>2&&v.add(s));}
    return [...v].filter(x=>x.length>1&&!stopWords.has(x));
  }
  const autoKey=(brand.url||brand.name).toLowerCase().replace(/^https?:\/\/(www\.)?/,"").replace(/\..*$/,"").trim()||brand.name.toLowerCase().split(/\s+/)[0]||"";
  const brandKey=brandMentionKey.trim()||autoKey;
  const autoVariants=makeAutoVariants(brand.url||brand.name).filter(v=>!removedVariants.has(v));
  const allVariants=[...new Set([...autoVariants,...brandVariants])];

  useEffect(()=>{
    if(allVariants.length===0||Object.keys(rawBuffers).length===0)return;
    Object.entries(rawBuffers).forEach(([filename,buffer])=>{
      const r=parseFile(buffer,filename,allVariants);
      if(r.platformId&&!r.error) setFiles(f=>({...f,[r.platformId]:{filename,...r}}));
    });
  },[brandKey,brandVariants.join(","),removedVariants.size]); // eslint-disable-line

  const handleFiles=useCallback((filename,buffer)=>{
    setLoadingFile(filename);
    setTimeout(()=>{
      try {
        const r=parseFile(buffer,filename,allVariants);
        setRawBuffers(rb=>({...rb,[filename]:buffer}));
        if(!r.platformId){
          setUnknownFiles(u=>[...u.filter(x=>x.filename!==filename),{filename,headers:r.headers||[],error:r.error}]);
          setErrors(e=>[...e.filter(x=>!x.includes(filename)),filename+": "+(r.error||"Nieznana platforma")]);
        } else if(r.platformId==="ai_overview" && files["ai_overview"]?.filename && files["ai_overview"].filename!==filename) {
          // Conflict: AI Overview slot already taken — AI Mode has same headers!
          // Add to unknown so user can manually pick ai_mode
          setUnknownFiles(u=>[...u.filter(x=>x.filename!==filename),{
            filename, headers:r.headers||[], 
            error:null,
            conflict:true,
            conflictNote:"Ten plik ma identyczny format co AI Overview — Ahrefs eksportuje AI Mode z tymi samymi nagłówkami. Jeśli to eksport z AI Mode, kliknij M AI Mode poniżej."
          }]);
        } else {
          setFiles(f=>({...f,[r.platformId]:{filename,...r}}));
          setErrors(e=>e.filter(x=>!x.includes(filename)));
          setUnknownFiles(u=>u.filter(x=>x.filename!==filename));
          const rawText=decodeBuffer(buffer);
          const rows=parseCSV(rawText);
          if(rows.length>1){
            const mi=rows[0].findIndex(h=>h.trim()==="Mentions");
            if(mi>=0){
              const found=new Set();
              rows.slice(1).forEach(r=>{if(r[mi])r[mi].toLowerCase().split(/[\n,]+/).map(m=>m.trim()).filter(Boolean).forEach(m=>found.add(m));});
              setAllMentionsInData(prev=>[...new Set([...prev,...found])].filter(Boolean).sort());
            }
          }
        }
      } catch(err){setErrors(e=>[...e,filename+": "+err.message]);}
      setLoadingFile(null);
    },50);
  },[allVariants]);

  const assignPlatform=(filename,platformId)=>{
    const buffer=rawBuffers[filename];
    if(!buffer)return;
    const r=parseFile(buffer,filename,allVariants);
    setFiles(f=>({...f,[platformId]:{filename,...r,platformId}}));
    setUnknownFiles(u=>u.filter(x=>x.filename!==filename));
    setErrors(e=>e.filter(x=>!x.includes(filename)));
  };

  const proc={};
  PLATFORMS.forEach(p=>{proc[p.id]=files[p.id]||{total:0,mentions:0,citations:0,withAnyBrand:0,compSet:{},variantHits:{},topBrand:[],topGap:[]};});
  const totalQ=PLATFORMS.reduce((s,p)=>s+(proc[p.id].total||0),0);
  const totalM=PLATFORMS.reduce((s,p)=>s+(proc[p.id].mentions||0),0);
  const totalC=PLATFORMS.reduce((s,p)=>s+(proc[p.id].citations||0),0);
  const totalWB=PLATFORMS.reduce((s,p)=>s+(proc[p.id].withAnyBrand||0),0);
  const compCounts={};
  PLATFORMS.forEach(p=>{Object.entries(proc[p.id].compSet||{}).forEach(([n,cnt])=>{compCounts[n]=(compCounts[n]||0)+cnt;});});
  const allComps=Object.entries(compCounts).sort((a,b)=>b[1]-a[1]).map(([n])=>n).filter(n=>n&&n.length>1);
  const totalCompM=allComps.reduce((s,c)=>s+(compCounts[c]||0),0);
  const avgSOV=(()=>{const active=PLATFORMS.filter(p=>proc[p.id].total>0);if(!active.length)return 0;const vals=active.map(p=>calcSOV(proc[p.id].mentions,proc[p.id].compSet));return Math.round(vals.reduce((s,v)=>s+v,0)/active.length);})();
  const sovData=PLATFORMS.map(p=>{const d=proc[p.id];return{platform:p.name,color:p.color,sov:calcSOV(d.mentions,d.compSet),mentions:d.mentions,citations:d.citations,total:d.total};});
  const ranked=[...sovData.filter(d=>d.total>0)].sort((a,b)=>b.sov-a.sov);
  const best=ranked[0],worst=ranked[ranked.length-1];
  const kwBrand={},kwGap={};
  PLATFORMS.forEach(p=>{(proc[p.id].topBrand||[]).forEach(({kw,vol})=>{if(!kwBrand[kw]||kwBrand[kw]<vol)kwBrand[kw]=vol;});(proc[p.id].topGap||[]).forEach(({kw,vol,comps})=>{if(!kwGap[kw])kwGap[kw]={vol,comps};});});
  const topBrandKws=Object.entries(kwBrand).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const topGapKws=Object.entries(kwGap)
    .filter(([kw])=>isTopicRelevant(kw, brand.industryType))
    .sort((a,b)=>b[1].vol-a[1].vol).slice(0,10);
  const industryHints=TOPIC_HINTS[brand.industryType]||TOPIC_HINTS.default;
  const filesLoaded=Object.keys(files).length;

  const buildArgs=()=>({brand,proc,totalQ,totalM,totalC,totalWB,avgSOV,allComps,compCounts,best,worst,topBrandKws,topGapKws,editableComment,totalCompM,finalComment:null});
  const openReport=()=>{const html=buildReportHTML(buildArgs());window.open(URL.createObjectURL(new Blob([html],{type:"text/html;charset=utf-8"})),"_blank");};
  const downloadReport=()=>{const html=buildReportHTML(buildArgs());const a=document.createElement("a");a.href="data:text/html;charset=utf-8,"+encodeURIComponent(html);a.download="Sempai_AIVisibility_"+(brand.name||"Raport")+"_"+new Date().toISOString().slice(0,10)+".html";a.click();};

  const TABS=[{id:"guide",label:"⓪ Jak używać"},{id:"setup",label:"① Klient"},{id:"import",label:"② Import CSV"},{id:"dashboard",label:"③ Dashboard"},{id:"report",label:"④ Raport"},{id:"prompt",label:"⑤ Prompt AI"}];

  return (
    <div style={{minHeight:"100vh",background:S.navy1,color:S.text,fontFamily:"'DM Sans','Segoe UI',sans-serif"}}>
      <div style={{background:S.navy2,borderBottom:"1px solid "+S.border,position:"relative",overflow:"hidden",minHeight:108}}>
        <ParticleBg/>
        <div style={{position:"relative",maxWidth:1060,margin:"0 auto",padding:"20px 28px 0"}}>
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
            <div style={{width:38,height:38,borderRadius:10,background:"linear-gradient(135deg,"+S.green+"20,"+S.navy4+")",border:"1.5px solid "+S.green+"55",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:18,color:S.green}}>S</div>
            <div>
              <div style={{display:"flex",alignItems:"baseline",gap:10}}>
                <span style={{fontSize:19,fontWeight:800,color:S.text}}>sempai</span>
                <span style={{fontSize:10,fontWeight:700,color:S.green,background:S.green+"18",border:"1px solid "+S.green+"44",borderRadius:5,padding:"1px 7px",letterSpacing:"1px",textTransform:"uppercase"}}>AI Visibility</span>
              </div>
              <div style={{fontSize:10,color:S.muted,letterSpacing:"2px",textTransform:"uppercase",marginTop:1}}>Report Generator · Let us perform!</div>
            </div>
            {filesLoaded>0&&<div style={{marginLeft:"auto",display:"flex",gap:6,flexWrap:"wrap",justifyContent:"flex-end"}}>{PLATFORMS.filter(p=>proc[p.id].total>0).map(p=><span key={p.id} style={{fontSize:10,fontWeight:700,color:p.color,background:p.color+"18",border:"1px solid "+p.color+"44",borderRadius:6,padding:"2px 7px"}}>{p.icon} {p.name}</span>)}</div>}
          </div>
          <div style={{display:"flex",overflowX:"auto"}}>{TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"8px 16px",background:"transparent",border:"none",borderBottom:tab===t.id?"2px solid "+S.green:"2px solid transparent",color:tab===t.id?S.green:S.muted,fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>{t.label}</button>)}</div>
        </div>
      </div>

      <div style={{maxWidth:1060,margin:"0 auto",padding:"26px 28px 60px"}}>

        {/* GUIDE */}
        {tab==="guide"&&<div>
          <STitle>Jak to działa — przeczytaj zanim zaczniesz</STitle>

          {/* What is this tool */}
          <div style={{background:"linear-gradient(135deg,#0a1e30,#0c1a2e)",border:"1px solid #1e4060",borderRadius:14,padding:"20px 22px",marginBottom:22}}>
            <div style={{fontSize:13,fontWeight:800,color:S.text,marginBottom:12}}>🤖 Co to w ogóle jest i do czego służy?</div>
            <div style={{fontSize:12,color:"#9abfd0",lineHeight:1.8,marginBottom:14}}>
              To narzędzie sprawdza czy i jak często <strong style={{color:S.text}}>modele AI (ChatGPT, Google AI Overview, Gemini itd.) wymieniają Twoją markę</strong> gdy ktoś zadaje pytania związane z Twoją branżą.
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              {[
                {icon:"💬",title:"Wzmianki (Mentions)",color:S.green,def:'AI napisał: "...polecamy Ostry Sklep..." — to jest wzmianka. Marka wymieniona z nazwy w odpowiedzi AI.'},
                {icon:"🔗",title:"Cytowania (Citations)",color:S.sky,def:'AI dodał link do Twojej strony jako źródło. Możesz być cytowany bez wymienienia nazwy — to "anonimowy ekspert".'},
                {icon:"📊",title:"AI Share of Voice (SOV)",color:S.purple,def:'Twoje wzmianki ÷ (Twoje + wzmianki WSZYSTKICH konkurentów) × 100. Twój "kawałek tortu" wśród marek w AI.'},
              ].map((x,i)=>(
                <div key={i} style={{padding:"12px 14px",background:"#040d18",border:"1px solid "+x.color+"33",borderRadius:10}}>
                  <div style={{fontSize:18,marginBottom:7}}>{x.icon}</div>
                  <div style={{fontSize:12,fontWeight:800,color:x.color,marginBottom:5}}>{x.title}</div>
                  <div style={{fontSize:11,color:"#8ab0c0",lineHeight:1.65}}>{x.def}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Step by step */}
          <div style={{fontSize:13,fontWeight:800,color:S.text,marginBottom:14}}>Jak pobrać dane — 4 kroki</div>
          <InfoBox n="1" color={S.sky} title="Wejdź w Ahrefs → AI visibility → AI responses">
            W lewym menu Ahrefs kliknij <strong style={{color:S.text}}>AI visibility</strong>, potem <strong style={{color:S.text}}>AI responses</strong>. Upewnij się że wybrałeś swój projekt (swoją domenę) i kraj <strong style={{color:S.text}}>Poland</strong>.
            <div style={{marginTop:8,padding:"6px 10px",background:"#040d18",borderRadius:6,fontSize:11,color:"#6090a8"}}>
              Tutaj Ahrefs pokazuje listę zapytań, dla których AI generuje odpowiedź z informacjami z Twojej branży.
            </div>
          </InfoBox>
          <InfoBox n="2" color={S.green} title="Wybierz JEDNĄ platformę AI z filtra (np. Copilot)">
            Na górze strony kliknij filtr i wybierz <strong style={{color:S.text}}>jedną platformę</strong> (np. Copilot). Każdą platformę eksportujesz osobno do osobnego pliku.
            <div style={{display:"flex",gap:7,flexWrap:"wrap",marginTop:9}}>
              {PLATFORMS.map(p=><span key={p.id} style={{padding:"3px 11px",borderRadius:12,fontSize:11,fontWeight:700,background:p.color+"22",border:"1px solid "+p.color+"55",color:p.color}}>{p.icon} {p.name}</span>)}
            </div>
            <div style={{marginTop:9,fontSize:11,color:"#6090a8"}}>AI Overview i AI Mode to dwa różne produkty Google — eksportuj je oddzielnie jako dwa osobne pliki!</div>
          </InfoBox>
          <InfoBox n="3" color={S.coral} title='Kliknij Export przy LICZBIE WYNIKÓW na dole — nie przy tabeli'>
            <strong style={{color:"#ff8898"}}>Ważne: są dwa przyciski Export.</strong> Chcesz ten przy liczbie wyników (np. <em style={{color:S.text}}>"489 results"</em>) — on eksportuje <strong style={{color:S.text}}>WSZYSTKIE zapytania</strong>. Ten w prawym górnym rogu tabeli eksportuje tylko to co widać — nie używaj go.
            <div style={{marginTop:8,padding:"6px 10px",background:"#1a0005",borderRadius:6,fontSize:11,color:"#f08090"}}>
              Plik pobierze się jako CSV. Może być w UTF-16 lub UTF-8 — narzędzie obsługuje oba automatycznie.
            </div>
          </InfoBox>
          <InfoBox n="4" color={S.gold} title="Powtórz dla każdej platformy, wgraj wszystkie pliki naraz">
            Zrób kroki 2-3 dla każdej platformy. Zbierzesz 2-6 plików CSV. W zakładce <strong style={{color:S.text}}>② Import CSV</strong> wgraj je wszystkie jednocześnie — narzędzie samo rozpozna która platforma to który plik.
            <div style={{marginTop:8,padding:"6px 10px",background:"#140d00",borderRadius:6,fontSize:11,color:"#c09030"}}>
              Nie musisz mieć wszystkich 6 platform. Brakująca platforma = wynik 0, ale reszta działa normalnie.
            </div>
          </InfoBox>

          <button onClick={()=>setTab("setup")} style={{marginTop:4,padding:"12px 28px",background:S.green+"22",border:"2px solid "+S.green+"66",borderRadius:10,color:S.green,fontSize:13,fontWeight:700,cursor:"pointer"}}>
            Rozumiem, zaczynam → ① Klient
          </button>
        </div>}

        {/* SETUP */}
        {tab==="setup"&&<div>
          <STitle>Dane klienta</STitle>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
            <Inp label="Nazwa marki *" value={brand.name} set={v=>setBrand(b=>({...b,name:v}))} ph="np. Ostry Sklep" help="Jak marka jest publicznie rozpoznawana"/>
            <Inp label="Domena / URL *" value={brand.url} set={v=>setBrand(b=>({...b,url:v}))} ph="ostry-sklep.pl" help="Baza do auto-generowania wariantów nazwy"/>
          </div>
          <Card style={{marginBottom:12}}>
            <SL>Typ domeny i branża</SL>
            <Explain type="step">Wybierz poniżej <strong>co to za strona</strong> i <strong>jaka branża</strong>. Dzięki temu narzędzie wie jakich słów kluczowych szukać i jak interpretować dane. Nie pomijaj tego kroku!</Explain>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginTop:10,marginBottom:12}}>
              {Object.entries(INDUSTRIES).map(([key,ind])=><button key={key} onClick={()=>setBrand(b=>({...b,industry:key,industryType:""}))} style={{padding:"9px 11px",borderRadius:9,border:"1px solid "+(brand.industry===key?S.green:S.border),background:brand.industry===key?S.green+"18":"transparent",color:brand.industry===key?S.green:S.muted,cursor:"pointer",textAlign:"left"}}><div style={{fontSize:17,marginBottom:3}}>{ind.icon}</div><div style={{fontSize:11,fontWeight:700}}>{ind.label}</div></button>)}
            </div>
            {brand.industry&&<div>
              <div style={{fontSize:9,color:S.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:7}}>Rodzaj działalności</div>
              <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                {INDUSTRIES[brand.industry].types.map(t=><button key={t.id} onClick={()=>setBrand(b=>({...b,industryType:t.id}))} style={{padding:"4px 12px",borderRadius:12,fontSize:11,fontWeight:700,cursor:"pointer",border:"1px solid "+(brand.industryType===t.id?S.green:S.border),background:brand.industryType===t.id?S.green+"18":"transparent",color:brand.industryType===t.id?S.green:S.muted}}>{t.label}</button>)}
              </div>
            </div>}
          </Card>
          {(brand.name||brand.url)&&<Card style={{marginBottom:12}}>
            <SL>Warianty nazwy marki — system szuka każdego z nich w kolumnie Mentions</SL>
            <Explain type="step"><strong>Narzędzie szuka tych słów w kolumnie Mentions w plikach CSV.</strong> Jeśli AI napisze "ostry-sklep" — wykryje wzmiankę. Jeśli napisze "OstrySklep" bez myślnika — też wykryje. Usuń warianty które nie mają sensu (kliknij ✕), dodaj własne przez pole poniżej.</Explain>
            <div style={{display:"flex",gap:7,flexWrap:"wrap",marginTop:10,marginBottom:10}}>
              {autoVariants.map((v,i)=><span key={i} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px 3px 11px",borderRadius:13,fontSize:11,fontWeight:700,background:S.green+"18",border:"1px solid "+S.green+"33",color:S.green}}>{v}<button onClick={()=>setRemovedVariants(prev=>new Set([...prev,v]))} style={{background:"none",border:"none",cursor:"pointer",color:S.green+"80",fontSize:12,lineHeight:1,padding:0}}>✕</button></span>)}
              {brandVariants.map((v,i)=><span key={"c"+i} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px 3px 11px",borderRadius:13,fontSize:11,fontWeight:700,background:S.sky+"18",border:"1px solid "+S.sky+"33",color:S.sky}}>{v}<button onClick={()=>setBrandVariants(prev=>prev.filter(x=>x!==v))} style={{background:"none",border:"none",cursor:"pointer",color:S.sky+"80",fontSize:12,lineHeight:1,padding:0}}>✕</button></span>)}
              {(removedVariants.size>0||brandVariants.length>0)&&<button onClick={()=>{setRemovedVariants(new Set());setBrandVariants([]);}} style={{padding:"3px 9px",borderRadius:12,fontSize:11,background:"transparent",border:"1px solid "+S.border,color:S.muted,cursor:"pointer"}}>↺ Reset</button>}
            </div>
            <div style={{display:"flex",gap:7,alignItems:"center"}}>
              <input value={variantInput} onChange={e=>setVariantInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&variantInput.trim()){setBrandVariants(prev=>[...new Set([...prev,variantInput.trim()])]);setVariantInput("");}}} placeholder="Dodaj własny wariant i naciśnij Enter (np. Ostry Sklep)" style={{flex:1,background:S.navy1,border:"1px solid "+S.border,borderRadius:8,padding:"8px 11px",color:S.text,fontSize:12,outline:"none"}}/>
              <button onClick={()=>{if(variantInput.trim()){setBrandVariants(p=>[...new Set([...p,variantInput.trim()])]);setVariantInput("");}}} style={{padding:"8px 13px",background:S.sky+"18",border:"1px solid "+S.sky+"44",borderRadius:8,color:S.sky,fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Dodaj</button>
            </div>
          </Card>}
          {brand.industryType&&<Card style={{marginBottom:12}}>
            <SL color={S.gold}>Typowe tematy zapytań dla tej branży</SL>
            <Explain type="info">To są typowe zapytania dla tej branży — sprawdź czy Twoja marka pojawia się w danych przy tych tematach. To podpowiedź, nie filtr.</Explain>
            <div style={{display:"flex",gap:7,flexWrap:"wrap",marginTop:8}}>
              {industryHints.map((h,i)=><span key={i} style={{padding:"3px 11px",borderRadius:13,fontSize:11,fontWeight:600,background:S.gold+"12",border:"1px solid "+S.gold+"33",color:S.gold}}>{h}</span>)}
            </div>
          </Card>}
          <button onClick={()=>setTab("import")} disabled={!(brand.name&&brand.url)} style={{marginTop:4,padding:"10px 22px",background:!(brand.name&&brand.url)?"transparent":S.green+"18",border:"1px solid "+((!(brand.name&&brand.url))?S.border:S.green+"55"),borderRadius:10,color:(!(brand.name&&brand.url))?S.border:S.green,fontSize:13,fontWeight:700,cursor:(!(brand.name&&brand.url))?"not-allowed":"pointer"}}>Dalej → Import CSV</button>
        </div>}

        {/* IMPORT */}
        {tab==="import"&&<div>
          <STitle>Import plików CSV z Ahrefs</STitle>
          <p style={{fontSize:12,color:S.muted,marginBottom:14}}>Wgraj wszystkie pliki naraz. Encoding (UTF-8/UTF-16) i separator (TAB/przecinek) wykrywane automatycznie.</p>
          <div onDragOver={e=>{e.preventDefault();}} onDrop={e=>{e.preventDefault();Array.from(e.dataTransfer.files).forEach(f=>{const r=new FileReader();r.onload=ev=>handleFiles(f.name,ev.target.result);r.readAsArrayBuffer(f);});}} onClick={()=>document.getElementById("fi").click()} style={{border:"2px dashed "+S.border,borderRadius:11,padding:"28px 20px",cursor:"pointer",textAlign:"center",marginBottom:14}}>
            <input id="fi" type="file" accept=".csv" multiple style={{display:"none"}} onChange={e=>Array.from(e.target.files).forEach(f=>{const r=new FileReader();r.onload=ev=>handleFiles(f.name,ev.target.result);r.readAsArrayBuffer(f);})}/>
            <div style={{fontSize:28,marginBottom:6}}>{loadingFile?"⏳":"📂"}</div>
            <div style={{fontSize:14,fontWeight:700,color:S.text,marginBottom:3}}>{loadingFile?"Przetwarzanie: "+loadingFile+"...":"Upuść pliki CSV z Ahrefs lub kliknij"}</div>
            <div style={{fontSize:11,color:S.muted}}>UTF-8 i UTF-16 · TAB i CSV · platforma wykrywana automatycznie</div>
          </div>
          {totalM===0&&allMentionsInData.length>0&&<div style={{marginBottom:12,padding:"13px 15px",background:"#080e0a",border:"1px solid "+S.gold+"44",borderRadius:11}}>
            <div style={{fontSize:12,fontWeight:700,color:S.gold,marginBottom:7}}>⚠️ Marka "{brandKey}" nie znaleziona — kliknij właściwą lub wpisz ręcznie:</div>
            <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:9}}>
              {allMentionsInData.map((m,i)=>{const cols=[S.sky,S.coral,S.gold,S.purple,"#34d399",S.green];const act=brandMentionKey===m;return<button key={i} onClick={()=>setBrandMentionKey(act?"":m)} style={{padding:"4px 12px",borderRadius:13,fontSize:11,fontWeight:700,cursor:"pointer",background:act?cols[i%6]+"33":cols[i%6]+"12",border:"1px solid "+(act?cols[i%6]:cols[i%6]+"44"),color:cols[i%6]}}>{m}</button>;})}
            </div>
            <div style={{display:"flex",gap:7,alignItems:"center"}}>
              <input value={brandMentionKey} onChange={e=>setBrandMentionKey(e.target.value)} placeholder="lub wpisz ręcznie..." style={{flex:1,background:S.navy2,border:"1px solid "+S.border,borderRadius:8,padding:"7px 11px",color:S.text,fontSize:12,outline:"none",fontFamily:"monospace"}}/>
              {brandMentionKey&&<button onClick={()=>setBrandMentionKey("")} style={{padding:"5px 11px",background:"transparent",border:"1px solid "+S.border,borderRadius:8,color:S.muted,fontSize:11,cursor:"pointer"}}>✕</button>}
            </div>
          </div>}
          {filesLoaded>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:9,marginBottom:12}}>
            {PLATFORMS.map(p=>{const d=proc[p.id];const loaded=!!files[p.id];return<div key={p.id} style={{padding:"11px 13px",background:S.navy2,border:"1px solid "+(loaded?p.color+"44":S.border),borderRadius:10}}>
              <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}><span style={{background:p.color+"20",color:p.color,borderRadius:5,padding:"1px 6px",fontSize:10,fontWeight:700}}>{p.icon} {p.name}</span>{loaded?<span style={{fontSize:10,color:S.green}}>✅</span>:<span style={{fontSize:10,color:S.muted}}>—</span>}</div>
              {loaded?<><div style={{fontSize:9,color:S.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:3}}>{files[p.id].filename}</div><div style={{fontSize:11,color:S.text,fontFamily:"monospace"}}>{fmtN(d.total)} zapytań — <span style={{color:S.green}}>{fmtN(d.mentions)} wzmianek</span> · <span style={{color:S.sky}}>{fmtN(d.citations)} cytowań</span></div><div style={{fontSize:10,color:"#6090a8",marginTop:2}}>W ilu zapytaniach pojawia się jakakolwiek marka: {fmtN(d.withAnyBrand)} ({fmtP(d.withAnyBrand,d.total)})</div></>:<div style={{fontSize:11,color:"#3a6080"}}>— wgraj CSV z Ahrefs dla tej platformy</div>}
            </div>;})}
          </div>}
          {unknownFiles.length>0&&<div style={{marginBottom:12,padding:"13px 15px",background:S.gold+"0a",border:"1px solid "+S.gold+"33",borderRadius:10}}>
            <div style={{fontSize:11,color:S.gold,fontWeight:700,marginBottom:9}}>⚠️ Nie rozpoznano platformy — kliknij właściwą:</div>
            {unknownFiles.map((uf,fi)=>(
  <div key={fi} style={{marginBottom:12}}>
    <div style={{fontSize:10,color:"#7aaabf",marginBottom:4,fontFamily:"monospace"}}>📄 {uf.filename}</div>
    {uf.conflictNote&&<div style={{padding:"9px 12px",background:"#0f0e00",border:"1px solid "+S.gold+"55",borderRadius:7,marginBottom:8,fontSize:12,color:"#d4a820",lineHeight:1.7}}>{uf.conflictNote}</div>}
    {!uf.conflict&&<div style={{fontSize:10,color:"#5080a0",marginBottom:7}}>Nagłówki pliku: <span style={{color:"#7aaabf"}}>{(uf.headers||[]).slice(0,6).join(", ")}</span></div>}
    <div style={{fontSize:11,color:"#9abfd0",marginBottom:7}}>Kliknij właściwą platformę:</div>
    <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{PLATFORMS.map(p=><button key={p.id} onClick={()=>assignPlatform(uf.filename,p.id)} style={{padding:"6px 14px",borderRadius:12,fontSize:11,fontWeight:700,cursor:"pointer",background:uf.conflict&&p.id==="ai_mode"?p.color+"44":p.color+"18",border:"2px solid "+(uf.conflict&&p.id==="ai_mode"?p.color:p.color+"33"),color:p.color,boxShadow:uf.conflict&&p.id==="ai_mode"?"0 0 8px "+p.color+"44":"none"}}>{p.icon} {p.name}</button>)}</div>
  </div>
))}
          </div>}
          {errors.length>0&&unknownFiles.length===0&&<div style={{marginBottom:12,padding:"9px 13px",background:S.coral+"0f",border:"1px solid "+S.coral+"33",borderRadius:8}}>{errors.map((e,i)=><div key={i} style={{fontSize:11,color:S.coral}}>{e}</div>)}</div>}
          <button onClick={()=>setTab("dashboard")} style={{padding:"10px 22px",background:S.green+"18",border:"1px solid "+S.green+"55",borderRadius:10,color:S.green,fontSize:13,fontWeight:700,cursor:"pointer"}}>Dashboard →</button>
        </div>}

        {/* DASHBOARD */}
        {tab==="dashboard"&&<div>
          <STitle>Dashboard Widoczności AI</STitle>

          {/* SOV explainer */}
          <div style={{background:"#030c18",border:"1px solid #1a3a55",borderRadius:12,padding:"16px 18px",marginBottom:20}}>
            <div style={{fontWeight:800,color:"#70c0e0",marginBottom:12,fontSize:13}}>📐 Skąd bierze się AI Share of Voice — wyjaśnienie krok po kroku</div>
            <div style={{fontSize:12,color:"#8abbd0",lineHeight:1.8,marginBottom:12}}>
              <strong style={{color:S.text}}>Co to jest SOV?</strong> Wyobraź sobie że AI ma 100 wypowiedzi o nożach. W 10 wymienia Twoją markę, w 30 wymienia konkurentów. Twój "kawałek tortu" to 10 ÷ (10+30) = <strong style={{color:S.green}}>25%</strong>.
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <div style={{background:"#040e1a",borderRadius:8,padding:"12px 14px",border:"1px solid #1a3a55"}}>
                <div style={{fontSize:10,color:"#5090a8",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.7px",marginBottom:6}}>Wzór (co liczymy)</div>
                <div style={{fontFamily:"monospace",fontSize:12,color:"#90c8e0",lineHeight:1.8}}>
                  <div>Twoje wzmianki: <strong style={{color:S.green}}>{fmtN(totalM)}</strong></div>
                  <div>Wzmianki konkurentów: <strong style={{color:"#90c8e0"}}>{fmtN(totalCompM)}</strong></div>
                  <div style={{borderTop:"1px solid #1a3a55",marginTop:6,paddingTop:6,fontWeight:700}}>
                    SOV = {fmtN(totalM)} ÷ {fmtN(totalM+totalCompM)} = <span style={{color:S.green,fontSize:14}}>{avgSOV}%</span>
                  </div>
                </div>
              </div>
              <div style={{background:"#100800",borderRadius:8,padding:"12px 14px",border:"1px solid #3a2200"}}>
                <div style={{fontSize:10,color:"#806020",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.7px",marginBottom:6}}>Dlaczego Ahrefs pokazuje inny %?</div>
                <div style={{fontSize:12,color:"#c09050",lineHeight:1.7}}>
                  Ahrefs liczy: wzmianki ÷ <em>zapytania z jakąkolwiek marką</em>.<br/>
                  My liczymy: wzmianki ÷ <em>wzmianki Twoje + wzmianki konkurentów</em>.<br/>
                  <strong style={{color:"#e0a040"}}>Nasz wzór jest bardziej precyzyjny.</strong> Ahrefs zawyża wynik bo zmniejsza mianownik.
                </div>
              </div>
            </div>
          </div>

          {/* 4 KPIs */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:18}}>
            {[
              {label:"AI Share of Voice",value:avgSOV+"%",color:S.green,calc:fmtN(totalM)+" ÷ "+fmtN(totalM+totalCompM),desc:avgSOV>=30?"Silna pozycja":avgSOV>=10?"Umiarkowana widoczność":"Niska — priorytet działań"},
              {label:"Mention Rate",value:fmtP(totalM,totalWB),color:S.purple,calc:fmtN(totalM)+" ÷ "+fmtN(totalWB)+" zapytań z markami",desc:"% zapytań z marką gdzie AI wymienia Twoją"},
              {label:"Citation Rate",value:fmtP(totalC,totalQ),color:S.coral,calc:fmtN(totalC)+" ÷ "+fmtN(totalQ)+" wszystkich zapytań",desc:"% zapytań gdzie AI cytuje Twoją stronę"},
              {label:"Presence Score",value:fmtP(totalM+totalC*0.5,totalQ),color:S.sky,calc:"("+fmtN(totalM)+"+"+fmtN(totalC)+"×0.5) ÷ "+fmtN(totalQ),desc:"Łączna obecność: wzmianki + cytowania"},
            ].map((k,i)=><div key={i} style={{background:S.navy2,border:"1px solid "+k.color+"18",borderRadius:11,padding:"14px 13px"}}>
              <div style={{fontSize:9,color:S.muted,textTransform:"uppercase",letterSpacing:"1px",fontWeight:700,marginBottom:7}}>{k.label}</div>
              <div style={{fontSize:26,fontWeight:900,color:k.color,lineHeight:1,marginBottom:5}}>{k.value}</div>
              <div style={{fontSize:9,color:"#5090a8",fontFamily:"monospace",lineHeight:1.4,marginBottom:6}}>{k.calc}</div>
              <div style={{fontSize:10,color:"#8ab8cc",lineHeight:1.4,borderTop:"1px solid #0e2030",paddingTop:6}}>{k.desc}</div>
            </div>)}
          </div>

          {/* Per-platform table */}
          <Card style={{marginBottom:14}}>
            <SL>Wyniki per platforma — skąd te liczby?</SL>
            <Explain type="info"><strong>Skąd te liczby?</strong> Każdy wiersz = jedno zapytanie. "Zapytania" = ile wierszy było w pliku. "Wzmianki" = w ilu zapytaniach AI napisał nazwę Twojej marki. "Zapytania z jakąkolwiek marką" = zapytania gdzie jakakolwiek marka się pojawia (mianownik dla Mention Rate). SOV = wzmianki Twojej marki ÷ (Twoje + wszystkich konkurentów wzmianki).</Explain>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <thead><tr style={{borderBottom:"1px solid "+S.border}}>{["Platforma","Plik CSV","Zapytania","Zapytania z jakąkolwiek marką","Wzmianki","Cytowania","SOV %","Mention Rate"].map(h=><th key={h} style={{padding:"7px 9px",textAlign:"left",fontSize:9,color:S.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.7px"}}>{h}</th>)}</tr></thead>
                <tbody>{PLATFORMS.map(p=>{const d=proc[p.id];const loaded=!!files[p.id];const sov=calcSOV(d.mentions,d.compSet);const mr=d.withAnyBrand>0?Math.round((d.mentions/d.withAnyBrand)*100):0;return<tr key={p.id} style={{borderBottom:"1px solid "+S.navy3,opacity:loaded?1:0.3}}>
                  <td style={{padding:"8px 9px"}}><span style={{background:p.color+"20",color:p.color,borderRadius:5,padding:"2px 6px",fontSize:10,fontWeight:700}}>{p.icon} {p.name}</span></td>
                  <td style={{padding:"8px 9px",color:S.muted,fontSize:10,maxWidth:130,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{files[p.id]?.filename?.split("/").pop().replace(/ostry-sklep.*?_/,"")?.slice(0,30)||"—"}</td>
                  <td style={{padding:"8px 9px",fontFamily:"monospace",color:"#7aaabf"}}>{fmtN(d.total)}</td>
                  <td style={{padding:"8px 9px",fontFamily:"monospace",color:"#7aaabf"}}>{fmtN(d.withAnyBrand)}</td>
                  <td style={{padding:"8px 9px",fontFamily:"monospace",color:S.green,fontWeight:700}}>{fmtN(d.mentions)}</td>
                  <td style={{padding:"8px 9px",fontFamily:"monospace",color:S.sky,fontWeight:700}}>{fmtN(d.citations)}</td>
                  <td style={{padding:"8px 9px"}}><div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:32,height:4,background:S.navy4,borderRadius:2,overflow:"hidden"}}><div style={{width:Math.max(sov,sov>0?5:0)+"%",height:"100%",background:p.color}}/></div><span style={{fontFamily:"monospace",fontSize:11,fontWeight:700,color:S.text}}>{sov}%</span></div></td>
                  <td style={{padding:"8px 9px",fontFamily:"monospace",color:mr>=10?S.green:mr>=2?S.gold:S.coral}}>{mr}%</td>
                </tr>;})}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Charts */}
          <div style={{display:"grid",gridTemplateColumns:"3fr 2fr",gap:12,marginBottom:14}}>
            <Card>
              <SL>Udział głosu SOV dla każdej platformy</SL>
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={sovData} margin={{top:10,right:10,left:-22,bottom:0}}>
                  <CartesianGrid strokeDasharray="2 4" stroke={S.border}/>
                  <XAxis dataKey="platform" tick={{fill:S.muted,fontSize:9}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:S.muted,fontSize:9}} axisLine={false} tickLine={false} domain={[0,100]}/>
                  <Tooltip content={<Tip/>}/>
                  <Bar dataKey="sov" name="SOV %" radius={[4,4,0,0]} label={{position:"top",fill:S.muted,fontSize:9,formatter:v=>v+"%"}}>
                    {PLATFORMS.map((p,i)=><Cell key={i} fill={p.color}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card>
              <SL>Wzmianki vs Cytowania</SL>
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={sovData} margin={{top:10,right:10,left:-22,bottom:0}}>
                  <CartesianGrid strokeDasharray="2 4" stroke={S.border}/>
                  <XAxis dataKey="platform" tick={{fill:S.muted,fontSize:9}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:S.muted,fontSize:9}} axisLine={false} tickLine={false}/>
                  <Tooltip content={<Tip/>}/><Legend wrapperStyle={{fontSize:10,color:S.muted}}/>
                  <Bar dataKey="mentions" name="Wzmianki" fill={S.green} radius={[3,3,0,0]}/>
                  <Bar dataKey="citations" name="Cytowania" fill={S.sky} radius={[3,3,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Competitors chart */}
          {allComps.length>0&&<Card style={{marginBottom:14}}>
            <SL>Konkurenci wykryci automatycznie z kolumny Mentions</SL>
            <Explain type="info"><strong>Skąd ci konkurenci?</strong> Narzędzie automatycznie wyciąga wszystkie nazwy z kolumny Mentions w Twoich plikach. To marki które AI wymienia w tych samych odpowiedziach co Twoja branża. Jeśli widzisz tu swoją markę zamiast konkurenta — sprawdź klucz marki w kroku ① Klient.</Explain>
            <ResponsiveContainer width="100%" height={Math.min(36*Math.min(allComps.length+1,9)+36,320)}>
              <BarChart data={[{name:brand.name||"Twoja marka",count:totalM},...allComps.slice(0,8).map(c=>({name:c,count:compCounts[c]}))]} layout="vertical" margin={{top:4,right:45,left:10,bottom:0}}>
                <CartesianGrid strokeDasharray="2 4" stroke={S.border} horizontal={false}/>
                <XAxis type="number" tick={{fill:S.muted,fontSize:9}} axisLine={false} tickLine={false}/>
                <YAxis dataKey="name" type="category" tick={{fill:S.text,fontSize:10}} axisLine={false} tickLine={false} width={120}/>
                <Tooltip content={<Tip/>}/>
                <Bar dataKey="count" name="Wzmianki" radius={[0,4,4,0]} label={{position:"right",fill:S.muted,fontSize:9}}>
                  {[{fill:S.green},...allComps.slice(0,8).map((_,i)=>({fill:[S.sky,S.coral,S.gold,S.purple,"#34d399",S.sky,S.coral,S.gold][i]}))].map((e,i)=><Cell key={i} fill={e.fill}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>}

          {/* Opportunities */}
          <Card style={{marginBottom:14,border:"1px solid "+S.gold+"33"}}>
            <SL color={S.gold}>⚡ Opportunities — Quick Wins</SL>
            <div style={{fontSize:11,color:"#c09840",marginBottom:10,padding:"8px 12px",background:"#120e00",borderRadius:6,border:"1px solid #4a3800"}}>⚠️ <strong style={{color:S.gold}}>Uwaga: to są SUGESTIE, nie gotowe zadania!</strong> Sprawdź każdą zanim wdrożysz — narzędzie nie zna kontekstu Twojej branży — generowane automatycznie. Sprawdź kontekst branżowy przed wdrożeniem.</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
              {(()=>{
                const ops=[];
                const z=PLATFORMS.filter(p=>proc[p.id].total>0&&proc[p.id].mentions===0);
                if(z.length>0)ops.push({icon:"🎯",tag:"QUICK WIN",color:S.green,title:"Nieobecne platformy",body:z.map(p=>p.name).join(", ")+" — dane są, marka nie pojawia się. Twórz branded content."});
                if(totalC>0&&totalM===0)ops.push({icon:"🔗",tag:"QUICK WIN",color:S.sky,title:"Cytowana bez nazwy",body:"Strona cytowana "+fmtN(totalC)+"x ale marka nie wymieniana. Entity building: Wikipedia, Wikidata, About Us."});
                if(totalM>0&&totalC>totalM*5)ops.push({icon:"📎",tag:"QUICK WIN",color:S.purple,title:"Dużo cytowań vs wzmiankowania",body:fmtN(totalC)+" cytowań vs "+fmtN(totalM)+" wzmianek AI ufa stronie ale nie kojarzy nazwy. Wzmocnij anchor texty."});
                const tc=allComps[0];if(tc&&compCounts[tc]>totalM*1.5)ops.push({icon:"⚔️",tag:"PRIORYTET",color:S.coral,title:"Konkurent dominuje",body:tc+" ma "+fmtN(compCounts[tc])+" wzmianek vs "+fmtN(totalM)+" Twojej. Zbadaj ich content i stwórz odpowiedzi na te same zapytania."});
                const ls=PLATFORMS.filter(p=>proc[p.id].mentions>0&&calcSOV(proc[p.id].mentions,proc[p.id].compSet)<15);
                if(ls.length>0)ops.push({icon:"📈",tag:"SZANSA",color:S.sky,title:"SOV < 15%",body:ls.map(p=>p.name).join(", ")+" — SOV poniżej 15%. Twórz FAQ, how-to, listy porównawcze."});
                ops.push({icon:"🔄",tag:"ZAWSZE",color:S.gold,title:"Content freshness",body:"Modele AI preferują świeże treści. Zaktualizuj kluczowe strony — data, FAQ z aktualnymi danymi."});
                return ops.slice(0,6).map((op,i)=><div key={i} style={{padding:"11px 13px",background:op.color+"08",border:"1px solid "+op.color+"22",borderRadius:9}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}><span style={{fontSize:13}}>{op.icon}</span><span style={{fontSize:9,fontWeight:800,color:op.color,background:op.color+"20",borderRadius:4,padding:"1px 5px",letterSpacing:"0.7px",textTransform:"uppercase"}}>{op.tag}</span><span style={{fontSize:11,fontWeight:700,color:S.text}}>{op.title}</span></div>
                  <div style={{fontSize:11,color:"#90b8cc",lineHeight:1.65,marginTop:2}}>{op.body}</div>
                </div>);
              })()}
            </div>
          </Card>

          {/* Spostrzeżenia */}
          <Card style={{marginBottom:14}}>
            <SL>✦ Co to oznacza — wnioski</SL>
            <div style={{fontSize:11,color:"#8ab8cc",marginBottom:10,padding:"7px 11px",background:"#030c18",borderRadius:6,border:"1px solid #0e2a3a"}}>ℹ️ <strong>Wnioski tworzone automatycznie z liczb.</strong> Traktuj je jako punkt wyjścia — zawsze weryfikuj czy mają sens dla tej konkretnej branży.</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
              {best&&<div style={{padding:"10px 13px",background:S.green+"08",border:"1px solid "+S.green+"22",borderRadius:9}}><div style={{display:"flex",gap:7,alignItems:"flex-start"}}><span style={{color:S.green,fontWeight:900,flexShrink:0}}>↑</span><span style={{fontSize:11,color:"#90b8cc",lineHeight:1.6}}><strong style={{color:S.green}}>Najlepsza: {best.platform}</strong> SOV {best.sov}% — {best.sov>=30?"silna pozycja, utrzymuj.":best.sov>=10?"umiarkowana, rozbuduj FAQ i how-to.":"niska, twórz dedykowany content."}</span></div></div>}
              {worst&&worst!==best&&<div style={{padding:"10px 13px",background:S.coral+"08",border:"1px solid "+S.coral+"22",borderRadius:9}}><div style={{display:"flex",gap:7,alignItems:"flex-start"}}><span style={{color:S.coral,fontWeight:900,flexShrink:0}}>↓</span><span style={{fontSize:11,color:"#90b8cc",lineHeight:1.6}}><strong style={{color:S.coral}}>Do działania: {worst.platform}</strong> SOV {worst.sov}% — {worst.sov===0?"marka całkowicie nieobecna. Zbadaj zapytania tej platformy.":"najniższy SOV. Twórz content w formacie tej platformy."}</span></div></div>}
              {totalQ>0&&(()=>{
                const ratio=totalM>0?totalC/totalM:null;
                if(totalM===0&&totalC===0)return<div style={{padding:"10px 13px",background:S.muted+"08",border:"1px solid "+S.border,borderRadius:9}}><div style={{fontSize:11,color:S.muted}}>○ Brak obecności — marka niewidoczna dla AI. Start od entity building i structured data.</div></div>;
                if(totalM===0&&totalC>0)return<div style={{padding:"10px 13px",background:S.gold+"08",border:"1px solid "+S.gold+"22",borderRadius:9}}><div style={{fontSize:11,color:S.muted,lineHeight:1.55}}>! <strong style={{color:S.gold}}>Cytowana bez nazwy</strong> ({fmtN(totalC)} cytowań, 0 wzmianek) — AI ufa stronie ale nie kojarzy marki. Priorytet: Wikipedia, Wikidata, About Us.</div></div>;
                if(ratio!==null&&ratio>8)return<div style={{padding:"10px 13px",background:S.coral+"08",border:"1px solid "+S.coral+"22",borderRadius:9}}><div style={{fontSize:11,color:S.muted,lineHeight:1.55}}>! <strong style={{color:S.coral}}>Dysproporcja</strong> {fmtN(totalC)} cytowań vs {fmtN(totalM)} wzmianek — AI używa strony ale nie zna nazwy. Anchor texty z nazwą marki.</div></div>;
                if(ratio!==null&&ratio<0.15&&totalM>=5)return<div style={{padding:"10px 13px",background:S.purple+"08",border:"1px solid "+S.purple+"22",borderRadius:9}}><div style={{fontSize:11,color:S.muted,lineHeight:1.55}}>! <strong style={{color:S.purple}}>Wzmianki bez cytowań</strong> — AI zna markę ale nie poleca strony. Wdróż structured data, Core Web Vitals.</div></div>;
                return<div style={{padding:"10px 13px",background:S.green+"08",border:"1px solid "+S.green+"22",borderRadius:9}}><div style={{fontSize:11,color:S.muted,lineHeight:1.55}}>✓ <strong style={{color:S.green}}>Obecność potwierdzona:</strong> {fmtN(totalM)} wzmianek + {fmtN(totalC)} cytowań Zwiększ częstotliwość przez content plan.</div></div>;
              })()}
              {allComps.length>0&&(()=>{const tc=allComps[0];const tc2=compCounts[tc];if(tc2>totalM*2)return<div style={{padding:"10px 13px",background:S.coral+"08",border:"1px solid "+S.coral+"22",borderRadius:9}}><div style={{fontSize:11,color:S.muted,lineHeight:1.55}}>⚔️ <strong style={{color:S.coral}}>{tc} dominuje</strong>: {fmtN(tc2)} wzmianek vs {fmtN(totalM)} Twojej. Zbadaj ich content i stwórz odpowiedzi na te same zapytania.</div></div>;if(tc2>totalM)return<div style={{padding:"10px 13px",background:S.gold+"08",border:"1px solid "+S.gold+"22",borderRadius:9}}><div style={{fontSize:11,color:S.muted,lineHeight:1.55}}>⚔️ <strong style={{color:S.gold}}>{tc} nieznacznie wyprzedza</strong> ({fmtN(tc2)} vs {fmtN(totalM)} wzmianek). Do nadgonienia w 2-3 miesiące.</div></div>;return<div style={{padding:"10px 13px",background:S.green+"08",border:"1px solid "+S.green+"22",borderRadius:9}}><div style={{fontSize:11,color:S.muted,lineHeight:1.55}}>⚔️ <strong style={{color:S.green}}>Marka wyprzedza konkurentów.</strong> {tc}: {fmtN(tc2)} wzmianek vs Twoje {fmtN(totalM)}. Utrzymaj tempo.</div></div>;})()}
            </div>
          </Card>

          {/* Definitions */}
          <div style={{paddingTop:18,borderTop:"1px solid "+S.border}}>
            <div style={{fontSize:11,color:"#90c0d8",fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",marginBottom:12}}>📖 Słownik wskaźników — co znaczy każda liczba</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9}}>
              {[
                {term:"AI Share of Voice",color:S.green,icon:"📊",def:"Twoje wzmianki ÷ (Twoje + konkurentów) × 100. Udział głosu w AI."},
                {term:"Mention Rate",color:S.purple,icon:"💬",def:"% zapytań z jakąkolwiek marką, gdzie AI wymienia Twoją. Rośnie przez content marketing."},
                {term:"Citation Rate",color:S.coral,icon:"🔗",def:"% zapytań gdzie AI podaje Twoją stronę jako link. Rośnie przez structured data i E-E-A-T."},
                {term:"Presence Score",color:S.sky,icon:"📡",def:"(Wzm. + Cyt.×0.5) ÷ wszystkie zapytania. Łączna obecność w AI."},
                {term:"Quick Win",color:S.gold,icon:"⚡",def:"Szansa z dysproporcji wskaźników. ZAWSZE weryfikuj ręcznie przed wdrożeniem."},
                {term:"Brand Variant",color:"#34d399",icon:"🔍",def:"Forma nazwy marki sprawdzana w Mentions. AI może pisać 'ostry-sklep', 'OstrySklep' lub 'Ostry Sklep'."},
              ].map((x,i)=><div key={i} style={{padding:"11px 13px",background:S.navy2,border:"1px solid "+x.color+"18",borderRadius:9}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}><span style={{fontSize:13}}>{x.icon}</span><span style={{fontSize:11,fontWeight:800,color:x.color}}>{x.term}</span></div><div style={{fontSize:11,color:"#8ab0c4",lineHeight:1.65}}>{x.def}</div></div>)}
            </div>
          </div>
          <button onClick={()=>setTab("report")} style={{marginTop:20,padding:"10px 22px",background:S.green+"18",border:"1px solid "+S.green+"55",borderRadius:10,color:S.green,fontSize:13,fontWeight:700,cursor:"pointer"}}>Generuj Raport →</button>
        </div>}

        {/* REPORT */}
        {tab==="report"&&(()=>{
          // Auto-generate per-section content
          const autoSections = {
            intro: [
              "Raport dotyczy marki " + (brand.name||"[marka]") + (brand.url ? " (" + brand.url + ")" : "") + (brand.industryType ? ", branża: " + brand.industryType : "") + ".",
              "Analiza obejmuje " + fmtN(totalQ) + " zapytań na " + PLATFORMS.filter(p=>proc[p.id].total>0).length + " platformach AI: " + PLATFORMS.filter(p=>proc[p.id].total>0).map(p=>p.name).join(", ") + ".",
            ].join(" "),
            sov: [
              "AI Share of Voice wynosi " + avgSOV + "% — oznacza to, że na każde " + fmtN(totalM+totalCompM) + " wzmianek marek z tej branży w odpowiedziach AI, " + fmtN(totalM) + " dotyczy " + (brand.name||"Twojej marki") + ".",
              avgSOV >= 30 ? "To silna pozycja — marka jest jedną z pierwszych wymienianych przez AI w tej kategorii."
                : avgSOV >= 10 ? "To umiarkowana widoczność. Jest wyraźna przestrzeń do wzrostu przez systematyczny content i entity building."
                : "To niski wynik — marka rzadko pojawia się w odpowiedziach AI. Priorytet: tworzenie treści odpowiadających na pytania branżowe i budowanie rozpoznawalności w AI.",
              best ? "Najlepsza platforma to " + best.platform + " (SOV " + best.sov + "%)." + (worst && worst !== best ? " Najsłabsza: " + worst.platform + " (SOV " + worst.sov + "%) — wymaga dedykowanej strategii contentu." : "") : "",
            ].filter(Boolean).join(" "),
            mentions: [
              "Marka wymieniana jest " + fmtN(totalM) + " razy spośród " + fmtN(totalWB) + " zapytań, w których AI wspomina jakąkolwiek markę z branży (" + fmtP(totalM,totalWB) + ").",
              totalM === 0 && totalC > 0
                ? "Ważna obserwacja: strona jest cytowana przez AI " + fmtN(totalC) + " razy jako źródło, ale AI nie wymienia nazwy marki. To tzw. 'anonimowy ekspert' — AI ufa treściom ale nie kojarzy ich z konkretną marką. Priorytet: entity building (Wikipedia, Wikidata, wyraźne About Us z nazwą marki)."
                : totalM > 0
                  ? "Citation Rate wynosi " + fmtP(totalC,totalQ) + " (" + fmtN(totalC) + " cytowań) — " + (totalC > totalM * 3 ? "strona jest częściej cytowana jako źródło niż wymieniana z nazwy, co wskazuje na wysoki autorytet techniczny domeny." : "wzmianki i cytowania są w zdrowej proporcji.")
                  : "Marka nie pojawia się ani jako wzmianka, ani jako cytowanie — konieczne działania od podstaw.",
            ].filter(Boolean).join(" "),
            competitors: allComps.length > 0
              ? "W danych wykryto " + allComps.length + " konkurentów. Najczęściej wymieniani przez AI: " + allComps.slice(0,4).map(c=>c+" ("+fmtN(compCounts[c])+" wzmianek)").join(", ") + ". " + (compCounts[allComps[0]] > totalM * 1.5 ? allComps[0] + " znacznie dominuje w AI — warto przeanalizować ich content i stworzyć odpowiedzi na te same zapytania." : "Pozycja marki jest konkurencyjna — utrzymuj regularny content aby nie stracić udziału.")
              : "Brak wykrytych konkurentów w danych — możliwe że marka działa w niszowej kategorii lub warianty nazw konkurentów nie pojawiają się w analizowanych zapytaniach.",
            strategy: [
              totalM === 0 && totalC > 0
                ? "1. Entity building — stwórz lub zaktualizuj profil w Wikipedii/Wikidata, zadbaj o wzmianki z nazwą marki w mediach branżowych i katalogach. 2. Wyraźne brandowanie w treściach — dodaj nazwę marki do nagłówków, meta opisów i sekcji About Us. 3. Structured data (Organization schema) — pomoże AI powiązać treść z konkretną marką."
                : totalM > 0
                  ? "1. Zwiększenie częstotliwości wzmianek — publikuj regularnie FAQ, how-to i poradniki odpowiadające na pytania z niskim SOV. 2. Optymalizacja słabszych platform — skup się na " + (worst ? worst.platform : "platformach z niskim SOV") + ". 3. Monitoring i iteracja — sprawdzaj wyniki co miesiąc i dostosowuj content plan."
                  : "1. Start od podstaw — wdróż structured data (Organization, FAQPage, BreadcrumbList). 2. Tworzenie treści pod konkretne pytania branżowe — zacznij od 2-4 artykułów miesięcznie. 3. Entity building — Wikipedia/Wikidata, wzmianki w mediach branżowych.",
            ].filter(Boolean).join(" "),
          };
          // Merge: use user edit if set, else auto
          const getSec = key => reportSections[key] !== null && reportSections[key] !== undefined ? reportSections[key] : autoSections[key];
          
          const sectionDefs = [
            {
              id:"s1", key:"intro", label:"① Wprowadzenie", color:S.sky,
              icon:"📋", desc:"Informacje o kliencie i zakresie analizy",
              preview: getSec("intro"),
              hint:"Edytuj jeśli chcesz zmienić opis klienta lub zakresu.",
            },
            {
              id:"s2", key:"sov", label:"② AI Share of Voice", color:S.green,
              icon:"📊", desc:"Wynik SOV i co oznacza",
              preview: getSec("sov"),
              hint:"Sprawdź czy interpretacja SOV pasuje do realiów klienta.",
            },
            {
              id:"s3", key:"mentions", label:"③ Wzmianki i cytowania per platforma", color:S.purple,
              icon:"💬", desc:"Ile razy AI wymienia markę i cytuje stronę",
              preview: getSec("mentions"),
              hint:"Zweryfikuj czy opis mentions/citations jest trafny dla tej branży.",
            },
            {
              id:"s4", key:"competitors", label:"④ Analiza konkurencji", color:S.coral,
              icon:"⚔️", desc:"Kto dominuje w AI i jak wypadasz na tle rynku",
              preview: getSec("competitors"),
              hint:"Sprawdź czy wykryci konkurenci to faktyczni konkurenci klienta.",
              ok: allComps.length > 0,
            },
            {
              id:"s5", key:"strategy", label:"⑤ Rekomendacje", color:S.gold,
              icon:"🚀", desc:"Co zrobić w kolejnych 3-6 miesiącach",
              preview: getSec("strategy"),
              hint:"Ważne: Rekomendacje są automatyczne — dostosuj je do specyfiki klienta zanim wyślesz raport!",
            },
          ];

          const readyToGenerate = sectionDefs
            .filter(s => s.ok !== false)
            .every(s => reportChecks[s.id] === true);

          // Build final comment from sections
          const finalComment = sectionDefs
            .filter(s => s.ok !== false && getSec(s.key))
            .map(s => getSec(s.key))
            .join("

");

          return <div>
            <STitle>Raport — przejrzyj i zatwierdź każdą sekcję</STitle>
            <Explain type="warn"><strong>Jak to działa?</strong> Każda sekcja poniżej ma automatycznie wypełnioną treść. Przeczytaj ją, edytuj jeśli trzeba, a potem zaznacz checkbox. Dopiero po zatwierdzeniu wszystkich sekcji odblokuje się przycisk generowania raportu.</Explain>

            {/* Top queries */}
            {(topBrandKws.length>0||topGapKws.length>0)&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
              {topBrandKws.length>0&&<Card style={{border:"1px solid "+S.green+"44"}}>
                <SL color={S.green}>🎯 AI JUŻ ZNA TWOJĄ MARKĘ — te zapytania</SL>
                <Explain type="success">Przy tych zapytaniach AI wymienia markę. Posortowane wg popularności. Warto dbać o pozycję tu i rozwijać te tematy.</Explain>
                {topBrandKws.map(([kw,vol],i)=><div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 8px",background:i%2===0?"#030e18":"transparent",borderRadius:5,marginTop:2}}>
                  <span style={{fontSize:12,color:"#c0dce8",flex:1,marginRight:7,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{kw}</span>
                  {vol>0&&<span style={{fontSize:10,color:"#5090a8",fontFamily:"monospace",flexShrink:0,background:"#040e1a",padding:"1px 6px",borderRadius:4}}>{fmtN(vol)}</span>}
                </div>)}
              </Card>}
              {topGapKws.length>0&&<Card style={{border:"1px solid "+S.coral+"44"}}>
                <SL color={S.coral}>⚠️ LUKI — marka nieobecna, konkurenci są</SL>
                <Explain type="warn">Przy tych popularnych zapytaniach AI wymienia konkurentów ale nie Twoją markę. To priorytetowe tematy do pokrycia contentem.</Explain>
                {topGapKws.map(([kw,{vol,comps}],i)=><div key={i} style={{padding:"6px 8px",background:i%2===0?"#130306":"transparent",borderRadius:5,marginTop:2}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:12,color:"#c0dce8",flex:1,marginRight:7,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{kw}</span>
                    {vol>0&&<span style={{fontSize:10,color:"#5090a8",fontFamily:"monospace",flexShrink:0,background:"#040e1a",padding:"1px 6px",borderRadius:4}}>{fmtN(vol)}</span>}
                  </div>
                  <div style={{fontSize:10,color:"#e08090",marginTop:2}}>AI wymienia: {comps.join(", ")}</div>
                </div>)}
              </Card>}
            </div>}

            {/* Section cards */}
            <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:16}}>
              {sectionDefs.map(s=>{
                const isOk = s.ok !== false;
                const checked = reportChecks[s.id]===true;
                return (
                  <div key={s.id} style={{borderRadius:12,border:"2px solid "+(checked?s.color+"66":isOk?s.color+"22":S.border),background:checked?s.color+"08":S.navy2,transition:"all .2s",opacity:isOk?1:0.45}}>
                    {/* Section header */}
                    <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:"1px solid "+(checked?s.color+"33":S.border)}}>
                      <span style={{fontSize:18}}>{s.icon}</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:800,color:checked?s.color:S.text}}>{s.label}</div>
                        <div style={{fontSize:11,color:"#6090a8",marginTop:2}}>{s.desc}</div>
                      </div>
                      {!isOk&&<span style={{fontSize:10,color:"#4a6080",background:"#0a1a28",borderRadius:5,padding:"2px 8px"}}>brak danych</span>}
                      {isOk&&<label style={{display:"flex",alignItems:"center",gap:7,cursor:"pointer",padding:"6px 12px",background:checked?s.color+"22":"#030c18",border:"1px solid "+(checked?s.color+"66":S.border),borderRadius:8,transition:"all .2s"}}>
                        <input type="checkbox" checked={checked} onChange={e=>setReportChecks(r=>({...r,[s.id]:e.target.checked}))} style={{width:14,height:14,accentColor:s.color}}/>
                        <span style={{fontSize:11,fontWeight:700,color:checked?s.color:"#5090a8",whiteSpace:"nowrap"}}>{checked?"✓ Zatwierdzone":"Zatwierdzam"}</span>
                      </label>}
                    </div>
                    {/* Section content — editable */}
                    {isOk&&<div style={{padding:"12px 16px"}}>
                      <div style={{fontSize:10,color:"#4a7090",marginBottom:6}}>{s.hint}</div>
                      <textarea
                        value={getSec(s.key)}
                        onChange={e=>updateSection(s.key, e.target.value)}
                        style={{width:"100%",boxSizing:"border-box",background:"#020a14",border:"1px solid "+(checked?"#0e2030":S.border),borderRadius:7,padding:"10px 12px",color:"#c0dce8",fontSize:12,lineHeight:1.75,outline:"none",resize:"vertical",minHeight:70,fontFamily:"inherit",transition:"border .15s"}}
                      />
                      {reportSections[s.key]!==null&&reportSections[s.key]!==undefined&&<button onClick={()=>updateSection(s.key,null)} style={{marginTop:5,fontSize:10,color:"#4a7090",background:"transparent",border:"none",cursor:"pointer",padding:0}}>↺ Przywróć auto-tekst</button>}
                    </div>}
                  </div>
                );
              })}
            </div>

            {/* Generate buttons */}
            <div style={{padding:"14px 16px",background:readyToGenerate?"#001a08":"#030c18",border:"1px solid "+(readyToGenerate?S.green+"44":S.border),borderRadius:10,marginBottom:14}}>
              {readyToGenerate
                ? <div style={{fontSize:12,color:S.green,fontWeight:700,marginBottom:10}}>✅ Wszystkie sekcje zatwierdzone — raport gotowy do wygenerowania!</div>
                : <div style={{fontSize:12,color:"#6090a8",marginBottom:10}}>Zatwierdź wszystkie sekcje powyżej żeby odblokować generowanie (pozostało: {sectionDefs.filter(s=>s.ok!==false&&!reportChecks[s.id]).length})</div>
              }
              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>{const html=buildReportHTML({...buildArgs(),finalComment});window.open(URL.createObjectURL(new Blob([html],{type:"text/html;charset=utf-8"})),"_blank");}} disabled={!readyToGenerate} style={{padding:"10px 20px",background:readyToGenerate?S.green+"22":"transparent",border:"1px solid "+(readyToGenerate?S.green+"66":S.border),borderRadius:9,color:readyToGenerate?S.green:"#3a6080",fontSize:13,fontWeight:700,cursor:readyToGenerate?"pointer":"not-allowed"}}>🔍 Otwórz podgląd</button>
                <button onClick={()=>{const html=buildReportHTML({...buildArgs(),finalComment});const a=document.createElement("a");a.href="data:text/html;charset=utf-8,"+encodeURIComponent(html);a.download="Sempai_AIVisibility_"+(brand.name||"Raport")+"_"+new Date().toISOString().slice(0,10)+".html";a.click();}} disabled={!readyToGenerate} style={{padding:"10px 20px",background:readyToGenerate?S.sky+"22":"transparent",border:"1px solid "+(readyToGenerate?S.sky+"66":S.border),borderRadius:9,color:readyToGenerate?S.sky:"#3a6080",fontSize:13,fontWeight:700,cursor:readyToGenerate?"pointer":"not-allowed"}}>⬇ Pobierz .html</button>
              </div>
            </div>

            <Card><SL>Podgląd KPI</SL><div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:9}}>{[{l:"AI SOV",v:avgSOV+"%",c:S.green},{l:"Mention Rate",v:fmtP(totalM,totalWB),c:S.purple},{l:"Citation Rate",v:fmtP(totalC,totalQ),c:S.coral},{l:"Zapytań",v:fmtN(totalQ),c:S.gold}].map((k,i)=><div key={i} style={{textAlign:"center",padding:"11px",background:"#020a14",borderRadius:8,border:"1px solid "+k.c+"22"}}><div style={{fontSize:9,color:"#4a7090",textTransform:"uppercase",letterSpacing:"1px",marginBottom:3}}>{k.l}</div><div style={{fontSize:20,fontWeight:900,color:k.c}}>{k.v}</div></div>)}</div></Card>
          </div>;
        })()}

        {/* PROMPT */}
        {tab==="prompt"&&<div>
          <STitle>Prompt dla AI — generuj raport .docx</STitle>
          <div style={{position:"relative"}}>
            <pre style={{background:S.navy1,border:"1px solid "+S.border,borderRadius:11,padding:"18px 20px",fontSize:12,lineHeight:1.8,color:"#3a6080",overflow:"auto",maxHeight:480,whiteSpace:"pre-wrap",fontFamily:"monospace"}}>
              {[
                "Jesteś ekspertem ds. AI Visibility. Przygotuj profesjonalny raport w języku polskim.",
                "",
                "KLIENT: "+(brand.name||"[KLIENT]")+" | URL: "+(brand.url||"—")+" | Branża: "+(brand.industryType||brand.industry||"—"),
                "KONKURENCI (z danych): "+(allComps.slice(0,5).map(c=>c+": "+compCounts[c]+" wzmianek").join(", ")||"brak"),
                "",
                "WYNIKI (SOV = wzmianek marki ÷ wzmianek marki + wzmianek konkurentów):",
                "AI Share of Voice: "+avgSOV+"%",
                "Mention Rate: "+fmtP(totalM,totalWB)+" ("+fmtN(totalM)+" wzmianek na "+fmtN(totalWB)+" zapytań z markami)",
                "Citation Rate: "+fmtP(totalC,totalQ)+" ("+fmtN(totalC)+" cytowań na "+fmtN(totalQ)+" zapytań)",
                "",
                "PER PLATFORMA:",
                ...PLATFORMS.map(p=>{const d=proc[p.id];if(!d.total)return null;return p.name+": "+fmtN(d.total)+" zapytań, "+fmtN(d.mentions)+" wzmianek, "+fmtN(d.citations)+" cytowań, SOV "+calcSOV(d.mentions,d.compSet)+"%";}).filter(Boolean),
                "",
                "TOP ZAPYTANIA Z MARKĄ:",
                ...topBrandKws.slice(0,5).map(([kw,vol])=>"• "+kw+(vol?" (wolumen: "+fmtN(vol)+")":" ")),
                "",
                "LUKI (konkurenci wymieniani, marka nie):",
                ...topGapKws.slice(0,5).map(([kw,{vol,comps}])=>"• "+kw+" — AI wymienia: "+comps.join(", ")+(vol?" (wolumen: "+fmtN(vol)+")":" ")),
                "",
                "RAPORT (.docx): 1. Podsumowanie z kluczowymi liczbami. 2. SOV metodologia i wyniki per platforma. 3. Analiza luk i rekomendacje. 4. Plan działań 3-6 mies. Każdy wniosek = konkretna liczba.",
              ].filter(x=>x!==null).join("\n")}
            </pre>
            <button onClick={()=>{setPromptCopied(true);setTimeout(()=>setPromptCopied(false),2000);}} style={{position:"absolute",top:13,right:13,background:promptCopied?S.green+"22":S.navy3,border:"1px solid "+(promptCopied?S.green:S.border),borderRadius:7,padding:"6px 14px",color:promptCopied?S.green:S.muted,fontSize:11,fontWeight:700,cursor:"pointer"}}>
              {promptCopied?"✓ Skopiowano!":"⎘ Kopiuj"}
            </button>
          </div>
        </div>}
      </div>
    </div>
  );
}

function buildReportHTML({brand,proc,totalQ,totalM,totalC,totalWB,avgSOV,allComps,compCounts,best,worst,topBrandKws,topGapKws,editableComment,totalCompM,finalComment}) {
  function fN(n){return(n||0).toLocaleString("pl-PL");}
  function fP(n,d){if(!d)return"0%";const v=(n/d)*100;if(v===0)return"0%";if(v<1)return v.toFixed(1)+"%";return Math.round(v)+"%";}
  function cSOV(m,cs){const ct=Object.values(cs||{}).reduce((s,v)=>s+v,0);return m+ct>0?Math.round((m/(m+ct))*100):0;}
  const date=new Date().toLocaleDateString("pl-PL",{year:"numeric",month:"long",day:"numeric"});
  const commentSrc = finalComment || editableComment || "Analiza obejmuje "+fN(totalQ)+" zapytań.";
  const commentP=commentSrc.split("\n").filter(Boolean).map(l=>"<p>"+l+"</p>").join("");
  const rows=PLATFORMS.filter(p=>proc[p.id].total>0).map(p=>{const d=proc[p.id];const sov=cSOV(d.mentions,d.compSet);const mr=d.withAnyBrand>0?Math.round((d.mentions/d.withAnyBrand)*100):0;const cr=d.total>0?Math.round((d.citations/d.total)*100):0;return"<tr><td><span style='background:"+p.color+"18;color:"+p.color+";padding:2px 8px;border-radius:5px;font-size:11px;font-weight:700'>"+p.icon+" "+p.name+"</span></td><td>"+fN(d.total)+"</td><td>"+fN(d.withAnyBrand)+"</td><td style='color:#1db872;font-weight:700'>"+fN(d.mentions)+"</td><td style='color:#2a7abf;font-weight:700'>"+fN(d.citations)+"</td><td><div style='display:flex;align-items:center;gap:8px'><div style='width:55px;height:7px;background:#e0eaf5;border-radius:3px;overflow:hidden'><div style='width:"+Math.min(sov,100)+"%;height:100%;background:"+p.color+"'></div></div><strong>"+sov+"%</strong></div></td><td style='color:"+(mr>=10?"#1db872":mr>=2?"#d4a017":"#e03050")+"'>"+mr+"%</td><td style='color:"+(cr>=10?"#1db872":cr>=2?"#d4a017":"#e03050")+"'>"+cr+"%</td></tr>";}).join("");
  const compHtml=allComps.length>0?"<section><h2><span class='num'>02</span> Konkurenci z danych AI</h2><div class='explain'><strong>Skąd dane?</strong> Kolumna Mentions w plikach CSV — marki wymieniane przez AI w tych samych odpowiedziach co Twoja branża.</div><table><thead><tr><th>Marka</th><th>Wzmianki AI</th><th>vs. "+(brand.name||"Twoja marka")+"</th></tr></thead><tbody><tr class='bench'><td><span style='background:#2edf8f18;color:#1db872;padding:2px 8px;border-radius:5px;font-size:11px;font-weight:700'>&#10022; "+(brand.name||"Twoja marka")+"</span></td><td><strong style='color:#1db872'>"+fN(totalM)+"</strong></td><td><span style='background:#2edf8f18;color:#1db872;padding:2px 6px;border-radius:4px;font-size:10px'>Benchmark</span></td></tr>"+allComps.slice(0,8).map(c=>{const diff=totalM-compCounts[c];return"<tr><td>"+c+"</td><td>"+fN(compCounts[c])+"</td><td style='color:"+(diff>=0?"#1db872":"#e03050")+"'>"+(diff>=0?"+":"")+diff+"</td></tr>";}).join("")+"</tbody></table></section>":"";
  const bHtml=topBrandKws.length>0?"<table><thead><tr><th>Zapytanie</th><th style='text-align:right'>Wolumen</th></tr></thead><tbody>"+topBrandKws.map(([kw,vol])=>"<tr><td>"+kw+"</td><td style='text-align:right;color:#4a7090;font-size:11px'>"+fN(vol)+"</td></tr>").join("")+"</tbody></table>":"<p style='color:#4a7090;font-size:12px'>Brak danych</p>";
  const gHtml=topGapKws.length>0?"<table><thead><tr><th>Zapytanie</th><th>AI wymienia</th><th style='text-align:right'>Vol.</th></tr></thead><tbody>"+topGapKws.map(([kw,{vol,comps}])=>"<tr><td>"+kw+"</td><td style='color:#e03050;font-size:11px'>"+comps.join(", ")+"</td><td style='text-align:right;color:#4a7090;font-size:11px'>"+fN(vol)+"</td></tr>").join("")+"</tbody></table>":"<p style='color:#4a7090;font-size:12px'>Brak danych</p>";
  const css="body{font-family:'DM Sans',sans-serif;background:#fff;color:#1a2a3a;font-size:14px;line-height:1.6;margin:0}.page{max-width:960px;margin:0 auto;padding:46px 42px}.header{border-bottom:3px solid #2edf8f;padding-bottom:22px;margin-bottom:28px}h1{font-size:24px;font-weight:900;color:#07111f;margin-bottom:5px}.meta{color:#4a7090;font-size:13px}.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:13px;margin-bottom:28px}.kpi{background:#f8faff;border:1px solid #dde8f5;border-radius:11px;padding:16px 13px;border-top:3px solid}.kl{font-size:9px;text-transform:uppercase;letter-spacing:1px;font-weight:700;color:#4a7090;margin-bottom:6px}.kv{font-size:26px;font-weight:900;line-height:1;margin-bottom:3px}.ks{font-size:10px;color:#8899aa}.ke{font-size:10px;color:#3a5a70;line-height:1.5;margin-top:5px;padding-top:5px;border-top:1px solid #e0eaf5;font-family:monospace}section{margin-bottom:32px}h2{font-size:15px;font-weight:800;color:#07111f;margin-bottom:12px;padding-bottom:7px;border-bottom:2px solid #eef2f8;display:flex;align-items:center;gap:8px}.num{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;background:#2edf8f18;border-radius:5px;color:#2edf8f;font-size:10px;font-weight:900}table{width:100%;border-collapse:collapse;font-size:12px}thead tr{background:#f2f7ff}th{padding:8px 10px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.7px;font-weight:700;color:#4a7090;border-bottom:2px solid #dde8f5}td{padding:8px 10px;border-bottom:1px solid #f0f5fb;vertical-align:middle}tr:last-child td{border-bottom:none}.bench td{background:#f0fff8!important;font-weight:600}.explain{background:#f0f7ff;border:1px solid #c8dff5;border-left:4px solid #4da6ff;border-radius:6px;padding:9px 13px;margin-bottom:12px;font-size:11px;color:#2a4a6a;line-height:1.6}.warn{background:#fff8e6;border:1px solid #f5c842;border-radius:6px;padding:7px 11px;margin-bottom:12px;font-size:11px;color:#7a6000}.kw-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.comment-box{background:#f8faff;border:1px solid #dde8f5;border-left:4px solid #2edf8f;border-radius:8px;padding:18px 20px}.comment-box p{margin-bottom:9px;color:#2a3a4a;line-height:1.75}.comment-box p:last-child{margin-bottom:0}.footer{margin-top:44px;padding-top:18px;border-top:1px solid #e8f0f5;display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#4a7090}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}@page{margin:1.5cm}}";
  return "<!DOCTYPE html><html lang='pl'><head><meta charset='UTF-8'><title>Sempai AI Visibility — "+(brand.name||"Raport")+"</title><style>"+css+"</style></head><body><div class='page'><div class='header'><div style='display:flex;align-items:center;gap:9px;margin-bottom:12px'><div style='width:34px;height:34px;background:#0c1a2e;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:16px;color:#2edf8f;border:1.5px solid #2edf8f55'>S</div><span style='font-size:16px;font-weight:800;color:#07111f'>sempai</span><span style='font-size:10px;font-weight:700;color:#2edf8f;background:#2edf8f15;border:1px solid #2edf8f44;border-radius:4px;padding:2px 6px;letter-spacing:1px;text-transform:uppercase'>AI Visibility</span></div><h1>Raport Widoczno&#347;ci AI</h1><p class='meta'>Klient: <strong>"+(brand.name||"—")+"</strong>"+(brand.url?" &middot; <strong>"+brand.url+"</strong>":"")+" &middot; "+date+"</p></div><div class='kpi-grid'><div class='kpi' style='border-top-color:#2edf8f'><div class='kl'>AI Share of Voice</div><div class='kv' style='color:#2edf8f'>"+avgSOV+"%</div><div class='ks'>"+(avgSOV>=30?"Silna pozycja":avgSOV>=10?"Umiarkowana":"Niska — priorytet dzia&#322;a&#324;")+"</div><div class='ke'>"+fN(totalM)+" wzmianek ÷ "+fN(totalM+(totalCompM||0))+" &#322;&#261;cznie = "+avgSOV+"%</div></div><div class='kpi' style='border-top-color:#a78bfa'><div class='kl'>Mention Rate</div><div class='kv' style='color:#a78bfa'>"+fP(totalM,totalWB)+"</div><div class='ks'>"+(totalM>=5?"AI cz&#281;sto wymienia mark&#281;":totalM>=1?"AI sporadycznie wymienia":"AI nie wymienia nazwy marki")+"</div><div class='ke'>"+fN(totalM)+" wzmianek ÷ "+fN(totalWB)+" zapytań z markami</div></div><div class='kpi' style='border-top-color:#ff5c6a'><div class='kl'>Citation Rate</div><div class='kv' style='color:#ff5c6a'>"+fP(totalC,totalQ)+"</div><div class='ks'>"+(totalC>=5?"Strona cz&#281;sto cytowana":totalC>=1?"Strona sporadycznie cytowana":"Strona rzadko cytowana")+"</div><div class='ke'>"+fN(totalC)+" cytowań ÷ "+fN(totalQ)+" zapytań</div></div><div class='kpi' style='border-top-color:#f5c842'><div class='kl'>&#322;&#261;czne zapytania</div><div class='kv' style='color:#f5c842'>"+fN(totalQ)+"</div><div class='ks'>"+PLATFORMS.filter(p=>proc[p.id].total>0).length+" platform z danymi</div><div class='ke'>Z jak&#261;kolwiek mark&#261;: "+fN(totalWB)+"</div></div></div><div class='warn'>&#9888;&#65039; <strong>Uwaga:</strong> Komentarz analityczny i rekomendacje zosta&#322;y wygenerowane automatycznie. Przed przekazaniem klientowi zweryfikuj tre&#347;&#263;.</div><div class='explain'>&#128208; <strong>SK&#261;D AI SHARE OF VOICE?</strong> SOV = "+(totalM||0)+" wzmianek Twojej marki ÷ ("+(totalM||0)+" + "+(totalCompM||0)+" wzmianek konkurent&oacute;w) = <strong style='color:#2edf8f'>"+avgSOV+"%</strong>. Mention Rate (% zapytań z marką): "+fP(totalM,totalWB)+".</div><section><h2><span class='num'>01</span> AI Share of Voice &mdash; per platforma</h2><div class='explain'>Wzmianki = kolumna Mentions zawiera nazw&#281; marki. &quot;Z mark&#261;&quot; = zapytania gdzie jakakolwiek marka si&#281; pojawia. SOV = wzmianek marki ÷ (wzmianek marki + wzmianek konkurent&oacute;w).</div><table><thead><tr><th>Platforma</th><th>Zapyta&#324;</th><th>Z mark&#261;</th><th>Wzmianki</th><th>Cytowania</th><th>SOV %</th><th>Mention Rate</th><th>Citation Rate</th></tr></thead><tbody>"+rows+"</tbody></table></section>"+compHtml+"<section><h2><span class='num'>03</span> Zapytania — obecno&#347;&#263; marki</h2><div class='kw-grid'><div><h3 style='font-size:12px;font-weight:700;color:#1db872;margin-bottom:8px'>&#127919; Z wzmiankou marki</h3>"+bHtml+"</div><div><h3 style='font-size:12px;font-weight:700;color:#e03050;margin-bottom:8px'>&#9888; Luki — marka nieobecna</h3>"+gHtml+"</div></div></section><section><h2><span class='num'>&#9733;</span> Komentarz analityczny</h2><div class='comment-box'>"+commentP+"</div></section><div class='footer'><div><strong style='color:#07111f'>sempai &middot; Let us perform!</strong><div style='margin-top:2px'>sempai.pl</div></div><div>Wygenerowano: "+date+"</div></div></div></body></html>";
}
