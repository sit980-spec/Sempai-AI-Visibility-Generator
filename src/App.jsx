import { useState, useRef, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Cell,
} from "recharts";

const S = {
  navy1:"#07111f", navy2:"#0c1a2e", navy3:"#112240", navy4:"#1a3358",
  green:"#2edf8f", greenD:"#20b571", coral:"#ff5c6a",
  gold:"#f5c842", sky:"#4da6ff", purple:"#a78bfa",
  text:"#e8f0ff", muted:"#4a7090", border:"#1a3354",
};

const PLATFORMS = [
  { id:"ai_overview", name:"AI Overview",  short:"AI Overview", color:S.sky,     icon:"G" },
  { id:"ai_mode",     name:"AI Mode",       short:"AI Mode",     color:"#34d399", icon:"M" },
  { id:"chatgpt",     name:"ChatGPT",        short:"ChatGPT",     color:S.green,   icon:"⚡" },
  { id:"gemini",      name:"Gemini",          short:"Gemini",      color:S.coral,   icon:"◆" },
  { id:"perplexity",  name:"Perplexity",      short:"Perplexity",  color:S.purple,  icon:"◈" },
  { id:"copilot",     name:"Copilot",          short:"Copilot",     color:S.gold,    icon:"✦" },
];

/* ── Auto-detect encoding: UTF-16 LE/BE, UTF-8 BOM, UTF-8 ─────────────────── */
function decodeBuffer(buffer) {
  const bytes = new Uint8Array(buffer);
  // UTF-16 LE (FF FE) or BE (FE FF)
  if ((bytes[0] === 0xFF && bytes[1] === 0xFE) || (bytes[0] === 0xFE && bytes[1] === 0xFF)) {
    return new TextDecoder("utf-16").decode(buffer);
  }
  // UTF-8 BOM
  if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return new TextDecoder("utf-8").decode(buffer).replace(/^\uFEFF/, "");
  }
  // Default UTF-8
  return new TextDecoder("utf-8").decode(buffer);
}

/* ── TSV / CSV parser supporting multi-line quoted cells ───────────────────── */
function parseDelimited(text) {
  // Auto-detect separator from first line
  const firstLine = text.split("\n")[0];
  const sep = firstLine.includes("\t") ? "\t" : ",";

  const rows = [];
  let row = [], cell = "", inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], nx = text[i + 1];
    if (ch === '"') {
      if (inQuote && nx === '"') { cell += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === sep && !inQuote) {
      row.push(cell.trim()); cell = "";
    } else if ((ch === "\n" || (ch === "\r" && nx === "\n")) && !inQuote) {
      if (ch === "\r") i++;
      row.push(cell.trim()); cell = "";
      if (row.some(c => c)) rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  if (cell || row.length) { row.push(cell.trim()); if (row.some(c => c)) rows.push(row); }
  return rows;
}

/* ── Platform detection ────────────────────────────────────────────────────── */
function detectPlatform(headers, rows) {
  const hLower = headers.map(h => h.toLowerCase());
  if (headers.some(h => h === "AI Overview")) return "ai_overview";
  if (hLower.some(h => h.includes("ai overview"))) return "ai_overview";
  if (hLower.some(h => h === "ai mode" || h.includes("ai_mode"))) return "ai_mode";
  const mi = headers.findIndex(h => h === "Model");
  if (mi >= 0) {
    // Check all unique model values in rows (not just first)
    const models = [...new Set(rows.map(r => (r[mi] || "").toLowerCase()).filter(Boolean))];
    const modelStr = models.join(" ");
    if (modelStr.includes("chatgpt") || modelStr.includes("gpt")) return "chatgpt";
    if (modelStr.includes("gemini")) return "gemini";
    if (modelStr.includes("perplexity")) return "perplexity";
    if (modelStr.includes("copilot")) return "copilot";
    if (modelStr.includes("ai mode") || modelStr.includes("aimode")) return "ai_mode";
  }
  // Fallback: check if any header IS a platform name
  if (hLower.some(h => h === "copilot")) return "copilot";
  if (hLower.some(h => h === "chatgpt")) return "chatgpt";
  if (hLower.some(h => h === "gemini")) return "gemini";
  if (hLower.some(h => h === "perplexity")) return "perplexity";
  return null;
}

/* ── Brand variant generator ───────────────────────────────────────────────── */
function generateBrandVariants(input) {
  if (!input) return [];
  const raw = input.toLowerCase().trim();
  const variants = new Set();

  // Always add the raw input (e.g. "gardenspace.pl" or "garden space")
  variants.add(raw);

  // Strip known domain extensions → get core brand name
  const noExt = raw.replace(/\.(pl|com|eu|net|org|io|co|de|fr|uk|shop|store|online)$/, "");
  if (noExt !== raw) variants.add(noExt);  // e.g. "gardenspace"

  // If there are hyphens → add without hyphens and each segment
  if (noExt.includes("-")) {
    const noHyphen = noExt.replace(/-/g, "");
    variants.add(noHyphen);
    noExt.split("-").forEach(seg => seg.length > 2 && variants.add(seg));
  }

  // If there are spaces → add without spaces
  if (noExt.includes(" ")) {
    variants.add(noExt.replace(/ /g, ""));
    variants.add(noExt.replace(/ /g, "-"));
    noExt.split(" ").forEach(seg => seg.length > 2 && variants.add(seg));
  }

  // Filter out generic words that would cause false positives
  const stopWords = new Set(["sklep", "shop", "store", "online", "pl", "com", "net", "eu", "the", "and"]);
  return [...variants].filter(v => v.length > 1 && !stopWords.has(v));
}

/* ── Parse Ahrefs buffer ───────────────────────────────────────────────────── */
function parseAhrefsBuffer(buffer, brandKey, brandVariants, filename) {
  const text = decodeBuffer(buffer);
  const all = parseDelimited(text);
  if (all.length < 2) return null;

  const headers = all[0].map(h => h.replace(/^"|"$/g, "").trim());
  const rows = all.slice(1);
  let pid = detectPlatform(headers, rows);
  // Fallback: detect from filename
  if (!pid && filename) {
    const fn = filename.toLowerCase();
    if (fn.includes("ai_mode") || fn.includes("ai-mode") || fn.includes("aimode")) pid = "ai_mode";
    else if (fn.includes("ai_overview") || fn.includes("overview")) pid = "ai_overview";
    else if (fn.includes("chatgpt") || fn.includes("chat_gpt")) pid = "chatgpt";
    else if (fn.includes("gemini")) pid = "gemini";
    else if (fn.includes("perplexity")) pid = "perplexity";
    else if (fn.includes("copilot")) pid = "copilot";
  }

  const mentionsIdx = headers.findIndex(h => h === "Mentions");
  const linkIdx = headers.findIndex(h => h === "Link URL");
  const kwIdx = headers.findIndex(h => h === "Keyword");
  const volIdx = headers.findIndex(h => h === "Volume");

  if (mentionsIdx < 0) return null;

  const bk = brandKey.toLowerCase().trim();
  const variants = brandVariants && brandVariants.length > 0
    ? brandVariants.map(v => v.toLowerCase())
    : [bk];

  const parsed = rows.map(r => {
    const mentionsRaw = (r[mentionsIdx] || "").toLowerCase();
    const linkRaw = (r[linkIdx] || "").toLowerCase();
    const keyword = r[kwIdx] || "";
    const volume = parseInt(r[volIdx] || "0") || 0;
    // Check if ANY variant matches in Mentions
    const matchedVariant = variants.find(v => v && mentionsRaw.includes(v)) || null;
    const mentioned = !!matchedVariant;
    // Check if URL contains domain
    const domainKey = bk.includes(".") ? bk : bk + ".";
    const cited = linkRaw.includes(bk) || linkRaw.includes(domainKey);
    const otherMentions = mentionsRaw
      .split(/[,\n]+/)
      .map(m => m.trim())
      .filter(m => m && !variants.some(v => m.includes(v)));
    return { keyword, volume, mentioned, cited, otherMentions, matchedVariant };
  }).filter(r => r.keyword);

  // Count per variant for stats
  const variantHits = {};
  parsed.forEach(r => {
    if (r.matchedVariant) variantHits[r.matchedVariant] = (variantHits[r.matchedVariant] || 0) + 1;
  });

  return { platformId: pid, rows: parsed, headers, variantHits };
}

/* ── Aggregate ─────────────────────────────────────────────────────────────── */
function aggregatePlatform(rows, variantHits) {
  const total = rows.length;
  const mentions = rows.filter(r => r.mentioned).length;
  const citations = rows.filter(r => r.cited).length;
  const compSet = {};
  rows.forEach(r => { r.otherMentions.forEach(c => { compSet[c] = (compSet[c] || 0) + 1; }); });
  // Top keywords where brand IS mentioned (by volume desc)
  const topBrand = rows.filter(r => r.mentioned)
    .sort((a, b) => (b.volume || 0) - (a.volume || 0))
    .slice(0, 10).map(r => ({ kw: r.keyword, vol: r.volume || 0 }));
  // Top keywords where brand NOT mentioned (opportunity — competitors present or high volume)
  const topGap = rows.filter(r => !r.mentioned && r.otherMentions.length > 0)
    .sort((a, b) => (b.volume || 0) - (a.volume || 0))
    .slice(0, 10).map(r => ({ kw: r.keyword, vol: r.volume || 0, comps: r.otherMentions.slice(0,2) }));
  return { total, mentions, citations, compSet, variantHits: variantHits || {}, topBrand, topGap };
}

/* ── Particle background ───────────────────────────────────────────────────── */
function ParticleBg() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); let raf;
    canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight;
    const W = canvas.width, H = canvas.height;
    const pts = Array.from({ length: 40 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25,
      r: Math.random() * 1.2 + .4, a: Math.random() * .4 + .1,
    }));
    function draw() {
      ctx.clearRect(0, 0, W, H);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(46,223,143," + (p.a * .2) + ")"; ctx.fill();
      });
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
        if (d < 85) {
          ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y);
          ctx.strokeStyle = "rgba(46,223,143," + ((1 - d / 85) * .05) + ")";
          ctx.lineWidth = 1; ctx.stroke();
        }
      }
      raf = requestAnimationFrame(draw);
    }
    draw(); return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />;
}

/* ── Signal Scanner ────────────────────────────────────────────────────────── */
function SignalScanner({ proc }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); let frame = 0, raf;
    const W = canvas.offsetWidth || 800;
    canvas.width = W; canvas.height = 90;
    const gap = W / PLATFORMS.length;
    const nodes = PLATFORMS.map((p, i) => ({
      x: gap * i + gap / 2, y: 48, color: p.color, label: p.short,
      score: proc[p.id]?.total > 0 ? Math.round((proc[p.id].mentions / proc[p.id].total) * 100) : 0,
      has: proc[p.id]?.total > 0,
    }));
    function draw() {
      ctx.clearRect(0, 0, W, 90); frame++;
      for (let i = 0; i < nodes.length - 1; i++) {
        const a = nodes[i], b = nodes[i + 1];
        ctx.beginPath(); ctx.moveTo(a.x + 18, a.y); ctx.lineTo(b.x - 18, b.y);
        ctx.strokeStyle = "#1a335455"; ctx.lineWidth = 1; ctx.stroke();
        const t = (frame * .016 + i * .2) % 1;
        const px = (a.x + 18) + ((b.x - 18) - (a.x + 18)) * t;
        ctx.beginPath(); ctx.arc(px, a.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = (a.has ? S.green : "#1a3354") + "cc"; ctx.fill();
      }
      nodes.forEach(n => {
        const pulse = (frame * .022) % 1;
        ctx.beginPath(); ctx.arc(n.x, n.y, 17 + pulse * 15, 0, Math.PI * 2);
        ctx.strokeStyle = n.color + Math.floor((1 - pulse) * 66).toString(16).padStart(2, "0");
        ctx.lineWidth = 1.5; ctx.stroke();
        const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 17);
        g.addColorStop(0, n.color + (n.has ? "28" : "08")); g.addColorStop(1, n.color + "04");
        ctx.beginPath(); ctx.arc(n.x, n.y, 17, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = n.color + (n.has ? "88" : "33"); ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = n.has ? n.color : S.muted;
        ctx.font = "bold 11px monospace"; ctx.textAlign = "center";
        ctx.fillText(n.score + "%", n.x, n.y + 4);
        ctx.fillStyle = S.muted; ctx.font = "9px monospace";
        ctx.fillText(n.label, n.x, n.y + 27);
      });
      raf = requestAnimationFrame(draw);
    }
    draw(); return () => cancelAnimationFrame(raf);
  }, [proc]);
  return <canvas ref={ref} width={800} height={90} style={{ width: "100%", display: "block" }} />;
}

/* ── Drop zone ─────────────────────────────────────────────────────────────── */
function DropZone({ onFiles }) {
  const [drag, setDrag] = useState(false);
  const ref = useRef();
  const go = files => Array.from(files).forEach(file => {
    const r = new FileReader();
    r.onload = e => onFiles(file.name, e.target.result);
    r.readAsArrayBuffer(file);
  });
  return (
    <div
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); go(e.dataTransfer.files); }}
      onClick={() => ref.current.click()}
      style={{
        border: "2px dashed " + (drag ? S.green : S.border),
        borderRadius: 14, padding: "36px 24px", cursor: "pointer",
        textAlign: "center", background: drag ? S.green + "0a" : "transparent", transition: "all .2s",
      }}>
      <input ref={ref} type="file" accept=".csv" multiple style={{ display: "none" }}
        onChange={e => go(e.target.files)} />
      <div style={{ fontSize: 36, marginBottom: 8 }}>📂</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: S.text, marginBottom: 6 }}>
        Upuść pliki CSV z Ahrefs lub kliknij
      </div>
      <div style={{ fontSize: 12, color: S.muted }}>
        UTF-8 i UTF-16 · AI Overview, ChatGPT, Gemini, Perplexity, Copilot — platforma wykrywana automatycznie
      </div>
    </div>
  );
}

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: S.navy3, border: "1px solid " + S.border, borderRadius: 8, padding: "10px 14px" }}>
      <div style={{ fontSize: 10, color: S.muted, marginBottom: 5 }}>{label}</div>
      {payload.map((p, i) => <div key={i} style={{ fontSize: 12, color: p.color, fontWeight: 700 }}>{p.name}: {p.value}</div>)}
    </div>
  );
};

