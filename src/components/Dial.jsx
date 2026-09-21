import { useRef, useCallback } from "react";

/* A rotary dial. 270 degrees of travel, tick marks lit up to the current
   value, drag vertically to turn. Shift drags at a fifth of the rate and a
   double-click sends it back to its default. */

const SIZE = 58;
const RAD = 20;
const TICKS = 25;
const SWEEP = 135; // degrees either side of straight up

const AMBER = "#f5a623";
const AMBER_DIM = "#5c4114";

function polar(deg, r) {
  const a = (deg * Math.PI) / 180;
  return [SIZE / 2 + Math.sin(a) * r, SIZE / 2 - Math.cos(a) * r];
}

export default function Dial({ label, value, min, max, step, onChange, display, home }) {
  const grab = useRef(null);
  const t = (value - min) / (max - min || 1);
  const angle = -SWEEP + 2 * SWEEP * t;

  const quantise = useCallback(
    (raw) => {
      const snapped = Math.round(raw / step) * step;
      const clamped = Math.min(max, Math.max(min, snapped));
      return step < 1 ? +clamped.toFixed(4) : Math.round(clamped);
    },
    [min, max, step]
  );

  const down = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    grab.current = { y: e.clientY, v: value };
  };
  const move = (e) => {
    if (!grab.current) return;
    const dy = grab.current.y - e.clientY; // drag up to increase
    const gain = e.shiftKey ? 0.2 : 1;
    onChange(quantise(grab.current.v + (dy / 170) * (max - min) * gain));
  };
  const up = () => {
    grab.current = null;
  };
  const key = (e) => {
    const big = e.shiftKey ? 10 : 1;
    if (e.key === "ArrowUp" || e.key === "ArrowRight") {
      e.preventDefault();
      onChange(quantise(value + step * big));
    } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
      e.preventDefault();
      onChange(quantise(value - step * big));
    }
  };

  const [px, py] = polar(angle, RAD * 0.78);
  const [ix, iy] = polar(angle, RAD * 0.22);

  return (
    <div className="dial">
      <span className="lbl">{label}</span>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        tabIndex={0}
        role="slider"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuetext={display}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onDoubleClick={() => onChange(home)}
        onKeyDown={key}
      >
        {Array.from({ length: TICKS }, (_, i) => {
          const a = -SWEEP + (2 * SWEEP * i) / (TICKS - 1);
          const lit = i / (TICKS - 1) <= t + 0.001;
          const [x1, y1] = polar(a, RAD + 3);
          const [x2, y2] = polar(a, RAD + 6.5);
          return (
            <line
              key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={lit ? AMBER : AMBER_DIM}
              strokeWidth={1.2}
              strokeLinecap="round"
            />
          );
        })}
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RAD} fill="#1c1c1c" stroke="#3a3a3a" strokeWidth={1} />
        <line x1={ix} y1={iy} x2={px} y2={py} stroke="#e8e8e8" strokeWidth={2} strokeLinecap="round" />
      </svg>
      <span className="val">{display}</span>
    </div>
  );
}
