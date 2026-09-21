/* Two palettes for the drawing surface.
 *
 * On paper, ink darkens where passes overlap, so light mode composites with
 * `multiply`. On a dark ground the same overlaps have to brighten instead, so
 * dark mode goes additive with `lighter` and runs a lower alpha, since additive
 * blending saturates far more quickly. */

export const THEMES = {
  light: {
    bg: "#ffffff",
    ink: [33, 53, 142],
    inkFar: [150, 166, 214],
    comp: "multiply",
    alpha: 1,
    walls: { z: "#f1f4fb", y: "#f6f6f3", x: "#f5f2f9" },
    edge: "#c8cdd7",
    grid: "#e4e7ee",
    axisText: "#6f7480",
    planeText: "#9aa0ab",
  },
  dark: {
    bg: "#0e0f13",
    ink: [172, 196, 255],
    inkFar: [52, 66, 112],
    comp: "lighter",
    alpha: 0.62,
    walls: { z: "#14161e", y: "#131513", x: "#17131d" },
    edge: "#2c3039",
    grid: "#1b1e26",
    axisText: "#8b919d",
    planeText: "#666c79",
  },
};
