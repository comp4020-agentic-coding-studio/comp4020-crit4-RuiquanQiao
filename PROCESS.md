# Process overview

## What I built

A guzheng in the browser. Twenty-one strings are drawn across the page; press
and drag over them and each string the pointer crosses is plucked, so a fast
sweep is a glissando. The same strings play from the number and QWERTY rows, so
it works with mouse, keyboard or touch. Sound is synthesised live with the Web
Audio API — Karplus-Strong plucked strings, a little reverb — never played back.
The strings are tuned to a pentatonic scale, which is the whole idea: whatever
you do to it, it sounds like music.

## The moments that mattered

**I made "no way to play it wrong" a test, not a hope.** The obvious move is to
tune the strings, listen, and trust it. Instead I built the tuning from D2
upward keeping only pitch classes of D major pentatonic, exported the table, and
asserted in `spec/instrument.test.ts` that all 21 strings are pentatonic
degrees. Now the spec line is a check that goes red the instant a string drifts
off the scale, which is stronger than any sentence I could write about it.
[`fef614c`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit4-RuiquanQiao/commit/fef614c)
· [`fef614c...515e53d`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit4-RuiquanQiao/compare/fef614c...515e53d)

**I chose Karplus-Strong because my ear is the harness this week.** A plain
oscillator would have passed every automated check and still sounded like a toy,
and no test I can write knows the difference. So I used a physical model — noise
through a delay line tuned to the string's period, damped at 0.996 so it decays
like a real string — and rendered each pluck to a buffer up front so playback
adds no per-sample work. The judgement that mattered here I reserved for
listening, which is exactly the split the brief asks for.
[`1134fa5`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit4-RuiquanQiao/commit/1134fa5)

**I turned the autoplay restriction into the invitation.** Browsers refuse to
make sound until a user gesture, which normally shows up as a silent, broken
page. Rather than paper over it, I made the opening screen's first touch do both
jobs — resume the AudioContext and play the first note — so the constraint
became "the opening screen invites the first sound" instead of a bug. I grounded
this by checking that `AudioContext.state` only reaches `running` after a real
gesture, never before.
[`5b11ba1`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit4-RuiquanQiao/commit/5b11ba1)

**I verified expressiveness and cost in the live page, not on faith.** Driving
the instrument in the browser, one top-to-bottom sweep plucked all 21 strings at
once — 21 simultaneous voices, under the cap of 24 I set so a hard glissando
can't clip — and a full redraw measured about 0.1ms, so the animation never
competes with the audio. That the same gesture path is what produces the sound
is why two players sound different.
[`515e53d`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit4-RuiquanQiao/commit/515e53d)

## Before the crit

The one check I can't automate is the ear. Before the session I play it on
speakers — not muted — and listen for latency and feel, because that is the
harness the brief hands me and the green suite can't stand in for it.
