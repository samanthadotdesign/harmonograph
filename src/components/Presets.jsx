import { slotLabel } from "../lib/storage.js";

/* Ten slots, keyed 1…9 then 0. Click or press the number to recall,
   Shift + number to save, Alt + number to delete. Slots live in localStorage,
   so they survive a reload. */

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
        {slots.map((slot, i) => {
          const number = slotLabel(i);
          return (
            <button
              key={i}
              className={"slot" + (slot ? " filled" : "") + (active === i ? " on" : "")}
              onClick={(e) => click(i, e)}
              title={
                slot
                  ? `${slot.name || "untitled"} — ${number} to recall · Shift + ${number} to save · Alt + ${number} to delete`
                  : `empty — click or Shift + ${number} to save the current dials here`
              }
            >
              <span className="n">{number}</span>
              <span className="nm">
                {slot ? (slot.name || "untitled") + (active === i && dirty ? " *" : "") : "—"}
              </span>
            </button>
          );
        })}
      </div>

      <input
        className="take"
        value={name}
        onChange={(e) => onName(e.target.value)}
        placeholder="name the next take"
        spellCheck={false}
      />

      <p className="note">
        press a <b>number</b> to recall · <b>Shift + number</b> to save · <b>Alt + number</b> to delete
        <br />
        amber is the slot you are on · <b>*</b> means the dials have moved since
      </p>
    </>
  );
}
