import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell
} from "recharts";

// ─── COLORS ────────────────────────────────────────────────────────────────
const C = {
  navy1:"#07111f", navy2:"#0c1a2e", navy3:"#112240", navy4:"#1a3358",
  green:"#2edf8f", greenD:"#20b571",
  coral:"#ff5c6a", gold:"#f5c842", sky:"#4da6ff", purple:"#a78bfa",
  text:"#e8f0ff", muted:"#7aabbf", dim:"#3a6070", border:"#1a3354",
};

// ─── PLATFORMS ─────────────────────────────────────────────────────────────
const PLATFORMS = [
  { id:"ai_overview", name:"AI Overview",  color:C.sky,    icon:"G" },
  { id:"ai_mode",     name:"AI Mode",      color:"#34d399",icon:"M" },
  { id:"chatgpt",     name:"ChatGPT",      color:C.green,  icon:"⚡" },
  { id:"gemini",      name:"Gemini",       color:C.coral,  icon:"◆" },
  { id:"perplexity",  name:"Perplexity",   color:C.purple, icon:"◈" },
  { id:"copilot",     name:"Copilot",      color:C.gold,   icon:"✦" },
];

const EMPTY_PROC = () => ({
  total:0, mentions:0, citations:0, withAnyBrand:0, impressions:0, gapQueries:0,
  sentPos:0, sentNeg:0, sentNeu:0, sentScore:null,
  recTotal:0, recWithBrand:0, recRate:null,
  ownedLinks:0, totalLinks:0, controlRatio:null,
  compSet:{}, variantHits:{}, topBrand:[], topGap:[],
});

// ─── INDUSTRY DATA ─────────────────────────────────────────────────────────
const INDUSTRIES = {
  ecom_sport:{ label:"Sklep — Sport / Outdoor", icon:"🏕️", cluster:"Sklep", types:[
    {id:"outdoor",label:"Outdoor / Camping"},{id:"knives",label:"Noże / EDC"},
    {id:"military",label:"Militaria / Airsoft"},{id:"sport",label:"Sport / Fitness"},
    {id:"cycling",label:"Rowery"},{id:"fishing",label:"Wędkarstwo"},
  ]},
  ecom_dom:{ label:"Sklep — Dom / Ogród", icon:"🏡", cluster:"Sklep", types:[
    {id:"furniture",label:"Meble"},{id:"garden",label:"Ogród"},
    {id:"decor",label:"Dekoracje"},{id:"kitchen",label:"AGD"},
    {id:"tools",label:"Narzędzia"},{id:"bath",label:"Łazienka"},
  ]},
  ecom_fashion:{ label:"Sklep — Moda / Uroda", icon:"👗", cluster:"Sklep", types:[
    {id:"fashion",label:"Odzież / Obuwie"},{id:"jewel",label:"Biżuteria"},
    {id:"beauty",label:"Kosmetyki"},{id:"kids_fashion",label:"Dla dzieci"},
  ]},
  ecom_tech:{ label:"Sklep — Elektronika", icon:"💻", cluster:"Sklep", types:[
    {id:"electronics",label:"RTV"},{id:"computers",label:"Komputery"},
    {id:"phones",label:"Telefony"},{id:"photo",label:"Foto / Video"},
  ]},
  ecom_health:{ label:"Sklep — Zdrowie / Żywność", icon:"🥗", cluster:"Sklep", types:[
    {id:"food",label:"Żywność"},{id:"supplements",label:"Suplementy"},
    {id:"pharmacy",label:"Apteka"},{id:"pets",label:"Zoologia"},
  ]},
  ecom_other:{ label:"Sklep — Inne", icon:"🛒", cluster:"Sklep", types:[
    {id:"books",label:"Książki"},{id:"toys",label:"Zabawki"},
    {id:"auto",label:"Motoryzacja"},{id:"wedding",label:"Ślub"},
    {id:"other_shop",label:"Inny sklep"},
  ]},
  wholesale:{ label:"Hurtownia / B2B", icon:"🏭", cluster:"B2B", types:[
    {id:"wh_food",label:"Spożywcza"},{id:"wh_tools",label:"Narzędzia"},
    {id:"wh_pharma",label:"Farmaceutyczna"},{id:"wh_other",label:"Inna"},
  ]},
  brand:{ label:"Producent / Marka własna", icon:"🏷️", cluster:"Producent", types:[
    {id:"brand_food",label:"Żywność / napoje"},{id:"brand_cosm",label:"Kosmetyki"},
    {id:"brand_tech",label:"Elektronika"},{id:"brand_other",label:"Inna"},
  ]},
  blog:{ label:"Blog / Portal", icon:"📝", cluster:"Portal", types:[
    {id:"blog_tech",label:"Tech / IT"},{id:"blog_lifestyle",label:"Lifestyle"},
    {id:"blog_news",label:"Newsowy"},{id:"blog_niche",label:"Niszowy"},
  ]},
  service:{ label:"Usługi / SaaS", icon:"⚙️", cluster:"Usługi", types:[
    {id:"agency",label:"Agencja"},{id:"saas",label:"SaaS"},
    {id:"finance",label:"Finanse"},{id:"legal",label:"Prawo"},
    {id:"edu",label:"Edukacja"},{id:"medical",label:"Medycyna"},
    {id:"local",label:"Usługi lokalne"},{id:"other_service",label:"Inna"},
  ]},
};

const INDUSTRY_FILTERS = {
  outdoor:["ekspres","kawa","mebel","sofa","biżuteria","kredyt"],
  knives:["ekspres","kawa","czapka","mebel","ogród","kredyt"],
  military:["ekspres","kawa","mebel","ogród","makijaż"],
  sport:["mebel","sofa","biżuteria","kosmetyki","kredyt"],
  furniture:["nóż","noże","broń","sport","ekspres"],
  garden:["nóż","noże","broń","laptop","telefon"],
  fashion:["nóż","broń","wiertarka","mebel","ogród"],
  electronics:["nóż","broń","ogród","mebel","biżuteria"],
  food:["nóż","broń","elektronika","laptop","mebel"],
  agency:["nóż","broń","mebel","ogród","dieta"],
  saas:["nóż","broń","mebel","ogród","dieta"],
  default:[],
};

function isTopicRelevant(kw, industryType) {
  const filters = INDUSTRY_FILTERS[industryType] || INDUSTRY_FILTERS.default;
  const kwLow = kw.toLowerCase();
  return !filters.some(function(f){ return kwLow.includes(f); });
}

// Detect gap queries that are navigational brand queries for a specific competitor
// (e.g. "Co oznacza nazwa marki Massimo Dutti?" — impossible to target with another brand)
function isCompetitorBrandQuery(kw, compCounts) {
  if (!compCounts) return false;
  const kwLow = kw.toLowerCase();
  const comps = Object.keys(compCounts).filter(function(c){
    return c.length > 3 && kwLow.includes(c.toLowerCase());
  });
  if (comps.length !== 1) return false;
  const comp = comps[0].toLowerCase();
  if (comp.length / kw.length > 0.42) return true;
  const without = kwLow.split(comp).join(" ").split("  ").join(" ").trim();
  const navWords = ["co oznacza","co to za","skąd pochodzi","historia","właściciel",
    "kiedy powstał","kim jest","co to jest","czy to ta sama","czym jest"];
  return navWords.some(function(p){ return without.includes(p) || kwLow.startsWith(p); });
}

// ─── CSV & FILE PARSING ────────────────────────────────────────────────────
function decodeBuffer(buffer) {
  const b = new Uint8Array(buffer);
  if ((b[0]===0xFF&&b[1]===0xFE)||(b[0]===0xFE&&b[1]===0xFF))
    return new TextDecoder("utf-16").decode(buffer);
  if (b[0]===0xEF&&b[1]===0xBB&&b[2]===0xBF)
    return new TextDecoder("utf-8").decode(buffer).slice(1);
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
    if (ch==='"') {
      if (inQuote&&nx==='"') { cell+='"'; i++; } else inQuote=!inQuote;
    } else if (ch===sep&&!inQuote) { row.push(cell); cell=""; }
    else if ((ch==="\n"||(ch==="\r"&&nx==="\n"))&&!inQuote) {
      if (ch==="\r") i++;
      row.push(cell); cell="";
      if (row.some(function(c){return c.trim();}))
        rows.push(row.map(function(c){return c.trim();}));
      row=[];
    } else { cell+=ch; }
  }
  if (cell||row.length) {
    row.push(cell);
    if (row.some(function(c){return c.trim();}))
      rows.push(row.map(function(c){return c.trim();}));
  }
  return rows;
}

function detectPlatform(headers, filename, rows) {
  const h = headers.map(function(x){
    return x.toLowerCase().split("").filter(function(c){
      const code = c.charCodeAt(0);
      return (code>=97&&code<=122)||(code>=48&&code<=57)||c===" ";
    }).join("").trim();
  });
  if (h.some(function(x){return x==="ai overview";})) return "ai_overview";
  if (h.some(function(x){return x==="ai mode";})) return "ai_mode";
  const fn = (filename||"").toLowerCase();
  if (fn.includes("ai_mode")||fn.includes("ai-mode")||fn.includes("aimode")) return "ai_mode";
  if (fn.includes("overview")) return "ai_overview";
  if (fn.includes("chatgpt")||fn.includes("gpt")) return "chatgpt";
  if (fn.includes("gemini")) return "gemini";
  if (fn.includes("perplexity")) return "perplexity";
  if (fn.includes("copilot")) return "copilot";
  const mi = headers.findIndex(function(x){return x==="Model";});
  if (mi>=0 && rows && rows.length>0) {
    const vals = rows.slice(0,20).map(function(r){return (r[mi]||"").trim();})
      .filter(function(v){return v.length>0&&v.length<30;});
    const combined = vals.join(" ").toLowerCase();
    if (combined.includes("chatgpt")||combined.includes("gpt")) return "chatgpt";
    if (combined.includes("gemini")) return "gemini";
    if (combined.includes("perplexity")) return "perplexity";
    if (combined.includes("copilot")) return "copilot";
    if (combined.includes("ai mode")) return "ai_mode";
  }
  return null;
}

function cleanHeader(h) {
  if (h.startsWith('"') && h.endsWith('"')) h = h.slice(1,-1);
  return h.trim();
}

function splitMentions(str) {
  return str.split(",").reduce(function(acc,s){
    return acc.concat(s.split("\n"));
  },[]).map(function(m){return m.trim();}).filter(Boolean);
}

function parseFile(buffer, filename, brandVariants) {
  const text = decodeBuffer(buffer);
  const rows = parseCSV(text);
  if (rows.length < 2) return { error:"Plik pusty" };
  const headers = rows[0].map(cleanHeader);
  const platformId = detectPlatform(headers, filename, rows.slice(1));
  const mentionsIdx = headers.findIndex(function(h){return h==="Mentions";});
  const kwIdx = headers.findIndex(function(h){return h==="Keyword";});
  const volIdx = headers.findIndex(function(h){return h==="Volume";});
  const linkIdx = headers.findIndex(function(h){return h==="Link URL";});
  const respIdx = headers.findIndex(function(h){return h==="AI Overview"||h==="Response";});

  if (mentionsIdx<0) return { error:"Brak kolumny Mentions. Nagłówki: "+headers.join(", "), headers, platformId };

  const bv = (brandVariants||[]).map(function(v){return v.toLowerCase().trim();}).filter(Boolean);
  const domainKey = bv[0] || "";
  const data = rows.slice(1);

  let mentions=0, citations=0, withAnyBrand=0;
  let sentPos=0, sentNeg=0, sentNeu=0;
  let recTotal=0, recWithBrand=0;
  let ownedLinks=0, totalLinks=0;
  const compSet={}, variantHits={};
  const topBrand=[], topGap=[];

  const negWords = ["gorszy","słabszy","problemy z","wada","nie polecam","unikaj","awaria","negatywna","niskiej jakości"];
  const posWords = ["polecam","najlepszy","świetny","doskonały","warto","top","lider","wysoka jakość","zaufany","sprawdzony"];
  const recWords = ["polecasz","polecacie","najlepsz","najlepiej","który warto","jaki polecasz","top","ranking","czy warto"];

  data.forEach(function(r) {
    const kw = kwIdx>=0 ? r[kwIdx]||"" : "";
    if (!kw) return;
    const vol = volIdx>=0 ? (parseInt(r[volIdx])||0) : 0;
    const mentRaw = mentionsIdx>=0 ? r[mentionsIdx]||"" : "";
    const linkRaw = linkIdx>=0 ? r[linkIdx]||"" : "";
    const respRaw = respIdx>=0 ? (r[respIdx]||"").toLowerCase() : "";
    const mentLow = mentRaw.toLowerCase();
    const linkLow = linkRaw.toLowerCase();
    const kwLow = kw.toLowerCase();
    const hasAnyBrand = mentRaw.trim().length > 0;
    if (hasAnyBrand) withAnyBrand++;

    const matched = bv.find(function(v){
      if (!v) return false;
      return splitMentions(mentLow).some(function(m){return m===v||m.includes(v);});
    }) || null;
    const mentioned = !!matched;
    const cited = bv.some(function(v){return v&&linkLow.includes(v);});

    if (mentioned) {
      mentions++;
      if (matched) variantHits[matched]=(variantHits[matched]||0)+1;
    }
    if (cited) citations++;

    if (mentioned && respRaw) {
      const bIdx = bv.reduce(function(fi,v){
        const pos=respRaw.indexOf(v);
        return pos>=0&&(fi<0||pos<fi)?pos:fi;
      },-1);
      const ctx = bIdx>=0 ? respRaw.slice(Math.max(0,bIdx-150),bIdx+150) : respRaw.slice(0,300);
      const hasPos = posWords.some(function(w){return ctx.includes(w);});
      const hasNeg = negWords.some(function(w){return ctx.includes(w);});
      if (hasNeg&&!hasPos) sentNeg++;
      else if (hasPos) sentPos++;
      else sentNeu++;
    }

    const isRecQuery = recWords.some(function(w){return kwLow.includes(w);});
    if (isRecQuery) { recTotal++; if (mentioned) recWithBrand++; }

    if (linkRaw.trim()) {
      linkRaw.split("\n").forEach(function(rawLink){
        const l=rawLink.trim(); if (!l) return;
        totalLinks++;
        if (domainKey&&l.toLowerCase().includes(domainKey)) ownedLinks++;
      });
    }

    const comps = splitMentions(mentRaw).map(function(m){return m.toLowerCase();})
      .filter(function(m){return m&&m.length>1&&!bv.some(function(v){return m===v||m.includes(v);});});
    comps.forEach(function(c){compSet[c]=(compSet[c]||0)+1;});

    if (mentioned) {
      topBrand.push({kw,vol});
    } else if (comps.length>0) {
      const isBrandedKw = bv.some(function(v){return v&&kwLow.includes(v);});
      if (!isBrandedKw) topGap.push({kw,vol,comps:comps.slice(0,3)});
    }
  });

  topBrand.sort(function(a,b){return b.vol-a.vol;});
  topGap.sort(function(a,b){return b.vol-a.vol;});

  const impressions = topBrand.reduce(function(s,r){return s+(r.vol||0);},0);
  const sentTotal = sentPos+sentNeg+sentNeu;
  const sentScore = sentTotal>0 ? Math.round(((sentPos-sentNeg)/sentTotal)*100) : null;
  const recRate = recTotal>0 ? Math.round((recWithBrand/recTotal)*100) : null;
  const controlRatio = totalLinks>0 ? Math.round((ownedLinks/totalLinks)*100) : null;

  return {
    platformId, headers,
    total: data.filter(function(r){return kwIdx>=0&&r[kwIdx];}).length,
    mentions, citations, withAnyBrand, impressions, gapQueries:topGap.length,
    sentPos, sentNeg, sentNeu, sentScore,
    recTotal, recWithBrand, recRate,
    ownedLinks, totalLinks, controlRatio,
    compSet, variantHits,
    topBrand: topBrand.slice(0,12),
    topGap: topGap.slice(0,12),
    error: null,
  };
}

