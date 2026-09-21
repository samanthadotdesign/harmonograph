const SIZE = 118;
const CENTER = SIZE / 2;
const SCALE = 35;

function project([x, y, z], cam) {
  const cy = Math.cos(cam.yaw);
  const sn = Math.sin(cam.yaw);
  const cx = Math.cos(cam.pitch);
  const sm = Math.sin(cam.pitch);
  const xa = x * cy + z * sn;
  const za = -x * sn + z * cy;
  const yb = y * cx - za * sm;
  return [CENTER + xa * SCALE, CENTER - yb * SCALE];
}

const points = (vertices, cam) =>
  vertices.map((vertex) => project(vertex, cam).join(",")).join(" ");

const angularDistance = (a, b) =>
  Math.abs((((a - b + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) - Math.PI);
const isCurrent = (cam, view) =>
  angularDistance(cam.yaw, view.yaw) < 0.01 && Math.abs(cam.pitch - view.pitch) < 0.01;

const VIEWS = [
  { id: "front", label: "front", plane: "xy", yaw: 0, pitch: 0 },
  { id: "top", label: "top", plane: "xz", yaw: 0, pitch: -Math.PI / 2 },
  { id: "side", label: "side", plane: "zy", yaw: Math.PI / 2, pitch: 0 },
];

export default function ViewGizmo({ cam, onSnap, home }) {
  const origin = project([0, 0, 0], cam);
  const axes = [
    { id: "x", end: project([1, 0, 0], cam) },
    { id: "y", end: project([0, 1, 0], cam) },
    { id: "z", end: project([0, 0, 1], cam) },
  ];
  const planes = [
    { id: "xy", vertices: [[-0.78, -0.78, 0], [0.78, -0.78, 0], [0.78, 0.78, 0], [-0.78, 0.78, 0]] },
    { id: "xz", vertices: [[-0.78, 0, -0.78], [0.78, 0, -0.78], [0.78, 0, 0.78], [-0.78, 0, 0.78]] },
    { id: "zy", vertices: [[0, -0.78, -0.78], [0, 0.78, -0.78], [0, 0.78, 0.78], [0, -0.78, 0.78]] },
  ];

  return (
    <div className="view-gizmo">
      <svg
        className="gizmo-graphic"
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label="Current plane rotation"
      >
        <circle className="gizmo-ring" cx={CENTER} cy={CENTER} r={CENTER - 4} />
        {planes.map((plane) => (
          <polygon
            key={plane.id}
            className={`gizmo-plane gizmo-plane-${plane.id}`}
            points={points(plane.vertices, cam)}
          />
        ))}
        {axes.map((axis) => (
          <g key={axis.id} className={`gizmo-axis gizmo-axis-${axis.id}`}>
            <line x1={origin[0]} y1={origin[1]} x2={axis.end[0]} y2={axis.end[1]} />
            <circle cx={axis.end[0]} cy={axis.end[1]} r="7.5" />
            <text x={axis.end[0]} y={axis.end[1]}>{axis.id}</text>
          </g>
        ))}
        <circle className="gizmo-origin" cx={origin[0]} cy={origin[1]} r="2.5" />
      </svg>

      <div className="view-snaps" aria-label="Snap camera view">
        {VIEWS.map((view) => (
          <button
            key={view.id}
            type="button"
            className={isCurrent(cam, view) ? "active" : ""}
            onClick={() => onSnap(view)}
            title={`Snap to ${view.plane.toUpperCase()} plane`}
            aria-pressed={isCurrent(cam, view)}
          >
            <span>{view.label}</span>
            <small>{view.plane}</small>
          </button>
        ))}
        <button
          type="button"
          className={isCurrent(cam, home) ? "active" : ""}
          onClick={() => onSnap(home)}
          title="Return to perspective view"
          aria-pressed={isCurrent(cam, home)}
        >
          <span>home</span>
          <small>3d</small>
        </button>
      </div>
    </div>
  );
}