/* ── Report HTML builder (NO nested template literals — uses array.join) ───── */
function buildReport(args) {
  const { brand, proc, totalQ, totalM, totalC, visM, visC, avgSOV, allComps, compCounts, best, worst, editableComment, topBrandKws, topGapKws } = args;
  const date = new Date().toLocaleDateString("pl-PL", { year: "numeric", month: "long", day: "numeric" });

  const rows = PLATFORMS.map(p => {
    const d = proc[p.id];
    const allM = d.mentions + allComps.reduce((s, c) => s + (d.compSet[c] || 0), 0);
    const sovR = allM > 0 ? (d.mentions / allM) * 100 : 0;
    const sov = sovR < 1 && sovR > 0 ? Math.round(sovR * 10) / 10 : Math.round(sovR);
    const mRr = d.total > 0 ? (d.mentions / d.total) * 100 : 0;
    const mR = mRr < 1 && mRr > 0 ? Math.round(mRr * 10) / 10 : Math.round(mRr);
    const cRr = d.total > 0 ? (d.citations / d.total) * 100 : 0;
    const cR = cRr < 1 && cRr > 0 ? Math.round(cRr * 10) / 10 : Math.round(cRr);
    return { ...p, ...d, sov, mR, cR };
  });

  const compRows = allComps.slice(0, 8).map(c => ({
    name: c,
    mentions: PLATFORMS.reduce((s, p) => s + (proc[p.id].compSet[c] || 0), 0),
  }));

  const visiblePlatforms = PLATFORMS.filter(p => proc[p.id].total > 0).length;
  const missingPlatforms = PLATFORMS.filter(p => proc[p.id].total > 0 && proc[p.id].mentions === 0).map(p => p.short).join(", ");

  const css = [
    "@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800;900&display=swap');",
    "*{margin:0;padding:0;box-sizing:border-box}",
    "body{font-family:'DM Sans',sans-serif;background:#fff;color:#1a2a3a;font-size:14px;line-height:1.6}",
    ".page{max-width:960px;margin:0 auto;padding:52px 44px}",
    ".header{border-bottom:3px solid #2edf8f;padding-bottom:28px;margin-bottom:36px}",
    ".logo{display:flex;align-items:center;gap:10px;margin-bottom:18px}",
    ".s{width:38px;height:38px;background:#0c1a2e;border-radius:9px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:19px;color:#2edf8f;border:1.5px solid #2edf8f55;flex-shrink:0}",
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
    ".fn{font-weight:800;color:#07111f;font-size:13px}",
    ".fs{font-size:11px;color:#4a7090;margin-top:2px}",
    ".bench td{background:#f0fff8!important;font-weight:600}",
    "@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}@page{margin:1.5cm}}",
  ].join("\n");

  const rowsHtml = rows.map(r => [
    "<tr>",
    '<td><span class="tag" style="background:' + r.color + '18;color:' + r.color + '">' + r.icon + " " + r.name + "</span></td>",
    "<td>" + r.total + "</td>",
    '<td><strong style="color:#1db872">' + r.mentions + "</strong></td>",
    '<td><strong style="color:#2a7abf">' + r.citations + "</strong></td>",
    '<td><div class="bar-row"><div class="bar-bg"><div class="bar-fg" style="width:' + r.sov + '%;background:' + r.color + '"></div></div><strong>' + r.sov + "%</strong></div></td>",
    '<td class="' + (r.mR >= 50 ? "green" : r.mR >= 25 ? "mid" : "red") + '">' + r.mR + "%</td>",
    '<td class="' + (r.cR >= 30 ? "green" : r.cR >= 15 ? "mid" : "red") + '">' + r.cR + "%</td>",
    "</tr>",
  ].join("")).join("");

  const compHtml = compRows.length > 0 ? [
    "<section>",
    '<h2><span class="num">02</span> Konkurenci wykryci automatycznie z danych AI</h2>',
    "<table><thead><tr><th>Marka</th><th>Łączne wzmianki</th><th>vs. " + (brand.name || "Twoja marka") + "</th></tr></thead><tbody>",
    '<tr class="bench"><td><span class="tag" style="background:#2edf8f18;color:#1db872">&#10022; ' + (brand.name || "Twoja marka") + '</span></td><td><strong style="color:#1db872">' + totalM + "</strong></td><td><span class=\"tag\" style=\"background:#2edf8f18;color:#1db872\">Benchmark</span></td></tr>",
    compRows.map(c => {
      const diff = totalM - c.mentions;
      return "<tr><td>" + c.name + "</td><td>" + c.mentions + "</td><td class=\"" + (diff >= 0 ? "green" : "red") + "\">" + (diff >= 0 ? "+" : "") + diff + "</td></tr>";
    }).join(""),
    "</tbody></table></section>",
  ].join("") : "";

  // General comment for client — use editableComment if provided
  const commentLines = editableComment !== null
    ? editableComment.split("\n")
    : null; // null = use auto paragraphs below

  const commentHtml = [
    "<section>",
    '<h2><span class="num">&#9733;</span> Komentarz analityczny</h2>',
    '<div class="comment-box">',
    '<div class="comment-title">Podsumowanie widoczności AI</div>',
    "<p>Niniejszy raport przedstawia wyniki analizy widoczności marki <strong>" + (brand.name || "klienta") + "</strong> w odpowiedziach generowanych przez modele AI. Analiza obejmuje <strong>" + totalQ.toLocaleString("pl-PL") + " zapytań</strong> na platformach: AI Overview, AI Mode, ChatGPT, Gemini, Perplexity i Copilot.</p>",
    // SOV paragraph - contextual
    (avgSOV >= 30
      ? "<p><strong>AI Share of Voice " + avgSOV + "%</strong> to wynik dobry — marka wymieniana jest w ponad co trzecim przypadku, gdy temat dotyczy branzy. Koncentracja na utrzymaniu i ekspansji na slabsze platformy.</p>"
      : avgSOV >= 10
        ? "<p><strong>AI Share of Voice " + avgSOV + "%</strong> (średnio " + avgSOV + " na 100 zapytan, gdzie pojawia się jakakolwiek marka z branży) wskazuje na umiarkowaną widoczność. Główna dźwignia wzrostu: tworzenie treści odpowiadających bezpośrednio na zapytania użytkowników — szczegolnie FAQ, porównania i how-to." + (allComps.length > 0 ? " Główni konkurenci w danych: " + allComps.slice(0, 3).join(", ") + "." : "") + "</p>"
        : "<p><strong>AI Share of Voice " + avgSOV + "%</strong> — marka pojawia się rzadko w odpowiedziach AI" + (totalM > 0 ? " (" + totalM + " na " + totalQ.toLocaleString("pl-PL") + " zapytań)" : "") + ". Na tym etapie kluczowe jest zbudowanie podstaw: entity recognition (Wikipedia, Wikidata, bazy branżowe), systematyczny content pod zapytania branżowe i structured data." + (allComps.length > 0 ? " Dla porównania: " + allComps[0] + " pojawia się " + compCounts[allComps[0]] + "x w tych samych danych." : "") + "</p>"),
    // Mentions vs Citations smart paragraph
    (() => {
      const mTot = totalM; const cTot = totalC;
      const ratio = mTot > 0 ? cTot / mTot : null;
      if (mTot === 0 && cTot === 0) return "<p>W analizowanych zapytaniach AI nie odnotowano ani wzmianek nazwy marki, ani cytowan strony. Moze to oznaczac: (1) zapytania nie sa typowe dla tej marki, (2) marka nie ma jeszcze rozpoznawalnosci w AI, lub (3) klucz marki wymaga kalibracji. Zalecamy przeglad sekcji Import i dostosowanie klucza dopasowania.</p>";
      if (mTot === 0 && cTot > 0) return "<p><strong>Uwaga diagnostyczna:</strong> Strona jest cytowana przez AI jako zrodlo (" + cTot + "x) ale nie jest wymieniana z nazwy. To typowy pattern 'anonimowego eksperta' — AI ufa tresciom, ale nie identyfikuje marki. Rozwiazanie: dodaj branding signals w tresciach (nazwa marki w nagłowkach, About Us, Wikipedia), zbuduj wzmianki w mediach branzowych.</p>";
      if (ratio !== null && ratio > 8) return "<p><strong>Dysproporcja cytowania vs wzmianki: " + cTot + " cyt. vs " + mTot + " wzm.</strong> To nie jest zdrowa korelacja — oznacza, ze AI uzywamy strony jako zrodla danych, ale nie utossamia jej z marka. Priorytet: budowanie entity graph — Wikidata, Wikipedia, wzmianki z linkiem w mediach, anchor texty z nazwa marki.</p>";
      if (ratio !== null && ratio < 0.15 && mTot >= 5) return "<p><strong>Wzmianki (" + mTot + ") bez cytowania (" + cTot + ")</strong> — AI kojarzy marke, ale nie poleca jej strony bezpośrednio. Priorytet techniczny: structured data (schema.org), poprawa Core Web Vitals, wewnetrzne linkowanie kluczowych stron.</p>";
      return "<p><strong>Mentions: " + mTot + " | Citations: " + cTot + "</strong> — obie metryki potwierdzają obecność marki. Następny krok: zwiększenie częstotliwości przez konsekwentny content plan (min. 2-4 artykułów miesiecznie pod zapytania z niskim SOV).</p>";
    })(),
    // Platforms paragraph
    (best ? "<p><strong>Najlepsza platforma: " + best.platform + "</strong> (SOV " + best.sov + "%). " + (best.sov < 10 ? "Mimo że jest najlepsza, SOV poniżej 10% to nadal poczatkowy etap — jest dużo miejsca na wzrost." : best.sov < 30 ? "Solidna baza do budowania dalszej widoczności." : "Silna pozycja do utrzymania.") + (worst && worst !== best && worst.sov === 0 ? " Platforma " + worst.platform + " wymaga osobnej strategii — marka jest całkowicie nieobecna mimo posiadania danych." : worst && worst !== best ? " Najsłabsza platforma: " + worst.platform + " (SOV " + worst.sov + "%) — warto przygotować treść w formatach preferowanych przez ten model." : "") + "</p>" : ""),
    "<p><strong>Priorytety na 3-6 miesięcy:</strong> (1) " + (totalM === 0 && totalC > 0 ? "Zbudowanie entity recognition — Wikipedia/Wikidata, wzmianki w mediach z nazwą marki." : "Tworzenie treści FAQ i how-to pod zapytania z najniższym SOV.") + " (2) Wdrożenie schema markup (Organization, BreadcrumbList, FAQPage). (3) " + (allComps.length > 0 && compCounts[allComps[0]] > totalM ? "Analiza gap contentowego względem " + allComps[0] + " (" + compCounts[allComps[0]] + " wzm.)." : "Regularne monitorowanie widoczności i optymalizacja na bieżąco.") + "</p>",
    "</div>",
    "</section>",
  ];
  // If user edited the comment — replace auto paragraphs
  const finalCommentHtml = commentLines
    ? [
        "<section>",
        '<h2><span class="num">&#9733;</span> Komentarz analityczny</h2>',
        '<div class="comment-box">',
        '<div class="comment-title">Podsumowanie widoczności AI</div>',
        commentLines.filter(Boolean).map(l => "<p>" + l + "</p>").join(""),
        "</div></section>",
      ].join("")
    : commentHtml.join("");

  const insightsHtml = [
    '<div class="ig">',
    best ? '<div class="ins" style="background:#2edf8f08;border-color:#2edf8f2a"><span class="ii" style="color:#1db872">&#8593;</span><span class="it"><strong>Najlepsza: ' + best.platform + '</strong> SOV ' + best.sov + '% &#8212; ' + (best.sov >= 30 ? 'silna pozycja do utrzymania.' : best.sov >= 10 ? 'umiarkowana &#8212; rozbuduj FAQ i how-to pod zapytania tej platformy.' : 'niska baza &#8212; twórz dedykowany content pod t&#x119; platform&#x119;.') + "</span></div>" : "",
    worst && worst !== best ? '<div class="ins" style="background:#ff5c6a08;border-color:#ff5c6a2a"><span class="ii" style="color:#e03050">&#8595;</span><span class="it"><strong>Do dzia&#322;ania: ' + worst.platform + '</strong> SOV ' + worst.sov + '% &#8212; ' + (worst.sov === 0 ? 'brak obecno&#347;ci. Zbadaj zapytania tej platformy i przygotuj odpowiedzi w jej formacie.' : 'najni&#380;szy SOV &#8212; twórz content w formacie preferowanym przez ten model.') + "</span></div>" : "",
    (totalM === 0 && totalC === 0) ? '<div class="ins" style="background:#4a709008;border-color:#4a709022"><span class="ii" style="color:#4a7090">&#9675;</span><span class="it"><strong>Brak obecno&#347;ci</strong> &#8212; marka niewidoczna dla AI. Start: entity building (Wikipedia, Wikidata) + structured data.</span></div>'
      : (totalM === 0 && totalC > 0) ? '<div class="ins" style="background:#f5c84208;border-color:#f5c8422a"><span class="ii" style="color:#f5c842">!</span><span class="it"><strong>Cytowana bez nazwy</strong> (' + totalC + ' cyt., 0 wzm.) &#8212; AI ufa stronie, ale nie zna marki. Dodaj branding: nazwa w nag&#322;ówkach, About Us, wzmianki w mediach.</span></div>'
      : (totalC > totalM * 8) ? '<div class="ins" style="background:#ff5c6a08;border-color:#ff5c6a2a"><span class="ii" style="color:#ff5c6a">!</span><span class="it"><strong>Dysproporcja ' + totalC + ' cyt. vs ' + totalM + ' wzm.</strong> &#8212; AI u&#380;ywa strony, ale nie zna marki. Priorytet: Wikipedia, Wikidata, anchor texty z nazw&#261; marki.</span></div>'
      : (totalM > totalC * 7 && totalM >= 5) ? '<div class="ins" style="background:#a78bfa08;border-color:#a78bfa2a"><span class="ii" style="color:#a78bfa">!</span><span class="it"><strong>Wzmianki bez cytowa&#324;</strong> &#8212; AI zna mark&#281;, ale nie poleca strony. Wdrót: structured data, Core Web Vitals, linkowanie wewn&#281;trzne.</span></div>'
      : '<div class="ins" style="background:#2edf8f08;border-color:#2edf8f2a"><span class="ii" style="color:#1db872">&#10003;</span><span class="it"><strong>Obecno&#347;&#263; potwierdzona:</strong> ' + totalM + ' wzm. + ' + totalC + ' cyt. &#8212; pracuj nad zwi&#281;kszeniem cz&#281;stotliwo&#347;ci przez content plan.</span></div>',
    '<div class="ins" style="background:#4da6ff08;border-color:#4da6ff2a"><span class="ii" style="color:#4da6ff">&#9672;</span><span class="it"><strong>Zasi\u0119g AI:</strong> ' + (brand.name || "Marka") + " widoczna w <strong>" + visiblePlatforms + "/" + PLATFORMS.length + "</strong> platformach." + (missingPlatforms ? " Brak wzm.: " + missingPlatforms + "." : "") + "</span></div>",
    compRows.length > 0 && compRows[0].mentions > totalM ? '<div class="ins" style="background:#ff5c6a08;border-color:#ff5c6a2a"><span class="ii" style="color:#e03050">&#9888;</span><span class="it"><strong>Uwaga:</strong> ' + compRows[0].name + " wyprzedza mark\u0119 (" + compRows[0].mentions + " vs " + totalM + " wzm.).</span></div>" : "",
    '<div class="ins" style="background:#f5c84208;border-color:#f5c8422a"><span class="ii" style="color:#d4a017">&#8594;</span><span class="it"><strong>Strategia 3-6 mies.:</strong> FAQ/how-to, schema markup, link building pod AI.</span></div>',
    "</div>",
  ].join("");

  const parts = [
    "<!DOCTYPE html><html lang=\"pl\"><head><meta charset=\"UTF-8\"/>",
    "<title>Sempai AI Visibility \u2014 " + (brand.name || "Raport") + "</title>",
    "<style>" + css + "</style></head><body><div class=\"page\">",
    "<div class=\"header\">",
    "<div class=\"logo\"><div class=\"s\">S</div><span class=\"bn\">sempai</span><span class=\"badge\">AI Visibility</span></div>",
    "<h1>Raport Widoczno\u015bci AI</h1>",
    "<p class=\"meta\">Klient: <strong>" + (brand.name || "\u2014") + "</strong>",
    brand.url ? " &middot; URL: <strong>" + brand.url + "</strong>" : "",
    brand.industry ? " &middot; Bran\u017ca: <strong>" + brand.industry + "</strong>" : "",
    " &middot; Data: " + date + "</p></div>",
    "<div class=\"kpi-grid\">",
    "<div class=\"kpi\" style=\"border-top-color:#2edf8f\"><div class=\"kl\">AI Share of Voice</div><div class=\"kv\" style=\"color:#2edf8f\">" + avgSOV + "%</div><div class=\"ks\">" + (avgSOV >= 30 ? "Silna pozycja — marka często wymieniana" : avgSOV >= 10 ? "Umiarkowana widoczność — jest potencjał" : "Niska widoczność — priorytet działań") + "</div><div class=\"pb-wrap\"><div class=\"pb\" style=\"width:" + Math.min(avgSOV, 100) + "%;background:#2edf8f\"></div></div></div>",
    "<div class=\"kpi\" style=\"border-top-color:#4da6ff\"><div class=\"kl\">Visibility Score</div><div class=\"kv\" style=\"color:#4da6ff\">" + visM + "%</div><div class=\"ks\">" + (visM >= 10 ? "AI często wymienia markę z nazwy" : visM >= 1 ? "AI sporadycznie wymienia markę" : "AI nie wymienia marki z nazwy") + "</div><div class=\"pb-wrap\"><div class=\"pb\" style=\"width:" + Math.min(visM, 100) + "%;background:#4da6ff\"></div></div></div>",
    "<div class=\"kpi\" style=\"border-top-color:#a78bfa\"><div class=\"kl\">Citation Score</div><div class=\"kv\" style=\"color:#a78bfa\">" + visC + "%</div><div class=\"ks\">" + (visC >= 10 ? "Strona często cytowana jako źródło" : visC >= 1 ? "Strona sporadycznie cytowana" : "Strona rzadko cytowana przez AI") + "</div><div class=\"pb-wrap\"><div class=\"pb\" style=\"width:" + Math.min(visC, 100) + "%;background:#a78bfa\"></div></div></div>",
    "<div class=\"kpi\" style=\"border-top-color:#f5c842\"><div class=\"kl\">\u0141\u0105czne zapytania</div><div class=\"kv\" style=\"color:#f5c842\">" + totalQ.toLocaleString("pl-PL") + "</div><div class=\"ks\">" + totalM + " wzm. &middot; " + totalC + " cyt.</div></div>",
    "</div>",
    "<section><h2><span class=\"num\">01</span> AI Share of Voice \u2014 per platforma</h2>",
    "<table><thead><tr><th>Platforma</th><th>Zapyta\u0144</th><th>Wzmianki</th><th>Cytowania</th><th>SOV %</th><th>Mention Rate</th><th>Citation Rate</th></tr></thead>",
    "<tbody>" + rowsHtml + "</tbody></table></section>",
    compHtml,
    // Top queries HTML
    (() => {
      if (!topBrandKws || !topGapKws || (topBrandKws.length === 0 && topGapKws.length === 0)) return "";
      const brandRows = (topBrandKws || []).map(([kw, vol]) =>
        "<tr><td>" + kw + "</td><td style=\"text-align:right;color:#1db872;font-weight:700\">" + (vol > 0 ? vol.toLocaleString("pl-PL") : "—") + "</td></tr>"
      ).join("");
      const gapRows = (topGapKws || []).map(([kw, {vol, comps}]) =>
        "<tr><td>" + kw + "</td><td style=\"text-align:right;color:#e03050\">" + comps.join(", ") + "</td><td style=\"text-align:right;color:#4a7090;font-size:11px\">" + (vol > 0 ? vol.toLocaleString("pl-PL") : "—") + "</td></tr>"
      ).join("");
      return "<section><h2><span class=\"num\">03</span> Zapytania — obecność marki</h2>" +
        "<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:20px\">" +
        (brandRows ? "<div><h3 style=\"font-size:13px;font-weight:700;color:#1db872;margin-bottom:10px\">🎯 Zapytania z wzmianką marki</h3><table><thead><tr><th>Zapytanie</th><th style=\"text-align:right\">Wolumen</th></tr></thead><tbody>" + brandRows + "</tbody></table></div>" : "") +
        (gapRows ? "<div><h3 style=\"font-size:13px;font-weight:700;color:#e03050;margin-bottom:10px\">⚠️ Luki — marka nieobecna</h3><table><thead><tr><th>Zapytanie</th><th style=\"text-align:right\">Wymienia</th><th style=\"text-align:right\">Vol.</th></tr></thead><tbody>" + gapRows + "</tbody></table></div>" : "") +
        "</div></section>";
    })(),
    finalCommentHtml,
    "<section><h2><span class=\"num\">&#9733;</span> Kluczowe spostrze\u017cenia</h2>" + insightsHtml + "</section>",
    "<div class=\"footer\"><div><div class=\"fn\">sempai &middot; Let us perform!</div><div class=\"fs\">sempai.pl</div></div>",
    "<div style=\"font-size:11px;color:#8899aa\">Wygenerowano: " + date + "</div></div>",
    "</div></body></html>",
  ];

  return parts.join("");
}

