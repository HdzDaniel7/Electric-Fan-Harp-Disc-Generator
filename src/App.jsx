import { useState, useMemo, useRef, useEffect } from "react";
import { NOTE_NAMES, NOTE_ES, NOTE_OPTIONS, noteFreq, noteLabel, fmt, buildSVG, buildPrintableSVG, printableSize, findRpmCandidates } from "./lib/geometry";
import { presetDoMayor, presetJusta, presetPenta, presetCromatica } from "./lib/presets";
import { SCALES, generateScale } from "./lib/scales";

/* ================= materiales ================= */
const MATERIALS = {
  mdf3: { label: "MDF 3 mm — corte láser", output: "laser", minArc: 1.5, tip: "Kerf típico 0,15–0,20 mm. Corta primero los interiores y el contorno al final. Ventila bien: el MDF genera humo denso." },
  acr3: { label: "Acrílico 3 mm — corte láser", output: "laser", minArc: 1.2, tip: "Deja el film protector puesto al cortar. El acrílico colado (cast) da bordes más limpios que el extruido. Kerf ~0,10–0,15 mm." },
  acr5: { label: "Acrílico 5 mm — corte láser", output: "laser", minArc: 1.5, tip: "Más rígido pero más pesado: revisa que tu motor lo mueva sin vibrar. Baja la velocidad de corte o haz 2 pasadas." },
  papel: { label: "Papel / cartulina — imprimir", output: "print", minArc: 2.0, tip: "Imprime al 100 % (sin «ajustar a página»), pega sobre un disco rígido y usa el sensor reflectivo (luz y sensor del mismo lado)." },
  otro: { label: "Otro material", output: "laser", minArc: 1.5, tip: "Ajusta el ancho mínimo de ranura según lo que tu máquina resuelva bien." },
};
const STROKE_COLORS = [
  { v: "#000000", label: "Negro" },
  { v: "#FF0000", label: "Rojo (capa de corte)" },
  { v: "#0000FF", label: "Azul" },
];

/* ================= persistencia ================= */
const STORAGE_KEY = "tonewheel-config-v1";
const defaultDisc = { D: 150, centerHole: 5, mountN: 3, mountDia: 3, mountR: 12, outerMargin: 5, ringGap: 2, innerMin: 22, autoLayout: true };
const defaultG = { rpm: 654, a4: 440, material: "mdf3", output: "laser", stroke: "#000000", labels: true, minArc: 1.5, spin: false, preset: "DoMayor" };
function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.disc || !parsed.rings || !parsed.g) return null;
    return parsed;
  } catch {
    return null;
  }
}

