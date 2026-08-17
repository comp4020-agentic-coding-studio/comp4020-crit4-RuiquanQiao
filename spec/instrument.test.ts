import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { PENTATONIC_PITCH_CLASSES, TUNING } from "../music";

// The week's published spec, turned into the contracts a machine can hold.
// The lines only an ear can judge — latency, feel, whether it sounds like a
// string — are left to the crit, as the spec intends.

const distPath = resolve("dist/index.html");
const built = existsSync(distPath);
const doc = built
  ? new JSDOM(readFileSync(distPath, "utf8")).window.document
  : null;

describe("the instrument ships", () => {
  it("has been built (run `pnpm build`)", () => {
    expect(built, `${distPath} not found — run pnpm build first`).toBe(true);
  });

  it("puts a playable surface on the page", () => {
    const canvas = doc?.querySelector<HTMLCanvasElement>("canvas#qin");
    expect(canvas, "the instrument canvas #qin is missing").toBeTruthy();
  });

  it("is playable with the keyboard, not only the mouse", () => {
    // "playable with whatever is at hand — mouse, keyboard or touch"
    const canvas = doc?.querySelector("canvas#qin");
    expect(canvas?.getAttribute("tabindex")).toBe("0");
    expect(
      (canvas?.getAttribute("aria-label") ?? "").length,
      "a stranger with a screen-reader needs to be told how to play",
    ).toBeGreaterThan(20);
  });

  it("invites the first sound on the opening screen", () => {
    // "a stranger can play it uninstructed — the opening screen invites the
    // first sound"
    const start = doc?.querySelector("#start");
    expect(start, "the opening invitation (#start) is missing").toBeTruthy();
    expect((start?.textContent ?? "").trim().length).toBeGreaterThan(0);
  });

  it("makes sound live in the page — a script actually ships", () => {
    // "sound is made live in the page by the player, not played back"
    const module = doc?.querySelector('script[type="module"]');
    expect(module, "no module script was bundled into the page").toBeTruthy();
  });

  it("left no starter scaffolding behind", () => {
    expect(doc?.querySelector('[data-testid="intro"]')).toBeNull();
  });
});

describe("there is no way to play it wrong", () => {
  // The tuning is the harness for this spec line: every open string is a
  // degree of the pentatonic scale, so no two strings can sound a dissonant
  // interval and a random sweep is always music. This test goes red the moment
  // a string is tuned off the scale.
  it("strings all 21", () => {
    expect(TUNING.length).toBe(21);
  });

  it("tunes every string to the pentatonic scale", () => {
    for (const s of TUNING) {
      expect(
        PENTATONIC_PITCH_CLASSES.has(s.midi % 12),
        `${s.name} (midi ${s.midi}) is not in the pentatonic scale`,
      ).toBe(true);
    }
  });

  it("orders the strings low to high with real frequencies", () => {
    for (let i = 1; i < TUNING.length; i += 1) {
      expect(TUNING[i].freq).toBeGreaterThan(TUNING[i - 1].freq);
    }
    expect(TUNING[0].freq).toBeGreaterThan(0);
  });
});
