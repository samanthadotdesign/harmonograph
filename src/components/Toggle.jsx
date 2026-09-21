const SIZE = 58;
const RAD = 20;
const TICKS = 2;
const SWEEP = 55;

const AMBER = "#f5a623";
const AMBER_DIM = "#5c4114";

function polar(deg, r) {
  const a = (deg * Math.PI) / 180;
  return [SIZE / 2 + Math.sin(a) * r, SIZE / 2 - Math.cos(a) * r];
}

export default function Toggle({ label, checked, onChange }) {
  const angle = checked ? SWEEP : -SWEEP;
  const [px, py] = polar(angle, RAD * 0.78);
  const [ix, iy] = polar(angle, RAD * 0.22);

  return (
    <div className="dial toggle-dial">
      <span className="lbl">{label}</span>
      <button
        type="button"
        className="toggle-knob"
        role="switch"
        aria-checked={checked}
        aria-label={`${label}: ${checked ? "on" : "off"}`}
        onClick={() => onChange(!checked)}
      >
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
          {Array.from({ length: TICKS }, (_, i) => {
            const a = -SWEEP + (2 * SWEEP * i) / (TICKS - 1);
            const lit = checked || i === 0;
            const [x1, y1] = polar(a, RAD + 3);
            const [x2, y2] = polar(a, RAD + 6.5);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={lit ? AMBER : AMBER_DIM}
                strokeWidth={1.2}
                strokeLinecap="round"
              />
            );
          })}
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RAD} fill="#1c1c1c" stroke="#3a3a3a" strokeWidth={1} />
          <line x1={ix} y1={iy} x2={px} y2={py} stroke="#e8e8e8" strokeWidth={2} strokeLinecap="round" />
        </svg>
      </button>
      <span className="val">{checked ? "on" : "off"}</span>
    </div>
  );
}
