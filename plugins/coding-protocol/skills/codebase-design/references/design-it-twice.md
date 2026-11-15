# Design it twice

Your first idea for an interface is rarely the best one. So before building
it, several helpers each design it under a different constraint, and you
compare what comes back.

**Only when the user asks.** It costs several helpers' worth of tokens, and
it is design work, so:

- **The helpers run on your model, not a cheaper tier.** This is the one
  exception to `delegate`'s "set a cheaper model on every spawn". Design is
  judgement.
- **Three helpers, or four** with a ports-and-adapters brief. Never more
  than `delegate`'s limit of five.
- **The decision stays yours.** A helper's design is an input.

## 1. Frame the problem

Write a short explanation for the user and show it to them:

- the constraints any new interface must meet
- the dependencies, and their category (see `deepening.md`)
- a rough code sketch that makes the constraints concrete. It's an
  illustration, not a proposal.

Then start the helpers straight away. The user reads while they work.

## 2. Brief the helpers

Each brief stands alone (see `delegate`'s handoff packet). Give each one:

- the file paths, the coupling, the dependency category, and what sits
  behind the seam
- the vocabulary from the skill, and the project's own terms from
  `GLOSSARY.md` if there is one
- its constraint, different for each helper:
  1. "Minimise the interface: one to three entry points. Maximise leverage
     per entry point."
  2. "Maximise flexibility: support many use cases and extension."
  3. "Optimise for the most common caller: make the default case trivial."
  4. If it applies: "Design around ports and adapters for the dependencies
     that cross the seam."

Each returns:

1. the interface: types, entry points, parameters, invariants, ordering,
   error modes
2. a usage example from a caller's side
3. what the implementation hides behind the seam
4. the dependency strategy and its adapters
5. trade-offs: where leverage is high and where it's thin

## 3. Compare and recommend

Present the designs one at a time, then compare them in prose by depth,
locality and where the seam sits. Then recommend one, and say why. If parts
of two would combine well, propose the hybrid. Be opinionated: the user
wants a strong read, not a menu.

The chosen design goes through the usual approval (see `coding-process`).

---

Adapted from Matt Pocock's `codebase-design` skill, MIT licence.
