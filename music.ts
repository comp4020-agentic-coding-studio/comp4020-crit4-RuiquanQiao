// The guzheng's tuning IS the harness for "there is no way to play it wrong".
// A guzheng is strung to a pentatonic scale, so no two open strings can sound a
// dissonant interval — a random sweep is already music. We encode that here and
// assert it in spec/instrument.test.ts, so "no wrong note" is a check that goes
// red if the tuning ever drifts off the scale, not a claim in prose.

// Pitch classes of D major pentatonic, as semitone offsets from C:
//   D=2  E=4  F#=6  A=9  B=11
export const PENTATONIC_PITCH_CLASSES: ReadonlySet<number> = new Set([
  2, 4, 6, 9, 11,
]);

const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export interface GuzhengString {
  /** MIDI note number. */
  readonly midi: number;
  /** Frequency in Hz (equal temperament, A4 = 440). */
  readonly freq: number;
  /** Note name with octave, e.g. "D2". */
  readonly name: string;
}

function midiToFreq(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

function midiToName(midi: number): string {
  return `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

// 21 strings — the standard modern guzheng — ascending from D2 through the
// pentatonic scale. Lowest at index 0.
function buildTuning(count: number, startMidi: number): GuzhengString[] {
  const strings: GuzhengString[] = [];
  let midi = startMidi;
  while (strings.length < count) {
    if (PENTATONIC_PITCH_CLASSES.has(midi % 12)) {
      strings.push({ midi, freq: midiToFreq(midi), name: midiToName(midi) });
    }
    midi += 1;
  }
  return strings;
}

export const TUNING: readonly GuzhengString[] = buildTuning(21, 38); // D2 up
