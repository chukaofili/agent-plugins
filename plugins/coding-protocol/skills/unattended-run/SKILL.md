---
name: unattended-run
description: Use when executing an approved plan end to end without a human watching. Typical cues are "here's the plan, go", "work on this overnight", "run autonomously", "I'll be back in a few hours", or a long session started before a meeting. Covers what the agent may decide alone, the four checkpoints it must never pass, keeping work durable (commit and push often), delegating to subagents, and how to leave blockers so the work is reviewable when the human returns.
---

# Unattended run

This is the mode for "here is the plan, go": implement it end to end without
anyone at the keyboard, and be reviewable when the human comes back. It isn't
tied to a time of day. It applies to any stretch where nobody is watching to
answer a question.

## It presupposes an approved plan

This mode does not waive propose-before-building (see `coding-process`). It is
what happens **after** approval. Inside the approved plan, decide reversible
implementation details yourself and write each assumption down. A documented
assumption beats a session that spent the night waiting. That is the whole of
the waiver.

## Four checkpoints you never pass alone

These stay checkpoints even when the step is reversible. None of them is a
judgement call.

1. **Scope.** Anything the approved plan doesn't already cover: a new feature,
   a refactor nobody asked for, or dropping a step because it turned out hard.
   **Setting up a missing test harness counts as scope.**
2. **Anything that leaves the machine:** external messages, publishing, or
   calls to a third-party service. Work in the repo (branches, commits,
   pushes, PRs) is inside the plan; talking to the outside world is not.
3. **Anything that spends money:** paid APIs, provisioned infrastructure,
   anything metered.
4. **Anything destructive or irreversible:** data loss, force-pushes to shared
   branches, production.

## Keep the work durable

- **Isolate first.** Use a worktree unless the harness already gave you one.
  An unattended run is exactly when someone else may touch the main checkout.
- **Commit and push after each logical unit**, not just at the end. Unpushed
  work is lost if the session ends abruptly. In this mode, this overrides the
  usual "ask before committing".
- **Never go into a pause with uncommitted work.** If your agent exposes usage
  limits, pause near the limit, wait for the reset, then resume.
- **Run the full gates at checkpoints, not after every edit.** Mid-edit, run the
  narrowest check that would catch what you just changed: one package's type
  check, or one test file. Run the build, lint, full test suite and
  CI-equivalent gate once a unit of work is complete and before it's pushed
  for review. Re-running a suite that passed ten minutes ago, on code you
  haven't touched, spends compute to learn nothing.

## Delegation (if your agent can spawn subagents)

- **Delegate mechanical work to cheaper models:** cloning an existing
  structure, boilerplate, syncing docs, repetitive edits. Keep the primary
  model for correctness-critical logic (schema, security boundaries, core
  services) and for judgement calls.
- **Cap concurrency at about five.** Beyond that the audit stops being real,
  and parallel agents collide on the same files.
- **Audit everything delegated.** Never integrate a subagent's output unread.
  Check that it makes sense, follows conventions, and builds and tests green.
  When it's wrong, judge the gap: fix a small one yourself, and send a large
  one back with the correction.

## Blockers

- **Surface them; don't guess.** When a plan step has an explicit checkpoint,
  or hits a genuine blocker (missing infrastructure, a failed assumption),
  flag it clearly rather than inventing a workaround that changes the design.
- **Do everything that doesn't depend on the answer first,** so the human
  returns to a question plus finished work, not a question alone.
- A stalled PR review is a blocker too. Flag it, and keep building the stages
  above it locally where they don't depend on the answer.

## UI verification is not optional when nobody is watching

Driving the UI in a browser is the easiest step to drop when nobody's
watching, and the one whose absence a reviewer can't see in the diff. Follow
`verify-ui`. If the environment genuinely can't run the feature (missing
credentials, infrastructure you don't own), say so in the PR's Testing
section: name what blocked it and what was verified instead. Silence reads as
"verified".

## When you finish

Report the state of the work: what shipped (PRs and branches), what's
waiting on review, every assumption made, and every flagged blocker. Write it
to a handoff in `docs/plans/` if the session is ending.
