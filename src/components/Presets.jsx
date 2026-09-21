import { slotLabel } from "../lib/storage.js";

/* Ten slots, keyed 1…9 then 0. Click or press the digit to recall, shift for
   save, alt to clear. Slots live in localStorage, so they survive a reload. */

export default function Presets({ slots, active, dirty, name, onName, onRecall, onSave, onClear }) {
  const click = (i, e) => {
    if (e.altKey) onClear(i);
    else if (e.shiftKey) onSave(i);
    else if (slots[i]) onRecall(i);
    else onSave(i);
  };

  return (
    <>
      <div className="slots">
        {slots.map((slot, i) => (
          <button
            key={i}
            className={"slot" + (slot ? " filled" : "") + (active === i ? " on" : "")}
            onClick={(e) => click(i, e)}
            title={
              slot
                ? `${slot.name || "untitled"} — click to recall, shift-click to overwrite, alt-click to clear`
                : "empty — click or shift-click to save the current dials here"
            }
          >
            <span className="n">{slotLabel(i)}</span>
            <span className="nm">
              {slot ? (slot.name || "untitled") + (active === i && dirty ? " *" : "") : "—"}
            </span>
          </button>
        ))}
      </div>

      <input
        className="take"
        value={name}
        onChange={(e) => onName(e.target.value)}
        placeholder="name the next take"
        spellCheck={false}
      />

      <p className="note">
        press <b>1–0</b> anywhere to recall · <b>shift+</b> to save into it · <b>alt+</b> to clear
        <br />
        amber is the slot you are on · <b>*</b> means the dials have moved since
      </p>
    </>
  );
}
