---
name: stacked-prs
description: Use when a change is likely to exceed ~300 changed lines, when work spans several commits or stages, when opening a pull request, when receiving or responding to review feedback on any pull request, or when rebasing or landing a stack of dependent PRs. Covers the PR size budget and what counts toward it, how to split and stack PRs, sequential stage-by-stage review, and how to handle review findings: verify them, then fix or push back.
---

# Stacked PRs

## The size budget

**Aim for about 300 changed lines per PR, with 500 as the ceiling.** At that
size a human can hold the whole change in their head for a quick pass, and
review agents come back with clean, specific findings instead of skimming.

**What counts:** hand-written code and tests.

**What doesn't count:** lockfiles, generated code (migrations, codegen, OpenAPI
output), snapshots, fixtures and vendored files. They get skimmed, not read.
List which files are generated in the PR body so the reviewer knows what to
skip.

**Split before writing, not after.** The split is decided in the plan (see
`coding-process`). If a planned stage would pass 500, re-plan it. Common
seams:

- **Tests may land as their own stage.** For example, logic with unit and
  integration tests, then UI with E2E tests.
- Schema or data model, then the service using it, then the API surface, then
  the UI.
- A refactor that makes the change easy, then the change.
- A docs sync that's too big to ride along gets a docs-only stage on top.

**Genuinely unsplittable** changes, such as one cohesive migration or a rename
across 80 files, may go over. The PR body says why, and points the reviewer to
the part that actually needs reading.

Atomic commits still apply inside each PR. The budget is per PR, and it
doesn't replace commit hygiene.

## Stacking

Multi-stage work ships as a **stack of PRs**, never as one branch carrying the
whole plan. Each PR is one stage, and it targets **the previous stage's
branch**, not `main`. So every diff the reviewer sees is just that stage's
change, and a risky stage (a migration, an auth change) can be reviewed and
reverted on its own.

- Branch each stage off the previous stage's head. Only the bottom PR targets
  `main`:
  ```bash
  gh pr create --base <previous-stage-branch>
  ```
- Note the position in each PR body (`Stacked on #123`) so a reviewer who opens
  one out of order knows what they're looking at.
- **Land bottom-up.** When a base branch changes (a review fix, or the base
  merging), rebase the branches above it and force-push *those*. Force-pushing
  your own unmerged stack branches is routine. Force-pushing `main` or a
  shared branch never is.
- After any PR in the stack merges, sync the rest onto the new base before
  starting the next stage.
- Fixes from a review or verification pass on a UI surface ship as a new stage
  on top, so the build and the fixes stay separately reviewable.
- Stacking tools such as `gh stack`, Graphite or git-town are optional. Plain
  git and `gh` are enough.

## Sequential review

**Review a stack one stage at a time.** Request review from the project's
reviewer (see Project gates in `AGENTS.md`) on the bottom PR only, then:

1. Request review on that one stage.
2. Address every finding (see below).
3. Re-request review, and repeat until the stage is **approved**.
4. Only then request review on the next stage up.

Don't request review on the whole stack at once. A finding on stage 1 can
invalidate comments already written on stages 2 to 5, and sequential review
keeps reviewer effort bounded.

If a stage stalls (no review coming back, or a finding that needs a product
decision), flag it and keep building the stages above it locally where they
don't depend on the answer.

## Handling review findings (any PR, stacked or not)

- **Verify each finding technically** before acting on it. Read the code it
  points at, and reproduce the issue if you can.
- **Fix it, or push back with reasoning.** Reviewers, human or bot, are
  confidently wrong as a normal event. Making a bad change to look agreeable is
  worse than arguing. No performative agreement.
- **Judge findings by real-world probability.** Push back on fixes for
  scenarios that can't realistically happen, and on suggestions that add
  complexity for no real gain.
- **Don't add tests that can't fail.** A test that passes whether or not the
  bug exists is noise. Run it against the broken code first (see `testing`).
- Reply to each finding so the reviewer can see what happened to it: fixed in
  which commit, or why not.
