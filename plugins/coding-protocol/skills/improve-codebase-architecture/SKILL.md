---
name: improve-codebase-architecture
description: Use when asked to improve a codebase's architecture, find refactoring or deepening opportunities, review an area for shallow modules, make code easier to test or for agents to navigate, prepare an area before a big build ("how can we make this change easy?"), audit a brownfield or legacy repo, or find the missing seams before writing tests for untestable code. Covers scoping the scan by commit hot spots, the deletion test, presenting candidates with a strength rating and ask-list flags, presenting them as a visual HTML report, stopping for the user to pick one (or picking the top recommendation when unattended, under strict conditions), proposing the deepened interface before any code changes, design it twice on request, and building an approved deepening test-first in tracer-bullet slices within the PR size budget. Not for a bug (see coding-process, Debugging) or for designing a module already chosen (see codebase-design).
---

# Improve codebase architecture

Find architectural friction and propose **deepening opportunities**:
refactors that turn shallow modules into deep ones. The aim is testability,
and code an agent can find its way around.

This skill finds and proposes. It never changes code until the user has
picked a candidate and approved its design.

## Vocabulary

Load `codebase-design` first. Use its terms exactly: **module**,
**interface**, **implementation**, **depth**, **seam**, **adapter**,
**leverage**, **locality**, and the deletion test. Don't drift into
"component", "service" or "layer" for a module, or "boundary" for a seam.
Ask-list names ("security boundaries", "public API shape") are labels, so
quote them as they are.

**Domain docs.** If the repo has a glossary or ADRs for the area, read them
before you scan (see `domain-docs`). Use the glossary's nouns for the
domain: "the Order intake module", not "the OrderHandler". If neither
exists, say nothing about it and carry on.

## 1. Scope before you scan

A deepening pays off by making the next change easier. Code nobody touches
never pays it back. So decide where to look before you look:

- **The user named a direction** (a module, a pain point, a spec they're
  about to build): take it, and skip the rest of this list. "How can we make
  this change easy?" against a coming spec is the most useful prompt.
- **Otherwise, find the hot spots.** Walk back a good stretch of
  `git log --oneline --name-only` and let the files and areas that keep
  coming up pull your attention first. No clear hot spot? Widen the net.

## 2. Explore

Split the work the `delegate` way. A helper on the `mechanical` tier maps
the area and returns facts: the files, what imports what, which modules have
tests and at which interface, and how often each path changed. The helper
gathers; it doesn't judge.

You walk the map and note where you feel friction:

- Understanding one concept means bouncing between many small modules.
- A module is **shallow**: its interface is nearly as complex as its
  implementation.
- Pure functions were pulled out just to be testable, and the real bugs hide
  in how they're called (no **locality**).
- Tightly coupled modules leak across their seams.
- Code is untested, or hard to test through its current interface.

**Apply the deletion test** to anything you suspect is shallow. Would
deleting it concentrate complexity behind a smaller interface, or spread it
across the callers? Only the first earns a candidate.

## 3. Present candidates, then stop

Present them as a visual HTML report, built as in `references/html-report.md`:
one self-contained file, Tailwind and Mermaid from their CDNs, a
before/after diagram for every candidate. Each card names the files, the
problem, the deepening in plain words, the wins in locality and leverage, a
strength (`Strong`, `Worth exploring` or `Speculative`), and any ask-list
flag. The report ends with the one you'd do first and why.

In the reply, give the absolute path, then one line per candidate (title
and strength) and the top recommendation, so the pick can happen in chat.

- **Don't propose interfaces yet.** The report says what to deepen, not how
  the new interface looks. That comes after the pick.
- **Don't pad.** If nothing passes the deletion test, say so. A report where
  every candidate is `Speculative` is a report that found nothing, and should
  read that way.
- **ADR conflicts.** Surface a candidate that contradicts an ADR only when
  the friction is real enough to reopen it, and say so on the card. Don't
  list every refactor an ADR rules out.

Then ask which candidate the user wants to explore, and stop. Nothing has
been decided and no code has changed. The exception is when nobody is there
to pick, or the user says "pick for you" (see Unattended runs below).

