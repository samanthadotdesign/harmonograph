export default function Section({ title, open, onToggle, children }) {
  return (
    <div className="sec">
      <button onClick={onToggle} aria-expanded={open}>
        <span className="dot" />
        <span className="title">{title}</span>
        <span className={"chev" + (open ? "" : " shut")}>▼</span>
      </button>
      {open && <div className="body">{children}</div>}
    </div>
  );
}
