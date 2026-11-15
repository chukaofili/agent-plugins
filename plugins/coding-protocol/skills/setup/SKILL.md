---
name: setup
description: Use when adopting coding-protocol in a repo, upgrading a repo from an older version, or when something it installs is missing or broken, such as no AGENTS.md core, missing ssa-* or merge-* labels, no .github/coding-protocol.json, no merge-gate workflow, no docs/agents/issue-tracker.md, or the label-check and merge-gate checks never reporting. Installs the always-on core and Project gates, the five labels, the gate config, the workflow and the tracker file, then reports the repository settings it cannot change. Safe to run again.
---

# Setup

Installs everything the protocol needs in a repo that the skills alone don't
give it, and upgrades a repo that has an older version. Every step checks what
is already there first, so running it twice changes nothing the second time.

**It ends in a PR, not in a configured repo.** The files it writes go through
review like any other change. The repository settings in step 7 are yours to
change; this skill reports them and stops.

## 1. Look before writing

```bash
git rev-parse --show-toplevel
head -3 AGENTS.md 2>/dev/null          # the header carries the installed version
ls CLAUDE.md .gemini/settings.json 2>/dev/null
ls .github/coding-protocol.json .github/workflows/merge-gate.yml 2>/dev/null
ls docs/agents/issue-tracker.md GLOSSARY.md GLOSSARY-MAP.md docs/adr 2>/dev/null
git remote -v
gh label list --limit 200 --json name --jq '.[].name'
```

From that, say which case this is before changing anything:

- **Fresh:** no `AGENTS.md`, or one with no `coding-protocol v…` header.
- **Upgrade:** the header names an older version.
- **Repair:** the version is current and something below is missing.

On an upgrade or repair, a file that already exists is somebody's decision.
Steps 5 and 6 never overwrite one.

## 2. Infer, then confirm once

Most of what the Project gates need is already in the repo. Read it, fill in
what you can, and show the result before writing anything.

| Gate | Where to look |
|---|---|
| Fast check | The quickest build or type-check script in the manifest (`package.json` scripts, `Makefile`, `justfile`, `pyproject.toml`) |
| Full gate | What CI runs: the steps in `.github/workflows/`, as one local command if the manifest has one |
| Test harnesses | Dev dependencies and config files: a unit runner, a test database or containers for integration, a browser driver for E2E |
| Reviewer | `CODEOWNERS` (in `.github/`, the root or `docs/`) |
| Ask list and `ask_paths` | Directories that hold migrations, schemas, auth, billing and tenant scoping. `git ls-files` for each candidate glob |
| Delegation | Not in the repo. Show the models your harness can spawn helpers on as candidates |
| Usage check | Not in the repo. Name the usage tool or command your harness provides, if it has one |
| Docs inventory | Whether `docs/DOCS.md` exists |
| AI attribution | Trailers on recent commits: `git log -20 --format=%b` |
| Tracker | An existing `docs/agents/issue-tracker.md` wins. Otherwise the remote: GitHub → `github`, GitLab → `gitlab`, none → `local`. Jira, Linear or anything else is `other`, described by the user |
| Domain docs | `GLOSSARY-MAP.md` → multi-context; `GLOSSARY.md` or `docs/adr/` → single-context; neither → `none`. Never create them |
| `merge_approvers`, `humans` | Candidates only: `CODEOWNERS` and whoever reviewed recent PRs |

Then show one block, every line with its value and where it came from:

```
- Fast check:      pnpm typecheck          (package.json "typecheck")
- Full gate:       pnpm run pipeline       (.github/workflows/ci.yml)
- Test harnesses:  unit=vitest, integration=none found, e2e=playwright
- Reviewer:        @alex                   (CODEOWNERS)
- Ask paths:       prisma/migrations/**, src/auth/**   (3 and 14 files)
- Tracker:         github                  (git remote: github.com/acme/app)
- Domain docs:     none
- Delegation:      ?  candidates: <cheapest>, <mid-tier>
- Merge approvers: ?  candidates: @alex, @review-bot
- Humans:          ?  candidates: @alex
```

Ask once: is this right, and what goes in the lines marked `?`. Write only
what they confirm. "Looks fine" confirms the lines you filled in; it doesn't
fill in the ones you couldn't.

- **Say "none found", not "declined".** `declined` in the harness line means
  a person said no to setting one up (see `testing`). You not finding one is a
  different fact.
- **Never write an account you weren't given.** A candidate is a suggestion to
  show, not a value to save. A wrong name in `merge_approvers` either locks
  the gate or hands it to a stranger.
- **Nobody to confirm?** Write the lines you inferred from files, each marked
  `(inferred, unconfirmed)`. Leave both account lists empty, say so at the top
  of the PR, and stop before step 7. An empty `merge_approvers` fails the gate
  closed, which is the safe way to be unfinished.

## 3. The core and Project gates

The core is `references/AGENTS.md` in this skill.

- **Fresh:** copy it to the repo root. If the repo already has an `AGENTS.md`
  of its own, keep that content below the `Project` divider. Don't drop it.
- **Upgrade:** replace everything above the `Project` divider with the new
  core. Keep everything below it exactly as it is, then add any Project gates
  line the new version has and the old one lacks. Coming from 1.x that is
  `Merge gate`; coming from 2.0 it is `Tracker` and `Domain docs`.
- **Repair:** leave it alone.

Fill in the Project gates with what step 2 confirmed. Leave a placeholder
where you have no answer; a placeholder is visible, a guess isn't.

