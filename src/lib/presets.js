import { NOTE_NAMES } from "./geometry";

/* ================= presets de escala ================= */
export function presetJusta(rpm) {
  const base = [24, 27, 30, 32, 36, 40, 45, 48];
  return base.map((N, i) => ({ id: Date.now() + i, mode: "manual", note: "C4", N, duty: 50, shape: "arc" }));
}
export function presetPenta() {
  return ["C4", "D4", "E4", "G4", "A4", "C5"].map((note, i) => ({ id: Date.now() + i, mode: "note", note, N: 48, duty: 50, shape: "arc" }));
}
export function presetCromatica() {
  return NOTE_NAMES.map((n, i) => ({ id: Date.now() + i, mode: "note", note: `${n}4`, N: 48, duty: 50, shape: "arc" }));
}
