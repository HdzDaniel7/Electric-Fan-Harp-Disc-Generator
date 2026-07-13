/* ================= utilidades musicales ================= */
export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const NOTE_ES = { C: "Do", "C#": "Do#", D: "Re", "D#": "Re#", E: "Mi", F: "Fa", "F#": "Fa#", G: "Sol", "G#": "Sol#", A: "La", "A#": "La#", B: "Si" };
export const NOTE_OPTIONS = [];
for (let oct = 2; oct <= 7; oct++) {
  for (let i = 0; i < 12; i++) {
    if (oct === 7 && i > 0) break; // C2 … C7
    NOTE_OPTIONS.push(`${NOTE_NAMES[i]}${oct}`);
  }
}
export function noteFreq(note, a4) {
  const m = note.match(/^([A-G]#?)(\d)$/);
  if (!m) return 440;
  const semi = (parseInt(m[2]) - 4) * 12 + (NOTE_NAMES.indexOf(m[1]) - 9);
  return a4 * Math.pow(2, semi / 12);
}
export function noteLabel(note) {
  const m = note.match(/^([A-G]#?)(\d)$/);
  return m ? `${NOTE_ES[m[1]]}${m[2]}` : note;
}
export const fmt = (n, d = 1) => (isFinite(n) ? n.toFixed(d) : "—");

/* Busca los rpm (dentro del rango permitido) que minimizan el error en cents
   de los anillos en modo "nota". Para un rpm dado, N ya se redondea al entero
   más cercano por anillo (óptimo local); lo único que puede reducir el error
   entre notas distintas es elegir mejor el rpm compartido. Devuelve los mejores
   candidatos espaciados entre sí para dar opciones realmente distintas. */
export function findRpmCandidates({ rings, a4, rpmMin = 200, rpmMax = 4000, count = 8, minGap = 15 }) {
  const targets = rings.filter((r) => r.mode === "note").map((r) => noteFreq(r.note, a4));
  if (targets.length === 0) return [];
  const scored = [];
  for (let rpm = rpmMin; rpm <= rpmMax; rpm++) {
    let maxErr = 0, sumErr = 0;
    for (const fT of targets) {
      const N = Math.max(1, Math.round((fT * 60) / rpm));
      const cents = Math.abs(1200 * Math.log2((N * rpm) / 60 / fT));
      if (cents > maxErr) maxErr = cents;
      sumErr += cents;
    }
    scored.push({ rpm, maxErr, avgErr: sumErr / targets.length });
  }
  scored.sort((a, b) => a.maxErr - b.maxErr || a.avgErr - b.avgErr);
  const picked = [];
  for (const s of scored) {
    if (picked.every((p) => Math.abs(p.rpm - s.rpm) >= minGap)) {
      picked.push(s);
      if (picked.length >= count) break;
    }
  }
  return picked;
}

/* ================= geometría SVG ================= */
export const rad = (d) => (d * Math.PI) / 180;
export function sectorPath(cx, cy, r0, r1, a0, sweep) {
  const a1 = a0 + sweep;
  const large = sweep > 180 ? 1 : 0;
  const P = (r, a) => `${(cx + r * Math.cos(rad(a))).toFixed(3)} ${(cy + r * Math.sin(rad(a))).toFixed(3)}`;
  return `M ${P(r1, a0)} A ${r1.toFixed(3)} ${r1.toFixed(3)} 0 ${large} 1 ${P(r1, a1)} L ${P(r0, a1)} A ${r0.toFixed(3)} ${r0.toFixed(3)} 0 ${large} 0 ${P(r0, a0)} Z`;
}

function discMarkup({ disc, rows, output, stroke, labels }) {
  const D = disc.D, c = D / 2;
  const sw = 0.1;
  const cut = `fill="none" stroke="${stroke}" stroke-width="${sw}"`;
  let inner = "";

  if (output === "print") {
    inner += `<rect x="0" y="0" width="${D}" height="${D}" fill="#ffffff"/>`;
    inner += `<circle cx="${c}" cy="${c}" r="${c - 0.05}" fill="#000000"/>`;
  }

  // aberturas por anillo
  rows.forEach((r, idx) => {
    if (!r.ok) return;
    const offset = -90 + idx * 7; // desfase visual entre anillos
    let shapes = "";
    if (r.shape === "arc") {
      const step = 360 / r.N;
      const open = (r.duty / 100) * step;
      for (let i = 0; i < r.N; i++) {
        shapes += `<path d="${sectorPath(c, c, r.r0, r.r1, offset + i * step, open)}" ${output === "print" ? 'fill="#ffffff"' : cut}/>`;
      }
    } else {
      const rM = (r.r0 + r.r1) / 2;
      const dCirc = Math.min((r.r1 - r.r0) * 0.85, (r.duty / 100) * ((2 * Math.PI * rM) / r.N));
      for (let i = 0; i < r.N; i++) {
        const a = rad(offset + (i * 360) / r.N);
        shapes += `<circle cx="${(c + rM * Math.cos(a)).toFixed(3)}" cy="${(c + rM * Math.sin(a)).toFixed(3)}" r="${(dCirc / 2).toFixed(3)}" ${output === "print" ? 'fill="#ffffff"' : cut}/>`;
      }
    }
    inner += shapes;
    if (labels) {
      const rM = (r.r0 + r.r1) / 2;
      inner += `<text x="${c}" y="${(c - rM + 1.2).toFixed(2)}" text-anchor="middle" font-size="2.6" font-family="monospace" fill="${output === "print" ? "#e05353" : "#000000"}">${r.name} · N=${r.N} · ${fmt(r.freq)} Hz</text>`;
    }
  });

  // agujero central
  if (output === "print") {
    inner += `<circle cx="${c}" cy="${c}" r="${disc.centerHole / 2}" fill="#ffffff" stroke="#000000" stroke-width="0.2"/>`;
    inner += `<path d="M ${c - 3} ${c} H ${c + 3} M ${c} ${c - 3} V ${c + 3}" stroke="#000000" stroke-width="0.15" fill="none"/>`;
  } else {
    inner += `<circle cx="${c}" cy="${c}" r="${disc.centerHole / 2}" ${cut}/>`;
  }

  // agujeros de montaje
  for (let i = 0; i < disc.mountN; i++) {
    const a = rad(-90 + (i * 360) / Math.max(1, disc.mountN));
    const x = c + disc.mountR * Math.cos(a), y = c + disc.mountR * Math.sin(a);
    inner += output === "print"
      ? `<circle cx="${x.toFixed(3)}" cy="${y.toFixed(3)}" r="${disc.mountDia / 2}" fill="#ffffff" stroke="#000000" stroke-width="0.2"/>`
      : `<circle cx="${x.toFixed(3)}" cy="${y.toFixed(3)}" r="${disc.mountDia / 2}" ${cut}/>`;
  }

  // contorno exterior (corte final)
  if (output === "laser") inner += `<circle cx="${c}" cy="${c}" r="${c - 0.05}" ${cut}/>`;
  else inner += `<circle cx="${c}" cy="${c}" r="${c - 0.05}" fill="none" stroke="#000000" stroke-width="0.2"/>`;

  return inner;
}

export function buildSVG(args) {
  const D = args.disc.D;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${D}mm" height="${D}mm" viewBox="0 0 ${D} ${D}">${discMarkup(args)}</svg>`;
}

/* ================= regla de calibración (impresión/PDF) =================
   Línea de 10 cm con marcas cada cm, para que el usuario mida el resultado
   impreso y confirme que salió a escala real 1:1 (sin "ajustar a página"). */
const RULER_LEN_MM = 100;
const RULER_PAD_MM = 10;
const RULER_STRIP_MM = 24;

function calibrationRulerMarkup(x0, y0) {
  let s = `<g font-family="monospace" fill="#000000" stroke="#000000">`;
  s += `<line x1="${x0}" y1="${y0}" x2="${x0 + RULER_LEN_MM}" y2="${y0}" stroke-width="0.3"/>`;
  for (let mm = 0; mm <= RULER_LEN_MM; mm += 10) {
    const tall = mm % 50 === 0 ? 3 : 2;
    s += `<line x1="${x0 + mm}" y1="${y0}" x2="${x0 + mm}" y2="${y0 - tall}" stroke-width="0.3"/>`;
  }
  s += `<text x="${x0 + RULER_LEN_MM / 2}" y="${y0 + 5.5}" text-anchor="middle" font-size="3.2" stroke="none">10 cm — mide esta línea para verificar la escala real</text>`;
  s += `<text x="${x0 + RULER_LEN_MM / 2}" y="${y0 + 9.5}" text-anchor="middle" font-size="2.6" stroke="none">Si no mide 100 mm exactos, reimprime/exporta al 100% (sin "ajustar a página")</text>`;
  s += `</g>`;
  return s;
}

export function printableSize(D) {
  const W = Math.max(D, RULER_LEN_MM + RULER_PAD_MM * 2);
  const H = D + RULER_STRIP_MM;
  return { W, H };
}

/* SVG compuesto para PNG/PDF: disco + regla de calibración de 10 cm.
   No se usa para el SVG de corte láser (esa exportación debe mantenerse
   exactamente D×D, ver regla 1 de CLAUDE.md). */
export function buildPrintableSVG(args) {
  const D = args.disc.D;
  const { W, H } = printableSize(D);
  const discX = (W - D) / 2;
  const rulerX0 = (W - RULER_LEN_MM) / 2;
  const rulerY = D + 12;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">` +
    `<rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>` +
    `<g transform="translate(${discX},0)">${discMarkup(args)}</g>` +
    calibrationRulerMarkup(rulerX0, rulerY) +
    `</svg>`;
}
