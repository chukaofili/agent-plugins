---
name: ssa-apply
description: Use before opening a pull request, to audit the change and pick its review intent, when writing a PR's description, when a PR's scope changes after it opened, and when a finding arrives after an ssa-show has merged. Covers the three review-intent labels and what belongs under each, the ask list that always forces ssa-ask, auditing the diff to classify it, the matching ## Show note or ## Ask question in the description, setting exactly one label at creation, relabelling, and what the author owes a finding after an ssa-show merges. Reviewing someone else's PR is ssa-review.
---

# SSA apply

The author's half of Ship / Show / Ask: decide what review a PR needs, and
say so on the PR. The reviewer's half is `ssa-review`.

Every change still goes through a PR. The label says what to **do** with the
PR, not whether to open one.

Without it, a reviewer opening a PR can't tell whether you want a rubber
stamp, a conversation, or a gate, so they guess. The usual guess is to review
everything at the same depth, which is how a one-line docs fix waits two days
behind a migration, and how the migration gets the same skim as the docs fix.

## The three intents

| Label | What you're asking for |
|---|---|
| `ssa-ship` | Nobody needs to look. Merges once CI is green, approval lands and the reviewer clears it to merge. |
| `ssa-show` | Feedback welcome, not blocking. Merges once CI is green, approval lands and the reviewer clears it to merge; act on findings afterwards. |
| `ssa-ask` | Pause before it goes live. Wait for approval, and address every finding first. |

What the reviewer does with each is in `ssa-review`.

Approval still lands on all three. `ssa-ship` buys a reviewer who scans the
diff instead of reviewing it, not a merge without a reviewer.

**Approval is not permission to merge.** The reviewer says that separately,
with a `merge-auto` or `merge-human` label, and an approved PR with neither
waits. See `merge-gate`.

**Don't use `ssa-ship` where an approval is an audit control** (SOX, ISO, a
regulated change process). A reviewer can't attest to a change they didn't
review, and "approve after a scan" is the precise thing those controls exist
to catch. If that's the repo, say so in Project gates and treat
`ssa-ship` as unavailable.

## What goes where

**`ssa-ship`** — a feature on an established pattern, an unremarkable bug fix,
a docs or rules update that changes no behaviour, a follow-up applying review feedback, a lockfile bump.
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

## Audit the change

Before `gh pr create`, decide the label from the diff, not from how the work
felt. Read it whole first (`git diff <base>...HEAD`), then go through these in
order and stop at the first that applies:

1. **The ask list.** `git diff --name-only <base>...HEAD`, checked against
   the areas above, the `Ask list` line in Project gates and `ask_paths` in
   `.github/coding-protocol.json`, which is what `label-check` reads. A
   match is `ssa-ask`, however small the change. No `ask_paths` or `Ask
   list` line in the repo means the areas above are the whole list.
2. **A question you need answered before it merges** is `ssa-ask`: "will this
   hold under load?", "is this the right seam?".
3. **Something a reviewer should see:** a new pattern, a refactor, a
   trade-off, an interesting fix. That's `ssa-show`, and it's the default
   for ordinary feature work.
4. **Routine and unremarkable** (see What goes where) is `ssa-ship`. A change
   past the size budget in `stacked-prs` is never one, and neither is a docs
   or rules change that alters what people or agents do: that's a Show.

Torn between two? Take the more cautious. Then write the section the label
needs (see Show and Ask in the PR body), drawn from the same audit: the
part you found worth seeing, or the question you couldn't settle. Then say
which label you chose and why, in a line, in your message to whoever asked
for the PR.

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
repo,** and takes the PR creation down with it. The `setup` skill creates all
three, with the two merge labels, once per repo. If they're missing, run it
before the first PR.

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

## Show and Ask in the PR body

The label decides which section the PR description carries:

| Label | Section |
|---|---|
| `ssa-ship` | None. Nobody is meant to read it. |
| `ssa-show` | `## Show`: a note for the reviewer. |
| `ssa-ask` | `## Ask`: a question for the reviewer. |

```markdown
## Show
<The one thing worth seeing, such as the new pattern, the tricky line or the
trade-off you made, and where it is.>
```

```markdown
## Ask
<The question that made this an Ask, answerable in a sentence.>
```

- **Use the headings exactly as written:** `## Show` and `## Ask`, at level
  two, with nothing added to them. Reviewers and review agents find the
  section by that heading, so `### Show`, `**Show:**` or `## Show (note)`
  won't be found.
- **`Show` is a note, not a summary.** Point at the part of the diff a
  reviewer would miss or most needs to see, by file or function. A restated
  description tells them nothing new.
- **`Ask` is one real question.** Something you don't know and the reviewer
  can answer: "Is a per-tenant index enough here, or do we need a partial
  one?", not "Any thoughts?" or "Does this look good?". On the ask list, name
  the area it touches and what you want confirmed.
- **Relabelling swaps the section.** A Show that grew a migration loses its
  `Show` and gains an `Ask`.

Put it after the template's own sections. Without label permission, the
`Review intent` line above stays first.

## Reviewing

Reviewing someone else's PR at the depth its label asks for is
`ssa-review`. Its verdict and the merge label that follows it are the
reviewer's, never the author's (see `merge-gate`). Answering the findings
works the same under all three labels: verify each, then fix it or push back
(see `ssa-reply`).

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

**Label each stage on its own,** with the audit above run on that stage's
diff alone (against the stage below it, not the default branch). Being in a stack doesn't
make a stage an Ask: the stage that adds the migration is, and the stage that
moves callers onto the new interface may be a Show or a Ship. Each stage is
still its own gate. A reviewer who approved stage 2 has said nothing about
stage 3, and each needs its own approval and merge label.

Putting the whole stack up for review and gating each stage are two different
things, and both are true at once. `stacked-prs` covers the request side and
which stage a stack merge can safely take.