// ─── FORMATTING HELPERS ────────────────────────────────────────────────────
function fmtN(n) { return (n||0).toLocaleString("pl-PL"); }
function fmtP(num,den) {
  if (!den) return "0%";
  const v=(num/den)*100;
  if (v===0) return "0%";
  if (v<0.1) return "<0.1%";
  if (v<1) return v.toFixed(1)+"%";
  return Math.round(v)+"%";
}
function calcSOV(brandM, compSet) {
  const ct=Object.values(compSet||{}).reduce(function(s,v){return s+v;},0);
  return brandM+ct>0?Math.round((brandM/(brandM+ct))*100):0;
}

// ─── SMALL UI COMPONENTS ───────────────────────────────────────────────────
function Card({ children, style }) {
  return React.createElement("div", {
    style: Object.assign({
      background:C.navy2, border:"1px solid "+C.border,
      borderRadius:12, padding:"18px 20px",
    }, style||{})
  }, children);
}

function SL({ color, children }) {
  return React.createElement("div", {
    style:{fontSize:10,color:color||"#c0d8e8",fontWeight:700,
      letterSpacing:"1px",textTransform:"uppercase",marginBottom:10}
  }, children);
}

function Explain({ children, type }) {
  const styles = {
    info:  {bg:"#0a1e30",border:"#1e4060",icon:"💡",color:"#90c8e0"},
    warn:  {bg:"#1a1200",border:"#4a3500",icon:"⚠️",color:"#f5c842"},
    success:{bg:"#001a0e",border:"#004020",icon:"✅",color:"#2edf8f"},
    step:  {bg:"#10081e",border:"#2a1060",icon:"👉",color:"#c0a0ff"},
  };
  const s = styles[type||"info"] || styles.info;
  return React.createElement("div", {
    style:{fontSize:12,color:s.color,lineHeight:1.7,padding:"10px 14px",
      background:s.bg,borderRadius:8,borderLeft:"3px solid "+s.border,marginBottom:12}
  },
    React.createElement("span",{style:{marginRight:8}},s.icon),
    children
  );
}

function STitle({ children }) {
  return React.createElement("div",{style:{marginBottom:22}},
    React.createElement("h2",{style:{margin:0,fontSize:18,fontWeight:800,color:C.text}},children),
    React.createElement("div",{style:{width:32,height:3,background:"linear-gradient(90deg,"+C.green+",transparent)",marginTop:6}})
  );
}

