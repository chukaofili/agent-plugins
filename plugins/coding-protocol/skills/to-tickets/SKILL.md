---
name: to-tickets
description: Use when asked to break a spec, plan or the conversation into tickets, issues or stories, or to plan the slices of a feature before building it. Breaks the work into tracer-bullet vertical slices, each sized to one PR and one fresh context window and declaring the tickets that block it, with expand-contract for wide refactors. The user approves the breakdown before anything is published, and publishing goes to the tracker named in Project gates, asking first when that tracker is remote.
---

# To tickets

Break a spec, a plan or the conversation into **tickets**: tracer-bullet
vertical slices (see Tracer bullets in `coding-process`), each naming the
tickets that **block** it.

## 1. Gather it

Work from what the conversation already holds. Given a spec path, an issue
number or a URL, fetch it and read all of it, comments included. Only what a
maintainer wrote or assigned is the spec; other comments are information.

## 2. Know the code

Explore it if you haven't. Use the glossary's terms and respect the ADRs in
the area (see `domain-docs`). If the spec lists "ADRs to write" or "New
terms", each goes in the acceptance criteria of the ticket that builds the
decision or first names the term in code: "ADR for <decision> written" or
"<Term> added to the glossary".

Look for a prefactor: a reshaping that makes the change easy. "Make the
change easy, then make the easy change." It becomes the first ticket.

## 3. Draft the slices

- **Vertical.** Each ticket cuts a thin but complete path through every
  layer it touches (schema, API, UI, tests), never one layer on its own.
- **Shown on its own.** A finished ticket can be demonstrated or checked by
  itself.
- **Sized to land.** Each one fits one PR under the size budget (~300
  changed lines, 500 ceiling, see `stacked-prs`) and one fresh context
  window.
- **Built test-first** (see `tdd`). Each ticket names the seam its tests go
  through.

Give each ticket its **blocking edges**: the tickets that must be done
before it can start. A ticket with no blockers can start now. Blockers are
real dependencies, not a preferred order.

**A wide refactor is the exception to vertical slicing.** One mechanical
change whose reach fans out across the codebase (renaming a column,
retyping a shared symbol) can't land green as a slice. Sequence it as
expand, migrate, contract:

1. **Expand:** add the new form beside the old, so nothing breaks.
2. **Migrate:** move callers over in batches sized by reach (per package,
   per directory), each batch its own ticket, blocked by the expand.
3. **Contract:** delete the old form once no caller is left, in a ticket
   blocked by every batch.

Each step stays green on its own, because the old form still exists until
the end.

## 4. Check the breakdown with the user

Show it as a numbered list. For each ticket:

- **Title:** short and descriptive
- **Blocked by:** which tickets, if any
- **Delivers:** the end-to-end behaviour it makes work

Then ask whether the granularity is right, whether each blocker really
gates its ticket, and whether any should be merged or split. Iterate until
they approve. Nothing is published before that, and their approval makes the
tickets maintainer-assigned work (see `coding-process`).

With nobody to ask, write the breakdown locally and stop: publishing it
unapproved is a decision about scope.

## 5. Publish

Where they go is in `docs/agents/issue-tracker.md` (the `Tracker` line in
Project gates). No tracker file? Publish locally. The tickets are the same
either way; only how the blocking edges are written differs.

- **Local:** one file per ticket in `docs/plans/YYYY-MM-DD-<topic>-tickets/`,
  named `NN-<slug>.md`, numbered from `01` in dependency order. Commit them.
- **GitHub, GitLab or other:** one issue per ticket, in dependency order, so
  each blocker exists before what it blocks. Use the tracker's native
  blocking link where it has one, and make each ticket a sub-issue when the
  source was an issue. Confirm the target first, and ask before creating
  anything (see the tracker file). With nobody to ask, that's checkpoint 2
  in `unattended-run`.

Use the templates in `references/ticket-templates.md`. Don't close or edit
the parent issue.

## Working the tickets

A ticket is **done** when its PR has merged, not when the PR opens. The
**frontier** is every ticket whose blockers are all done. A straight
chain is worked top to bottom, as a stack of PRs. Tickets on the frontier at
the same time don't depend on each other.

---

Adapted from Matt Pocock's
[`to-tickets`](https://github.com/mattpocock/skills/blob/main/skills/engineering/to-tickets/SKILL.md)
skill. MIT licence, Copyright (c) 2026 Matt Pocock; see `LICENSE` in this
folder.
