import React, { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";

const C={navy1:"#07111f",navy2:"#0c1a2e",navy3:"#112240",navy4:"#1a3358",green:"#2edf8f",coral:"#ff5c6a",gold:"#f5c842",sky:"#4da6ff",purple:"#a78bfa",text:"#e8f0ff",muted:"#7aabbf",border:"#1a3354"};
const PLATS=[{id:"ai_overview",name:"AI Overview",color:C.sky,icon:"G"},{id:"ai_mode",name:"AI Mode",color:"#34d399",icon:"M"},{id:"chatgpt",name:"ChatGPT",color:C.green,icon:"⚡"},{id:"gemini",name:"Gemini",color:C.coral,icon:"◆"},{id:"perplexity",name:"Perplexity",color:C.purple,icon:"◈"},{id:"copilot",name:"Copilot",color:C.gold,icon:"✦"}];
const INDUSTRIES=[
  {id:"ecom_fashion",label:"Moda / odzież / obuwie",icon:"👗",stop:["nóż","broń","wiertarka","ogród","mebel"]},
  {id:"ecom_sport",label:"Sport / outdoor / EDC",icon:"🏕️",stop:["ekspres","kosmetyki","biżuteria","kredyt","mebel"]},
  {id:"ecom_beauty",label:"Kosmetyki / uroda / zdrowie",icon:"💄",stop:["nóż","broń","wiertarka","mebel","ogród"]},
  {id:"ecom_home",label:"Dom / meble / wyposażenie",icon:"🏡",stop:["nóż","broń","sport","ekspres","kosmetyki"]},
  {id:"ecom_tech",label:"Elektronika / komputery",icon:"💻",stop:["nóż","broń","ogród","mebel","biżuteria"]},
  {id:"ecom_food",label:"Żywność / suplementy / apteka",icon:"🥗",stop:["nóż","broń","elektronika","laptop","mebel"]},
  {id:"ecom_other",label:"Inny sklep e-commerce",icon:"🛒",stop:[]},
  {id:"brand",label:"Producent / marka własna",icon:"🏷️",stop:[]},
  {id:"agency",label:"Agencja / SaaS / usługi B2B",icon:"⚙️",stop:["nóż","broń","mebel","ogród","dieta"]},
  {id:"blog",label:"Blog / portal / media",icon:"📝",stop:[]},
  {id:"local",label:"Usługi lokalne / gastronomia",icon:"📍",stop:["laptop","elektronika","mebel"]},
  {id:"finance",label:"Finanse / ubezpieczenia",icon:"💰",stop:["nóż","broń","ogród","dieta"]},
  {id:"other",label:"Inna branża",icon:"🔷",stop:[]},
];
function isRelGap(kw,ind){
  if(!ind)return true;
  var x=INDUSTRIES.find(function(i){return i.id===ind;});
  if(!x||!x.stop.length)return true;
  var kl=kw.toLowerCase();
  return !x.stop.some(function(w){return kl.includes(w);});
}
function fmtN(n){return(n||0).toLocaleString("pl-PL");}
function fmtP(n,d){if(!d)return"0%";var v=(n/d)*100;if(v===0)return"0%";if(v<1)return v.toFixed(1)+"%";return Math.round(v)+"%";}
function decodeBuffer(buf){
  var b=new Uint8Array(buf);
  if((b[0]===0xFF&&b[1]===0xFE)||(b[0]===0xFE&&b[1]===0xFF))return new TextDecoder("utf-16").decode(buf);
  if(b[0]===0xEF&&b[1]===0xBB&&b[2]===0xBF)return new TextDecoder("utf-8").decode(buf).slice(1);
  return new TextDecoder("utf-8").decode(buf);
}
function parseCSV(text){
  var fl=text.indexOf("\n"),line=fl>0?text.slice(0,fl):text,tabs=0,commas=0,inQ=false;
  for(var ci=0;ci<line.length;ci++){var ch=line[ci];if(ch==='"')inQ=!inQ;else if(!inQ){if(ch==="\t")tabs++;else if(ch===",")commas++;}}
  var sep=tabs>commas?"\t":",",rows=[],row=[],cell="",iq=false;
  for(var i=0;i<text.length;i++){
    var c=text[i],nx=text[i+1];
    if(c==='"'){if(iq&&nx==='"'){cell+='"';i++;}else iq=!iq;}
    else if(c===sep&&!iq){row.push(cell);cell="";}
    else if((c==="\n"||(c==="\r"&&nx==="\n"))&&!iq){if(c==="\r")i++;row.push(cell);cell="";if(row.some(function(x){return x.trim();}))rows.push(row.map(function(x){return x.trim();}));row=[];}
    else cell+=c;
  }
  if(cell||row.length){row.push(cell);if(row.some(function(x){return x.trim();}))rows.push(row.map(function(x){return x.trim();}));}
  return rows;
}
function cleanH(h){var s=h.trim();if(s[0]==='"')s=s.slice(1);if(s[s.length-1]==='"')s=s.slice(0,-1);return s.trim();}
function detectPlat(headers,fname,rows){
  var fn=(fname||"").toLowerCase();
  if(fn.includes("chatgpt")||fn.includes("gpt"))return"chatgpt";
  if(fn.includes("gemini"))return"gemini";
  if(fn.includes("perplexity"))return"perplexity";
  if(fn.includes("copilot"))return"copilot";
  if(fn.includes("ai_mode")||fn.includes("ai-mode"))return"ai_mode";
  if(fn.includes("overview")&&!fn.includes("web")&&!fn.includes("search"))return"ai_overview_ambiguous";
  var h=headers.map(function(x){return x.toLowerCase().trim();});
  if(h.some(function(x){return x==="ai mode";}))return"ai_mode";
  if(h.some(function(x){return x==="ai overview";}))return"ai_overview_ambiguous";
  if(rows&&rows.length>0){
    var mi2=h.indexOf("model");
    if(mi2>=0){var vals=rows.slice(0,20).map(function(r){return(r[mi2]||"").toLowerCase();}).join(" ");if(vals.includes("chatgpt")||vals.includes("gpt"))return"chatgpt";if(vals.includes("gemini"))return"gemini";if(vals.includes("perplexity"))return"perplexity";if(vals.includes("copilot"))return"copilot";}
  }
  return null;
}
function parseFile(buf,fname,bv){
  var text=decodeBuffer(buf),rows=parseCSV(text);
  if(rows.length<2)return{error:"Pusty plik"};
  var hdr=rows[0].map(cleanH);
  var pid=detectPlat(hdr,fname,rows.slice(1));
  var ambig=pid==="ai_overview_ambiguous";
  if(ambig)pid="ai_overview";
  var mi=hdr.findIndex(function(h){return h==="Mentions";}),ki=hdr.findIndex(function(h){return h==="Keyword";}),vi=hdr.findIndex(function(h){return h==="Volume";}),li=hdr.findIndex(function(h){return h==="Link URL";});
  if(mi<0)return{error:"Brak kolumny Mentions. Nagłówki: "+hdr.slice(0,5).join(", "),headers:hdr,platformId:pid,isAmbiguous:ambig};
  var variants=(bv||[]).map(function(v){return v.toLowerCase().trim();}).filter(Boolean);
  var mentions=0,citations=0,withAnyBrand=0,bMap={},gMap={},cSet={};
  rows.slice(1).forEach(function(r){
    var kw=ki>=0?r[ki]||"":"";if(!kw)return;
    var vol=vi>=0?(parseInt(r[vi])||0):0;
    var mRaw=mi>=0?r[mi]||"":"";
    var lRaw=li>=0?r[li]||"":"";
    var mp=mRaw.split(",").reduce(function(a,s){return a.concat(s.split("\n"));}, []).map(function(m){return m.trim().toLowerCase();}).filter(Boolean);
    if(mp.length>0)withAnyBrand++;
    var mentioned=variants.some(function(v){return mp.some(function(m){return m===v||m.includes(v);});});
    var cited=variants.some(function(v){return v&&lRaw.toLowerCase().includes(v);});
    if(mentioned){mentions++;if(!bMap[kw]||vol>bMap[kw])bMap[kw]=vol;}
    if(cited)citations++;
    var comps=mp.filter(function(m){return m&&m.length>1&&!variants.some(function(v){return m===v||m.includes(v);});});
    comps.forEach(function(c){cSet[c]=(cSet[c]||0)+1;});
    if(!mentioned&&comps.length>0){var kl=kw.toLowerCase();if(!variants.some(function(v){return v&&kl.includes(v);})){if(!gMap[kw]||vol>gMap[kw].vol)gMap[kw]={vol:vol,comps:comps.slice(0,3)};}}
  });
  var tb=Object.entries(bMap).map(function(e){return{kw:e[0],vol:e[1]};}).sort(function(a,b){return b.vol-a.vol;});
  var tg=Object.entries(gMap).map(function(e){return{kw:e[0],vol:e[1].vol,comps:e[1].comps};}).sort(function(a,b){return b.vol-a.vol;});
  return{platformId:pid,isAmbiguous:ambig,headers:hdr,total:rows.slice(1).filter(function(r){return ki>=0&&r[ki];}).length,mentions:mentions,citations:citations,withAnyBrand:withAnyBrand,impressions:tb.reduce(function(s,r){return s+(r.vol||0);},0),gapQueries:tg.length,compSet:cSet,topBrand:tb.slice(0,20),topGap:tg.slice(0,20),error:null};
}
function CT(p){
  if(!p.active||!p.payload||!p.payload.length)return null;
  return React.createElement("div",{style:{background:C.navy3,border:"1px solid "+C.border,borderRadius:8,padding:"9px 13px"}},React.createElement("div",{style:{fontSize:10,color:C.muted,marginBottom:4}},p.label),p.payload.map(function(x,i){return React.createElement("div",{key:i,style:{fontSize:12,color:x.color,fontWeight:700}},x.name+": "+x.value);}));
}
function buildReport(d){
  var date=new Date().toLocaleDateString("pl-PL",{year:"numeric",month:"long",day:"numeric"});
  var css="*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,'Segoe UI',sans-serif;background:#fff;color:#1a2a3a;font-size:14px;line-height:1.6}.page{max-width:960px;margin:0 auto;padding:40px 36px}h1{font-size:22px;font-weight:900;color:#07111f;margin-bottom:6px}h2{font-size:14px;font-weight:800;color:#07111f;margin:22px 0 10px;padding-bottom:7px;border-bottom:2px solid #eef2f8}.meta{color:#4a7090;font-size:12px;margin-bottom:20px}.kg{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:22px}.k{background:#f8faff;border:1px solid #dde8f5;border-radius:10px;padding:14px;border-top:3px solid}.kl{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#4a7090;font-weight:700;margin-bottom:5px}.kv{font-size:24px;font-weight:900;margin-bottom:2px}.ks{font-size:11px;color:#6a8090}table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:8px}th{padding:7px 10px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.7px;font-weight:700;color:#4a7090;border-bottom:2px solid #dde8f5;background:#f8faff}td{padding:7px 10px;border-bottom:1px solid #f0f5fb;vertical-align:top}.bench{background:#f0fff8;font-weight:600}.rec{background:#f8faff;border:1px solid #dde8f5;border-left:4px solid #2edf8f;border-radius:6px;padding:12px 14px;margin-bottom:8px}.footer{margin-top:40px;padding-top:14px;border-top:1px solid #e0eaf5;display:flex;justify-content:space-between;font-size:12px;color:#4a7090}@media print{@page{margin:1.5cm}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}";
  var sov=d.sov||0,tM=d.totalM||0,tC=d.totalC||0,tQ=d.totalQ||0,tWB=d.totalWB||0,t5=d.top5M||0;
  var ind=INDUSTRIES.find(function(x){return x.id===d.brand.industry;});
  var html="<!DOCTYPE html><html lang='pl'><head><meta charset='UTF-8'><title>AI Visibility — "+(d.brand.name||"Raport")+"</title><style>"+css+"</style></head><body><div class='page'>";
  html+="<div style='display:flex;align-items:center;gap:8px;margin-bottom:14px'><strong style='font-size:18px;color:#2edf8f'>sempai</strong><span style='font-size:10px;background:#2edf8f22;color:#2edf8f;border:1px solid #2edf8f44;padding:2px 7px;border-radius:4px;font-weight:700;text-transform:uppercase;letter-spacing:1px'>AI Visibility</span></div>";
  html+="<h1>Raport Widoczności AI</h1><p class='meta'>Klient: <strong>"+(d.brand.name||"—")+"</strong>"+(d.brand.url?" · "+d.brand.url:"")+(ind?" · "+ind.icon+" "+ind.label:"")+"<br>Data: "+date+"</p>";
  html+="<div class='kg'><div class='k' style='border-top-color:#2edf8f'><div class='kl'>AI Share of Voice</div><div class='kv' style='color:#2edf8f'>"+sov+"%</div><div class='ks'>"+(sov>=30?"Silna pozycja":sov>=10?"Umiarkowana":"Niska")+" · "+fmtN(tM)+" ÷ "+fmtN(tM+t5)+"</div></div>";
  html+="<div class='k' style='border-top-color:#a78bfa'><div class='kl'>Mention Rate</div><div class='kv' style='color:#a78bfa'>"+fmtP(tM,tWB)+"</div><div class='ks'>"+fmtN(tM)+" wzm. / "+fmtN(tWB)+" z markami</div></div>";
  html+="<div class='k' style='border-top-color:#4da6ff'><div class='kl'>Citation Rate</div><div class='kv' style='color:#4da6ff'>"+fmtP(tC,tQ)+"</div><div class='ks'>"+fmtN(tC)+" cyt. / "+fmtN(tQ)+" zapytań</div></div>";
  html+="<div class='k' style='border-top-color:#f5c842'><div class='kl'>Luki contentowe</div><div class='kv' style='color:#f5c842'>"+(d.gapKws||[]).length+"</div><div class='ks'>Zapytań do pokrycia</div></div></div>";
  if(d.allComps&&d.allComps.length>0){html+="<h2>Analiza konkurencji</h2><table><thead><tr><th>Marka</th><th>Wzmianki AI</th><th>vs "+(d.brand.name||"Twoja marka")+"</th></tr></thead><tbody><tr class='bench'><td><strong>"+(d.brand.name||"Twoja marka")+"</strong></td><td>"+fmtN(tM)+"</td><td style='color:#2edf8f'>Benchmark</td></tr>";d.allComps.slice(0,10).forEach(function(c){var cnt=d.compCounts[c]||0,df=tM-cnt;html+="<tr><td>"+c+"</td><td>"+fmtN(cnt)+"</td><td style='color:"+(df>=0?"#1db872":"#e03050")+"'>"+(df>=0?"+":"")+df+"</td></tr>";});html+="</tbody></table>";}
  if(d.brandKws&&d.brandKws.length>0){html+="<h2>Zapytania z wzmianką marki</h2><table><thead><tr><th>Zapytanie</th><th style='text-align:right'>Wolumen/mies.</th></tr></thead><tbody>";d.brandKws.forEach(function(e){html+="<tr><td>"+e[0]+"</td><td style='text-align:right;color:#4a7090;font-family:monospace'>"+fmtN(e[1])+"</td></tr>";});html+="</tbody></table>";}
  if(d.gapKws&&d.gapKws.length>0){html+="<h2>Luki contentowe</h2><p style='font-size:11px;color:#6a8090;margin-bottom:8px'>Zapytania gdzie AI wymienia konkurentów ale pomija Twoją markę.</p><table><thead><tr><th>Zapytanie</th><th>AI wymienia</th><th style='text-align:right'>Vol./mies.</th></tr></thead><tbody>";d.gapKws.forEach(function(e){html+="<tr><td style='max-width:280px;word-wrap:break-word'>"+e[0]+"</td><td style='color:#e03050;font-size:11px'>"+e[1].comps.join(", ")+"</td><td style='text-align:right;color:#4a7090;font-family:monospace'>"+fmtN(e[1].vol)+"</td></tr>";});html+="</tbody></table>";}
  if(d.recs&&d.recs.length>0){html+="<h2>Rekomendacje</h2>";d.recs.forEach(function(r,i){if(r.text)html+="<div class='rec'><strong>"+(i+1)+". "+r.text+"</strong>"+(r.note?"<br><span style='color:#4a7090;font-size:12px'>"+r.note+"</span>":"")+"</div>";});}
  if(d.comment){html+="<h2>Komentarz analityczny</h2><div class='rec' style='border-left-color:#4da6ff;white-space:pre-wrap;font-size:13px;line-height:1.75'>"+d.comment+"</div>";}
  html+="<div class='footer'><div><strong>sempai · Let us perform!</strong> · sempai.pl</div><div>"+date+"</div></div></div></body></html>";
  return html;
}

export default function App(){
  var _t=useState("guide"),tab=_t[0],setTab=_t[1];
  var _b=useState({name:"",url:"",industry:""}),brand=_b[0],setBrand=_b[1];
  var _f=useState({}),files=_f[0],setFiles=_f[1];
  var _rb=useState({}),rawBufs=_rb[0],setRawBufs=_rb[1];
  var _u=useState([]),unknown=_u[0],setUnknown=_u[1];
  var _er=useState([]),errors=_er[0],setErrors=_er[1];
  var _bv=useState([]),bVars=_bv[0],setBVars=_bv[1];
  var _ld=useState(null),loading=_ld[0],setLoading=_ld[1];
  var _rw=useState(null),rWin=_rw[0],setRWin=_rw[1];

  function getKey(b){var raw=(b.url||b.name||"").toLowerCase().replace("https://","").replace("http://","").replace("www.","");var dot=raw.indexOf(".");return dot>0?raw.slice(0,dot):raw.split(" ")[0]||"";}
  var bKey=getKey(brand);
  var allVars=[bKey].concat(bVars).filter(function(v,i,a){return v&&a.indexOf(v)===i;});

  function loadFile(fname,buf){
    setLoading(fname);
    setTimeout(function(){
      var r=parseFile(buf,fname,allVars);
      setRawBufs(function(rb){var n=Object.assign({},rb);n[fname]=buf;return n;});
      if(!r.platformId||r.error){
        setErrors(function(e){return e.concat([fname+": "+(r.error||"Nieznana platforma")]);});
        setUnknown(function(u){return u.filter(function(x){return x.fname!==fname;}).concat([{fname:fname,headers:r.headers||[],error:r.error}]);});
      } else if(r.isAmbiguous){
        setUnknown(function(u){return u.filter(function(x){return x.fname!==fname;}).concat([{fname:fname,headers:r.headers||[],conflict:true}]);});
      } else {
        setFiles(function(f){var n=Object.assign({},f);n[r.platformId]=Object.assign({fname:fname},r);return n;});
        setErrors(function(e){return e.filter(function(x){return x.indexOf(fname)<0;});});
        setUnknown(function(u){return u.filter(function(x){return x.fname!==fname;});});
      }
      setLoading(null);
    },50);
  }

  function assignPlat(fname,pid){
    var buf=rawBufs[fname];if(!buf)return;
    var r=parseFile(buf,fname,allVars);
    setFiles(function(f){var n=Object.assign({},f);n[pid]=Object.assign({fname:fname},r,{platformId:pid,isAmbiguous:false});return n;});
    setUnknown(function(u){return u.filter(function(x){return x.fname!==fname;});});
    setErrors(function(e){return e.filter(function(x){return x.indexOf(fname)<0;});});
  }

  var EP={total:0,mentions:0,citations:0,withAnyBrand:0,impressions:0,gapQueries:0,compSet:{},topBrand:[],topGap:[]};
  var proc={};PLATS.forEach(function(p){proc[p.id]=files[p.id]||EP;});
  var tQ=PLATS.reduce(function(s,p){return s+(proc[p.id].total||0);},0);
  var tM=PLATS.reduce(function(s,p){return s+(proc[p.id].mentions||0);},0);
  var tC=PLATS.reduce(function(s,p){return s+(proc[p.id].citations||0);},0);
  var tWB=PLATS.reduce(function(s,p){return s+(proc[p.id].withAnyBrand||0);},0);
  var tImp=PLATS.reduce(function(s,p){return s+(proc[p.id].impressions||0);},0);
  var cC={};PLATS.forEach(function(p){Object.entries(proc[p.id].compSet||{}).forEach(function(e){cC[e[0]]=(cC[e[0]]||0)+e[1];});});
  var allComps=Object.entries(cC).sort(function(a,b){return b[1]-a[1];}).map(function(e){return e[0];}).filter(function(n){return n&&n.length>1;});
  var t5=allComps.slice(0,5).reduce(function(s,c){return s+(cC[c]||0);},0);
  var sov=tM+t5>0?Math.round((tM/(tM+t5))*100):0;
  var kB={},kG={};
  PLATS.forEach(function(p){(proc[p.id].topBrand||[]).forEach(function(it){if(!kB[it.kw]||it.vol>kB[it.kw])kB[it.kw]=it.vol;});(proc[p.id].topGap||[]).forEach(function(it){if(!kG[it.kw]||it.vol>kG[it.kw].vol)kG[it.kw]={vol:it.vol,comps:it.comps};});});
  var brandKws=Object.entries(kB).sort(function(a,b){return b[1]-a[1];});
  var gapKws=Object.entries(kG).filter(function(e){return isRelGap(e[0],brand.industry);}).sort(function(a,b){return b[1].vol-a[1].vol;});
  var sovData=PLATS.map(function(p){var d=proc[p.id];var ct=Object.values(d.compSet||{}).reduce(function(s,v){return s+v;},0);return{name:p.name,sov:d.mentions+ct>0?Math.round((d.mentions/(d.mentions+ct))*100):0,mentions:d.mentions,citations:d.citations,color:p.color,total:d.total};});
  var fl=Object.keys(files).length;

  function getData(recs,comment){return{brand:brand,sov:sov,totalM:tM,totalC:tC,totalQ:tQ,totalWB:tWB,top5M:t5,allComps:allComps,compCounts:cC,brandKws:brandKws,gapKws:gapKws,recs:recs||[],comment:comment||""};}
  function openWin(recs,comment){
    var html=buildReport(getData(recs,comment));
    var blob=new Blob([html],{type:"text/html"});var url=URL.createObjectURL(blob);
    var w=window.open(url,"sempai_report");if(w){setRWin(w);setTimeout(function(){URL.revokeObjectURL(url);},5000);}
  }
  function refreshWin(recs,comment){
    if(!rWin||rWin.closed){openWin(recs,comment);return;}
    var html=buildReport(getData(recs,comment));
    try{rWin.document.open();rWin.document.write(html);rWin.document.close();}catch(e){openWin(recs,comment);}
  }

  var TABS=[{id:"guide",label:"⓪ Instrukcja"},{id:"setup",label:"① Klient"},{id:"import",label:"② Import CSV"},{id:"dashboard",label:"③ Dashboard"},{id:"report",label:"④ Raport"}];

  return React.createElement("div",{style:{background:C.navy1,color:C.text,minHeight:"100vh",fontFamily:"DM Sans,Segoe UI,sans-serif"}},
    React.createElement("div",{style:{background:C.navy2,borderBottom:"1px solid "+C.border}},
      React.createElement("div",{style:{maxWidth:980,margin:"0 auto",padding:"14px 24px 0"}},
        React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:12}},
          React.createElement("span",{style:{fontSize:17,fontWeight:900,color:C.green}},"sempai"),
          React.createElement("span",{style:{fontSize:10,fontWeight:700,color:C.green,background:C.green+"18",border:"1px solid "+C.green+"44",borderRadius:5,padding:"2px 7px",letterSpacing:"1px",textTransform:"uppercase"}},"AI Visibility"),
          fl>0&&React.createElement("div",{style:{marginLeft:"auto",display:"flex",gap:6,flexWrap:"wrap"}},
            PLATS.filter(function(p){return proc[p.id].total>0;}).map(function(p){return React.createElement("span",{key:p.id,style:{fontSize:10,color:p.color,background:p.color+"18",border:"1px solid "+p.color+"44",borderRadius:5,padding:"2px 7px",fontWeight:700}},p.icon+" "+p.name);}))
        ),
        React.createElement("div",{style:{display:"flex",gap:2,overflowX:"auto"}},
          TABS.map(function(t){return React.createElement("button",{key:t.id,onClick:function(){setTab(t.id);},style:{padding:"7px 15px",background:"transparent",border:"none",borderBottom:tab===t.id?"2px solid "+C.green:"2px solid transparent",color:tab===t.id?C.green:C.muted,fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}},t.label);}))
      )
    ),
    React.createElement("div",{style:{maxWidth:980,margin:"0 auto",padding:"24px"}},
      tab==="guide"&&React.createElement(TGuide,{setTab:setTab}),
      tab==="setup"&&React.createElement(TSetup,{brand:brand,setBrand:setBrand,bVars:bVars,setBVars:setBVars,setTab:setTab,bKey:bKey}),
      tab==="import"&&React.createElement(TImport,{files:files,proc:proc,unknown:unknown,errors:errors,loading:loading,loadFile:loadFile,assignPlat:assignPlat,setTab:setTab}),
      tab==="dashboard"&&React.createElement(TDash,{brand:brand,proc:proc,tQ:tQ,tM:tM,tC:tC,tWB:tWB,tImp:tImp,sov:sov,t5:t5,allComps:allComps,cC:cC,sovData:sovData,brandKws:brandKws,gapKws:gapKws,fl:fl,setTab:setTab}),
      tab==="report"&&React.createElement(TReport,{brand:brand,tQ:tQ,tM:tM,tC:tC,tWB:tWB,sov:sov,t5:t5,allComps:allComps,cC:cC,brandKws:brandKws,gapKws:gapKws,openWin:openWin,refreshWin:refreshWin,rWin:rWin})
    )
  );
}

