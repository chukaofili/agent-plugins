---
name: merge-gate
description: Use when reviewing a pull request and deciding whether automation may merge it, when a PR is approved but isn't merging, when the merge-auto or merge-human label is missing, wrong or disappeared after a push, when setting up or debugging auto-merge, or when landing a stack. Covers the two merge labels and who may set them, what a reviewer does with them under each review-intent label, which changes need a person to merge, what a push does to merge-auto, the two status checks that enforce the gate, and what the author does while waiting.
---

# Merge gate

Approval and merging are two decisions. Approval says the change is right.
The merge label says who is allowed to land it.

They come apart on exactly the changes that matter. A reviewer can read a
migration that drops a column, run it, find nothing wrong, and still not be
the one who should decide it goes to production tonight. With one signal, the
reviewer has to choose between blocking a correct change and merging an
irreversible one. With two, they approve it and hold the merge.

## The two labels

| State | Meaning |
|---|---|
| No `merge-*` label | Not decided. Nothing auto-merges. |
| `merge-auto` | Automation may merge once the PR is approved and green. |
| `merge-human` | A person lands this. Wins if both labels are present. |

**No label is the default, and it blocks.** A PR nobody has ruled on doesn't
merge by itself, however green it is.

## Who sets them

- **The author sets `ssa-*`** (what review the PR wants). See `ssa-apply`.
- **The reviewer sets `merge-*`** (who may land it).
- **The author never sets a `merge-*` label,** on their own PR or anyone
  else's. An author who can open the gate has no gate.
  The gate enforces this for every author not on `humans`, approvers
  included. A person on `humans` can still clear their own PR, since in a
  one-maintainer repo nobody else could.
- **Only a person clears `merge-human`.** An agent reviewer can add it and
  can't take it back off.

Which accounts count as reviewers and as people is in the gate config (see
Enforcement).

## What the reviewer does

Every review ends with a verdict **and** a merge label, **in that order:
approve first, then add the label.** The gate ties `merge-auto` to the
approval it follows. A label added before the approval doesn't count, and the
check says so.

**`ssa-ship`:** check the `label-check` status first.
- Green: scan the diff (see `ssa-review`), approve, add `merge-auto`. A scan
  isn't a review; that's the label working as intended. A committed secret
  means a comment, not an approval.
- Red: the PR touches the ask list, so the label is wrong. Say so and stop.
  Don't approve, and don't quietly review it as an Ask.

**`ssa-show`:** review, approve, add `merge-auto`. If the PR doesn't match
its Show note yet, or a finding would make you hold the merge, comment
instead of approving (see `ssa-review`) and leave the merge label off. A
comment is never an approval, so the PR waits for the next round.

**`ssa-ask`:** review it by running it, then pick one:

```bash
gh pr edit <number> --add-label merge-auto
gh pr edit <number> --add-label merge-human
```

## When it's `merge-human`

- **The change can't be undone by reverting the commit:** a migration that
  drops or rewrites data, anything that moves money, a change to who can
  authenticate or what they can reach, a change to which tenant sees which
  rows.
- **The PR changes the gate itself:** anything under `.github/`. The checks
  below can't vouch for a change to the checks.
- **You couldn't show it's safe by running it.** Reading a diff and finding
  nothing is not the same as watching it work. If the environment couldn't
  run it, that's a `merge-human`, with the reason.
- **Review went past the round limit.** Two agents can trade findings and
  rebuttals indefinitely. After the limit in the gate config, stop, add
  `merge-human`, and summarise the disagreement for the person who picks it
  up.
- **You're unsure.** Same rule as the review label: one step more cautious.

Say why in a comment when you add it. "merge-human: drops `users.legacy_id`,
not reversible by revert" tells the person what they're being asked to decide.
The label alone doesn't.

`merge-human` is not a finding and not a rejection. An approved PR can carry
it, and usually does.

## The person's side

A PR with `merge-human` waits for someone in the gate config's `humans`. They
read the reviewer's comment, decide, and then either:

- remove `merge-human` and add `merge-auto`, which hands the merge back to
  automation, or
- leave it, and close or rework the PR.

Removing the label is the decision. If anyone else removes it, the gate
treats it as still there.

## After a push

A push after `merge-auto` puts unreviewed code behind a reviewed label, so
the gate re-checks it:

- **The patch is unchanged** (a clean rebase onto a moved base): `merge-auto`
  stays. The reviewer already saw exactly this change.
- **Anything else** (a new commit, a conflict resolution, a fixup):
  `merge-auto` is removed, with a comment saying why. The reviewer reviews
  the new head, approves it, and adds the label again.

"Unchanged" is not anyone's judgement of how small the push was, and it is
not a comparison of diffs. The gate takes the commit the reviewer approved,
replays it onto the base the new head sits on, and requires the result to be
the new head exactly, file for file. If the replay conflicts, or the result
differs by one byte anywhere, the patch changed.

