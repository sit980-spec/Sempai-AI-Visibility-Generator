import AdvancedMetrics from './AdvancedMetrics';
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
  // ── Sklepy internetowe ──────────────────────────────────────────────────
  ecom_sport:{ label:"Sklep — Sport / Outdoor", icon:"🏕️", cluster:"Sklep", types:[
    {id:"outdoor",     label:"Outdoor / Camping / Turystyka"},
    {id:"knives",      label:"Noże / EDC / Survival"},
    {id:"military",    label:"Militaria / Taktyczne / Airsoft"},
    {id:"sport",       label:"Sport / Fitness / Siłownia"},
    {id:"cycling",     label:"Rowery / Akcesoria rowerowe"},
    {id:"fishing",     label:"Wędkarstwo / Myślistwo"},
  ]},
  ecom_dom:{ label:"Sklep — Dom / Ogród", icon:"🏡", cluster:"Sklep", types:[
    {id:"furniture",   label:"Meble / Wyposażenie wnętrz"},
    {id:"garden",      label:"Meble ogrodowe / Akcesoria ogrodowe"},
    {id:"decor",       label:"Dekoracje / Oświetlenie / Dywany"},
    {id:"kitchen",     label:"AGD / Sprzęt kuchenny"},
    {id:"tools",       label:"Narzędzia / Elektronarzędzia / DIY"},
    {id:"bath",        label:"Łazienka / Sanitariaty"},
  ]},
  ecom_fashion:{ label:"Sklep — Moda / Uroda", icon:"👗", cluster:"Sklep", types:[
    {id:"fashion",     label:"Odzież / Obuwie / Torebki"},
    {id:"jewel",       label:"Biżuteria / Zegarki / Akcesoria"},
    {id:"beauty",      label:"Kosmetyki / Perfumy / Pielęgnacja"},
    {id:"kids_fashion",label:"Odzież i akcesoria dla dzieci"},
  ]},
  ecom_tech:{ label:"Sklep — Elektronika / Tech", icon:"💻", cluster:"Sklep", types:[
    {id:"electronics", label:"Elektronika użytkowa / RTV"},
    {id:"computers",   label:"Komputery / Komponenty / Gry"},
    {id:"phones",      label:"Telefony / Smartfony / Akcesoria"},
    {id:"photo",       label:"Foto / Video / Drony"},
  ]},
  ecom_health:{ label:"Sklep — Zdrowie / Żywność", icon:"🥗", cluster:"Sklep", types:[
    {id:"food",        label:"Żywność / Artykuły spożywcze"},
    {id:"supplements", label:"Suplementy diety / Odżywki"},
    {id:"pharmacy",    label:"Apteka / Zdrowie / Medycyna"},
    {id:"pets",        label:"Zoologia / Karma / Akcesoria dla zwierząt"},
  ]},
  ecom_other:{ label:"Sklep — Inne", icon:"🛒", cluster:"Sklep", types:[
    {id:"books",       label:"Książki / Muzyka / Filmy"},
    {id:"toys",        label:"Zabawki / Gry planszowe"},
    {id:"auto",        label:"Motoryzacja / Części samochodowe"},
    {id:"baby",        label:"Artykuły dla niemowląt i dzieci"},
    {id:"wedding",     label:"Ślub / Uroczystości"},
    {id:"other_shop",  label:"Inny sklep internetowy"},
  ]},
  // ── Hurtownie / B2B ─────────────────────────────────────────────────────
  wholesale:{ label:"Hurtownia / B2B", icon:"🏭", cluster:"Hurtownia B2B", types:[
    {id:"wh_food",     label:"Hurtownia spożywcza / FMCG"},
    {id:"wh_tools",    label:"Hurtownia narzędzi / materiałów budowlanych"},
    {id:"wh_pharma",   label:"Hurt farmaceutyczny / medyczny"},
    {id:"wh_fashion",  label:"Hurtownia odzieżowa / tekstyliów"},
    {id:"wh_tech",     label:"Dystrybutor elektroniki / IT"},
    {id:"wh_other",    label:"Inna hurtownia B2B"},
  ]},
  // ── Producenci / Marki własne ────────────────────────────────────────────
  brand:{ label:"Producent / Marka własna", icon:"🏷️", cluster:"Producent", types:[
    {id:"brand_food",  label:"Producent żywności / napojów"},
    {id:"brand_cosm",  label:"Producent kosmetyków / suplementów"},
    {id:"brand_tech",  label:"Producent sprzętu / elektroniki"},
    {id:"brand_furn",  label:"Producent mebli / wyposażenia"},
    {id:"brand_other", label:"Inna marka własna / producent"},
  ]},
  // ── Serwisy i portale ────────────────────────────────────────────────────
  blog:{ label:"Blog / Portal informacyjny", icon:"📝", cluster:"Portal", types:[
    {id:"blog_tech",   label:"Portal technologiczny / IT"},
    {id:"blog_lifestyle",label:"Blog lifestyle / podróże / kulinaria"},
    {id:"blog_news",   label:"Portal newsowy / tematyczny"},
    {id:"blog_niche",  label:"Blog / portal niszowy branżowy"},
    {id:"blog_review", label:"Portal recenzji / porównań produktów"},
  ]},
  // ── Usługi i SaaS ────────────────────────────────────────────────────────
  service:{ label:"Usługi / SaaS / Lokalne", icon:"⚙️", cluster:"Usługi", types:[
    {id:"agency",      label:"Agencja (marketing, SEO, IT, PR)"},
    {id:"saas",        label:"Oprogramowanie / SaaS / Aplikacja"},
    {id:"finance",     label:"Finanse / Ubezpieczenia / Doradztwo"},
    {id:"legal",       label:"Kancelaria / Usługi prawne"},
    {id:"realestate",  label:"Nieruchomości / Deweloper"},
    {id:"local",       label:"Usługi lokalne (restauracja, salon, gabinet)"},
    {id:"edu",         label:"Edukacja / Kursy / Szkolenia"},
    {id:"travel",      label:"Turystyka / Biuro podróży / Hotele"},
    {id:"medical",     label:"Klinika / Przychodnia / Zdrowie"},
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
// Słowa WYKLUCZAJĄCE dane zapytanie z analizy luk dla danej branży
// Jeśli zapytanie zawiera którekolwiek z tych słów → odrzucamy jako nieistotne
const INDUSTRY_FILTERS = {
  // Sport / Outdoor / Militaria / Noże
  outdoor:   ["ekspres","kawa","herbata","mebel","sofa","łóżko","szafa","tapeta","biżuteria","szminka","odzież damska","uroda","kredyt","ubezpieczenie"],
  knives:    ["ekspres","kawa","herbata","czapka","buty","odzież","mebel","ogród","sofa","kredyt","leasing","makijaż","uroda"],
  military:  ["ekspres","kawa","herbata","czapka z daszkiem","buty","odzież","mebel","ogród","sofa","kredyt","makijaż"],
  sport:     ["mebel","sofa","biżuteria","kosmetyki","kredyt","leasing","herbata","kawa"],
  cycling:   ["mebel","sofa","biżuteria","kosmetyki","kredyt","broń","militari"],
  fishing:   ["mebel","sofa","biżuteria","kosmetyki","kredyt","ekspres","kawa"],
  // Dom / Ogród / Meble
  furniture: ["nóż","noże","broń","militari","airsof","ekspres","kawa","sport","fitness","rower"],
  garden:    ["nóż","noże","broń","militari","airsof","ekspres","kawa","laptop","telefon","komputer"],
  decor:     ["nóż","noże","broń","militari","sport","fitness","ekspres","kawa","rower"],
  kitchen:   ["nóż","noże","broń","militari","sport","fitness","rower","biżuteria"],
  tools:     ["ekspres","kawa","nóż","broń","militari","moda","biżuteria","kosmetyki","dieta"],
  bath:      ["nóż","broń","militari","sport","fitness","rower","ekspres"],
  // Moda / Uroda
  fashion:   ["nóż","broń","militari","airsof","wiertarka","silnik","mebel","ogród","ekspres"],
  jewel:     ["nóż","broń","militari","sport","fitness","wiertarka","ogród","ekspres"],
  beauty:    ["nóż","broń","militari","sport","wiertarka","ogród","mebel"],
  kids_fashion:["nóż","broń","militari","airsof","sport ekstremalny","wiertarka"],
  // Elektronika
  electronics:["nóż","broń","militari","airsof","ogród","mebel","biżuteria","dieta"],
  computers: ["nóż","broń","militari","airsof","ogród","mebel","biżuteria","dieta"],
  phones:    ["nóż","broń","militari","airsof","ogród","mebel","biżuteria","dieta"],
  photo:     ["nóż","broń","militari","airsof","ogród","mebel","dieta"],
  // Zdrowie / Żywność
  food:      ["nóż","broń","militari","airsof","elektronika","laptop","mebel","rower"],
  supplements:["nóż","broń","militari","airsof","elektronika","laptop","mebel"],
  pharmacy:  ["nóż","broń","militari","airsof","sport ekstremalny","elektronika"],
  pets:      ["nóż","broń","militari","airsof","elektronika","laptop","mebel","odzież"],
  // Inne sklepy
  books:     ["nóż","broń","militari","airsof","elektronika","mebel","kosmetyki"],
  toys:      ["nóż","broń","militari","airsof","elektronika","kosmetyki","alkohol"],
  auto:      ["mebel","sofa","biżuteria","kosmetyki","dieta","ogród"],
  baby:      ["nóż","broń","militari","airsof","alkohol","sport ekstremalny"],
  // Hurtownie
  wh_food:   ["nóż","broń","militari","elektronika","mebel","moda"],
  wh_tools:  ["kawa","herbata","dieta","moda","biżuteria","kosmetyki"],
  wh_pharma: ["nóż","broń","militari","elektronika","moda","sport"],
  wh_fashion:["nóż","broń","militari","elektronika","narzędzia","chemia"],
  wh_tech:   ["nóż","broń","militari","ogród","mebel","dieta"],
  wh_other:  [],
  // Producenci
  brand_food:["nóż","broń","militari","elektronika","mebel"],
  brand_cosm:["nóż","broń","militari","elektronika","narzędzia"],
  brand_tech:["nóż","broń","militari","ogród","mebel","dieta"],
  brand_furn:["nóż","broń","militari","elektronika","dieta","sport"],
  brand_other:[],
  // Portale
  blog_tech: ["mebel","ogród","biżuteria","dieta","odzież"],
  blog_lifestyle:[],
  blog_news: [],
  blog_niche:[],
  blog_review:[],
  // Usługi
  agency:    ["nóż","broń","militari","mebel","ogród","dieta"],
  saas:      ["nóż","broń","militari","mebel","ogród","dieta"],
  finance:   ["nóż","broń","militari","mebel","ogród","dieta"],
  legal:     ["nóż","broń","militari","mebel","ogród","dieta"],
  realestate:["nóż","broń","militari","elektronika","dieta"],
  local:     [],
  edu:       ["nóż","broń","militari","elektronika"],
  travel:    ["nóż","broń","militari","elektronika","mebel"],
  medical:   ["nóż","broń","militari","elektronika","mebel"],
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
  // Response text column (AI Overview or Response)
  const respIdx = headers.findIndex(h=>h==="AI Overview"||h==="Response");

  if (mentionsIdx < 0) return { error:"Brak kolumny Mentions. Nagłówki: "+headers.join(", "), headers, platformId };
  const bv = (brandVariants||[]).map(v=>v.toLowerCase().trim()).filter(Boolean);
  const data = rows.slice(1);
  const domainKey = bv[0] || "";

  let mentions=0, citations=0, withAnyBrand=0;
  // Metric 1: Sentiment counters
  let sentPos=0, sentNeg=0, sentNeu=0;
  // Metric 2: Share of Recommendations
  let recTotal=0, recWithBrand=0;
  // Metric 3: Control Ratio — own vs external citations
  let ownedLinks=0, totalLinks=0;
  const compSet={}, variantHits={};
  const topBrand=[], topGap=[];

  // Sentiment keyword lists (Polish)
  const negWords = ["gorszy","gorsza","gorsze","słabszy","słabsza","problemy z","wada","wadą","nie polecam","ostrożnie","unikaj","drogi","drogie","wolno","awaria","reklamacja","negatywna","niskiej jakości","przestarzały"];
  const posWords = ["polecam","polecamy","najlepszy","najlepsza","świetny","świetna","doskonały","doskonała","warto","top","lider","wysoka jakość","renomowany","zaufany","sprawdzony","numer jeden","ekspert","rekomendujemy","rekomendowany"];
  // Recommendation intent keywords
  const recWords = ["polecasz","polecacie","polecić","polecić","najlepsz","najlepiej","który warto","która warto","co warto","jaki polecasz","jakie polecasz","top","ranking","czy warto"];

  data.forEach(r=>{
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

    const matched = bv.find(v=>v&&mentLow.split(/[\n,]+/).some(m=>m.trim()===v||m.trim().includes(v)))||null;
    const mentioned = !!matched;
    const cited = bv.some(v=>v&&linkLow.includes(v));
    if (mentioned) { mentions++; if (matched) variantHits[matched]=(variantHits[matched]||0)+1; }
    if (cited) citations++;

    // ── Metric 1: Sentiment — analyze response context around brand mention ──
    if (mentioned && respRaw) {
      // Find brand context window (200 chars around mention)
      const bIdx = bv.reduce((fi, v) => { const pos = respRaw.indexOf(v); return pos >= 0 && (fi < 0 || pos < fi) ? pos : fi; }, -1);
      const ctx = bIdx >= 0 ? respRaw.slice(Math.max(0, bIdx-150), bIdx+150) : respRaw.slice(0, 300);
      const hasPos = posWords.some(w => ctx.includes(w));
      const hasNeg = negWords.some(w => ctx.includes(w));
      if (hasNeg && !hasPos) sentNeg++;
      else if (hasPos) sentPos++;
      else sentNeu++;
    }

    // ── Metric 2: Recommendations — query intent detection ──────────────────
    const isRecQuery = recWords.some(w => kwLow.includes(w));
    if (isRecQuery) {
      recTotal++;
      if (mentioned) recWithBrand++;
    }

    // ── Metric 3: Control Ratio — own vs external links ─────────────────────
    if (linkRaw.trim()) {
      linkRaw.split("\n").forEach(rawLink => {
        const l = rawLink.trim();
        if (!l) return;
        totalLinks++;
        if (domainKey && l.toLowerCase().includes(domainKey)) ownedLinks++;
      });
    }

    const comps = mentRaw.split(/[\n,]+/).map(m=>m.trim().toLowerCase()).filter(m=>m&&m.length>1&&!bv.some(v=>m===v||m.includes(v)));
    comps.forEach(c=>{ compSet[c]=(compSet[c]||0)+1; });
    if (mentioned) topBrand.push({kw,vol});
    else if (comps.length>0) {
      // Only include in gap if keyword itself is not a brand query
      const kwLow2 = kw.toLowerCase();
      const isBrandedKw = bv.some(v=>v&&kwLow2.includes(v));
      if (!isBrandedKw) topGap.push({kw,vol,comps:comps.slice(0,3)});
    }
  });

  topBrand.sort((a,b)=>b.vol-a.vol);
  topGap.sort((a,b)=>b.vol-a.vol);

  const impressions = topBrand.reduce((s, r) => s + (r.vol || 0), 0);
  const gapQueries = topGap.length;

  // Sentiment Score: (pos - neg) / total_with_sentiment
  const sentTotal = sentPos + sentNeg + sentNeu;
  const sentScore = sentTotal > 0 ? Math.round(((sentPos - sentNeg) / sentTotal) * 100) : null;

  // Share of Recommendations
  const recRate = recTotal > 0 ? Math.round((recWithBrand / recTotal) * 100) : null;

  // Control Ratio
  const controlRatio = totalLinks > 0 ? Math.round((ownedLinks / totalLinks) * 100) : null;

  return {
    platformId, headers,
    total: data.filter(r=>kwIdx>=0&&r[kwIdx]).length,
    mentions, citations, withAnyBrand, impressions, gapQueries,
    // Advanced metrics
    sentPos, sentNeg, sentNeu, sentScore,
    recTotal, recWithBrand, recRate,
    ownedLinks, totalLinks, controlRatio,
    compSet, variantHits,
    topBrand: topBrand.slice(0,12),
    topGap: topGap.slice(0,12),
    error: null
  };
}

function fmtN(n) { return (n||0).toLocaleString("pl-PL"); }
function fmtP(num,den) { if(!den)return"0%"; const v=(num/den)*100; if(v===0)return"0%"; if(v<0.1)return"<0.1%"; if(v<1)return v.toFixed(1)+"%"; return Math.round(v)+"%"; }
function calcSOV(brandM, compSet) { const ct=Object.values(compSet||{}).reduce((s,v)=>s+v,0); return brandM+ct>0?Math.round((brandM/(brandM+ct))*100):0; }

const Tip=({active,payload,label})=>{ if(!active||!(payload&&payload.length))return null; return <div style={{background:S.navy3,border:"1px solid "+S.border,borderRadius:8,padding:"9px 13px"}}><div style={{fontSize:10,color:S.muted,marginBottom:4}}>{label}</div>{payload.map((p,i)=><div key={i} style={{fontSize:12,color:p.color,fontWeight:700}}>{p.name}: {p.value}</div>)}</div>; };
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
    intro: null, sov: null, mentions: null, competitors: null
  });
  const updateSection = (key, val) => setReportSections(s=>({...s,[key]:val}));
  // Recommendations: array of {id, text, note, subs:[{id,text}]}
  const [recs,setRecs]=useState([]);
  const addRec = () => setRecs(r=>[...r,{id:Date.now(),text:"",note:"",subs:[]}]);
  const updateRec = (id,field,val) => setRecs(r=>r.map(x=>x.id===id?{...x,[field]:val}:x));
  const removeRec = (id) => setRecs(r=>r.filter(x=>x.id!==id));
  const addSub = (recId) => setRecs(r=>r.map(x=>x.id===recId?{...x,subs:[...x.subs,{id:Date.now(),text:""}]}:x));
  const updateSub = (recId,subId,val) => setRecs(r=>r.map(x=>x.id===recId?{...x,subs:x.subs.map(s=>s.id===subId?{...s,text:val}:s)}:x));
  const removeSub = (recId,subId) => setRecs(r=>r.map(x=>x.id===recId?{...x,subs:x.subs.filter(s=>s.id!==subId)}:x));
  const [promptCopied,setPromptCopied]=useState(false);
  const [kwTab,setKwTab]=useState("brand"); // "brand" | "gap"
  const [kwSearch,setKwSearch]=useState("");
  const [kwPage,setKwPage]=useState(0);

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
        } else if(r.platformId==="ai_overview") {
          // ZAWSZE pytaj użytkownika: AI Overview czy AI Mode?
          // Ahrefs eksportuje oba z identycznym nagłówkiem "AI Overview"
          setUnknownFiles(u=>[...u.filter(x=>x.filename!==filename),{
            filename, headers:r.headers||[],
            error:null,
            conflict:true,
            alwaysAsk:true,
            rows:r.total,
            conflictNote:"Ten plik ma nagłówek AI Overview — ale Ahrefs używa DOKŁADNIE TEGO SAMEGO formatu dla AI Mode. Nie da się tego automatycznie rozróżnić. Wybierz właściwą platformę:"
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
  PLATFORMS.forEach(p=>{proc[p.id]=files[p.id]||{total:0,mentions:0,citations:0,withAnyBrand:0,impressions:0,gapQueries:0,sentPos:0,sentNeg:0,sentNeu:0,sentScore:null,recTotal:0,recWithBrand:0,recRate:null,ownedLinks:0,totalLinks:0,controlRatio:null,compSet:{},variantHits:{},topBrand:[],topGap:[]};});
  const totalQ=PLATFORMS.reduce((s,p)=>s+(proc[p.id].total||0),0);
  const totalM=PLATFORMS.reduce((s,p)=>s+(proc[p.id].mentions||0),0);
  const totalC=PLATFORMS.reduce((s,p)=>s+(proc[p.id].citations||0),0);
  const totalWB=PLATFORMS.reduce((s,p)=>s+(proc[p.id].withAnyBrand||0),0);
  // AI Impressions: suma wolumenów zapytań gdzie marka się pojawia
  const totalImpressions=PLATFORMS.reduce((s,p)=>s+(proc[p.id].impressions||0),0);
  // AI Visibility Gap: liczba zapytań gdzie konkurent jest, a marki nie ma
  const totalGapQueries=PLATFORMS.reduce((s,p)=>s+(proc[p.id].gapQueries||0),0);

  // ── Advanced metrics aggregation ─────────────────────────────────────────
  // Metric 1: Sentiment — weighted average across platforms with data
  const sentData = PLATFORMS.map(p=>proc[p.id]).filter(d=>d.total>0&&d.sentScore!==null);
  const globalSentScore = sentData.length > 0
    ? Math.round(sentData.reduce((s,d)=>s+(d.sentScore||0),0)/sentData.length)
    : null;
  const totalSentPos = PLATFORMS.reduce((s,p)=>s+(proc[p.id].sentPos||0),0);
  const totalSentNeg = PLATFORMS.reduce((s,p)=>s+(proc[p.id].sentNeg||0),0);
  const totalSentNeu = PLATFORMS.reduce((s,p)=>s+(proc[p.id].sentNeu||0),0);

  // Metric 2: Share of Recommendations
  const totalRecTotal = PLATFORMS.reduce((s,p)=>s+(proc[p.id].recTotal||0),0);
  const totalRecWithBrand = PLATFORMS.reduce((s,p)=>s+(proc[p.id].recWithBrand||0),0);
  const globalRecRate = totalRecTotal > 0 ? Math.round((totalRecWithBrand/totalRecTotal)*100) : null;

  // Metric 3: Control Ratio — what % of AI citations come from owned media
  const totalOwnedLinks = PLATFORMS.reduce((s,p)=>s+(proc[p.id].ownedLinks||0),0);
  const totalAllLinks = PLATFORMS.reduce((s,p)=>s+(proc[p.id].totalLinks||0),0);
  const globalControlRatio = totalAllLinks > 0 ? Math.round((totalOwnedLinks/totalAllLinks)*100) : null;

  const compCounts={};
  PLATFORMS.forEach(p=>{Object.entries(proc[p.id].compSet||{}).forEach(([n,cnt])=>{compCounts[n]=(compCounts[n]||0)+cnt;});});
  const allComps=Object.entries(compCounts).sort((a,b)=>b[1]-a[1]).map(([n])=>n).filter(n=>n&&n.length>1);
  // Ahrefs SOV: brand / (brand + top-5 competitors) — ograniczamy do kluczowych rywali
  const top5Comps=allComps.slice(0,5);
  const top5CompM=top5Comps.reduce((s,c)=>s+(compCounts[c]||0),0);
  const totalCompM=allComps.reduce((s,c)=>s+(compCounts[c]||0),0);
  // calcSOV używa compSet konkretnej platformy — zachowujemy spójność
  const avgSOV=(()=>{const active=PLATFORMS.filter(p=>proc[p.id].total>0);if(!active.length)return 0;const vals=active.map(p=>calcSOV(proc[p.id].mentions,proc[p.id].compSet));return Math.round(vals.reduce((s,v)=>s+v,0)/active.length);})();
  // Global SOV vs top-5 (Ahrefs-style, bardziej precyzyjny)
  const globalSOV=totalM+top5CompM>0?Math.round((totalM/(totalM+top5CompM))*100):0;
  const sovData=PLATFORMS.map(p=>{const d=proc[p.id];return{platform:p.name,color:p.color,sov:calcSOV(d.mentions,d.compSet),mentions:d.mentions,citations:d.citations,total:d.total};});
  const ranked=[...sovData.filter(d=>d.total>0)].sort((a,b)=>b.sov-a.sov);
  const best=ranked[0],worst=ranked[ranked.length-1];
  const kwBrand={},kwGap={};
  PLATFORMS.forEach(p=>{(proc[p.id].topBrand||[]).forEach(({kw,vol})=>{if(!kwBrand[kw]||kwBrand[kw]<vol)kwBrand[kw]=vol;});(proc[p.id].topGap||[]).forEach(({kw,vol,comps})=>{if(!kwGap[kw])kwGap[kw]={vol,comps};});});
  const topBrandKws=Object.entries(kwBrand).sort((a,b)=>b[1]-a[1]).slice(0,10);
  // Gap keywords: filter by industry relevance AND exclude keywords that contain
  // the brand name itself (not a real gap if the query is branded)
  const brandKeyLow = allVariants.map(v=>v.toLowerCase());
  // Also expand topBrandKws to full list for browser view
  const allBrandKws=Object.entries(kwBrand).sort((a,b)=>b[1]-a[1]);
  const allGapKws=Object.entries(kwGap)
    .filter(([kw])=>{
      const kwL = kw.toLowerCase();
      if (brandKeyLow.some(v=>v&&kwL.includes(v))) return false;
      if (!isTopicRelevant(kwL, brand.industryType)) return false;
      return true;
    })
    // Clean: remove brand from comps list in each gap entry
    .map(([kw,d])=>([kw,{vol:d.vol,comps:d.comps.filter(c=>!brandKeyLow.some(v=>v&&c.includes(v)))}]))
    .filter(([,d])=>d.comps.length>0)
    .sort((a,b)=>b[1].vol-a[1].vol);
  const topGapKws = allGapKws.slice(0,12);
  const industryHints=TOPIC_HINTS[brand.industryType]||TOPIC_HINTS.default;
  const filesLoaded=Object.keys(files).length;

  const buildArgs=()=>({brand,proc,totalQ,totalM,totalC,totalWB,sovDisplay:globalSOV,avgSOV,globalSOV,allComps,compCounts,best,worst,topBrandKws,topGapKws,allGapKws,editableComment,totalCompM,top5CompM,totalImpressions,totalGapQueries,finalComment:null});



  // Pre-compute insight cards for Spostrzeżenia section
  const insightRatio = totalM > 0 ? totalC / totalM : null;
  const insightCard1 = totalQ === 0 ? null
    : totalM===0&&totalC===0
    ? <div style={{padding:"10px 13px",background:S.muted+"08",border:"1px solid "+S.border,borderRadius:9}}><div style={{fontSize:11,color:S.muted}}>○ Brak obecności — marka niewidoczna dla AI.</div></div>
    : totalM===0&&totalC>0
    ? <div style={{padding:"10px 13px",background:S.gold+"08",border:"1px solid "+S.gold+"22",borderRadius:9}}><div style={{fontSize:11,color:S.muted,lineHeight:1.55}}>! <strong style={{color:S.gold}}>Cytowana bez nazwy</strong> ({fmtN(totalC)} cyt, 0 wzm) — entity building priorytet.</div></div>
    : (insightRatio!==null&&insightRatio>8)
    ? <div style={{padding:"10px 13px",background:S.coral+"08",border:"1px solid "+S.coral+"22",borderRadius:9}}><div style={{fontSize:11,color:S.muted,lineHeight:1.55}}>! <strong style={{color:S.coral}}>Dysproporcja</strong> {fmtN(totalC)} cyt vs {fmtN(totalM)} wzm — anchor texty.</div></div>
    : (totalM>=5&&totalC>0&&insightRatio<0.15)
    ? <div style={{padding:"10px 13px",background:S.purple+"08",border:"1px solid "+S.purple+"22",borderRadius:9}}><div style={{fontSize:11,color:S.muted,lineHeight:1.55}}>! <strong style={{color:S.purple}}>Wzmianki bez cytowań</strong> — structured data.</div></div>
    : <div style={{padding:"10px 13px",background:S.green+"08",border:"1px solid "+S.green+"22",borderRadius:9}}><div style={{fontSize:11,color:S.muted,lineHeight:1.55}}>✓ <strong style={{color:S.green}}>Obecność potwierdzona:</strong> {fmtN(totalM)} wzm + {fmtN(totalC)} cyt.</div></div>;

  const insightCard2 = allComps.length === 0 ? null
    : (compCounts[allComps[0]]||0)>totalM*2
    ? <div style={{padding:"10px 13px",background:S.coral+"08",border:"1px solid "+S.coral+"22",borderRadius:9}}><div style={{fontSize:11,color:S.muted,lineHeight:1.55}}>⚔️ <strong style={{color:S.coral}}>{allComps[0]} dominuje</strong>: {fmtN(compCounts[allComps[0]]||0)} vs {fmtN(totalM)}.</div></div>
    : (compCounts[allComps[0]]||0)>totalM
    ? <div style={{padding:"10px 13px",background:S.gold+"08",border:"1px solid "+S.gold+"22",borderRadius:9}}><div style={{fontSize:11,color:S.muted,lineHeight:1.55}}>⚔️ <strong style={{color:S.gold}}>{allComps[0]} nieznacznie wyprzedza</strong> ({fmtN(compCounts[allComps[0]]||0)} vs {fmtN(totalM)}).</div></div>
    : <div style={{padding:"10px 13px",background:S.green+"08",border:"1px solid "+S.green+"22",borderRadius:9}}><div style={{fontSize:11,color:S.muted,lineHeight:1.55}}>⚔️ <strong style={{color:S.green}}>Marka wyprzedza {allComps[0]}</strong> ({fmtN(compCounts[allComps[0]]||0)} vs {fmtN(totalM)}).</div></div>;
  // Pre-compute keyword browser data
  const kwBrowserData=(()=>{
    const PAGE=25;
    const list = kwTab==="brand"
      ? allBrandKws.filter(([kw])=>!kwSearch||kw.toLowerCase().includes(kwSearch.toLowerCase()))
      : allGapKws.filter(([kw])=>!kwSearch||kw.toLowerCase().includes(kwSearch.toLowerCase()));
    const page = list.slice(kwPage*PAGE, (kwPage+1)*PAGE);
    const totalPages = Math.ceil(list.length/PAGE);
    const isBrand = kwTab==="brand";
    return {list, page, totalPages, isBrand, PAGE};
  })();
  // Pre-compute opportunity cards (moved out of JSX IIFE to avoid esbuild context issues)
  const oppCards=(()=>{
    const ops=[];
    const z=PLATFORMS.filter(p=>proc[p.id].total>0&&proc[p.id].mentions===0);
    if(z.length>0)ops.push({icon:"🎯",tag:"QUICK WIN",color:S.green,title:"Nieobecne platformy",body:z.map(p=>p.name).join(", ")+" — wgraj dane i stwórz content odpowiadający na pytania tej platformy."});
    if(totalC>0&&totalM===0)ops.push({icon:"🔗",tag:"QUICK WIN",color:S.sky,title:"Cytowana bez nazwy",body:"Strona linkowana "+fmtN(totalC)+" razy bez wzmianki marki — entity building (Wikipedia, Wikidata, About Us)."});
    if(totalM>0&&totalC>totalM*5)ops.push({icon:"📎",tag:"QUICK WIN",color:S.purple,title:"Dysproporcja wzmianek/cytowań",body:"Anchor texty z nazwą marki i breadcrumbs z marką w tytule."});
    const tc=allComps[0];if(tc&&compCounts[tc]>totalM*1.5)ops.push({icon:"⚔️",tag:"PRIORYTET",color:S.coral,title:tc+" dominuje",body:"Przeanalizuj content "+tc+" i stwórz odpowiedzi na te same zapytania."});
    const ls=PLATFORMS.filter(p=>proc[p.id].mentions>0&&calcSOV(proc[p.id].mentions,proc[p.id].compSet)<15);
    if(ls.length>0)ops.push({icon:"📈",tag:"SZANSA",color:S.sky,title:"SOV < 15% na platformach",body:ls.map(p=>p.name).join(", ")+" — content plan pod te platformy."});
    ops.push({icon:"🔄",tag:"ZAWSZE",color:S.gold,title:"Content freshness",body:"Modele AI preferują aktualne treści. Odśwież kluczowe strony co 3-6 miesięcy."});
    return ops.slice(0,6);
  })();

  const TABS=[{id:"guide",label:"⓪ Jak używać"},{id:"setup",label:"① Klient"},{id:"import",label:"② Import CSV"},{id:"dashboard",label:"③ Dashboard"},{id:"report",label:"④ Raport"},{id:"prompt",label:"⑤ Prompt AI"}];

  return (
    <div style={{minHeight:"100vh",background:S.navy1,color:S.text,fontFamily:"DM Sans,Segoe UI,sans-serif"}}>
      <div style={{background:S.navy2,borderBottom:"1px solid "+S.border,position:"relative",overflow:"hidden",minHeight:108}}>
        <ParticleBg/>
        <div style={{position:"relative",maxWidth:1060,margin:"0 auto",padding:"20px 28px 0"}}>
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <img src="https://sempai.pl/wp-content/uploads/2023/01/Sempai_logo_granat.svg"
                alt="Sempai" style={{height:36,width:"auto",display:"block",filter:"brightness(0) invert(1)"}}
                onError={e=>{e.target.style.display="none";}}/>
              <span style={{fontSize:10,fontWeight:700,color:S.green,background:S.green+"18",border:"1px solid "+S.green+"44",borderRadius:5,padding:"2px 8px",letterSpacing:"1px",textTransform:"uppercase"}}>AI Visibility</span>
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
                {icon:"💬",title:"Wzmianki (Mentions)",color:S.green,def:"AI napisał: '...polecamy Ostry Sklep...' — to jest wzmianka. Marka wymieniona wprost z nazwy w odpowiedzi AI."},
                {icon:"🔗",title:"Cytowania (Citations)",color:S.sky,def:"AI dodał link do Twojej strony jako źródło. Możesz być cytowany bez wymienienia nazwy — to 'anonimowy ekspert'."},
                {icon:"📊",title:"AI Share of Voice (SOV)",color:S.purple,def:"Twoje wzmianki ÷ (Twoje + wzmianki WSZYSTKICH konkurentów) × 100. Twój 'kawałek tortu' wśród marek w AI."},
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
          <div style={{fontSize:13,fontWeight:800,color:S.text,marginBottom:14}}>Jak pobrać dane — 5 kroków</div>

          <InfoBox n="1" color={S.sky} title="Ahrefs → Brand Radar → wpisz markę i dodaj konkurentów">
            Wejdź w <strong style={{color:S.text}}>Brand Radar</strong> w lewym menu Ahrefs. Wpisz nazwę marki klienta i dodaj konkurentów których chcesz śledzić. To jest punkt startowy całej analizy.
            <div style={{marginTop:8,padding:"6px 10px",background:"#040d18",borderRadius:6,fontSize:11,color:"#6090a8"}}>
              Brand Radar śledzi widoczność marki i konkurencji w modelach AI na podstawie ich odpowiedzi na zapytania użytkowników.
            </div>
          </InfoBox>

          <InfoBox n="2" color={S.green} title="Przejdź do AI Responses i wybierz agenta AI">
            Wewnątrz Brand Radar kliknij zakładkę <strong style={{color:S.text}}>AI Responses</strong>. Następnie wybierz z filtra <strong style={{color:S.text}}>jednego agenta AI</strong> — np. ChatGPT, Gemini, Copilot, Perplexity.
            <div style={{display:"flex",gap:7,flexWrap:"wrap",marginTop:9,marginBottom:9}}>
              {PLATFORMS.map(p=><span key={p.id} style={{padding:"3px 11px",borderRadius:12,fontSize:11,fontWeight:700,background:p.color+"22",border:"1px solid "+p.color+"55",color:p.color}}>{p.icon} {p.name}</span>)}
            </div>
            <div style={{padding:"6px 10px",background:"#001008",borderRadius:6,fontSize:11,color:"#3a8050"}}>
              Każdego agenta eksportujesz osobno. Powtórz kroki 2-4 dla każdej platformy którą chcesz analizować.
            </div>
          </InfoBox>

          <InfoBox n="3" color={S.purple} title="Wybierz lokalizację — np. Poland">
            Ustaw filtr lokalizacji na <strong style={{color:S.text}}>Poland</strong> (lub inny kraj jeśli analizujesz rynek zagraniczny). Dane są segmentowane per kraj — wyniki dla PL i DE to osobne eksporty.
            <div style={{marginTop:8,padding:"6px 10px",background:"#0a0018",borderRadius:6,fontSize:11,color:"#7060a0"}}>
              Jeśli klient działa w kilku krajach — zrób osobny eksport dla każdego kraju i wgraj wszystkie pliki razem.
            </div>
          </InfoBox>

          <InfoBox n="4" color={S.coral} title="Kliknij Export — pobierz plik CSV">
            Kliknij przycisk <strong style={{color:"#ff8898"}}>Export</strong>. Plik CSV pobierze się automatycznie. Może być w formacie UTF-8 lub UTF-16 (z TAB zamiast przecinka) — narzędzie obsługuje oba automatycznie.
            <div style={{marginTop:8,padding:"6px 10px",background:"#1a0005",borderRadius:6,fontSize:11,color:"#f08090"}}>
              Uwaga: AI Overview i AI Mode mają w Ahrefs identyczny format pliku — po wgraniu zapytamy Cię który to jest.
            </div>
          </InfoBox>

          <InfoBox n="5" color={S.gold} title="Wgraj wszystkie pliki naraz w zakładce ② Import CSV">
            Zbierz pliki CSV (jeden per agent AI, ewentualnie per kraj). W zakładce <strong style={{color:S.text}}>② Import CSV</strong> wgraj je wszystkie jednocześnie — platforma wykrywana automatycznie z nazwy pliku i nagłówków.
            <div style={{marginTop:8,padding:"6px 10px",background:"#140d00",borderRadius:6,fontSize:11,color:"#c09030"}}>
              Nie musisz mieć wszystkich platform. Brakująca platforma = brak danych dla niej, reszta działa normalnie.
            </div>
          </InfoBox>

          {/* KLUCZOWE: Co analizuje nasze narzędzie */}
          <div style={{marginTop:22,background:"#0a0018",border:"2px solid #3a1060",borderRadius:14,padding:"20px 22px",marginBottom:4}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <span style={{fontSize:22}}>⚡</span>
              <div style={{fontSize:15,fontWeight:900,color:"#c0a0ff"}}>Skąd pochodzi ten eksport i co liczymy?</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
              <div style={{background:"#06001a",border:"1px solid #3a1060",borderRadius:10,padding:"14px 16px"}}>
                <div style={{fontSize:11,fontWeight:800,color:"#a78bfa",textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>📊 Brand Radar w Ahrefs</div>
                <div style={{fontSize:12,color:"#9080c0",lineHeight:1.9}}>
                  <div>Zakładka w Ahrefs — dodajesz markę i konkurentów których chcesz śledzić</div>
                  <div style={{marginTop:6}}>Wewnątrz Brand Radar jest sekcja <strong style={{color:"#c0a0ff"}}>AI Responses</strong> skąd pobierasz eksporty CSV</div>
                  <div style={{marginTop:8,padding:"6px 10px",background:"#030010",borderRadius:6,fontSize:11,color:"#5040a0"}}>Brand Radar → AI Responses → agent AI → lokalizacja → Export</div>
                </div>
              </div>
              <div style={{background:"#001a06",border:"1px solid #106030",borderRadius:10,padding:"14px 16px"}}>
                <div style={{fontSize:11,fontWeight:800,color:"#2edf8f",textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>📁 AI Responses — to wgrywasz tutaj</div>
                <div style={{fontSize:12,color:"#60b080",lineHeight:1.9}}>
                  <div>Sekcja wewnątrz Brand Radar — <strong style={{color:"#2edf8f"}}>Brand Radar → AI Responses</strong></div>
                  <div style={{marginTop:6}}>Wybierasz agenta AI (np. ChatGPT), lokalizację (np. Poland) i klikasz Export</div>
                  <div style={{marginTop:8,padding:"6px 10px",background:"#001008",borderRadius:6,fontSize:11,color:"#206040"}}>Każdy agent i kraj = osobny plik CSV. Wgraj je wszystkie razem.</div>
                </div>
              </div>
            </div>
            <div style={{padding:"12px 14px",background:"#080010",borderRadius:8,fontSize:12,color:"#8070b0",lineHeight:1.75}}>
              <strong style={{color:"#c0a0ff"}}>Dlaczego Brand Radar może pokazywać inny % niż nasze narzędzie?</strong> W Brand Radar widzisz SOV tylko dla wybranych przez Ciebie frazy monitorujących. Nasze narzędzie liczy po WSZYSTKICH zapytaniach z eksportu — im więcej plików i platform wgrasz, tym pełniejszy obraz. <strong style={{color:"#c0a0ff"}}>Oba wyniki są poprawne</strong> — Brand Radar to Twój wybrany zestaw fraz, nasze narzędzie to pełen eksport AI Responses.
            </div>
          </div>

          {/* SOV discrepancy explanation */}
          <div style={{marginTop:16,background:"#030c18",border:"1px solid #1a3a55",borderRadius:12,padding:"18px 20px",marginBottom:4}}>
            <div style={{fontSize:13,fontWeight:800,color:"#70c0e0",marginBottom:14}}>🔢 Dlaczego Twój SOV u nas różni się od Brand Radar — konkretne wyjaśnienie</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
              <div style={{background:"#040e1a",border:"1px solid #1a3a55",borderRadius:9,padding:"13px 14px"}}>
                <div style={{fontSize:10,fontWeight:800,color:"#a78bfa",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:8}}>Brand Radar — wąski mianownik</div>
                <div style={{fontSize:12,color:"#8060b0",lineHeight:1.8}}>
                  <div>SOV = Twoje wzm. / (Twoje + <strong style={{color:"#c0a0ff"}}>tylko konkurenci których DODAŁEŚ</strong>)</div>
                  <div style={{marginTop:6,color:"#5040a0",fontSize:11}}>Jeśli nie dodałeś Militaria.pl — Ahrefs jej nie liczy w mianowniku. Mianownik jest mały → SOV wyższy.</div>
                </div>
              </div>
              <div style={{background:"#040e1a",border:"1px solid #1a3a55",borderRadius:9,padding:"13px 14px"}}>
                <div style={{fontSize:10,fontWeight:800,color:S.green,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:8}}>Nasze narzędzie — szeroki mianownik</div>
                <div style={{fontSize:12,color:"#407050",lineHeight:1.8}}>
                  <div>SOV = Twoje wzm. / (Twoje + <strong style={{color:S.green}}>WSZYSCY których AI wymienił</strong> w danych)</div>
                  <div style={{marginTop:6,color:"#205030",fontSize:11}}>Automatycznie wyciągamy każdą markę z kolumny Mentions. Mianownik jest duży → SOV niższy, ale bardziej realistyczny.</div>
                </div>
              </div>
            </div>
            <div style={{background:"#0a0a14",borderRadius:8,padding:"12px 14px",fontSize:12,color:"#7090b0",lineHeight:1.8}}>
              <strong style={{color:"#90c8e0"}}>Przykład z prawdziwych danych (AI Overview, Ostry Sklep):</strong>
              <div style={{marginTop:8,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div style={{fontFamily:"monospace",fontSize:11,color:"#5090a8",lineHeight:2}}>
                  <div><span style={{color:S.green}}>Wzmianki marki:</span> 205</div>
                  <div><span style={{color:"#7060a0"}}>Militaria.pl (nie dodana):</span> 2 164</div>
                  <div><span style={{color:"#7060a0"}}>Kolba (nie dodana):</span> 537</div>
                  <div><span style={{color:"#7060a0"}}>Knivesandtools:</span> 96</div>
                  <div style={{borderTop:"1px solid #1a3a55",marginTop:4,paddingTop:4}}><span style={{color:"#c0a0ff"}}>Nasze SOV = 205 / 3055 =</span> <strong style={{color:S.green,fontSize:13}}>6.7%</strong></div>
                </div>
                <div style={{fontFamily:"monospace",fontSize:11,color:"#5090a8",lineHeight:2}}>
                  <div><span style={{color:S.green}}>Wzmianki marki:</span> 205</div>
                  <div><span style={{color:"#7060a0"}}>Dodany konkurent A:</span> ~400</div>
                  <div><span style={{color:"#7060a0"}}>Dodany konkurent B:</span> ~300</div>
                  <div style={{color:"#2a4050",fontSize:10}}>(Militaria.pl pominięta)</div>
                  <div style={{borderTop:"1px solid #1a3a55",marginTop:4,paddingTop:4}}><span style={{color:"#c0a0ff"}}>Brand Radar SOV = 205 / 905 =</span> <strong style={{color:"#c0a0ff",fontSize:13}}>~22%</strong></div>
                </div>
              </div>
              <div style={{marginTop:10,padding:"8px 11px",background:"#060018",borderRadius:6,fontSize:11,color:"#7050c0"}}>
                💡 <strong style={{color:"#a078e0"}}>Jak wyrównać wyniki:</strong> W Brand Radar dodaj wszystkich głównych konkurentów których AI wymienia. Im pełniejsza lista, tym wynik bardziej zbliżony do naszego narzędzia.
                {allComps.length>0&&<div style={{marginTop:12,borderTop:"1px solid #2a1060",paddingTop:10}}>
                  <div style={{fontSize:10,color:"#7050b0",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.7px",marginBottom:8}}>Konkurenci wykryci w Twoich danych — dodaj ich w Brand Radar:</div>
                  <div style={{display:"flex",flexDirection:"column",gap:4}}>
                    {allComps.slice(0,20).map((c,i)=>(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"4px 8px",background:"#060018",borderRadius:5}}>
                        <span style={{fontSize:10,color:"#3a2060",minWidth:20,textAlign:"right"}}>{i+1}.</span>
                        <span style={{fontSize:12,color:"#c0a0ff",flex:1,fontFamily:"monospace"}}>{c}</span>
                        <span style={{fontSize:11,color:"#6040a0",fontFamily:"monospace",background:"#0a0020",padding:"1px 8px",borderRadius:4}}>{(compCounts[c]||0).toLocaleString("pl-PL")} wzm.</span>
                      </div>
                    ))}
                    {allComps.length>20&&<div style={{fontSize:10,color:"#4a2070",padding:"4px 8px"}}>... i {allComps.length-20} więcej</div>}
                  </div>
                </div>}
              </div>
            </div>
          </div>

          <button onClick={()=>setTab("setup")} style={{marginTop:16,padding:"12px 28px",background:S.green+"22",border:"2px solid "+S.green+"66",borderRadius:10,color:S.green,fontSize:13,fontWeight:700,cursor:"pointer"}}>
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
            <div style={{display:"flex",flexDirection:"column",gap:12,marginTop:10,marginBottom:12}}>
              {/* Group by cluster */}
              {(()=>{
                const clusters = {};
                Object.entries(INDUSTRIES).forEach(([key,ind])=>{
                  const c = ind.cluster || "Inne";
                  if(!clusters[c]) clusters[c]=[];
                  clusters[c].push([key,ind]);
                });
                return Object.entries(clusters).map(([cluster,items])=>(
                  <div key={cluster} style={{gridColumn:"1/-1"}}>
                    <div style={{fontSize:9,color:"#4a7090",fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",marginBottom:7,marginTop:4}}>{cluster}</div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      {items.map(([key,ind])=>(
                        <button key={key} onClick={()=>setBrand(b=>({...b,industry:key,industryType:""}))} style={{padding:"7px 12px",borderRadius:8,border:"1px solid "+(brand.industry===key?S.green:S.border),background:brand.industry===key?S.green+"18":"transparent",color:brand.industry===key?S.green:"#7aabbf",cursor:"pointer",display:"flex",alignItems:"center",gap:7}}>
                          <span style={{fontSize:14}}>{ind.icon}</span>
                          <span style={{fontSize:11,fontWeight:700}}>{ind.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ));
              })()}
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
          {/* Mandatory check before proceeding */}
          {brand.name&&brand.url&&!(brand.industry&&brand.industryType)&&(
            <div style={{marginTop:12,padding:"10px 14px",background:"#100500",border:"1px solid "+S.gold+"55",borderRadius:8,fontSize:12,color:"#d4a820"}}>
              ⚠️ Wybierz typ domeny i konkretną branżę — bez tego narzędzie nie wie jakie zapytania są istotne dla klienta i pokaże błędne luki contentowe.
            </div>
          )}
          <button onClick={()=>setTab("import")} disabled={!(brand.name&&brand.url&&brand.industry&&brand.industryType)} style={{marginTop:10,padding:"10px 22px",background:!(brand.name&&brand.url&&brand.industry&&brand.industryType)?"transparent":S.green+"18",border:"1px solid "+(!(brand.name&&brand.url&&brand.industry&&brand.industryType)?S.border:S.green+"55"),borderRadius:10,color:!(brand.name&&brand.url&&brand.industry&&brand.industryType)?S.border:S.green,fontSize:13,fontWeight:700,cursor:!(brand.name&&brand.url&&brand.industry&&brand.industryType)?"not-allowed":"pointer"}}>Dalej → Import CSV</button>
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
              {allMentionsInData.map((m,i)=>{const cols=[S.sky,S.coral,S.gold,S.purple,"#34d399",S.green];const act=brandMentionKey===m;return (<button key={i} onClick={()=>setBrandMentionKey(act?"":m)} style={{padding:"4px 12px",borderRadius:13,fontSize:11,fontWeight:700,cursor:"pointer",background:act?cols[i%6]+"33":cols[i%6]+"12",border:"1px solid "+(act?cols[i%6]:cols[i%6]+"44"),color:cols[i%6]}}>{m}</button>);})}
            </div>
            <div style={{display:"flex",gap:7,alignItems:"center"}}>
              <input value={brandMentionKey} onChange={e=>setBrandMentionKey(e.target.value)} placeholder="lub wpisz ręcznie..." style={{flex:1,background:S.navy2,border:"1px solid "+S.border,borderRadius:8,padding:"7px 11px",color:S.text,fontSize:12,outline:"none",fontFamily:"monospace"}}/>
              {brandMentionKey&&<button onClick={()=>setBrandMentionKey("")} style={{padding:"5px 11px",background:"transparent",border:"1px solid "+S.border,borderRadius:8,color:S.muted,fontSize:11,cursor:"pointer"}}>✕</button>}
            </div>
          </div>}
          {filesLoaded>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:9,marginBottom:12}}>
            {PLATFORMS.map(p=>{const d=proc[p.id];const loaded=!!files[p.id];return (<div key={p.id} style={{padding:"11px 13px",background:S.navy2,border:"1px solid "+(loaded?p.color+"44":S.border),borderRadius:10}}>
              <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}><span style={{background:p.color+"20",color:p.color,borderRadius:5,padding:"1px 6px",fontSize:10,fontWeight:700}}>{p.icon} {p.name}</span>{loaded?<span style={{fontSize:10,color:S.green}}>✅</span>:<span style={{fontSize:10,color:S.muted}}>—</span>}</div>
              {loaded?<div><div style={{fontSize:9,color:S.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:3}}>{files[p.id].filename}</div><div style={{fontSize:11,color:S.text,fontFamily:"monospace"}}>{fmtN(d.total)} zapytań — <span style={{color:S.green}}>{fmtN(d.mentions)} wzmianek</span> · <span style={{color:S.sky}}>{fmtN(d.citations)} cytowań</span></div><div style={{fontSize:10,color:"#6090a8",marginTop:2}}>W ilu zapytaniach pojawia się jakakolwiek marka: {fmtN(d.withAnyBrand)} ({fmtP(d.withAnyBrand,d.total)})</div></div>:<div style={{fontSize:11,color:"#3a6080"}}>— wgraj CSV z Ahrefs dla tej platformy</div>}
            </div>);})}
          </div>}
          {unknownFiles.length>0&&<div style={{marginBottom:12,padding:"13px 15px",background:S.gold+"0a",border:"1px solid "+S.gold+"33",borderRadius:10}}>
            <div style={{fontSize:13,fontWeight:800,color:S.gold,marginBottom:5}}>⚠️ Wymagane przypisanie platformy *</div><div style={{fontSize:11,color:"#a08030",marginBottom:12,lineHeight:1.6}}>Zaznaczone pliki wymagają ręcznego wskazania platformy. Bez tego dane nie zostaną wczytane.</div>
            {unknownFiles.map((uf,fi)=>(
              <div key={fi} style={{marginBottom:16,background:"#0a0800",border:"1px solid "+S.gold+"44",borderRadius:10,padding:"14px 16px"}}>
                <div style={{fontSize:11,color:"#7aaabf",marginBottom:8,fontFamily:"monospace",display:"flex",alignItems:"center",gap:8}}>
                  <span>📄</span>
                  <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{uf.filename}</span>
                  {uf.rows&&<span style={{fontSize:10,color:"#5090a8",background:"#030c18",borderRadius:4,padding:"1px 7px",flexShrink:0}}>{(uf.rows||0).toLocaleString("pl-PL")} zapytań</span>}
                </div>
                {uf.conflictNote&&<div style={{padding:"10px 14px",background:"#0f0e00",border:"1px solid "+S.gold+"55",borderRadius:8,marginBottom:12,fontSize:12,color:"#d4a820",lineHeight:1.7}}>{uf.conflictNote}</div>}
                {!uf.conflict&&<div style={{fontSize:11,color:"#5080a0",marginBottom:10}}>Nagłówki: <span style={{color:"#7aaabf"}}>{(uf.headers||[]).slice(0,6).join(", ")}</span></div>}
                {uf.conflict ? (
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    {[PLATFORMS.find(p=>p.id==="ai_overview"),PLATFORMS.find(p=>p.id==="ai_mode")].filter(Boolean).map(p=>(
                      <button key={p.id} onClick={()=>assignPlatform(uf.filename,p.id)} style={{padding:"14px 16px",borderRadius:10,fontSize:13,fontWeight:800,cursor:"pointer",background:p.color+"20",border:"2px solid "+p.color+"66",color:p.color,textAlign:"left",transition:"all .15s"}}>
                        <div style={{fontSize:22,marginBottom:6}}>{p.icon}</div>
                        <div style={{fontSize:13,fontWeight:800,marginBottom:3}}>{p.name}</div>
                        <div style={{fontSize:11,color:p.color+"aa",fontWeight:400,lineHeight:1.5}}>
                          {p.id==="ai_overview" ? "Google AI Overview — kafelki z odpowiedzią AI w zwykłych wynikach wyszukiwania" : "Google AI Mode — osobny tryb wyszukiwania z pełną odpowiedzią AI"}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div>
                    <div style={{fontSize:11,color:"#9abfd0",marginBottom:8}}>Kliknij właściwą platformę:</div>
                    <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{PLATFORMS.map(p=><button key={p.id} onClick={()=>assignPlatform(uf.filename,p.id)} style={{padding:"6px 14px",borderRadius:10,fontSize:11,fontWeight:700,cursor:"pointer",background:p.color+"18",border:"1px solid "+p.color+"44",color:p.color}}>{p.icon} {p.name}</button>)}</div>
                  </div>
                )}
              </div>
            ))}
          </div>}
          {errors.length>0&&unknownFiles.length===0&&<div style={{marginBottom:12,padding:"9px 13px",background:S.coral+"0f",border:"1px solid "+S.coral+"33",borderRadius:8}}>{errors.map((e,i)=><div key={i} style={{fontSize:11,color:S.coral}}>{e}</div>)}</div>}
          <button onClick={()=>setTab("dashboard")} style={{padding:"10px 22px",background:S.green+"18",border:"1px solid "+S.green+"55",borderRadius:10,color:S.green,fontSize:13,fontWeight:700,cursor:"pointer"}}>Dashboard →</button>
        </div>}

        {/* DASHBOARD */}
        {tab==="dashboard"&&<div>
          <STitle>Dashboard Widoczności AI</STitle>

          {/* SOV explainer — Ahrefs methodology */}
          <div style={{background:"#030c18",border:"1px solid #1a3a55",borderRadius:12,padding:"16px 18px",marginBottom:18}}>
            <div style={{fontWeight:900,color:"#70c0e0",marginBottom:4,fontSize:16}}>📐 Jak Ahrefs Brand Radar liczy metryki — i jak my to przybliżamy</div>
            <div style={{fontSize:12,color:"#4a7090",marginBottom:14}}>Brand Radar waży wyniki popularnością promptów (search volume). Nasze narzędzie liczy z surowych danych CSV — dlatego liczby się różnią.</div>

            <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:14}}>

              {/* 1. SOV */}
              <div style={{background:"#040e1a",borderRadius:9,padding:"14px 16px",border:"1px solid "+S.green+"33"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                  <span style={{fontSize:12,fontWeight:900,color:S.green,background:S.green+"18",borderRadius:4,padding:"1px 9px"}}>1</span>
                  <span style={{fontSize:13,fontWeight:800,color:S.green}}>AI Share of Voice (SOV) — Twój kawałek tortu</span>
                </div>
                <div style={{fontSize:12,color:"#7ab8a0",lineHeight:1.9,marginBottom:10}}>
                  <strong style={{color:S.text}}>Co to znaczy po ludzku:</strong> Wyobraź sobie że AI ma 1000 wypowiedzi o nożach. W ilu z nich pojawia się Twoja marka? SOV mówi właśnie o tym — jaki procent wszystkich wzmianek marek z branży to Ty.
                </div>
                <div style={{background:"#020c10",borderRadius:7,padding:"12px 14px",marginBottom:8}}>
                  <div style={{fontSize:11,color:"#4a8070",marginBottom:6,fontWeight:700}}>Jak liczymy krok po kroku:</div>
                  <div style={{fontFamily:"monospace",fontSize:12,color:"#90c8d0",lineHeight:2.2}}>
                    <div><span style={{color:"#4a7090"}}>Krok 1:</span> Ile razy AI wymienił Twoją markę? → <strong style={{color:S.green}}>{fmtN(totalM)} wzmianek</strong></div>
                    <div><span style={{color:"#4a7090"}}>Krok 2:</span> Ile razy AI wymienił top 5 konkurentów? → <strong style={{color:"#7aabbf"}}>{fmtN(top5CompM)} wzmianek</strong></div>
                    <div><span style={{color:"#4a7090"}}>Krok 3:</span> Zsumuj: {fmtN(totalM)} + {fmtN(top5CompM)} = <strong style={{color:S.text}}>{fmtN(totalM+top5CompM)} łącznie</strong></div>
                    <div><span style={{color:"#4a7090"}}>Krok 4:</span> Podziel: {fmtN(totalM)} / {fmtN(totalM+top5CompM)} x 100 = <strong style={{color:S.green,fontSize:15}}>{globalSOV}%</strong></div>
                  </div>
                </div>
                <div style={{fontSize:11,color:"#2a5060",padding:"6px 10px",background:"#010810",borderRadius:5,lineHeight:1.6}}>⚡ Ahrefs robi to samo ale dodatkowo waży każdą wzmiankę wolumenem wyszukiwań zapytania. Dlatego ich % może być wyższy — zapytania z dużym ruchem liczą się bardziej.</div>
              </div>

              {/* 2. Mentions */}
              <div style={{background:"#040e1a",borderRadius:9,padding:"14px 16px",border:"1px solid "+S.purple+"33"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                  <span style={{fontSize:12,fontWeight:900,color:S.purple,background:S.purple+"18",borderRadius:4,padding:"1px 9px"}}>2</span>
                  <span style={{fontSize:13,fontWeight:800,color:S.purple}}>Mentions — ile razy AI wymówił nazwę marki</span>
                </div>
                <div style={{fontSize:12,color:"#907ab8",lineHeight:1.9,marginBottom:10}}>
                  <strong style={{color:S.text}}>Co to znaczy po ludzku:</strong> Idziemy do pliku CSV wiersz po wierszu. W każdym wierszu jest kolumna Mentions. Jeśli w tej kolumnie jest nazwa Twojej marki — dodajemy 1 do licznika.
                </div>
                <div style={{background:"#020c10",borderRadius:7,padding:"12px 14px",marginBottom:8}}>
                  <div style={{fontSize:11,color:"#4a4070",marginBottom:6,fontWeight:700}}>Jak liczymy krok po kroku:</div>
                  <div style={{fontFamily:"monospace",fontSize:12,color:"#a090d8",lineHeight:2.2}}>
                    <div><span style={{color:"#4a7090"}}>Krok 1:</span> Bierzemy plik CSV (np. {fmtN(totalQ)} wierszy)</div>
                    <div><span style={{color:"#4a7090"}}>Krok 2:</span> Sprawdzamy kolumnę Mentions w każdym wierszu</div>
                    <div><span style={{color:"#4a7090"}}>Krok 3:</span> Jeśli zawiera np. "ostry-sklep" → liczymy jako wzmiankę</div>
                    <div><span style={{color:"#4a7090"}}>Wynik:</span> <strong style={{color:S.purple,fontSize:15}}>{fmtN(totalM)} wzmianek</strong> w {fmtN(totalQ)} zapytaniach</div>
                  </div>
                </div>
                <div style={{fontSize:11,color:"#2a5060",padding:"6px 10px",background:"#010810",borderRadius:5,lineHeight:1.6}}>⚡ Ahrefs liczy podobnie, ale może grupować warianty nazwy i stosować deduplikację. Nasze zliczanie jest prostsze — każde dopasowanie to 1.</div>
              </div>

              {/* 3. Citations */}
              <div style={{background:"#040e1a",borderRadius:9,padding:"14px 16px",border:"1px solid "+S.sky+"33"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                  <span style={{fontSize:12,fontWeight:900,color:S.sky,background:S.sky+"18",borderRadius:4,padding:"1px 9px"}}>3</span>
                  <span style={{fontSize:13,fontWeight:800,color:S.sky}}>Citations — ile razy AI podał link do Twojej strony</span>
                </div>
                <div style={{fontSize:12,color:"#7a90b8",lineHeight:1.9,marginBottom:10}}>
                  <strong style={{color:S.text}}>Co to znaczy po ludzku:</strong> To inna miara niż wzmianki. AI może wymienić markę bez linka, albo podać link bez wymienienia nazwy. Citations = linki. Możesz być "anonimowym ekspertem" — AI cytuje Twoją stronę jako źródło ale nie pisze nazwy.
                </div>
                <div style={{background:"#020c10",borderRadius:7,padding:"12px 14px",marginBottom:8}}>
                  <div style={{fontSize:11,color:"#3a5070",marginBottom:6,fontWeight:700}}>Jak liczymy krok po kroku:</div>
                  <div style={{fontFamily:"monospace",fontSize:12,color:"#80b0d0",lineHeight:2.2}}>
                    <div><span style={{color:"#4a7090"}}>Krok 1:</span> Sprawdzamy kolumnę Link URL w każdym wierszu CSV</div>
                    <div><span style={{color:"#4a7090"}}>Krok 2:</span> Jeśli URL zawiera Twoją domenę → liczymy jako cytowanie</div>
                    <div><span style={{color:"#4a7090"}}>Wynik:</span> <strong style={{color:S.sky,fontSize:15}}>{fmtN(totalC)} cytowań</strong> w {fmtN(totalQ)} zapytaniach ({fmtP(totalC,totalQ)})</div>
                  </div>
                </div>
                <div style={{fontSize:11,color:"#2a5060",padding:"6px 10px",background:"#010810",borderRadius:5,lineHeight:1.6}}>⚡ Ahrefs mierzy to samo — linki w odpowiedziach AI do Twojej domeny. Wyniki powinny być zbliżone.</div>
              </div>

              {/* 4. Impressions */}
              <div style={{background:"#040e1a",borderRadius:9,padding:"14px 16px",border:"1px solid "+S.coral+"33"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                  <span style={{fontSize:12,fontWeight:900,color:S.coral,background:S.coral+"18",borderRadius:4,padding:"1px 9px"}}>4</span>
                  <span style={{fontSize:13,fontWeight:800,color:S.coral}}>Estimated Impressions — ile osób MOGŁO zobaczyć wzmiankę</span>
                </div>
                <div style={{fontSize:12,color:"#b07870",lineHeight:1.9,marginBottom:10}}>
                  <strong style={{color:S.text}}>Co to znaczy po ludzku:</strong> Nie liczymy tutaj kliknięć — to nie jest Google Analytics. Liczymy ile razy miesięcznie ludzie wpisują do wyszukiwarki zapytania, na które AI odpowiada i wymienia Twoją markę. To potencjalny zasięg, nie realny ruch.
                </div>
                <div style={{background:"#020c10",borderRadius:7,padding:"12px 14px",marginBottom:8}}>
                  <div style={{fontSize:11,color:"#503030",marginBottom:6,fontWeight:700}}>Jak liczymy krok po kroku:</div>
                  <div style={{fontFamily:"monospace",fontSize:12,color:"#d09080",lineHeight:2.2}}>
                    <div><span style={{color:"#4a7090"}}>Krok 1:</span> Bierzemy tylko zapytania gdzie AI wymienił markę</div>
                    <div><span style={{color:"#4a7090"}}>Krok 2:</span> Patrzymy na kolumnę Volume (miesięczna liczba wyszukiwań)</div>
                    <div><span style={{color:"#4a7090"}}>Krok 3:</span> Sumujemy Volume dla wszystkich tych zapytań</div>
                    <div><span style={{color:"#4a7090"}}>Wynik:</span> <strong style={{color:S.coral,fontSize:15}}>~{totalImpressions>999999?Math.round(totalImpressions/1000)+"k":fmtN(totalImpressions)}</strong> miesięcznych wyszukiwań z wzmianką marki</div>
                  </div>
                </div>
                <div style={{fontSize:11,color:"#2a5060",padding:"6px 10px",background:"#010810",borderRadius:5,lineHeight:1.6}}>⚡ To NIE jest liczba kliknięć ani sesji. Ahrefs liczy tak samo — suma search volume zapytań z wzmianką. Traktuj jako orientacyjny zasięg tematyczny.</div>
              </div>

              {/* 5. Gap */}
              <div style={{background:"#040e1a",borderRadius:9,padding:"14px 16px",border:"1px solid "+S.gold+"33"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                  <span style={{fontSize:12,fontWeight:900,color:S.gold,background:S.gold+"18",borderRadius:4,padding:"1px 9px"}}>5</span>
                  <span style={{fontSize:13,fontWeight:800,color:S.gold}}>Visibility Gap — tematy gdzie konkurent jest, Ciebie nie ma</span>
                </div>
                <div style={{fontSize:12,color:"#b0a070",lineHeight:1.9,marginBottom:10}}>
                  <strong style={{color:S.text}}>Co to znaczy po ludzku:</strong> Dla każdego zapytania sprawdzamy: czy AI wymienił konkurenta? Jeśli tak, czy wymienił też Ciebie? Jeśli konkurent jest ale Ciebie nie ma — to jest luka. Te zapytania to lista tematów do pokrycia contentem.
                </div>
                <div style={{background:"#020c10",borderRadius:7,padding:"12px 14px",marginBottom:8}}>
                  <div style={{fontSize:11,color:"#504010",marginBottom:6,fontWeight:700}}>Jak liczymy krok po kroku:</div>
                  <div style={{fontFamily:"monospace",fontSize:12,color:"#d0b060",lineHeight:2.2}}>
                    <div><span style={{color:"#4a7090"}}>Krok 1:</span> Szukamy zapytań gdzie kolumna Mentions zawiera konkurenta</div>
                    <div><span style={{color:"#4a7090"}}>Krok 2:</span> Sprawdzamy czy ta sama kolumna zawiera też Twoją markę</div>
                    <div><span style={{color:"#4a7090"}}>Krok 3:</span> Jeśli konkurent=TAK, Twoja marka=NIE → to jest luka</div>
                    <div><span style={{color:"#4a7090"}}>Wynik:</span> <strong style={{color:S.gold,fontSize:15}}>{fmtN(totalGapQueries)} zapytań</strong> do pokrycia contentem</div>
                  </div>
                </div>
                <div style={{fontSize:11,color:"#2a5060",padding:"6px 10px",background:"#010810",borderRadius:5,lineHeight:1.6}}>⚡ Nasza własna metryka — Ahrefs nie ma jej pod tą nazwą. Filtry branżowe wykluczają zapytania niezwiązane z Twoją branżą.</div>
              </div>

            </div>

            <div style={{padding:"9px 12px",background:"#0a0a14",borderRadius:7,fontSize:11,color:"#4a7090",lineHeight:1.7}}>
              <strong style={{color:"#7aaabf"}}>Ważne:</strong> Metryki Brand Radar to <em>directional indicators</em> — Ahrefs zastrzega, że nie są to dokładne liczniki ruchu ani audience measurement. Baza danych Brand Radar: 300+ mln search-backed promptów z People Also Ask i bazy słów kluczowych Ahrefs. Dane odświeżane miesięcznie z oknem 90-dniowym.
            </div>

          </div>

            {/* Brand Radar vs AI Responses */}
            <div style={{marginTop:12,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div style={{background:"#08001a",border:"1px solid #2a1050",borderRadius:8,padding:"11px 14px"}}>
                <div style={{fontSize:10,fontWeight:800,color:"#a78bfa",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:7}}>Brand Radar — osobna zakładka Ahrefs</div>
                <div style={{fontSize:12,color:"#8060b0",lineHeight:1.75}}>
                  Brand Radar śledzi <strong style={{color:"#c0a0ff"}}>~74 ręcznie wybranych zapytań</strong>. Małe liczby = wyższy %. <strong style={{color:"#c0a0ff"}}>To nie jest źródło plików CSV</strong> które tu wgrywasz.
                </div>
                <div style={{marginTop:7,fontSize:11,color:"#4a2080",padding:"5px 8px",background:"#040010",borderRadius:5}}>Brand Radar → AI Responses → agent AI → lokalizacja → Export = Twój plik CSV.</div>
              </div>
              <div style={{background:"#001208",border:"1px solid #104030",borderRadius:8,padding:"11px 14px"}}>
                <div style={{fontSize:10,fontWeight:800,color:S.green,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:7}}>AI Responses — to co wgrywasz</div>
                <div style={{fontSize:12,color:"#408060",lineHeight:1.75}}>
                  Ahrefs → AI Visibility → <strong style={{color:S.green}}>AI Responses</strong> → Export. Dziesiątki tysięcy zapytań — szerszy mianownik = niższy % niż Brand Radar. <strong style={{color:S.green}}>Oba wyniki są poprawne</strong>.
                </div>
                <div style={{marginTop:7,fontSize:11,color:"#1a4020",padding:"5px 8px",background:"#000a04",borderRadius:5}}>Im więcej platform wgrasz, tym pełniejszy obraz.</div>
              </div>
          </div>

          {/* 5 metryk Ahrefs AI Visibility */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:18}}>
            {[
              {
                label:"AI Share of Voice", tag:"SOV",
                value:globalSOV+"%", color:S.green,
                formula:"Twoje ÷ (Twoje + top 5 konkurentów)",
                calc:fmtN(totalM)+" ÷ "+fmtN(totalM+top5CompM)+" = "+globalSOV+"%",
                desc:globalSOV>=30?"Silna pozycja w AI":globalSOV>=10?"Umiarkowana — jest przestrzeń do wzrostu":"Niska — konieczne działania contentowe",
              },
              {
                label:"AI Mentions", tag:"Wzmianki",
                value:fmtN(totalM), color:S.purple,
                formula:"Liczba odpowiedzi AI z nazwą marki",
                calc:"Łącznie ze wszystkich platform i zapytań",
                desc:"Ile razy AI napisał nazwę Twojej marki w swoich odpowiedziach",
              },
              {
                label:"AI Citations", tag:"Cytowania",
                value:fmtN(totalC), color:S.sky,
                formula:"Liczba odpowiedzi AI z linkiem do domeny",
                calc:"Aktywne linki do "+( brand.url||"Twojej domeny")+" w odpowiedziach AI",
                desc:"Ile razy AI podał Twoją stronę jako źródło (link w odpowiedzi)",
              },
              {
                label:"AI Impressions", tag:"Zasięg",
                value:totalImpressions>999999?(Math.round(totalImpressions/1000)+"k"):fmtN(totalImpressions), color:S.coral,
                formula:"Σ wolumenów zapytań z wzmianką marki",
                calc:"Szacowany zasięg wyszukiwań gdzie AI wymienił markę",
                desc:"Suma miesięcznych wyszukiwań zapytań, w których AI wymienił markę",
              },
              {
                label:"Visibility Gap", tag:"Luki",
                value:fmtN(totalGapQueries), color:S.gold,
                formula:"Zapytania: konkurent TAK, marka NIE",
                calc:fmtN(totalGapQueries)+" zapytań do odrobienia",
                desc:"Ile zapytań AI obsługuje dla konkurentów, a pomija Twoją markę",
              },
            ].map((k,i)=>(
              <div key={i} style={{background:S.navy2,border:"1px solid "+k.color+"22",borderRadius:11,padding:"12px 11px"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5}}>
                  <div style={{fontSize:10,color:"#7ab0c8",textTransform:"uppercase",letterSpacing:"0.8px",fontWeight:700,marginBottom:2}}>{k.label}</div>
                  <span style={{fontSize:8,color:k.color,background:k.color+"18",borderRadius:3,padding:"1px 5px",fontWeight:700,letterSpacing:"0.5px"}}>{k.tag}</span>
                </div>
                <div style={{fontSize:30,fontWeight:900,color:k.color,lineHeight:1,marginBottom:6}}>{k.value}</div>
                <div style={{fontSize:10,color:"#4a8090",fontFamily:"monospace",lineHeight:1.5,marginBottom:4}}>{k.formula}</div>
                <div style={{fontSize:10,color:"#3a6070",lineHeight:1.4,marginBottom:5}}>{k.calc}</div>
                <div style={{fontSize:11,color:"#8abdd0",lineHeight:1.5,borderTop:"1px solid #0e1e2e",paddingTop:6,marginTop:2}}>{k.desc}</div>
              </div>
            ))}
          </div>

          {/* Per-platform table */}
          <Card style={{marginBottom:14}}>
            <SL>Wyniki per platforma — skąd te liczby?</SL>
            <Explain type="info"><strong>Skąd te liczby?</strong> Każdy wiersz = jedno zapytanie. "Zapytania" = ile wierszy było w pliku. "Wzmianki" = w ilu zapytaniach AI napisał nazwę Twojej marki. "Zapytania z jakąkolwiek marką" = zapytania gdzie jakakolwiek marka się pojawia (mianownik dla Mention Rate). SOV = wzmianki Twojej marki ÷ (Twoje + wszystkich konkurentów wzmianki).</Explain>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <thead><tr style={{borderBottom:"1px solid "+S.border}}>{["Platforma","Plik CSV","Zapytania","Zapytania z jakąkolwiek marką","Wzmianki","Cytowania","SOV %","Mention Rate"].map(h=><th key={h} style={{padding:"8px 10px",textAlign:"left",fontSize:10,color:"#7aaabf",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.7px"}}>{h}</th>)}</tr></thead>
                <tbody>{PLATFORMS.map(p=>{const d=proc[p.id];const loaded=!!files[p.id];const sov=calcSOV(d.mentions,d.compSet);const mr=d.withAnyBrand>0?Math.round((d.mentions/d.withAnyBrand)*100):0;return <tr key={p.id} style={{borderBottom:"1px solid "+S.navy3,opacity:loaded?1:0.3}}>
                  <td style={{padding:"8px 9px"}}><span style={{background:p.color+"20",color:p.color,borderRadius:5,padding:"2px 6px",fontSize:10,fontWeight:700}}>{p.icon} {p.name}</span></td>
                  <td style={{padding:"8px 9px",color:S.muted,fontSize:10,maxWidth:130,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(files[p.id]&&files[p.id].filename?(files[p.id].filename.split("/").pop().replace(/ostry-sklep.*?_/,"").slice(0,30)):"—")}</td>
                  <td style={{padding:"9px 10px",fontFamily:"monospace",color:"#8ab8cc",fontSize:12}}>{fmtN(d.total)}</td>
                  <td style={{padding:"9px 10px",fontFamily:"monospace",color:"#8ab8cc",fontSize:12}}>{fmtN(d.withAnyBrand)}</td>
                  <td style={{padding:"9px 10px",fontFamily:"monospace",color:S.green,fontWeight:800,fontSize:13}}>{fmtN(d.mentions)}</td>
                  <td style={{padding:"9px 10px",fontFamily:"monospace",color:S.sky,fontWeight:800,fontSize:13}}>{fmtN(d.citations)}</td>
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

          {/* Keyword Browser */}
          {(allBrandKws.length>0||allGapKws.length>0)&&<Card style={{marginBottom:14,border:"1px solid #1a3050"}}>
            <SL color="#90c8e0">🔍 Przeglądarka zapytań — pełna lista</SL>
            <div style={{fontSize:11,color:"#5090a8",marginBottom:12}}>Przeglądaj wszystkie zapytania. Filtruj po frazie, przełączaj zakładki.</div>
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              <button onClick={()=>{setKwTab("brand");setKwPage(0);setKwSearch("");}} style={{padding:"6px 16px",borderRadius:8,border:"1px solid "+(kwTab==="brand"?S.green+"66":S.border),background:kwTab==="brand"?S.green+"18":"transparent",color:kwTab==="brand"?S.green:"#5090a8",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                🎯 Marka się pojawia ({allBrandKws.length})
              </button>
              <button onClick={()=>{setKwTab("gap");setKwPage(0);setKwSearch("");}} style={{padding:"6px 16px",borderRadius:8,border:"1px solid "+(kwTab==="gap"?S.coral+"66":S.border),background:kwTab==="gap"?S.coral+"18":"transparent",color:kwTab==="gap"?S.coral:"#5090a8",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                ⚠️ Luki — marka nieobecna ({allGapKws.length})
              </button>
              <div style={{flex:1}}/>
              <input value={kwSearch} onChange={e=>{setKwSearch(e.target.value);setKwPage(0);}} placeholder="Szukaj frazy..."
                style={{background:S.navy1,border:"1px solid "+S.border,borderRadius:8,padding:"5px 11px",color:S.text,fontSize:12,outline:"none",width:180}}/>
            </div>
            <div style={{background:"#020a14",borderRadius:8,overflow:"hidden",border:"1px solid #0e2030"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead>
                  <tr style={{background:"#030e1a",borderBottom:"1px solid #0e2030"}}>
                    <th style={{padding:"8px 12px",textAlign:"left",fontSize:10,color:"#4a7090",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.7px"}}>#</th>
                    <th style={{padding:"8px 12px",textAlign:"left",fontSize:10,color:"#4a7090",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.7px"}}>Zapytanie</th>
                    <th style={{padding:"8px 12px",textAlign:"right",fontSize:10,color:"#4a7090",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.7px"}}>Wolumen/mies.</th>
                    {kwTab!=="brand"&&<th style={{padding:"8px 12px",textAlign:"left",fontSize:10,color:"#4a7090",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.7px"}}>AI wymienia zamiast</th>}
                  </tr>
                </thead>
                <tbody>
                  {kwBrowserData.page.length===0&&<tr><td colSpan={kwTab==="brand"?3:4} style={{padding:"16px 12px",textAlign:"center",color:"#3a6070",fontSize:12}}>Brak wyników{kwSearch?" dla "+kwSearch:""}</td></tr>}
                  {kwBrowserData.page.map(([kw,valOrObj],i)=>{
                    const vol = kwTab==="brand" ? valOrObj : valOrObj.vol;
                    const comps = kwTab==="brand" ? null : valOrObj.comps;
                    return (<tr key={i} style={{borderBottom:"1px solid #0a1a28",background:i%2===0?"transparent":"#030c18"}}>
                      <td style={{padding:"7px 12px",color:"#3a5070",fontSize:11,width:36}}>{kwPage*25+i+1}</td>
                      <td style={{padding:"7px 12px",color:kwTab==="brand"?"#c0e0d0":"#c0d0e0",fontWeight:i<3?700:400}}>{kw}</td>
                      <td style={{padding:"7px 12px",textAlign:"right",fontFamily:"monospace",color:"#5090a8",fontSize:11}}>{vol>0?fmtN(vol):"—"}</td>
                      {kwTab!=="brand"&&<td style={{padding:"7px 12px",color:"#c06070",fontSize:11}}>{(comps||[]).slice(0,3).join(", ")}</td>}
                    </tr>);
                  })}
                </tbody>
              </table>
            </div>
            {kwBrowserData.totalPages>1&&<div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginTop:10}}>
              <button onClick={()=>setKwPage(p=>Math.max(0,p-1))} disabled={kwPage===0} style={{padding:"4px 12px",borderRadius:6,border:"1px solid "+S.border,background:"transparent",color:kwPage===0?"#2a4050":"#7aabbf",cursor:kwPage===0?"not-allowed":"pointer",fontSize:12}}>Poprzednia</button>
              <span style={{fontSize:11,color:"#5090a8"}}>Strona {kwPage+1} z {kwBrowserData.totalPages} ({fmtN(kwBrowserData.list.length)} zapytań)</span>
              <button onClick={()=>setKwPage(p=>Math.min(kwBrowserData.totalPages-1,p+1))} disabled={kwPage>=kwBrowserData.totalPages-1} style={{padding:"4px 12px",borderRadius:6,border:"1px solid "+S.border,background:"transparent",color:kwPage>=kwBrowserData.totalPages-1?"#2a4050":"#7aabbf",cursor:kwPage>=kwBrowserData.totalPages-1?"not-allowed":"pointer",fontSize:12}}>Następna</button>
            </div>}
          </Card>}

          {/* Opportunities */}
          <Card style={{marginBottom:14,border:"1px solid "+S.gold+"33"}}>
            <SL color={S.gold}>⚡ Opportunities — Quick Wins</SL>
            <div style={{fontSize:11,color:"#c09840",marginBottom:10,padding:"8px 12px",background:"#120e00",borderRadius:6,border:"1px solid #4a3800"}}>⚠️ <strong style={{color:S.gold}}>Uwaga: to są SUGESTIE, nie gotowe zadania!</strong> Sprawdź każdą zanim wdrożysz — narzędzie nie zna kontekstu Twojej branży — generowane automatycznie. Sprawdź kontekst branżowy przed wdrożeniem.</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
              {oppCards.map((op,i)=>(
                <div key={i} style={{padding:"11px 13px",background:op.color+"08",border:"1px solid "+op.color+"22",borderRadius:9}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}><span style={{fontSize:13}}>{op.icon}</span><span style={{fontSize:9,fontWeight:800,color:op.color,background:op.color+"20",borderRadius:4,padding:"1px 5px",letterSpacing:"0.7px",textTransform:"uppercase"}}>{op.tag}</span><span style={{fontSize:11,fontWeight:700,color:S.text}}>{op.title}</span></div>
                  <div style={{fontSize:11,color:"#90b8cc",lineHeight:1.65,marginTop:2}}>{op.body}</div>
                </div>
              ))}            </div>
          </Card>

          <AdvancedMetrics
            globalSentScore={globalSentScore}
            totalSentPos={totalSentPos}
            totalSentNeg={totalSentNeg}
            totalSentNeu={totalSentNeu}
            globalRecRate={globalRecRate}
            totalRecTotal={totalRecTotal}
            totalRecWithBrand={totalRecWithBrand}
            globalControlRatio={globalControlRatio}
            totalOwnedLinks={totalOwnedLinks}
            totalAllLinks={totalAllLinks}
            fmtN={fmtN}
          />

          {/* Spostrzeżenia */}
          <Card style={{marginBottom:14}}>
            <SL>✦ Co to oznacza — wnioski</SL>
            <div style={{fontSize:11,color:"#8ab8cc",marginBottom:10,padding:"7px 11px",background:"#030c18",borderRadius:6,border:"1px solid #0e2a3a"}}>ℹ️ <strong>Wnioski tworzone automatycznie z liczb.</strong> Traktuj je jako punkt wyjścia — zawsze weryfikuj czy mają sens dla tej konkretnej branży.</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
              {best&&<div style={{padding:"10px 13px",background:S.green+"08",border:"1px solid "+S.green+"22",borderRadius:9}}><div style={{display:"flex",gap:7,alignItems:"flex-start"}}><span style={{color:S.green,fontWeight:900,flexShrink:0}}>↑</span><span style={{fontSize:11,color:"#90b8cc",lineHeight:1.6}}><strong style={{color:S.green}}>Najlepsza: {best.platform}</strong> SOV {best.sov}% — {best.sov>=30?"silna pozycja, utrzymuj.":best.sov>=10?"umiarkowana, rozbuduj FAQ i how-to.":"niska, twórz dedykowany content."}</span></div></div>}
              {worst&&worst!==best&&<div style={{padding:"10px 13px",background:S.coral+"08",border:"1px solid "+S.coral+"22",borderRadius:9}}><div style={{display:"flex",gap:7,alignItems:"flex-start"}}><span style={{color:S.coral,fontWeight:900,flexShrink:0}}>↓</span><span style={{fontSize:11,color:"#90b8cc",lineHeight:1.6}}><strong style={{color:S.coral}}>Do działania: {worst.platform}</strong> SOV {worst.sov}% — {worst.sov===0?"marka całkowicie nieobecna. Zbadaj zapytania tej platformy.":"najniższy SOV. Twórz content w formacie tej platformy."}</span></div></div>}
              {insightCard1}
              {insightCard2}
            </div>
          </Card>

          {/* Definitions */}
          <div style={{paddingTop:18,borderTop:"1px solid "+S.border}}>
            <div style={{fontSize:11,color:"#90c0d8",fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",marginBottom:12}}>Slownik wskaznikow — co znaczy kazda liczba</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9}}>
                <div style={{padding:"11px 13px",background:S.navy2,border:"1px solid "+S.green+"18",borderRadius:9}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}><span style={{fontSize:13}}>📊</span><span style={{fontSize:11,fontWeight:800,color:S.green}}>AI Share of Voice</span></div><div style={{fontSize:11,color:"#8ab0c4",lineHeight:1.65}}>Twoje wzm. / (Twoje + konk.) x 100. Udział głosu w AI.</div></div>
                <div style={{padding:"11px 13px",background:S.navy2,border:"1px solid "+S.purple+"18",borderRadius:9}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}><span style={{fontSize:13}}>💬</span><span style={{fontSize:11,fontWeight:800,color:S.purple}}>Mention Rate</span></div><div style={{fontSize:11,color:"#8ab0c4",lineHeight:1.65}}>% zapytań z jakąkolwiek marką, gdzie AI wymienia Twoją. Rośnie przez content marketing.</div></div>
                <div style={{padding:"11px 13px",background:S.navy2,border:"1px solid "+S.coral+"18",borderRadius:9}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}><span style={{fontSize:13}}>🔗</span><span style={{fontSize:11,fontWeight:800,color:S.coral}}>Citation Rate</span></div><div style={{fontSize:11,color:"#8ab0c4",lineHeight:1.65}}>% zapytań gdzie AI podaje Twoją stronę jako link. Rośnie przez structured data i E-E-A-T.</div></div>
                <div style={{padding:"11px 13px",background:S.navy2,border:"1px solid "+S.sky+"18",borderRadius:9}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}><span style={{fontSize:13}}>📡</span><span style={{fontSize:11,fontWeight:800,color:S.sky}}>Presence Score</span></div><div style={{fontSize:11,color:"#8ab0c4",lineHeight:1.65}}>(Wzm. + Cyt.x0.5) / wszystkie zapytania. Łączna obecność w AI.</div></div>
                <div style={{padding:"11px 13px",background:S.navy2,border:"1px solid "+S.gold+"18",borderRadius:9}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}><span style={{fontSize:13}}>⚡</span><span style={{fontSize:11,fontWeight:800,color:S.gold}}>Quick Win</span></div><div style={{fontSize:11,color:"#8ab0c4",lineHeight:1.65}}>Szansa z dysproporcji wskaźników. Weryfikuj ręcznie przed wdrożeniem.</div></div>
                <div style={{padding:"11px 13px",background:S.navy2,border:"1px solid "+"#34d399"+"18",borderRadius:9}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}><span style={{fontSize:13}}>🔍</span><span style={{fontSize:11,fontWeight:800,color:"#34d399"}}>Brand Variant</span></div><div style={{fontSize:11,color:"#8ab0c4",lineHeight:1.65}}>Forma nazwy marki sprawdzana w Mentions. AI może pisać roznymi wariantami.</div></div>
            </div>
          <button onClick={()=>setTab("report")} style={{marginTop:20,padding:"10px 22px",background:S.green+"18",border:"1px solid "+S.green+"55",borderRadius:10,color:S.green,fontSize:13,fontWeight:700,cursor:"pointer"}}>Generuj Raport →</button>
          </div>{/* close definitions outer */}
          </div>{/* close advanced metrics grid */}
          </div>{/* close outer content */}
        </div>}

        {/* REPORT */}
        {tab==="report"&&(()=>{
          const autoSections = {
            intro: [
              "Raport dotyczy marki " + (brand.name||"[marka]") + (brand.url ? " (" + brand.url + ")" : "") + (brand.industryType ? ", branża: " + brand.industryType : "") + ".",
              "Analiza obejmuje " + fmtN(totalQ) + " zapytań na " + PLATFORMS.filter(p=>proc[p.id].total>0).length + " platformach AI: " + PLATFORMS.filter(p=>proc[p.id].total>0).map(p=>p.name).join(", ") + ".",
            ].join(" "),
            sov: [
              "AI Share of Voice wynosi " + globalSOV + "%. Wzór: " + fmtN(totalM) + " wzmianek marki ÷ (" + fmtN(totalM) + " + " + fmtN(top5CompM) + " wzmianek top 5 konkurentów) = " + globalSOV + "%.",
              globalSOV >= 30 ? "Marka zajmuje silną pozycję — AI wymienia ją częściej niż większość konkurentów w tej kategorii."
                : globalSOV >= 10 ? "Marka ma umiarkowaną widoczność w AI. Jest wyraźna przestrzeń do wzrostu przez systematyczny content i entity building."
                : "Marka rzadko pojawia się w odpowiedziach AI. To wymaga działań: tworzenia treści odpowiadających na pytania branżowe i budowania rozpoznawalności.",
              best ? "Najlepsza platforma: " + best.platform + " (SOV " + best.sov + "%)." + (worst && worst !== best ? " Najsłabsza: " + worst.platform + " (SOV " + worst.sov + "%)." : "") : "",
            ].filter(Boolean).join(" "),
            mentions: [
              "Marka wymieniana jest " + fmtN(totalM) + " razy spośród " + fmtN(totalWB) + " zapytań z jakąkolwiek marką (" + fmtP(totalM,totalWB) + ").",
              totalM === 0 && totalC > 0
                ? "Strona jest cytowana przez AI " + fmtN(totalC) + " razy jako źródło, ale AI nie wymienia nazwy marki z nazwy. Priorytet: entity building — Wikipedia, Wikidata, About Us z pełną nazwą marki."
                : totalM > 0
                  ? "Cytowania strony: " + fmtN(totalC) + " (" + fmtP(totalC,totalQ) + " zapytań) — " + (totalC > totalM * 3 ? "strona jest częściej cytowana niż wymieniana z nazwy, co wskazuje na wysoki autorytet domeny bez rozpoznawalności marki." : "proporcja wzmianek i cytowań jest zdrowa.")
                  : "Marka nie pojawia się ani jako wzmianka, ani jako cytowanie — konieczne działania od podstaw.",
            ].filter(Boolean).join(" "),
            competitors: allComps.length > 0
              ? "W danych wykryto " + allComps.length + " marek konkurencyjnych. Najczęściej wymieniane przez AI: " + allComps.slice(0,4).map(c=>c+" ("+fmtN(compCounts[c])+" wzmianek)").join(", ") + ". " + (compCounts[allComps[0]] > totalM * 1.5 ? allComps[0] + " znacznie dominuje — warto przeanalizować ich content i odpowiedzieć na te same zapytania." : "Pozycja marki jest konkurencyjna — utrzymuj regularny content.")
              : "Brak wykrytych marek konkurencyjnych w danych.",
          };
          const getSec = key => (reportSections[key] !== null && reportSections[key] !== undefined) ? reportSections[key] : autoSections[key];
          
          const sectionDefs = [
            { id:"s1", key:"intro",       label:"① Wprowadzenie",              color:S.sky,    icon:"📋",
              what:"Co to jest: podstawowe informacje o kliencie i zakresie analizy. Edytuj datę, liczbę platform i nazwy jeśli coś się zmieniło.",
              hint:"Czy nazwa marki i domeny są poprawne? Czy liczba platform zgadza się z tym co wgrałeś?" },
            { id:"s2", key:"sov",         label:"② AI Share of Voice",          color:S.green,  icon:"📊",
              what:"Co to jest: procentowy udział marki wśród wszystkich wzmianek z branży w AI. Im wyższy, tym częściej AI wymienia Twoją markę zamiast konkurentów. Wzór: Twoje wzmianki ÷ (Twoje + top 5 rywali) × 100.",
              hint:"Sprawdź czy liczby SOV zgadzają się z tym co widzisz w dashboardzie." },
            { id:"s3", key:"mentions",    label:"③ Wzmianki i cytowania",       color:S.purple, icon:"💬",
              what:"Co to jest: wzmianki = AI napisał nazwę marki. Cytowania = AI podał link do strony. Możesz być cytowany bez wymienienia nazwy — to tzw. anonimowy ekspert.",
              hint:"Czy opis pasuje do sytuacji klienta? Sprawdź szczególnie proporcję wzmianek do cytowań." },
            { id:"s4", key:"competitors", label:"④ Analiza konkurencji",        color:S.coral,  icon:"⚔️",
              what:"Co to jest: marki wykryte automatycznie z kolumny Mentions w plikach CSV. To firmy które AI wymienia w tych samych odpowiedziach co marka klienta.",
              hint:"Sprawdź czy wymienieni konkurenci to faktyczni rywale klienta. Usuń z tekstu te które nie są relevantne.",
              ok: allComps.length > 0 },
            { id:"s5", key:"recs",        label:"⑤ Rekomendacje wdrożeniowe",   color:S.gold,   icon:"🚀",
              what:"Co to jest: lista konkretnych działań do wdrożenia. Każdy punkt możesz rozwinąć o podpunkty i komentarz dla klienta. Sam decydujesz co uwzględnić.",
              hint:"Dodaj punkty poniżej. Rekomendacje z dashboardu są sugestiami — dostosuj je do branży klienta." },
          ];

          // Build recs HTML for final report
          const recsHtml = recs.length > 0
            ? recs.map((r,i)=>{
                const sub = r.subs.length>0 ? "\n"+r.subs.map((s,j)=>"   "+(i+1)+"."+(j+1)+". "+s.text).join("\n") : "";
                const note = r.note ? " — "+r.note : "";
                return (i+1)+". "+r.text+note+sub;
              }).join("\n")
            : "(brak rekomendacji — dodaj punkty poniżej)";

          const finalComment = [
            ...sectionDefs.filter(s=>s.key!=="recs"&&s.ok!==false).map(s=>"## "+s.label+"\n"+(getSec(s.key)||"")),
            "## \u2464 Rekomendacje wdro\u017ceniowe\n"+recsHtml,
          ].join("\n\n");

          const readyToGenerate = sectionDefs
            .filter(s => s.ok !== false && s.key !== "recs")
            .every(s => reportChecks[s.id]===true);

          const remaining = sectionDefs.filter(s=>s.ok!==false&&s.key!=="recs"&&!reportChecks[s.id]).length;

          return <div>
            <STitle>Raport — zbuduj sekcje i wygeneruj dokument</STitle>
            <Explain type="step">
              <strong>Jak to działa krok po kroku:</strong> Dla każdej sekcji poniżej — przeczytaj auto-wypełniony tekst, popraw jeśli trzeba, zaznacz "Sprawdzone". Sekcja ⑤ Rekomendacje wypełniasz sam dodając punkty. Dopiero gdy wszystko zaznaczysz, odblokuje się przycisk generowania raportu PDF/HTML.
            </Explain>

            {/* Top queries inline */}
            {(topBrandKws.length>0||topGapKws.length>0)&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
              {topBrandKws.length>0&&<Card style={{border:"1px solid "+S.green+"44"}}>
                <SL color={S.green}>🎯 Zapytania gdzie AI JUŻ wymienia markę</SL>
                <Explain type="success">To jest dobra wiadomość. Przy tych zapytaniach AI zna markę. Posortowane od najpopularniejszych (wolumen = ile razy miesięcznie ludzie to wyszukują).</Explain>
                {topBrandKws.map(([kw,vol],i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 8px",background:i%2===0?"#030e18":"transparent",borderRadius:5,marginTop:2}}>
                    <span style={{fontSize:12,color:"#c0dce8",flex:1,marginRight:8,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{kw}</span>
                    {vol>0&&<span style={{fontSize:10,color:"#4a7090",fontFamily:"monospace",background:"#040e1a",padding:"1px 7px",borderRadius:4,flexShrink:0}}>{fmtN(vol)}/mies.</span>}
                  </div>
                ))}
              </Card>}
              {topGapKws.length>0&&<Card style={{border:"1px solid "+S.coral+"44"}}>
                <SL color={S.coral}>⚠️ Luki — konkurenci są, marki nie ma</SL>
                <Explain type="warn">Przy tych popularnych zapytaniach AI wymienia konkurentów ale pomija markę klienta. To priorytetowe tematy do pokrycia contentem.</Explain>
                {topGapKws.map(([kw,{vol,comps}],i)=>(
                  <div key={i} style={{padding:"5px 8px",background:i%2===0?"#130306":"transparent",borderRadius:5,marginTop:2}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:12,color:"#c0dce8",flex:1,marginRight:8,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{kw}</span>
                      {vol>0&&<span style={{fontSize:10,color:"#4a7090",fontFamily:"monospace",background:"#040e1a",padding:"1px 7px",borderRadius:4,flexShrink:0}}>{fmtN(vol)}/mies.</span>}
                    </div>
                    <div style={{fontSize:10,color:"#e08090",marginTop:2}}>AI wymienia: {comps.join(", ")}</div>
                  </div>
                ))}
              </Card>}
            </div>}

            {/* Section cards */}
            <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:16}}>
              {sectionDefs.map(s=>{
                const isOk = s.ok !== false;
                const checked = s.key==="recs" ? recs.length>0 : reportChecks[s.id]===true;
                const isRecs = s.key==="recs";
                return (
                  <div key={s.id} style={{borderRadius:12,border:"2px solid "+(checked?s.color+"66":isOk?s.color+"22":S.border),background:checked?s.color+"06":S.navy2,transition:"all .2s",opacity:isOk?1:0.4}}>
                    {/* Header */}
                    <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:"1px solid "+(checked?s.color+"33":S.border)}}>
                      <span style={{fontSize:18}}>{s.icon}</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:800,color:checked?s.color:S.text}}>{s.label}</div>
                        <div style={{fontSize:11,color:"#6090a8",marginTop:2,lineHeight:1.5}}>{s.what}</div>
                      </div>
                      {!isOk&&<span style={{fontSize:10,color:"#3a5070",background:"#0a1a28",borderRadius:5,padding:"2px 8px"}}>brak danych</span>}
                      {isOk&&!isRecs&&(
                        <label style={{display:"flex",alignItems:"center",gap:7,cursor:"pointer",padding:"6px 12px",background:checked?s.color+"22":"#030c18",border:"1px solid "+(checked?s.color+"66":S.border),borderRadius:8,flexShrink:0}}>
                          <input type="checkbox" checked={checked} onChange={e=>setReportChecks(r=>({...r,[s.id]:e.target.checked}))} style={{width:14,height:14,accentColor:s.color}}/>
                          <span style={{fontSize:11,fontWeight:700,color:checked?s.color:"#5090a8",whiteSpace:"nowrap"}}>{checked?"✓ Sprawdzone":"Sprawdziłem"}</span>
                        </label>
                      )}
                      {isOk&&isRecs&&(
                        <div style={{fontSize:10,color:recs.length>0?s.color:"#4a7090",fontWeight:700,whiteSpace:"nowrap"}}>
                          {recs.length>0?"✓ "+recs.length+" punkt"+(recs.length>1?"ów":"")+" dodanych":"Dodaj min. 1 punkt"}
                        </div>
                      )}
                    </div>
                    {/* Hint */}
                    {isOk&&<div style={{padding:"6px 16px",background:s.color+"08",fontSize:10,color:s.color+"bb",borderBottom:"1px solid "+s.color+"11"}}>
                      ℹ️ {s.hint}
                    </div>}
                    {/* Content */}
                    {isOk&&!isRecs&&(
                      <div style={{padding:"12px 16px"}}>
                        <textarea value={getSec(s.key)} onChange={e=>updateSection(s.key,e.target.value)}
                          style={{width:"100%",boxSizing:"border-box",background:"#020a14",border:"1px solid "+(checked?"#0e2030":S.border),borderRadius:7,padding:"10px 12px",color:"#c0dce8",fontSize:12,lineHeight:1.8,outline:"none",resize:"vertical",minHeight:65,fontFamily:"inherit"}}/>
                        {reportSections[s.key]!==null&&reportSections[s.key]!==undefined&&(
                          <button onClick={()=>updateSection(s.key,null)} style={{marginTop:4,fontSize:10,color:"#3a6070",background:"none",border:"none",cursor:"pointer",padding:0}}>↺ Przywróć auto-tekst</button>
                        )}
                      </div>
                    )}
                    {/* Recommendations builder */}
                    {isOk&&isRecs&&(
                      <div style={{padding:"14px 16px"}}>
                        <div style={{display:"flex",gap:10,marginBottom:12,alignItems:"center"}}>
                          <button onClick={addRec} style={{padding:"8px 16px",background:S.gold+"22",border:"1px solid "+S.gold+"55",borderRadius:8,color:S.gold,fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Dodaj punkt rekomendacji</button>
                          <div style={{fontSize:11,color:"#5090a8"}}>Każdy punkt możesz rozwinąć o podpunkty i komentarz dla klienta.</div>
                        </div>
                        {recs.length===0&&(
                          <div style={{padding:"14px 16px",background:"#0a0800",border:"1px dashed #3a3000",borderRadius:8,fontSize:12,color:"#5a4500",textAlign:"center"}}>
                            Kliknij "+ Dodaj punkt rekomendacji" żeby dodać pierwszą rekomendację. Możesz dodać tyle ile chcesz — każdą edytujesz osobno.
                          </div>
                        )}
                        {recs.map((rec,ri)=>(
                          <div key={rec.id} style={{marginBottom:10,background:"#040c14",border:"1px solid #1a3050",borderRadius:9,overflow:"hidden"}}>
                            <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:"#030a12",borderBottom:"1px solid #0e2030"}}>
                              <span style={{fontSize:13,fontWeight:900,color:S.gold,minWidth:24}}>{ri+1}.</span>
                              <input value={rec.text} onChange={e=>updateRec(rec.id,"text",e.target.value)}
                                placeholder={"Wpisz rekomendację nr "+(ri+1)+" — np. Stwórz 5 artykułów FAQ o nożach EDC"}
                                style={{flex:1,background:"transparent",border:"none",color:"#c0dce8",fontSize:12,fontWeight:600,outline:"none",fontFamily:"inherit"}}/>
                              <button onClick={()=>removeRec(rec.id)} style={{color:"#3a5070",background:"none",border:"none",cursor:"pointer",fontSize:16,lineHeight:1,padding:0}}>×</button>
                            </div>
                            <div style={{padding:"8px 12px"}}>
                              <input value={rec.note} onChange={e=>updateRec(rec.id,"note",e.target.value)}
                                placeholder="Opcjonalny komentarz / uzasadnienie dla klienta (np. bo Militaria.pl pojawia się przy tym zapytaniu 500 razy)"
                                style={{width:"100%",boxSizing:"border-box",background:"#020810",border:"1px solid #0e2030",borderRadius:6,padding:"6px 10px",color:"#7aabbf",fontSize:11,outline:"none",fontFamily:"inherit",marginBottom:rec.subs.length>0?8:0}}/>
                              {rec.subs.length>0&&<div style={{marginTop:8,borderLeft:"2px solid #1a3050",paddingLeft:10}}>
                                {rec.subs.map((sub,si)=>(
                                  <div key={sub.id} style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}>
                                    <span style={{fontSize:10,color:"#3a6080",minWidth:28,flexShrink:0}}>{ri+1}.{si+1}.</span>
                                    <input value={sub.text} onChange={e=>updateSub(rec.id,sub.id,e.target.value)}
                                      placeholder={"Podpunkt "+(si+1)+" — uszczegółowienie"}
                                      style={{flex:1,background:"#020c18",border:"1px solid #0e2030",borderRadius:6,padding:"5px 10px",color:"#90b8cc",fontSize:11,outline:"none",fontFamily:"inherit"}}/>
                                    <button onClick={()=>removeSub(rec.id,sub.id)} title="Usuń podpunkt" style={{color:"#2a4050",background:"none",border:"none",cursor:"pointer",fontSize:15,padding:"0 2px",lineHeight:1}}>×</button>
                                  </div>
                                ))}
                              </div>}
                              <button onClick={()=>addSub(rec.id)} style={{marginTop:7,fontSize:10,color:"#4a8090",background:"#030c18",border:"1px solid #1a3040",borderRadius:5,padding:"4px 10px",cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
                                <span style={{fontSize:12}}>+</span> Dodaj podpunkt
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Generate */}
            <div style={{padding:"14px 16px",background:readyToGenerate?"#001a08":"#030c18",border:"1px solid "+(readyToGenerate?S.green+"44":S.border),borderRadius:10,marginBottom:14}}>
              {readyToGenerate
                ? <div style={{fontSize:12,color:S.green,fontWeight:700,marginBottom:10}}>✅ Wszystkie sekcje zatwierdzone — raport gotowy!</div>
                : <div style={{fontSize:12,color:"#5090a8",marginBottom:10}}>Pozostało do zatwierdzenia: {remaining} {remaining===1?"sekcja":"sekcji"} — przejdź przez listę powyżej.</div>
              }
              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>{const html=buildReportHTML({...buildArgs(),finalComment,recsHtml});const w=window.open("","_blank");if(w){w.document.write(html);w.document.close();}}} disabled={!readyToGenerate}
                  style={{padding:"10px 20px",background:readyToGenerate?S.green+"22":"transparent",border:"1px solid "+(readyToGenerate?S.green+"66":S.border),borderRadius:9,color:readyToGenerate?S.green:"#3a6080",fontSize:13,fontWeight:700,cursor:readyToGenerate?"pointer":"not-allowed"}}>🔍 Otwórz podgląd</button>
                <button onClick={()=>{const html=buildReportHTML({...buildArgs(),finalComment,recsHtml});const a=document.createElement("a");a.href="data:text/html;charset=utf-8,"+encodeURIComponent(html);a.download="Sempai_AIVisibility_"+(brand.name||"Raport")+"_"+new Date().toISOString().slice(0,10)+".html";a.click();}} disabled={!readyToGenerate}
                  style={{padding:"10px 20px",background:readyToGenerate?S.sky+"22":"transparent",border:"1px solid "+(readyToGenerate?S.sky+"66":S.border),borderRadius:9,color:readyToGenerate?S.sky:"#3a6080",fontSize:13,fontWeight:700,cursor:readyToGenerate?"pointer":"not-allowed"}}>⬇ Pobierz HTML</button>
              </div>
            </div>

            <Card><SL>Podgląd KPI</SL>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:9}}>
                {[{l:"AI SOV",v:globalSOV+"%",c:S.green},{l:"Wzmianki",v:fmtN(totalM),c:S.purple},{l:"Cytowania",v:fmtN(totalC),c:S.coral},{l:"Zapytań",v:fmtN(totalQ),c:S.gold}].map((k,i)=>(
                  <div key={i} style={{textAlign:"center",padding:"11px",background:"#020a14",borderRadius:8,border:"1px solid "+k.c+"22"}}>
                    <div style={{fontSize:9,color:"#4a7090",textTransform:"uppercase",letterSpacing:"1px",marginBottom:3}}>{k.l}</div>
                    <div style={{fontSize:20,fontWeight:900,color:k.c}}>{k.v}</div>
                  </div>
                ))}
              </div>
            </Card>
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
                "AI Share of Voice (SOV): "+globalSOV+"%",
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

function buildReportHTML({brand,proc,totalQ,totalM,totalC,totalWB,avgSOV,globalSOV,allComps,compCounts,best,worst,topBrandKws,topGapKws,allGapKws,editableComment,totalCompM,top5CompM,finalComment,recsHtml}) {
  function fN(n){return(n||0).toLocaleString("pl-PL");}
  function fP(n,d){if(!d)return"0%";const v=(n/d)*100;if(v===0)return"0%";if(v<1)return v.toFixed(1)+"%";return Math.round(v)+"%";}
  function cSOV(m,cs){const ct=Object.values(cs||{}).reduce((s,v)=>s+v,0);return m+ct>0?Math.round((m/(m+ct))*100):0;}
  const date=new Date().toLocaleDateString("pl-PL",{year:"numeric",month:"long",day:"numeric"});
  const sov = globalSOV || avgSOV || 0;

  // Parse finalComment into styled sections
  // Each section starts with "## label" line
  function buildSections(src) {
    if (!src) return "<p style=\"color:#6a7a8a\">Brak komentarza analitycznego.</p>";
    const lines = src.split("\n");
    let html = "";
    let colors = ["#2edf8f","#4da6ff","#a78bfa","#ff5c6a","#f5c842"];
    let secIdx = -1;
    let inSection = false;
    let secBuf = [];
    function flushSection(label, buf, idx) {
      const col = colors[idx % colors.length];
      const paras = buf.filter(Boolean).map(l=>{
        if (l.startsWith("•") || /^\d+\./.test(l)) {
          return "<li style=\"margin:0 0 6px 0;padding-left:4px\">" + l.replace(/^[•\d]+\.?\s*/,"") + "</li>";
        }
        return "<p style=\"margin:0 0 10px 0;color:#2a3a4a;line-height:1.75\">" + l + "</p>";
      });
      const hasList = paras.some(p=>p.startsWith("<li"));
      const inner = hasList
        ? "<ul style=\"margin:10px 0;padding-left:18px;color:#2a3a4a;line-height:1.75\">" + paras.join("") + "</ul>"
        : paras.join("");
      return "<div style=\"background:#f8faff;border:1px solid #e0eaf5;border-left:4px solid "+col+";border-radius:8px;padding:16px 18px;margin-bottom:16px\">"
        + (label ? "<div style=\"font-size:12px;font-weight:800;color:"+col+";margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px\">" + label + "</div>" : "")
        + inner + "</div>";
    }
    lines.forEach(line => {
      if (line.startsWith("##")) {
        if (inSection && secBuf.length) { html += flushSection(secLabel, secBuf, secIdx); secBuf=[]; }
        secLabel = line.replace(/^##\s*/, "").trim();
        secIdx++;
        inSection = true;
      } else if (inSection) {
        secBuf.push(line);
      } else {
        if (line.trim()) html += "<p style=\"margin:0 0 10px 0;color:#2a3a4a\">" + line + "</p>";
      }
    });
    if (inSection && secBuf.length) html += flushSection(secLabel, secBuf, secIdx);
    return html || "<p style=\"color:#6a7a8a\">Brak danych.</p>";
  }
  var secLabel = "";
  const commentSrc = finalComment || editableComment || "Analiza obejmuje "+fN(totalQ)+" zapytań.";
  const commentHtml = buildSections(commentSrc);
  const commentP = commentHtml; // alias for backward compat
  const rows=PLATFORMS.filter(p=>proc[p.id].total>0).map(p=>{const d=proc[p.id];const sov=cSOV(d.mentions,d.compSet);const mr=d.withAnyBrand>0?Math.round((d.mentions/d.withAnyBrand)*100):0;const cr=d.total>0?Math.round((d.citations/d.total)*100):0;return"<tr><td><span style='background:"+p.color+"18;color:"+p.color+";padding:2px 8px;border-radius:5px;font-size:11px;font-weight:700'>"+p.icon+" "+p.name+"</span></td><td>"+fN(d.total)+"</td><td>"+fN(d.withAnyBrand)+"</td><td style='color:#1db872;font-weight:700'>"+fN(d.mentions)+"</td><td style='color:#2a7abf;font-weight:700'>"+fN(d.citations)+"</td><td><div style='display:flex;align-items:center;gap:8px'><div style='width:55px;height:7px;background:#e0eaf5;border-radius:3px;overflow:hidden'><div style='width:"+Math.min(sov,100)+"%;height:100%;background:"+p.color+"'></div></div><strong>"+sov+"%</strong></div></td><td style='color:"+(mr>=10?"#1db872":mr>=2?"#d4a017":"#e03050")+"'>"+mr+"%</td><td style='color:"+(cr>=10?"#1db872":cr>=2?"#d4a017":"#e03050")+"'>"+cr+"%</td></tr>";}).join("");
  const compHtml=allComps.length>0?"<section><h2><span class='num'>02</span> Konkurenci z danych AI</h2><div class='explain'><strong>Skąd dane?</strong> Kolumna Mentions w plikach CSV — marki wymieniane przez AI w tych samych odpowiedziach co Twoja branża.</div><table><thead><tr><th>Marka</th><th>Wzmianki AI</th><th>vs. "+(brand.name||"Twoja marka")+"</th></tr></thead><tbody><tr class='bench'><td><span style='background:#2edf8f18;color:#1db872;padding:2px 8px;border-radius:5px;font-size:11px;font-weight:700'>&#10022; "+(brand.name||"Twoja marka")+"</span></td><td><strong style='color:#1db872'>"+fN(totalM)+"</strong></td><td><span style='background:#2edf8f18;color:#1db872;padding:2px 6px;border-radius:4px;font-size:10px'>Benchmark</span></td></tr>"+allComps.slice(0,8).map(c=>{const diff=totalM-compCounts[c];return"<tr><td>"+c+"</td><td>"+fN(compCounts[c])+"</td><td style='color:"+(diff>=0?"#1db872":"#e03050")+"'>"+(diff>=0?"+":"")+diff+"</td></tr>";}).join("")+"</tbody></table></section>":"";
  const bHtml=topBrandKws.length>0?"<table><thead><tr><th>Zapytanie</th><th style='text-align:right'>Wolumen</th></tr></thead><tbody>"+topBrandKws.map(([kw,vol])=>"<tr><td>"+kw+"</td><td style='text-align:right;color:#4a7090;font-size:11px'>"+fN(vol)+"</td></tr>").join("")+"</tbody></table>":"<p style='color:#4a7090;font-size:12px'>Brak danych</p>";
  const gapList=topGapKws&&topGapKws.length>0?topGapKws:(allGapKws||topGapKws);const gHtml=gapList&&gapList.length>0?"<table><thead><tr><th>Zapytanie</th><th>AI wymienia</th><th style='text-align:right'>Vol.</th></tr></thead><tbody>"+gapList.map(([kw,{vol,comps}])=>"<tr><td>"+kw+"</td><td style='color:#e03050;font-size:11px'>"+comps.join(", ")+"</td><td style='text-align:right;color:#4a7090;font-size:11px'>"+fN(vol)+"</td></tr>").join("")+"</tbody></table>":"<p style='color:#4a7090;font-size:12px'>Brak danych</p>";
  const css="body{font-family:'DM Sans',sans-serif;background:#fff;color:#1a2a3a;font-size:14px;line-height:1.6;margin:0}.page{max-width:960px;margin:0 auto;padding:46px 42px}.header{border-bottom:3px solid #2edf8f;padding-bottom:22px;margin-bottom:28px}h1{font-size:24px;font-weight:900;color:#07111f;margin-bottom:5px}.meta{color:#4a7090;font-size:13px}.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:13px;margin-bottom:28px}.kpi{background:#f8faff;border:1px solid #dde8f5;border-radius:11px;padding:16px 13px;border-top:3px solid}.kl{font-size:9px;text-transform:uppercase;letter-spacing:1px;font-weight:700;color:#4a7090;margin-bottom:6px}.kv{font-size:26px;font-weight:900;line-height:1;margin-bottom:3px}.ks{font-size:10px;color:#8899aa}.ke{font-size:10px;color:#3a5a70;line-height:1.5;margin-top:5px;padding-top:5px;border-top:1px solid #e0eaf5;font-family:monospace}section{margin-bottom:32px}h2{font-size:17px;font-weight:900;color:#07111f;margin-bottom:14px;padding-bottom:9px;border-bottom:2px solid #eef2f8;display:flex;align-items:center;gap:10px}.num{display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:28px;background:#2edf8f22;border-radius:7px;color:#0a7a40;font-size:13px;font-weight:900;padding:0 6px}table{width:100%;border-collapse:collapse;font-size:12px}thead tr{background:#f2f7ff}th{padding:8px 10px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.7px;font-weight:700;color:#4a7090;border-bottom:2px solid #dde8f5}td{padding:8px 10px;border-bottom:1px solid #f0f5fb;vertical-align:middle}tr:last-child td{border-bottom:none}.bench td{background:#f0fff8!important;font-weight:600}.explain{background:#f0f7ff;border:1px solid #c8dff5;border-left:4px solid #4da6ff;border-radius:6px;padding:9px 13px;margin-bottom:12px;font-size:11px;color:#2a4a6a;line-height:1.6}.warn{background:#fff8e6;border:1px solid #f5c842;border-radius:6px;padding:7px 11px;margin-bottom:12px;font-size:11px;color:#7a6000}.kw-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.comment-box{background:#f8faff;border:1px solid #dde8f5;border-left:4px solid #2edf8f;border-radius:8px;padding:18px 20px}.comment-box p{margin-bottom:9px;color:#2a3a4a;line-height:1.75}.comment-box p:last-child{margin-bottom:0}.footer{margin-top:44px;padding-top:18px;border-top:1px solid #e8f0f5;display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#4a7090}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}@page{margin:1.5cm}}";
  return "<!DOCTYPE html><html lang='pl'><head><meta charset='UTF-8'><title>Sempai AI Visibility — "+(brand.name||"Raport")+"</title><style>"+css+"</style></head><body><div class='page'><div class='header'><div style='display:flex;align-items:center;gap:9px;margin-bottom:12px'><img src='https://sempai.pl/wp-content/uploads/2023/01/Sempai_logo_granat.svg' alt='Sempai' style='height:28px;width:auto;display:block;'><span style='font-size:10px;font-weight:700;color:#2edf8f;background:#2edf8f15;border:1px solid #2edf8f44;border-radius:4px;padding:2px 6px;letter-spacing:1px;text-transform:uppercase'>AI Visibility</span></div><h1>Raport Widoczno&#347;ci AI</h1><p class='meta'>Klient: <strong>"+(brand.name||"—")+"</strong>"+(brand.url?" &middot; <strong>"+brand.url+"</strong>":"+")+" &middot; "+date+"</p></div><div class='kpi-grid'><div class='kpi' style='border-top-color:#2edf8f'><div class='kl'>AI Share of Voice</div><div class='kv' style='color:#2edf8f'>"+avgSOV+"%</div><div class='ks'>"+(avgSOV>=30?"Silna pozycja":avgSOV>=10?"Umiarkowana":"Niska — priorytet dzia&#322;a&#324;")+"</div><div class='ke'>"+fN(totalM)+" wzmianek ÷ "+fN(totalM+(totalCompM||0))+" &#322;&#261;cznie = "+avgSOV+"%</div></div><div class='kpi' style='border-top-color:#a78bfa'><div class='kl'>Mention Rate</div><div class='kv' style='color:#a78bfa'>"+fP(totalM,totalWB)+"</div><div class='ks'>"+(totalM>=5?"AI cz&#281;sto wymienia mark&#281;":totalM>=1?"AI sporadycznie wymienia":"AI nie wymienia nazwy marki")+"</div><div class='ke'>"+fN(totalM)+" wzmianek ÷ "+fN(totalWB)+" zapytań z markami</div></div><div class='kpi' style='border-top-color:#ff5c6a'><div class='kl'>Citation Rate</div><div class='kv' style='color:#ff5c6a'>"+fP(totalC,totalQ)+"</div><div class='ks'>"+(totalC>=5?"Strona cz&#281;sto cytowana":totalC>=1?"Strona sporadycznie cytowana":"Strona rzadko cytowana")+"</div><div class='ke'>"+fN(totalC)+" cytowań ÷ "+fN(totalQ)+" zapytań</div></div><div class='kpi' style='border-top-color:#f5c842'><div class='kl'>&#322;&#261;czne zapytania</div><div class='kv' style='color:#f5c842'>"+fN(totalQ)+"</div><div class='ks'>"+PLATFORMS.filter(p=>proc[p.id].total>0).length+" platform z danymi</div><div class='ke'>Z jak&#261;kolwiek mark&#261;: "+fN(totalWB)+"</div></div></div>"+"<div style='background:#f4fff8;border:1px solid #b0e8c0;border-left:5px solid #2edf8f;border-radius:10px;padding:22px 24px;margin-bottom:24px;font-size:13px;line-height:1.9'>"+"<div style='font-weight:900;font-size:17px;color:#0a6a40;margin-bottom:18px'>📐 Jak liczymy każdą metrykę — krok po kroku</div>"+"<div style='background:#e4f7ee;border-radius:8px;padding:14px 16px;margin-bottom:14px'>"+"<div style='font-weight:800;color:#0a5a30;font-size:14px;margin-bottom:8px'>① AI Share of Voice (SOV) = <span style='color:#0a7a40;font-size:16px'>"+sov+"%</span></div>"+"<div style='color:#1a4a30;margin-bottom:10px'><strong>Co to znaczy:</strong> Jaki procent wszystkich wzmianek marek w odpowiedziach AI należy do Twojej marki? Wyobraź sobie że AI ma 1000 wypowiedzi o tej branży — w ilu pojawia się Twoja marka?</div>"+"<div style='font-family:monospace;font-size:12px;background:#d8f0e4;padding:12px 14px;border-radius:7px;line-height:2.4;color:#0a4028'>"+"Krok 1: Ile razy AI wymienił Twoją markę? → "+fN(totalM)+" wzmianek<br>"+"Krok 2: Ile razy AI wymienił top 5 konkurentów? → "+fN(top5CompM||0)+" wzmianek<br>"+"Krok 3: Łącznie: "+fN(totalM)+" + "+fN(top5CompM||0)+" = "+fN(totalM+(top5CompM||0))+" wzmianek<br>"+"Krok 4: "+fN(totalM)+" ÷ "+fN(totalM+(top5CompM||0))+" × 100 = <strong style='font-size:16px;color:#0a7a40'>"+sov+"%</strong></div>"+"<div style='margin-top:10px;font-size:11px;color:#206040;background:#e0f5ea;padding:8px 12px;border-radius:5px'><strong>Dlaczego Ahrefs Brand Radar pokazuje inny %:</strong> Ahrefs waży każdą wzmiankę wolumenem wyszukiwań zapytania — popularne frazy mają większą wagę. My liczymy każdą wzmiankę jako 1. Dlatego nasze % są zazwyczaj niższe ale bardziej konserwatywne.</div>"+"</div>"+"<div style='background:#f0eeff;border-radius:8px;padding:14px 16px;margin-bottom:14px'>"+"<div style='font-weight:800;color:#3a1090;font-size:14px;margin-bottom:8px'>② Mentions (wzmianki) = <span style='color:#5010b0;font-size:16px'>"+fN(totalM)+"</span></div>"+"<div style='color:#2a1060;margin-bottom:10px'><strong>Co to znaczy:</strong> Ile razy AI napisał nazwę Twojej marki w odpowiedzi? Sprawdzamy kolumnę Mentions w każdym wierszu pliku CSV.</div>"+"<div style='font-family:monospace;font-size:12px;background:#e8e0ff;padding:12px 14px;border-radius:7px;line-height:2.4;color:#2a1060'>"+"Krok 1: Plik CSV ma "+fN(totalQ)+" wierszy (każdy = jedno zapytanie AI)<br>"+"Krok 2: Sprawdzamy kolumnę Mentions w każdym wierszu<br>"+"Krok 3: Jeśli zawiera nazwę marki → +1 do licznika<br>"+"Wynik: <strong style='font-size:16px;color:#5010b0'>"+fN(totalM)+"</strong> wierszy z nazwą marki z "+fN(totalQ)+" łącznie</div>"+"</div>"+"<div style='background:#e8f4ff;border-radius:8px;padding:14px 16px;margin-bottom:14px'>"+"<div style='font-weight:800;color:#0a3070;font-size:14px;margin-bottom:8px'>③ Citations (cytowania) = <span style='color:#0a4090;font-size:16px'>"+fN(totalC)+"</span></div>"+"<div style='color:#1a3050;margin-bottom:10px'><strong>Co to znaczy:</strong> Ile razy AI dodał link do Twojej strony? To inna rzecz niż wzmianka — AI może Cię linkować bez wymieniania nazwy (anonimowy ekspert) lub wymieniać bez linka.</div>"+"<div style='font-family:monospace;font-size:12px;background:#d8ecff;padding:12px 14px;border-radius:7px;line-height:2.4;color:#0a2848'>"+"Krok 1: Sprawdzamy kolumnę Link URL w każdym wierszu CSV<br>"+"Krok 2: Jeśli URL zawiera Twoją domenę → +1 do licznika<br>"+"Wynik: <strong style='font-size:16px;color:#0a4090'>"+fN(totalC)+"</strong> wierszy z linkiem do domeny ("+fP(totalC,totalQ)+" zapytań)</div>"+"</div>"+"<div style='background:#fff3f0;border-radius:8px;padding:14px 16px;margin-bottom:14px'>"+"<div style='font-weight:800;color:#7a2010;font-size:14px;margin-bottom:8px'>④ Estimated Impressions = <span style='color:#b03010;font-size:16px'>"+fN(totalImpressions||0)+"</span></div>"+"<div style='color:#5a2010;margin-bottom:10px'><strong>Co to znaczy:</strong> To NIE są kliknięcia. To suma miesięcznych wyszukiwań dla zapytań gdzie AI wymienił markę. Ile razy miesięcznie ludzie zadają pytania, na które AI odpowiada wymieniając Twoją markę.</div>"+"<div style='font-family:monospace;font-size:12px;background:#ffe8e0;padding:12px 14px;border-radius:7px;line-height:2.4;color:#4a1008'>"+"Krok 1: Bierzemy tylko zapytania z wzmianką marki ("+fN(totalM)+" szt.)<br>"+"Krok 2: Dla każdego patrzymy na kolumnę Volume (ile wyszukiwań/mies.)<br>"+"Krok 3: Sumujemy wszystkie Volume<br>"+"Wynik: <strong style='font-size:16px;color:#b03010'>"+fN(totalImpressions||0)+"</strong> potencjalnych wyświetleń miesięcznie (nie kliknięć!)</div>"+"</div>"+"<div style='background:#fffbe8;border-radius:8px;padding:14px 16px;margin-bottom:14px'>"+"<div style='font-weight:800;color:#6a4a00;font-size:14px;margin-bottom:8px'>⑤ Visibility Gap (luki) = <span style='color:#806000;font-size:16px'>"+fN(totalGapQueries||0)+" zapytań</span></div>"+"<div style='color:#4a3000;margin-bottom:10px'><strong>Co to znaczy:</strong> Ile zapytań obsługuje AI dla konkurentów, a pomija Twoją markę? Każde takie zapytanie to temat do pokrycia contentem.</div>"+"<div style='font-family:monospace;font-size:12px;background:#fff3c0;padding:12px 14px;border-radius:7px;line-height:2.4;color:#3a2800'>"+"Krok 1: Dla każdego zapytania: czy AI wymienił konkurenta? <br>"+"Krok 2: Jeśli tak → czy wymienił też Twoją markę?<br>"+"Krok 3: Konkurent TAK, Twoja marka NIE → luka!<br>"+"Wynik: <strong style='font-size:16px;color:#806000'>"+fN(totalGapQueries||0)+"</strong> zapytań do pokrycia contentem</div>"+"</div>"+(allComps.length>0 ? "<div style='background:#f8f4ff;border-radius:8px;padding:14px 16px;border-top:2px solid #d0c0ff'>"+"<div style='font-weight:800;color:#3a1090;font-size:13px;margin-bottom:10px'>Wszyscy konkurenci wykryci w danych — dodaj ich w Brand Radar</div>"+"<table><thead><tr><th>#</th><th>Marka</th><th style='text-align:right'>Wzmianki AI</th><th style='text-align:right'>% mianownika SOV</th></tr></thead><tbody>"+allComps.slice(0,30).map((c,i)=>{const cnt=compCounts[c]||0;const pct=totalCompM>0?Math.round((cnt/totalCompM)*100):0;return "<tr><td style='color:#8899aa'>"+(i+1)+"</td><td style='font-family:monospace;font-weight:600'>"+c+"</td><td style='text-align:right;font-family:monospace;color:#1a4a30'>"+fN(cnt)+"</td><td style='text-align:right;color:#4a7090'>"+pct+"%</td></tr>";}).join("")+(allComps.length>30 ? "<tr><td colspan=\"4\" style=\"color:#8899aa;text-align:center;font-size:11px\">... i "+(allComps.length-30)+" więcej</td></tr>" : "")+"</tbody></table></div></div>"<section><h2><span class='num'>01</span>" AI Share of Voice &mdash; per platforma</h2><div class='explain'>Wzmianki = kolumna Mentions zawiera nazw&#281; marki. &quot;Z mark&#261;&quot; = zapytania gdzie jakakolwiek marka si&#281; pojawia. SOV = wzmianek marki ÷ (wzmianek marki + wzmianek konkurent&oacute;w).</div><table><thead><tr><th>Platforma</th><th>Zapyta&#324;</th><th>Z mark&#261;</th><th>Wzmianki</th><th>Cytowania</th><th>SOV %</th><th>Mention Rate</th><th>Citation Rate</th></tr></thead><tbody>"+rows+"</tbody></table></section>"+compHtml+"<section><h2><span class='num'>03</span> Zapytania — obecno&#347;&#263; marki</h2><div class='kw-grid'><div><h3 style='font-size:12px;font-weight:700;color:#1db872;margin-bottom:8px'>&#127919; Z wzmianką marki</h3>"+bHtml+"</div><div><h3 style='font-size:12px;font-weight:700;color:#e03050;margin-bottom:8px'>&#9888; Luki — marka nieobecna</h3>"+gHtml+"</div></div></section><section><h2><span class='num'>04</span> Komentarz analityczny i rekomendacje</h2><div class='comment-box'>"+commentP+"</div></section><div class='footer'><div><strong style='color:#07111f'>sempai &middot; Let us perform!</strong><div style='margin-top:2px'>sempai.pl</div></div><div>Wygenerowano: "+date+"</div></div></div></body></html>";
}
