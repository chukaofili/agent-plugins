---
name: uninstall
description: Use when removing coding-protocol from a repo, when asked to uninstall, remove, tear down or back out the protocol or its merge gate, or when a repo should stop running the label-check and merge-gate checks. Removes what the setup skill installed, namely the core in AGENTS.md, the gate config, the merge-gate workflow and an unedited tracker file, keeps the project's own content and the labels unless told otherwise, and reports what only a maintainer or the agent's own tooling can remove.
---

# Uninstall

The reverse of `setup`. It removes what `setup` wrote to the repo and leaves
everything the project wrote for itself.

**It ends in a PR,** like `setup`. And like `setup`, the repository settings
are yours to change: this skill checks them, reports them, and stops.

## 1. Look before removing

```bash
head -3 AGENTS.md 2>/dev/null          # is the core here, and which version
ls CLAUDE.md .gemini/settings.json 2>/dev/null
ls .github/coding-protocol.json .github/workflows/merge-gate.yml 2>/dev/null
ls docs/agents/issue-tracker.md 2>/dev/null
gh label list --limit 200 --json name --jq '.[].name'
```

List what you found and what you're about to remove, before removing any of
it. If `AGENTS.md` has no `coding-protocol v…` header, the core isn't
installed: there is nothing of ours in that file, so leave it alone.

## 2. The required checks come off first

**Don't open the PR until this passes.** If `label-check` or `merge-gate` is
still a required check when its workflow is deleted, every pull request
after that waits forever on a status nothing will report.

```bash
gh api repos/{owner}/{repo}/rules/branches/<default-branch> \
  --jq '.[] | select(.type == "required_status_checks") | .parameters.required_status_checks[].context'
gh api repos/{owner}/{repo}/branches/<default-branch>/protection/required_status_checks \
  --jq '.contexts[]'
```

The first covers rulesets, the second classic branch protection. A repo can
use either or both, so **both have to come back clear.** One clean answer
says nothing about the other mechanism.

| Rulesets lookup | Classic lookup | Do |
|---|---|---|
| Lists either check | Anything | Stop. Still required. |
| Anything | Lists either check | Stop. Still required. |
| Succeeds, lists neither | Succeeds, lists neither | Go on. |
| Succeeds, lists neither | Errors | Stop. Classic is unverified. |
| Errors | Succeeds, lists neither | Stop. Rulesets are unverified. |
| Errors | Errors | Stop. Nothing is verified. |

An error is not a "no". The classic lookup needs admin rights, and without
them it answers 403 or 404 whether or not protection exists. It answers 404
for a branch with no classic protection too, so expect this row often.

**When you stopped on an error,** ask a maintainer to check the mechanism you
couldn't read and tell you it doesn't require `label-check` or `merge-gate`.
Their answer clears that row. Name which mechanism you need checked; "is it
safe?" gets a yes that verifies nothing.

**When you stopped because a check is still required,** ask a maintainer to
stop requiring both, then run this step again.

**Nobody to ask:** stop here and report which row you hit. Don't remove the
workflow on a guess.

Don't change the setting yourself, even with admin rights. It decides who can
merge.

## 3. The gate

```bash
git rm .github/workflows/merge-gate.yml .github/coding-protocol.json
```

If the workflow has jobs beyond `label-check` and `merge-gate`, someone added
them. Remove our two jobs and keep the file.

## 4. The core

In `AGENTS.md`, remove everything from the `coding-protocol` header comment
down to and including the `Project` divider line. Keep everything below it:
that part was always the project's.

- **The Project gates block stays,** minus its `Merge gate` line, which
  points at a file that no longer exists.
- **`docs/agents/issue-tracker.md`** goes only if it still matches the
  template `setup` wrote it from (`setup/references/issue-tracker-*.md`),
  and its `Tracker` line goes with it. If the project has edited it, it is
  theirs now: keep both. The rest (the fast check, the full
  gate, the test harnesses) is still true and still useful to whoever reads
  the file next.
- **If nothing is left** but the Project gates, ask whether to keep the file.
  With nobody to ask, keep it.
- **Pointers go only if the file goes.** The `@AGENTS.md` line in `CLAUDE.md`
  and the `fileName` entry in `.gemini/settings.json` stay as long as
  `AGENTS.md` does.

## 5. Labels stay, unless you're told otherwise

Leave `ssa-ship`, `ssa-show`, `ssa-ask`, `merge-auto` and `merge-human`
alone. Deleting a label strips it from every pull request that ever carried
it, open and closed, and that history doesn't come back.

Delete one only when a maintainer names it, in so many words:

```bash
gh label delete merge-auto --yes
```

"Uninstall everything" doesn't name a label. Ask.

## 6. Open the PR

One commit for the gate, one for the core. The PR says what was removed, what
was kept and why, and lists what's left for a person (step 7).

Label it `ssa-ask` if the labels still exist: it touches `.github/`, and it
removes a control. The gate won't check this PR, because step 2 already
stopped requiring it. That is the one PR it can't vouch for, so it wants a
real review.

## 7. Report what's left

Things this skill can't or won't remove:

- **The skills.** They live with the agent, not the repo:
  `/plugin uninstall coding-protocol@agent-plugins` in Claude Code, or
  `npx skills remove` for the skills CLI.
- **Other repository settings.** Required approvals and auto-merge were the
  repo's before the protocol and stay as they are.
- **Work the protocol produced.** `docs/plans/`, `docs/DOCS.md` and
  `docs/screenshots/` are the project's records. Leave them.
- **Open pull requests.** Their labels stay on them and mean nothing once the
  checks are gone. Say so, so nobody waits on a `merge-auto` that no longer
  does anything.

## Starting over, not leaving

To reset a broken install, run this skill and then `setup`. `setup` on its
own never overwrites the config or the workflow, which is why a reset has to
remove them first.
