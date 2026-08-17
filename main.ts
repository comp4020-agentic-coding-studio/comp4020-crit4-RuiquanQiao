import { TUNING } from "./music";
import { isMuted, isReady, pluck, setMuted, unlock, voiceCount } from "./audio";

// The instrument: 21 strings drawn across a canvas. Pressing and dragging across
// them plucks each string it crosses — a fast sweep is a glissando, which is why
// a stranger who just drags a finger already hears music. The keyboard plays the
// same strings, so it works with whatever is at hand.

const canvasEl = document.querySelector<HTMLCanvasElement>("#qin");
const overlayEl = document.querySelector<HTMLElement>("#start");
const muteEl = document.querySelector<HTMLButtonElement>("#mute");
if (!canvasEl || !overlayEl || !muteEl) {
  throw new Error("instrument markup missing");
}
const ctxOrNull = canvasEl.getContext("2d");
if (!ctxOrNull) throw new Error("no 2d context");
// Rebind to non-null consts so the type holds inside the render loop and event
// closures below (control-flow narrowing from the guard doesn't reach them).
const canvas = canvasEl;
const overlay = overlayEl;
const muteBtn = muteEl;
const ctx = ctxOrNull;

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const PLUCK_DEBOUNCE_MS = 55;

interface StringView {
  y: number;
  amp: number; // 0..1 visual vibration, decays each frame
  struckAt: number; // ms timestamp of last strike, for the glow
}

const strings: StringView[] = TUNING.map(() => ({ y: 0, amp: 0, struckAt: -1e9 }));
const lastPluckMs: number[] = TUNING.map(() => -1e9);

let width = 0;
let height = 0;
let topMargin = 0;
let gap = 0;

function layout(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // Low string at the bottom, high at the top — the player faces the low end.
  topMargin = Math.max(64, height * 0.12);
  const usable = height - topMargin * 2;
  gap = usable / (strings.length - 1);
  strings.forEach((s, i) => {
    s.y = topMargin + (strings.length - 1 - i) * gap;
  });
}

function now(): number {
  return performance.now();
}

function strike(index: number, velocity: number): void {
  const t = now();
  if (t - lastPluckMs[index] < PLUCK_DEBOUNCE_MS) return;
  lastPluckMs[index] = t;
  pluck(TUNING[index].freq, velocity);
  const view = strings[index];
  view.amp = Math.min(1, 0.4 + velocity);
  view.struckAt = t;
}

