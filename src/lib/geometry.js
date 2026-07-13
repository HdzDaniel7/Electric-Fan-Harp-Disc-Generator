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

/* ================= geometría SVG ================= */
export const rad = (d) => (d * Math.PI) / 180;
export function sectorPath(cx, cy, r0, r1, a0, sweep) {
  const a1 = a0 + sweep;
  const large = sweep > 180 ? 1 : 0;
  const P = (r, a) => `${(cx + r * Math.cos(rad(a))).toFixed(3)} ${(cy + r * Math.sin(rad(a))).toFixed(3)}`;
  return `M ${P(r1, a0)} A ${r1.toFixed(3)} ${r1.toFixed(3)} 0 ${large} 1 ${P(r1, a1)} L ${P(r0, a1)} A ${r0.toFixed(3)} ${r0.toFixed(3)} 0 ${large} 0 ${P(r0, a0)} Z`;
}

export function buildSVG({ disc, rows, output, stroke, labels }) {
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

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${D}mm" height="${D}mm" viewBox="0 0 ${D} ${D}">${inner}</svg>`;
}