function Inp({ label, value, set, ph, span2, help }) {
  const [f,setF] = useState(false);
  const style = span2 ? { gridColumnStart:"1", gridColumnEnd:"-1" } : {};
  return React.createElement("div",{style},
    React.createElement("label",{style:{display:"block",fontSize:10,color:"#90b8c8",marginBottom:5,fontWeight:700,letterSpacing:"0.8px",textTransform:"uppercase"}},label),
    React.createElement("input",{
      value, placeholder:ph,
      onChange:function(e){set(e.target.value);},
      onFocus:function(){setF(true);},
      onBlur:function(){setF(false);},
      style:{width:"100%",boxSizing:"border-box",background:C.navy1,
        border:"1px solid "+(f?C.green+"88":C.border),borderRadius:8,
        padding:"10px 13px",color:C.text,fontSize:13,outline:"none",transition:"border .15s"},
    }),
    help && React.createElement("div",{style:{fontSize:11,color:"#7aabbf",marginTop:4}},help)
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active||!payload||!payload.length) return null;
  return React.createElement("div",{
    style:{background:C.navy3,border:"1px solid "+C.border,borderRadius:8,padding:"9px 13px"}
  },
    React.createElement("div",{style:{fontSize:10,color:C.muted,marginBottom:4}},label),
    payload.map(function(p,i){
      return React.createElement("div",{key:i,style:{fontSize:12,color:p.color,fontWeight:700}},
        p.name+": "+p.value
      );
    })
  );
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────
export default function App() {
  const [tab,setTab] = useState("guide");
  const [brand,setBrand] = useState({name:"",url:"",industry:"",industryType:""});
  const [files,setFiles] = useState({});
  const [rawBuffers,setRawBuffers] = useState({});
  const [unknownFiles,setUnknownFiles] = useState([]);
  const [loadingFile,setLoadingFile] = useState(null);
  const [errors,setErrors] = useState([]);
  const [brandVariants,setBrandVariants] = useState([]);
  const [removedVariants,setRemovedVariants] = useState(new Set());
  const [brandMentionKey,setBrandMentionKey] = useState("");
  const [variantInput,setVariantInput] = useState("");
  const [allMentionsInData,setAllMentionsInData] = useState([]);
  const [reportChecks,setReportChecks] = useState({});
  const [reportSections,setReportSections] = useState({intro:null,sov:null,mentions:null,competitors:null});
  const [recs,setRecs] = useState([]);
  const [promptCopied,setPromptCopied] = useState(false);
  const [kwTab,setKwTab] = useState("brand");
  const [kwSearch,setKwSearch] = useState("");
  const [kwPage,setKwPage] = useState(0);
  const [filterCompetitorQ,setFilterCompetitorQ] = useState(true);
  const [selectedKws,setSelectedKws] = useState(new Set());
  const [editableComment,setEditableComment] = useState(null);

  const updateSection = function(key,val){setReportSections(function(s){return Object.assign({},s,{[key]:val});});};
  const addRec = function(){setRecs(function(r){return r.concat([{id:Date.now(),text:"",note:"",subs:[]}]);});};
  const updateRec = function(id,field,val){setRecs(function(r){return r.map(function(x){return x.id===id?Object.assign({},x,{[field]:val}):x;});});};
  const removeRec = function(id){setRecs(function(r){return r.filter(function(x){return x.id!==id;});});};
  const addSub = function(recId){setRecs(function(r){return r.map(function(x){return x.id===recId?Object.assign({},x,{subs:x.subs.concat([{id:Date.now(),text:""}])}):x;});});};
  const updateSub = function(recId,subId,val){setRecs(function(r){return r.map(function(x){return x.id===recId?Object.assign({},x,{subs:x.subs.map(function(s){return s.id===subId?Object.assign({},s,{text:val}):s;})}):x;});});};
  const removeSub = function(recId,subId){setRecs(function(r){return r.map(function(x){return x.id===recId?Object.assign({},x,{subs:x.subs.filter(function(s){return s.id!==subId;})}):x;});});};

  const stopWords = new Set(["sklep","shop","store","online","pl","com","net","eu","www"]);

  function makeAutoVariants(input) {
    if (!input) return [];
    const raw = input.toLowerCase().trim();
    const v = new Set([raw]);
    const extensions = [".pl",".com",".eu",".net",".org",".io",".co",".de",".shop",".store"];
    let noExt = raw;
    for (const e of extensions) {
      if (raw.endsWith(e)) { noExt = raw.slice(0, raw.length-e.length); break; }
    }
    if (noExt!==raw) v.add(noExt);
    if (noExt.includes("-")) {
      v.add(noExt.split("-").join(""));
      noExt.split("-").forEach(function(s){if(s.length>2)v.add(s);});
    }
    if (noExt.includes(" ")) {
      v.add(noExt.split(" ").join(""));
      noExt.split(" ").forEach(function(s){if(s.length>2)v.add(s);});
    }
    return Array.from(v).filter(function(x){return x.length>1&&!stopWords.has(x);});
  }

  // Auto-detect brand key from URL or name
  function computeAutoKey(brandObj) {
    const raw = (brandObj.url||brandObj.name).toLowerCase().trim();
    let noProto = raw;
    if (raw.indexOf("://")>=0) {
      const parts = raw.split("://");
      noProto = parts.slice(1).join("://");
    }
    const noPfx = noProto.startsWith("www.") ? noProto.slice(4) : noProto;
    const dotIdx = noPfx.indexOf(".");
    return (dotIdx>0 ? noPfx.slice(0,dotIdx) : noPfx) || brandObj.name.toLowerCase().split(" ")[0] || "";
  }

  const brandKey = brandMentionKey.trim() || computeAutoKey(brand);
  const autoVariants = makeAutoVariants(brand.url||brand.name).filter(function(v){return !removedVariants.has(v);});
  const allVariants = Array.from(new Set(autoVariants.concat(brandVariants)));

  useEffect(function(){
    if (allVariants.length===0||Object.keys(rawBuffers).length===0) return;
    Object.entries(rawBuffers).forEach(function([filename,buffer]){
      const r = parseFile(buffer,filename,allVariants);
      if (r.platformId&&!r.error) setFiles(function(f){return Object.assign({},f,{[r.platformId]:{filename,...r}});});
    });
  },[brandKey,brandVariants.join(","),removedVariants.size]); // eslint-disable-line

  const handleFiles = useCallback(function(filename,buffer){
    setLoadingFile(filename);
    setTimeout(function(){
      try {
        const r = parseFile(buffer,filename,allVariants);
        setRawBuffers(function(rb){return Object.assign({},rb,{[filename]:buffer});});
        if (!r.platformId) {
          setUnknownFiles(function(u){return u.filter(function(x){return x.filename!==filename;}).concat([{filename,headers:r.headers||[],error:r.error}]);});
          setErrors(function(e){return e.filter(function(x){return !x.includes(filename);}).concat([filename+": "+(r.error||"Nieznana platforma")]);});
        } else if (r.platformId==="ai_overview") {
          setUnknownFiles(function(u){return u.filter(function(x){return x.filename!==filename;}).concat([{
            filename,headers:r.headers||[],error:null,conflict:true,rows:r.total,
            conflictNote:"Plik ma nagłówek AI Overview — ale Ahrefs używa TEGO SAMEGO formatu dla AI Mode. Wybierz właściwą platformę:",
          }]);});
        } else {
          setFiles(function(f){return Object.assign({},f,{[r.platformId]:{filename,...r}});});
          setErrors(function(e){return e.filter(function(x){return !x.includes(filename);});});
          setUnknownFiles(function(u){return u.filter(function(x){return x.filename!==filename;});});
          const rawText = decodeBuffer(buffer);
          const csvRows = parseCSV(rawText);
          if (csvRows.length>1) {
            const mi = csvRows[0].findIndex(function(h){return h.trim()==="Mentions";});
            if (mi>=0) {
              const found = new Set();
              csvRows.slice(1).forEach(function(row){
                if (row[mi]) splitMentions(row[mi].toLowerCase()).forEach(function(m){found.add(m);});
              });
              setAllMentionsInData(function(prev){return Array.from(new Set(prev.concat(Array.from(found)))).filter(Boolean).sort();});
            }
          }
        }
      } catch(err){setErrors(function(e){return e.concat([filename+": "+err.message]);});}
      setLoadingFile(null);
    },50);
  },[allVariants]);

  function assignPlatform(filename,platformId) {
    const buffer = rawBuffers[filename];
    if (!buffer) return;
    const r = parseFile(buffer,filename,allVariants);
    setFiles(function(f){return Object.assign({},f,{[platformId]:{filename,...r,platformId}});});
    setUnknownFiles(function(u){return u.filter(function(x){return x.filename!==filename;});});
    setErrors(function(e){return e.filter(function(x){return !x.includes(filename);});});
  }

  // ── Aggregated metrics ───────────────────────────────────────────────────
  const proc = {};
  PLATFORMS.forEach(function(p){proc[p.id]=files[p.id]||EMPTY_PROC();});

  const totalQ  = PLATFORMS.reduce(function(s,p){return s+(proc[p.id].total||0);},0);
  const totalM  = PLATFORMS.reduce(function(s,p){return s+(proc[p.id].mentions||0);},0);
  const totalC  = PLATFORMS.reduce(function(s,p){return s+(proc[p.id].citations||0);},0);
  const totalWB = PLATFORMS.reduce(function(s,p){return s+(proc[p.id].withAnyBrand||0);},0);
  const totalImpressions = PLATFORMS.reduce(function(s,p){return s+(proc[p.id].impressions||0);},0);
  const totalGapQueries  = PLATFORMS.reduce(function(s,p){return s+(proc[p.id].gapQueries||0);},0);

  const sentData = PLATFORMS.map(function(p){return proc[p.id];}).filter(function(d){return d.total>0&&d.sentScore!==null;});
  const globalSentScore = sentData.length>0 ? Math.round(sentData.reduce(function(s,d){return s+(d.sentScore||0);},0)/sentData.length) : null;
  const totalSentPos = PLATFORMS.reduce(function(s,p){return s+(proc[p.id].sentPos||0);},0);
  const totalSentNeg = PLATFORMS.reduce(function(s,p){return s+(proc[p.id].sentNeg||0);},0);
  const totalSentNeu = PLATFORMS.reduce(function(s,p){return s+(proc[p.id].sentNeu||0);},0);
  const totalRecTotal     = PLATFORMS.reduce(function(s,p){return s+(proc[p.id].recTotal||0);},0);
  const totalRecWithBrand = PLATFORMS.reduce(function(s,p){return s+(proc[p.id].recWithBrand||0);},0);
  const globalRecRate = totalRecTotal>0 ? Math.round((totalRecWithBrand/totalRecTotal)*100) : null;
  const totalOwnedLinks = PLATFORMS.reduce(function(s,p){return s+(proc[p.id].ownedLinks||0);},0);
  const totalAllLinks   = PLATFORMS.reduce(function(s,p){return s+(proc[p.id].totalLinks||0);},0);
  const globalControlRatio = totalAllLinks>0 ? Math.round((totalOwnedLinks/totalAllLinks)*100) : null;

  const compCounts = {};
  PLATFORMS.forEach(function(p){
    Object.entries(proc[p.id].compSet||{}).forEach(function([n,cnt]){compCounts[n]=(compCounts[n]||0)+cnt;});
  });
  const allComps = Object.entries(compCounts).sort(function(a,b){return b[1]-a[1];}).map(function([n]){return n;}).filter(function(n){return n&&n.length>1;});
  const top5Comps = allComps.slice(0,5);
  const top5CompM = top5Comps.reduce(function(s,c){return s+(compCounts[c]||0);},0);
  const totalCompM = allComps.reduce(function(s,c){return s+(compCounts[c]||0);},0);

  const globalSOV = totalM+top5CompM>0 ? Math.round((totalM/(totalM+top5CompM))*100) : 0;
  const avgSOV = (function(){
    const active = PLATFORMS.filter(function(p){return proc[p.id].total>0;});
    if (!active.length) return 0;
    const vals = active.map(function(p){return calcSOV(proc[p.id].mentions,proc[p.id].compSet);});
    return Math.round(vals.reduce(function(s,v){return s+v;},0)/active.length);
  })();

  const sovData = PLATFORMS.map(function(p){
    const d=proc[p.id];
    return {platform:p.name,color:p.color,sov:calcSOV(d.mentions,d.compSet),mentions:d.mentions,citations:d.citations,total:d.total};
  });
  const ranked = sovData.filter(function(d){return d.total>0;}).slice().sort(function(a,b){return b.sov-a.sov;});
  const best=ranked[0], worst=ranked[ranked.length-1];

  const kwBrand={}, kwGap={};
  PLATFORMS.forEach(function(p){
    (proc[p.id].topBrand||[]).forEach(function(item){if(!kwBrand[item.kw]||kwBrand[item.kw]<item.vol)kwBrand[item.kw]=item.vol;});
    (proc[p.id].topGap||[]).forEach(function(item){if(!kwGap[item.kw])kwGap[item.kw]={vol:item.vol,comps:item.comps};});
  });

  const allBrandKws = Object.entries(kwBrand).sort(function(a,b){return b[1]-a[1];});
  const brandKeyLow = allVariants.map(function(v){return v.toLowerCase();});

  const allGapKwsRaw = Object.entries(kwGap).filter(function([kw]){
    const kwL = kw.toLowerCase();
    if (brandKeyLow.some(function(v){return v&&kwL.includes(v);})) return false;
    if (!isTopicRelevant(kwL,brand.industryType)) return false;
    return true;
  }).map(function([kw,d]){
    return [kw,{vol:d.vol,comps:d.comps.filter(function(c){return !brandKeyLow.some(function(v){return v&&c.includes(v);});})}];
  }).filter(function([,d]){return d.comps.length>0;}).sort(function(a,b){return b[1].vol-a[1].vol;});

  const allGapKws = filterCompetitorQ
    ? allGapKwsRaw.filter(function([kw]){return !isCompetitorBrandQuery(kw,compCounts);})
    : allGapKwsRaw;

  const topBrandKws = allBrandKws.slice(0,12);
  const topGapKws   = allGapKws.slice(0,12);

  const filesLoaded = Object.keys(files).length;

  // Auto-select top 10 when data loads
  useEffect(function(){
    if (allBrandKws.length===0&&allGapKws.length===0) return;
    setSelectedKws(function(prev){
      if (prev.size>0) return prev;
      const s = new Set();
      allBrandKws.slice(0,10).forEach(function([k]){s.add("B:"+k);});
      allGapKws.slice(0,10).forEach(function([k]){s.add("G:"+k);});
      return s;
    });
  },[allBrandKws.length,allGapKws.length]); // eslint-disable-line

  const reportBrandKws = selectedKws.size>0 ? allBrandKws.filter(function([k]){return selectedKws.has("B:"+k);}) : topBrandKws;
  const reportGapKws   = selectedKws.size>0 ? allGapKws.filter(function([k]){return selectedKws.has("G:"+k);}) : topGapKws;

  const kwBrowserData = (function(){
    const PAGE=25;
    const list = kwTab==="brand"
      ? allBrandKws.filter(function([kw]){return !kwSearch||kw.toLowerCase().includes(kwSearch.toLowerCase());})
      : allGapKws.filter(function([kw]){return !kwSearch||kw.toLowerCase().includes(kwSearch.toLowerCase());});
    const page = list.slice(kwPage*PAGE,(kwPage+1)*PAGE);
    const totalPages = Math.ceil(list.length/PAGE);
    return {list,page,totalPages,isBrand:kwTab==="brand",PAGE};
  })();

  const oppCards = (function(){
    const ops=[];
    const z=PLATFORMS.filter(function(p){return proc[p.id].total>0&&proc[p.id].mentions===0;});
    if (z.length>0) ops.push({icon:"🎯",tag:"QUICK WIN",color:C.green,title:"Nieobecne platformy",body:z.map(function(p){return p.name;}).join(", ")+" — twórz content odpowiadający na pytania tej platformy."});
    if (totalC>0&&totalM===0) ops.push({icon:"🔗",tag:"QUICK WIN",color:C.sky,title:"Cytowana bez nazwy",body:"Strona linkowana "+fmtN(totalC)+" razy bez wzmianki marki — entity building (Wikipedia, Wikidata)."});
    if (totalM>0&&totalC>totalM*5) ops.push({icon:"📎",tag:"QUICK WIN",color:C.purple,title:"Dysproporcja wzmianek/cytowań",body:"Anchor texty z nazwą marki i breadcrumbs z marką."});
    const tc=allComps[0]; if (tc&&compCounts[tc]>totalM*1.5) ops.push({icon:"⚔️",tag:"PRIORYTET",color:C.coral,title:tc+" dominuje",body:"Przeanalizuj content "+tc+" i stwórz odpowiedzi na te same zapytania."});
    ops.push({icon:"🔄",tag:"ZAWSZE",color:C.gold,title:"Content freshness",body:"Modele AI preferują aktualne treści. Odśwież kluczowe strony co 3-6 miesięcy."});
    return ops.slice(0,6);
  })();

  function buildArgs() {
    return {brand,proc,totalQ,totalM,totalC,totalWB,avgSOV,globalSOV,allComps,compCounts,
      best,worst,topBrandKws:reportBrandKws,topGapKws:reportGapKws,allGapKws,
      totalCompM,top5CompM,totalImpressions,totalGapQueries,finalComment:null};
  }

  // ── Render functions (no IIFEs, no JSX comments) ──────────────────────────
  function renderIndustries() {
    const clusters = {};
    Object.entries(INDUSTRIES).forEach(function([key,ind]){
      const c = ind.cluster||"Inne";
      if (!clusters[c]) clusters[c]=[];
      clusters[c].push([key,ind]);
    });
    return Object.entries(clusters).map(function([cluster,items]){
      return (
        <div key={cluster} style={{marginBottom:10}}>
          <div style={{fontSize:9,color:"#4a7090",fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>{cluster}</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {items.map(function([key,ind]){
              return (
                <button key={key}
                  onClick={function(){setBrand(function(b){return Object.assign({},b,{industry:key,industryType:""});});}}
                  style={{padding:"6px 12px",borderRadius:8,border:"1px solid "+(brand.industry===key?C.green:C.border),
                    background:brand.industry===key?C.green+"18":"transparent",
                    color:brand.industry===key?C.green:"#7aabbf",cursor:"pointer",
                    display:"flex",alignItems:"center",gap:7}}>
                  <span style={{fontSize:14}}>{ind.icon}</span>
                  <span style={{fontSize:11,fontWeight:700}}>{ind.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      );
    });
  }

  function renderInsightCard1() {
    if (!totalQ) return null;
    const r = totalM>0 ? totalC/totalM : null;
    if (totalM===0&&totalC===0) return (
      <div style={{padding:"10px 13px",background:C.muted+"08",border:"1px solid "+C.border,borderRadius:9}}>
        <div style={{fontSize:11,color:C.muted}}>Brak obecności — marka niewidoczna dla AI.</div>
      </div>
    );
    if (totalM===0&&totalC>0) return (
      <div style={{padding:"10px 13px",background:C.gold+"08",border:"1px solid "+C.gold+"22",borderRadius:9}}>
        <div style={{fontSize:11,color:C.muted,lineHeight:1.55}}><strong style={{color:C.gold}}>Cytowana bez nazwy</strong> ({fmtN(totalC)} cyt, 0 wzm) — entity building priorytet.</div>
      </div>
    );
    if (r!==null&&r>8) return (
      <div style={{padding:"10px 13px",background:C.coral+"08",border:"1px solid "+C.coral+"22",borderRadius:9}}>
        <div style={{fontSize:11,color:C.muted,lineHeight:1.55}}><strong style={{color:C.coral}}>Dysproporcja</strong> {fmtN(totalC)} cyt vs {fmtN(totalM)} wzm — dodaj anchor texty z nazwą marki.</div>
      </div>
    );
    return (
      <div style={{padding:"10px 13px",background:C.green+"08",border:"1px solid "+C.green+"22",borderRadius:9}}>
        <div style={{fontSize:11,color:C.muted,lineHeight:1.55}}>✓ <strong style={{color:C.green}}>Obecność potwierdzona:</strong> {fmtN(totalM)} wzm + {fmtN(totalC)} cyt.</div>
      </div>
    );
  }

  function renderInsightCard2() {
    if (!allComps.length) return null;
    const tc=allComps[0], tc2=compCounts[tc]||0;
    if (tc2>totalM*2) return (
      <div style={{padding:"10px 13px",background:C.coral+"08",border:"1px solid "+C.coral+"22",borderRadius:9}}>
        <div style={{fontSize:11,color:C.muted,lineHeight:1.55}}>⚔️ <strong style={{color:C.coral}}>{tc} dominuje</strong>: {fmtN(tc2)} vs {fmtN(totalM)} Twoich wzm.</div>
      </div>
    );
    if (tc2>totalM) return (
      <div style={{padding:"10px 13px",background:C.gold+"08",border:"1px solid "+C.gold+"22",borderRadius:9}}>
        <div style={{fontSize:11,color:C.muted,lineHeight:1.55}}>⚔️ <strong style={{color:C.gold}}>{tc} nieznacznie wyprzedza</strong> ({fmtN(tc2)} vs {fmtN(totalM)} wzm).</div>
      </div>
    );
    return (
      <div style={{padding:"10px 13px",background:C.green+"08",border:"1px solid "+C.green+"22",borderRadius:9}}>
        <div style={{fontSize:11,color:C.muted,lineHeight:1.55}}>⚔️ <strong style={{color:C.green}}>Marka wyprzedza {tc}</strong> ({fmtN(tc2)} vs {fmtN(totalM)}).</div>
      </div>
    );
  }

  function renderDashboard() {
    const kpiItems = [
      {label:"AI Share of Voice",tag:"SOV",value:globalSOV+"%",color:C.green,
        formula:"Wzm. marki ÷ (wzm. marki + wzm. top 5 konk.) × 100",
        calc:fmtN(totalM)+" ÷ "+fmtN(totalM+top5CompM)+" = "+globalSOV+"%",
        desc:globalSOV>=30?"Silna pozycja":globalSOV>=10?"Umiarkowana":"Niska — konieczne działania"},
      {label:"AI Mentions",tag:"Wzmianki",value:fmtN(totalM),color:C.purple,
        formula:"Odpowiedzi AI z nazwą marki",calc:"Ze wszystkich platform",
        desc:"Ile razy AI napisał nazwę Twojej marki"},
      {label:"AI Citations",tag:"Cytowania",value:fmtN(totalC),color:C.sky,
        formula:"Odpowiedzi AI z linkiem do domeny",calc:"Linki do "+(brand.url||"Twojej domeny"),
        desc:"Ile razy AI podał Twoją stronę jako źródło"},
      {label:"AI Impressions",tag:"Zasięg",
        value:totalImpressions>999999?(Math.round(totalImpressions/1000)+"k"):fmtN(totalImpressions),
        color:C.coral,formula:"Suma wolumenów zapytań z wzmianką",
        calc:"Szacowany miesięczny zasięg",desc:"Suma wyszukiwań zapytań gdzie AI wymienił markę"},
      {label:"Visibility Gap",tag:"Luki",value:fmtN(totalGapQueries),color:C.gold,
        formula:"Zapytania: konkurent TAK, marka NIE",
        calc:fmtN(totalGapQueries)+" zapytań do pokrycia",
        desc:"Tematy do pokrycia contentem"},
    ];

    return (
      <div>
        <STitle>Dashboard Widoczności AI</STitle>

        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:20}}>
          {kpiItems.map(function(k,i){
            return (
              <div key={i} style={{background:C.navy2,border:"1px solid "+k.color+"22",borderRadius:11,padding:"12px 11px"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5}}>
                  <div style={{fontSize:10,color:"#7ab0c8",textTransform:"uppercase",letterSpacing:"0.8px",fontWeight:700}}>{k.label}</div>
                  <span style={{fontSize:8,color:k.color,background:k.color+"18",borderRadius:3,padding:"1px 5px",fontWeight:700}}>{k.tag}</span>
                </div>
                <div style={{fontSize:28,fontWeight:900,color:k.color,lineHeight:1,marginBottom:6}}>{k.value}</div>
                <div style={{fontSize:10,color:"#4a8090",fontFamily:"monospace",lineHeight:1.5,marginBottom:4}}>{k.formula}</div>
                <div style={{fontSize:10,color:"#3a6070"}}>{k.calc}</div>
                <div style={{fontSize:11,color:"#8abdd0",lineHeight:1.5,borderTop:"1px solid #0e1e2e",paddingTop:6,marginTop:6}}>{k.desc}</div>
              </div>
            );
          })}
        </div>

        <Card style={{marginBottom:14}}>
          <SL>Wyniki per platforma</SL>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead>
                <tr style={{borderBottom:"1px solid "+C.border}}>
                  {["Platforma","Plik CSV","Zapytania","Z marką","Wzmianki","Cytowania","SOV %","Mention Rate"].map(function(h){
                    return <th key={h} style={{padding:"8px 10px",textAlign:"left",fontSize:10,color:"#7aaabf",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.7px"}}>{h}</th>;
                  })}
                </tr>
              </thead>
              <tbody>
                {PLATFORMS.map(function(p){
                  const d=proc[p.id], loaded=!!files[p.id];
                  const sov=calcSOV(d.mentions,d.compSet);
                  const mr=d.withAnyBrand>0?Math.round((d.mentions/d.withAnyBrand)*100):0;
                  return (
                    <tr key={p.id} style={{borderBottom:"1px solid "+C.navy3,opacity:loaded?1:0.35}}>
                      <td style={{padding:"8px 9px"}}><span style={{background:p.color+"20",color:p.color,borderRadius:5,padding:"2px 6px",fontSize:10,fontWeight:700}}>{p.icon} {p.name}</span></td>
                      <td style={{padding:"8px 9px",color:C.muted,fontSize:10,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{loaded&&files[p.id].filename?files[p.id].filename.split("/").pop().slice(0,28):"—"}</td>
                      <td style={{padding:"9px 10px",fontFamily:"monospace",color:"#8ab8cc"}}>{fmtN(d.total)}</td>
                      <td style={{padding:"9px 10px",fontFamily:"monospace",color:"#8ab8cc"}}>{fmtN(d.withAnyBrand)}</td>
                      <td style={{padding:"9px 10px",fontFamily:"monospace",color:C.green,fontWeight:800}}>{fmtN(d.mentions)}</td>
                      <td style={{padding:"9px 10px",fontFamily:"monospace",color:C.sky,fontWeight:800}}>{fmtN(d.citations)}</td>
                      <td style={{padding:"8px 9px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:5}}>
                          <div style={{width:32,height:4,background:C.navy4,borderRadius:2,overflow:"hidden"}}>
                            <div style={{width:Math.max(sov,sov>0?5:0)+"%",height:"100%",background:p.color}}/>
                          </div>
                          <span style={{fontFamily:"monospace",fontSize:11,fontWeight:700,color:C.text}}>{sov}%</span>
                        </div>
                      </td>
                      <td style={{padding:"8px 9px",fontFamily:"monospace",color:mr>=10?C.green:mr>=2?C.gold:C.coral}}>{mr}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <div style={{display:"grid",gridTemplateColumns:"3fr 2fr",gap:12,marginBottom:14}}>
          <Card>
            <SL>SOV per platforma</SL>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={sovData} margin={{top:10,right:10,left:-22,bottom:0}}>
                <CartesianGrid strokeDasharray="2 4" stroke={C.border}/>
                <XAxis dataKey="platform" tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false} domain={[0,100]}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Bar dataKey="sov" name="SOV %" radius={[4,4,0,0]} label={{position:"top",fill:C.muted,fontSize:9,formatter:function(v){return v+"%";}}}>
                  {PLATFORMS.map(function(p,i){return <Cell key={i} fill={p.color}/>;})}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <SL>Wzmianki vs Cytowania</SL>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={sovData} margin={{top:10,right:10,left:-22,bottom:0}}>
                <CartesianGrid strokeDasharray="2 4" stroke={C.border}/>
                <XAxis dataKey="platform" tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Legend wrapperStyle={{fontSize:10,color:C.muted}}/>
                <Bar dataKey="mentions" name="Wzmianki" fill={C.green} radius={[3,3,0,0]}/>
                <Bar dataKey="citations" name="Cytowania" fill={C.sky} radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {allComps.length>0&&(
          <Card style={{marginBottom:14}}>
            <SL>Konkurenci wykryci z danych AI</SL>
            <Explain type="info"><strong>Skąd ci konkurenci?</strong> Automatycznie wyciągane z kolumny Mentions w plikach CSV — marki które AI wymienia w tej samej branży.</Explain>
            <ResponsiveContainer width="100%" height={Math.min(36*Math.min(allComps.length+1,9)+36,320)}>
              <BarChart data={[{name:brand.name||"Twoja marka",count:totalM}].concat(allComps.slice(0,8).map(function(c){return {name:c,count:compCounts[c]};}))
              } layout="vertical" margin={{top:4,right:45,left:10,bottom:0}}>
                <CartesianGrid strokeDasharray="2 4" stroke={C.border} horizontal={false}/>
                <XAxis type="number" tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false}/>
                <YAxis dataKey="name" type="category" tick={{fill:C.text,fontSize:10}} axisLine={false} tickLine={false} width={120}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Bar dataKey="count" name="Wzmianki" radius={[0,4,4,0]} label={{position:"right",fill:C.muted,fontSize:9}}>
                  {[{fill:C.green}].concat(allComps.slice(0,8).map(function(_,i){return {fill:[C.sky,C.coral,C.gold,C.purple,"#34d399",C.sky,C.coral,C.gold][i]};})).map(function(e,i){return <Cell key={i} fill={e.fill}/>;})}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {(allBrandKws.length>0||allGapKws.length>0)&&(
          <Card style={{marginBottom:14,border:"1px solid #1a3050"}}>
            <SL color="#90c8e0">🔍 Przeglądarka zapytań</SL>
            <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
              <button onClick={function(){setKwTab("brand");setKwPage(0);setKwSearch("");}} style={{padding:"6px 16px",borderRadius:8,border:"1px solid "+(kwTab==="brand"?C.green+"66":C.border),background:kwTab==="brand"?C.green+"18":"transparent",color:kwTab==="brand"?C.green:"#5090a8",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                🎯 Marka ({allBrandKws.length})
              </button>
              <button onClick={function(){setKwTab("gap");setKwPage(0);setKwSearch("");}} style={{padding:"6px 16px",borderRadius:8,border:"1px solid "+(kwTab==="gap"?C.coral+"66":C.border),background:kwTab==="gap"?C.coral+"18":"transparent",color:kwTab==="gap"?C.coral:"#5090a8",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                ⚠️ Luki ({allGapKws.length})
              </button>
              {kwTab==="gap"&&(
                <label style={{display:"flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:7,background:filterCompetitorQ?"#0a1800":"transparent",border:"1px solid "+(filterCompetitorQ?"#2a4800":C.border),cursor:"pointer",fontSize:11,color:filterCompetitorQ?"#8ad050":C.muted}}>
                  <input type="checkbox" checked={filterCompetitorQ} onChange={function(e){setFilterCompetitorQ(e.target.checked);}} style={{accentColor:"#8ad050"}}/>
                  Ukryj zapytania tylko o konkurencję
                </label>
              )}
              <div style={{flex:1}}/>
              <input value={kwSearch} onChange={function(e){setKwSearch(e.target.value);setKwPage(0);}} placeholder="Szukaj frazy..."
                style={{background:C.navy1,border:"1px solid "+C.border,borderRadius:8,padding:"5px 11px",color:C.text,fontSize:12,outline:"none",width:180}}/>
            </div>
            <div style={{background:"#020a14",borderRadius:8,overflow:"hidden",border:"1px solid #0e2030"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead>
                  <tr style={{background:"#030e1a",borderBottom:"1px solid #0e2030"}}>
                    <th style={{padding:"8px 12px",textAlign:"left",fontSize:10,color:"#4a7090",fontWeight:700,textTransform:"uppercase"}}>#</th>
                    <th style={{padding:"8px 12px",textAlign:"left",fontSize:10,color:"#4a7090",fontWeight:700,textTransform:"uppercase"}}>Zapytanie</th>
                    <th style={{padding:"8px 12px",textAlign:"right",fontSize:10,color:"#4a7090",fontWeight:700,textTransform:"uppercase"}}>Vol/mies.</th>
                    {kwTab!=="brand"&&<th style={{padding:"8px 12px",textAlign:"left",fontSize:10,color:"#4a7090",fontWeight:700,textTransform:"uppercase"}}>AI wymienia</th>}
                  </tr>
                </thead>
                <tbody>
                  {kwBrowserData.page.length===0&&(
                    <tr><td colSpan={kwTab==="brand"?3:4} style={{padding:"16px 12px",textAlign:"center",color:"#3a6070"}}>Brak wyników{kwSearch?" dla: "+kwSearch:""}</td></tr>
                  )}
                  {kwBrowserData.page.map(function([kw,valOrObj],i){
                    const vol = kwTab==="brand" ? valOrObj : valOrObj.vol;
                    const comps = kwTab==="brand" ? null : valOrObj.comps;
                    return (
                      <tr key={i} style={{borderBottom:"1px solid #0a1a28",background:i%2===0?"transparent":"#030c18"}}>
                        <td style={{padding:"7px 12px",color:"#3a5070",fontSize:11,width:36}}>{kwPage*25+i+1}</td>
                        <td style={{padding:"7px 12px",color:kwTab==="brand"?"#c0e0d0":"#c0d0e0",fontWeight:i<3?700:400}}>{kw}</td>
                        <td style={{padding:"7px 12px",textAlign:"right",fontFamily:"monospace",color:"#5090a8",fontSize:11}}>{vol>0?fmtN(vol):"—"}</td>
                        {kwTab!=="brand"&&<td style={{padding:"7px 12px",color:"#c06070",fontSize:11}}>{(comps||[]).slice(0,3).join(", ")}</td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {kwBrowserData.totalPages>1&&(
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginTop:10}}>
                <button onClick={function(){setKwPage(function(p){return Math.max(0,p-1);});}} disabled={kwPage===0} style={{padding:"4px 12px",borderRadius:6,border:"1px solid "+C.border,background:"transparent",color:kwPage===0?"#2a4050":"#7aabbf",cursor:kwPage===0?"not-allowed":"pointer",fontSize:12}}>Poprzednia</button>
                <span style={{fontSize:11,color:"#5090a8"}}>Strona {kwPage+1} z {kwBrowserData.totalPages} ({fmtN(kwBrowserData.list.length)} zapytań)</span>
                <button onClick={function(){setKwPage(function(p){return Math.min(kwBrowserData.totalPages-1,p+1);});}} disabled={kwPage>=kwBrowserData.totalPages-1} style={{padding:"4px 12px",borderRadius:6,border:"1px solid "+C.border,background:"transparent",color:kwPage>=kwBrowserData.totalPages-1?"#2a4050":"#7aabbf",cursor:kwPage>=kwBrowserData.totalPages-1?"not-allowed":"pointer",fontSize:12}}>Następna</button>
              </div>
            )}
          </Card>
        )}

        <Card style={{marginBottom:14,border:"1px solid "+C.gold+"33"}}>
          <SL color={C.gold}>⚡ Quick Wins</SL>
          <Explain type="warn"><strong>To są SUGESTIE — nie gotowe zadania!</strong> Weryfikuj kontekst branżowy przed wdrożeniem.</Explain>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
            {oppCards.map(function(op,i){
              return (
                <div key={i} style={{padding:"11px 13px",background:op.color+"08",border:"1px solid "+op.color+"22",borderRadius:9}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
                    <span style={{fontSize:13}}>{op.icon}</span>
                    <span style={{fontSize:9,fontWeight:800,color:op.color,background:op.color+"20",borderRadius:4,padding:"1px 5px",letterSpacing:"0.7px",textTransform:"uppercase"}}>{op.tag}</span>
                    <span style={{fontSize:11,fontWeight:700,color:C.text}}>{op.title}</span>
                  </div>
                  <div style={{fontSize:11,color:"#90b8cc",lineHeight:1.65}}>{op.body}</div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card style={{marginBottom:14}}>
          <SL>✦ Spostrzeżenia</SL>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
            {best&&(
              <div style={{padding:"10px 13px",background:C.green+"08",border:"1px solid "+C.green+"22",borderRadius:9}}>
                <div style={{fontSize:11,color:"#90b8cc",lineHeight:1.6}}><strong style={{color:C.green}}>Najlepsza: {best.platform}</strong> SOV {best.sov}% — {best.sov>=30?"silna pozycja.":best.sov>=10?"umiarkowana, rozbuduj FAQ.":"niska, twórz dedykowany content."}</div>
              </div>
            )}
            {worst&&worst!==best&&(
              <div style={{padding:"10px 13px",background:C.coral+"08",border:"1px solid "+C.coral+"22",borderRadius:9}}>
                <div style={{fontSize:11,color:"#90b8cc",lineHeight:1.6}}><strong style={{color:C.coral}}>Do działania: {worst.platform}</strong> SOV {worst.sov}% — {worst.sov===0?"marka nieobecna.":"najniższy SOV."}</div>
              </div>
            )}
            {renderInsightCard1()}
            {renderInsightCard2()}
          </div>
        </Card>

        <div style={{marginTop:16,paddingTop:16,borderTop:"1px solid "+C.border}}>
          <button onClick={function(){setTab("report");}} style={{padding:"10px 22px",background:C.green+"18",border:"1px solid "+C.green+"55",borderRadius:10,color:C.green,fontSize:13,fontWeight:700,cursor:"pointer"}}>Generuj Raport →</button>
        </div>
      </div>
    );
  }

  function renderReport() {
    const autoSections = {
      intro: [
        "Raport dotyczy marki "+(brand.name||"[marka]")+(brand.url?" ("+brand.url+")":"")+
          (brand.industryType?", branża: "+brand.industryType:"")+".",
        "Analiza obejmuje "+fmtN(totalQ)+" zapytań na "+
          PLATFORMS.filter(function(p){return proc[p.id].total>0;}).length+
          " platformach AI: "+PLATFORMS.filter(function(p){return proc[p.id].total>0;}).map(function(p){return p.name;}).join(", ")+".",
      ].join(" "),
      sov: [
        "AI Share of Voice wynosi "+globalSOV+"%. Wzór: "+fmtN(totalM)+" wzmianek marki ÷ ("+fmtN(totalM)+" + "+fmtN(top5CompM)+" wzmianek top 5 konkurentów) = "+globalSOV+"%.",
        globalSOV>=30?"Marka zajmuje silną pozycję w AI.":globalSOV>=10?"Marka ma umiarkowaną widoczność — jest przestrzeń do wzrostu.":"Marka rzadko pojawia się w AI — konieczne działania contentowe.",
        best?"Najlepsza platforma: "+best.platform+" (SOV "+best.sov+"%).":""
      ].filter(Boolean).join(" "),
      mentions: [
        "Marka wymieniana "+fmtN(totalM)+" razy spośród "+fmtN(totalWB)+" zapytań z jakąkolwiek marką ("+fmtP(totalM,totalWB)+").",
        totalM===0&&totalC>0?"Strona cytowana "+fmtN(totalC)+" razy bez wzmianki nazwy — priorytet: entity building.":
          totalM>0?"Cytowania: "+fmtN(totalC)+" ("+fmtP(totalC,totalQ)+" zapytań).":"",
      ].filter(Boolean).join(" "),
      competitors: allComps.length>0
        ? "Wykryto "+allComps.length+" marek. Najczęstsze: "+allComps.slice(0,4).map(function(c){return c+" ("+fmtN(compCounts[c])+" wzm.)";}).join(", ")+"."
        : "Brak wykrytych marek konkurencyjnych.",
    };

    function getSec(key) {
      return (reportSections[key]!==null&&reportSections[key]!==undefined) ? reportSections[key] : autoSections[key];
    }

    const sectionDefs = [
      {id:"s1",key:"intro",label:"① Wprowadzenie",color:C.sky,icon:"📋",
        what:"Podstawowe info o kliencie i zakresie analizy.",
        hint:"Sprawdź poprawność nazwy marki i liczby platform."},
      {id:"s2",key:"sov",label:"② AI Share of Voice",color:C.green,icon:"📊",
        what:"Procentowy udział marki wśród wzmianek branży w AI.",
        hint:"Czy liczby SOV zgadzają się z dashboardem?"},
      {id:"s3",key:"mentions",label:"③ Wzmianki i cytowania",color:C.purple,icon:"💬",
        what:"Wzmianki = AI napisał nazwę marki. Cytowania = link do strony.",
        hint:"Sprawdź proporcję wzmianek do cytowań."},
      {id:"s4",key:"competitors",label:"④ Analiza konkurencji",color:C.coral,icon:"⚔️",
        what:"Marki wykryte z kolumny Mentions w plikach CSV.",
        hint:"Zweryfikuj czy wymienieni to faktyczni rywale.",
        ok:allComps.length>0},
      {id:"s5",key:"recs",label:"⑤ Rekomendacje",color:C.gold,icon:"🚀",
        what:"Konkretne działania do wdrożenia — dodaj własne punkty.",
        hint:"Dostosuj do branży klienta."},
    ];

    const recsHtml = recs.length>0
      ? recs.map(function(r,i){
          const sub = r.subs.length>0?"\n"+r.subs.map(function(s,j){return "   "+(i+1)+"."+(j+1)+". "+s.text;}).join("\n"):"";
          return (i+1)+". "+r.text+(r.note?" — "+r.note:"")+sub;
        }).join("\n")
      : "(brak rekomendacji)";

    const finalComment = [
      ...sectionDefs.filter(function(s){return s.key!=="recs"&&s.ok!==false;}).map(function(s){return "## "+s.label+"\n"+(getSec(s.key)||"");}),
      "## \u2464 Rekomendacje wdro\u017ceniowe\n"+recsHtml,
    ].join("\n\n");

    const readyToGenerate = sectionDefs
      .filter(function(s){return s.ok!==false&&s.key!=="recs";})
      .every(function(s){return reportChecks[s.id]===true;});
    const remaining = sectionDefs.filter(function(s){return s.ok!==false&&s.key!=="recs"&&!reportChecks[s.id];}).length;

    return (
      <div>
        <STitle>Raport — zbuduj sekcje i wygeneruj</STitle>
        <Explain type="step"><strong>Jak to działa:</strong> Przejdź przez sekcje, sprawdź auto-teksty, zaznacz "Sprawdzone". Sekcja ⑤ uzupełniasz ręcznie. Możesz wybrać które zapytania trafią do raportu (checkboxy w sekcji zapytań poniżej).</Explain>

        {(allBrandKws.length>0||allGapKws.length>0)&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
            {allBrandKws.length>0&&(
              <Card style={{border:"1px solid "+C.green+"44"}}>
                <SL color={C.green}>🎯 Zapytania z marką — wybierz do raportu</SL>
                <div style={{display:"flex",gap:7,marginBottom:7}}>
                  <button onClick={function(){setSelectedKws(function(s){const n=new Set(s);allBrandKws.slice(0,10).forEach(function([k]){n.add("B:"+k);});return n;});}} style={{fontSize:10,padding:"3px 9px",background:"#0a2010",border:"1px solid "+C.green+"44",borderRadius:5,color:C.green,cursor:"pointer"}}>Zaznacz top 10</button>
                  <button onClick={function(){setSelectedKws(function(s){const n=new Set(s);allBrandKws.forEach(function([k]){n.delete("B:"+k);});return n;});}} style={{fontSize:10,padding:"3px 9px",background:"transparent",border:"1px solid "+C.border,borderRadius:5,color:C.muted,cursor:"pointer"}}>Odznacz</button>
                </div>
                <div style={{maxHeight:280,overflowY:"auto"}}>
                  {allBrandKws.slice(0,30).map(function([kw,vol],i){
                    const key="B:"+kw, checked=selectedKws.has(key);
                    return (
                      <label key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 8px",background:checked?"#041a0a":i%2===0?"#030e18":"transparent",borderRadius:5,marginTop:2,cursor:"pointer",border:"1px solid "+(checked?C.green+"22":"transparent")}}>
                        <div style={{display:"flex",alignItems:"center",gap:7,flex:1,minWidth:0}}>
                          <input type="checkbox" checked={checked} onChange={function(e){setSelectedKws(function(s){const n=new Set(s);e.target.checked?n.add(key):n.delete(key);return n;});}} style={{accentColor:C.green,flexShrink:0}}/>
                          <span style={{fontSize:12,color:checked?"#c0e8d0":"#c0dce8",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{kw}</span>
                        </div>
                        {vol>0&&<span style={{fontSize:10,color:"#4a7090",fontFamily:"monospace",background:"#040e1a",padding:"1px 7px",borderRadius:4,flexShrink:0}}>{fmtN(vol)}/mies.</span>}
                      </label>
                    );
                  })}
                </div>
              </Card>
            )}
            {allGapKws.length>0&&(
              <Card style={{border:"1px solid "+C.coral+"44"}}>
                <SL color={C.coral}>⚠️ Luki — wybierz do raportu</SL>
                <div style={{display:"flex",gap:7,marginBottom:7,alignItems:"center"}}>
                  <button onClick={function(){setSelectedKws(function(s){const n=new Set(s);allGapKws.slice(0,10).forEach(function([k]){n.add("G:"+k);});return n;});}} style={{fontSize:10,padding:"3px 9px",background:"#1a0508",border:"1px solid "+C.coral+"44",borderRadius:5,color:C.coral,cursor:"pointer"}}>Zaznacz top 10</button>
                  <button onClick={function(){setSelectedKws(function(s){const n=new Set(s);allGapKws.forEach(function([k]){n.delete("G:"+k);});return n;});}} style={{fontSize:10,padding:"3px 9px",background:"transparent",border:"1px solid "+C.border,borderRadius:5,color:C.muted,cursor:"pointer"}}>Odznacz</button>
                  <label style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:filterCompetitorQ?"#8ad050":C.muted,cursor:"pointer",marginLeft:"auto"}}>
                    <input type="checkbox" checked={filterCompetitorQ} onChange={function(e){setFilterCompetitorQ(e.target.checked);}} style={{accentColor:"#8ad050"}}/>
                    Ukryj zapytania tylko o konk.
                  </label>
                </div>
                <div style={{maxHeight:280,overflowY:"auto"}}>
                  {allGapKws.slice(0,30).map(function([kw,data],i){
                    const key="G:"+kw, checked=selectedKws.has(key);
                    return (
                      <label key={i} style={{padding:"5px 8px",background:checked?"#190408":i%2===0?"#130306":"transparent",borderRadius:5,marginTop:2,display:"block",cursor:"pointer",border:"1px solid "+(checked?C.coral+"33":"transparent")}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div style={{display:"flex",alignItems:"center",gap:7,flex:1,minWidth:0}}>
                            <input type="checkbox" checked={checked} onChange={function(e){setSelectedKws(function(s){const n=new Set(s);e.target.checked?n.add(key):n.delete(key);return n;});}} style={{accentColor:C.coral,flexShrink:0}}/>
                            <span style={{fontSize:12,color:checked?"#e0c0c0":"#c0dce8",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{kw}</span>
                          </div>
                          {data.vol>0&&<span style={{fontSize:10,color:"#4a7090",fontFamily:"monospace",background:"#040e1a",padding:"1px 7px",borderRadius:4,flexShrink:0}}>{fmtN(data.vol)}/mies.</span>}
                        </div>
                        <div style={{fontSize:10,color:"#e08090",marginTop:2,paddingLeft:22}}>AI wymienia: {data.comps.join(", ")}</div>
                      </label>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>
        )}

        <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:16}}>
          {sectionDefs.map(function(s){
            const isOk = s.ok!==false;
            const checked = s.key==="recs" ? recs.length>0 : reportChecks[s.id]===true;
            const isRecs = s.key==="recs";
            return (
              <div key={s.id} style={{borderRadius:12,border:"2px solid "+(checked?s.color+"66":isOk?s.color+"22":C.border),background:checked?s.color+"06":C.navy2,opacity:isOk?1:0.4}}>
                <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:"1px solid "+(checked?s.color+"33":C.border)}}>
                  <span style={{fontSize:18}}>{s.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:800,color:checked?s.color:C.text}}>{s.label}</div>
                    <div style={{fontSize:11,color:"#6090a8",marginTop:2}}>{s.what}</div>
                  </div>
                  {!isOk&&<span style={{fontSize:10,color:"#3a5070",background:"#0a1a28",borderRadius:5,padding:"2px 8px"}}>brak danych</span>}
                  {isOk&&!isRecs&&(
                    <label style={{display:"flex",alignItems:"center",gap:7,cursor:"pointer",padding:"6px 12px",background:checked?s.color+"22":"#030c18",border:"1px solid "+(checked?s.color+"66":C.border),borderRadius:8,flexShrink:0}}>
                      <input type="checkbox" checked={checked} onChange={function(e){setReportChecks(function(r){return Object.assign({},r,{[s.id]:e.target.checked});});}} style={{width:14,height:14,accentColor:s.color}}/>
                      <span style={{fontSize:11,fontWeight:700,color:checked?s.color:"#5090a8",whiteSpace:"nowrap"}}>{checked?"✓ Sprawdzone":"Sprawdziłem"}</span>
                    </label>
                  )}
                  {isOk&&isRecs&&(
                    <div style={{fontSize:10,color:recs.length>0?s.color:"#4a7090",fontWeight:700,whiteSpace:"nowrap"}}>
                      {recs.length>0?"✓ "+recs.length+" pkt":"Dodaj min. 1 pkt"}
                    </div>
                  )}
                </div>
                {isOk&&(
                  <div style={{padding:"6px 16px",background:s.color+"08",fontSize:10,color:s.color+"bb",borderBottom:"1px solid "+s.color+"11"}}>
                    ℹ️ {s.hint}
                  </div>
                )}
                {isOk&&!isRecs&&(
                  <div style={{padding:"12px 16px"}}>
                    <textarea value={getSec(s.key)} onChange={function(e){updateSection(s.key,e.target.value);}}
                      style={{width:"100%",boxSizing:"border-box",background:"#020a14",border:"1px solid "+(checked?"#0e2030":C.border),borderRadius:7,padding:"10px 12px",color:"#c0dce8",fontSize:12,lineHeight:1.8,outline:"none",resize:"vertical",minHeight:65,fontFamily:"inherit"}}/>
                    {reportSections[s.key]!==null&&reportSections[s.key]!==undefined&&(
                      <button onClick={function(){updateSection(s.key,null);}} style={{marginTop:4,fontSize:10,color:"#3a6070",background:"none",border:"none",cursor:"pointer",padding:0}}>↺ Przywróć auto-tekst</button>
                    )}
                  </div>
                )}
                {isOk&&isRecs&&(
                  <div style={{padding:"14px 16px"}}>
                    <div style={{display:"flex",gap:10,marginBottom:12,alignItems:"center"}}>
                      <button onClick={addRec} style={{padding:"8px 16px",background:C.gold+"22",border:"1px solid "+C.gold+"55",borderRadius:8,color:C.gold,fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Dodaj rekomendację</button>
                    </div>
                    {recs.length===0&&(
                      <div style={{padding:"14px 16px",background:"#0a0800",border:"1px dashed #3a3000",borderRadius:8,fontSize:12,color:"#5a4500",textAlign:"center"}}>Kliknij "+ Dodaj rekomendację"</div>
                    )}
                    {recs.map(function(rec,ri){
                      return (
                        <div key={rec.id} style={{marginBottom:10,background:"#040c14",border:"1px solid #1a3050",borderRadius:9,overflow:"hidden"}}>
                          <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:"#030a12",borderBottom:"1px solid #0e2030"}}>
                            <span style={{fontSize:13,fontWeight:900,color:C.gold,minWidth:24}}>{ri+1}.</span>
                            <input value={rec.text} onChange={function(e){updateRec(rec.id,"text",e.target.value);}}
                              placeholder={"Rekomendacja "+(ri+1)}
                              style={{flex:1,background:"transparent",border:"none",color:"#c0dce8",fontSize:12,fontWeight:600,outline:"none",fontFamily:"inherit"}}/>
                            <button onClick={function(){removeRec(rec.id);}} style={{color:"#3a5070",background:"none",border:"none",cursor:"pointer",fontSize:16,lineHeight:1,padding:0}}>×</button>
                          </div>
                          <div style={{padding:"8px 12px"}}>
                            <input value={rec.note} onChange={function(e){updateRec(rec.id,"note",e.target.value);}}
                              placeholder="Komentarz / uzasadnienie (opcjonalnie)"
                              style={{width:"100%",boxSizing:"border-box",background:"#020810",border:"1px solid #0e2030",borderRadius:6,padding:"6px 10px",color:"#7aabbf",fontSize:11,outline:"none",fontFamily:"inherit"}}/>
                            {rec.subs.map(function(sub,si){
                              return (
                                <div key={sub.id} style={{display:"flex",alignItems:"center",gap:7,marginTop:6}}>
                                  <span style={{fontSize:10,color:"#3a6080",minWidth:28,flexShrink:0}}>{ri+1}.{si+1}.</span>
                                  <input value={sub.text} onChange={function(e){updateSub(rec.id,sub.id,e.target.value);}}
                                    placeholder="Podpunkt"
                                    style={{flex:1,background:"#020c18",border:"1px solid #0e2030",borderRadius:6,padding:"5px 10px",color:"#90b8cc",fontSize:11,outline:"none",fontFamily:"inherit"}}/>
                                  <button onClick={function(){removeSub(rec.id,sub.id);}} style={{color:"#2a4050",background:"none",border:"none",cursor:"pointer",fontSize:15,padding:"0 2px",lineHeight:1}}>×</button>
                                </div>
                              );
                            })}
                            <button onClick={function(){addSub(rec.id);}} style={{marginTop:7,fontSize:10,color:"#4a8090",background:"#030c18",border:"1px solid #1a3040",borderRadius:5,padding:"4px 10px",cursor:"pointer"}}>+ Podpunkt</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{padding:"14px 16px",background:readyToGenerate?"#001a08":"#030c18",border:"1px solid "+(readyToGenerate?C.green+"44":C.border),borderRadius:10,marginBottom:14}}>
          {readyToGenerate
            ? <div style={{fontSize:12,color:C.green,fontWeight:700,marginBottom:6}}>✅ Raport gotowy do wygenerowania!</div>
            : <div style={{fontSize:12,color:"#5090a8",marginBottom:6}}>Pozostało: {remaining} {remaining===1?"sekcja":"sekcji"} do zatwierdzenia.</div>
          }
          <div style={{fontSize:11,color:"#5090a8",marginBottom:10}}>
            📋 W raporcie: <strong style={{color:C.green}}>{reportBrandKws.length} zapytań marki</strong> i <strong style={{color:C.coral}}>{reportGapKws.length} luk</strong>.
          </div>
          <div style={{display:"flex",gap:10}}>
            <button
              onClick={function(){const html=buildReportHTML(Object.assign({},buildArgs(),{finalComment,recsHtml}));const w=window.open("","_blank");if(w){w.document.write(html);w.document.close();};}}
              disabled={!readyToGenerate}
              style={{padding:"10px 20px",background:readyToGenerate?C.green+"22":"transparent",border:"1px solid "+(readyToGenerate?C.green+"66":C.border),borderRadius:9,color:readyToGenerate?C.green:"#3a6080",fontSize:13,fontWeight:700,cursor:readyToGenerate?"pointer":"not-allowed"}}>🔍 Otwórz podgląd</button>
            <button
              onClick={function(){
                const html=buildReportHTML(Object.assign({},buildArgs(),{finalComment,recsHtml}));
                const a=document.createElement("a");
                a.href="data:text/html;charset=utf-8,"+encodeURIComponent(html);
                a.download="Sempai_AIVisibility_"+(brand.name||"Raport")+"_"+new Date().toISOString().slice(0,10)+".html";
                a.click();
              }}
              disabled={!readyToGenerate}
              style={{padding:"10px 20px",background:readyToGenerate?C.sky+"22":"transparent",border:"1px solid "+(readyToGenerate?C.sky+"66":C.border),borderRadius:9,color:readyToGenerate?C.sky:"#3a6080",fontSize:13,fontWeight:700,cursor:readyToGenerate?"pointer":"not-allowed"}}>⬇ Pobierz HTML</button>
          </div>
        </div>

        <Card>
          <SL>Podgląd KPI</SL>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:9}}>
            {[{l:"AI SOV",v:globalSOV+"%",c:C.green},{l:"Wzmianki",v:fmtN(totalM),c:C.purple},{l:"Cytowania",v:fmtN(totalC),c:C.coral},{l:"Zapytań",v:fmtN(totalQ),c:C.gold}].map(function(k,i){
              return (
                <div key={i} style={{textAlign:"center",padding:"11px",background:"#020a14",borderRadius:8,border:"1px solid "+k.c+"22"}}>
                  <div style={{fontSize:9,color:"#4a7090",textTransform:"uppercase",letterSpacing:"1px",marginBottom:3}}>{k.l}</div>
                  <div style={{fontSize:20,fontWeight:900,color:k.c}}>{k.v}</div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    );
  }

  const reportContent = tab==="report" ? renderReport() : null;

  const TABS = [
    {id:"guide",label:"⓪ Jak używać"},
    {id:"setup",label:"① Klient"},
    {id:"import",label:"② Import CSV"},
    {id:"dashboard",label:"③ Dashboard"},
    {id:"report",label:"④ Raport"},
    {id:"prompt",label:"⑤ Prompt AI"},
  ];

  return (
    <div style={{minHeight:"100vh",background:C.navy1,color:C.text,fontFamily:"DM Sans,Segoe UI,sans-serif"}}>
      <div style={{background:C.navy2,borderBottom:"1px solid "+C.border}}>
        <div style={{maxWidth:1060,margin:"0 auto",padding:"16px 28px 0"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
            <img src="https://sempai.pl/wp-content/uploads/2023/01/Sempai_logo_granat.svg"
              alt="Sempai" style={{height:32,width:"auto",display:"block",filter:"brightness(0) invert(1)"}}
              onError={function(e){e.target.style.display="none";}}/>
            <span style={{fontSize:10,fontWeight:700,color:C.green,background:C.green+"18",border:"1px solid "+C.green+"44",borderRadius:5,padding:"2px 8px",letterSpacing:"1px",textTransform:"uppercase"}}>AI Visibility</span>
            {filesLoaded>0&&(
              <div style={{marginLeft:"auto",display:"flex",gap:6,flexWrap:"wrap"}}>
                {PLATFORMS.filter(function(p){return proc[p.id].total>0;}).map(function(p){
                  return <span key={p.id} style={{fontSize:10,fontWeight:700,color:p.color,background:p.color+"18",border:"1px solid "+p.color+"44",borderRadius:6,padding:"2px 7px"}}>{p.icon} {p.name}</span>;
                })}
              </div>
            )}
          </div>
          <div style={{display:"flex",overflowX:"auto"}}>
            {TABS.map(function(t){
              return (
                <button key={t.id} onClick={function(){setTab(t.id);}} style={{padding:"8px 16px",background:"transparent",border:"none",borderBottom:tab===t.id?"2px solid "+C.green:"2px solid transparent",color:tab===t.id?C.green:C.muted,fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{maxWidth:1060,margin:"0 auto",padding:"26px 28px 60px"}}>

        {tab==="guide"&&(
          <div>
            <STitle>Jak to działa — przeczytaj zanim zaczniesz</STitle>
            <Explain type="info">To narzędzie sprawdza jak często modele AI (ChatGPT, Google AI Overview, Gemini itd.) wymieniają Twoją markę gdy ktoś zadaje pytania związane z Twoją branżą.</Explain>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:20}}>
              {[
                {icon:"💬",title:"Wzmianki",color:C.green,def:"AI napisał nazwę marki wprost w odpowiedzi."},
                {icon:"🔗",title:"Cytowania",color:C.sky,def:"AI dodał link do Twojej strony jako źródło."},
                {icon:"📊",title:"AI SOV",color:C.purple,def:"Twoje wzm. ÷ (Twoje + wzm. konkurentów) × 100."},
              ].map(function(x,i){
                return (
                  <div key={i} style={{padding:"14px 16px",background:"#040d18",border:"1px solid "+x.color+"33",borderRadius:10}}>
                    <div style={{fontSize:20,marginBottom:7}}>{x.icon}</div>
                    <div style={{fontSize:12,fontWeight:800,color:x.color,marginBottom:5}}>{x.title}</div>
                    <div style={{fontSize:11,color:"#8ab0c0",lineHeight:1.65}}>{x.def}</div>
                  </div>
                );
              })}
            </div>

            <div style={{fontSize:14,fontWeight:800,color:C.text,marginBottom:14}}>Jak pobrać dane z Ahrefs — 5 kroków</div>
            {[
              {n:"1",color:C.sky,title:"Brand Radar → wpisz markę i dodaj konkurentów",body:"Wejdź w Brand Radar w lewym menu Ahrefs. To punkt startowy całej analizy."},
              {n:"2",color:C.green,title:"AI Responses → wybierz agenta AI",body:"Wewnątrz Brand Radar kliknij AI Responses. Wybierz jednego agenta — np. ChatGPT, Gemini, Copilot, Perplexity."},
              {n:"3",color:C.purple,title:"Wybierz lokalizację (np. Poland)",body:"Ustaw filtr kraju. Każdy kraj = osobne dane."},
              {n:"4",color:C.coral,title:"Kliknij Export → pobierz CSV",body:"Plik pobierze się automatycznie. Narzędzie obsługuje UTF-8 i UTF-16 automatycznie."},
              {n:"5",color:C.gold,title:"Wgraj pliki w zakładce ② Import CSV",body:"Wgraj wszystkie naraz — platforma wykrywana automatycznie z nazwy pliku i nagłówków."},
            ].map(function(step,i){
              return (
                <div key={i} style={{display:"flex",gap:14,padding:"14px 18px",background:C.navy2,border:"1px solid "+step.color,borderRadius:12,marginBottom:10}}>
                  <div style={{width:32,height:32,borderRadius:"50%",background:step.color+"22",border:"2px solid "+step.color+"66",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:900,color:step.color,flexShrink:0}}>{step.n}</div>
                  <div>
                    <div style={{fontSize:13,fontWeight:800,color:C.text,marginBottom:4}}>{step.title}</div>
                    <div style={{fontSize:12,color:"#9abfd0",lineHeight:1.7}}>{step.body}</div>
                  </div>
                </div>
              );
            })}

            <Explain type="warn">Uwaga: AI Overview i AI Mode mają w Ahrefs identyczny format pliku — po wgraniu zapytamy który to jest.</Explain>
            <button onClick={function(){setTab("setup");}} style={{marginTop:16,padding:"12px 28px",background:C.green+"22",border:"2px solid "+C.green+"66",borderRadius:10,color:C.green,fontSize:13,fontWeight:700,cursor:"pointer"}}>
              Rozumiem, zaczynam → ① Klient
            </button>
          </div>
        )}

        {tab==="setup"&&(
          <div>
            <STitle>Dane klienta</STitle>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
              <Inp label="Nazwa marki *" value={brand.name} set={function(v){setBrand(function(b){return Object.assign({},b,{name:v});});}} ph="np. Twoja Marka" help="Jak marka jest publicznie rozpoznawana"/>
              <Inp label="Domena / URL *" value={brand.url} set={function(v){setBrand(function(b){return Object.assign({},b,{url:v});});}} ph="twoja-marka.pl" help="Baza do auto-generowania wariantów nazwy"/>
            </div>

            <Card style={{marginBottom:12}}>
              <SL>Typ domeny i branża</SL>
              <Explain type="step">Wybierz typ domeny i branżę — narzędzie lepiej filtruje luki contentowe.</Explain>
              <div style={{marginTop:10,marginBottom:12}}>
                {renderIndustries()}
              </div>
              {brand.industry&&(
                <div>
                  <div style={{fontSize:9,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:7}}>Rodzaj działalności</div>
                  <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                    {INDUSTRIES[brand.industry].types.map(function(t){
                      return (
                        <button key={t.id} onClick={function(){setBrand(function(b){return Object.assign({},b,{industryType:t.id});});}}
                          style={{padding:"4px 12px",borderRadius:12,fontSize:11,fontWeight:700,cursor:"pointer",border:"1px solid "+(brand.industryType===t.id?C.green:C.border),background:brand.industryType===t.id?C.green+"18":"transparent",color:brand.industryType===t.id?C.green:C.muted}}>
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>

            {(brand.name||brand.url)&&(
              <Card style={{marginBottom:12}}>
                <SL>Warianty nazwy marki</SL>
                <Explain type="step">Narzędzie szuka tych słów w kolumnie Mentions. Usuń nieistotne (✕), dodaj własne.</Explain>
                <div style={{display:"flex",gap:7,flexWrap:"wrap",marginTop:10,marginBottom:10}}>
                  {autoVariants.map(function(v,i){
                    return (
                      <span key={i} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px 3px 11px",borderRadius:13,fontSize:11,fontWeight:700,background:C.green+"18",border:"1px solid "+C.green+"33",color:C.green}}>
                        {v}
                        <button onClick={function(){setRemovedVariants(function(prev){return new Set(Array.from(prev).concat([v]));});}} style={{background:"none",border:"none",cursor:"pointer",color:C.green+"80",fontSize:12,lineHeight:1,padding:0}}>✕</button>
                      </span>
                    );
                  })}
                  {brandVariants.map(function(v,i){
                    return (
                      <span key={"c"+i} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px 3px 11px",borderRadius:13,fontSize:11,fontWeight:700,background:C.sky+"18",border:"1px solid "+C.sky+"33",color:C.sky}}>
                        {v}
                        <button onClick={function(){setBrandVariants(function(prev){return prev.filter(function(x){return x!==v;});});}} style={{background:"none",border:"none",cursor:"pointer",color:C.sky+"80",fontSize:12,lineHeight:1,padding:0}}>✕</button>
                      </span>
                    );
                  })}
                </div>
                <div style={{display:"flex",gap:7,alignItems:"center"}}>
                  <input value={variantInput} onChange={function(e){setVariantInput(e.target.value);}}
                    onKeyDown={function(e){if(e.key==="Enter"&&variantInput.trim()){setBrandVariants(function(prev){return Array.from(new Set(prev.concat([variantInput.trim()])));});setVariantInput("");}}}
                    placeholder="Dodaj własny wariant i naciśnij Enter"
                    style={{flex:1,background:C.navy1,border:"1px solid "+C.border,borderRadius:8,padding:"8px 11px",color:C.text,fontSize:12,outline:"none"}}/>
                  <button onClick={function(){if(variantInput.trim()){setBrandVariants(function(p){return Array.from(new Set(p.concat([variantInput.trim()])));});setVariantInput("");}}} style={{padding:"8px 13px",background:C.sky+"18",border:"1px solid "+C.sky+"44",borderRadius:8,color:C.sky,fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Dodaj</button>
                </div>
              </Card>
            )}

            <button onClick={function(){setTab("import");}} disabled={!(brand.name&&brand.url&&brand.industry&&brand.industryType)}
              style={{marginTop:10,padding:"10px 22px",background:!(brand.name&&brand.url&&brand.industry&&brand.industryType)?"transparent":C.green+"18",border:"1px solid "+(!(brand.name&&brand.url&&brand.industry&&brand.industryType)?C.border:C.green+"55"),borderRadius:10,color:!(brand.name&&brand.url&&brand.industry&&brand.industryType)?C.border:C.green,fontSize:13,fontWeight:700,cursor:!(brand.name&&brand.url&&brand.industry&&brand.industryType)?"not-allowed":"pointer"}}>
              Dalej → Import CSV
            </button>
          </div>
        )}

        {tab==="import"&&(
          <div>
            <STitle>Import plików CSV z Ahrefs</STitle>
            <p style={{fontSize:12,color:C.muted,marginBottom:14}}>Wgraj wszystkie pliki naraz. Encoding (UTF-8/UTF-16) i separator (TAB/przecinek) wykrywane automatycznie.</p>

            <div
              onDragOver={function(e){e.preventDefault();}}
              onDrop={function(e){e.preventDefault();Array.from(e.dataTransfer.files).forEach(function(f){const r=new FileReader();r.onload=function(ev){handleFiles(f.name,ev.target.result);};r.readAsArrayBuffer(f);});}}
              onClick={function(){document.getElementById("fi").click();}}
              style={{border:"2px dashed "+C.border,borderRadius:11,padding:"28px 20px",cursor:"pointer",textAlign:"center",marginBottom:14}}>
              <input id="fi" type="file" accept=".csv" multiple style={{display:"none"}} onChange={function(e){Array.from(e.target.files).forEach(function(f){const r=new FileReader();r.onload=function(ev){handleFiles(f.name,ev.target.result);};r.readAsArrayBuffer(f);});}}/>
              <div style={{fontSize:28,marginBottom:6}}>{loadingFile?"⏳":"📂"}</div>
              <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:3}}>{loadingFile?"Przetwarzanie: "+loadingFile+"...":"Upuść pliki CSV lub kliknij"}</div>
              <div style={{fontSize:11,color:C.muted}}>UTF-8 i UTF-16 · TAB i CSV · platforma wykrywana automatycznie</div>
            </div>

            {totalM===0&&allMentionsInData.length>0&&(
              <div style={{marginBottom:12,padding:"13px 15px",background:"#080e0a",border:"1px solid "+C.gold+"44",borderRadius:11}}>
                <div style={{fontSize:12,fontWeight:700,color:C.gold,marginBottom:7}}>⚠️ Marka "{brandKey}" nie znaleziona — kliknij właściwą:</div>
                <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:9}}>
                  {allMentionsInData.map(function(m,i){
                    const cols=[C.sky,C.coral,C.gold,C.purple,"#34d399",C.green];
                    const act=brandMentionKey===m;
                    return <button key={i} onClick={function(){setBrandMentionKey(act?"":m);}} style={{padding:"4px 12px",borderRadius:13,fontSize:11,fontWeight:700,cursor:"pointer",background:act?cols[i%6]+"33":cols[i%6]+"12",border:"1px solid "+(act?cols[i%6]:cols[i%6]+"44"),color:cols[i%6]}}>{m}</button>;
                  })}
                </div>
                <div style={{display:"flex",gap:7,alignItems:"center"}}>
                  <input value={brandMentionKey} onChange={function(e){setBrandMentionKey(e.target.value);}} placeholder="lub wpisz ręcznie..."
                    style={{flex:1,background:C.navy2,border:"1px solid "+C.border,borderRadius:8,padding:"7px 11px",color:C.text,fontSize:12,outline:"none",fontFamily:"monospace"}}/>
                  {brandMentionKey&&<button onClick={function(){setBrandMentionKey("");}} style={{padding:"5px 11px",background:"transparent",border:"1px solid "+C.border,borderRadius:8,color:C.muted,fontSize:11,cursor:"pointer"}}>✕</button>}
                </div>
              </div>
            )}

            {filesLoaded>0&&(
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:9,marginBottom:12}}>
                {PLATFORMS.map(function(p){
                  const d=proc[p.id], loaded=!!files[p.id];
                  return (
                    <div key={p.id} style={{padding:"11px 13px",background:C.navy2,border:"1px solid "+(loaded?p.color+"44":C.border),borderRadius:10}}>
                      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}>
                        <span style={{background:p.color+"20",color:p.color,borderRadius:5,padding:"1px 6px",fontSize:10,fontWeight:700}}>{p.icon} {p.name}</span>
                        {loaded?<span style={{fontSize:10,color:C.green}}>✅</span>:<span style={{fontSize:10,color:C.muted}}>—</span>}
                      </div>
                      {loaded
                        ? <div>
                            <div style={{fontSize:9,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:3}}>{files[p.id].filename}</div>
                            <div style={{fontSize:11,color:C.text,fontFamily:"monospace"}}>{fmtN(d.total)} zapytań — <span style={{color:C.green}}>{fmtN(d.mentions)} wzm.</span> · <span style={{color:C.sky}}>{fmtN(d.citations)} cyt.</span></div>
                          </div>
                        : <div style={{fontSize:11,color:"#3a6080"}}>— wgraj CSV z Ahrefs</div>
                      }
                    </div>
                  );
                })}
              </div>
            )}

            {unknownFiles.length>0&&(
              <div style={{marginBottom:12,padding:"13px 15px",background:C.gold+"0a",border:"1px solid "+C.gold+"33",borderRadius:10}}>
                <div style={{fontSize:13,fontWeight:800,color:C.gold,marginBottom:5}}>⚠️ Wymagane przypisanie platformy</div>
                {unknownFiles.map(function(uf,fi){
                  return (
                    <div key={fi} style={{marginBottom:16,background:"#0a0800",border:"1px solid "+C.gold+"44",borderRadius:10,padding:"14px 16px"}}>
                      <div style={{fontSize:11,color:"#7aaabf",marginBottom:8,fontFamily:"monospace"}}>{uf.filename}</div>
                      {uf.conflictNote&&<div style={{padding:"10px 14px",background:"#0f0e00",border:"1px solid "+C.gold+"55",borderRadius:8,marginBottom:12,fontSize:12,color:"#d4a820"}}>{uf.conflictNote}</div>}
                      {uf.conflict?(
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                          {[PLATFORMS.find(function(p){return p.id==="ai_overview";}),PLATFORMS.find(function(p){return p.id==="ai_mode";})].filter(Boolean).map(function(p){
                            return (
                              <button key={p.id} onClick={function(){assignPlatform(uf.filename,p.id);}} style={{padding:"14px 16px",borderRadius:10,fontSize:13,fontWeight:800,cursor:"pointer",background:p.color+"20",border:"2px solid "+p.color+"66",color:p.color,textAlign:"left"}}>
                                <div style={{fontSize:22,marginBottom:6}}>{p.icon}</div>
                                <div style={{fontSize:13,fontWeight:800,marginBottom:3}}>{p.name}</div>
                                <div style={{fontSize:11,color:p.color+"aa",fontWeight:400}}>
                                  {p.id==="ai_overview"?"Google AI Overview — kafelki w wynikach":"Google AI Mode — osobny tryb wyszukiwania AI"}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ):(
                        <div>
                          <div style={{fontSize:11,color:"#9abfd0",marginBottom:8}}>Wybierz platformę:</div>
                          <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                            {PLATFORMS.map(function(p){
                              return <button key={p.id} onClick={function(){assignPlatform(uf.filename,p.id);}} style={{padding:"6px 14px",borderRadius:10,fontSize:11,fontWeight:700,cursor:"pointer",background:p.color+"18",border:"1px solid "+p.color+"44",color:p.color}}>{p.icon} {p.name}</button>;
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {errors.length>0&&unknownFiles.length===0&&(
              <div style={{marginBottom:12,padding:"9px 13px",background:C.coral+"0f",border:"1px solid "+C.coral+"33",borderRadius:8}}>
                {errors.map(function(e,i){return <div key={i} style={{fontSize:11,color:C.coral}}>{e}</div>;})}
              </div>
            )}

            <button onClick={function(){setTab("dashboard");}} style={{padding:"10px 22px",background:C.green+"18",border:"1px solid "+C.green+"55",borderRadius:10,color:C.green,fontSize:13,fontWeight:700,cursor:"pointer"}}>Dashboard →</button>
          </div>
        )}

        {tab==="dashboard"&&(
          <div>{renderDashboard()}</div>
        )}

        {tab==="report"&&reportContent}

        {tab==="prompt"&&(
          <div>
            <STitle>Prompt dla AI — generuj raport .docx</STitle>
            <div style={{position:"relative"}}>
              <pre style={{background:C.navy1,border:"1px solid "+C.border,borderRadius:11,padding:"18px 20px",fontSize:12,lineHeight:1.8,color:"#3a6080",overflow:"auto",maxHeight:480,whiteSpace:"pre-wrap",fontFamily:"monospace"}}>
                {[
                  "Jesteś ekspertem ds. AI Visibility. Przygotuj profesjonalny raport w języku polskim.",
                  "",
                  "KLIENT: "+(brand.name||"[KLIENT]")+" | URL: "+(brand.url||"—")+" | Branża: "+(brand.industryType||brand.industry||"—"),
                  "KONKURENCI (z danych): "+(allComps.slice(0,5).map(function(c){return c+": "+compCounts[c]+" wzm.";}).join(", ")||"brak"),
                  "",
                  "AI Share of Voice (SOV): "+globalSOV+"% (wzm. marki ÷ wzm. marki + wzm. top 5 konk.)",
                  "Mention Rate: "+fmtP(totalM,totalWB)+" ("+fmtN(totalM)+" wzm. na "+fmtN(totalWB)+" zapytań z markami)",
                  "Citation Rate: "+fmtP(totalC,totalQ)+" ("+fmtN(totalC)+" cyt. na "+fmtN(totalQ)+" zapytań)",
                  "",
                  "PER PLATFORMA:",
                  ...PLATFORMS.map(function(p){
                    const d=proc[p.id];
                    if (!d.total) return null;
                    return p.name+": "+fmtN(d.total)+" zapytań, "+fmtN(d.mentions)+" wzm., "+fmtN(d.citations)+" cyt., SOV "+calcSOV(d.mentions,d.compSet)+"%";
                  }).filter(Boolean),
                  "",
                  "TOP ZAPYTANIA Z MARKĄ:",
                  ...reportBrandKws.slice(0,8).map(function([kw,vol]){return "• "+kw+(vol?" ("+fmtN(vol)+" wyszukiwań/mies.)":"");}),
                  "",
                  "LUKI (konkurenci wymieniani, marka nie):",
                  ...reportGapKws.slice(0,8).map(function([kw,data]){return "• "+kw+" — AI wymienia: "+data.comps.join(", ")+(data.vol?" ("+fmtN(data.vol)+"/mies.)":"");}),
                  "",
                  "RAPORT (.docx): 1. Podsumowanie z kluczowymi liczbami. 2. SOV i wyniki per platforma. 3. Analiza luk i rekomendacje. 4. Plan działań na 3-6 mies.",
                ].filter(function(x){return x!==null;}).join("\n")}
              </pre>
              <button onClick={function(){
                const text = [
                  "Jesteś ekspertem ds. AI Visibility. Przygotuj profesjonalny raport w języku polskim.",
                  "",
                  "KLIENT: "+(brand.name||"[KLIENT]")+" | URL: "+(brand.url||"—")+" | Branża: "+(brand.industryType||brand.industry||"—"),
                  "KONKURENCI: "+(allComps.slice(0,5).map(function(c){return c+": "+compCounts[c]+" wzm.";}).join(", ")||"brak"),
                  "",
                  "SOV: "+globalSOV+"%, Mentions: "+fmtN(totalM)+", Citations: "+fmtN(totalC)+", Queries: "+fmtN(totalQ),
                ].join("\n");
                navigator.clipboard.writeText(text).then(function(){setPromptCopied(true);setTimeout(function(){setPromptCopied(false);},2000);});
              }} style={{position:"absolute",top:13,right:13,background:promptCopied?C.green+"22":C.navy3,border:"1px solid "+(promptCopied?C.green:C.border),borderRadius:7,padding:"6px 14px",color:promptCopied?C.green:C.muted,fontSize:11,fontWeight:700,cursor:"pointer"}}>
                {promptCopied?"✓ Skopiowano!":"⎘ Kopiuj"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── REPORT HTML BUILDER ───────────────────────────────────────────────────
function buildReportHTML(args) {
  const {brand,proc,totalQ,totalM,totalC,totalWB,avgSOV,globalSOV,allComps,compCounts,
    best,worst,topBrandKws,topGapKws,totalCompM,top5CompM,totalImpressions,totalGapQueries,finalComment,recsHtml} = args;

  function fN(n){return(n||0).toLocaleString("pl-PL");}
  function fP(n,d){if(!d)return"0%";const v=(n/d)*100;if(v===0)return"0%";if(v<1)return v.toFixed(1)+"%";return Math.round(v)+"%";}
  function cSOV(m,cs){const ct=Object.values(cs||{}).reduce(function(s,v){return s+v;},0);return m+ct>0?Math.round((m/(m+ct))*100):0;}

  const date = new Date().toLocaleDateString("pl-PL",{year:"numeric",month:"long",day:"numeric"});
  const sov = globalSOV||avgSOV||0;

  function buildComment(src) {
    if (!src) return "<p style='color:#6a7a8a'>Brak komentarza analitycznego.</p>";
    const lines = src.split("\n");
    const colors = ["#2edf8f","#4da6ff","#a78bfa","#ff5c6a","#f5c842"];
    let html="", secIdx=-1, inSection=false, secBuf=[], secLabel="";
    function flush(label,buf,idx) {
      const col=colors[idx%colors.length];
      const paras=buf.filter(Boolean).map(function(l){
        const firstChar=l.charCodeAt(0);
        if (firstChar===8226||(firstChar>=48&&firstChar<=57)) {
          let clean=l;
          while(clean.length&&(clean.charCodeAt(0)===8226||(clean.charCodeAt(0)>=48&&clean.charCodeAt(0)<=57)))clean=clean.slice(1);
          while(clean.length&&(clean[0]==="."||clean[0]===")"||clean[0]===" "))clean=clean.slice(1);
          return "<li style='margin:0 0 6px 0'>"+clean.trim()+"</li>";
        }
        return "<p style='margin:0 0 10px 0;color:#2a3a4a;line-height:1.75'>"+l+"</p>";
      });
      const hasList=paras.some(function(p){return p.startsWith("<li");});
      const inner=hasList?"<ul style='margin:10px 0;padding-left:18px;color:#2a3a4a;line-height:1.75'>"+paras.join("")+"</ul>":paras.join("");
      return "<div style='background:#f8faff;border:1px solid #e0eaf5;border-left:4px solid "+col+";border-radius:8px;padding:16px 18px;margin-bottom:16px'>"
        +(label?"<div style='font-size:12px;font-weight:800;color:"+col+";margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px'>"+label+"</div>":"")
        +inner+"</div>";
    }
    lines.forEach(function(line){
      if (line.startsWith("##")) {
        if (inSection&&secBuf.length){html+=flush(secLabel,secBuf,secIdx);secBuf=[];}
        secLabel=line.slice(2).trim();secIdx++;inSection=true;
      } else if (inSection) {
        secBuf.push(line);
      } else {
        if (line.trim()) html+="<p style='margin:0 0 10px 0;color:#2a3a4a'>"+line+"</p>";
      }
    });
    if (inSection&&secBuf.length) html+=flush(secLabel,secBuf,secIdx);
    return html||"<p style='color:#6a7a8a'>Brak danych.</p>";
  }

  const commentHtml = buildComment(finalComment||"Analiza obejmuje "+fN(totalQ)+" zapytań.");

  const platformRows = PLATFORMS.filter(function(p){return proc[p.id].total>0;}).map(function(p){
    const d=proc[p.id], sov=cSOV(d.mentions,d.compSet), mr=d.withAnyBrand>0?Math.round((d.mentions/d.withAnyBrand)*100):0, cr=d.total>0?Math.round((d.citations/d.total)*100):0;
    return "<tr><td><span style='background:"+p.color+"18;color:"+p.color+";padding:2px 8px;border-radius:5px;font-size:11px;font-weight:700'>"+p.icon+" "+p.name+"</span></td><td>"+fN(d.total)+"</td><td>"+fN(d.withAnyBrand)+"</td><td style='color:#1db872;font-weight:700'>"+fN(d.mentions)+"</td><td style='color:#2a7abf;font-weight:700'>"+fN(d.citations)+"</td><td><strong>"+sov+"%</strong></td><td>"+mr+"%</td><td>"+cr+"%</td></tr>";
  }).join("");

  const compHtml = allComps.length>0
    ? "<section><h2><span class='num'>02</span> Konkurenci z danych AI</h2><table><thead><tr><th>Marka</th><th>Wzmianki AI</th><th>vs. "+(brand.name||"Twoja marka")+"</th></tr></thead><tbody><tr class='bench'><td><strong>"+(brand.name||"Twoja marka")+"</strong></td><td>"+fN(totalM)+"</td><td><span style='color:#1db872'>Benchmark</span></td></tr>"+allComps.slice(0,10).map(function(c){const diff=totalM-compCounts[c];return"<tr><td>"+c+"</td><td>"+fN(compCounts[c])+"</td><td style='color:"+(diff>=0?"#1db872":"#e03050")+"'>"+(diff>=0?"+":"")+diff+"</td></tr>";}).join("")+"</tbody></table></section>"
    : "";

  const bHtml = topBrandKws.length>0
    ? "<table><thead><tr><th>Zapytanie</th><th style='text-align:right'>Wolumen</th></tr></thead><tbody>"+topBrandKws.map(function([kw,vol]){return"<tr><td>"+kw+"</td><td style='text-align:right;color:#4a7090'>"+fN(vol)+"</td></tr>";}).join("")+"</tbody></table>"
    : "<p style='color:#4a7090'>Brak danych</p>";

  const gHtml = topGapKws.length>0
    ? "<table><thead><tr><th>Zapytanie</th><th>AI wymienia</th><th style='text-align:right'>Vol.</th></tr></thead><tbody>"+topGapKws.map(function([kw,data]){return"<tr><td>"+kw+"</td><td style='color:#e03050;font-size:11px'>"+data.comps.join(", ")+"</td><td style='text-align:right;color:#4a7090'>"+fN(data.vol)+"</td></tr>";}).join("")+"</tbody></table>"
    : "<p style='color:#4a7090'>Brak danych</p>";

  const css = "body{font-family:'DM Sans',sans-serif;background:#fff;color:#1a2a3a;font-size:14px;line-height:1.6;margin:0}.page{max-width:960px;margin:0 auto;padding:46px 42px}.header{border-bottom:3px solid #2edf8f;padding-bottom:22px;margin-bottom:28px}h1{font-size:24px;font-weight:900;color:#07111f;margin-bottom:5px}.meta{color:#4a7090;font-size:13px}.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:13px;margin-bottom:28px}.kpi{background:#f8faff;border:1px solid #dde8f5;border-radius:11px;padding:16px 13px;border-top:3px solid}.kl{font-size:9px;text-transform:uppercase;letter-spacing:1px;font-weight:700;color:#4a7090;margin-bottom:6px}.kv{font-size:26px;font-weight:900;line-height:1;margin-bottom:3px}.ks{font-size:10px;color:#8899aa}.ke{font-size:10px;color:#3a5a70;line-height:1.5;margin-top:5px;padding-top:5px;border-top:1px solid #e0eaf5;font-family:monospace}section{margin-bottom:32px}h2{font-size:17px;font-weight:900;color:#07111f;margin-bottom:14px;padding-bottom:9px;border-bottom:2px solid #eef2f8;display:flex;align-items:center;gap:10px}.num{display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:28px;background:#2edf8f22;border-radius:7px;color:#0a7a40;font-size:13px;font-weight:900;padding:0 6px}table{width:100%;border-collapse:collapse;font-size:12px}thead tr{background:#f2f7ff}th{padding:8px 10px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.7px;font-weight:700;color:#4a7090;border-bottom:2px solid #dde8f5}td{padding:8px 10px;border-bottom:1px solid #f0f5fb;vertical-align:middle}tr:last-child td{border-bottom:none}.bench td{background:#f0fff8!important;font-weight:600}.explain{background:#f0f7ff;border:1px solid #c8dff5;border-left:4px solid #4da6ff;border-radius:6px;padding:9px 13px;margin-bottom:12px;font-size:11px;color:#2a4a6a;line-height:1.6}.kw-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.comment-box{background:#f8faff;border:1px solid #dde8f5;border-left:4px solid #2edf8f;border-radius:8px;padding:18px 20px}.footer{margin-top:44px;padding-top:18px;border-top:1px solid #e8f0f5;display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#4a7090}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}@page{margin:1.5cm}}";

  return "<!DOCTYPE html><html lang='pl'><head><meta charset='UTF-8'><title>Sempai AI Visibility — "+(brand.name||"Raport")+"</title><style>"+css+"</style></head><body><div class='page'>"
    +"<div class='header'><div style='display:flex;align-items:center;gap:9px;margin-bottom:12px'><img src='https://sempai.pl/wp-content/uploads/2023/01/Sempai_logo_granat.svg' alt='Sempai' style='height:28px;width:auto'><span style='font-size:10px;font-weight:700;color:#2edf8f;background:#2edf8f15;border:1px solid #2edf8f44;border-radius:4px;padding:2px 6px;letter-spacing:1px;text-transform:uppercase'>AI Visibility</span></div><h1>Raport Widoczno&#347;ci AI</h1><p class='meta'>Klient: <strong>"+(brand.name||"—")+"</strong>"+(brand.url?" &middot; <strong>"+brand.url+"</strong>":"")+(" &middot; "+date)+"</p></div>"
    +"<div class='kpi-grid'>"
    +"<div class='kpi' style='border-top-color:#2edf8f'><div class='kl'>AI Share of Voice</div><div class='kv' style='color:#2edf8f'>"+sov+"%</div><div class='ks'>"+(sov>=30?"Silna pozycja":sov>=10?"Umiarkowana":"Niska")+"</div><div class='ke'>"+fN(totalM)+" wzm. ÷ "+fN(totalM+(totalCompM||0))+" = "+sov+"%</div></div>"
    +"<div class='kpi' style='border-top-color:#a78bfa'><div class='kl'>Mention Rate</div><div class='kv' style='color:#a78bfa'>"+fP(totalM,totalWB)+"</div><div class='ks'>"+(totalM>=5?"Cz&#281;sto":totalM>=1?"Sporadycznie":"Brak")+"</div><div class='ke'>"+fN(totalM)+" wzm. ÷ "+fN(totalWB)+" zapyta&#324; z mark&#261;</div></div>"
    +"<div class='kpi' style='border-top-color:#ff5c6a'><div class='kl'>Citation Rate</div><div class='kv' style='color:#ff5c6a'>"+fP(totalC,totalQ)+"</div><div class='ks'>"+(totalC>=5?"Cz&#281;sto cytowana":totalC>=1?"Sporadycznie":"Rzadko")+"</div><div class='ke'>"+fN(totalC)+" cyt. ÷ "+fN(totalQ)+" zapyta&#324;</div></div>"
    +"<div class='kpi' style='border-top-color:#f5c842'><div class='kl'>&#322;&#261;czne zapytania</div><div class='kv' style='color:#f5c842'>"+fN(totalQ)+"</div><div class='ks'>"+PLATFORMS.filter(function(p){return proc[p.id].total>0;}).length+" platform</div><div class='ke'>Z jak&#261;kolwiek mark&#261;: "+fN(totalWB)+"</div></div>"
    +"</div>"
    +"<section><h2><span class='num'>01</span> AI Share of Voice &mdash; per platforma</h2><table><thead><tr><th>Platforma</th><th>Zapyta&#324;</th><th>Z mark&#261;</th><th>Wzmianki</th><th>Cytowania</th><th>SOV %</th><th>Mention Rate</th><th>Citation Rate</th></tr></thead><tbody>"+platformRows+"</tbody></table></section>"
    +compHtml
    +"<section><h2><span class='num'>03</span> Zapytania</h2><div class='kw-grid'><div><h3 style='font-size:12px;font-weight:700;color:#1db872;margin-bottom:8px'>&#127919; Z wzmianką marki ("+topBrandKws.length+")</h3>"+bHtml+"</div><div><h3 style='font-size:12px;font-weight:700;color:#e03050;margin-bottom:8px'>&#9888; Luki — marka nieobecna ("+topGapKws.length+")</h3>"+gHtml+"</div></div></section>"
    +"<section><h2><span class='num'>04</span> Komentarz analityczny i rekomendacje</h2><div class='comment-box'>"+commentHtml+"</div></section>"
    +"<div class='footer'><div><strong style='color:#07111f'>sempai &middot; Let us perform!</strong><div style='margin-top:2px'>sempai.pl</div></div><div>Wygenerowano: "+date+"</div></div>"
    +"</div></body></html>";
}
