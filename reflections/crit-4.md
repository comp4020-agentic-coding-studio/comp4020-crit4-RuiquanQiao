# Crit 4 — An instrument

## What was the breakthrough that moved the work forward?

It was realising that the instrument's *tuning* could be the harness, not just a
setting. The spec says "there is no way to play it wrong", and I'd been thinking
of that as something I'd have to feel my way to. But a guzheng is strung to a
pentatonic scale, and that scale is exactly the guarantee: no two open strings
can sound a dissonant interval, so a random sweep is already music. Once I saw
that, I could stop hoping the thing sounded nice and instead write a test that
every one of the 21 strings is a pentatonic degree — turning a subjective
quality into a check that goes red if I ever break it. The same shift solved the
opening: the browser won't make a sound until the player acts, and instead of
fighting that autoplay rule I let it become the invitation — the first touch is
both the unlock and the first note.

## What did this work change about who I want to be as a software developer?

I want to be the kind of developer who pushes judgement into checks wherever a
check can actually reach — and who is honest about where it can't. An agent can
write flawless Web Audio code and never know whether the result sounds like a
string or a toy. So I directed it to build the mechanism and the tests, and kept
the one thing a test can't do — listening — for myself. Drawing that line
deliberately, rather than pretending the green suite means it's good, is the
habit I'm taking from this week.
