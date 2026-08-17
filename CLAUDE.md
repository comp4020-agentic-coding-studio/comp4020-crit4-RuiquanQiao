# COMP4020 prototype

Your starter repo for a COMP4020 prototype: a static site in HTML/CSS/TypeScript
that builds to plain HTML/CSS/JS and deploys to GitHub Pages. The deployed site
is what gets marked, not this repo.

The
[course website](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/)
publishes this deliverable's brief and spec, and this repo's name tells you
which deliverable applies. Read both before you plan or build.

## How to work in here

- Keep the dev server running (`pnpm dev`) so you see changes as you make them.
- Run `pnpm check` before you push.
- Open the page in a browser and look at it. The rendered page is the truth;
  your mental model of it isn't.
- When a check fails, read its output before you change anything.
- Never commit a red state.

## The checks

`typecheck`, `build`, `deploy`, `spec`, `lint`, `tests`, `evidence`, `links`,
`secrets`. Run `pnpm check`. Read the failure.

`spec/README.md`, `PROCESS.md` and `reflections/README.md` are in this repo and
say what they are for.

## This file is yours

A starting point, not a rulebook. As you learn what your prototype needs --- a
convention the work has to hold to, a sensor that keeps catching you out, a fact
about the stack that is easy to get wrong --- write it down here. Growing this
file is the work.

## This prototype: 古筝 (a guzheng)

- **The tuning is the harness for "no way to play it wrong".** Every string is a
  pentatonic degree, which is what makes any input sound musical. `music.ts`
  builds the table and `spec/instrument.test.ts` asserts all 21 strings are
  pentatonic. Never add an off-scale string to "extend the range" — it would
  pass the build and break the one spec line the instrument is built around.
- **Audio only unlocks inside a real user gesture.** `unlock()` must be called
  from a pointer or key event, never at load — browsers keep the AudioContext
  suspended otherwise, and the page goes silently dead. The opening `#start`
  overlay is that gesture, and it doubles as the first note. If you ever hear
  nothing, check `AudioContext.state` is `running`, not the synthesis.
- **Karplus-Strong, not an oscillator.** A sine passes every check and sounds
  like a toy; the brief makes the ear the judge. Plucks are rendered to a buffer
  up front (cached per freq+brightness) and voices are capped at 24 so a fast
  glissando can't clip. Keep it that way.
- **`prefers-reduced-motion` changes the picture, never the sound.** Reduced
  motion draws straight strings instead of the vibration; it must never mute or
  simplify the audio.
- **Verify geometry and voices from `window.__guzheng`, not screenshots.**
  Preview screenshots render at the pane's physical size, so they lie about the
  1920×1080 / 390×844 marking viewports. `window.__guzheng` exposes string
  count, live voice count and per-frame redraw ms for `preview_eval`.
- **Dev server runs on port 5195** (`.tools/serve-guzheng.cmd`): 5173 is taken
  by CertAIn and 5199 by another prototype. Node 24 is required.
