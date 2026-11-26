# Building an approved deepening

This is the Refactor row of `run`, applied to one approved candidate. The
rules below say how it fits `tdd`, `coding-process` and `stacked-prs`. They
don't replace them.

## Before the first slice

- **The highest existing seam is green.** `tdd` says a refactor has no new
  red step at the seam that already exists, and that still holds: those
  tests prove behaviour didn't change. Run them first. No tests there? Write
  them against the current code, and prove each one can fail (see
  `testing`).
- **Plan the slices and the split** against the size budget, in the plan.
  If the deepening makes a coming change easy, it is that change's prefactor
  slice (see Tracer bullets in `coding-process`), and it ships ahead of it.

## Inside each slice

The deepened interface is new, so its tests start red. The order:

1. **Stub the new interface** so the test compiles.
2. **Red.** Write one test at the new interface for the behaviour this slice
   moves. Watch it fail on the assertion. This is the one commit allowed to
   be red (see `tdd`).
3. **Green.** Move the logic behind the interface until it passes.
4. **Repoint the callers** this slice covers. The existing seam stays green.
5. **Delete the shallow tests** whose behaviour the new test now covers.
   Never before the new test is green, and never keep both.
6. **Narrowest check, then commit.**

Each test at the new interface asserts what a caller can observe, never
internal state. A test that has to change when the implementation changes is
testing past the interface.

## Seams and adapters

- **Use the seam the approved design named.** A seam you need mid-build that
  nobody agreed is a gap. Raise it; don't add it.
- **Ports, adapters and internal seams** follow the seam discipline in
  `codebase-design`'s `references/deepening.md`.

## Size and staging

- **Fits the budget?** One PR, labelled `ssa-show` (a refactor; see
  `ssa-apply`), or `ssa-ask` if it touches the ask list. A candidate
  the agent picked itself, with nobody to approve the design, is always
  `ssa-ask`.
- **Doesn't fit?** Stage it as a stack, one or more slices per stage, every
  stage `ssa-ask` (see `stacked-prs`).
- **Many callers?** Use the wide-change pattern in `stacked-prs`: the new
  interface beside the old, callers moved over in batches, then the old
  shallow modules and their tests removed. Each step stays green.
- **Clean break.** When nothing outside the repo depends on the old shape,
  delete it. No legacy shim (see `run`, rule 8).

## In the PR

The Testing section carries the usual `tdd` evidence: for each slice, the
test and the failure it showed before it went green. It also lists **each
deleted test and the interface test that now covers it**. Without that, a
reviewer reads deleted tests as lost coverage.

Link the report the candidate came from, if it was written to `docs/plans/`.
