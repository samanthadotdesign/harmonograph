const CENTER = 29;
const NEEDLE_RADIUS = 11.2;

function needlePoint(checked) {
  const angle = ((checked ? -55 : 55) * Math.PI) / 180;
  return [
    CENTER + Math.sin(angle) * NEEDLE_RADIUS,
    CENTER - Math.cos(angle) * NEEDLE_RADIUS,
  ];
}

export default function Toggle({ label, checked, onChange }) {
  const [needleX, needleY] = needlePoint(checked);

  return (
    <div className="toggle-control">
      <span className="lbl">{label}</span>
      <button
        type="button"
        className="toggle-knob"
        role="switch"
        aria-checked={checked}
        aria-label={`${label}: ${checked ? "on" : "off"}`}
        onClick={() => onChange(!checked)}
      >
        <svg width="58" height="34" viewBox="0 0 58 34" aria-hidden="true">
          <path
            d="M9.5 29.5C9.5 18.4543 18.4543 9.5 29.5 9.5C40.5457 9.5 49.5 18.4543 49.5 29.5"
            fill="none"
            stroke="#3a3a3a"
          />
          <path
            d="M10.757 15.408L7.89 13.4"
            fill="none"
            stroke="#f5a623"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <path
            d="M47.243 15.408L50.11 13.4"
            fill="none"
            stroke="#5c4114"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <line
            x1={CENTER}
            y1={CENTER}
            x2={needleX}
            y2={needleY}
            stroke="#e8e8e8"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <span className="val">{checked ? "on" : "off"}</span>
    </div>
  );
}
