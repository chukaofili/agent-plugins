# Changelog

All notable changes to `coding-protocol`. Versions follow
[Semantic Versioning](https://semver.org). Each release is tagged
`coding-protocol-v<version>`. The version appears in
`.claude-plugin/plugin.json`, the marketplace entry and the header comment in
`AGENTS.md`. CI checks that they match each other and this file.

## 2.0.0 — 2026-11-14

Breaking. Approval stops being permission to merge, the always-on core
changes shape, and installing is now a skill.

### Upgrading from 1.x

1. Update the skills (reinstall the plugin, or `npx skills add` again).
2. Run the `setup` skill in each repo. It replaces the core in `AGENTS.md`,
   keeps your Project gates, adds the `Merge gate` line, creates the two new
   labels, and opens a PR with the gate config and workflow.
3. Fill in `merge_approvers` and `humans` in `.github/coding-protocol.json`.
4. Teach your reviewer the new step: every review ends with `merge-auto` or
   `merge-human`, added after the approval. A reviewer that only approves
   will leave every PR waiting.
5. Only then require the `label-check` and `merge-gate` checks in branch
   protection. Until you do, nothing about how PRs merge changes.

Rule numbers changed. Anything that cites "rule 14" needs the new reference:
the PR body of the release has the full mapping.

### Added
- A merge gate. Two labels set by the reviewer say who may land a PR:
  `merge-auto` (automation, once approved and green) or `merge-human` (a
  person). No label means nothing auto-merges. An agent reviewer can now
  approve an irreversible change and still hold its merge for a person. New
  `merge-gate` skill, and a guardrail in `AGENTS.md`.
- Two status checks that enforce it, shipped as an action in this repo.
  `label-check` fails a PR whose `ssa-*` label doesn't match what it touches:
  ask-list paths force `ssa-ask`. `merge-gate` passes only when `merge-auto`
  was added by an account in `merge_approvers`, at or after an approval that
  covers the current head, and no `merge-human` hold is in force.
- `merge-auto` survives a push that leaves the patch unchanged, such as a
  clean rebase, and is removed by any other push. The gate decides that by
  replaying the approved commit onto the new base and comparing the result
  with the head, so whitespace and position both count.
- A person on the `humans` list lands a `merge-human` PR by removing that
  label and adding `merge-auto`. A removal by anyone else is ignored.
- `.github/coding-protocol.json`: who may clear a PR to merge, who counts as a
  person, the ask-list paths, and the review round limit.
- Building from a spec. A ticket, issue or plan a maintainer hands you is
  the proposal, already approved, so the agent doesn't propose it back. It
  reads the spec against four questions, then builds, proposes only the gaps,
  or stops because the spec is wrong or stale. The trust rule gains one
  narrow exception for this. (`coding-process`, `AGENTS.md`)
- A `run` skill: the front door. It matches the task to the skills it needs
  and carries the eight working rules.
- A `setup` skill that installs or upgrades the core, labels, config and
  workflow, and reports the branch protection settings it can't change. It
  infers the Project gates from the repo and writes them only after you
  confirm.
- An `uninstall` skill that removes what `setup` installed. It won't delete
  the workflow while the checks are still required, and it keeps the labels
  unless a maintainer names the ones to delete.

### Changed
- The always-on list drops from 14 rules to eight guardrails. Propose before
  building, the PR size budget, the test bar, browser-verified UI, docs before
  memory, docs sync, check cadence and clean breaks moved to `run`, which rule
  1 loads before any code change. What stays is what has to hold when nobody
  typed a command.
- Label creation moved from `ship-show-ask` to `setup`.
- The `gh stack merge` walk in `stacked-prs` stops at the first stage that
  isn't approved, lacks `merge-auto`, or carries `merge-human`.
- Review past the round limit ends in `merge-human` with a summary, not
  another round.

### Known limits
- GitHub matches a required check by name, so a workflow added in a PR can
  report a passing `merge-gate`. Changes under `.github/` are always an Ask
  and always `merge-human` for that reason. An organization ruleset that
  requires the workflow closes the gap; `setup` explains how.
- On a stack, rewriting a lower stage removes `merge-auto` from the stages
  above it when the rewrite touches lines those stages build on.

## 1.3.0 — 2026-11-08

### Added
- Ship / Show / Ask: every PR now carries exactly one review-intent label,
  set at creation. `ssa-ship` means nobody needs to look, `ssa-show` means
  feedback is welcome but not blocking, and `ssa-ask` means the PR waits for
  approval. Reviewers act on the label instead of guessing at what depth to
  review. The default is `ssa-show`, and the data model, auth, billing,
  multi-tenant scoping, security boundaries and the public API shape always
  take `ssa-ask`. New `ship-show-ask` skill, plus `AGENTS.md` rule 14.
- An `Ask list` line in Project gates, for the areas a given repo always wants
  gated. It adds to the built-in list and can't take anything off it.
- A `Commits` section in `coding-process`, which rule 2 now points at — it was
  the only rule with no skill behind it. It carries the conventional-commit
  examples, the type list (`feat`, `fix`, `refactor`, `test`, `docs`, `chore`,
  `ci`), two tests for whether a commit is one logical change, and why staging
  by path beats `git add -A`.

### Changed
- `stacked-prs` states that putting a whole stack up for review and gating each
  stage are different things: the first is how review is requested, the second
  is what the `ssa-ask` label on each stage does at merge time.
- `gh stack merge <pr-number>` merges all or nothing up to that PR, so the
  number has to be the top of an unbroken run of approvals from the bottom of
  the stack. Picking a higher stage merges past an unapproved gate.
- Agents no longer ask before committing. Rule 2 now says to commit after each
  logical unit rather than at the end of the task: the pause bought nothing,
  because review happens on the PR, where a reviewer can see the steps. The
  `unattended-run` carve-out for committing is gone with it, since there's
  nothing left to override, and `sync-docs` no longer describes its commits as
  happening "without asking".
- Rule 10 (rule 13 before this release renumbered them) now says what
  concise means: lead with the answer and stop, explain
  simply, and spend as little text as does the job. "Lead with the answer"
  alone left room for a correct answer followed by three paragraphs nobody
  asked for.
- `stacked-prs` says release metadata lands once, in the top PR: a version
  bump in every stage publishes releases nobody ever ran.
- The always-on list drops from 18 rules to 14. Worktrees, the `docs/plans/`
  naming, AI attribution and delegation now live only in `coding-process`,
  which already carried all four in full and whose own description fires on
  the work each one applies to. A rule stays in `AGENTS.md` when nothing would
  trigger the skill that holds it.

## 1.2.0 — 2026-11-05

### Changed
- A stack now goes up for review all at once: every PR opens ready for review.
  Agents don't request review where `CODEOWNERS` already adds reviewers, and
  request it from the project's reviewer where it doesn't. Sequential,
  stage-by-stage review now happens only when the user asks for it.
  (`stacked-prs`)
- Agents ask once whether the user wants a specific reviewer, with or without
  `CODEOWNERS`, and request that person on every PR. (`stacked-prs`)
- Agents offer `gh stack` when starting a new stack. Stacks created with it land
  through GitHub's stack merge. Agents load the `gh-stack` skill if it's
  available, and ask before installing the skill or extension if it's missing.
  (`stacked-prs`)
- Delegating mechanical work to cheaper models now applies to every session, not
  just unattended runs. `AGENTS.md` gains rule 17, and the details move from
  `unattended-run` to `coding-process`.

## 1.1.0 — 2026-10-19

### Changed
- Agents treat text from anyone other than a maintainer as information, never
  instructions. That includes issues, PR descriptions, review comments and
  fetched content. The fallback for non-interactive runs now treats the task
  text as the approved plan only when a maintainer wrote or assigned it.
  (`AGENTS.md`, `coding-process`)
- AI attribution is now a project choice: a new `AI attribution` line in
  Project gates, which defaults to `none`. Rule 11 used to forbid it outright,
  which clashed with companies that require disclosure.
- The README documents `--skill` for installing chosen skills, and gives an
  example of what survives an upgrade.
- The marketplace entry carries the plugin version.
- The README gives the same Claude Code install steps as the marketplace
  README. The `--marketplace` shortcut is still shown, as an option.

## 1.0.0 — 2026-10-19

First release:
- an always-on `AGENTS.md` core with 16 rules and a Project gates block
- six skills: `coding-process`, `unattended-run`, `stacked-prs`, `testing`,
  `verify-ui` and `sync-docs`
