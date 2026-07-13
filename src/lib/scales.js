import { NOTE_NAMES } from "./geometry";

/* Definiciones genéricas de escala como intervalos en semitonos desde la
   tónica (incluyendo la octava final). Con esto, elegir tónica + escala
   automatiza lo que antes requería un preset fijo por cada combinación. */
export const SCALES = {
  mayor: { label: "Mayor (Jónico)", intervals: [0, 2, 4, 5, 7, 9, 11, 12] },
  menorNatural: { label: "Menor natural (Eólico)", intervals: [0, 2, 3, 5, 7, 8, 10, 12] },
  menorArmonica: { label: "Menor armónica", intervals: [0, 2, 3, 5, 7, 8, 11, 12] },
  menorMelodica: { label: "Menor melódica (ascendente)", intervals: [0, 2, 3, 5, 7, 9, 11, 12] },
  pentatonicaMayor: { label: "Pentatónica mayor", intervals: [0, 2, 4, 7, 9, 12] },
  pentatonicaMenor: { label: "Pentatónica menor", intervals: [0, 3, 5, 7, 10, 12] },
  blues: { label: "Blues", intervals: [0, 3, 5, 6, 7, 10, 12] },
  cromatica: { label: "Cromática (12 semitonos)", intervals: Array.from({ length: 13 }, (_, i) => i) },
};

/* Genera anillos en modo "nota" para la tónica/escala/octava elegidas.
   Todos automáticamente en modo "Nota musical", así el rpm los reajusta
   solos (ver findRpmCandidates en geometry.js) igual que los demás presets. */
export function generateScale(rootName, octave, scaleKey) {
  const scale = SCALES[scaleKey];
  const rootIdx = NOTE_NAMES.indexOf(rootName);
  if (!scale || rootIdx < 0) return [];
  return scale.intervals.map((iv, i) => {
    const abs = rootIdx + iv;
    const note = `${NOTE_NAMES[abs % 12]}${octave + Math.floor(abs / 12)}`;
    return { id: Date.now() + i, mode: "note", note, N: 48, duty: 50, shape: "arc" };
  });
}
