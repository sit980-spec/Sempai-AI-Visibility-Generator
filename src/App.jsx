import { useState, useRef, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, AreaChart, Area,
} from "recharts";

const S = {
  navy1: "#07111f", navy2: "#0c1a2e", navy3: "#112240", navy4: "#1a3358",
  green: "#2edf8f", greenD: "#20b571", greenL: "#7af0bf",
  coral: "#ff5c6a", gold: "#f5c842", sky: "#4da6ff",
  text: "#e8f0ff", muted: "#4a7090", border: "#1a3354",
};

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map(line => {
    const vals = line.split(",").map(v => v.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ""; });
    return obj;
  });
}

const PLATFORMS = [
  { id: "google",     name: "Google AI Overviews", short: "Google AI",  color: S.sky,     icon: "G" },
  { id: "aimode",     name: "Google AI Mode",       short: "AI Mode",    color: "#34d399", icon: "M" },
  { id: "chatgpt",    name: "ChatGPT",               short: "ChatGPT",    color: S.green,   icon: "⚡" },
  { id: "perplexity", name: "Perplexity",             short: "Perplexity", color: "#a78bfa", icon: "◈" },
  { id: "copilot",    name: "MS Copilot",             short: "Copilot",    color: S.gold,    icon: "✦" },
];

/* ── Animated particle canvas ─────────────────────────────────────────────── */
function ParticleBg({ height = 320 }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf;
    canvas.width  = canvas.offsetWidth;
    canvas.height = height;
    const W = canvas.width, H = canvas.height;
    const pts = Array.from({ length: 45 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.28, vy: (Math.random() - 0.5) * 0.28,
      r: Math.random() * 1.4 + 0.4, a: Math.random() * 0.5 + 0.1,
    }));
    function draw() {
      ctx.clearRect(0, 0, W, H);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(46,223,143,${p.a * 0.22})`; ctx.fill();
      });
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
        if (d < 90) {
          ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y);
          ctx.strokeStyle = `rgba(46,223,143,${(1 - d / 90) * 0.055})`;
          ctx.lineWidth = 1; ctx.stroke();
        }
      }
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(raf);
  }, [height]);
  return <canvas ref={ref} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />;
}

/* ── Signal scanner canvas ────────────────────────────────────────────────── */
function SignalScanner({ data }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let frame = 0, raf;
    const nodes = PLATFORMS.map((p, i) => ({
      x: 60 + i * 115, y: 52,
      color: p.color, label: p.short,
      score: data[p.id]?.total > 0 ? Math.round((data[p.id].mentions / data[p.id].total) * 100) : 0,
    }));
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;
      for (let i = 0; i < nodes.length - 1; i++) {
        const a = nodes[i], b = nodes[i + 1];
        ctx.beginPath(); ctx.moveTo(a.x + 16, a.y); ctx.lineTo(b.x - 16, b.y);
        ctx.strokeStyle = "#1a335455"; ctx.lineWidth = 1; ctx.stroke();
        const t = (frame * 0.016 + i * 0.22) % 1;
        const px = (a.x + 16) + ((b.x - 16) - (a.x + 16)) * t;
        ctx.beginPath(); ctx.arc(px, a.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = S.green + "cc"; ctx.fill();
      }
      nodes.forEach(n => {
        const pulse = (frame * 0.022) % 1;
        ctx.beginPath(); ctx.arc(n.x, n.y, 17 + pulse * 16, 0, Math.PI * 2);
        ctx.strokeStyle = n.color + Math.floor((1 - pulse) * 66).toString(16).padStart(2, "0");
        ctx.lineWidth = 1.5; ctx.stroke();
        const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 17);
        g.addColorStop(0, n.color + "2a"); g.addColorStop(1, n.color + "05");
        ctx.beginPath(); ctx.arc(n.x, n.y, 17, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = n.color + "88"; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = n.color; ctx.font = "bold 11px monospace"; ctx.textAlign = "center";
        ctx.fillText(n.score + "%", n.x, n.y + 4);
        ctx.fillStyle = S.muted; ctx.font = "9px monospace";
        ctx.fillText(n.label, n.x, n.y + 28);
      });
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(raf);
  }, [data]);
  return <canvas ref={ref} width={640} height={86} style={{ width: "100%", maxWidth: 640, display: "block", margin: "0 auto" }} />;
}

/* ── Drop zone ─────────────────────────────────────────────────────────────── */
function DropZone({ platform, onData, hasData }) {
  const [drag, setDrag] = useState(false);
  const ref = useRef();
  const handle = file => {
    const r = new FileReader();
    r.onload = e => onData(platform.id, parseCSV(e.target.result));
    r.readAsText(file);
  };
  return (
    <div
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files[0]) handle(e.dataTransfer.files[0]); }}
      onClick={() => ref.current.click()}
      style={{
        border: `1.5px dashed ${drag ? platform.color : hasData ? platform.color + "88" : S.border}`,
        borderRadius: 10, padding: "16px 8px", cursor: "pointer", textAlign: "center",
        background: drag ? platform.color + "12" : hasData ? platform.color + "09" : "transparent",
        transition: "all .2s",
      }}>
      <input ref={ref} type="file" accept=".csv" style={{ display: "none" }}
        onChange={e => { if (e.target.files[0]) handle(e.target.files[0]); }} />
      <div style={{ fontSize: 18, marginBottom: 4 }}>{hasData ? "✅" : "📂"}</div>
      <div style={{ fontSize: 10, fontFamily: "monospace", color: hasData ? platform.color : S.muted }}>
        {hasData ? "Załadowano" : "Upuść CSV"}
      </div>
      <div style={{ fontSize: 9, color: "#233550", marginTop: 2 }}>{platform.short}</div>
    </div>
  );
}

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: S.navy3, border: `1px solid ${S.border}`, borderRadius: 8, padding: "10px 14px" }}>
      <div style={{ fontSize: 10, color: S.muted, marginBottom: 5 }}>{label}</div>
      {payload.map((p, i) => <div key={i} style={{ fontSize: 12, color: p.color, fontWeight: 700 }}>{p.name}: {p.value}</div>)}
    </div>
  );
};

/* ── MAIN ──────────────────────────────────────────────────────────────────── */
export default function App() {
  const [tab, setTab] = useState("setup");
  const [brand, setBrand] = useState({ name: "", url: "", industry: "", competitors: "" });
  const [csvData, setCsvData] = useState({});
  const [copied, setCopied] = useState(false);
  const [bs, setBs] = useState([
    { month: "Sty", v: 1200 }, { month: "Lut", v: 1450 }, { month: "Mar", v: 1380 },
    { month: "Kwi", v: 1680 }, { month: "Maj", v: 1920 }, { month: "Cze", v: 2250 },
  ]);

  const comps = brand.competitors ? brand.competitors.split(",").map(c => c.trim()).filter(Boolean) : [];

  const proc = {};
  PLATFORMS.forEach(p => {
    const rows = csvData[p.id] || [];
    const total = rows.length;
    const mentions  = rows.filter(r => r.brand_mentioned === "1" || r.brand_mentioned === "true").length;
    const citations = rows.filter(r => r.brand_cited === "1" || r.brand_cited === "true").length;
    const compData  = {};
    comps.forEach((c, i) => {
      compData[c] = {
        mentions:  rows.filter(r => r[`comp${i+1}_mentioned`] === "1").length,
        citations: rows.filter(r => r[`comp${i+1}_cited`]     === "1").length,
      };
    });
    proc[p.id] = { total, mentions, citations, compData };
  });

  const sovData = PLATFORMS.map(p => {
    const d = proc[p.id];
    const allM = d.mentions + comps.reduce((s, c) => s + (d.compData[c]?.mentions || 0), 0);
    return {
      platform: p.short, color: p.color,
      sov: allM > 0 ? Math.round((d.mentions / allM) * 100) : 0,
      mentions: d.mentions, citations: d.citations, total: d.total,
    };
  });

  const totalQ = PLATFORMS.reduce((s, p) => s + (proc[p.id]?.total    || 0), 0);
  const totalM = PLATFORMS.reduce((s, p) => s + (proc[p.id]?.mentions  || 0), 0);
  const totalC = PLATFORMS.reduce((s, p) => s + (proc[p.id]?.citations || 0), 0);
  const visM   = totalQ > 0 ? Math.round((totalM / totalQ) * 100) : 0;
  const visC   = totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0;
  const active = sovData.filter(d => d.total > 0);
  const avgSOV = active.length > 0 ? Math.round(active.reduce((s, d) => s + d.sov, 0) / active.length) : 0;
  const ranked = [...active].sort((a, b) => b.sov - a.sov);
  const best = ranked[0], worst = ranked[ranked.length - 1];

  const radarData = PLATFORMS.map(p => ({
    platform: p.short,
    Wzmianki:  proc[p.id]?.total > 0 ? Math.round((proc[p.id].mentions  / proc[p.id].total) * 100) : 0,
    Cytowania: proc[p.id]?.total > 0 ? Math.round((proc[p.id].citations / proc[p.id].total) * 100) : 0,
  }));

  const genPrompt = () => `Jesteś ekspertem ds. AI Visibility i marketingu cyfrowego. Przygotuj szczegółowy raport opisowy w języku polskim jako dokument Word (.docx).

## DANE KLIENTA
Nazwa: ${brand.name || "[KLIENT]"}   URL: ${brand.url || "[URL]"}
Branża: ${brand.industry || "[BRANŻA]"}   Konkurenci: ${comps.join(", ") || "[brak]"}

## WYNIKI LICZBOWE
AI Share of Voice (śr.): ${avgSOV}%   |   Visibility Score Mentions: ${visM}%   |   Citation Score: ${visC}%
Łączne zapytania: ${totalQ}   |   Wzmianki: ${totalM}   |   Cytowania: ${totalC}

${PLATFORMS.map(p => { const d = proc[p.id]; const mR = d.total > 0 ? Math.round((d.mentions/d.total)*100) : 0; const cR = d.total > 0 ? Math.round((d.citations/d.total)*100) : 0; return `• ${p.name}: ${d.mentions}/${d.total} wzmianek (${mR}%), ${d.citations} cytowań (${cR}%)`; }).join("\n")}
${best  ? `\nNajlepsza platforma: ${best.platform} (SOV ${best.sov}%)` : ""}
${worst && worst !== best ? `Platforma do poprawy: ${worst.platform} (SOV ${worst.sov}%)` : ""}

---

## STRUKTURA RAPORTU

### SEKCJA 1 — AI Share of Voice (SOV)
Komentarz analityczny (min. 4 akapity): ogólna ocena pozycji, najlepsza i najgorsza platforma, szczegółowe omówienie każdej platformy, rekomendacje.

### SEKCJA 2 — Brand Mentions
Komentarz analityczny (min. 4 akapity): rozpoznawalność marki w AI, dysproporcje wzmianki/cytowania, zachowanie platform, kontekst strategiczny.

### SEKCJA 3 — AI Visibility Score — Wzmianki
Komentarz (min. 3 akapity): korelacja z Brand Mentions, liderzy i maruderzy, interpretacja wskaźnika.

### SEKCJA 4 — AI Visibility Score — Cytowania
Komentarz (min. 4 akapity): jakość techniczna strony, porównanie z wzmiankami, analiza per platforma, priorytety optymalizacyjne.

### SEKCJA 5 — Wzrost Branded Searches
Komentarz (min. 3 akapity): trend, korelacja AI → brand lift, prognozy.

### KOMENTARZ CAŁOŚCIOWY
Strategiczny komentarz zbiorczy (min. 5 akapitów): ocena pozycji, mocne strony (min. 3), obszary do poprawy (min. 3), strategia 3–6 miesięcy, potencjał wzrostu.

## WYMAGANIA: język polski · ton profesjonalny · format Word (.docx) · odniesienia do konkretnych liczb

## PLIK DO ANALIZY
[ZAŁĄCZ PLIK .DOCX Z RAPORTEM WIDOCZNOŚCI AI]`;

  const TABS = [
    { id: "setup",     label: "① Klient" },
    { id: "import",    label: "② Import CSV" },
    { id: "dashboard", label: "③ Dashboard" },
    { id: "prompt",    label: "④ Prompt" },
  ];

  const isReady = !!(brand.name && brand.industry);

  return (
    <div style={{ minHeight: "100vh", background: S.navy1, color: S.text, fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>

      {/* HEADER */}
      <div style={{ background: S.navy2, borderBottom: `1px solid ${S.border}`, position: "relative", overflow: "hidden", minHeight: 110 }}>
        <ParticleBg height={110} />
        <div style={{ position: "relative", maxWidth: 980, margin: "0 auto", padding: "24px 28px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            {/* Sempai S mark */}
            <div style={{
              width: 42, height: 42, borderRadius: 10, flexShrink: 0,
              background: `linear-gradient(135deg, ${S.green}20, ${S.navy4})`,
              border: `1.5px solid ${S.green}55`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 900, fontSize: 20, color: S.green,
            }}>S</div>
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{ fontSize: 21, fontWeight: 800, color: S.text, letterSpacing: "-0.3px" }}>sempai</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: S.green, background: S.green + "18", border: `1px solid ${S.green}44`, borderRadius: 5, padding: "1px 8px", letterSpacing: "1.2px", textTransform: "uppercase" }}>AI Visibility</span>
              </div>
              <div style={{ fontSize: 10, color: S.muted, letterSpacing: "2px", textTransform: "uppercase", marginTop: 1 }}>Report Generator · Let us perform!</div>
            </div>
          </div>
          <div style={{ display: "flex" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: "9px 20px", background: "transparent", border: "none",
                borderBottom: tab === t.id ? `2px solid ${S.green}` : "2px solid transparent",
                color: tab === t.id ? S.green : S.muted,
                fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all .15s",
              }}>{t.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 980, margin: "0 auto", padding: "30px 28px 60px" }}>

        {/* SETUP */}
        {tab === "setup" && (
          <div>
            <STitle>Dane klienta</STitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <Inp label="Nazwa klienta / marki *" value={brand.name} set={v => setBrand(b => ({...b, name: v}))} ph="np. TechCorp Polska" />
              <Inp label="URL strony" value={brand.url} set={v => setBrand(b => ({...b, url: v}))} ph="np. techcorp.pl" />
              <Inp label="Branża *" value={brand.industry} set={v => setBrand(b => ({...b, industry: v}))} ph="np. SaaS / CRM / E-commerce" />
              <Inp label="Konkurenci (oddziel przecinkami)" value={brand.competitors} set={v => setBrand(b => ({...b, competitors: v}))} ph="Salesforce, HubSpot, Pipedrive" />
            </div>
            {comps.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                {comps.map((c, i) => {
                  const colors = [S.green, S.sky, S.coral, S.gold, "#a78bfa"];
                  return <span key={i} style={{ padding: "4px 13px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: colors[i%5]+"1a", border: `1px solid ${colors[i%5]}44`, color: colors[i%5] }}>{c}</span>;
                })}
              </div>
            )}
            <Card>
              <CLabel>Format CSV — przykład</CLabel>
              <pre style={{ fontSize: 11, color: S.green, background: S.navy1, padding: "13px 15px", borderRadius: 8, border: `1px solid ${S.border}`, overflow: "auto", lineHeight: 1.9, margin: "0 0 10px", fontFamily: "monospace" }}>{`query,brand_mentioned,brand_cited,comp1_mentioned,comp1_cited,comp2_mentioned,comp2_cited
best crm software,1,1,1,0,0,0
top marketing tools,1,0,1,1,1,0
enterprise solutions,0,0,1,1,0,0`}</pre>
              <p style={{ fontSize: 12, color: S.muted, margin: 0, lineHeight: 1.7 }}>
                <strong style={{ color: S.green }}>Kolumny:</strong> query · brand_mentioned (0/1) · brand_cited (0/1) · comp1_mentioned · comp1_cited · ...
              </p>
            </Card>
            <Btn onClick={() => setTab("import")} disabled={!isReady}>Dalej → Import CSV</Btn>
          </div>
        )}

        {/* IMPORT */}
        {tab === "import" && (
          <div>
            <STitle>Import danych CSV</STitle>
            <p style={{ fontSize: 13, color: S.muted, marginBottom: 20 }}>Wgraj CSV dla każdej platformy. Brak pliku = wynik 0 — system działa normalnie.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 26 }}>
              {PLATFORMS.map(p => (
                <DropZone key={p.id} platform={p} hasData={!!csvData[p.id]}
                  onData={(id, rows) => setCsvData(d => ({...d, [id]: rows}))} />
              ))}
            </div>
            <Card style={{ marginBottom: 24 }}>
              <CLabel>Wzrost Branded Searches — dane miesięczne</CLabel>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
                {bs.map((item, i) => (
                  <div key={i}>
                    <div style={{ fontSize: 10, color: S.muted, marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{item.month}</div>
                    <input type="number" value={item.v}
                      onChange={e => setBs(arr => arr.map((x, j) => j === i ? {...x, v: +e.target.value} : x))}
                      style={{ width: "100%", boxSizing: "border-box", background: S.navy1, border: `1px solid ${S.border}`, borderRadius: 6, padding: "8px", color: S.text, fontSize: 12, fontFamily: "monospace" }} />
                  </div>
                ))}
              </div>
            </Card>
            <div style={{ display: "flex", gap: 12 }}>
              <Btn onClick={() => setTab("setup")} muted>← Wróć</Btn>
              <Btn onClick={() => setTab("dashboard")}>Dashboard →</Btn>
            </div>
          </div>
        )}

        {/* DASHBOARD */}
        {tab === "dashboard" && (
          <div>
            <STitle>Dashboard Widoczności AI</STitle>

            {/* Scanner */}
            <Card style={{ marginBottom: 18 }}>
              <CLabel>◈ AI Signal Scanner — Live</CLabel>
              <SignalScanner data={proc} />
            </Card>

            {/* KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 18 }}>
              {[
                { label: "AI Share of Voice", value: avgSOV + "%", color: S.green, sub: "Średnia SOV platform" },
                { label: "Visibility Score", value: visM + "%", color: S.sky, sub: "Mention Rate" },
                { label: "Citation Score", value: visC + "%", color: "#a78bfa", sub: "Citation Rate" },
                { label: "Zapytań łącznie", value: totalQ, color: S.gold, sub: "Wszystkie platformy" },
              ].map((k, i) => (
                <div key={i} style={{ background: S.navy2, border: `1px solid ${k.color}1a`, borderRadius: 12, padding: "18px 16px", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: -22, right: -22, width: 80, height: 80, borderRadius: "50%", background: k.color + "0b" }} />
                  <div style={{ fontSize: 9, color: S.muted, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700, marginBottom: 8 }}>{k.label}</div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: k.color, lineHeight: 1 }}>{k.value}</div>
                  <div style={{ fontSize: 9, color: "#233550", marginTop: 5 }}>{k.sub}</div>
                  {typeof k.value === "string" && k.value.endsWith("%") && (
                    <div style={{ marginTop: 10, height: 3, background: S.navy4, borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ width: k.value, height: "100%", background: k.color, borderRadius: 2 }} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* SOV + Radar */}
            <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 14, marginBottom: 14 }}>
              <Card>
                <CLabel>AI Share of Voice — per platforma</CLabel>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={sovData} margin={{ top: 10, right: 10, left: -22, bottom: 0 }}>
                    <defs>
                      <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={S.green} />
                        <stop offset="100%" stopColor={S.greenD + "77"} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 4" stroke={S.border} />
                    <XAxis dataKey="platform" tick={{ fill: S.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: S.muted, fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                    <Tooltip content={<Tip />} />
                    <Bar dataKey="sov" name="SOV %" fill="url(#g1)" radius={[5, 5, 0, 0]}
                      label={{ position: "top", fill: S.green, fontSize: 10, formatter: v => v + "%" }} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card>
                <CLabel>Radar widoczności</CLabel>
                <ResponsiveContainer width="100%" height={210}>
                  <RadarChart data={radarData} margin={{ top: 12, right: 22, left: 22, bottom: 10 }}>
                    <PolarGrid stroke={S.border} />
                    <PolarAngleAxis dataKey="platform" tick={{ fill: S.muted, fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#233550", fontSize: 8 }} />
                    <Radar name="Wzmianki" dataKey="Wzmianki" stroke={S.green} fill={S.green} fillOpacity={0.12} strokeWidth={2} />
                    <Radar name="Cytowania" dataKey="Cytowania" stroke={S.sky} fill={S.sky} fillOpacity={0.12} strokeWidth={2} />
                    <Legend wrapperStyle={{ fontSize: 11, color: S.muted }} />
                  </RadarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Mentions vs Citations */}
            <Card style={{ marginBottom: 14 }}>
              <CLabel>Wzmianki vs Cytowania — per platforma</CLabel>
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={sovData} margin={{ top: 8, right: 10, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke={S.border} />
                  <XAxis dataKey="platform" tick={{ fill: S.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: S.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<Tip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: S.muted }} />
                  <Bar dataKey="mentions"  name="Wzmianki"  fill={S.green} radius={[3,3,0,0]} />
                  <Bar dataKey="citations" name="Cytowania"  fill={S.sky}   radius={[3,3,0,0]} />
                  <Bar dataKey="total"     name="Zapytania"  fill={S.navy4} radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Branded searches */}
            <Card style={{ marginBottom: 14 }}>
              <CLabel>📈 Wzrost Branded Searches</CLabel>
              <ResponsiveContainer width="100%" height={165}>
                <AreaChart data={bs.map(x => ({ month: x.month, searches: x.v }))} margin={{ top: 8, right: 10, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="bsg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={S.coral} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={S.coral} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke={S.border} />
                  <XAxis dataKey="month" tick={{ fill: S.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: S.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<Tip />} />
                  <Area type="monotone" dataKey="searches" name="Branded Searches" stroke={S.coral} fill="url(#bsg)" strokeWidth={2.5} dot={{ fill: S.coral, r: 4, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            {/* Table */}
            <Card style={{ marginBottom: 16 }}>
              <CLabel>Tabela szczegółowa</CLabel>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${S.border}` }}>
                      {["Platforma","Zapytań","Wzmianki","Cytowania","SOV %","Mention Rate","Citation Rate"].map(h => (
                        <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 9, color: S.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PLATFORMS.map(p => {
                      const d = proc[p.id];
                      const allM = d.mentions + comps.reduce((s, c) => s + (d.compData[c]?.mentions || 0), 0);
                      const sov = allM > 0 ? Math.round((d.mentions / allM) * 100) : 0;
                      const mR  = d.total > 0 ? Math.round((d.mentions  / d.total) * 100) : 0;
                      const cR  = d.total > 0 ? Math.round((d.citations / d.total) * 100) : 0;
                      return (
                        <tr key={p.id} style={{ borderBottom: `1px solid ${S.navy3}` }}>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={{ background: p.color + "20", color: p.color, borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{p.icon} {p.short}</span>
                          </td>
                          <td style={{ padding: "10px 12px", color: S.muted, fontFamily: "monospace" }}>{d.total}</td>
                          <td style={{ padding: "10px 12px", color: S.green, fontFamily: "monospace", fontWeight: 700 }}>{d.mentions}</td>
                          <td style={{ padding: "10px 12px", color: S.sky,   fontFamily: "monospace", fontWeight: 700 }}>{d.citations}</td>
                          <td style={{ padding: "10px 12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 42, height: 5, background: S.navy4, borderRadius: 2, overflow: "hidden" }}>
                                <div style={{ width: sov + "%", height: "100%", background: `linear-gradient(90deg,${S.green},${S.sky})`, borderRadius: 2 }} />
                              </div>
                              <span style={{ fontFamily: "monospace", fontSize: 12, color: S.text }}>{sov}%</span>
                            </div>
                          </td>
                          <td style={{ padding: "10px 12px", fontFamily: "monospace", color: S.text }}>{mR}%</td>
                          <td style={{ padding: "10px 12px", fontFamily: "monospace", color: S.text }}>{cR}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Insights */}
            <Card>
              <CLabel>✦ Spostrzeżenia Sempai</CLabel>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {best  && <Ins color={S.green}  i="↑" t={`Najlepsza platforma: ${best.platform} — SOV ${best.sov}%`} />}
                {worst && worst !== best && <Ins color={S.coral}  i="↓" t={`Platforma do poprawy: ${worst.platform} — SOV ${worst.sov}%`} />}
                {visM > visC  && <Ins color="#a78bfa" i="!" t={`Dysproporcja wzmianki (${visM}%) vs cytowania (${visC}%) — warto poprawić tech SEO`} />}
                {visM <= visC && <Ins color={S.green}  i="✓" t="Dobra korelacja wzmianek i cytowań — strona technicznie OK" />}
                <Ins color={S.gold} i="→" t="Priorytet: optymalizacja treści AI dla platform z SOV < 20%" />
                <Ins color={S.sky}  i="◈" t={`${brand.name || "Marka"} widoczna w ${PLATFORMS.filter(p => proc[p.id]?.mentions > 0).length}/${PLATFORMS.length} platformach AI`} />
              </div>
            </Card>

            <Btn onClick={() => setTab("prompt")} style={{ marginTop: 22 }}>Generuj Prompt →</Btn>
          </div>
        )}

        {/* PROMPT */}
        {tab === "prompt" && (
          <div>
            <STitle>Gotowy Prompt</STitle>
            <p style={{ fontSize: 13, color: S.muted, marginBottom: 18 }}>
              Skopiuj i wklej do Claude / ChatGPT razem z plikiem .docx raportu widoczności AI.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Klient", value: brand.name || "—", color: S.green },
                { label: "Branża", value: brand.industry || "—", color: S.sky },
                { label: "Konkurenci", value: comps.length > 0 ? comps.join(", ") : "—", color: S.coral },
              ].map((x, i) => (
                <div key={i} style={{ background: S.navy2, border: `1px solid ${x.color}1a`, borderRadius: 10, padding: "13px 15px" }}>
                  <div style={{ fontSize: 9, color: S.muted, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 700 }}>{x.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: x.color, wordBreak: "break-word" }}>{x.value}</div>
                </div>
              ))}
            </div>
            <div style={{ position: "relative" }}>
              <pre style={{
                background: S.navy1, border: `1px solid ${S.border}`, borderRadius: 12,
                padding: "22px 24px", fontSize: 12, lineHeight: 1.85, color: "#3a6080",
                overflow: "auto", maxHeight: 460, whiteSpace: "pre-wrap", fontFamily: "monospace",
              }}>{genPrompt()}</pre>
              <button onClick={() => { navigator.clipboard.writeText(genPrompt()); setCopied(true); setTimeout(() => setCopied(false), 2200); }}
                style={{
                  position: "absolute", top: 14, right: 14,
                  background: copied ? S.green + "22" : S.navy3,
                  border: `1px solid ${copied ? S.green : S.border}`,
                  borderRadius: 8, padding: "8px 18px",
                  color: copied ? S.green : S.muted, fontSize: 12, fontWeight: 700, cursor: "pointer",
                  transition: "all .2s",
                }}>{copied ? "✓ Skopiowano!" : "⎘ Kopiuj"}</button>
            </div>

            <div style={{ background: S.navy2, border: `1px solid ${S.green}22`, borderRadius: 12, padding: "18px 22px", marginTop: 18 }}>
              <div style={{ fontSize: 12, color: S.green, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ background: S.green + "20", borderRadius: 5, padding: "2px 8px" }}>S</span>
                sempai — jak użyć?
              </div>
              {["Skopiuj prompt powyżej", "Otwórz Claude.ai lub ChatGPT", "Wklej prompt i dołącz plik .docx z raportem widoczności AI", "Gotowy raport pojawi się w kilkadziesiąt sekund 🚀"].map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 12, marginBottom: 7 }}>
                  <span style={{ color: S.green, fontWeight: 900, fontSize: 12, flexShrink: 0 }}>{i + 1}.</span>
                  <span style={{ fontSize: 13, color: S.muted, lineHeight: 1.5 }}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Small helpers ─────────────────────────────────────────────────────────── */
const STitle = ({ children }) => (
  <div style={{ marginBottom: 22 }}>
    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: S.text }}>{children}</h2>
    <div style={{ width: 34, height: 2, background: `linear-gradient(90deg,${S.green},transparent)`, marginTop: 7 }} />
  </div>
);

const Inp = ({ label, value, set, ph }) => {
  const [f, setF] = useState(false);
  return (
    <div>
      <label style={{ display: "block", fontSize: 9, color: S.muted, marginBottom: 5, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase" }}>{label}</label>
      <input value={value} onChange={e => set(e.target.value)} placeholder={ph}
        onFocus={() => setF(true)} onBlur={() => setF(false)}
        style={{ width: "100%", boxSizing: "border-box", background: S.navy2, border: `1px solid ${f ? S.green + "66" : S.border}`, borderRadius: 8, padding: "10px 13px", color: S.text, fontSize: 13, outline: "none", transition: "border .15s" }} />
    </div>
  );
};

const Card = ({ children, style }) => (
  <div style={{ background: S.navy2, border: `1px solid ${S.border}`, borderRadius: 12, padding: "18px 20px", ...style }}>{children}</div>
);

const CLabel = ({ children }) => (
  <div style={{ fontSize: 9, color: S.muted, marginBottom: 12, fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase" }}>{children}</div>
);

const Ins = ({ color, i, t }) => (
  <div style={{ display: "flex", gap: 10, padding: "10px 14px", background: color + "0b", border: `1px solid ${color}22`, borderRadius: 8 }}>
    <span style={{ color, fontWeight: 900, fontSize: 14, flexShrink: 0 }}>{i}</span>
    <span style={{ fontSize: 12, color: S.muted, lineHeight: 1.55 }}>{t}</span>
  </div>
);

const Btn = ({ children, onClick, disabled, muted, style }) => (
  <button onClick={onClick} disabled={disabled} style={{
    marginTop: 18, padding: "11px 26px",
    background: disabled || muted ? "transparent" : S.green + "18",
    border: `1px solid ${disabled ? S.border : muted ? S.muted + "44" : S.green + "55"}`,
    borderRadius: 10, color: disabled ? S.border : muted ? S.muted : S.green,
    fontSize: 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
    letterSpacing: "0.2px", transition: "all .15s", ...style,
  }}>{children}</button>
);
