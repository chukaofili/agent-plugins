---
name: run
description: Use at the start of any task that changes code or docs in a repo, such as a feature, bug fix, refactor, dependency change, opening or reviewing a pull request, or an unattended run. Also when asked to "follow the protocol" or "run the protocol". Matches the task to the skills it needs and carries the working rules that apply across them, covering propose-before-building, the PR size budget, the test bar, browser-verified UI, docs before memory, docs sync, check cadence, clean breaks and delegation.
---

# Run

This is the front door. Match the task to a row, load the skills that row
names, and work under the rules below.

The guardrails in `AGENTS.md` apply whether or not this skill loaded. This
skill adds the rules that only matter once you are changing something.

## Match the task

Say which row you matched, in a sentence, before you start. If the task
changes mid-way (an investigation turns into a fix), match again.

| Task | Load |
|---|---|
| Feature, or any new or changed behaviour | `coding-process`, `testing`, `stacked-prs`, `delegate` |
| Bug fix | `coding-process` (Debugging), `testing` |
| Refactor | `coding-process`, `testing`, `delegate` |
| Choosing, adopting or upgrading a dependency or API | `docs-before-memory` |
| Anything a user sees | The row for the task, plus `verify-ui` |
| Opening a PR | `stacked-prs`, `ship-show-ask`, `sync-docs` |
| Reviewing a PR, or answering review findings | `ship-show-ask`, `merge-gate`, `stacked-prs` |
| Unattended run | `unattended-run`, `delegate`, `usage-limits`, `handoff`, plus the row for the task |
| Context running long, or picking up from a handoff file | `handoff` |

A row names where to start, not a limit. Each skill's own description still
loads it when its subject comes up.

**Nothing to match?** A question that changes nothing (how does this work, why
is it built this way) needs none of this. Answer it, and match a row only if
the answer turns into a change.

## The working rules

1. **Propose before building.** Problem → approaches with trade-offs →
   explicit approval → build. A spec a maintainer handed you is that approval
   for everything it decides: build what's ready, propose only the gaps. When
   debugging, investigate and report first; no speculative fix rounds.
   *(skill: `coding-process`)*
2. **PR size budget: ~300 changed lines, 500 ceiling.** Count hand-written code
   and tests; not lockfiles, generated code, snapshots, fixtures or vendored
   files. Decide the split in the plan, not mid-write. *(skill: `stacked-prs`)*
3. **Test bar.** Every feature gets unit tests and at least one integration
   test; UI features add E2E tests; bug fixes add a regression test you saw
   fail first. Missing harness → ask once, and never substitute throwaway
   tests. *(skill: `testing`)*
4. **UI changes are driven in a real browser, with screenshots in the PR.** If
   the environment can't run a browser, the PR's Testing section says so and
   what was verified instead. *(skill: `verify-ui`)*
5. **Docs before memory.** Never trust training knowledge for a framework,
   package or API. Read the installed version's current docs online before
   adopting or implementing against it. *(skill: `docs-before-memory`)*
6. **Sync docs** after every stacked-PR stage or completed feature, before the
   PR opens. *(skill: `sync-docs`)*
7. **Narrowest relevant check while editing; the full gate at stage
   checkpoints** and before pushing. The commands are in the Project gates
   block of `AGENTS.md`.
8. **Clean breaks over legacy shims** when nothing depends on the old shape.
9. **Delegate the mechanical work, keep the judgement.** This is the default,
   not something to be asked for: if your agent can spawn subagents and
   nobody has turned it off, say how the work splits before you build, put helpers on
   cheaper models, and review what they return. The PR says what was
   delegated. *(skill: `delegate`)*

## The usual order

For work that ends in a PR:

1. Propose, and get approval (rule 1). Handed a spec? Read it first; it may
   already be the approval.
2. Plan the split against the size budget (rule 2), and the split between you
   and helpers (rule 9).
3. Build one atomic commit at a time, running the narrowest check as you go
   (rule 7).
4. Meet the test bar for the change (rule 3), and drive any UI in a browser
   (rule 4).
5. Run the full gate.
6. Sync docs (rule 6).
7. Open the PR with its review-intent label. Whether it may auto-merge is
   the reviewer's call, not yours (see `merge-gate`).

Steps 3 to 7 repeat for each stage of a stack.
