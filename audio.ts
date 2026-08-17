// The audio engine. Sound is synthesised live in the page — never played back
// from a recording — using Karplus-Strong plucked-string synthesis: a burst of
// noise fed into a short feedback delay line tuned to the string's pitch. A
// plain oscillator sounds like a toy; this sounds like a string, and that
// difference is the whole point of "an instrument" the ear can judge.

// Browsers refuse to make sound until a user gesture, so nothing here works
// until unlock() runs inside a real pointer/key event. That is why the opening
// screen's first touch both starts the audio and plays the first note.

const MAX_VOICES = 24; // cap simultaneous notes so a fast glissando can't clip

interface Engine {
  ctx: AudioContext;
  master: GainNode;
  reverb: ConvolverNode;
  bufferFor(freq: number, brightness: number): AudioBuffer;
}

let engine: Engine | null = null;
const voices = new Set<AudioBufferSourceNode>();
let muted = false;

// A short synthesised impulse response: exponentially decaying noise. Gives the
// dry pluck a room to ring in without shipping an audio file.
function makeImpulseResponse(ctx: AudioContext, seconds: number): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const ir = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch += 1) {
    const data = ir.getChannelData(ch);
    for (let i = 0; i < length; i += 1) {
      const decay = (1 - i / length) ** 3;
      data[i] = (Math.random() * 2 - 1) * decay;
    }
  }
  return ir;
}

// One Karplus-Strong pluck, rendered to a buffer up front so playback has no
// per-sample work on the audio thread and latency stays low.
// `brightness` (0..1) shapes the excitation: a hard pluck keeps more high end.
function renderPluck(
  ctx: AudioContext,
  freq: number,
  brightness: number,
): AudioBuffer {
  const sr = ctx.sampleRate;
  const n = Math.max(2, Math.round(sr / freq)); // delay length = one period
  const seconds = 2.6;
  const total = Math.floor(sr * seconds);
  const buf = ctx.createBuffer(1, total, sr);
  const out = buf.getChannelData(0);

  // Excitation: noise, low-passed toward the soft end so a gentle pluck is
  // rounder and a hard one keeps its bite.
  const line = new Float32Array(n);
  const lp = 1 - brightness * 0.9; // 0 = keep all highs, ~1 = very smooth
  let prev = 0;
  for (let i = 0; i < n; i += 1) {
    const white = Math.random() * 2 - 1;
    prev = prev + lp * (white - prev);
    line[i] = prev;
  }

  // The recurrence: average of two neighbours, scaled by a damping factor just
  // under 1 so the note decays instead of ringing forever.
  const damping = 0.996;
  let p = 0;
  for (let i = 0; i < total; i += 1) {
    const cur = line[p];
    const next = line[(p + 1) % n];
    out[i] = cur;
    line[p] = (cur + next) * 0.5 * damping;
    p = (p + 1) % n;
  }

  // Fade the tail so the buffer end can't click.
  const fade = Math.min(1200, total);
  for (let i = 0; i < fade; i += 1) {
    out[total - 1 - i] *= i / fade;
  }
  return buf;
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  if (engine) {
    engine.master.gain.setTargetAtTime(
      value ? 0 : 0.9,
      engine.ctx.currentTime,
      0.02,
    );
  }
}

/** Create/resume the AudioContext. Must be called from a user gesture. */
export async function unlock(): Promise<void> {
  if (!engine) {
    const ctx = new AudioContext({ latencyHint: "interactive" });
    const master = new GainNode(ctx, { gain: muted ? 0 : 0.9 });
    const reverb = new ConvolverNode(ctx, {
      buffer: makeImpulseResponse(ctx, 1.8),
    });
    const wet = new GainNode(ctx, { gain: 0.28 });
    master.connect(ctx.destination); // dry
    master.connect(reverb).connect(wet).connect(ctx.destination); // wet
    // Small per-freq cache: a sweep replays the same strings constantly.
    const cache = new Map<string, AudioBuffer>();
    engine = {
      ctx,
      master,
      reverb,
      bufferFor(freq, brightness) {
        const key = `${freq.toFixed(2)}:${brightness.toFixed(1)}`;
        let b = cache.get(key);
        if (!b) {
          b = renderPluck(ctx, freq, brightness);
          cache.set(key, b);
        }
        return b;
      },
    };
  }
  if (engine.ctx.state !== "running") {
    await engine.ctx.resume();
  }
}

export function isReady(): boolean {
  return engine?.ctx.state === "running";
}

/** Pluck a string. `velocity` (0..1) sets loudness and brightness. */
export function pluck(freq: number, velocity: number): void {
  if (!engine || muted) return;
  const v = Math.max(0.05, Math.min(1, velocity));
  const { ctx, master } = engine;
  const src = new AudioBufferSourceNode(ctx, {
    buffer: engine.bufferFor(freq, v),
  });
  const gain = new GainNode(ctx, { gain: 0.18 + v * 0.7 });
  src.connect(gain).connect(master);

  if (voices.size >= MAX_VOICES) {
    const oldest = voices.values().next().value;
    if (oldest) {
      try {
        oldest.stop();
      } catch {
        // already stopped
      }
    }
  }
  voices.add(src);
  src.addEventListener("ended", () => {
    voices.delete(src);
    gain.disconnect();
    src.disconnect();
  });
  src.start();
}

/** For diagnostics: how many voices are sounding right now. */
export function voiceCount(): number {
  return voices.size;
}
