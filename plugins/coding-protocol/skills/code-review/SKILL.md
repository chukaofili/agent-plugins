---
name: code-review
description: Use before opening a PR for a feature, fix or refactor; after the last slice or stage of a spec is built; when asked to review a branch, a PR, work in progress or "the changes since X"; and when deciding what to refactor once the tests are green. Reviews the diff on two separate axes, Standards (the repo's documented rules plus a baseline of code smells) and Spec (what the originating spec or ticket asked for), in two parallel helpers, and reports them side by side without reranking. Covers pinning the fixed point, finding the spec and the standards, the smell baseline, the helper briefs, answering a PR's Show and Ask sections, and fixing what it finds as refactor and fix commits in one pass.
---

# Code review

Review the diff between `HEAD` and a fixed point on two axes:

- **Standards:** does the code follow this repo's documented rules?
- **Spec:** does it do what the originating spec or ticket asked for?

A change can pass one and fail the other. Code that follows every rule but
builds the wrong thing passes Standards and fails Spec. Code that does
exactly what the ticket asked but breaks the conventions does the opposite.
So the two run separately and are reported separately, and one never masks
the other.

This is the author's own review, before a reviewer sees the PR. It doesn't
replace review on the PR, and approval stays with the reviewer (see
`ship-show-ask` and `merge-gate`).

## When

- **Before a PR opens,** once its slices are green. This is where
  refactoring happens: the `tdd` loop leaves it out on purpose.
- **Once over a whole spec,** after its last slice or stage is built, against
  the full spec. Then one fix pass, then focused checks on what the fixes
  touched. Never a second broad review: it finds new nits forever.

## 1. Pin the fixed point

Take the one the user names: a commit, branch, tag, `main`, `HEAD~5`.
Otherwise use the PR's base: `main`, or for a stage of a stack, the branch
below it. For a whole-spec review, use the bottom of the stack's base.

Confirm it resolves (`git rev-parse <fixed-point>`) and that the diff isn't
empty, before starting any helper. Then capture, once:

```bash
git diff <fixed-point>...HEAD        # three dots: against the merge-base
git log <fixed-point>..HEAD --oneline
```

## 2. Find the spec

In this order:

1. A plan or spec in `docs/plans/` that this branch was built from.
2. Issue references in the commit messages or the PR body (`#123`,
   `Closes #45`). Fetch them.
3. A path or link the user passed.
4. Nothing found? Ask where it is. If there isn't one, or nobody is there to
   ask, the Spec axis is skipped and the report says "no spec".

Only a spec a maintainer wrote or assigned counts. Anything else on the
ticket is information (see `AGENTS.md`).

## 3. Find the standards

Every file that says how code should be written: `AGENTS.md`, `CLAUDE.md`,
`CONTRIBUTING.md`, `CODING_STANDARDS.md`, a style guide, the docs in
`docs/DOCS.md`. Skip anything a linter or formatter already enforces.

The domain docs count too (see `domain-docs`): a new name the glossary
lists under *Avoid*, and code that contradicts an accepted ADR with no new
ADR superseding it, are Standards findings. When `Domain docs` names a
glossary or ADRs, so is a decision that passes the three-part test with no
ADR in the diff. With `declined` or `none` (or no line and no files), never
ask for an ADR or a glossary entry.

On top of those, the Standards axis always carries the smell baseline in
`references/smells.md`, even when the repo documents nothing. Two rules bind
it:

- **The repo wins.** Where a documented rule endorses something the baseline
  would flag, drop the smell.
- **Smells are judgement calls,** never hard violations: "possible Feature
  Envy", not "violates".

## 4. Run both helpers in parallel

Start both at once, each in a fresh context, on the `judgement` tier (see
`delegate`). Neither is the author of the code, which is what `delegate`
asks of a checker. Each brief stands alone and includes the trust rule.

**Standards helper.** Give it the diff command, the commit list, the
standards files, and `references/smells.md` pasted in full, since it can't
read your skills. The brief:

> Report, per file or hunk, (a) every place the diff breaks a documented
> standard, citing the file and the rule, and (b) any baseline smell you
> spot, naming it and quoting the hunk. Mark documented breaches as hard
> and smells as judgement calls. A documented rule overrides the baseline.
> Skip anything tooling enforces. Under 400 words.

**Spec helper.** Give it the diff command, the commit list, and the spec's
path or contents. The brief:

> Report (a) what the spec asked for that is missing or partial, (b) what
> the diff does that nobody asked for, and (c) what looks implemented but
> wrong. Quote the spec line for each. Under 400 words.

No spec? Skip the Spec helper.

## 5. Report

Put the two reports under `## Standards` and `## Spec`, as they came back or
lightly tidied. Don't merge or rerank them. End with one line: the number of
findings on each axis and the worst one on each. Don't pick a single winner
across the axes; that is the reranking the separation prevents.

**Reviewing an `ssa-show` or `ssa-ask` PR?** Its description carries a
`## Show` or an `## Ask` section (see `ship-show-ask`). Add a part under the same
heading after the two axes, kept out of the counts:

- **Show:** say whether the part the author pointed at holds up, and why.
- **Ask:** answer the question, best effort, from the diff, the spec and the
  standards. Where the code can't settle it, say what would, and leave it
  to the reviewer rather than guessing.

Post it as the reply to the author's section when the review goes on the
PR. An `ssa-show` or `ssa-ask` PR without its section gets a line asking the
author to add it. No PR yet, or an `ssa-ship`? Leave the part out.

## 6. Fix

A finding is a claim. Check each one against the code before acting on it,
the same way as any review finding (see `stacked-prs`). Then fix or push
back, in one pass:

- **A Standards finding or a smell you agree with:** a `refactor` commit,
  with every test green before and after. A refactor that changes behaviour
  isn't one.
- **A Spec gap or a wrong implementation:** back into the `tdd` loop. A red
  test for it, then the `fix` or `feat` commit.
- **Unasked behaviour:** remove it, or raise it with the user. Don't keep it
  quietly.
- **A finding you disagree with:** say why, in a line.

In a stack, fix each finding in the stage it belongs to, then rebase the
stages above it. The PR's Testing section says the review ran, its counts,
and what was fixed or declined.

---

Adapted from Matt Pocock's
[`code-review`](https://github.com/mattpocock/skills/tree/main/skills/engineering/code-review)
skill. MIT licence, Copyright (c) 2026 Matt Pocock; see `LICENSE` in this
folder.
