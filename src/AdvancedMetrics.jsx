import React from "react";

const S={green:"#2edf8f",sky:"#4da6ff",coral:"#ff5c6a",gold:"#f5c842",purple:"#a78bfa",navy1:"#07111f",navy2:"#0c1a2e",navy3:"#0a1520",navy4:"#04090f",text:"#d0e8f0",muted:"#4a7090",border:"#0e1e2e"};

function Card({children,style={}}){return<div style={{background:S.navy2,border:"1px solid "+S.border,borderRadius:12,padding:"14px 16px",marginBottom:14,...style}}>{children}</div>;}
function SL({children,color=S.muted}){return<div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",color:color,marginBottom:10}}>{children}</div>;}
function Explain({children,type="info"}){const c=type==="warn"?"#f5c842":type==="success"?"#2edf8f":"#4da6ff";return<div style={{background:c+"0a",border:"1px solid "+c+"22",borderLeft:"3px solid "+c,borderRadius:6,padding:"7px 11px",marginBottom:10,fontSize:11,color:c,lineHeight:1.6}}>{children}</div>;}

export default function AdvancedMetrics({globalSentScore,totalSentPos,totalSentNeg,totalSentNeu,globalRecRate,totalRecTotal,totalRecWithBrand,globalControlRatio,totalOwnedLinks,totalAllLinks,fmtN}) {
  return (
{/* Advanced Metrics — beyond Ahrefs */}
<Card style={{marginBottom:14,border:"1px solid #1a2a3a"}}>
  <SL color="#90c8e0">🔬 Metryki zaawansowane — poza standardem Ahrefs</SL>
  <Explain type="info"><strong>Skąd te dane?</strong> Narzędzie analizuje treść odpowiedzi AI z kolumny Response/AI Overview w Twoich plikach CSV. Sentiment = analiza słów kluczowych wokół wzmianki marki. Rekomendacje = zapytania zawierające słowa "polecasz", "najlepszy" itp. Control Ratio = % linków z Twojej własnej domeny vs zewnętrzne.</Explain>
  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>

    {/* Metric 1: Sentiment */}
    <div style={{background:"#040e18",border:"1px solid #0e2a3a",borderRadius:10,padding:"14px 15px"}}>
      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:10}}>
        <span style={{fontSize:16}}>😊</span>
        <div>
          <div style={{fontSize:11,fontWeight:800,color:"#90c8e0"}}>Sentiment Score</div>
          <div style={{fontSize:9,color:"#4a7090",textTransform:"uppercase",letterSpacing:"0.7px"}}>Jakość wzmianek (-100 do +100)</div>
        </div>
      </div>
      {globalSentScore===null ? (
        <div style={{fontSize:11,color:"#3a6070"}}>Brak wystarczających danych — wgraj pliki z kolumną Response lub AI Overview.</div>
      ) : (
        <div>
          <div style={{fontSize:28,fontWeight:900,color:globalSentScore>20?S.green:globalSentScore>-20?"#f5c842":S.coral,marginBottom:8}}>{globalSentScore>0?"+":""}{globalSentScore}</div>
          <div style={{display:"flex",gap:6,marginBottom:8}}>
            <span style={{padding:"2px 8px",borderRadius:10,fontSize:10,fontWeight:700,background:S.green+"18",color:S.green}}>✓ {totalSentPos} pozytywne</span>
            <span style={{padding:"2px 8px",borderRadius:10,fontSize:10,fontWeight:700,background:"#4a709018",color:"#7aabbf"}}>~ {totalSentNeu} neutralne</span>
            <span style={{padding:"2px 8px",borderRadius:10,fontSize:10,fontWeight:700,background:S.coral+"18",color:S.coral}}>✗ {totalSentNeg} negatywne</span>
          </div>
          <div style={{fontSize:10,color:"#3a6070",lineHeight:1.6}}>
            {globalSentScore>30?"AI wypowiada się o marce głównie pozytywnie — przewaga rekomendacji nad krytyką.":
             globalSentScore>-10?"AI wypowiada się o marce neutralnie — brak wyraźnego nastawienia.":
             "Uwaga: AI częściej wymienia markę w negatywnym kontekście. Sprawdź które zapytania generują negatywne wzmianki."}
          </div>
          <div style={{fontSize:9,color:"#2a4050",marginTop:6,padding:"4px 7px",background:"#020a14",borderRadius:4}}>
            Wzór: (pozytywne - negatywne) / łączne x 100
          </div>
        </div>
      )}
    </div>

    {/* Metric 2: Share of Recommendations */}
    <div style={{background:"#040e18",border:"1px solid #0e2a3a",borderRadius:10,padding:"14px 15px"}}>
      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:10}}>
        <span style={{fontSize:16}}>🏆</span>
        <div>
          <div style={{fontSize:11,fontWeight:800,color:"#90c8e0"}}>Share of Recommendations</div>
          <div style={{fontSize:9,color:"#4a7090",textTransform:"uppercase",letterSpacing:"0.7px"}}>Udział w zapytaniach-rekomendacjach</div>
        </div>
      </div>
      {globalRecRate===null||totalRecTotal===0 ? (
        <div style={{fontSize:11,color:"#3a6070"}}>Brak zapytań z intencją rekomendacji (słowa: "polecasz", "najlepszy", "który warto" itp.).</div>
      ) : (
        <div>
          <div style={{fontSize:28,fontWeight:900,color:globalRecRate>30?S.green:globalRecRate>10?"#f5c842":S.coral,marginBottom:5}}>{globalRecRate}%</div>
          <div style={{fontSize:11,color:"#7aabbf",marginBottom:8}}>{totalRecWithBrand} z {totalRecTotal} zapytań-rekomendacji</div>
          <div style={{height:6,background:"#0e1e2e",borderRadius:3,overflow:"hidden",marginBottom:8}}>
            <div style={{width:globalRecRate+"%",height:"100%",background:"linear-gradient(90deg,#f5c842,#2edf8f)",borderRadius:3}}/>
          </div>
          <div style={{fontSize:10,color:"#3a6070",lineHeight:1.6}}>
            {globalRecRate>30?"Silna pozycja w zapytaniach zakupowych — AI rekomenduje markę często.":
             globalRecRate>10?"Marka pojawia się w rekomendacjach, ale rzadko jako pierwsza.":
             "Marka rzadko pojawia się w zapytaniach 'który polecasz'. To bezpośrednio wpływa na konwersje z AI."}
          </div>
          <div style={{fontSize:9,color:"#2a4050",marginTop:6,padding:"4px 7px",background:"#020a14",borderRadius:4}}>
            Wzór: wzmianki w rec-queries / wszystkie rec-queries x 100
          </div>
        </div>
      )}
    </div>

    {/* Metric 3: Control Ratio */}
    <div style={{background:"#040e18",border:"1px solid #0e2a3a",borderRadius:10,padding:"14px 15px"}}>
      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:10}}>
        <span style={{fontSize:16}}>🎛️</span>
        <div>
          <div style={{fontSize:11,fontWeight:800,color:"#90c8e0"}}>Narrative Control Ratio</div>
          <div style={{fontSize:9,color:"#4a7090",textTransform:"uppercase",letterSpacing:"0.7px"}}>% cytowań z własnych mediów</div>
        </div>
      </div>
      {globalControlRatio===null ? (
        <div style={{fontSize:11,color:"#3a6070"}}>Brak danych o linkach — wgraj pliki z kolumną Link URL.</div>
      ) : (
        <div>
          <div style={{fontSize:28,fontWeight:900,color:globalControlRatio>50?S.green:globalControlRatio>25?"#f5c842":S.coral,marginBottom:5}}>{globalControlRatio}%</div>
          <div style={{fontSize:11,color:"#7aabbf",marginBottom:8}}>{fmtN(totalOwnedLinks)} z {fmtN(totalAllLinks)} linków pochodzi z Twojej domeny</div>
          <div style={{height:6,background:"#0e1e2e",borderRadius:3,overflow:"hidden",marginBottom:8}}>
            <div style={{width:globalControlRatio+"%",height:"100%",background:"linear-gradient(90deg,"+S.sky+","+S.green+")",borderRadius:3}}/>
          </div>
          <div style={{fontSize:10,color:"#3a6070",lineHeight:1.6}}>
            {globalControlRatio>60?"AI czerpie wiedzę głównie z Twoich treści — dobra kontrola narracji.":
             globalControlRatio>30?"AI miesza Twoje i zewnętrzne źródła — zadbaj o więcej własnego contentu.":
             "AI bazuje głównie na zewnętrznych źródłach. Tworzysz mało treści lub Twoja strona ma niski autorytet."}
          </div>
          <div style={{fontSize:9,color:"#2a4050",marginTop:6,padding:"4px 7px",background:"#020a14",borderRadius:4}}>
            Wzór: linki z własnej domeny / wszystkie linki w odpowiedziach x 100
          </div>
        </div>
      )}
    </div>

  </div>

  {/* Hallucination checklist — manual */}
  <div style={{marginTop:12,padding:"12px 14px",background:"#0a0614",border:"1px solid #2a1040",borderRadius:9}}>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
      <span style={{fontSize:14}}>🧠</span>
      <div style={{fontSize:11,fontWeight:800,color:"#c0a0ff"}}>AI Hallucination Rate — weryfikacja ręczna</div>
      <span style={{fontSize:9,color:"#7050c0",background:"#2a1040",borderRadius:4,padding:"1px 6px",fontWeight:700}}>MANUAL REVIEW</span>
    </div>
    <div style={{fontSize:11,color:"#8070b0",lineHeight:1.7,marginBottom:10}}>
      Halucynacji AI nie da się wykryć automatycznie z danych CSV — wymaga manualnego sprawdzenia. Przejrzyj próbkę odpowiedzi AI w Ahrefs i zaznacz co znalazłeś:
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
      {[
        {icon:"💰",label:"Błędne ceny lub parametry produktów"},
        {icon:"📍",label:"Błędna lokalizacja lub dane kontaktowe"},
        {icon:"📅",label:"Nieaktualne informacje (stare oferty, zamknięte sklepy)"},
        {icon:"⚠️",label:"Fałszywe porównania z konkurentami"},
        {icon:"🔗",label:"AI cytuje negatywne treści o marce (Reddit, forum)"},
        {icon:"✅",label:"Brak halucynacji — dane są poprawne"},
      ].map((item,i)=>(
        <label key={i} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"8px 10px",background:"#060210",border:"1px solid #1a1030",borderRadius:7,cursor:"pointer"}}>
          <input type="checkbox" style={{marginTop:2,accentColor:"#a78bfa"}}/>
          <span style={{fontSize:11,color:"#9080c0",lineHeight:1.5}}>{item.icon} {item.label}</span>
        </label>
      ))}
    </div>
    <div style={{fontSize:10,color:"#4a3060",marginTop:8}}>
      Jeśli znajdziesz halucynacje — zaktualizuj treści na stronie, dodaj structured data FAQ i zgłoś feedback do danej platformy AI.
    </div>
  </div>

  </div>
  </div>
</Card>
  );
}