Comparing diffs is what goes wrong here. A diff that ignores whitespace, as
`git patch-id` does, can't tell a `return` inside an `if` from one moved out
of it. A diff that ignores position can't tell an edit to `allow_admin()`
from the same edit to `allow_anonymous()`. The replay has neither blind spot.

In a stack, "the base" is the stage below as the reviewer saw it. When that
stage is rewritten and the stages above are restacked onto it, the gate
replays from the lower stage's tip at the time of the approval, taken from
GitHub's record of every update to that branch (fast-forwards included), so a
restacked stage whose own patch is unchanged keeps `merge-auto`. If that tip
can't be placed, the check stays red and says so.

When the patch did change, the removal comment says how: which files the
replay conflicted in, or which files the new head differs in. That's the part
to re-review.

If the gate couldn't make the comparison (GitHub or git failed), the check
stays red and says so, and `merge-auto` stays on: a failed fetch is not a
changed patch. The next run checks again.

The gate makes this comparison every time it runs, not only when it sees a
push. A missed event can't leave an old clearance standing.

`merge-human` survives every push. Only a person clears it.

## The author's side

- **Arm auto-merge only where the gate is enforced.** Auto-merge waits for
  what branch protection requires, not for these labels. If the PR's base
  branch doesn't require the `merge-gate` check, an armed PR merges on
  approval and green CI alone, straight past a `merge-human`. So check first:
  ```bash
  gh api repos/{owner}/{repo}/rules/branches/<base> \
    --jq '.[] | select(.type == "required_status_checks") | .parameters.required_status_checks[].context'
  gh api repos/{owner}/{repo}/branches/<base>/protection/required_status_checks \
    --jq '.contexts[]'
  ```
  The first covers rulesets, the second classic branch protection, which
  needs admin rights to read. If neither prints `merge-gate`, don't arm it;
  an error counts as "not required", not as "probably fine". That includes every stage of a stack
  above the bottom one, whose base is an unprotected stage branch.
- **Merging without auto-merge is four checks, on the current head:**
  approved, `merge-auto` present, no `merge-human`, CI green. Re-read all
  four right before merging; a push in between changes the answer.
- **Approved with no merge label means wait,** not merge. Ask the reviewer
  for the label if it looks forgotten.
- **`merge-human` is a blocker to flag, not a problem to solve.** Report it,
  link the reviewer's comment, and keep working on whatever doesn't depend on
  it. In an unattended run this is the "destructive or irreversible"
  checkpoint doing its job (see `unattended-run`).
- **Never merge around the gate:** no merging by hand with an admin override,
  no relabelling, no splitting the risky part into a PR with a friendlier
  label.

## Stacks

Each stage carries its own merge label, the same way each carries its own
`ssa-ask`. Approval and `merge-auto` on stage 2 say nothing about stage 3.

A stack merge takes everything up to the PR you name, so that PR has to be
the top of an unbroken run of stages that are **approved and carry
`merge-auto`**. See `stacked-prs` for the walk.

A `merge-human` stage stops the stack there. The stages above it stay open
and reviewable, and land after a person clears it.

## Enforcement

Labels are only a gate if something checks them. The protocol ships two
status checks, installed by the `setup` skill and required by branch
protection:

**`label-check`** passes when:
- the PR has exactly one `ssa-*` label
- if any changed file matches an ask-list path, that label is `ssa-ask`

**`merge-gate`** passes when:
- `label-check` passes
- `merge-human` is not in force
- `merge-auto` is on the PR, last added by an account in `merge_approvers`
  that is not the PR's author, unless that author is on `humans`
- the latest approval from a merge approver covers the current head: the
  same commit, or the same patch
- `merge-auto` was added at or after that approval

Both run from the copy of the workflow on the default branch, so a PR can't
edit its own gate. They run again when a review is submitted or
dismissed (`merge-gate-review.yml` starts `merge-gate-rerun.yml`, which
re-runs the gate for the head), so a dismissed approval turns a green gate red. The config is read from the default branch too:

```json
{
  "merge_approvers": ["<reviewer-account>", "<maintainer>"],
  "humans": ["<maintainer>"],
  "ask_paths": ["**/migrations/**", "**/auth/**", "**/billing/**"],
  "max_review_rounds": 3
}
```

It lives at `.github/coding-protocol.json`. Changes under `.github/` always
count as an ask-list path, so a PR that edits the gate or its config is an
Ask.

**Checks not installed, or not required?** Then the labels are a convention,
nothing stops an armed auto-merge, and everything above still applies: an agent that merges an unlabelled PR because nothing
stopped it has broken the rule, not found a loophole. Say in the PR that the
gate isn't enforced in this repo, and offer `setup`.

**The checks stop mistakes, not a determined author.** GitHub matches a
required check by name, so a workflow added in a PR can report a passing
`merge-gate` of its own. That is why a change under `.github/` is always an
Ask and always `merge-human`. `setup` explains how an organization closes the
gap for good.

**A red `merge-gate` on an approved PR is normal.** It means "not cleared to
auto-merge yet", not "broken". The check's summary says which condition
failed.
