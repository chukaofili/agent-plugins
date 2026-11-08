---
name: stacked-prs
description: Use when a change is likely to exceed ~300 changed lines, when work spans several commits or stages, when opening a pull request, when receiving or responding to review feedback on any pull request, or when rebasing or landing a stack of dependent PRs. Covers the PR size budget and what counts toward it, how to split and stack PRs, landing stacks made with gh stack, how to request review on a stack (CODEOWNERS, or stage by stage when asked), and how to handle review findings by verifying each one, then fixing it or pushing back.
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
- **Every stage is `ssa-ask`,** labelled at creation
  (`gh pr create --label ssa-ask`). The stack exists because the change was too
  big to take in at once, so each stage is its own gate and approval on one
  says nothing about the next. See `ship-show-ask`.
- **Release metadata lands once, in the top PR:** a version bump, a changelog
  heading, a tag. The stack merges as one set of changes, so doing it per
  stage publishes versions nobody ever ran. Lower stages leave the version
  alone and add their notes under the same unreleased heading. If a lower
  stage ends up shipping on its own after all, the bump moves to it.
- **Land bottom-up.** When a base branch changes (a review fix, or the base
  merging), rebase the branches above it and force-push *those*. Force-pushing
  your own unmerged stack branches is routine. Force-pushing `main` or a
  shared branch never is.
- After any PR in the stack merges, sync the rest onto the new base before
  starting the next stage.
- Fixes from a review or verification pass on a UI surface ship as a new stage
  on top, so the build and the fixes stay separately reviewable.
- Stacking tools such as `gh stack`, Graphite or git-town are optional. Plain
  git and `gh` are enough, unless the stack was created with `gh stack` (see
  below).

### Using `gh stack`

**Offer it when starting a new stack.** Ask the user once, before creating the
first branch, whether to use `gh stack`. Use plain git and `gh` if they decline,
or if nobody is there to answer.

**An existing stack keeps the tool it was created with.** Run
`gh stack view --json` on a stack branch to check: exit code 2 means there's no
stack tracked on this machine. For a stack opened elsewhere, use
`gh stack checkout <pr-number>` to pull it down.

- **Load the `gh-stack` skill** if it's available, before running any
  `gh stack` command.
- **If the extension or skill is missing, ask the user before installing it.**
  Include this in the offer, with the commands:
  ```bash
  gh extension install github/gh-stack
  gh skill install github/gh-stack gh-stack --agent <agent> --scope user
  ```
  `<agent>` is your agent's `--agent` value, such as `claude-code` or `codex`
  (`gh skill install --help` lists them). Without the skill name and agent, a
  non-interactive run installs nothing or targets the wrong agent.
  If they decline the extension, use plain git and `gh` for a new stack. An
  existing `gh stack` stack can't land that way, so leave the merge to them.
- **Keep commands non-interactive,** because a prompt or TUI will hang. Always
  use `gh stack view --json` and `gh stack submit --auto`, and pass branch names
  to `init` and `add`.
- **Open PRs with `gh stack submit --auto --open`.** Without `--open` they're
  drafts. In sequential review, leave it off and use `gh pr ready` instead,
  because `--open` marks every PR ready. Titles and bodies are auto-generated, so
  fix them afterwards with `gh pr edit`.
- **Land with GitHub's stack merge, never `gh pr merge`,** which doesn't work on
  stacked PRs. Merge only what the user approved:
  ```bash
  gh stack merge <pr-number> --yes --squash
  ```
  This merges everything up to and including that PR, all or nothing. **So
  `<pr-number>` has to be the top of an unbroken run of approvals from the
  bottom.** Every stage is `ssa-ask`, so an unapproved stage 3 means merging
  stage 2 and stopping — picking stage 4 would carry stage 3 in with it and
  merge straight past its gate. Walk up from the bottom with
  `gh pr view <number> --json reviewDecision` and stop at the first stage that
  isn't `APPROVED`. Branch protection refuses this too where it's configured
  to; don't count on it being configured.

  Without a number, `--yes` merges the whole stack, so only leave the number
  off when every stage is approved. Use the merge method the repo uses
  (`--squash`, `--rebase` or `--merge`). Run `gh stack sync` afterwards.
- **Exit code 9 means stacks aren't enabled on the repo.** Tell the user, and use
  plain git and `gh` instead.

## Requesting review

**Ask who should review.** Before opening the PRs, ask the user once whether
they want a specific reviewer, whether or not the repo has `CODEOWNERS`. Skip
the question if they've already named one, or if nobody is there to answer. A
reviewer they name is requested on every PR with
`gh pr edit <number> --add-reviewer <handle>`, alongside any code owners GitHub
adds.

**By default, put the whole stack up for review.** Open every stage's PR as
ready for review, not as a draft.

Putting the stack up is how review is **requested**; the `ssa-ask` label on
each stage is what gates that stage's **merge**. They read as a contradiction
and aren't: a reviewer can start on any stage, and no stage lands before its
own approval arrives (see `ship-show-ask`).

If the user didn't name a reviewer, check for a `CODEOWNERS` file (in
`.github/`, the repo root or `docs/`):

- **The repo has one:** don't request review. GitHub adds the code owners to
  each new PR. If a PR's files have no owner, nobody gets added, so check with
  `gh pr view <number> --json reviewRequests` and request review on that PR.
- **The repo has none:** request review on every PR from the project's reviewer
  (see Project gates in `AGENTS.md`).

Reviewers can start on any stage, but the stack still lands bottom-up. A fix on
a lower stage means rebasing the branches above it (see Stacking).

If a stage stalls (no review coming back, or a finding that needs a product
decision), flag it and keep building the stages above it where they don't
depend on the answer.

### Sequential review, only when asked

Use this only if the user asks for it. Review the stack one stage at a time,
starting from the bottom PR:

1. Request review on that one stage.
2. Address every finding (see below).
3. Re-request review, and repeat until the stage is **approved**.
4. Only then request review on the next stage up.

In a repo with `CODEOWNERS`, open the higher stages as drafts, since GitHub
doesn't add code owners to a draft. `gh pr ready <number>` puts up the next
stage, and takes the place of steps 1 and 4 unless the user named a reviewer.

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