**Where the report goes.** In a live session, write it to the OS temp
directory (`$TMPDIR`, falling back to `/tmp`, or `%TEMP%` on Windows) as
`architecture-review-<timestamp>.html`, so nothing lands in the repo. Open
it for the user (`open` on macOS, `xdg-open` on Linux, `start` on Windows).
In an unattended run a temp file doesn't survive, so write it to
`docs/plans/YYYY-MM-DD-<area>-architecture-design.html`, commit it on its
own branch, push it, and link it from the PR or the final report.

**Candidates you won't do now** stay in the report. Offer to file them as
issues, and ask before publishing anything to a tracker.

## 4. Propose the picked candidate

The pick is a problem, not an approval. Take it through propose before
building (see `coding-process`):

1. **Restate it** in a sentence, with the constraints the new interface must
   meet.
2. **Classify its dependencies** (in-process, local-substitutable, remote
   but owned, true external; see `codebase-design`). The category decides
   what sits behind the seam and how the tests cross it.
3. **Propose two or three interfaces** with trade-offs, leading with your
   recommendation. Name the seam the new tests go through, and the old
   shallow tests they will replace.
4. **Get explicit approval** of one. It covers the seam.

**Ask list.** If the deepening touches anything on the ask list (see
`ship-show-ask`, plus the `Ask list` line in Project gates), the design is
the user's decision, not yours. A deepened interface that is a package
export or an endpoint is public API shape. The PR is `ssa-ask`.

**Design it twice only when the user asks.** Follow `codebase-design`'s
`references/design-it-twice.md`: the helpers run on your model, and the
recommendation is yours.

## 5. Build it, once approved

Building the approved deepening is ordinary refactor work: load the `run`
skill's Refactor row. Plan the slices and the split before writing code. The
order inside each slice, and what happens to the old tests, is in
`references/building.md`. In short:

- **The highest existing seam stays green throughout.** It is the proof
  behaviour didn't change. Nothing there? Write those tests first.
- **Tests at the deepened interface come first,** red against a stub, then
  green as the logic moves behind it.
- **Replace, don't layer.** Once the new tests cover a behaviour, delete the
  shallow tests for it in the same slice.
- **Tracer bullets, within the budget** (~300 changed lines, 500 ceiling).
  Bigger deepenings stage as a stack (see `stacked-prs`).

One candidate per build. The rest wait for their own session.

## Unattended runs

With nobody to pick, you pick: take your top recommendation and build it.
The same applies in a live session when the user says "pick for you". The
PR is the proposal. It can't merge until a reviewer approves it (see
`merge-gate`), so picking costs a closed PR at worst.

This is a deliberate exception to the rule in `AGENTS.md` that a missing
design decision is not yours to fill in. It holds only because the
conditions below keep the design small, reversible and off the ask list,
and because the result waits for approval as a PR. Outside them, the rule
stands.

**Pick only when all of these hold:**

- the task asked for improvement, not only a review. "Review this area"
  ends at the report.
- the candidate is `Strong`
- it carries no ask-list flag. An interface that is a package export or an
  endpoint counts as public API shape.
- it sets no new pattern: no new port, and no dependency category the repo
  doesn't already handle somewhere
- it fits one PR under the size budget

Otherwise the run ends at the report: list the open picks as questions and
stop. A refactor nobody asked for is checkpoint 1 in `unattended-run`.

**When you pick, decide the interface the same way:** your recommended
design from step 4, test-first as in step 5. One candidate per run.

**Show the choice in the PR.** Name the candidate and why it won, the
interfaces you weighed and why you chose one, and the candidates you
skipped. Link the report. The PR is `ssa-ask`, whatever its size, because
the design is yours and nobody has approved it yet.

Filing the other candidates as issues is checkpoint 2: leave it as a
question.

---

Adapted from Matt Pocock's `improve-codebase-architecture` skill. MIT licence, Copyright (c) 2026 Matt Pocock; see `LICENSE` in this folder.