function TGuide(props){
  var cols=[C.sky,C.green,C.purple,C.coral,C.gold,"#34d399"];
  return React.createElement("div",null,
    React.createElement("h2",{style:{fontSize:20,fontWeight:900,color:C.text,marginBottom:4}},"Sempai AI Visibility"),
    React.createElement("p",{style:{fontSize:13,color:C.muted,marginBottom:18,lineHeight:1.75}},"Mierzy jak często modele AI (ChatGPT, Gemini, AI Overview itd.) wymieniają Twoją markę gdy ktoś zadaje pytania branżowe. Dane pobierasz z Ahrefs Brand Radar."),
    React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:18}},
      [{icon:"💬",title:"Wzmianki (Mentions)",color:C.green,def:'Kolumna "Mentions" w CSV. Ile unikalnych zapytań zawiera nazwę Twojej marki. Jedno zapytanie = max 1 wzmianka, nawet jeśli marka pojawia się wielokrotnie.'},
       {icon:"🔗",title:"Cytowania (Citations)",color:C.sky,def:'Kolumna "Link URL" w CSV. Ile zapytań ma link do Twojej domeny. Możesz być cytowany bez wzmianki nazwy — wtedy Citation Rate > Mention Rate.'},
       {icon:"📊",title:"AI SOV (Share of Voice)",color:C.purple,def:"Twoje wzm. ÷ (Twoje + wzm. top 5 konk.) × 100. NIE jest to średnia z platform — to wartość globalna. Ahrefs może mieć inny % bo waży zapytania wolumenem wyszukiwań."}
      ].map(function(x,i){return React.createElement("div",{key:i,style:{padding:"14px",background:C.navy2,border:"1px solid "+x.color+"33",borderRadius:10}},
        React.createElement("div",{style:{fontSize:20,marginBottom:7}},x.icon),
        React.createElement("div",{style:{fontSize:12,fontWeight:800,color:x.color,marginBottom:5}},x.title),
        React.createElement("div",{style:{fontSize:11,color:"#8ab0c0",lineHeight:1.65}},x.def));})),
    React.createElement("div",{style:{background:"#080010",border:"1px solid #2a1060",borderRadius:10,padding:"13px 16px",marginBottom:14}},
      React.createElement("div",{style:{fontWeight:800,color:"#c0a0ff",marginBottom:4,fontSize:12}},"Ścieżka w Ahrefs: Brand Radar → AI Responses → [wybierz agenta] → [wybierz kraj] → Export"),
      React.createElement("div",{style:{color:"#6040a0",fontSize:11,lineHeight:1.75}},"Każdy agent (ChatGPT, Gemini, Copilot, Perplexity, AI Overview, AI Mode) = osobny eksport. Wgraj wszystkie naraz. "+React.createElement&&" AI Overview i AI Mode mają identyczny format pliku CSV — po wgraniu narzędzie zapyta który to jest.")
    ),
    ["1. Ahrefs → Brand Radar → dodaj markę klienta i konkurentów","2. Kliknij AI Responses → wybierz agenta (każdego eksportujesz osobno)","3. Ustaw filtr kraju → Poland (lub inny)","4. Kliknij Export → pobierz CSV — powtórz dla każdego agenta AI","5. Uzupełnij ① Klient: nazwa, domena i wybierz branżę","6. Wgraj wszystkie pliki w ② Import CSV — platforma wykrywana automatycznie"].map(function(s,i){return React.createElement("div",{key:i,style:{display:"flex",gap:12,padding:"10px 14px",background:C.navy2,border:"1px solid "+cols[i]+"33",borderRadius:10,marginBottom:7,alignItems:"flex-start"}},React.createElement("span",{style:{color:cols[i],fontWeight:900,minWidth:18,flexShrink:0}},i+1+"."),React.createElement("span",{style:{fontSize:12,color:"#8ab0c0",lineHeight:1.65}},s.slice(3)));
    }),
    React.createElement("div",{style:{background:"#0a1800",border:"1px solid #1a3800",borderRadius:10,padding:"12px 16px",marginTop:14,marginBottom:16}},
      React.createElement("div",{style:{fontSize:12,fontWeight:800,color:C.green,marginBottom:8}},"Jak liczymy metryki — dokładne wzory"),
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:11,color:"#70a080",lineHeight:1.75}},
        React.createElement("div",null,React.createElement("strong",{style:{color:"#a0d090"}},"Mention Rate")," = wzm. marki ÷ zapytania z jakąkolwiek marką × 100. Nie dzielone przez WSZYSTKIE zapytania."),
        React.createElement("div",null,React.createElement("strong",{style:{color:"#a0d090"}},"Luki")," = zapytania gdzie AI wymienia konkurenta ale nie Twoją markę. Filtrowane branżowo po wyborze branży w ① Klient."),
        React.createElement("div",null,React.createElement("strong",{style:{color:"#a0d090"}},"Impressions")," = suma wolumenu wyszukiwań zapytań z wzmianką. Szacunkowy zasięg — nie kliknięcia."),
        React.createElement("div",null,React.createElement("strong",{style:{color:"#a0d090"}},"Warianty marki")," = nazwa generowana automatycznie z domeny. Dodaj własne jeśli marka ma kilka nazw.")
      )
    ),
    React.createElement("button",{onClick:function(){props.setTab("setup");},style:{padding:"10px 22px",background:C.green+"22",border:"2px solid "+C.green+"66",borderRadius:10,color:C.green,fontSize:13,fontWeight:700,cursor:"pointer"}},"Rozumiem → ① Dane klienta")
  );
}

