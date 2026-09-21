/* One localStorage blob for everything worth keeping between visits:
   the ten preset slots, the theme, and whatever the dials are set to now.
   Every access is guarded, because private browsing and disabled storage
   both throw rather than returning null. */

const KEY = "harmonograph.v1";
const VERSION = 1;

export function loadState() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data && data.version === VERSION ? data : null;
  } catch {
    return null;
  }
}

export function saveState(state) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ version: VERSION, ...state }));
    return true;
  } catch {
    return false;
  }
}

export function clearState() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* nothing to do */
  }
}

export const EMPTY_SLOTS = Array.from({ length: 10 }, () => null);

/* Slots are keyed 1…9 then 0, matching the row order on the keyboard. */
export const slotLabel = (i) => (i === 9 ? "0" : String(i + 1));
export const codeToSlot = (code) => {
  const m = /^Digit([0-9])$/.exec(code);
  if (!m) return -1;
  const d = Number(m[1]);
  return d === 0 ? 9 : d - 1;
};
