---
name: ship-show-ask
description: Use when opening a pull request and choosing its review intent, when the ssa-ship/ssa-show/ssa-ask labels are missing from a repo, when reviewing anyone's PR, when deciding whether a finding blocks a merge or ships as a follow-up, or when a PR's scope changes mid-review. Covers the three review-intent labels, what belongs under each, the project ask list that always forces ssa-ask, setting exactly one label at creation, what a reviewer does with each label, and what the author owes a finding that arrives after an ssa-show has merged.
---

# Ship / Show / Ask

Every change still goes through a PR. The label says what to **do** with the
PR, not whether to open one.

Without it, a reviewer opening a PR can't tell whether you want a rubber
stamp, a conversation, or a gate, so they guess. The usual guess is to review
everything at the same depth, which is how a one-line docs fix waits two days
behind a migration, and how the migration gets the same skim as the docs fix.

## The three intents

| Label | Author | Reviewer |
|---|---|---|
| `ssa-ship` | Nobody needs to look. Merge once CI is green and approval lands. | Approve without reviewing. No findings, no comments. |
| `ssa-show` | Feedback welcome, not blocking. Merge once CI is green and approval lands; act on findings afterwards. | Review, then approve. Findings are comments on an **approving** review, never changes-requested. |
| `ssa-ask` | Pause before it goes live. Wait for approval, and address every finding first. | Review, and block if warranted. Request changes when something must be fixed before merge. |

Approval still lands on all three. `ssa-ship` buys a reviewer who doesn't read
the diff, not a merge without a reviewer.

**Don't use `ssa-ship` where an approval is an audit control** (SOX, ISO, a
regulated change process). A reviewer can't attest to a change they didn't
read, and "approve without reviewing" is the precise thing those controls
exist to catch. If that's the repo, say so in Project gates and treat
`ssa-ship` as unavailable.

## What goes where

**`ssa-ship`** — a feature on an established pattern, an unremarkable bug fix,
a docs or rules update, a follow-up applying review feedback, a lockfile bump.
None of these hold when the change touches the ask list below.

**`ssa-show`** — a new approach or pattern worth seeing, a refactor, an
interesting bug and how it was fixed. Anything where the feedback improves the
**next** change rather than this one.

**`ssa-ask`** — "will this work?", "how do we feel about this approach?", "I
need help making this better". Plus the ask list below, which is not a
judgement call.

**Default to `ssa-show`** for ordinary feature work inside the size budget
(see `stacked-prs`). **When unsure, go one step more cautious.**

Asking on everything is a trust problem, not a safety measure, and the answer
is to Show more rather than Ask more. A reviewer gating twelve PRs reads none
of them properly, so a protocol where everything is an Ask gates nothing.

## The ask list

These always get `ssa-ask`, in every repo:

- the data model, schemas and migrations
- authentication and authorization
- billing and payments
- multi-tenant scoping
- security boundaries
- the public API shape

A project's own areas go in the `Ask list` line of the Project gates block in
`AGENTS.md`, because an agent has to know them without loading a skill:

```
- Ask list:        <areas that always need ssa-ask, beyond the list above>
```

**That line only adds.** It can't take migrations or auth off the list. The
one repo where someone wants to is the repo where it matters.

**The ask list outranks every other rule here,** including the Ship examples
above and the fix-forward rule below. Label a PR by **what it touches**, not
by how routine it looks or where it came from. A one-line change to an
authorization check is an Ask; so is the follow-up that fixes it. Where
`ssa-ship` is off the table entirely because approval is an audit control, the
floor for everything is `ssa-show`.

## Setting it

**At creation, exactly one of the three:**

```bash
gh pr create --label ssa-show
```

At creation, because the label is the first thing a reviewer reads; adding it
after they've opened the PR hasn't told them anything. Two of them tell them
nothing at all — `gh pr view <number> --json labels` shows what's actually on
a PR.

**`gh pr create --label` fails outright when the label doesn't exist in the
repo,** and takes the PR creation down with it. Create all three once per
repo, before the first PR:

```bash
gh label create ssa-ship --force --color 0E8A16 \
  --description "Merge when green. Approve without reviewing."
gh label create ssa-show --force --color 1D76DB \
  --description "Feedback welcome, not blocking. Approve, then comment."
gh label create ssa-ask --force --color D93F0B \
  --description "Blocking review. Address every finding before merge."
```

`--force` updates a label that already exists instead of failing, so this is
safe to re-run and safe to paste into a repo someone else already set up.
Don't wrap it in `|| true`: the error worth seeing here is the permission one
below, not "already exists".

**No permission to label?** Creating a label needs write access to the repo,
and applying one needs triage access or better **on the base repo**. That's
about your permissions, not about where the branch lives: working from your own
fork with triage access on the base repo, label the PR the usual way.

Without those permissions — the ordinary case for an outside contributor — put
the intent in the PR body instead, as its first line, and ask a maintainer to
apply the label, and to create the three if the repo hasn't got them:

```markdown
**Review intent:** show — feedback welcome, not blocking.
```

**Relabel if the scope changes mid-review.** A Show that grew a migration is
an Ask. The label has to match what the PR needs **at merge time**, not what
it needed when you opened it. Say in a comment that you relabelled and why,
because a reviewer who already approved won't go back and re-read the label.

## Reviewing

- **`ssa-ship`:** approve it. Reading it isn't the job; CI is. If you find
  yourself wanting to review it, the label is wrong — say that, rather than
  reviewing it quietly.
- **`ssa-show`:** review it properly, and approve it anyway. Findings go in as
  comments on the approving review. Requesting changes on a Show is the one
  move the label exists to prevent.
- **`ssa-ask`:** review it, and block when something must be fixed first.
  Approving an Ask you have doubts about throws away the only gate the author
  explicitly asked for.

**Found something blocking on an `ssa-show`? Say so in the comment.** Spell out
what you think breaks and that you'd hold the merge for it. Silently
requesting changes is worse than either option: the author set out to merge,
and reads a process failure instead of your actual concern.

Verifying a finding, then fixing it or pushing back, works the same under all
three labels — see Handling review findings in `stacked-prs`. The label
changes **when** a finding gets handled, never whether it gets taken
seriously.

## After an `ssa-show` merges

The Show bargain is that feedback arriving after the merge still gets
answered:

- Every post-merge finding gets a **fix-forward PR** or a **reply saying why
  not**. A fix-forward is usually an `ssa-ship`, since applying review feedback
  is a Ship, but **label it by what the fix touches.** Feedback on a Show can
  expose a tenant-isolation defect whose repair changes authorization: that
  one is an `ssa-ask`, because a finding's origin doesn't move auth off the ask
  list. Sending that repair to a reviewer who was told not to read it is the
  worst thing this protocol can do.
- **If a finding shows the change broke something, revert first,** then fix
  forward. Debugging on `main` is how a Show becomes an incident.

## Stacks

**Every stage of a stack is `ssa-ask`.** The stack exists because the change
was too big to take in at once, so each stage is its own gate, and a reviewer
who approved stage 2 has said nothing about stage 3.

Putting the whole stack up for review and gating each stage are two different
things, and both are true at once. `stacked-prs` covers the request side and
which stage a stack merge can safely take.