function nearestString(y: number): number {
  let best = 0;
  let bestDist = Infinity;
  strings.forEach((s, i) => {
    const d = Math.abs(s.y - y);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return best;
}

// Every string whose line sits between the previous and current pointer y.
function crossed(prevY: number, curY: number): number[] {
  const lo = Math.min(prevY, curY);
  const hi = Math.max(prevY, curY);
  const hits: number[] = [];
  strings.forEach((s, i) => {
    if (s.y >= lo && s.y <= hi) hits.push(i);
  });
  return hits;
}

// ---- Rendering ----------------------------------------------------------

let lastFrameMs = 0;

function draw(): void {
  const t0 = now();
  ctx.clearRect(0, 0, width, height);

  // Decorative bridges (雁柱): a staggered diagonal of pegs across the board.
  ctx.save();
  for (let i = 0; i < strings.length; i += 1) {
    const s = strings[i];
    const bx = width * (0.22 + 0.5 * (i / (strings.length - 1)));
    ctx.fillStyle = "rgba(60, 38, 20, 0.55)";
    ctx.fillRect(bx - 2, s.y - gap * 0.32, 4, gap * 0.64);
  }
  ctx.restore();

  for (let i = 0; i < strings.length; i += 1) {
    const s = strings[i];
    const glow = Math.max(0, 1 - (now() - s.struckAt) / 900);
    const thickness = 1 + (1 - i / strings.length) * 1.6; // low strings thicker
    ctx.lineWidth = thickness;
    ctx.strokeStyle = `rgba(${230 + glow * 25}, ${200 + glow * 40}, ${140 + glow * 90}, ${0.6 + glow * 0.4})`;
    if (glow > 0.01) {
      ctx.shadowColor = "rgba(255, 214, 130, 0.9)";
      ctx.shadowBlur = 18 * glow;
    } else {
      ctx.shadowBlur = 0;
    }

    ctx.beginPath();
    if (reduceMotion || s.amp < 0.01) {
      ctx.moveTo(0, s.y);
      ctx.lineTo(width, s.y);
    } else {
      const amp = s.amp * gap * 0.42;
      const phase = (now() - s.struckAt) / 1000;
      const steps = 48;
      for (let k = 0; k <= steps; k += 1) {
        const x = (k / steps) * width;
        const env = Math.sin((Math.PI * x) / width); // pinned at both ends
        const disp = amp * env * Math.sin(phase * 42 - x * 0.01);
        if (k === 0) ctx.moveTo(x, s.y + disp);
        else ctx.lineTo(x, s.y + disp);
      }
    }
    ctx.stroke();
    s.amp *= reduceMotion ? 0 : 0.92; // decay the visual vibration
  }
  ctx.shadowBlur = 0;

  lastFrameMs = now() - t0;
  // Diagnostics for verification (see CLAUDE.md).
  (window as unknown as Record<string, unknown>).__guzheng = {
    strings: strings.length,
    frameMs: Number(lastFrameMs.toFixed(2)),
    voices: voiceCount(),
    ready: isReady(),
  };
  requestAnimationFrame(draw);
}

// ---- Input --------------------------------------------------------------

let pressed = false;
let prevY = 0;
let prevX = 0;
let prevT = 0;

async function begin(): Promise<void> {
  await unlock();
  overlay.hidden = true;
  canvas.focus();
}

function pointerVelocity(x: number, y: number, t: number): number {
  const dist = Math.hypot(x - prevX, y - prevY);
  const dt = Math.max(1, t - prevT);
  return Math.min(1, dist / dt / 2.2); // px per ms → 0..1
}

canvas.addEventListener("pointerdown", async (e) => {
  e.preventDefault();
  canvas.setPointerCapture(e.pointerId);
  if (!isReady()) await begin();
  pressed = true;
  prevX = e.clientX;
  prevY = e.clientY;
  prevT = now();
  strike(nearestString(e.clientY), 0.6);
});

canvas.addEventListener("pointermove", (e) => {
  if (!pressed) return;
  const t = now();
  const v = pointerVelocity(e.clientX, e.clientY, t);
  for (const i of crossed(prevY, e.clientY)) strike(i, Math.max(0.35, v));
  prevX = e.clientX;
  prevY = e.clientY;
  prevT = t;
});

function release(e: PointerEvent): void {
  pressed = false;
  if (canvas.hasPointerCapture(e.pointerId)) {
    canvas.releasePointerCapture(e.pointerId);
  }
}
canvas.addEventListener("pointerup", release);
canvas.addEventListener("pointercancel", release);

// Keyboard: the number and QWERTY rows play low→high. Documented in the
// canvas's aria-label so a screen-reader user is told how to play.
const KEYS = "1234567890qwertyuiop-".split("");
canvas.addEventListener("keydown", async (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
  const index = KEYS.indexOf(e.key.toLowerCase());
  if (index < 0 || index >= strings.length) return;
  e.preventDefault();
  if (!isReady()) await begin();
  strike(index, 0.7);
});

overlay.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  void begin().then(() => strike(nearestString(strings[10].y), 0.55));
});

muteBtn.addEventListener("click", () => {
  setMuted(!isMuted());
  muteBtn.setAttribute("aria-pressed", String(isMuted()));
  muteBtn.textContent = isMuted() ? "🔇 声音已关" : "🔊 声音";
});

window.addEventListener("resize", layout);
layout();
requestAnimationFrame(draw);
