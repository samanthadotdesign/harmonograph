import { THEMES } from "./theme.js";

/* Draws one frame: the three coordinate planes, their cast shadows, then the
   curve. Everything is recomputed from the point set each time, which is cheap
   enough that rotating never has to touch the sampler. */

export function render(ctx, { curve, P, cam, W, H, dpr, dragging, theme, panelLift = 0 }) {
  const T = THEMES[theme] ?? THEMES.light;
  const { pts, n, sx, sy, sz, ax, ay } = curve;

  const cy = Math.cos(cam.yaw);
  const sn = Math.sin(cam.yaw);
  const cx = Math.cos(cam.pitch);
  const sm = Math.sin(cam.pitch);
  const S = Math.min(W, H) * 0.4 * P.zoom * 0.58;
  const panScale = Math.min(W, H);
  const ox = W / 2 + (cam.panX ?? 0) * panScale;
  const oy = H / 2 + (cam.panY ?? 0) * panScale - panelLift * H * 0.25;

  const depthOf = (x, y, z) => y * sm + (-x * sn + z * cy) * cx;
  const project = (x, y, z, o) => {
    const xa = x * cy + z * sn;
    const za = -x * sn + z * cy;
    const yb = y * cx - za * sm;
    const zb = y * sm + za * cx;
    const p = 3.4 / (3.4 + zb);
    o[0] = ox + xa * p * S;
    o[1] = oy - yb * p * S;
    o[2] = zb;
    return o;
  };

  /* Each wall sits on whichever face is currently furthest from the camera, so
     the planes stay behind the curve however it is turned. */
  const WL = {
    x: depthOf(-1, 0, 0) >= depthOf(1, 0, 0) ? -1 : 1,
    y: depthOf(0, -1, 0) >= depthOf(0, 1, 0) ? -1 : 1,
    z: depthOf(0, 0, -1) >= depthOf(0, 0, 1) ? -1 : 1,
  };

  const o = [0, 0, 0];
  let zlo = Infinity;
  let zhi = -Infinity;
  for (let i = 0; i < n; i++) {
    project(pts[i * 3], pts[i * 3 + 1], pts[i * 3 + 2], o);
    sx[i] = o[0];
    sy[i] = o[1];
    sz[i] = o[2];
    if (o[2] < zlo) zlo = o[2];
    if (o[2] > zhi) zhi = o[2];
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.fillStyle = T.bg;
  ctx.fillRect(0, 0, W, H);

  const stride = dragging && n > 70000 ? 2 : 1;
  const boost = Math.min(2.2, stride * 0.8 + 0.6);

  /* ------------------------- coordinate planes ------------------------- */

  const quad = (corners, fill) => {
    ctx.beginPath();
    corners.forEach((c, i) => {
      project(c[0], c[1], c[2], o);
      i ? ctx.lineTo(o[0], o[1]) : ctx.moveTo(o[0], o[1]);
    });
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = T.edge;
    ctx.lineWidth = 1;
    ctx.stroke();
  };

  const rule = (edge) => {
    const q = [0, 0, 0];
    ctx.beginPath();
    for (let t = -1; t <= 1.001; t += 0.5) {
      const [s, e] = edge(t);
      project(s[0], s[1], s[2], o);
      ctx.moveTo(o[0], o[1]);
      project(e[0], e[1], e[2], q);
      ctx.lineTo(q[0], q[1]);
    }
    ctx.strokeStyle = T.grid;
    ctx.lineWidth = 1;
    ctx.stroke();
  };

  const wall = (axis) => {
    if (axis === "z") {
      const w = WL.z;
      quad([[-1, -1, w], [1, -1, w], [1, 1, w], [-1, 1, w]], T.walls.z);
      rule((t) => [[t, -1, w], [t, 1, w]]);
      rule((t) => [[-1, t, w], [1, t, w]]);
    } else if (axis === "y") {
      const v = WL.y;
      quad([[-1, v, -1], [1, v, -1], [1, v, 1], [-1, v, 1]], T.walls.y);
      rule((t) => [[t, v, -1], [t, v, 1]]);
      rule((t) => [[-1, v, t], [1, v, t]]);
    } else {
      const u = WL.x;
      quad([[u, -1, -1], [u, 1, -1], [u, 1, 1], [u, -1, 1]], T.walls.x);
      rule((t) => [[u, t, -1], [u, t, 1]]);
      rule((t) => [[u, -1, t], [u, 1, t]]);
    }
  };

  const tag = (x, y, z, text, color) => {
    project(x, y, z, o);
    ctx.font = "500 11.5px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const w = ctx.measureText(text).width;
    ctx.fillStyle = T.bg;
    ctx.fillRect(o[0] - w / 2 - 4, o[1] - 8, w + 8, 16);
    ctx.fillStyle = color;
    ctx.fillText(text, o[0], o[1]);
  };

  [["z", depthOf(0, 0, WL.z)], ["y", depthOf(0, WL.y, 0)], ["x", depthOf(WL.x, 0, 0)]]
    .sort((a, b) => b[1] - a[1])
    .forEach(([axis]) => wall(axis));

  tag(0, WL.y * 1.17, WL.z * 1.17, "x", T.axisText);
  tag(WL.x * 1.17, 0, WL.z * 1.17, "y", T.axisText);
  tag(WL.x * 1.17, WL.y * 1.17, 0, "z", T.axisText);
  tag(-WL.x * 0.78, -WL.y * 0.78, WL.z, "xy", T.planeText);
  tag(-WL.x * 0.78, WL.y, -WL.z * 0.78, "xz", T.planeText);
  tag(WL.x, -WL.y * 0.78, -WL.z * 0.78, "zy", T.planeText);

  /* ------------------------------- ink -------------------------------- */

  const openInk = () => {
    ctx.globalCompositeOperation = T.comp;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };
  const closeInk = () => {
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  };

  const [nr, ng, nb] = T.ink;
  const [fr, fg, fb] = T.inkFar;
  const solid = `rgb(${nr},${ng},${nb})`;
  const rawBase = (P.ink / 500) * boost * T.alpha;
  const base = rawBase * 1.8;
  const lineWeight = 2.1;

  /* orthographic shadows cast onto each wall */
  if (P.shadows > 0.005) {
    openInk();
    ctx.strokeStyle = solid;
    ctx.globalAlpha = rawBase * P.shadows * 0.85 * 2.8;
    ctx.lineWidth = P.width * 0.85 * 2.3;
    for (const plane of ["xy", "xz", "zy"]) {
      for (let i = 0; i < n; i++) {
        const x = pts[i * 3];
        const y = pts[i * 3 + 1];
        const z = pts[i * 3 + 2];
        if (plane === "xy") project(x, y, WL.z, o);
        else if (plane === "xz") project(x, WL.y, z, o);
        else project(WL.x, y, z, o);
        ax[i] = o[0];
        ay[i] = o[1];
      }
      const path = new Path2D();
      path.moveTo(ax[0], ay[0]);
      for (let i = stride; i < n; i += stride) path.lineTo(ax[i], ay[i]);
      ctx.stroke(path);
    }
    closeInk();
  }

  /* fade 0 leaves every stroke identical, so skip the depth buckets */
  if (P.fade < 0.01) {
    const path = new Path2D();
    path.moveTo(sx[0], sy[0]);
    for (let i = stride; i < n; i += stride) path.lineTo(sx[i], sy[i]);
    openInk();
    ctx.strokeStyle = solid;
    ctx.globalAlpha = base;
    ctx.lineWidth = P.width * lineWeight;
    ctx.stroke(path);
    closeInk();
    return;
  }

  /* Otherwise bucket segments by distance and ramp colour, alpha and weight
     across them by the fade amount. u = 1 is nearest. */
  const BINS = 12;
  const bins = Array.from({ length: BINS }, () => new Path2D());
  const span = zhi - zlo || 1;
  let prevBin = -1;
  let prevIdx = -99;
  for (let i = 0; i + stride < n; i += stride) {
    let b = (((zhi - (sz[i] + sz[i + stride]) * 0.5) / span) * BINS) | 0;
    if (b < 0) b = 0;
    if (b >= BINS) b = BINS - 1;
    if (b !== prevBin || i !== prevIdx + stride) bins[b].moveTo(sx[i], sy[i]);
    bins[b].lineTo(sx[i + stride], sy[i + stride]);
    prevBin = b;
    prevIdx = i;
  }

  const f = P.fade;
  openInk();
  for (let b = 0; b < BINS; b++) {
    const u = b / (BINS - 1);
    const m = f * (1 - u); // how far toward the far colour this bucket sits
    ctx.strokeStyle = `rgb(${Math.round(nr + m * (fr - nr))},${Math.round(
      ng + m * (fg - ng)
    )},${Math.round(nb + m * (fb - nb))})`;
    ctx.globalAlpha = base * (1 + f * (1.1 * u - 0.5));
    ctx.lineWidth = P.width * lineWeight * (1 + f * (0.7 * u - 0.3));
    ctx.stroke(bins[b]);
  }
  closeInk();
}
