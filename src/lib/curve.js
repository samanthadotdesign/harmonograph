/* The harmonograph itself.
 *
 *   x(t) = e^(-λt) [ sin(fx·t + φ) + r·sin((fx + δ)·t) ]
 *   y(t) = e^(-λt) [ sin(fy·t + φ) + r·sin((fy − δ)·t + π/3) ]
 *   z(t) = d · e^(-λt) [ sin(fz·t + φ) + r·sin((fz + 1.7δ)·t + 2π/3) ]
 *
 * δ is derived as sweep / turns, so the figure precesses a fixed fraction of a
 * revolution over the whole run however long that run is. Near 0.5 the passes
 * fan out coherently; past about 1.5 they lap themselves into a tangle.
 */

export function sampler(P) {
  const T = P.turns * Math.PI * 2;
  const phase = P.phase * Math.PI * 2;
  const r = P.mix;
  const k = 1 / (1 + r);
  const lam = (P.decay * 6) / T;
  const det = P.sweep / P.turns;
  const d = P.depth;
  return {
    T,
    at(t, o) {
      const a = Math.exp(-lam * t) * k;
      o[0] = a * (Math.sin(P.fx * t + phase) + r * Math.sin((P.fx + det) * t));
      o[1] = a * (Math.sin(P.fy * t + phase) + r * Math.sin((P.fy - det) * t + 1.0472));
      o[2] = d * a * (Math.sin(P.fz * t + phase) + r * Math.sin((P.fz + det * 1.7) * t + 2.0944));
    },
  };
}

/* Sample count is driven by the curve's own arc length, measured in a cheap
   first pass, so segments land around two screen pixels whatever the
   parameters do. Short figures get 3k points, dense ones up to 140k. */
export function buildCurve(P, screenScale) {
  const S = sampler(P);
  const a = [0, 0, 0];
  const b = [0, 0, 0];
  let len = 0;
  S.at(0, a);
  for (let i = 1; i <= 5000; i++) {
    S.at((S.T * i) / 5000, b);
    len += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    a[0] = b[0];
    a[1] = b[1];
    a[2] = b[2];
  }

  const n = Math.min(140000, Math.max(3000, Math.round((len * screenScale) / 1.8)));
  const pts = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    S.at((S.T * i) / (n - 1), a);
    pts[i * 3] = a[0];
    pts[i * 3 + 1] = a[1];
    pts[i * 3 + 2] = a[2];
  }

  return {
    pts,
    n,
    sx: new Float32Array(n),
    sy: new Float32Array(n),
    sz: new Float32Array(n),
    ax: new Float32Array(n),
    ay: new Float32Array(n),
  };
}