**The tracker file.** `to-spec` and `to-tickets` read
`docs/agents/issue-tracker.md` to know where specs and tickets go. If it
doesn't exist, write it from `references/issue-tracker-<github|gitlab|local>.md`
in this skill. For `other`, write it from the user's own description of how
they track work, in a paragraph. An existing file is the project's: leave it.
A GitHub or GitLab tracker needs `gh repo view` (or `glab repo view`) to
print the project from inside the repo. If it can't, say what's missing and
write `local` until it can.

Then make sure the agent in use reads it:

| Agent | Step |
|---|---|
| Codex, Cursor, GitHub Copilot, Amp, Jules, Zed | None. |
| Claude Code | If the repo has a `CLAUDE.md`, it needs a line `@AGENTS.md`. |
| Gemini CLI | `.gemini/settings.json` needs `{ "context": { "fileName": ["AGENTS.md", "GEMINI.md"] } }` |

## 4. Labels

`--force` updates a label that already exists, so this is safe to re-run:

```bash
gh label create ssa-ship --force --color 0E8A16 \
  --description "Nobody needs to look. Approve without reviewing."
gh label create ssa-show --force --color 1D76DB \
  --description "Feedback welcome, not blocking. Approve, then comment."
gh label create ssa-ask --force --color D93F0B \
  --description "Blocking review. Address every finding before merge."
gh label create merge-auto --force --color 0E8A16 \
  --description "Reviewer: automation may merge once approved and green."
gh label create merge-human --force --color B60205 \
  --description "Reviewer: a person lands this. Only a person removes it."
```

Don't wrap these in `|| true`. The error worth seeing is the permission one:
creating a label needs write access. Without it, list the five in the PR and
ask a maintainer to create them.

## 5. The gate config

Write `.github/coding-protocol.json` from `templates/coding-protocol.json`,
with the accounts and paths from step 2.

- `ask_paths` are globs matched against each changed file's path. Turn each
  ask-list area into the paths that hold it in **this** repo
  (`packages/api/src/auth/**`, `prisma/migrations/**`). Check each glob
  matches something: `git ls-files '<glob>' | head -3`. A glob that matches
  nothing protects nothing.
- `.github/**` is always on the ask list. Don't add it.
- **Upgrade or repair:** if the file exists, change nothing in it without
  asking. It is the list of who can open the gate.

## 6. The workflow

**If `.github/workflows/merge-gate.yml` already exists, don't write to it.**
Someone may have pinned it to an exact release, changed its runner or
permissions, or added jobs, and it decides which gate code the repo runs.
Show how it differs from the template and ask before changing anything:

```bash
diff .github/workflows/merge-gate.yml <this skill>/templates/merge-gate.yml
```

If nobody is there to answer, leave the file as it is and list the
differences in the PR. When they do want it migrated, change only what they
agreed to, and keep their pins.

**If it doesn't exist,** copy `templates/merge-gate.yml` there unchanged. It
calls the action at the `coding-protocol-v2` tag, which moves with gate
fixes. To pin an exact release, change the tag in both jobs.

On an upgrade or repair, check you kept your hands off it before committing:
`git status --short .github/workflows/merge-gate.yml` prints nothing unless
they asked for a change.

Commit steps 3, 5 and 6 on a branch, one commit each, and open the PR as
`ssa-ask`: it touches `.github/`, and it installs the thing that would say so.
Nothing gates this PR, because the workflow isn't on the default branch yet.

## 7. Report the settings you can't change

After the PR merges, the checks exist but nothing requires them. Report these
for a maintainer to set on the default branch, and don't set them yourself
even with admin rights. They change who can merge.

- Require a pull request, with at least one approval.
- Require status checks: `label-check`, `merge-gate`, and the repo's CI.
- Do not allow bypassing the above, administrators included.
- Allow auto-merge, if the repo wants cleared PRs to land on their own.
- Leave "dismiss stale approvals" off if a clean rebase should keep its
  clearance. The gate already voids a clearance when the patch changes, and
  that setting would void it on every push.
- **Stacks:** upper stages target stage branches, which a rule on the default
  branch doesn't cover. Use a ruleset whose target includes those branches,
  or land stacks one stage at a time from the bottom.

## 8. Check that it holds

On a throwaway PR, after the settings are in place:

1. Approved, no merge label: `merge-gate` is red and the PR does not merge.
2. The author adds `merge-auto`: still red, and the summary names the author.
3. An account in `merge_approvers` approves, then adds it: green, and the PR
   can merge.
4. Push a commit that only re-indents a line: red again, and the label is
   gone.
5. On a second PR, the reviewer approves and adds `merge-human`: red, and
   neither auto-merge nor the merge button lands it. A person on `humans`
   removes `merge-human` and adds `merge-auto`: green, and it merges.

Five outcomes, five lines in the setup PR or a follow-up comment. If you
couldn't run this (no second account, no admin to set step 7), say that.

## What this gate doesn't stop

Say this to whoever is relying on it:

- **A workflow added in a PR can report a check with the same name.** GitHub
  matches required checks by name, not by which workflow reported them, so an
  author with push access can add a workflow with a job called `merge-gate`
  that always passes. `label-check` puts every change under `.github/` on the
  ask list, and the reviewer holds those with `merge-human`, but that is a
  reviewer catching it, not the platform refusing it.
- **To close it,** an organization can require the workflow itself with a
  ruleset ("Require workflows to pass before merging"), which pins the file
  and the ref. That needs an organization-owned repo.
- **An administrator can always override.** Step 7 asks them not to.

The gate is built to stop an agent that is careless or over-eager. Stopping
one that is trying to get round it takes the ruleset.
