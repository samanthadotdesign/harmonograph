# Harmonograph

A three-dimensional harmonograph you turn by hand. Two detuned sine terms per
axis, inked over many passes, cast onto the three coordinate planes.

## Running it

```bash
npm install
npm run dev
```

Then open the URL Vite prints. `npm run build` puts a static site in `dist/`.

`vite.config.js` sets `base: "./"`, so the built `dist/` also works from a
subpath — you can drop it straight onto GitHub Pages without touching config.

## The maths

```
x(t) = e^(-λt) [ sin(fx·t + φ) + r·sin((fx + δ)·t) ]
y(t) = e^(-λt) [ sin(fy·t + φ) + r·sin((fy − δ)·t + π/3) ]
z(t) = d · e^(-λt) [ sin(fz·t + φ) + r·sin((fz + 1.7δ)·t + 2π/3) ]
```

A real harmonograph hangs a pen off two pendulums per axis, tuned close to each
other but not identical. The small difference is `δ`, and it is what makes the
figure precess instead of retracing itself, so successive passes fan out and
their envelope becomes the shape you see.

Two things about it are worth knowing before you start turning dials:

**`δ` is derived, not set directly.** It comes out as `sweep ÷ turns`, so the
figure always precesses `sweep` revolutions over the whole run however long
that run is. Near 0.5 the passes stay coherent and fan cleanly. Past about 1.5
they lap themselves into a tangle.

**Frequency and turns trade off against each other.** Halving all three
frequencies while doubling `turns` produces the *identical* figure — the curve
only depends on `f·t`, and `δ` already scales with `turns`. Low frequencies are
only interesting if you leave `turns` alone, and then the passes stop
overlapping and read as separate loops rather than smooth fans.

That product also sets how many samples the polyline needs. Past the budget the
curve degenerates into long straight chords, so the `turns` dial's maximum
moves when you change a frequency. It is not broken; it is refusing to draw
something it cannot resolve.

## Controls

Drag the canvas to rotate. It snaps to exact axis alignment within about 3°, so
the flat `xy`, `xz` and `zy` projections are reachable by hand.

Drag a dial up or down to turn it, shift for fine, double-click to reset it.

| key | |
|---|---|
| `i` | show / hide the panel |
| `r` | reset everything |
| `s` | save a PNG |
| `t` | switch light / dark |
| `1`–`0` | recall that preset slot |
| `shift` + digit | save the current dials into that slot |
| `alt` + digit | clear that slot |

### Dials

| | |
|---|---|
| `f x` `f y` `f z` | frequency per axis, 0.1 to 8, log scaled |
| `depth` | z amplitude — at 0 the curve collapses into a plane |
| `sweep` | revolutions of precession over the run |
| `turns` | length of the run, 0.5 to 600, log scaled |
| `decay` | how fast the amplitude spirals in |
| `ink` | how dark each pass lands; overlaps accumulate |
| `width` | stroke weight |
| `fade` | 0 for flat ink, 1 for a full near/far ramp |
| `shadows` | strength of the projections on the walls, 0 to hide |
| `zoom` | |

The four log-scaled dials turn in slider space, so the pointer moves evenly
around the arc while the number moves exponentially. A quarter turn near the
bottom covers 0.10 to 0.25; the same quarter turn near the top covers 3 to 8.

## Presets

Ten slots, keyed `1`…`9` then `0`. Amber is the slot you are on, and a `*`
appears once the dials have moved away from what is saved there.

Slots persist in `localStorage` under `harmonograph.v1`, along with the theme
and whatever the dials are set to now, so a reload picks up where you left off.
Every access is wrapped — private browsing and disabled storage both throw
rather than returning null, and the app carries on fine without it.

## How it's put together

```
src/
  App.jsx               state, shortcuts, persistence, pointer handling
  components/
    Dial.jsx            the rotary control
    Section.jsx         collapsible panel section
    Presets.jsx         the ten slots
  lib/
    curve.js            the sampler and the point-set builder
    render.js           one canvas frame: planes, shadows, curve
    params.js           dial definitions and the log scales
    theme.js            the two drawing palettes
    storage.js          guarded localStorage
```

Building the point set is the expensive step — it measures the curve's arc
length, then samples to hit roughly two screen pixels per segment, which lands
anywhere between 3,000 and 140,000 points. That sits in a `useMemo` keyed only
on the shape parameters. Rotating, zooming, changing ink or switching theme all
bypass it and go straight to a redraw, so dragging never re-runs the sampler.

The two themes are not a colour swap. On paper, ink darkens where passes
overlap, so light mode composites with `multiply`. On a dark ground the same
overlaps have to brighten, so dark mode goes additive with `lighter` and runs a
lower alpha, because additive blending saturates much faster.

Each of the three walls picks its own side every frame — whichever face is
currently furthest from the camera — so the planes always stay behind the curve
however you turn it.

## Licence

MIT.
