import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import Dial from "./components/Dial.jsx";
import Toggle from "./components/Toggle.jsx";
import Section from "./components/Section.jsx";
import Presets from "./components/Presets.jsx";
import { buildCurve } from "./lib/curve.js";
import { render } from "./lib/render.js";
import {
  INITIAL, HOME_CAM, SPEC, GROUPS,
  f2v, v2f, t2v, v2t, fmt, turnsCeiling, sanitise, sameDials,
} from "./lib/params.js";
import { loadState, saveState, EMPTY_SLOTS, codeToSlot } from "./lib/storage.js";

const HP = Math.PI / 2;
const SNAP = 0.05; // radians within which the camera locks to an axis
const AUTO_ROTATE_SPEED = 0.05; // radians per second; one turn takes about two minutes
const WHEEL_PAUSE_MS = 500;
const LINE_DRAW_MS = 12000;
const LINE_HOLD_MS = 1500;
const MOBILE_QUERY = "(max-width: 640px), (hover: none) and (pointer: coarse)";

/* snap the camera to exact axis alignment when it comes close, so the flat
   xy / xz / zy projections stay reachable by hand */
const wrap = (a) => ((((a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
const snapTo = (v, targets) => {
  for (const t of targets) if (Math.abs(v - t) < SNAP) return t;
  return v;
};
const normaliseCam = (value) => ({
  yaw: Number.isFinite(value?.yaw) ? value.yaw : HOME_CAM.yaw,
  pitch: Number.isFinite(value?.pitch) ? value.pitch : HOME_CAM.pitch,
  panX: Number.isFinite(value?.panX) ? value.panX : 0,
  panY: Number.isFinite(value?.panY) ? value.panY : 0,
});

export default function App() {
  const boot = useRef(loadState()).current;

  const [P, setP] = useState(() => sanitise(boot?.live?.P));
  const [cam, setCam] = useState(() => normaliseCam(boot?.live?.cam));
  const [theme, setTheme] = useState(() => (boot?.theme === "dark" ? "dark" : "light"));
  const [slots, setSlots] = useState(() =>
    Array.isArray(boot?.slots) && boot.slots.length === 10 ? boot.slots : EMPTY_SLOTS
  );
  const [active, setActive] = useState(() =>
    typeof boot?.active === "number" ? boot.active : -1
  );

  const [take, setTake] = useState("");
  const [size, setSize] = useState({ w: 1200, h: 800 });
  const [dragging, setDragging] = useState(false);
  const [wheelActive, setWheelActive] = useState(false);
  const [autoRotate, setAutoRotate] = useState(() => boot?.autoRotate === true);
  const [animateLine, setAnimateLine] = useState(() => boot?.animateLine === true);
  const [lineProgress, setLineProgress] = useState(() => boot?.animateLine === true ? 0 : 1);
  const [panel, setPanel] = useState(false);
  const [mobile, setMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);
  const [panelLift, setPanelLift] = useState(0);
  const [open, setOpen] = useState({
    Presets: true, Shape: true, Motion: true, Ink: true, View: true,
  });
  const [copied, setCopied] = useState(false);

  const canvasRef = useRef(null);
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const liftRef = useRef(0);
  const wheelStopRef = useRef(null);
  const persistRef = useRef(null);

  const dirty = active >= 0 && slots[active] ? !sameDials(P, slots[active].P) : false;
  const shadowsOn = P.shadows > 0.005;
  persistRef.current = { slots, theme, active, autoRotate, animateLine, live: { P, cam } };

  /* ------------------------------ actions ----------------------------- */

  /* keep turns inside the sample budget whenever a frequency moves */
  const update = useCallback((k, v) => {
    setP((prev) => {
      const next = { ...prev, [k]: v };
      const ceil = turnsCeiling(next);
      if (next.turns > ceil) next.turns = t2v(v2t(ceil));
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setP(INITIAL);
    setCam(HOME_CAM);
    setActive(-1);
  }, []);

  const setShadows = useCallback((enabled) => {
    setP((prev) => ({
      ...prev,
      shadows: enabled ? INITIAL.shadows : 0,
    }));
  }, []);

  const savePNG = useCallback(() => {
    canvasRef.current?.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "harmonograph.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    });
  }, []);

  const copySettings = useCallback(() => {
    const { mix, phase, ...rest } = P;
    navigator.clipboard?.writeText(JSON.stringify({ ...rest, cam }, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }, [P, cam]);

  const saveSlot = useCallback(
    (i) => {
      setSlots((prev) => {
        const next = prev.slice();
        next[i] = { name: take.trim() || prev[i]?.name || "", P: { ...P }, cam: { ...cam } };
        return next;
      });
      setActive(i);
      setTake("");
    },
    [P, cam, take]
  );

  const recallSlot = useCallback(
    (i) => {
      const s = slots[i];
      if (!s) return;
      setP(sanitise(s.P));
      setCam(normaliseCam(s.cam));
      setActive(i);
    },
    [slots]
  );

  const clearSlot = useCallback((i) => {
    setSlots((prev) => {
      const next = prev.slice();
      next[i] = null;
      return next;
    });
    setActive((a) => (a === i ? -1 : a));
  }, []);

  /* ----------------------------- shortcuts ---------------------------- */

  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey) return;
      const el = document.activeElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;

      const slot = codeToSlot(e.code);
      if (slot >= 0) {
        e.preventDefault();
        if (e.altKey) clearSlot(slot);
        else if (e.shiftKey) saveSlot(slot);
        else recallSlot(slot);
        return;
      }
      if (e.altKey) return;

      const k = e.key.toLowerCase();
      if (k === "c") { e.preventDefault(); setPanel((value) => !value); }
      else if (k === "r") { e.preventDefault(); reset(); }
      else if (k === "s") { e.preventDefault(); savePNG(); }
      else if (k === "t") { e.preventDefault(); setTheme((value) => (value === "dark" ? "light" : "dark")); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reset, savePNG, saveSlot, recallSlot, clearSlot]);

  /* ---------------------------- persistence --------------------------- */

  /* Save control changes after they settle. Camera persistence is separate so
     continuous auto-rotation does not prevent preset or theme writes. */
  useEffect(() => {
    const id = setTimeout(() => saveState(persistRef.current), 250);
    return () => clearTimeout(id);
  }, [slots, theme, active, P, autoRotate, animateLine]);

  useEffect(() => {
    if (autoRotate) return undefined;
    const id = setTimeout(() => saveState(persistRef.current), 250);
    return () => clearTimeout(id);
  }, [cam, autoRotate]);

  /* ------------------------------ drawing ----------------------------- */

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const query = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setMobile(query.matches);
    onChange();
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => () => clearTimeout(wheelStopRef.current), []);

  useEffect(() => {
    const from = liftRef.current;
    const to = panel && mobile ? 1 : 0;
    if (from === to) return;
    const started = performance.now();
    const duration = 650;
    let frame;
    const animate = (now) => {
      const t = Math.min(1, (now - started) / duration);
      const eased = t * t * (3 - 2 * t);
      const value = from + (to - from) * eased;
      liftRef.current = value;
      setPanelLift(value);
      if (t < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [panel, mobile]);

  useEffect(() => {
    if (!autoRotate || dragging || wheelActive) return undefined;
    let frame;
    let previous = performance.now();
    const rotate = (now) => {
      const elapsed = Math.min(50, now - previous) / 1000;
      previous = now;
      setCam((value) => ({
        ...value,
        yaw: wrap(value.yaw + AUTO_ROTATE_SPEED * elapsed),
      }));
      frame = requestAnimationFrame(rotate);
    };
    frame = requestAnimationFrame(rotate);
    return () => cancelAnimationFrame(frame);
  }, [autoRotate, dragging, wheelActive]);

  /* rebuild the point set only when the shape actually changes */
  const curve = useMemo(
    () => buildCurve(P, Math.min(size.w, size.h) * 0.4),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [P.fx, P.fy, P.fz, P.depth, P.sweep, P.turns, P.decay, P.mix, P.phase, size.w, size.h]
  );

  useEffect(() => {
    if (!animateLine) {
      setLineProgress(1);
      return undefined;
    }
    setLineProgress(0);
    let frame;
    const started = performance.now();
    const duration = LINE_DRAW_MS + LINE_HOLD_MS;
    const animate = (now) => {
      const elapsed = (now - started) % duration;
      setLineProgress(Math.min(1, elapsed / LINE_DRAW_MS));
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [animateLine, curve]);

  /* everything else is a redraw */
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(size.w * dpr);
    cv.height = Math.round(size.h * dpr);
    render(cv.getContext("2d"), {
      curve, P, cam, W: size.w, H: size.h, dpr, dragging, theme, panelLift,
      progress: lineProgress,
    });
  }, [curve, P, cam, size, dragging, theme, panelLift, lineProgress]);

  const beginMultiGesture = () => {
    const [a, b] = Array.from(pointers.current.values());
    if (!a || !b) return;
    gesture.current = {
      mode: "multi",
      distance: Math.hypot(b.x - a.x, b.y - a.y) || 1,
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
      zoom: P.zoom,
      panX: cam.panX,
      panY: cam.panY,
    };
  };

  const onDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0 && e.button !== 2) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setDragging(true);
    if (pointers.current.size >= 2) beginMultiGesture();
    else {
      gesture.current = {
        mode: e.pointerType === "mouse" && e.button === 2 ? "pan" : "rotate",
        x: e.clientX,
        y: e.clientY,
      };
    }
  };
  const onMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    e.preventDefault();
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size >= 2) {
      if (gesture.current?.mode !== "multi") beginMultiGesture();
      const [a, b] = Array.from(pointers.current.values());
      const g = gesture.current;
      if (!a || !b || !g) return;
      const distance = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const x = (a.x + b.x) / 2;
      const y = (a.y + b.y) / 2;
      const scale = Math.min(size.w, size.h) || 1;
      const zoomSpec = SPEC.zoom;
      const zoom = Math.min(zoomSpec.max, Math.max(zoomSpec.min, g.zoom * (distance / g.distance)));
      setP((prev) => ({ ...prev, zoom: +zoom.toFixed(3) }));
      setCam((c) => ({
        ...c,
        panX: g.panX + (x - g.x) / scale,
        panY: g.panY + (y - g.y) / scale,
      }));
      return;
    }

    const g = gesture.current;
    if (g?.mode === "pan") {
      const scale = Math.min(size.w, size.h) || 1;
      const dx = e.clientX - g.x;
      const dy = e.clientY - g.y;
      gesture.current = { mode: "pan", x: e.clientX, y: e.clientY };
      setCam((c) => ({
        ...c,
        panX: c.panX + dx / scale,
        panY: c.panY + dy / scale,
      }));
      return;
    }
    if (g?.mode !== "rotate") {
      gesture.current = { mode: "rotate", x: e.clientX, y: e.clientY };
      return;
    }
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    gesture.current = { mode: "rotate", x: e.clientX, y: e.clientY };
    setCam((c) => ({
      ...c,
      yaw: snapTo(wrap(c.yaw + dx * 0.0068), [-Math.PI, -HP, 0, HP, Math.PI]),
      pitch: snapTo(Math.max(-HP, Math.min(HP, c.pitch + dy * 0.0068)), [-HP, 0, HP]),
    }));
  };
  const onUp = (e) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size >= 2) beginMultiGesture();
    else if (pointers.current.size === 1) {
      const point = pointers.current.values().next().value;
      gesture.current = { mode: "rotate", x: point.x, y: point.y };
    } else {
      gesture.current = null;
      setDragging(false);
    }
  };
  const onWheel = (e) => {
    e.preventDefault();
    setWheelActive(true);
    clearTimeout(wheelStopRef.current);
    wheelStopRef.current = setTimeout(() => setWheelActive(false), WHEEL_PAUSE_MS);
    const zoomSpec = SPEC.zoom;
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? size.h : 1;
    const delta = Math.max(-120, Math.min(120, e.deltaY * unit));
    setP((prev) => ({
      ...prev,
      zoom: +Math.min(zoomSpec.max, Math.max(zoomSpec.min, prev.zoom * Math.exp(-delta * 0.002))).toFixed(3),
    }));
  };

  /* ------------------------------- dials ------------------------------ */

  const turnsMax = v2t(turnsCeiling(P));

  const dialProps = (k) => {
    const s = SPEC[k];
    const log = s.scale;
    return {
      label: s.label,
      display: fmt(k, P[k]),
      max: log === "f" ? 1000 : log === "t" ? turnsMax : s.max,
      ...(log ? { min: 0, step: 1 } : { min: s.min, step: s.step }),
      value: log === "f" ? v2f(P[k]) : log === "t" ? v2t(P[k]) : P[k],
      home: log === "f" ? v2f(INITIAL[k]) : log === "t" ? v2t(INITIAL[k]) : INITIAL[k],
      onChange: (v) => update(k, log === "f" ? f2v(v) : log === "t" ? t2v(v) : v),
    };
  };

  const toggle = (title) => setOpen((o) => ({ ...o, [title]: !o[title] }));

  return (
    <div className="stage">
      <canvas
        ref={canvasRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onWheel={onWheel}
        onContextMenu={(e) => e.preventDefault()}
        style={{ width: size.w, height: size.h }}
        className={dragging ? "dragging" : ""}
      />

      <span className={"hint hint-desktop " + theme} style={{ opacity: dragging ? 0.3 : 1 }}>
        drag to rotate · scroll to zoom · right-drag to pan
      </span>
      <span className={"hint hint-mobile " + theme} style={{ opacity: dragging ? 0.3 : 1 }}>
        drag to rotate · pinch to zoom · two-finger drag to pan
      </span>

      <span className="desktop-shortcut">press C for controls</span>

      <button
        className="panel-toggle"
        onClick={() => setPanel((value) => !value)}
        aria-expanded={panel}
        aria-controls="controls-panel"
      >
        {panel ? "close" : "controls"}
      </button>

      {panel && (
        <div className="panel" id="controls-panel">
          <header>
            <span className="name">HARMONOGRAPH</span>
            <span className="keys">C hide · R reset · S png · T theme</span>
            <button
              className="icon-toggle theme-toggle"
              onClick={() => setTheme((value) => (value === "dark" ? "light" : "dark"))}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            >
              {theme === "dark" ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="3.5" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20.25 15.3A8.5 8.5 0 0 1 8.7 3.75 8.5 8.5 0 1 0 20.25 15.3Z" />
                </svg>
              )}
            </button>
          </header>

          <div className="scroll">
            <Section title="Presets — keys 1…0" open={open.Presets} onToggle={() => toggle("Presets")}>
              <Presets
                slots={slots}
                active={active}
                dirty={dirty}
                name={take}
                onName={setTake}
                onRecall={recallSlot}
                onSave={saveSlot}
                onClear={clearSlot}
              />
            </Section>

            {GROUPS.map((g) => (
              <Section key={g.title} title={g.title} open={open[g.title]} onToggle={() => toggle(g.title)}>
                <div className="dials">
                  {g.keys.map((k) => (
                    <Dial key={k} {...dialProps(k)} />
                  ))}
                </div>
              </Section>
            ))}

            <Section title="View" open={open.View} onToggle={() => toggle("View")}>
              <div className="dials">
                <Toggle label="shadows" checked={shadowsOn} onChange={setShadows} />
                <Toggle label="auto rotation" checked={autoRotate} onChange={setAutoRotate} />
                <Toggle label="line animation" checked={animateLine} onChange={setAnimateLine} />
              </div>
            </Section>

          </div>

          <footer className="foot">
            <button className="btn" onClick={copySettings}>
              {copied ? "copied" : "copy settings"}
            </button>
            <button className="btn" onClick={savePNG}>save png</button>
            <button className="btn wide" onClick={reset}>reset</button>
          </footer>
        </div>
      )}
    </div>
  );
}