/* ================= componente ================= */
export default function App() {
  const [disc, setDisc] = useState(() => loadSaved()?.disc ?? defaultDisc);
  const [rings, setRings] = useState(() => loadSaved()?.rings ?? presetDoMayor());
  const [g, setG] = useState(() => loadSaved()?.g ?? defaultG);
  const fileRef = useRef(null);
  const [rpmCandidates, setRpmCandidates] = useState(null);

  const searchRpm = () => setRpmCandidates(findRpmCandidates({ rings, a4: g.a4 }));
  const useRpmCandidate = (rpm) => {
    setG({ ...g, rpm });
    setRpmCandidates(null);
  };

  const [bulkDuty, setBulkDuty] = useState(false);
  const setAllDuty = (v) => setRings(rings.map((r) => ({ ...r, duty: v })));

  const [scaleRoot, setScaleRoot] = useState("C");
  const [scaleType, setScaleType] = useState("mayor");
  const [scaleOctave, setScaleOctave] = useState(4);
  const applyScale = () => {
    setRings(generateScale(scaleRoot, scaleOctave, scaleType));
    setG({ ...g, preset: `${scaleType}_${scaleRoot}${scaleOctave}` });
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ disc, rings, g }));
  }, [disc, rings, g]);

  const resetDefaults = () => {
    if (!window.confirm("¿Restablecer todos los valores a la configuración de fábrica? Se perderán los cambios actuales.")) return;
    localStorage.removeItem(STORAGE_KEY);
    setDisc(defaultDisc);
    setRings(presetDoMayor());
    setG(defaultG);
  };

  const setMaterial = (m) => {
    const mat = MATERIALS[m];
    setG({ ...g, material: m, output: mat.output, minArc: mat.minArc });
  };

  /* ---- filas calculadas ---- */
  const rows = useMemo(() => {
    const rMax = disc.D / 2 - disc.outerMargin;
    const n = rings.length;
    const span = rMax - disc.innerMin - disc.ringGap * (n - 1);
    const wAuto = n > 0 ? span / n : 0;
    return rings.map((ring, i) => {
      const r0 = disc.autoLayout ? disc.innerMin + i * (wAuto + disc.ringGap) : ring.r0 ?? disc.innerMin;
      const w = disc.autoLayout ? wAuto : ring.w ?? 6;
      const r1 = r0 + w;
      let N, freq, cents = null, name;
      if (ring.mode === "note") {
        const fT = noteFreq(ring.note, g.a4);
        N = Math.max(1, Math.round((fT * 60) / g.rpm));
        freq = (N * g.rpm) / 60;
        cents = 1200 * Math.log2(freq / fT);
        name = noteLabel(ring.note);
      } else {
        N = Math.max(1, Math.round(ring.N || 1));
        freq = (N * g.rpm) / 60;
        name = `N${N}`;
      }
      const rM = (r0 + r1) / 2;
      const openLen = (ring.duty / 100) * ((2 * Math.PI * rM) / N);
      const closedLen = (1 - ring.duty / 100) * ((2 * Math.PI * rM) / N);
      const warns = [];
      if (w <= 1) warns.push("no cabe: reduce anillos o el radio interior mínimo");
      if (openLen < g.minArc) warns.push(`abertura ${fmt(openLen, 2)} mm < mínimo ${g.minArc} mm`);
      if (closedLen < g.minArc) warns.push(`pared ${fmt(closedLen, 2)} mm < mínimo ${g.minArc} mm`);
      if (r1 > rMax + 0.01) warns.push("se sale del disco");
      return { ...ring, i, r0, r1, w, rM, N, freq, cents, name, openLen, warns, ok: w > 1 && r1 <= rMax + 0.01 };
    });
  }, [rings, disc, g.rpm, g.a4, g.minArc]);

  const svg = useMemo(
    () => buildSVG({ disc, rows, output: g.output, stroke: g.stroke, labels: g.labels }),
    [disc, rows, g.output, g.stroke, g.labels, g.rpm]
  );
  const svgExport = useMemo(
    () => buildSVG({ disc, rows, output: g.output, stroke: g.stroke, labels: false }),
    [disc, rows, g.output, g.stroke, g.rpm]
  );
  const svgPrintable = useMemo(
    () => buildPrintableSVG({ disc, rows, output: g.output, stroke: g.stroke, labels: false }),
    [disc, rows, g.output, g.stroke, g.rpm]
  );

  /* ---- exportación ---- */
  const dutyLabel = rings.every((r) => r.duty === rings[0]?.duty) ? `duty${rings[0]?.duty ?? 50}` : "dutyMix";
  const baseName = `disco_${disc.D}mm_${g.preset || "custom"}_${g.rpm}rpm_${dutyLabel}`;

  function download(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  const dlSVG = () => download(new Blob([svgExport], { type: "image/svg+xml" }), `${baseName}.svg`);
  const dlJSON = () => download(new Blob([JSON.stringify({ disc, rings, g }, null, 2)], { type: "application/json" }), `${baseName}.json`);
  const dlPNG = () => {
    const { W, H } = printableSize(disc.D);
    const pxW = Math.round((W / 25.4) * 300);
    const pxH = Math.round((H / 25.4) * 300);
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svgPrintable], { type: "image/svg+xml" }));
    img.onload = () => {
      const cv = document.createElement("canvas");
      cv.width = pxW; cv.height = pxH;
      const ctx = cv.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, pxW, pxH);
      ctx.drawImage(img, 0, 0, pxW, pxH);
      cv.toBlob((b) => download(b, `${baseName}_300dpi.png`), "image/png");
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };
  const dlPDF = () => {
    const { W, H } = printableSize(disc.D);
    const w = window.open("", "_blank");
    if (!w) { alert("Permite ventanas emergentes para generar el PDF."); return; }
    w.document.write(`<!doctype html><html><head><title>${baseName}</title><style>@page{size:${W + 20}mm ${H + 20}mm;margin:10mm}body{margin:0}</style></head><body>${svgPrintable}<scr` + `ipt>window.onload=()=>setTimeout(()=>window.print(),300)</scr` + `ipt></body></html>`);
    w.document.close();
  };
  const importJSON = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const j = JSON.parse(rd.result);
        if (j.disc) setDisc(j.disc);
        if (j.rings) setRings(j.rings);
        if (j.g) setG(j.g);
      } catch { alert("El archivo no es una configuración válida."); }
    };
    rd.readAsText(f);
    e.target.value = "";
  };

  /* ---- edición de anillos ---- */
  const upRing = (id, patch) => setRings(rings.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const addRing = () => setRings([...rings, { id: Date.now(), mode: "note", note: "C4", N: 48, duty: 50, shape: "arc" }]);
  const delRing = (id) => setRings(rings.filter((r) => r.id !== id));
  const applyPreset = (name) => {
    if (name === "DoMayor") setRings(presetDoMayor());
    if (name === "DoMayorJusta") setRings(presetJusta(g.rpm));
    if (name === "Pentatonica") setRings(presetPenta());
    if (name === "Cromatica12") setRings(presetCromatica());
    setG({ ...g, preset: name });
  };

  const spinSec = g.rpm > 0 ? (60 / g.rpm) * 20 : 10; // vista a 1/20 de la velocidad real
  const num = (v) => (isNaN(parseFloat(v)) ? 0 : parseFloat(v));

  return (
    <div className="app">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..800&family=JetBrains+Mono:wght@400;600&display=swap');
        :root{--bg:#12151b;--panel:#1a1f28;--line:#2a3140;--ink:#e8eaee;--dim:#8b94a5;--amber:#ffb454;--red:#ff6b6b;--ok:#7dd3a0;}
        *{box-sizing:border-box}
        .app{min-height:100vh;background:var(--bg);color:var(--ink);font-family:'Archivo',system-ui,sans-serif;padding:14px;}
        header{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:14px;border-bottom:1px solid var(--line);padding-bottom:10px}
        h1{font-size:20px;margin:0;font-weight:800;letter-spacing:.02em}
        h1 span{color:var(--amber)}
        .sub{color:var(--dim);font-size:12.5px}
        .grid{display:grid;grid-template-columns:minmax(330px,418px) 1fr;gap:14px}
        @media(max-width:860px){.grid{grid-template-columns:1fr}}
        .panel{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px;margin-bottom:12px}
        .panel h2{font-size:11px;text-transform:uppercase;letter-spacing:.14em;color:var(--amber);margin:0 0 10px}
        label{display:block;font-size:12px;color:var(--dim);margin-bottom:3px}
        .row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px}
        .row>div{flex:1;min-width:90px}
        input,select,button{font-family:inherit;font-size:13px}
        input[type=number],select{width:100%;background:#10131a;border:1px solid var(--line);color:var(--ink);border-radius:6px;padding:6px 8px}
        input[type=range]{width:100%;accent-color:var(--amber)}
        input[type=range]:disabled{opacity:.4;cursor:not-allowed}
        .mono{font-family:'JetBrains Mono',monospace}
        button{background:#242b38;border:1px solid var(--line);color:var(--ink);border-radius:7px;padding:7px 11px;cursor:pointer}
        button:hover{border-color:var(--amber)}
        button.primary{background:var(--amber);color:#1a1206;font-weight:700;border-color:var(--amber)}
        button.small{padding:4px 8px;font-size:12px}
        .ring{border:1px solid var(--line);border-radius:8px;padding:9px;margin-bottom:8px;background:#151a22}
        .ring.bad{border-color:var(--red)}
        .ringhead{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
        .ringhead b{font-size:13px}
        .del{color:var(--red);background:none;border:none;font-size:16px;line-height:1;padding:2px 6px}
        .previewwrap{display:flex;justify-content:center;padding:8px}
        .disc{width:min(100%,880px);aspect-ratio:1;filter:drop-shadow(0 4px 18px rgba(0,0,0,.5))}
        .disc svg{width:100%;height:100%;background:${g.output === "print" ? "#e9e9e9" : g.material.startsWith("acr") ? "#bfe3ea" : "#d9c6a0"};border-radius:8px}
        .spin svg{animation:rot ${spinSec}s linear infinite;transform-origin:50% 50%}
        @keyframes rot{to{transform:rotate(360deg)}}
        @media(prefers-reduced-motion:reduce){.spin svg{animation:none}}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th{color:var(--dim);text-align:left;font-weight:600;padding:5px 6px;border-bottom:1px solid var(--line);white-space:nowrap}
        td{padding:5px 6px;border-bottom:1px solid #202634;white-space:nowrap}
        tr.bad td{color:var(--red)}
        .warnbox{border:1px solid var(--red);color:var(--red);border-radius:8px;padding:8px 10px;font-size:12.5px;margin-top:8px}
        .tip{font-size:12px;color:var(--dim);margin-top:6px;line-height:1.45}
        .check{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--ink)}
        .exports{display:flex;gap:8px;flex-wrap:wrap}
        .cents-ok{color:var(--ok)} .cents-bad{color:var(--red)}
        .tablewrap{overflow-x:auto}
      `}</style>

      <header>
        <h1>Generador de discos de tonos <span>ópticos</span></h1>
        <div className="sub mono">f = N × rpm / 60 · geometría en mm reales</div>
      </header>

      <div className="grid">
        {/* ============ CONTROLES ============ */}
        <div>
          <div className="panel">
            <h2>Material y salida</h2>
            <div className="row"><div>
              <label>Material</label>
              <select value={g.material} onChange={(e) => setMaterial(e.target.value)}>
                {Object.entries(MATERIALS).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
              </select>
            </div></div>
            <div className="row">
              <div>
                <label>Modo de patrón</label>
                <select value={g.output} onChange={(e) => setG({ ...g, output: e.target.value })}>
                  <option value="laser">Transmisivo — vectores de corte</option>
                  <option value="print">Reflectivo — relleno negro (imprimir)</option>
                </select>
              </div>
              {g.output === "laser" && (
                <div>
                  <label>Color del trazo de corte</label>
                  <select value={g.stroke} onChange={(e) => setG({ ...g, stroke: e.target.value })}>
                    {STROKE_COLORS.map((c) => <option key={c.v} value={c.v}>{c.label}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="tip">{MATERIALS[g.material].tip}</div>
          </div>

          <div className="panel">
            <h2>Disco</h2>
            <div className="row">
              <div><label>Diámetro exterior (mm)</label><input type="number" min="40" max="600" value={disc.D} onChange={(e) => setDisc({ ...disc, D: num(e.target.value) })} /></div>
              <div><label>Agujero del eje (mm)</label><input type="number" step="0.1" value={disc.centerHole} onChange={(e) => setDisc({ ...disc, centerHole: num(e.target.value) })} /></div>
              <div><label>Margen exterior (mm)</label><input type="number" step="0.5" value={disc.outerMargin} onChange={(e) => setDisc({ ...disc, outerMargin: num(e.target.value) })} /></div>
            </div>
            <div className="row">
              <div><label>Agujeros de montaje (0–6)</label><input type="number" min="0" max="6" value={disc.mountN} onChange={(e) => setDisc({ ...disc, mountN: Math.max(0, Math.min(6, Math.round(num(e.target.value)))) })} /></div>
              <div><label>Ø montaje (mm)</label><input type="number" step="0.1" value={disc.mountDia} onChange={(e) => setDisc({ ...disc, mountDia: num(e.target.value) })} /></div>
              <div><label>Radio de montaje (mm)</label><input type="number" step="0.5" value={disc.mountR} onChange={(e) => setDisc({ ...disc, mountR: num(e.target.value) })} /></div>
            </div>
            <div className="row">
              <div><label>Radio interior mínimo (mm)</label><input type="number" step="0.5" value={disc.innerMin} onChange={(e) => setDisc({ ...disc, innerMin: num(e.target.value) })} /></div>
              <div><label>Separación entre anillos (mm)</label><input type="number" step="0.5" value={disc.ringGap} onChange={(e) => setDisc({ ...disc, ringGap: num(e.target.value) })} /></div>
            </div>
            <label className="check"><input type="checkbox" checked={disc.autoLayout} onChange={(e) => setDisc({ ...disc, autoLayout: e.target.checked })} /> Distribuir anillos automáticamente</label>
          </div>

          <div className="panel">
            <h2>Global</h2>
            <div className="row">
              <div style={{ flex: 2 }}>
                <label>rpm de trabajo: <b className="mono" style={{ color: "var(--amber)" }}>{g.rpm}</b></label>
                <input type="range" min="200" max="4000" value={g.rpm} onChange={(e) => setG({ ...g, rpm: num(e.target.value) })} />
              </div>
              <div><label>rpm exacto</label><input type="number" min="1" value={g.rpm} onChange={(e) => setG({ ...g, rpm: Math.max(1, num(e.target.value)) })} /></div>
            </div>
            <div className="row">
              <div><label>A4 de referencia (Hz)</label><input type="number" step="0.1" value={g.a4} onChange={(e) => setG({ ...g, a4: num(e.target.value) })} /></div>
              <div><label>Abertura mínima (mm de arco)</label><input type="number" step="0.1" value={g.minArc} onChange={(e) => setG({ ...g, minArc: num(e.target.value) })} /></div>
            </div>
            <button className="small" onClick={() => (rpmCandidates ? setRpmCandidates(null) : searchRpm())}>
              {rpmCandidates ? "Ocultar candidatos de rpm" : "Buscar mejor rpm (menor error en cents)"}
            </button>
            {rpmCandidates && (
              rpmCandidates.length === 0 ? (
                <div className="tip">Ningún anillo está en modo "Nota musical" — no hay nada que optimizar. (El modo "N manual" no depende del rpm para su afinación.) <button className="small" onClick={() => setRpmCandidates(null)}>Cerrar</button></div>
              ) : (
                <div className="tablewrap" style={{ marginTop: 8 }}>
                  <table className="mono">
                    <thead><tr><th>rpm</th><th>Error máx (cents)</th><th>Error prom (cents)</th><th></th></tr></thead>
                    <tbody>
                      {rpmCandidates.map((c) => (
                        <tr key={c.rpm} className={c.rpm === g.rpm ? "" : undefined}>
                          <td>{c.rpm}</td>
                          <td className={Math.abs(c.maxErr) < 5 ? "cents-ok" : "cents-bad"}>{fmt(c.maxErr, 1)}</td>
                          <td>{fmt(c.avgErr, 1)}</td>
                          <td><button className="small" onClick={() => useRpmCandidate(c.rpm)}>Usar</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button className="small" style={{ marginTop: 6 }} onClick={() => setRpmCandidates(null)}>Cerrar sin cambiar el rpm</button>
                </div>
              )
            )}
            <label>Presets de escala</label>
            <div className="exports" style={{ marginTop: 4 }}>
              <button className="small" onClick={() => applyPreset("DoMayor")}>Do mayor</button>
              <button className="small" onClick={() => applyPreset("DoMayorJusta")}>Do mayor justa</button>
              <button className="small" onClick={() => applyPreset("Pentatonica")}>Pentatónica</button>
              <button className="small" onClick={() => applyPreset("Cromatica12")}>Cromática 12-TET</button>
            </div>
          </div>

          <div className="panel">
            <h2>Selector de escala</h2>
            <div className="row">
              <div>
                <label>Tónica</label>
                <select value={scaleRoot} onChange={(e) => setScaleRoot(e.target.value)}>
                  {NOTE_NAMES.map((n) => <option key={n} value={n}>{NOTE_ES[n]}</option>)}
                </select>
              </div>
              <div>
                <label>Escala</label>
                <select value={scaleType} onChange={(e) => setScaleType(e.target.value)}>
                  {Object.entries(SCALES).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label>Octava base</label>
                <input type="number" min="2" max="6" value={scaleOctave} onChange={(e) => setScaleOctave(Math.max(2, Math.min(6, Math.round(num(e.target.value)))))} />
              </div>
            </div>
            <button className="primary" onClick={applyScale}>Generar escala ({SCALES[scaleType].intervals.length} anillos, modo Nota musical)</button>
            <div className="tip">Reemplaza todos los anillos por la escala elegida, en modo "Nota musical" — el rpm los reajusta automáticamente y podrás usar "Buscar mejor rpm" arriba para minimizar el error.</div>
          </div>

          <div className="panel">
            <h2>Anillos ({rings.length})</h2>
            <label className="check"><input type="checkbox" checked={bulkDuty} onChange={(e) => setBulkDuty(e.target.checked)} /> Ciclo de trabajo (duty) para todos los anillos a la vez</label>
            {bulkDuty && (
              <div className="row" style={{ marginTop: 6, marginBottom: 10 }}>
                <div style={{ flex: 2 }}>
                  <label>Duty para todos: <b className="mono">{rings[0]?.duty ?? 50}%</b></label>
                  <input type="range" min="10" max="90" value={rings[0]?.duty ?? 50} onChange={(e) => setAllDuty(num(e.target.value))} />
                </div>
              </div>
            )}
            {rows.map((r) => (
              <div key={r.id} className={`ring ${r.warns.length ? "bad" : ""}`}>
                <div className="ringhead">
                  <b>Anillo {r.i + 1} — <span className="mono" style={{ color: "var(--amber)" }}>{r.name}</span> · {fmt(r.freq)} Hz</b>
                  <button className="del" title="Quitar anillo" onClick={() => delRing(r.id)}>✕</button>
                </div>
                <div className="row">
                  <div>
                    <label>Modo</label>
                    <select value={r.mode} onChange={(e) => upRing(r.id, { mode: e.target.value })}>
                      <option value="note">Nota musical</option>
                      <option value="manual">N manual</option>
                    </select>
                  </div>
                  {r.mode === "note" ? (
                    <div>
                      <label>Nota</label>
                      <select value={r.note} onChange={(e) => upRing(r.id, { note: e.target.value })}>
                        {NOTE_OPTIONS.map((n) => <option key={n} value={n}>{noteLabel(n)} ({n})</option>)}
                      </select>
                    </div>
                  ) : (
                    <div><label>N (aberturas)</label><input type="number" min="1" value={r.N} onChange={(e) => upRing(r.id, { N: Math.max(1, Math.round(num(e.target.value))) })} /></div>
                  )}
                  <div>
                    <label>Forma</label>
                    <select value={r.shape} onChange={(e) => upRing(r.id, { shape: e.target.value })}>
                      <option value="arc">Ranura de arco</option>
                      <option value="circle">Círculos</option>
                    </select>
                  </div>
                </div>
                <div className="row">
                  <div style={{ flex: 2 }}>
                    <label>Duty: <b className="mono">{r.duty}%</b>{r.shape === "circle" && <span style={{ color: "var(--amber)" }}> — los círculos no mantienen el duty exacto</span>}{bulkDuty && <span style={{ color: "var(--dim)" }}> — controlado arriba (todos a la vez)</span>}</label>
                    <input type="range" min="10" max="90" value={r.duty} disabled={bulkDuty} onChange={(e) => upRing(r.id, { duty: num(e.target.value) })} />
                  </div>
                  {!disc.autoLayout && (
                    <>
                      <div><label>Radio interior (mm)</label><input type="number" step="0.5" value={r.r0} onChange={(e) => upRing(r.id, { r0: num(e.target.value) })} /></div>
                      <div><label>Ancho (mm)</label><input type="number" step="0.5" value={r.w} onChange={(e) => upRing(r.id, { w: num(e.target.value) })} /></div>
                    </>
                  )}
                </div>
                {r.mode === "note" && (
                  <div className="tip mono">N = {r.N} · error {r.cents >= 0 ? "+" : ""}{fmt(r.cents, 1)} cents a {g.rpm} rpm</div>
                )}
                {r.warns.length > 0 && <div className="warnbox">⚠ {r.warns.join(" · ")} — sube este anillo a mayor radio, baja N o aumenta el duty.</div>}
              </div>
            ))}
            <button onClick={addRing}>+ Agregar anillo</button>
          </div>
        </div>

        {/* ============ PREVIEW + TABLA + EXPORT ============ */}
        <div>
          <div className="panel">
            <h2>Vista previa — Ø {disc.D} mm a {g.rpm} rpm</h2>
            <div className="row" style={{ marginBottom: 4 }}>
              <label className="check"><input type="checkbox" checked={g.labels} onChange={(e) => setG({ ...g, labels: e.target.checked })} /> Etiquetas (solo vista previa)</label>
              <label className="check"><input type="checkbox" checked={g.spin} onChange={(e) => setG({ ...g, spin: e.target.checked })} /> Girar (a 1/20 de la velocidad real)</label>
            </div>
            <div className="previewwrap">
              <div className={`disc ${g.spin ? "spin" : ""}`} dangerouslySetInnerHTML={{ __html: svg }} />
            </div>
          </div>

          <div className="panel">
            <h2>Resumen</h2>
            <div className="tablewrap">
              <table className="mono">
                <thead><tr><th>#</th><th>Nota</th><th>N</th><th>f real (Hz)</th><th>Error (cents)</th><th>Duty</th><th>r₀–r₁ (mm)</th><th>Abertura (mm)</th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className={r.warns.length ? "bad" : ""}>
                      <td>{r.i + 1}</td>
                      <td>{r.name}</td>
                      <td>{r.N}</td>
                      <td>{fmt(r.freq, 2)}</td>
                      <td className={r.cents == null ? "" : Math.abs(r.cents) < 5 ? "cents-ok" : "cents-bad"}>{r.cents == null ? "—" : `${r.cents >= 0 ? "+" : ""}${fmt(r.cents, 1)}`}</td>
                      <td>{r.duty}%</td>
                      <td>{fmt(r.r0)}–{fmt(r.r1)}</td>
                      <td>{fmt(r.openLen, 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel">
            <h2>Exportar — <span className="mono" style={{ textTransform: "none", color: "var(--dim)" }}>{baseName}</span></h2>
            <div className="exports">
              <button className="primary" onClick={dlSVG}>SVG (escala real, láser/vector)</button>
              <button onClick={dlPNG}>PNG 300 dpi (imprimir)</button>
              <button onClick={dlPDF}>PDF (imprimir a escala)</button>
              <button onClick={dlJSON}>Guardar configuración (JSON)</button>
              <button onClick={() => fileRef.current?.click()}>Cargar configuración</button>
              <input ref={fileRef} type="file" accept="application/json" style={{ display: "none" }} onChange={importJSON} />
              <button onClick={resetDefaults}>Restablecer valores de fábrica</button>
            </div>
            <div className="tip">
              Los archivos exportados nunca incluyen etiquetas. El SVG usa unidades físicas en mm (viewBox 1:1) con trazo de 0,1 mm en modo láser — impórtalo directo en LightBurn/RDWorks, o conviértelo a DXF R14 desde Inkscape si tu máquina lo pide. El PNG y el PDF incluyen una regla de calibración de 10 cm debajo del disco: mídela con una regla física después de imprimir — si no da exactamente 100 mm, tu impresor está escalando la página; desactiva "ajustar a página" y vuelve a imprimir al 100 %.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