/* ── MAIN APP ──────────────────────────────────────────────────────────────── */
export default function App() {
  const [tab, setTab] = useState("guide");
  const [brand, setBrand] = useState({ name: "", url: "", industry: "" });
  const [parsedData, setParsedData] = useState({});
  const [loadedFiles, setLoadedFiles] = useState({});
  const [rawBuffers, setRawBuffers] = useState({});
  const [errors, setErrors] = useState([]);
  const [allDetectedMentions, setAllDetectedMentions] = useState([]);
  const [brandMentionKey, setBrandMentionKey] = useState("");
  const [brandVariants, setBrandVariants] = useState([]); // user's overrides (chips)
  const [removedAutoVariants, setRemovedAutoVariants] = useState(new Set()); // auto variants user removed
  const [variantInput, setVariantInput] = useState(""); // text field for adding custom
  const [allVariantHits, setAllVariantHits] = useState({});
  const [promptCopied, setPromptCopied] = useState(false);
  const [unknownFiles, setUnknownFiles] = useState([]);
  const [editableComment, setEditableComment] = useState(null); // null = auto-generated

  const autoKey = (brand.url || brand.name).toLowerCase()
    .replace(/^https?:\/\/(www\.)?/, "")
    .replace(/\..*$/, "")
    .trim() || brand.name.toLowerCase().split(/\s+/)[0];
  const brandKey = brandMentionKey.trim() || autoKey;
  // Auto variants from brand name, minus ones user removed
  const autoVariants = generateBrandVariants(brand.url || brand.name)
    .filter(v => !removedAutoVariants.has(v));
  // Final variants = auto (minus removed) + user custom
  const variantsInUse = [...new Set([...autoVariants, ...brandVariants])];

  // Re-parse all files when brandKey changes
  useEffect(() => {
    if (!brandKey || Object.keys(rawBuffers).length === 0) return;
    const next = {};
    const mergedHits = {};
    Object.entries(rawBuffers).forEach(([, buf]) => {
      try {
        const r = parseAhrefsBuffer(buf, brandKey, variantsInUse, fname);
        if (r?.platformId) {
          next[r.platformId] = aggregatePlatform(r.rows, r.variantHits);
          Object.entries(r.variantHits || {}).forEach(([v, c]) => {
            mergedHits[v] = (mergedHits[v] || 0) + c;
          });
        }
      } catch (_) { /* ignore */ }
    });
    if (Object.keys(next).length > 0) {
      setParsedData(next);
      setAllVariantHits(mergedHits);
    }
  }, [brandKey, brandVariants]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFiles = (filename, buffer) => {
    try {
      const result = parseAhrefsBuffer(buffer, brandKey, variantsInUse, filename);
      if (!result || !result.platformId) {
        // Show diagnostic info: what headers were found
        const diagText = decodeBuffer(buffer);
        const diagRows = parseDelimited(diagText);
        const diagHeaders = diagRows.length > 0 ? diagRows[0].map(h => h.replace(/^"|"$/g,"").trim()).filter(Boolean) : [];
        const models = diagRows.length > 1 && diagHeaders.includes("Model")
          ? [...new Set(diagRows.slice(1,6).map(r => r[diagHeaders.indexOf("Model")] || "").filter(Boolean))]
          : [];
        const headerStr = diagHeaders.slice(0,8).join(", ");
        const modelStr = models.length > 0 ? " | Model: " + models.join(", ") : "";
        setErrors(e => [...e, "Nie rozpoznano platformy: " + filename + " | Nagłówki: " + headerStr + modelStr]);
        setUnknownFiles(prev => [...prev, { filename, headers: diagHeaders, models }]);
        return;
      }
      const agg = aggregatePlatform(result.rows, result.variantHits);
      setAllVariantHits(prev => {
        const merged = { ...prev };
        Object.entries(result.variantHits || {}).forEach(([v, c]) => { merged[v] = (merged[v] || 0) + c; });
        return merged;
      });
      setParsedData(d => ({ ...d, [result.platformId]: agg }));
      setLoadedFiles(f => ({ ...f, [result.platformId]: filename }));
      setRawBuffers(rb => ({ ...rb, [filename]: buffer }));
      setErrors(e => e.filter(x => !x.includes(filename)));
      setUnknownFiles(prev => prev.filter(u => u.filename !== filename));
      // Collect all mention values for brand picker
      const text = decodeBuffer(buffer);
      const allRows = parseDelimited(text);
      if (allRows.length > 1) {
        const headers = allRows[0].map(h => h.replace(/^"|"$/g, "").trim());
        const mi = headers.findIndex(h => h === "Mentions");
        if (mi >= 0) {
          const found = new Set();
          allRows.slice(1).forEach(r => {
            if (r[mi]) r[mi].toLowerCase().split(/[,\n]+/).map(m => m.trim()).filter(Boolean).forEach(m => found.add(m));
          });
          setAllDetectedMentions(prev => [...new Set([...prev, ...found])].filter(Boolean).sort());
        }
      }
    } catch (err) {
      setErrors(e => [...e, "Błąd: " + filename + ": " + err.message]);
    }
  };

  const proc = {};
  PLATFORMS.forEach(p => {
    proc[p.id] = parsedData[p.id] || { total: 0, mentions: 0, citations: 0, compSet: {}, topBrand: [], topGap: [] };
  });

  // Merge top keywords across all platforms
  const kwBrandMap = {}, kwGapMap = {};
  PLATFORMS.forEach(p => {
    (proc[p.id].topBrand || []).forEach(({ kw, vol }) => { if (!kwBrandMap[kw] || kwBrandMap[kw] < vol) kwBrandMap[kw] = vol; });
    (proc[p.id].topGap || []).forEach(({ kw, vol, comps }) => { if (!kwGapMap[kw]) kwGapMap[kw] = { vol, comps }; });
  });
  const topBrandKws = Object.entries(kwBrandMap).sort((a,b) => b[1]-a[1]).slice(0, 8);
  const topGapKws = Object.entries(kwGapMap).sort((a,b) => b[1].vol-a[1].vol).slice(0, 8);

  const compCounts = {};
  PLATFORMS.forEach(p => {
    Object.entries(proc[p.id]?.compSet || {}).forEach(([n, cnt]) => {
      compCounts[n] = (compCounts[n] || 0) + cnt;
    });
  });
  const allComps = Object.entries(compCounts).sort((a, b) => b[1] - a[1]).map(([n]) => n).filter(n => n && n.length > 1);

  const totalQ = PLATFORMS.reduce((s, p) => s + (proc[p.id].total || 0), 0);
  const totalM = PLATFORMS.reduce((s, p) => s + (proc[p.id].mentions || 0), 0);
  const totalC = PLATFORMS.reduce((s, p) => s + (proc[p.id].citations || 0), 0);
  // Format percentage with "1 na X zapytań" for tiny values
  const fmtPct = (v, total) => {
    if (v === 0) return "0%";
    if (v < 1 && total > 0) {
      const count = Math.round((v / 100) * total);
      if (count < 2) return "1 na " + total.toLocaleString("pl-PL") + " zap.";
      return v.toFixed(1) + "% (" + count + " zap.)";
    }
    if (v < 1) return v.toFixed(1) + "%";
    return v + "%";
  };
  const fmtPctSimple = v => v === 0 ? "0%" : (v < 1 ? v.toFixed(1) + "%" : v + "%");
  const pct = (num, den) => {
    if (den === 0) return 0;
    const v = (num / den) * 100;
    if (v === 0) return 0;
    if (v < 0.1) return 0.1;
    if (v < 1) return Math.round(v * 10) / 10;
    return Math.round(v);
  };
  const visM = pct(totalM, totalQ);
  const visC = pct(totalC, totalQ);

  const sovData = PLATFORMS.map(p => {
    const d = proc[p.id];
    const allM = d.mentions + allComps.reduce((s, c) => s + (d.compSet[c] || 0), 0);
    const sovRaw = allM > 0 ? (d.mentions / allM) * 100 : 0;
    const sov = sovRaw < 1 && sovRaw > 0 ? Math.round(sovRaw * 10) / 10 : Math.round(sovRaw);
    const presRaw = d.total > 0 ? ((d.mentions + d.citations * 0.5) / d.total) * 100 : 0;
    const presence = presRaw < 0.1 ? 0 : presRaw < 1 ? Math.round(presRaw * 10) / 10 : Math.round(presRaw);
    return { platform: p.short, color: p.color, sov, mentions: d.mentions, citations: d.citations, total: d.total, presence };
  });

  const active = sovData.filter(d => d.total > 0);
  const avgSOVraw = active.length > 0 ? active.reduce((s, d) => s + d.sov, 0) / active.length : 0;
  const avgSOV = avgSOVraw < 1 && avgSOVraw > 0 ? Math.round(avgSOVraw * 10) / 10 : Math.round(avgSOVraw);
  const ranked = [...active].sort((a, b) => b.sov - a.sov);
  const best = ranked[0], worst = ranked[ranked.length - 1];

  const totalPresRaw = totalQ > 0 ? ((totalM + totalC * 0.5) / totalQ) * 100 : 0;
  const totalPresence = totalPresRaw < 0.1 ? 0 : totalPresRaw < 1 ? Math.round(totalPresRaw * 10) / 10 : Math.round(totalPresRaw);

  const quickWins = [];
  PLATFORMS.forEach(p => {
    const d = proc[p.id]; if (!d.total) return;
    const mR = (d.mentions / d.total) * 100;
    const cR = (d.citations / d.total) * 100;
    if (d.citations > 0 && d.mentions === 0)
      quickWins.push({ type: "cited", platform: p, cR: Math.round(cR * 10) / 10 });
    else if (mR > 0 && mR < 15 && d.total >= 5)
      quickWins.push({ type: "low_mention", platform: p, mR: Math.round(mR * 10) / 10, cR: Math.round(cR * 10) / 10 });
    const platSOV = sovData.find(s => s.platform === p.short)?.sov || 0;
    if (platSOV > 0 && platSOV < 25 && mR > 0)
      quickWins.push({ type: "low_sov", platform: p, sov: platSOV });
  });
  const topComp = allComps[0];
  if (topComp && compCounts[topComp] > totalM && totalM > 0)
    quickWins.push({ type: "comp_gap", comp: topComp, compCount: compCounts[topComp], brandCount: totalM });
  const seen = new Set();
  const topQW = quickWins.filter(w => {
    const k = (w.platform?.id || "g") + w.type;
    if (seen.has(k)) return false; seen.add(k); return true;
  }).slice(0, 5);

  const radarData = PLATFORMS.map(p => ({
    platform: p.short,
    Wzmianki: proc[p.id].total > 0 ? parseFloat(((proc[p.id].mentions / proc[p.id].total) * 100).toFixed(1)) : 0,
    Cytowania: proc[p.id].total > 0 ? parseFloat(((proc[p.id].citations / proc[p.id].total) * 100).toFixed(1)) : 0,
  }));

  const buildArgs = () => ({ brand, proc, totalQ, totalM, totalC, visM, visC, avgSOV, allComps, compCounts, best, worst, editableComment, topBrandKws, topGapKws });
  const openReport = () => {
    const html = buildReport(buildArgs());
    window.open(URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" })), "_blank");
  };
  const downloadReport = () => {
    const html = buildReport(buildArgs());
    const a = document.createElement("a");
    a.href = "data:text/html;charset=utf-8," + encodeURIComponent(html);
    a.download = "Sempai_AIVisibility_" + (brand.name || "Raport") + "_" + new Date().toISOString().slice(0, 10) + ".html";
    a.click();
  };

  const genPrompt = () => {
    const pRows = PLATFORMS.map(p => {
      const d = proc[p.id];
      const mR = d.total > 0 ? Math.round((d.mentions / d.total) * 100) : 0;
      const cR = d.total > 0 ? Math.round((d.citations / d.total) * 100) : 0;
      return "* " + p.name + ": " + d.mentions + "/" + d.total + " wzm. (" + mR + "%), " + d.citations + " cyt. (" + cR + "%)";
    }).join("\n");
    const compStr = allComps.slice(0, 5).map(c => c + ": " + compCounts[c] + " wzm.").join(", ");
    return [
      "Jestes ekspertem ds. AI Visibility. Przygotuj raport w jezyku polskim jako .docx.",
      "",
      "KLIENT: " + (brand.name || "[KLIENT]") + " | URL: " + (brand.url || "-") + " | Branża: " + (brand.industry || "-"),
      "KONKURENCI (wykryci z danych): " + (compStr || "brak"),
      "",
      "WYNIKI:",
      "SOV: " + avgSOV + "% | Mentions: " + visM + "% | Citations: " + visC + "% | Zapytań: " + totalQ,
      pRows,
      best ? "Najlepsza: " + best.platform + " SOV " + best.sov + "%" : "",
      worst && worst !== best ? "| Do poprawy: " + worst.platform + " SOV " + worst.sov + "%" : "",
      "",
      "SEKCJE:",
      "1. AI Share of Voice (4 akapity)",
      "2. Brand Mentions (4)",
      "3. Visibility Score Mentions (3)",
      "4. Visibility Score Citations (4)",
      "5. Analiza konkurencji (3)",
      "6. Komentarz całościowy: mocne strony x3, obszary do poprawy x3, strategia 3-6 mies. (5)",
      "",
      "Jezyk: polski | kazdy wniosek = konkretna liczba | porównania do konkurentow",
    ].filter(x => x !== undefined).join("\n");
  };

  const TABS = [
    { id: "guide", label: "⓪ Instrukcja" },
    { id: "setup", label: "① Klient" },
    { id: "import", label: "② Import CSV" },
    { id: "dashboard", label: "③ Dashboard" },
    { id: "report", label: "④ Raport" },
    { id: "prompt", label: "⑤ Prompt" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: S.navy1, color: S.text, fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      {/* HEADER */}
      <div style={{ background: S.navy2, borderBottom: "1px solid " + S.border, position: "relative", overflow: "hidden", minHeight: 118 }}>
        <ParticleBg />
        <div style={{ position: "relative", maxWidth: 1000, margin: "0 auto", padding: "24px 28px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, flexShrink: 0, background: "linear-gradient(135deg," + S.green + "20," + S.navy4 + ")", border: "1.5px solid " + S.green + "55", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 20, color: S.green }}>S</div>
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{ fontSize: 21, fontWeight: 800, color: S.text }}>sempai</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: S.green, background: S.green + "18", border: "1px solid " + S.green + "44", borderRadius: 5, padding: "1px 8px", letterSpacing: "1.2px", textTransform: "uppercase" }}>AI Visibility</span>
              </div>
              <div style={{ fontSize: 10, color: S.muted, letterSpacing: "2px", textTransform: "uppercase", marginTop: 1 }}>Report Generator &middot; Let us perform!</div>
            </div>
          </div>
          <div style={{ display: "flex", overflowX: "auto" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "9px 20px", background: "transparent", border: "none", borderBottom: tab === t.id ? "2px solid " + S.green : "2px solid transparent", color: tab === t.id ? S.green : S.muted, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all .15s", whiteSpace: "nowrap" }}>{t.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "30px 28px 60px" }}>

        {/* GUIDE */}
        {tab === "guide" && (
          <div>
            <STitle>Jak korzystać z narzędzia</STitle>

            {/* What is this */}
            <div style={{ background: "linear-gradient(135deg," + S.navy2 + "," + S.navy3 + ")", border: "1px solid " + S.green + "33", borderRadius: 14, padding: "24px 28px", marginBottom: 24, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: S.green + "08" }} />
              <div style={{ fontSize: 11, color: S.green, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 10 }}>Co to jest?</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: S.text, marginBottom: 12, lineHeight: 1.4 }}>AI Visibility Report Generator analizuje jak często marka pojawia się w odpowiedziach AI</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                {[
                  { icon: "🔍", title: "Mentions", desc: "Ile razy AI wymienia markę z nazwy w odpowiedzi na zapytania branżowe" },
                  { icon: "🔗", title: "Citations", desc: "Ile razy AI cytuje stronę marki jako źródło w odpowiedzi" },
                  { icon: "📊", title: "AI Share of Voice", desc: "Jaki % przestrzeni AI zajmuje marka vs konkurenci w tej samej kategorii" },
                ].map((x, i) => (
                  <div key={i} style={{ background: S.navy1, borderRadius: 10, padding: "14px 16px", border: "1px solid " + S.border }}>
                    <div style={{ fontSize: 22, marginBottom: 8 }}>{x.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: S.text, marginBottom: 4 }}>{x.title}</div>
                    <div style={{ fontSize: 11, color: S.muted, lineHeight: 1.6 }}>{x.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Step by step Ahrefs */}
            <div style={{ fontSize: 14, fontWeight: 800, color: S.text, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ background: S.sky + "22", color: S.sky, borderRadius: 6, padding: "2px 10px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>Krok po kroku</span>
              Jak pobrać dane z Ahrefs
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
              {/* Step 1 */}
              <div style={{ display: "flex", gap: 16, padding: "18px 20px", background: S.navy2, border: "1px solid " + S.border, borderRadius: 12, alignItems: "flex-start" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: S.sky + "22", border: "2px solid " + S.sky + "66", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: S.sky, flexShrink: 0 }}>1</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: S.text, marginBottom: 6 }}>Otwórz Ahrefs → sekcja <span style={{ color: S.sky }}>AI visibility → AI responses</span></div>
                  <div style={{ fontSize: 12, color: S.muted, lineHeight: 1.7, marginBottom: 10 }}>W lewym menu kliknij <strong style={{ color: S.text }}>AI visibility</strong>, następnie <strong style={{ color: S.text }}>AI responses</strong>. Upewnij się że masz wybrany właściwy projekt i kraj (np. Poland).</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: S.navy1, borderRadius: 8, fontSize: 11, color: S.muted }}>
                    <span style={{ fontSize: 14 }}>💡</span> Tu widzisz wszystkie odpowiedzi AI na zapytania branżowe dla Twojej domeny
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div style={{ display: "flex", gap: 16, padding: "18px 20px", background: S.navy2, border: "1px solid " + S.border, borderRadius: 12, alignItems: "flex-start" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: S.green + "22", border: "2px solid " + S.green + "66", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: S.green, flexShrink: 0 }}>2</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: S.text, marginBottom: 6 }}>Wybierz platformę AI z filtra</div>
                  <div style={{ fontSize: 12, color: S.muted, lineHeight: 1.7, marginBottom: 10 }}>W górnym filtrze kliknij nazwę platformy (np. <strong style={{ color: S.text }}>Copilot</strong>, <strong style={{ color: S.text }}>ChatGPT</strong>, <strong style={{ color: S.text }}>Gemini</strong> itd.). Eksportuj każdą platformę osobno.</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {[
                      { name: "AI Overview", color: S.sky },
                      { name: "AI Mode", color: "#34d399" },
                      { name: "ChatGPT", color: S.green },
                      { name: "Gemini", color: S.coral },
                      { name: "Perplexity", color: S.purple },
                      { name: "Copilot", color: S.gold },
                    ].map((p, i) => (
                      <span key={i} style={{ padding: "3px 12px", borderRadius: 14, fontSize: 11, fontWeight: 700, background: p.color + "18", border: "1px solid " + p.color + "44", color: p.color }}>{p.name}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div style={{ display: "flex", gap: 16, padding: "18px 20px", background: S.navy2, border: "1px solid " + S.border, borderRadius: 12, alignItems: "flex-start" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: S.coral + "22", border: "2px solid " + S.coral + "66", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: S.coral, flexShrink: 0 }}>3</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: S.text, marginBottom: 6 }}>Kliknij <span style={{ color: S.coral }}>Export</span> → pobierz jako CSV</div>
                  <div style={{ fontSize: 12, color: S.muted, lineHeight: 1.7, marginBottom: 10 }}>
                    Kliknij <strong style={{ color: S.coral }}>Export</strong> — są dwa przyciski:<br/>
                    <strong style={{ color: S.text }}>① Górny Export</strong> (prawy górny róg tabeli) eksportuje aktualny widok.<br/>
                    <strong style={{ color: S.text }}>② Dolny Export</strong> (przy liczbie wyników, np. "489 results") eksportuje <strong style={{ color: S.green }}>WSZYSTKIE wyniki</strong> z pełną listą zapytań — ten jest potrzebny do analizy.<br/>
                    Ahrefs eksportuje w UTF-16 z TAB — narzędzie obsługuje oba formaty automatycznie.
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ padding: "8px 12px", background: S.navy1, borderRadius: 8, fontSize: 11, color: S.muted, border: "1px solid " + S.border }}>
                      <span style={{ color: S.green }}>✓</span> UTF-16 (domyślny Ahrefs)
                    </div>
                    <div style={{ padding: "8px 12px", background: S.navy1, borderRadius: 8, fontSize: 11, color: S.muted, border: "1px solid " + S.border }}>
                      <span style={{ color: S.green }}>✓</span> UTF-8 (też działa)
                    </div>
                    <div style={{ padding: "8px 12px", background: S.navy1, borderRadius: 8, fontSize: 11, color: S.muted, border: "1px solid " + S.border }}>
                      <span style={{ color: S.green }}>✓</span> Separator TAB lub przecinek
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div style={{ display: "flex", gap: 16, padding: "18px 20px", background: S.navy2, border: "1px solid " + S.border, borderRadius: 12, alignItems: "flex-start" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: S.gold + "22", border: "2px solid " + S.gold + "66", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: S.gold, flexShrink: 0 }}>4</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: S.text, marginBottom: 6 }}>Powtórz dla każdej platformy → wgraj wszystko naraz</div>
                  <div style={{ fontSize: 12, color: S.muted, lineHeight: 1.7, marginBottom: 10 }}>Zbierz pliki CSV dla wszystkich dostępnych platform. W kroku <strong style={{ color: S.text }}>② Import CSV</strong> możesz upuścić wszystkie pliki jednocześnie — narzędzie automatycznie wykryje która platforma to który plik.</div>
                  <div style={{ padding: "10px 14px", background: S.gold + "0a", border: "1px solid " + S.gold + "33", borderRadius: 8, fontSize: 11, color: S.muted, lineHeight: 1.7 }}>
                    <strong style={{ color: S.gold }}>Wskazówka:</strong> Nie musisz mieć wszystkich 6 platform. Brakująca platforma = wynik 0, ale reszta wykreśli się normalnie.
                  </div>
                </div>
              </div>

              {/* Step 5 */}
              <div style={{ display: "flex", gap: 16, padding: "18px 20px", background: S.navy2, border: "1px solid " + S.green + "44", borderRadius: 12, alignItems: "flex-start" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: S.green + "22", border: "2px solid " + S.green + "66", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: S.green, flexShrink: 0 }}>5</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: S.text, marginBottom: 6 }}>Ustaw nazwę klienta i gotowe 🚀</div>
                  <div style={{ fontSize: 12, color: S.muted, lineHeight: 1.7 }}>W kroku <strong style={{ color: S.text }}>① Klient</strong> wpisz nazwę marki i jej domenę (np. <code style={{ background: S.navy1, padding: "1px 6px", borderRadius: 4, color: S.green }}>gardenspace.pl</code>). System automatycznie wykryje wzmianki, wyliczy wskaźniki i wygeneruje raport gotowy do wysłania klientowi.</div>
                </div>
              </div>
            </div>

            {/* Glossary */}
            <div style={{ fontSize: 14, fontWeight: 800, color: S.text, marginBottom: 14 }}>Słowniczek wskaźników</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 28 }}>
              {[
                { term: "AI Share of Voice (SOV)", color: S.green, def: "% wzmianek marki wśród wszystkich marek pojawiających się w odpowiedziach AI na te same zapytania. Im wyższy, tym marka jest częściej wymieniana od konkurentów." },
                { term: "Mention Rate", color: S.sky, def: "% zapytań, w których AI wymienia markę z nazwy. 5% = marka pojawia się w 1 na 20 analizowanych zapytań." },
                { term: "Citation Rate", color: S.purple, def: "% zapytań, w których AI cytuje stronę marki jako źródło. Wysoka wartość bez wysokiego Mention Rate = 'anonimowy ekspert'." },
                { term: "Presence Score", color: S.coral, def: "Połączony wskaźnik: Mentions + Citations × 0.5. Pokazuje ogólną obecność w AI, nawet gdy marka jest cytowana ale nie wymieniana z nazwy." },
                { term: "Quick Wins", color: S.gold, def: "Szanse na szybką poprawę wyników — oparte na analizie dysproporcji między wskaźnikami i porównaniu z konkurentami." },
                { term: "Brand Variants", color: "#34d399", def: "Warianty nazwy marki sprawdzane w danych (np. 'gardenspace', 'garden space'). Możesz dodać własne jeśli AI używa innej formy nazwy." },
              ].map((x, i) => (
                <div key={i} style={{ padding: "14px 16px", background: S.navy2, border: "1px solid " + x.color + "22", borderRadius: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: x.color, marginBottom: 5 }}>{x.term}</div>
                  <div style={{ fontSize: 11, color: S.muted, lineHeight: 1.6 }}>{x.def}</div>
                </div>
              ))}
            </div>

            <button onClick={() => setTab("setup")}
              style={{ padding: "12px 28px", background: S.green + "18", border: "1px solid " + S.green + "55", borderRadius: 10, color: S.green, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              Zaczynamy → ① Klient
            </button>
          </div>
        )}

        {/* SETUP */}
        {tab === "setup" && (
          <div>
            <STitle>Dane klienta</STitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
              <Inp label="Nazwa klienta / marki *" value={brand.name} set={v => setBrand(b => ({ ...b, name: v }))} ph="np. Gardenspace" />
              <Inp label="URL / domena marki *" value={brand.url} set={v => setBrand(b => ({ ...b, url: v }))} ph="gardenspace.pl" />
              <Inp label="Branża" value={brand.industry} set={v => setBrand(b => ({ ...b, industry: v }))} ph="np. Meble ogrodowe / E-commerce" span2 />
            </div>
            {(brand.name || brand.url) && autoVariants.length > 0 && (
              <Card style={{ marginBottom: 14 }}>
                <CLabel>Warianty nazwy marki — system szuka każdego z nich w kolumnie Mentions</CLabel>
                <div style={{ fontSize: 12, color: S.muted, marginBottom: 10, lineHeight: 1.6 }}>
                  Kliknij <strong style={{ color: S.coral }}>✕</strong> przy wariancie aby go usunąć. Dodaj własny przez pole poniżej — spacje są OK, zatwierdź <strong style={{ color: S.text }}>Enter</strong>.
                </div>
                {/* Auto variants as removable chips */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  {autoVariants.map((v, i) => (
                    <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px 3px 11px", borderRadius: 16, fontSize: 11, fontWeight: 700, background: S.green + "18", border: "1px solid " + S.green + "33", color: S.green }}>
                      {v}
                      <button onClick={() => setRemovedAutoVariants(prev => new Set([...prev, v]))}
                        style={{ background: "none", border: "none", cursor: "pointer", color: S.green + "99", fontSize: 13, lineHeight: 1, padding: 0, display: "flex", alignItems: "center" }}>✕</button>
                    </span>
                  ))}
                  {/* User custom variants as removable chips */}
                  {brandVariants.map((v, i) => (
                    <span key={"c"+i} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px 3px 11px", borderRadius: 16, fontSize: 11, fontWeight: 700, background: S.sky + "18", border: "1px solid " + S.sky + "33", color: S.sky }}>
                      {v}
                      <button onClick={() => setBrandVariants(prev => prev.filter(x => x !== v))}
                        style={{ background: "none", border: "none", cursor: "pointer", color: S.sky + "99", fontSize: 13, lineHeight: 1, padding: 0, display: "flex", alignItems: "center" }}>✕</button>
                    </span>
                  ))}
                  {(removedAutoVariants.size > 0 || brandVariants.length > 0) && (
                    <button onClick={() => { setRemovedAutoVariants(new Set()); setBrandVariants([]); }}
                      style={{ padding: "3px 10px", borderRadius: 16, fontSize: 11, background: "transparent", border: "1px solid " + S.border, color: S.muted, cursor: "pointer" }}>
                      ↺ Reset
                    </button>
                  )}
                </div>
                {/* Add custom variant input */}
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    value={variantInput}
                    onChange={e => setVariantInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && variantInput.trim()) {
                        setBrandVariants(prev => [...new Set([...prev, variantInput.trim()])]);
                        setVariantInput("");
                      }
                    }}
                    placeholder="Wpisz własny wariant i naciśnij Enter (np. Garden Space)"
                    style={{ flex: 1, background: S.navy1, border: "1px solid " + S.border, borderRadius: 8, padding: "8px 12px", color: S.text, fontSize: 12, outline: "none" }}
                  />
                  <button onClick={() => { if (variantInput.trim()) { setBrandVariants(prev => [...new Set([...prev, variantInput.trim()])]); setVariantInput(""); } }}
                    style={{ padding: "8px 16px", background: S.sky + "18", border: "1px solid " + S.sky + "44", borderRadius: 8, color: S.sky, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    + Dodaj
                  </button>
                </div>
              </Card>
            )}
            <Card>
              <CLabel>Jak działa parser Ahrefs?</CLabel>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { icon: "📂", text: "Pliki CSV z Ahrefs — obsługa UTF-8 i UTF-16, separator TAB i przecinek" },
                  { icon: "🔍", text: "Platforma wykrywana automatycznie (AI Overview, ChatGPT, Gemini, Perplexity, Copilot)" },
                  { icon: "✦", text: "Wzmianki: kolumna \"Mentions\" zawiera nazwę marki → wykryta na podstawie domeny" },
                  { icon: "🔗", text: "Cytowania: kolumna \"Link URL\" zawiera domenę marki" },
                ].map((x, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, padding: "12px 14px", background: S.navy1, borderRadius: 8, border: "1px solid " + S.border }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{x.icon}</span>
                    <span style={{ fontSize: 12, color: S.muted, lineHeight: 1.5 }}>{x.text}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Btn onClick={() => setTab("import")} disabled={!(brand.name && brand.url)}>Dalej → Import CSV</Btn>
          </div>
        )}

        {/* IMPORT */}
        {tab === "import" && (
          <div>
            <STitle>Import plików CSV z Ahrefs</STitle>
            <p style={{ fontSize: 13, color: S.muted, marginBottom: 20 }}>Wgraj wszystkie pliki naraz — platforma i encoding wykrywane automatycznie.</p>

            <DropZone onFiles={handleFiles} />

            {/* Brand variant detection panel */}
            {allDetectedMentions.length > 0 && (
              <div style={{ marginTop: 16, padding: "16px 18px", background: "#080e18", border: "1px solid " + (totalM > 0 ? S.green + "55" : S.gold + "55"), borderRadius: 12 }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <span style={{ fontSize: 18 }}>{totalM > 0 ? "✅" : "⚠️"}</span>
                  <div>
                    {totalM > 0 ? (
                      <div style={{ fontSize: 13, color: S.green, fontWeight: 700 }}>
                        Marka wykryta — {totalM} wzmianek, {totalC} cytowań
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, color: S.gold, fontWeight: 700 }}>
                        Nie znaleziono marki &quot;{brandKey}&quot; — wybierz wariant poniżej
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: S.muted, marginTop: 2 }}>
                      Sprawdzano warianty: {variantsInUse.slice(0, 6).join(", ")}{variantsInUse.length > 6 ? " +" + (variantsInUse.length - 6) + " więcej" : ""}
                    </div>
                  </div>
                </div>

                {/* Variant hits — what actually matched */}
                {Object.keys(allVariantHits).length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, color: S.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>Wykryte dopasowania</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {Object.entries(allVariantHits).sort((a,b) => b[1]-a[1]).map(([variant, count], i) => (
                        <div key={i} style={{ padding: "4px 12px", borderRadius: 8, background: S.green + "18", border: "1px solid " + S.green + "44", fontSize: 12 }}>
                          <span style={{ color: S.green, fontWeight: 700 }}>{variant}</span>
                          <span style={{ color: S.muted, marginLeft: 6, fontSize: 11 }}>{count}×</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mentions found in data — to pick from */}
                {totalM === 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: S.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>Marki w danych — kliknij swoją</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                      {allDetectedMentions.map((m, i) => {
                        const cols = [S.sky, S.coral, S.gold, S.purple, "#34d399", S.green];
                        const isActive = brandMentionKey === m;
                        return (
                          <button key={i} onClick={() => setBrandMentionKey(isActive ? "" : m)}
                            style={{ padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer", background: isActive ? cols[i%6] + "33" : cols[i%6] + "12", border: "1px solid " + (isActive ? cols[i%6] : cols[i%6] + "44"), color: cols[i%6] }}>
                            {m}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input value={brandMentionKey} onChange={e => setBrandMentionKey(e.target.value)}
                        placeholder="wpisz ręcznie lub wybierz powyżej..."
                        style={{ flex: 1, background: S.navy2, border: "1px solid " + S.border, borderRadius: 8, padding: "8px 12px", color: S.text, fontSize: 12, outline: "none", fontFamily: "monospace" }} />
                      {brandMentionKey && <button onClick={() => setBrandMentionKey("")} style={{ padding: "6px 12px", background: "transparent", border: "1px solid " + S.border, borderRadius: 8, color: S.muted, fontSize: 11, cursor: "pointer" }}>✕ Reset</button>}
                    </div>
                  </div>
                )}

                {/* Extended stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginTop: 10 }}>
                  {[
                    { label: "Wzmianki", val: totalM, total: totalQ, color: S.green },
                    { label: "Cytowania", val: totalC, total: totalQ, color: S.sky },
                    { label: "Presence", val: totalM + totalC, total: totalQ, color: S.purple },
                  ].map((s, i) => {
                    const pctV = s.total > 0 ? (s.val / s.total) * 100 : 0;
                    const label = pctV === 0 ? "0 / " + s.total
                      : pctV < 1 ? s.val + " na " + s.total.toLocaleString("pl-PL") + " zap."
                      : pctV.toFixed(1) + "% (" + s.val + " / " + s.total + ")";
                    return (
                      <div key={i} style={{ background: S.navy1, borderRadius: 8, padding: "10px 12px", border: "1px solid " + s.color + "22" }}>
                        <div style={{ fontSize: 9, color: S.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 4 }}>{s.label}</div>
                        <div style={{ fontSize: 16, fontWeight: 900, color: s.color }}>{s.val}</div>
                        <div style={{ fontSize: 10, color: S.muted, marginTop: 2 }}>{label}</div>
                      </div>
                    );
                  })}
                </div>

                {totalC > 0 && totalM === 0 && (
                  <div style={{ marginTop: 10, fontSize: 11, color: S.sky, padding: "8px 12px", background: S.sky + "0a", borderRadius: 6 }}>
                    💡 {totalC} cytowań znalezionych (Link URL zawiera domenę) — AI cytuje stronę jako źródło, ale nie wymienia marki z nazwy. Wybierz markę z listy powyżej lub wpisz ją ręcznie.
                  </div>
                )}
              </div>
            )}

            {/* Platform status */}
            {Object.keys(loadedFiles).length > 0 && (
              <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                {PLATFORMS.map(p => {
                  const fname = loadedFiles[p.id];
                  const d = proc[p.id];
                  return (
                    <div key={p.id} style={{ padding: "12px 14px", background: S.navy2, border: "1px solid " + (fname ? p.color + "44" : S.border), borderRadius: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ background: p.color + "20", color: p.color, borderRadius: 5, padding: "1px 7px", fontSize: 11, fontWeight: 700 }}>{p.icon} {p.short}</span>
                        {fname ? <span style={{ fontSize: 10, color: S.green }}>✅</span> : <span style={{ fontSize: 10, color: S.muted }}>—</span>}
                      </div>
                      {fname ? (
                        <>
                          <div style={{ fontSize: 10, color: S.muted, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fname}</div>
                          <div style={{ fontSize: 11, color: S.text, fontFamily: "monospace" }}>{d.total} zapytań · {d.mentions} wzm. · {d.citations} cyt.</div>
                        </>
                      ) : <div style={{ fontSize: 11, color: "#2a4060" }}>Brak danych</div>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Auto-detected competitors */}
            {allComps.length > 0 && (
              <Card style={{ marginTop: 20 }}>
                <CLabel>Konkurenci wykryci automatycznie</CLabel>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {allComps.slice(0, 12).map((c, i) => {
                    const cols = [S.sky, S.coral, S.gold, S.purple, "#34d399", S.green];
                    return <span key={i} style={{ padding: "4px 13px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: cols[i % 6] + "1a", border: "1px solid " + cols[i % 6] + "44", color: cols[i % 6] }}>{c} <span style={{ opacity: .6, fontWeight: 400 }}>({compCounts[c]})</span></span>;
                  })}
                </div>
              </Card>
            )}

            {/* Unknown files - manual platform assign */}
            {unknownFiles.length > 0 && (
              <div style={{ marginTop: 16, padding: "14px 16px", background: S.gold + "0a", border: "1px solid " + S.gold + "33", borderRadius: 10 }}>
                <div style={{ fontSize: 11, color: S.gold, fontWeight: 700, marginBottom: 10 }}>⚠️ Nie rozpoznano platformy — przypisz ręcznie:</div>
                {unknownFiles.map((uf, fi) => (
                  <div key={fi} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, color: S.muted, marginBottom: 6, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      📄 {uf.filename}
                    </div>
                    <div style={{ fontSize: 10, color: "#2a4060", marginBottom: 8 }}>
                      Nagłówki: <span style={{ color: S.muted }}>{uf.headers.slice(0,6).join(", ")}</span>
                      {uf.models.length > 0 && <span> | Model: <strong style={{ color: S.text }}>{uf.models.join(", ")}</strong></span>}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {PLATFORMS.map(p => (
                        <button key={p.id} onClick={() => {
                          // Re-parse this file forcing the platform
                          const buf = Object.entries(rawBuffers).find(([k]) => k === uf.filename)?.[1];
                          if (!buf) return;
                          try {
                            const r = parseAhrefsBuffer(buf, brandKey, variantsInUse, uf.filename);
                            const agg = aggregatePlatform(r ? r.rows : [], r ? r.variantHits : {});
                            setParsedData(d => ({ ...d, [p.id]: agg }));
                            setLoadedFiles(f => ({ ...f, [p.id]: uf.filename }));
                            setUnknownFiles(prev => prev.filter((_, i) => i !== fi));
                            setErrors(e => e.filter(x => !x.includes(uf.filename)));
                          } catch(_) {}
                        }}
                          style={{ padding: "4px 12px", borderRadius: 14, fontSize: 11, fontWeight: 700, cursor: "pointer", background: p.color + "18", border: "1px solid " + p.color + "44", color: p.color }}>
                          {p.icon} {p.short}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {errors.length > 0 && unknownFiles.length === 0 && (
              <div style={{ marginTop: 16, padding: "12px 16px", background: S.coral + "0f", border: "1px solid " + S.coral + "33", borderRadius: 10 }}>
                {errors.map((e, i) => <div key={i} style={{ fontSize: 12, color: S.coral }}>{e}</div>)}
              </div>
            )}

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
            <Card style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 9, color: S.muted, fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", marginBottom: 4 }}>◈ AI Signal Scanner</div>
                  <div style={{ fontSize: 11, color: S.muted, lineHeight: 1.5 }}>
                    Każde koło = jedna platforma AI. <strong style={{ color: S.text }}>% w środku</strong> = Mention Rate (ile zapytań kończy się wzmianką marki). Świecące = dane wgrane, blade = brak danych.
                  </div>
                </div>
              </div>
              <SignalScanner proc={proc} />
            </Card>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 18 }}>
              {[
                { label: "AI Share of Voice", value: fmtPctSimple(avgSOV), color: S.green, sub: totalM + " wzm. / " + totalQ + " zap.", desc: "Udział marki wśród wszystkich marek wymienianych przez AI — im wyższy, tym częściej marka pojawia się zamiast konkurentów." },
                { label: "Presence Score", value: fmtPct(totalPresence, totalQ), color: S.sky, sub: "Mentions + Citations×0.5", desc: "Ogólna obecność w AI: łączy wzmianki nazwy i cytowania strony. Pokazuje śledź nawet gdy AI cytuje bez wymienienia nazwy." },
                { label: "Mention Rate", value: fmtPct(visM, totalQ), color: S.purple, sub: totalM + " na " + totalQ + " zap.", desc: "% zapytań, w których AI wymienia markę z nazwy. Bezpośrednia miara rozpoznawalności marki przez modele AI." },
                { label: "Citation Rate", value: fmtPct(visC, totalQ), color: S.coral, sub: totalC + " na " + totalQ + " zap.", desc: "% zapytań, w których AI cytuje stronę jako źródło. Miara autorytetu technicznego domeny w oczach AI." },
              ].map((k, i) => (
                <div key={i} style={{ background: S.navy2, border: "1px solid " + k.color + "1a", borderRadius: 12, padding: "18px 16px", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: k.color + "0b" }} />
                  <div style={{ fontSize: 9, color: S.muted, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700, marginBottom: 6 }}>{k.label}</div>
                  <div style={{ fontSize: 30, fontWeight: 900, color: k.color, lineHeight: 1, marginBottom: 4 }}>{k.value}</div>
                  <div style={{ fontSize: 10, color: S.muted, marginBottom: 6 }}>{k.sub}</div>
                  <div style={{ fontSize: 10, color: "#2a4060", lineHeight: 1.5, borderTop: "1px solid " + S.border, paddingTop: 6 }}>{k.desc}</div>
                  {typeof k.value === "string" && k.value.endsWith("%") && (
                    <div style={{ marginTop: 8, height: 3, background: S.navy4, borderRadius: 2, overflow: "visible", position: "relative" }}>
                      <div style={{ width: "calc(max(" + (parseFloat(k.value)||0) + "%, " + (k.value !== "0%" ? "3px" : "0px") + "))", height: "100%", background: k.color, borderRadius: 2, minWidth: k.value !== "0%" ? 4 : 0 }} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 14, marginBottom: 14 }}>
              <Card>
                <CLabel>AI Share of Voice — per platforma</CLabel>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={sovData} margin={{ top: 10, right: 10, left: -22, bottom: 0 }}>
                    <defs>
                      <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={S.green} />
                        <stop offset="100%" stopColor={S.greenD + "77"} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 4" stroke={S.border} />
                    <XAxis dataKey="platform" tick={{ fill: S.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: S.muted, fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                    <Tooltip content={<Tip />} />
                    <Bar dataKey="sov" name="SOV %" fill="url(#g1)" radius={[5, 5, 0, 0]} label={{ position: "top", fill: S.green, fontSize: 9, formatter: v => (v < 1 && v > 0 ? v.toFixed(1) : v) + "%" }} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card>
                <CLabel>Radar widoczności</CLabel>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={radarData} margin={{ top: 14, right: 22, left: 22, bottom: 10 }}>
                    <PolarGrid stroke={S.border} />
                    <PolarAngleAxis dataKey="platform" tick={{ fill: S.muted, fontSize: 9 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#233550", fontSize: 8 }} />
                    <Radar name="Wzmianki" dataKey="Wzmianki" stroke={S.green} fill={S.green} fillOpacity={0.12} strokeWidth={2} />
                    <Radar name="Cytowania" dataKey="Cytowania" stroke={S.sky} fill={S.sky} fillOpacity={0.12} strokeWidth={2} />
                    <Legend wrapperStyle={{ fontSize: 11, color: S.muted }} />
                  </RadarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            <Card style={{ marginBottom: 14 }}>
              <CLabel>Wzmianki vs Cytowania</CLabel>
              <ResponsiveContainer width="100%" height={185}>
                <BarChart data={sovData} margin={{ top: 8, right: 10, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke={S.border} />
                  <XAxis dataKey="platform" tick={{ fill: S.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: S.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<Tip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: S.muted }} />
                  <Bar dataKey="mentions" name="Wzmianki" fill={S.green} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="citations" name="Cytowania" fill={S.sky} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="total" name="Zapytania" fill={S.navy4} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {allComps.length > 0 && (
              <Card style={{ marginBottom: 14 }}>
                <CLabel>Konkurenci — wzmianki w AI</CLabel>
                <ResponsiveContainer width="100%" height={Math.min(40 * Math.min(allComps.length + 1, 9) + 40, 380)}>
                  <BarChart
                    data={[{ name: brand.name || "Twoja marka", count: totalM }, ...allComps.slice(0, 7).map(c => ({ name: c, count: compCounts[c] }))]}
                    layout="vertical" margin={{ top: 8, right: 50, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="2 4" stroke={S.border} horizontal={false} />
                    <XAxis type="number" tick={{ fill: S.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" tick={{ fill: S.text, fontSize: 11 }} axisLine={false} tickLine={false} width={130} />
                    <Tooltip content={<Tip />} />
                    <Bar dataKey="count" name="Wzmianki" radius={[0, 4, 4, 0]} label={{ position: "right", fill: S.muted, fontSize: 10 }}>
                      {[{ name: brand.name || "Twoja marka" }, ...allComps.slice(0, 7).map(c => ({ name: c }))].map((_, i) => (
                        <Cell key={i} fill={[S.green, S.sky, S.coral, S.gold, S.purple, "#34d399", S.sky, S.coral][i] || S.sky} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}

            <Card style={{ marginBottom: 16 }}>
              <CLabel>Tabela szczegółowa</CLabel>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid " + S.border }}>
                      {["Platforma", "Zapytań", "Wzmianki", "Cytowania", "Presence", "SOV %", "Mention %", "Citation %"].map(h => (
                        <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontSize: 9, color: S.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PLATFORMS.map(p => {
                      const d = proc[p.id];
                      const allM = d.mentions + allComps.reduce((s, c) => s + (d.compSet[c] || 0), 0);
                      const sovRaw2 = allM > 0 ? (d.mentions / allM) * 100 : 0;
                      const sov = sovRaw2 < 1 && sovRaw2 > 0 ? Math.round(sovRaw2 * 10) / 10 : Math.round(sovRaw2);
                      const mRraw = d.total > 0 ? (d.mentions / d.total) * 100 : 0;
                      const mR = mRraw < 1 && mRraw > 0 ? Math.round(mRraw * 10) / 10 : Math.round(mRraw);
                      const cRraw = d.total > 0 ? (d.citations / d.total) * 100 : 0;
                      const cR = cRraw < 1 && cRraw > 0 ? Math.round(cRraw * 10) / 10 : Math.round(cRraw);
                      const presRawP = d.total > 0 ? ((d.mentions + d.citations * 0.5) / d.total) * 100 : 0;
                      const presencePct = presRawP < 0.1 ? 0 : presRawP < 1 ? Math.round(presRawP * 10) / 10 : Math.round(presRawP);
                      return (
                        <tr key={p.id} style={{ borderBottom: "1px solid " + S.navy3, opacity: d.total > 0 ? 1 : 0.4 }}>
                          <td style={{ padding: "10px 12px" }}><span style={{ background: p.color + "20", color: p.color, borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{p.icon} {p.short}</span></td>
                          <td style={{ padding: "10px 12px", color: S.muted, fontFamily: "monospace" }}>{d.total}</td>
                          <td style={{ padding: "10px 12px", color: S.green, fontFamily: "monospace", fontWeight: 700 }}>{d.mentions}</td>
                          <td style={{ padding: "10px 12px", color: S.sky, fontFamily: "monospace", fontWeight: 700 }}>{d.citations}</td>
                          <td style={{ padding: "10px 12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{ width: 44, height: 7, background: S.navy4, borderRadius: 3, overflow: "hidden" }}>
                                <div style={{ width: Math.min(presencePct, 100) + "%", height: "100%", background: "linear-gradient(90deg," + S.sky + "," + S.purple + ")", borderRadius: 3 }} />
                              </div>
                              <span style={{ fontFamily: "monospace", fontSize: 11, color: presencePct > 0 ? S.sky : S.muted, fontWeight: presencePct > 0 ? 700 : 400 }}>{fmtPct(presencePct)}</span>
                            </div>
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                              <div style={{ width: 40, height: 5, background: S.navy4, borderRadius: 2, overflow: "hidden" }}>
                                <div style={{ width: Math.max(sov, sov > 0 ? 4 : 0) + "%", height: "100%", background: "linear-gradient(90deg," + S.green + "," + S.sky + ")", borderRadius: 2, minWidth: sov > 0 ? 3 : 0 }} />
                              </div>
                              <span style={{ fontFamily: "monospace", fontSize: 11, color: S.text }}>{fmtPct(sov)}</span>
                            </div>
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={{ fontFamily: "monospace", fontSize: 11, color: mR >= 50 ? S.green : mR >= 25 ? S.gold : S.coral, fontWeight: 700 }}>{fmtPct(mR, d.total)}</span>
                            {mR > 0 && mR < 1 && <div style={{ fontSize: 9, color: S.muted }}>{"("+d.mentions+")"}</div>}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={{ fontFamily: "monospace", fontSize: 11, color: cR >= 30 ? S.green : cR >= 15 ? S.gold : S.coral, fontWeight: 700 }}>{fmtPct(cR, d.total)}</span>
                            {cR > 0 && cR < 1 && <div style={{ fontSize: 9, color: S.muted }}>{"("+d.citations+")"}</div>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* OPPORTUNITIES */}
            <Card style={{ marginBottom: 14, border: "1px solid " + S.gold + "33", background: S.navy2 }}>
              <CLabel>⚡ Opportunities — Quick Wins</CLabel>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 12px", background: S.gold + "08", border: "1px solid " + S.gold + "22", borderRadius: 8, marginBottom: 14, fontSize: 11, color: S.muted, lineHeight: 1.5 }}>
                <span style={{ color: S.gold, flexShrink: 0, marginTop: 1 }}>⚠️</span>
                <span><strong style={{ color: S.gold }}>Sugestie do ręcznej weryfikacji.</strong> Rekomendacje są generowane automatycznie na podstawie danych liczbowych — przed wdrożeniem sprawdź czy odpowiadają specyfice branży i strategii klienta.</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {(() => {
                  const ops = [];
                  // Platforms with data but 0 mentions
                  const zeroMentionPlatforms = PLATFORMS.filter(p => proc[p.id].total > 0 && proc[p.id].mentions === 0);
                  if (zeroMentionPlatforms.length > 0) {
                    ops.push({ tag: "QUICK WIN", color: S.green, icon: "🎯", title: "Nieobecne platformy", body: zeroMentionPlatforms.map(p => p.name).join(", ") + " — marka ma dane ale zero wzmianek. Dodaj branded content odpowiadający na zapytania użytkowników." });
                  }
                  // Citations >> Mentions gap
                  if (totalC > 0 && totalM === 0) {
                    ops.push({ tag: "QUICK WIN", color: S.green, icon: "🔗", title: "Cytowana, ale nieznana", body: "Strona jest cytowana przez AI (" + totalC + "x) ale marka nie jest wymieniana z nazwy. Dodaj wyraźne branding signals w treściach — nazwa marki, about us, FAQ z nazwą." });
                  }
                  if (totalM > 0 && totalC > totalM * 2) {
                    ops.push({ tag: "QUICK WIN", color: S.sky, icon: "📎", title: "Wysokie cytowania vs wzmianki", body: "AI cytuje stronę " + totalC + "x vs " + totalM + " wzmianek nazwy. Szansa: wzmocnij entity mentions — Wikipedia, Wikidata, bazy branżowe." });
                  }
                  // Competitor dominance
                  const topComp = allComps[0];
                  if (topComp && compCounts[topComp] > totalM * 1.5) {
                    ops.push({ tag: "PRIORYTET", color: S.coral, icon: "⚔️", title: "Konkurent dominuje", body: topComp + " ma " + compCounts[topComp] + " wzm. vs " + totalM + " Twojej marki. Przeanalizuj ich treści i stwórz konkurencyjne odpowiedzi na te same zapytania." });
                  }
                  // Low citation score despite mentions
                  if (visM > 0 && visC < visM / 3) {
                    ops.push({ tag: "QUICK WIN", color: S.purple, icon: "🏗️", title: "Słabe cytowania — tech gap", body: "Marka znana AI (" + visM + "% mentions) ale rzadko cytowana (" + visC + "%). Wdróż: schema markup, structured data, poprawa Core Web Vitals — to zwiększy autorytet w oczach AI." });
                  }
                  // Platforms with very low SOV
                  const lowSov = PLATFORMS.filter(p => proc[p.id].total > 0 && proc[p.id].mentions > 0).filter(p => {
                    const d = proc[p.id];
                    const allM = d.mentions + allComps.reduce((s, c) => s + (d.compSet[c] || 0), 0);
                    return allM > 0 && Math.round((d.mentions / allM) * 100) < 15;
                  });
                  if (lowSov.length > 0) {
                    ops.push({ tag: "SZANSA", color: S.sky, icon: "📈", title: "SOV < 15% na platformach", body: lowSov.map(p => p.short).join(", ") + " — SOV poniżej 15%. Twórz treści w formatach preferowanych przez te modele (długie FAQ, how-to, listy porównawcze)." });
                  }
                  // If no data at all
                  if (totalQ === 0) {
                    ops.push({ tag: "START", color: S.muted, icon: "📂", title: "Brak danych", body: "Wgraj pliki CSV z Ahrefs aby zobaczyć spersonalizowane rekomendacje." });
                  }
                  // Always add content freshness tip
                  ops.push({ tag: "SZANSA", color: S.gold, icon: "🔄", title: "Content freshness", body: "Modele AI preferują świeże treści. Zaktualizuj kluczowe strony z datą publikacji, dodaj sekcje FAQ z aktualnymi danymi — to bezpośrednio wpływa na mention rate." });
                  if (ops.length < 4) {
                    ops.push({ tag: "QUICK WIN", color: S.green, icon: "🌐", title: "Entity building", body: "Zadbaj o wzmianki marki w zewnętrznych źródłach: branżowe katalogi, media, Wikipedia (jeśli spełniasz kryteria). AI uczy się rozpoznawać marki z takich sygnałów." });
                  }
                  return ops.slice(0, 6).map((op, i) => (
                    <div key={i} style={{ padding: "12px 14px", background: op.color + "08", border: "1px solid " + op.color + "22", borderRadius: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                        <span style={{ fontSize: 15 }}>{op.icon}</span>
                        <span style={{ fontSize: 9, fontWeight: 800, color: op.color, background: op.color + "20", borderRadius: 4, padding: "1px 6px", letterSpacing: "0.8px", textTransform: "uppercase" }}>{op.tag}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: S.text }}>{op.title}</span>
                      </div>
                      <div style={{ fontSize: 11, color: S.muted, lineHeight: 1.6 }}>{op.body}</div>
                    </div>
                  ));
                })()}
              </div>
            </Card>

            <Card>
              <CLabel>✦ Spostrzeżenia — co to znaczy i co robić</CLabel>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 12px", background: S.muted + "0a", border: "1px solid " + S.border, borderRadius: 8, marginBottom: 12, fontSize: 10, color: S.muted, lineHeight: 1.5 }}>
                <span style={{ flexShrink: 0 }}>ℹ️</span>
                <span>Wnioski generowane automatycznie z danych. Kontekst branżowy i strategiczny wymaga ręcznej oceny przed przekazaniem klientowi.</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {/* SOV insight */}
                {best && (
                  <Ins color={S.green} i="↑" t={
                    best.sov >= 30
                      ? "Silna pozycja na " + best.platform + " (SOV " + best.sov + "%) — utrzymaj regularny content i monitoruj."
                      : best.sov >= 10
                        ? best.platform + ": SOV " + best.sov + "% — solidna baza, ale jest przestrzeń. Rozbuduj treści FAQ i how-to."
                        : best.platform + ": SOV tylko " + best.sov + "% — marka rzadko wymieniana. Priorytet: tworzenie treści pod konkretne zapytania."
                  } />
                )}
                {worst && worst !== best && (
                  <Ins color={S.coral} i="↓" t={
                    worst.sov === 0
                      ? worst.platform + ": 0% SOV — marka w ogóle nie pojawia się. Sprawdź czy zapytania są trafne, a potem twórz dedykowane treści pod tę platformę."
                      : "Najniższy SOV: " + worst.platform + " (" + worst.sov + "%) — potencjał do wzrostu. Twórz content odpowiadający na pytania typowe dla tej platformy."
                  } />
                )}
                {/* Mentions vs Citations smart analysis */}
                {totalQ > 0 && (() => {
                  const ratio = totalM > 0 ? totalC / totalM : null;
                  if (totalM === 0 && totalC === 0) return <Ins color={S.muted} i="○" t="Brak wzmianek i cytowań — marka niewidoczna dla AI. Zacznij od audytu treści i wdrożenia structured data." />;
                  if (totalM === 0 && totalC > 0) return <Ins color={S.gold} i="!" t={"Marka cytowana " + totalC + "x jako źródło, ale AI nie zna jej nazwy. To typowy problem 'anonimowego eksperta' — dodaj entity signals: About Us, WikiData, wzmianki w mediach."} />;
                  if (ratio !== null && ratio > 5) return <Ins color={S.sky} i="!" t={"Cytowania (" + totalC + ") znacznie przewyższają wzmianki (" + totalM + ") — AI używa strony jako źródła, ale nie 'uczy się' nazwy marki. Dodaj branded anchor texty i wzmianki w nagłówkach."} />;
                  if (ratio !== null && ratio < 0.2 && totalM > 0) return <Ins color={S.purple} i="!" t={"Dużo wzmianek (" + totalM + ") ale mało cytowań (" + totalC + ") — AI zna markę, ale rzadko poleca stronę. Popraw tech SEO: szybkość, structured data, Core Web Vitals."} />;
                  if (totalM > 0 && totalC > 0) return <Ins color={S.green} i="✓" t={"Wzmianki (" + totalM + ") i cytowania (" + totalC + ") — obecność potwierdzona. Pracuj nad zwiększeniem częstotliwości."} />;
                  return null;
                })()}
                {/* Platform coverage */}
                {(() => {
                  const withData = PLATFORMS.filter(p => proc[p.id].total > 0);
                  const withMentions = PLATFORMS.filter(p => proc[p.id].mentions > 0);
                  if (withData.length === 0) return null;
                  if (withMentions.length === 0) return <Ins color={S.coral} i="◈" t={"Dane z " + withData.length + " platform, ale 0 wzmianek. Sprawdź czy klucz marki jest poprawny (zakładka Import CSV)."} />;
                  return <Ins color={S.sky} i="◈" t={(brand.name || "Marka") + " rozpoznawana na " + withMentions.length + "/" + withData.length + " platform z danymi." + (withMentions.length < withData.length ? " Brak wzmianek: " + withData.filter(p => !proc[p.id].mentions).map(p => p.short).join(", ") + "." : "")} />;
                })()}
                {allComps.length > 0 && (() => {
                  const topC = allComps[0];
                  const topCCount = compCounts[topC];
                  if (topCCount > totalM * 2) return <Ins color={S.coral} i="⚔️" t={topC + " dominuje: " + topCCount + " wzm. vs " + totalM + " Twojej marki. Zbadaj ich content — jakie pytania pokrywają, których Ty nie masz."} />;
                  if (topCCount > totalM) return <Ins color={S.gold} i="⚔️" t={topC + " nieznacznie wyprzedza (" + topCCount + " vs " + totalM + " wzm.). Do nadgonienia w ciągu 2-3 miesięcy intensywnych działań."} />;
                  return <Ins color={S.green} i="⚔️" t={"Marka wyprzedza " + allComps.length + " konkurentów w AI. " + topC + ": " + topCCount + " wzm. vs " + totalM + " Twojej."} />;
                })()}
              </div>
            </Card>
            {/* Definitions footer */}
            <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid " + S.border }}>
              <div style={{ fontSize: 11, color: S.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 14 }}>Słownik wskaźników</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {[
                  { term: "AI Share of Voice (SOV)", color: S.green, icon: "📊",
                    def: "Procent wzmianek marki wśród sumy wzmianek wszystkich marek z tej samej kategorii w odpowiedziach AI. SOV 30% = na każde 10 wzmianek marek w branży, 3 dotyczą tej marki." },
                  { term: "Presence Score", color: S.sky, icon: "📡",
                    def: "Łączony wskaźnik obecności: (wzmianki + cytowania × 0.5) / zapytania. Wyższy niż Mention Rate — pokazuje obecność nawet gdy AI cytuje stronę bez wymienienia nazwy marki." },
                  { term: "Mention Rate", color: S.purple, icon: "💬",
                    def: "% zapytań zakończonych wzmianką nazwy marki. 1% = marka wymieniana w 1 na 100 zapytań. Kluczowy wskaźnik rozpoznawalności przez AI — rośnie dzięki content marketingowi." },
                  { term: "Citation Rate", color: S.coral, icon: "🔗",
                    def: "% zapytań, w których AI cytuje stronę jako źródło. Rośnie przez structured data, E-E-A-T i autorytet domeny. Wysoka wartość przy niskim Mention Rate = 'anonimowy ekspert'." },
                  { term: "Quick Win / Opportunity", color: S.gold, icon: "⚡",
                    def: "Szansa wykryta automatycznie z dysproporcji między wskaźnikami lub luki vs konkurencja. Sugestia — wymaga weryfikacji kontekstu branżowego przed wdrożeniem." },
                  { term: "Brand Variant", color: "#34d399", icon: "🔍",
                    def: "Wariant nazwy marki sprawdzany w kolumnie Mentions. Ahrefs zapisuje nazwy marki tak, jak AI je wymienia — może to być skrót, domena lub inna forma niż oficjalna nazwa." },
                ].map((x, i) => (
                  <div key={i} style={{ padding: "12px 14px", background: S.navy2, border: "1px solid " + x.color + "18", borderRadius: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                      <span style={{ fontSize: 14 }}>{x.icon}</span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: x.color }}>{x.term}</span>
                    </div>
                    <div style={{ fontSize: 11, color: S.muted, lineHeight: 1.6 }}>{x.def}</div>
                  </div>
                ))}
              </div>
            </div>

            <Btn onClick={() => setTab("report")} style={{ marginTop: 22 }}>Generuj Raport →</Btn>
          </div>
        )}

        {/* REPORT */}
        {tab === "report" && (() => {
          // Build auto comment text for editing
          const autoCommentText = [
            "Klient: " + (brand.name || "[marka]") + (brand.url ? " (" + brand.url + ")" : "") + (brand.industry ? " | Branża: " + brand.industry : ""),
            "",
            "Niniejszy raport przedstawia wyniki analizy widoczności marki w odpowiedziach generowanych przez modele AI. Analiza obejmuje " + totalQ.toLocaleString("pl-PL") + " zapytań na 6 platformach AI.",
            "",
            "AI Share of Voice: " + avgSOV + "% — " + (avgSOV >= 30 ? "silna pozycja wśród konkurentów w AI." : avgSOV >= 10 ? "umiarkowana widoczność — wyraźny potencjał wzrostu." : "niska widoczność — kluczowe działania contentowe i entity building."),
            "Mention Rate: " + fmtPctSimple(visM) + " (" + totalM + " wzmianek na " + totalQ.toLocaleString("pl-PL") + " zapytań)",
            "Citation Rate: " + fmtPctSimple(visC) + " (" + totalC + " cytowań)",
            "",
            (totalM === 0 && totalC > 0 ? "Marka jest cytowana przez AI jako źródło (" + totalC + "x), ale nie jest wymieniana z nazwy — typowy problem 'anonimowego eksperta'. Priorytet: entity signals (Wikipedia, Wikidata, About Us z nazwą marki)." :
             totalM > 0 && totalC > totalM * 5 ? "Wysoka dysproporcja: AI cytuje stronę " + totalC + "x vs " + totalM + " wzmianek nazwy. Priorytet: branded anchor texty, wzmianki w mediach branżowych." :
             totalM > 0 ? "Marka widoczna — " + totalM + " wzmianek. Kolejny krok: zwiększenie częstotliwości przez dedykowany content plan (FAQ, how-to, porównania)." :
             "Brak wzmianek i cytowań — marka niewidoczna dla AI. Start od structured data i treści odpowiadających na zapytania branżowe."),
            "",
            best ? "Najlepsza platforma: " + best.platform + " (SOV " + best.sov + "%)" + (worst && worst !== best ? " | Do poprawy: " + worst.platform + " (SOV " + worst.sov + "%)" : "") : "",
            allComps.length > 0 ? "Wykryci konkurenci: " + allComps.slice(0,4).map(c => c + " (" + compCounts[c] + " wzm.)").join(", ") : "",
            "",
            "Rekomendacje na 3-6 miesięcy: " + (totalM === 0 && totalC > 0 ? "(1) Wikipedia/Wikidata — zbuduj entity graph. (2) Wzmianki z nazwą marki w mediach branżowych. (3) Sekcja About z jasną nazwą i opisem marki." : "(1) FAQ i how-to pod zapytania z niskim SOV. (2) Schema markup (Organization, FAQPage). (3) " + (allComps.length > 0 && compCounts[allComps[0]] > totalM ? "Analiza gap vs " + allComps[0] + " — stwórz odpowiedzi na te same zapytania." : "Monitoring i optymalizacja wzmianek na bieżąco.")),
          ].filter(Boolean).join("\n");

          const commentText = editableComment !== null ? editableComment : autoCommentText;

          return (
          <div>
            <STitle>Raport statyczny</STitle>

            {/* Editable comment */}
            <Card style={{ marginBottom: 20, border: "1px solid " + S.coral + "33" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <CLabel>✏️ Komentarz analityczny — edytuj przed wygenerowaniem</CLabel>
                {editableComment !== null && (
                  <button onClick={() => setEditableComment(null)}
                    style={{ fontSize: 11, color: S.muted, background: "transparent", border: "1px solid " + S.border, borderRadius: 6, padding: "3px 10px", cursor: "pointer" }}>
                    ↺ Przywróć auto
                  </button>
                )}
              </div>
              <textarea
                value={commentText}
                onChange={e => setEditableComment(e.target.value)}
                style={{ width: "100%", boxSizing: "border-box", background: S.navy1, border: "1px solid " + S.border, borderRadius: 8, padding: "12px 14px", color: S.text, fontSize: 12, lineHeight: 1.7, outline: "none", resize: "vertical", minHeight: 220, fontFamily: "inherit" }}
              />
              <div style={{ fontSize: 10, color: S.muted, marginTop: 6 }}>Tekst pojawi się w sekcji komentarza analitycznego w raporcie HTML. Każda linia = osobny akapit.</div>
            </Card>

            {/* Top queries */}
            {(topBrandKws.length > 0 || topGapKws.length > 0) && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
                {topBrandKws.length > 0 && (
                  <Card style={{ border: "1px solid " + S.green + "33" }}>
                    <CLabel>🎯 Top zapytania z wzmianką marki</CLabel>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {topBrandKws.map(([kw, vol], i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", background: S.navy1, borderRadius: 6 }}>
                          <span style={{ fontSize: 12, color: S.text, flex: 1, marginRight: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{kw}</span>
                          {vol > 0 && <span style={{ fontSize: 10, color: S.muted, fontFamily: "monospace", flexShrink: 0 }}>{vol.toLocaleString("pl-PL")}</span>}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
                {topGapKws.length > 0 && (
                  <Card style={{ border: "1px solid " + S.coral + "33" }}>
                    <CLabel>⚠️ Luki — konkurenci wymieniani, marka nie</CLabel>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {topGapKws.map(([kw, {vol, comps}], i) => (
                        <div key={i} style={{ padding: "6px 10px", background: S.navy1, borderRadius: 6 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                            <span style={{ fontSize: 12, color: S.text, flex: 1, marginRight: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{kw}</span>
                            {vol > 0 && <span style={{ fontSize: 10, color: S.muted, fontFamily: "monospace", flexShrink: 0 }}>{vol.toLocaleString("pl-PL")}</span>}
                          </div>
                          <div style={{ fontSize: 10, color: S.coral }}>AI wymienia: {comps.join(", ")}</div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            )}

            <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
              <button onClick={openReport} style={{ padding: "12px 24px", background: S.green + "18", border: "1px solid " + S.green + "55", borderRadius: 10, color: S.green, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>🔍 Otwórz podgląd</button>
              <button onClick={downloadReport} style={{ padding: "12px 24px", background: S.sky + "18", border: "1px solid " + S.sky + "55", borderRadius: 10, color: S.sky, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>⬇ Pobierz .html</button>
            </div>

            <Card>
              <CLabel>Podgląd KPI</CLabel>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                {[{ l: "AI SOV", v: fmtPctSimple(avgSOV), c: S.green }, { l: "Mentions", v: fmtPct(visM, totalQ), c: S.sky }, { l: "Citations", v: fmtPct(visC, totalQ), c: S.purple }, { l: "Zapytań", v: totalQ, c: S.gold }].map((k, i) => (
                  <div key={i} style={{ textAlign: "center", padding: "12px", background: S.navy1, borderRadius: 8, border: "1px solid " + k.c + "22" }}>
                    <div style={{ fontSize: 9, color: S.muted, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>{k.l}</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: k.c }}>{k.v}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
          );
        })()}

        {/* PROMPT */}
        {tab === "prompt" && (
          <div>
            <STitle>Gotowy Prompt</STitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Klient", value: brand.name || "—", color: S.green },
                { label: "URL", value: brand.url || "—", color: S.sky },
                { label: "Konkurenci (auto)", value: allComps.slice(0, 3).join(", ") || "—", color: S.coral },
              ].map((x, i) => (
                <div key={i} style={{ background: S.navy2, border: "1px solid " + x.color + "1a", borderRadius: 10, padding: "13px 15px" }}>
                  <div style={{ fontSize: 9, color: S.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 700 }}>{x.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: x.color, wordBreak: "break-word" }}>{x.value}</div>
                </div>
              ))}
            </div>
            <div style={{ position: "relative" }}>
              <pre style={{ background: S.navy1, border: "1px solid " + S.border, borderRadius: 12, padding: "22px 24px", fontSize: 12, lineHeight: 1.85, color: "#3a6080", overflow: "auto", maxHeight: 460, whiteSpace: "pre-wrap", fontFamily: "monospace" }}>{genPrompt()}</pre>
              <button onClick={() => { navigator.clipboard.writeText(genPrompt()); setPromptCopied(true); setTimeout(() => setPromptCopied(false), 2000); }}
                style={{ position: "absolute", top: 14, right: 14, background: promptCopied ? S.green + "22" : S.navy3, border: "1px solid " + (promptCopied ? S.green : S.border), borderRadius: 8, padding: "8px 18px", color: promptCopied ? S.green : S.muted, fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all .2s" }}>
                {promptCopied ? "✓ Skopiowano!" : "⎘ Kopiuj"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

/* ── Helpers ───────────────────────────────────────────────────────────────── */
const STitle = ({ children }) => (
  <div style={{ marginBottom: 22 }}>
    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: S.text }}>{children}</h2>
    <div style={{ width: 34, height: 2, background: "linear-gradient(90deg," + S.green + ",transparent)", marginTop: 7 }} />
  </div>
);

const Inp = ({ label, value, set, ph, span2 }) => {
  const [f, setF] = useState(false);
  return (
    <div style={span2 ? { gridColumn: "1/-1" } : {}}>
      <label style={{ display: "block", fontSize: 9, color: S.muted, marginBottom: 5, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase" }}>{label}</label>
      <input value={value} onChange={e => set(e.target.value)} placeholder={ph}
        onFocus={() => setF(true)} onBlur={() => setF(false)}
        style={{ width: "100%", boxSizing: "border-box", background: S.navy2, border: "1px solid " + (f ? S.green + "66" : S.border), borderRadius: 8, padding: "10px 13px", color: S.text, fontSize: 13, outline: "none", transition: "border .15s" }} />
    </div>
  );
};

const Card = ({ children, style }) => (
  <div style={{ background: S.navy2, border: "1px solid " + S.border, borderRadius: 12, padding: "18px 20px", ...style }}>{children}</div>
);

const CLabel = ({ children }) => (
  <div style={{ fontSize: 9, color: S.muted, marginBottom: 12, fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase" }}>{children}</div>
);

const Ins = ({ color, i, t }) => (
  <div style={{ display: "flex", gap: 10, padding: "10px 14px", background: color + "0b", border: "1px solid " + color + "22", borderRadius: 8 }}>
    <span style={{ color, fontWeight: 900, fontSize: 14, flexShrink: 0 }}>{i}</span>
    <span style={{ fontSize: 12, color: S.muted, lineHeight: 1.55 }}>{t}</span>
  </div>
);

const Btn = ({ children, onClick, disabled, muted, style }) => (
  <button onClick={onClick} disabled={disabled}
    style={{ marginTop: 18, padding: "11px 26px", background: disabled || muted ? "transparent" : S.green + "18", border: "1px solid " + (disabled ? S.border : muted ? S.muted + "44" : S.green + "55"), borderRadius: 10, color: disabled ? S.border : muted ? S.muted : S.green, fontSize: 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", letterSpacing: "0.2px", transition: "all .15s", ...style }}>
    {children}
  </button>
);