function TSetup(props){
  var brand=props.brand,setBrand=props.setBrand,bVars=props.bVars,setBVars=props.setBVars,setTab=props.setTab,bKey=props.bKey;
  var _v=useState(""),vi=_v[0],setVi=_v[1];
  function addV(){if(vi.trim()){setBVars(function(v){return v.concat([vi.trim()]);});setVi("");}}
  var ready=!!(brand.name&&brand.url&&brand.industry);
  var iS={width:"100%",background:C.navy1,border:"1px solid "+C.border,borderRadius:8,padding:"9px 12px",color:C.text,fontSize:13,outline:"none",boxSizing:"border-box"};
  var lS={fontSize:10,color:"#90b8c8",fontWeight:700,letterSpacing:"0.8px",textTransform:"uppercase",marginBottom:5,display:"block"};
  var autoVars=[bKey];
  var raw=(brand.url||brand.name||"").toLowerCase().replace("https://","").replace("http://","").replace("www.","");
  var base=(function(){var d=raw.indexOf(".");return d>0?raw.slice(0,d):raw.split(" ")[0]||"";})();
  if(base&&base!==bKey)autoVars.push(base);
  if(base.includes("-"))autoVars.push(base.split("-").join(""));
  autoVars=autoVars.filter(function(v,i,a){return v&&v.length>1&&a.indexOf(v)===i;});
  return React.createElement("div",null,
    React.createElement("h2",{style:{fontSize:18,fontWeight:900,color:C.text,marginBottom:16}},"Dane klienta"),
    React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}},
      React.createElement("div",null,React.createElement("label",{style:lS},"Nazwa marki *"),React.createElement("input",{value:brand.name,onChange:function(e){setBrand(function(b){return Object.assign({},b,{name:e.target.value});});},placeholder:"np. Massimo Dutti",style:iS}),React.createElement("div",{style:{fontSize:11,color:C.muted,marginTop:4}},"Jak klient jest publicznie znany")),
      React.createElement("div",null,React.createElement("label",{style:lS},"Domena / URL *"),React.createElement("input",{value:brand.url,onChange:function(e){setBrand(function(b){return Object.assign({},b,{url:e.target.value});});},placeholder:"massimo-dutti.pl",style:iS}),React.createElement("div",{style:{fontSize:11,color:C.muted,marginTop:4}},"Używana do generowania wariantów nazwy"))
    ),
    React.createElement("div",{style:{background:C.navy2,border:"1px solid "+C.border,borderRadius:10,padding:"14px",marginBottom:12}},
      React.createElement("label",{style:lS},"Branża klienta *"),
      React.createElement("p",{style:{fontSize:11,color:C.muted,marginBottom:10,lineHeight:1.65}},"Wybór branży filtruje luki contentowe — usuwa nieistotne tematy z listy. Np. sklep mody nie zobaczy luk o nożach ani wiertarkach."),
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7}},
        INDUSTRIES.map(function(ind){var sel=brand.industry===ind.id;return React.createElement("button",{key:ind.id,onClick:function(){setBrand(function(b){return Object.assign({},b,{industry:ind.id});});},style:{padding:"8px 10px",borderRadius:8,border:"1px solid "+(sel?C.green:C.border),background:sel?C.green+"18":"transparent",color:sel?C.green:"#7aabbf",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:7,fontSize:11,fontWeight:sel?700:400}},React.createElement("span",{style:{fontSize:14}},ind.icon),React.createElement("span",null,ind.label));}))
    ),
    (brand.name||brand.url)&&React.createElement("div",{style:{background:C.navy2,border:"1px solid "+C.border,borderRadius:10,padding:"14px",marginBottom:12}},
      React.createElement("label",{style:lS},"Warianty nazwy (do szukania w CSV)"),
      React.createElement("p",{style:{fontSize:11,color:C.muted,marginBottom:8,lineHeight:1.65}},"Narzędzie szuka TYCH słów w kolumnie Mentions. Jeśli marka ma inną pisownię, skrót lub angielską nazwę — dodaj ją tutaj."),
      React.createElement("div",{style:{display:"flex",gap:7,flexWrap:"wrap",marginBottom:8}},
        autoVars.map(function(v,i){return React.createElement("span",{key:i,style:{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px",borderRadius:12,fontSize:11,fontWeight:700,background:C.green+"22",border:"1px solid "+C.green+"44",color:C.green}},v,React.createElement("span",{style:{fontSize:9,opacity:0.6,marginLeft:2}},"auto"));}),
        bVars.map(function(v,i){return React.createElement("span",{key:i,style:{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px",borderRadius:12,fontSize:11,fontWeight:700,background:C.sky+"22",border:"1px solid "+C.sky+"44",color:C.sky}},v,React.createElement("button",{onClick:function(){setBVars(function(p){return p.filter(function(x,j){return j!==i;});});},style:{background:"none",border:"none",cursor:"pointer",color:C.sky+"80",fontSize:12,padding:0,lineHeight:1}},"×"));})),
      React.createElement("div",{style:{display:"flex",gap:8}},
        React.createElement("input",{value:vi,onChange:function(e){setVi(e.target.value);},onKeyDown:function(e){if(e.key==="Enter")addV();},placeholder:"Dodaj wariant i naciśnij Enter",style:Object.assign({},iS,{flex:1})}),
        React.createElement("button",{onClick:addV,style:{padding:"8px 13px",background:C.sky+"18",border:"1px solid "+C.sky+"44",borderRadius:8,color:C.sky,fontSize:12,fontWeight:700,cursor:"pointer"}},"+"))
    ),
    React.createElement("button",{onClick:function(){setTab("import");},disabled:!ready,style:{padding:"10px 20px",background:ready?C.green+"22":"transparent",border:"1px solid "+(ready?C.green+"55":C.border),borderRadius:9,color:ready?C.green:C.border,fontSize:13,fontWeight:700,cursor:ready?"pointer":"not-allowed"}},ready?"Dalej → Import CSV":"Uzupełnij nazwę, domenę i branżę")
  );
}

function TImport(props){
  var files=props.files,proc=props.proc,unknown=props.unknown,errors=props.errors,loading=props.loading,loadFile=props.loadFile,assignPlat=props.assignPlat,setTab=props.setTab;
  function handle(file){var r=new FileReader();r.onload=function(ev){loadFile(file.name,ev.target.result);};r.readAsArrayBuffer(file);}
  var lk=Object.keys(files).length;
  return React.createElement("div",null,
    React.createElement("h2",{style:{fontSize:18,fontWeight:900,color:C.text,marginBottom:6}},"Import plików CSV z Ahrefs"),
    React.createElement("p",{style:{fontSize:12,color:C.muted,marginBottom:12,lineHeight:1.7}},"Encoding (UTF-8 / UTF-16) i separator (TAB / przecinek) wykrywane automatycznie. Wgraj kilka plików naraz."),
    React.createElement("div",{onDragOver:function(e){e.preventDefault();},onDrop:function(e){e.preventDefault();Array.from(e.dataTransfer.files).forEach(handle);},onClick:function(){document.getElementById("fi2").click();},style:{border:"2px dashed "+C.border,borderRadius:10,padding:"28px",cursor:"pointer",textAlign:"center",marginBottom:12}},
      React.createElement("input",{id:"fi2",type:"file",accept:".csv",multiple:true,style:{display:"none"},onChange:function(e){Array.from(e.target.files).forEach(handle);}}),
      React.createElement("div",{style:{fontSize:28,marginBottom:5}},loading?"⏳":"📂"),
      React.createElement("div",{style:{fontSize:14,fontWeight:700,color:C.text,marginBottom:3}},loading?"Przetwarzanie: "+loading+"...":"Upuść pliki CSV lub kliknij"),
      React.createElement("div",{style:{fontSize:11,color:C.muted}},"Po jednym pliku na każdego agenta AI · Wiele plików naraz")
    ),
    lk>0&&React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:12}},
      PLATS.map(function(p){var d=proc[p.id],ok=!!files[p.id];return React.createElement("div",{key:p.id,style:{padding:"10px 12px",background:C.navy2,border:"1px solid "+(ok?p.color+"44":C.border),borderRadius:9}},
        React.createElement("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:3}},React.createElement("span",{style:{background:p.color+"20",color:p.color,borderRadius:5,padding:"1px 6px",fontSize:10,fontWeight:700}},p.icon+" "+p.name),ok&&React.createElement("span",{style:{fontSize:10,color:C.green}},"✅")),
        ok?React.createElement("div",{style:{fontSize:11,color:C.text,fontFamily:"monospace"}},fmtN(d.total)," zap. · ",React.createElement("span",{style:{color:C.green}},fmtN(d.mentions)+" wzm")):React.createElement("div",{style:{fontSize:11,color:"#3a6080"}},"— brak"));})),
    unknown.length>0&&React.createElement("div",{style:{background:C.gold+"10",border:"1px solid "+C.gold+"44",borderRadius:10,padding:"12px 14px",marginBottom:12}},
      React.createElement("div",{style:{fontSize:13,fontWeight:800,color:C.gold,marginBottom:8}},"⚠️ Wybierz platformę"),
      unknown.map(function(u,fi){return React.createElement("div",{key:fi,style:{marginBottom:10,background:C.navy2,border:"1px solid "+C.gold+"33",borderRadius:8,padding:"12px"}},
        React.createElement("div",{style:{fontSize:11,color:C.muted,marginBottom:6,fontFamily:"monospace"}},u.fname),
        u.conflict&&React.createElement("div",{style:{fontSize:11,color:"#d4a820",marginBottom:8,lineHeight:1.65}},"AI Overview i AI Mode mają identyczny format CSV. Sprawdź z której zakładki w Ahrefs pobrano plik:"),
        u.error&&React.createElement("div",{style:{fontSize:11,color:C.coral,marginBottom:8}},u.error),
        React.createElement("div",{style:{display:"flex",gap:7,flexWrap:"wrap"}},
          PLATS.filter(function(p){return!u.conflict||(p.id==="ai_overview"||p.id==="ai_mode");}).map(function(p){return React.createElement("button",{key:p.id,onClick:function(){assignPlat(u.fname,p.id);},style:{padding:"6px 13px",borderRadius:9,fontSize:11,fontWeight:700,cursor:"pointer",background:p.color+"18",border:"1px solid "+p.color+"44",color:p.color}},p.icon+" "+p.name);})));})),
    errors.filter(Boolean).length>0&&unknown.length===0&&React.createElement("div",{style:{marginBottom:10,padding:"8px 12px",background:C.coral+"12",border:"1px solid "+C.coral+"44",borderRadius:8}},
      errors.map(function(e,i){return React.createElement("div",{key:i,style:{fontSize:11,color:C.coral}},e);})),
    lk>0&&unknown.length===0&&React.createElement("button",{onClick:function(){setTab("dashboard");},style:{padding:"10px 20px",background:C.green+"22",border:"1px solid "+C.green+"55",borderRadius:9,color:C.green,fontSize:13,fontWeight:700,cursor:"pointer"}},"Dashboard →")
  );
}

function TDash(props){
  var brand=props.brand,proc=props.proc,tQ=props.tQ,tM=props.tM,tC=props.tC,tWB=props.tWB,tImp=props.tImp,sov=props.sov,t5=props.t5,allComps=props.allComps,cC=props.cC,sovData=props.sovData,brandKws=props.brandKws,gapKws=props.gapKws,fl=props.fl,setTab=props.setTab;
  if(!fl)return React.createElement("div",{style:{textAlign:"center",padding:"50px",color:"#3a6070"}},"← Wgraj pliki CSV w zakładce Import CSV");
  var cBar=[{name:brand.name||"Twoja marka",count:tM,color:C.green}].concat(allComps.slice(0,7).map(function(c,i){return{name:c,count:cC[c],color:[C.sky,C.coral,C.gold,C.purple,"#34d399",C.sky,C.coral][i]};}));
  var kpis=[{l:"AI Share of Voice",v:sov+"%",c:C.green,s:sov>=30?"Silna":sov>=10?"Umiarkowana":"Niska"},{l:"AI Mentions",v:fmtN(tM),c:C.purple,s:"Rate: "+fmtP(tM,tWB)},{l:"AI Citations",v:fmtN(tC),c:C.sky,s:"Rate: "+fmtP(tC,tQ)},{l:"Impressions",v:tImp>999999?Math.round(tImp/1000)+"k":fmtN(tImp),c:C.coral,s:"Zasięg/mies."},{l:"Luki",v:fmtN(gapKws.length),c:C.gold,s:"Zapytań do pokrycia"}];
  return React.createElement("div",null,
    React.createElement("h2",{style:{fontSize:18,fontWeight:900,color:C.text,marginBottom:14}},"Dashboard Widoczności AI"),
    React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:9,marginBottom:14}},
      kpis.map(function(k,i){return React.createElement("div",{key:i,style:{background:C.navy2,border:"1px solid "+k.c+"22",borderRadius:10,padding:"12px 11px"}},React.createElement("div",{style:{fontSize:9,color:"#7ab0c8",textTransform:"uppercase",letterSpacing:"0.8px",fontWeight:700,marginBottom:5}},k.l),React.createElement("div",{style:{fontSize:24,fontWeight:900,color:k.c,lineHeight:1,marginBottom:4}},k.v),React.createElement("div",{style:{fontSize:10,color:"#4a8090"}},k.s));})),
    React.createElement("div",{style:{display:"grid",gridTemplateColumns:"2fr 1fr",gap:10,marginBottom:12}},
      React.createElement("div",{style:{background:C.navy2,border:"1px solid "+C.border,borderRadius:10,padding:"14px"}},
        React.createElement("div",{style:{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"1px",fontWeight:700,marginBottom:10}},"SOV per platforma"),
        React.createElement(ResponsiveContainer,{width:"100%",height:160},
          React.createElement(BarChart,{data:sovData,margin:{top:5,right:5,left:-20,bottom:0}},
            React.createElement(CartesianGrid,{strokeDasharray:"2 4",stroke:C.border}),
            React.createElement(XAxis,{dataKey:"name",tick:{fill:C.muted,fontSize:9},axisLine:false,tickLine:false}),
            React.createElement(YAxis,{tick:{fill:C.muted,fontSize:9},axisLine:false,tickLine:false,domain:[0,100]}),
            React.createElement(Tooltip,{content:React.createElement(CT,null)}),
            React.createElement(Bar,{dataKey:"sov",name:"SOV %",radius:[4,4,0,0]},PLATS.map(function(p,i){return React.createElement(Cell,{key:i,fill:p.color});}))))),
      React.createElement("div",{style:{background:C.navy2,border:"1px solid "+C.border,borderRadius:10,padding:"14px"}},
        React.createElement("div",{style:{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"1px",fontWeight:700,marginBottom:10}},"Wzm. vs Cyt."),
        React.createElement(ResponsiveContainer,{width:"100%",height:160},
          React.createElement(BarChart,{data:sovData,margin:{top:5,right:5,left:-20,bottom:0}},
            React.createElement(CartesianGrid,{strokeDasharray:"2 4",stroke:C.border}),
            React.createElement(XAxis,{dataKey:"name",tick:{fill:C.muted,fontSize:9},axisLine:false,tickLine:false}),
            React.createElement(YAxis,{tick:{fill:C.muted,fontSize:9},axisLine:false,tickLine:false}),
            React.createElement(Tooltip,{content:React.createElement(CT,null)}),
            React.createElement(Legend,{wrapperStyle:{fontSize:10,color:C.muted}}),
            React.createElement(Bar,{dataKey:"mentions",name:"Wzm.",fill:C.green,radius:[3,3,0,0]}),
            React.createElement(Bar,{dataKey:"citations",name:"Cyt.",fill:C.sky,radius:[3,3,0,0]}))))),
    allComps.length>0&&React.createElement("div",{style:{background:C.navy2,border:"1px solid "+C.border,borderRadius:10,padding:"14px",marginBottom:12}},
      React.createElement("div",{style:{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"1px",fontWeight:700,marginBottom:10}},"Konkurenci wykryci z danych AI"),
      React.createElement(ResponsiveContainer,{width:"100%",height:Math.min(30*cBar.length+40,250)},
        React.createElement(BarChart,{data:cBar,layout:"vertical",margin:{top:4,right:40,left:10,bottom:0}},
          React.createElement(CartesianGrid,{strokeDasharray:"2 4",stroke:C.border,horizontal:false}),
          React.createElement(XAxis,{type:"number",tick:{fill:C.muted,fontSize:9},axisLine:false,tickLine:false}),
          React.createElement(YAxis,{dataKey:"name",type:"category",tick:{fill:C.text,fontSize:10},axisLine:false,tickLine:false,width:120}),
          React.createElement(Tooltip,{content:React.createElement(CT,null)}),
          React.createElement(Bar,{dataKey:"count",name:"Wzm.",radius:[0,4,4,0]},cBar.map(function(x,i){return React.createElement(Cell,{key:i,fill:x.color});}))))),
    brandKws.length>0&&React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}},
      React.createElement("div",{style:{background:C.navy2,border:"1px solid "+C.green+"33",borderRadius:10,padding:"14px"}},
        React.createElement("div",{style:{fontSize:10,color:C.green,textTransform:"uppercase",letterSpacing:"1px",fontWeight:700,marginBottom:8}},"🎯 Zapytania z wzmianką marki"),
        brandKws.slice(0,10).map(function(e,i){return React.createElement("div",{key:i,style:{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid "+C.navy3,fontSize:11}},React.createElement("span",{style:{color:"#c0dce8",flex:1,marginRight:8,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},(e[0].length>42?e[0].slice(0,42)+"…":e[0])),React.createElement("span",{style:{color:C.muted,fontFamily:"monospace",flexShrink:0}},fmtN(e[1])));})),
      gapKws.length>0&&React.createElement("div",{style:{background:C.navy2,border:"1px solid "+C.coral+"33",borderRadius:10,padding:"14px"}},
        React.createElement("div",{style:{fontSize:10,color:C.coral,textTransform:"uppercase",letterSpacing:"1px",fontWeight:700,marginBottom:8}},"⚠️ Luki — marka nieobecna"),
        gapKws.slice(0,10).map(function(e,i){return React.createElement("div",{key:i,style:{padding:"4px 0",borderBottom:"1px solid "+C.navy3}},React.createElement("div",{style:{display:"flex",justifyContent:"space-between",fontSize:11}},React.createElement("span",{style:{color:"#c0dce8",flex:1,marginRight:8,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},(e[0].length>42?e[0].slice(0,42)+"…":e[0])),React.createElement("span",{style:{color:C.muted,fontFamily:"monospace",flexShrink:0}},fmtN(e[1].vol))),React.createElement("div",{style:{fontSize:10,color:"#e08090"}},e[1].comps.slice(0,2).join(", ")));}))
    ),
    React.createElement("button",{onClick:function(){setTab("report");},style:{padding:"9px 20px",background:C.green+"22",border:"1px solid "+C.green+"55",borderRadius:9,color:C.green,fontSize:13,fontWeight:700,cursor:"pointer"}},"Generuj Raport →")
  );
}

function TReport(props){
  var brand=props.brand,tQ=props.tQ,tM=props.tM,tC=props.tC,tWB=props.tWB,sov=props.sov,t5=props.t5,allComps=props.allComps,cC=props.cC,brandKws=props.brandKws,gapKws=props.gapKws,openWin=props.openWin,refreshWin=props.refreshWin,rWin=props.rWin;
  var _r=useState([]),recs=_r[0],setRecs=_r[1];
  var _c=useState(""),comment=_c[0],setComment=_c[1];
  function addR(){setRecs(function(r){return r.concat([{id:Date.now(),text:"",note:""}]);});}
  function updR(id,f,v){setRecs(function(r){return r.map(function(x){return x.id===id?Object.assign({},x,{[f]:v}):x;});});}
  var isOpen=rWin&&!rWin.closed;
  var iS={background:C.navy1,border:"1px solid "+C.border,borderRadius:7,padding:"7px 10px",color:C.text,fontSize:12,outline:"none",fontFamily:"inherit"};
  function dl(){
    var d={brand:brand,sov:sov,totalM:tM,totalC:tC,totalQ:tQ,totalWB:tWB,top5M:t5,allComps:allComps,compCounts:cC,brandKws:brandKws,gapKws:gapKws,recs:recs,comment:comment};
    var html=buildReport(d);
    var blob=new Blob([html],{type:"text/html"});var url=URL.createObjectURL(blob);
    var a=document.createElement("a");a.href=url;a.download="Sempai_AI_"+(brand.name||"Raport")+"_"+new Date().toISOString().slice(0,10)+".html";
    document.body.appendChild(a);a.click();document.body.removeChild(a);setTimeout(function(){URL.revokeObjectURL(url);},3000);
  }
  return React.createElement("div",null,
    React.createElement("h2",{style:{fontSize:18,fontWeight:900,color:C.text,marginBottom:6}},"Raport"),
    React.createElement("p",{style:{fontSize:12,color:C.muted,marginBottom:14,lineHeight:1.7}},"Podgląd otwiera się w nowej karcie i aktualizuje na żywo — kliknij 'Odśwież' po każdej edycji."),
    React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:9,marginBottom:14}},
      [{l:"AI SOV",v:sov+"%",c:C.green},{l:"Wzmianki",v:fmtN(tM),c:C.purple},{l:"Cytowania",v:fmtN(tC),c:C.sky},{l:"Luki",v:fmtN(gapKws.length),c:C.gold}].map(function(k,i){return React.createElement("div",{key:i,style:{textAlign:"center",padding:"11px",background:C.navy2,borderRadius:8,border:"1px solid "+k.c+"22"}},React.createElement("div",{style:{fontSize:9,color:"#4a7090",textTransform:"uppercase",letterSpacing:"1px",marginBottom:3}},k.l),React.createElement("div",{style:{fontSize:20,fontWeight:900,color:k.c}},k.v));})),
    React.createElement("div",{style:{background:C.navy2,border:"1px solid "+C.border,borderRadius:10,padding:"14px",marginBottom:12}},
      React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}},
        React.createElement("div",{style:{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"1px",fontWeight:700}},"🚀 Rekomendacje"),
        React.createElement("button",{onClick:addR,style:{fontSize:11,padding:"4px 12px",background:C.gold+"18",border:"1px solid "+C.gold+"44",borderRadius:7,color:C.gold,cursor:"pointer",fontWeight:700}},"+  Dodaj")),
      recs.length===0&&React.createElement("div",{style:{fontSize:12,color:"#3a5070",padding:"12px",textAlign:"center",border:"1px dashed #1a3354",borderRadius:8}},"Kliknij '+ Dodaj' aby wpisać rekomendacje dla klienta"),
      recs.map(function(r,i){return React.createElement("div",{key:r.id,style:{background:C.navy3,borderRadius:8,padding:"10px 12px",marginBottom:8,border:"1px solid "+C.border}},
        React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:6}},
          React.createElement("span",{style:{fontSize:12,color:C.gold,fontWeight:900,minWidth:20}},(i+1)+"."),
          React.createElement("input",{value:r.text,onChange:function(e){updR(r.id,"text",e.target.value);},placeholder:"Rekomendacja "+(i+1),style:Object.assign({},iS,{flex:1})}),
          React.createElement("button",{onClick:function(){setRecs(function(rs){return rs.filter(function(x){return x.id!==r.id;});});},style:{color:"#3a5070",background:"none",border:"none",cursor:"pointer",fontSize:16,padding:0}},"×")),
        React.createElement("input",{value:r.note,onChange:function(e){updR(r.id,"note",e.target.value);},placeholder:"Uzasadnienie (opcjonalnie)",style:Object.assign({},iS,{width:"100%",boxSizing:"border-box",marginLeft:28})}));})),
    React.createElement("div",{style:{background:C.navy2,border:"1px solid "+C.border,borderRadius:10,padding:"14px",marginBottom:14}},
      React.createElement("div",{style:{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"1px",fontWeight:700,marginBottom:6}},"Komentarz analityczny"),
      React.createElement("textarea",{value:comment,onChange:function(e){setComment(e.target.value);},placeholder:"Interpretacja wyników, kontekst branżowy, wnioski dla klienta...",style:{width:"100%",background:C.navy1,border:"1px solid "+C.border,borderRadius:8,padding:"10px 12px",color:C.text,fontSize:12,outline:"none",resize:"vertical",minHeight:90,boxSizing:"border-box",lineHeight:1.7,fontFamily:"inherit"}})),
    React.createElement("div",{style:{display:"flex",gap:10,flexWrap:"wrap",marginBottom:10}},
      React.createElement("button",{onClick:function(){openWin(recs,comment);},style:{padding:"11px 22px",background:C.green+"22",border:"1px solid "+C.green+"55",borderRadius:9,color:C.green,fontSize:13,fontWeight:800,cursor:"pointer"}},"👁 Otwórz podgląd w nowej karcie"),
      isOpen&&React.createElement("button",{onClick:function(){refreshWin(recs,comment);},style:{padding:"11px 22px",background:C.sky+"22",border:"1px solid "+C.sky+"55",borderRadius:9,color:C.sky,fontSize:13,fontWeight:700,cursor:"pointer"}},"🔄 Odśwież podgląd"),
      React.createElement("button",{onClick:dl,style:{padding:"11px 22px",background:"transparent",border:"1px solid "+C.border,borderRadius:9,color:C.muted,fontSize:13,fontWeight:700,cursor:"pointer"}},"⬇ Pobierz HTML")
    ),
    isOpen&&React.createElement("div",{style:{padding:"8px 12px",background:C.green+"10",border:"1px solid "+C.green+"33",borderRadius:8,fontSize:11,color:C.green}},"✓ Raport otwarty — edytuj rekomendacje lub komentarz, potem kliknij 'Odśwież podgląd' aby zobaczyć zmiany.")
  );
}
