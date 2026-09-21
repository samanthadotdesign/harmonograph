/* Parameter definitions, log-scale dial mappings, and the sample budget. */

export const LF = 0.1;   // lowest frequency
export const SF = 80;    // frequency span (0.1 → 8)
export const LT = 0.5;   // lowest turns
export const ST = 1200;  // turns span (0.5 → 600)
export const QMAX = 750; // max frequency × turns before the curve outruns its samples

/* Frequency and turns run on log-scaled dials so the low ends, where the most
   interesting figures live, get an even share of the arc. */
export const f2v = (p) => Math.round(LF * Math.pow(SF, p / 1000) * 100) / 100;
export const v2f = (v) => Math.round((1000 * Math.log(Math.max(LF, v) / LF)) / Math.log(SF));
export const t2v = (p) => {
  const v = LT * Math.pow(ST, p / 1000);
  return v < 10 ? Math.round(v * 10) / 10 : Math.round(v);
};
export const v2t = (v) => Math.round((1000 * Math.log(Math.max(LT, v) / LT)) / Math.log(ST));

/* The number of samples needed scales with frequency × turns. Past the budget
   the polyline degenerates into long straight chords, so cap turns instead. */
export const turnsCeiling = (P) =>
  Math.max(2, Math.min(600, QMAX / Math.max(P.fx, P.fy, P.fz)));

export const INITIAL = {
  fx: 0.1, fy: 0.16, fz: 0.12, depth: 0.9,
  sweep: 0.48, turns: 50, decay: 0.05,
  ink: 60, width: 0.8, fade: 1,
  shadows: 0.5, zoom: 1,
  mix: 1, phase: 0.25,
};

export const HOME_CAM = { yaw: 0.62, pitch: 0.34, panX: 0, panY: 0 };

export const SPEC = Object.fromEntries(
  [
    { k: "fx", label: "f x", scale: "f" },
    { k: "fy", label: "f y", scale: "f" },
    { k: "fz", label: "f z", scale: "f" },
    { k: "depth", label: "depth", min: 0, max: 1.2, step: 0.01, dec: 2 },
    { k: "sweep", label: "sweep", min: 0.05, max: 2, step: 0.01, dec: 2 },
    { k: "turns", label: "turns", scale: "t" },
    { k: "decay", label: "decay", min: 0, max: 1, step: 0.01, dec: 2 },
    { k: "ink", label: "ink", min: 1, max: 100, step: 1, dec: 0 },
    { k: "width", label: "width", min: 0.3, max: 2.5, step: 0.1, dec: 1 },
    { k: "fade", label: "fade", min: 0, max: 1, step: 0.01, dec: 2 },
    { k: "shadows", label: "shadows", min: 0, max: 1, step: 0.01, dec: 2 },
    { k: "zoom", label: "zoom", min: 0.5, max: 1.8, step: 0.01, dec: 2 },
  ].map((s) => [s.k, s])
);

export const GROUPS = [
  { title: "Shape", keys: ["fx", "fy", "fz", "depth"] },
  { title: "Motion", keys: ["sweep", "turns", "decay"] },
  { title: "Ink", keys: ["ink", "width", "fade"] },
  { title: "View", keys: ["shadows", "zoom"] },
];

export const DIAL_KEYS = GROUPS.flatMap((g) => g.keys);

export const fmt = (k, v) =>
  k === "turns"
    ? v < 10
      ? v.toFixed(1)
      : String(Math.round(v))
    : v.toFixed(SPEC[k].dec ?? 2);

/* Only accept known numeric keys back out of storage. */
export function sanitise(raw) {
  const out = { ...INITIAL };
  if (!raw || typeof raw !== "object") return out;
  for (const k of Object.keys(INITIAL)) {
    if (typeof raw[k] === "number" && Number.isFinite(raw[k])) out[k] = raw[k];
  }
  const ceil = turnsCeiling(out);
  if (out.turns > ceil) out.turns = t2v(v2t(ceil));
  return out;
}

export const sameDials = (a, b) =>
  !!a && !!b && DIAL_KEYS.every((k) => Math.abs(a[k] - b[k]) < 1e-9);
