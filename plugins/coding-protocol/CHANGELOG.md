# Changelog

All notable changes to `coding-protocol`. Versions follow
[Semantic Versioning](https://semver.org). Each release is tagged
`v<version>`, and a moving `v<major>` tag points at the latest release of
that major. The version appears in
`.claude-plugin/plugin.json`, the marketplace entry and the header comment in
`AGENTS.md`. CI checks that they match each other and this file.

## 2.2.0 — 2026-11-15

The merge gate closes two holes: an agent author clearing its own PR, and
a green gate outliving a dismissed approval.

### Upgrading from 2.1

1. Update the skills (reinstall the plugin, or `npx skills add` again).
2. Repos on `@v2` get the author check with no change.
3. For the review re-run, add `.github/workflows/merge-gate-review.yml` and
   `.github/workflows/merge-gate-rerun.yml` from `setup`'s templates, or run
   `setup` again, which adds them without touching `merge-gate.yml`.

### Fixed
- `merge-gate` refuses a `merge-auto` added by the PR's own author, even an
  author on `merge_approvers`. An author on `humans` may still clear their
  own PR, since in a one-maintainer repo nobody else could.
  ([#40](https://github.com/chukaofili/agent-plugins/pull/40))
- Submitting, editing or dismissing a review re-runs the gate, so a
  dismissed approval turns a green `merge-gate` red. Until now it stayed
  green until the next label or push.
  ([#41](https://github.com/chukaofili/agent-plugins/pull/41))

### Added
- The action's `rerun` mode and `setup`'s two re-run workflow templates;
  `uninstall` removes them.
  ([#41](https://github.com/chukaofili/agent-plugins/pull/41))

## 2.1.1 — 2026-11-15

### Fixed
- The merge-gate workflow that `setup` installs calls the action at `@v2`.
  It pointed at `@coding-protocol-v2`, a tag that never existed, so the
  action couldn't resolve.
- Releases are tagged `v<version>`, plus a moving `v<major>` tag. The docs
  had described a `coding-protocol-` prefix the repo doesn't use.

## 2.1.0 — 2026-11-15

Test-first becomes the required way to build, work is sliced as tracer
bullets, and the protocol can write its own specs and tickets and review its
own branches. Six skills are adapted from Matt Pocock's
[`mattpocock/skills`](https://github.com/mattpocock/skills) (MIT, see
`THIRD_PARTY_NOTICES.md`).

### Upgrading from 2.0

1. Update the skills (reinstall the plugin, or `npx skills add` again).
2. Run `setup` in each repo. It replaces the core in `AGENTS.md` with the
   new rule 2 wording and rule 10, adds the `Tracker` and `Domain docs`
   lines to Project gates, and writes `docs/agents/issue-tracker.md`.
3. Nothing about merging changes. Rule numbers 1 to 9 are unchanged; rule
   10 is new.

### Added
- A `tdd` skill: every change to behaviour is built test-first, red then
  green, one slice at a time, at seams agreed in the plan. A bug fix is one
  slice whose regression test is the red step. Changes with no behaviour to
  test are exempt, and the PR says why. Adapted from Matt Pocock's
  `mattpocock/skills` (MIT, see `THIRD_PARTY_NOTICES.md`).
- Tracer bullets. Work is sliced vertically, each slice a thin path through
  every layer that works on its own. A new working rule in `run`, and a
  section in `coding-process`.
- `AGENTS.md` rule 10: build every change to behaviour test-first.
- A `codebase-design` skill: the deep-module vocabulary (module, interface,
  depth, seam, adapter, leverage, locality), the deletion test, deepening by
  dependency category, and design it twice, which runs only when asked and
  on the lead's model. Adapted from `mattpocock/skills`.
- An `improve-codebase-architecture` skill: scans an area (or the commit
  hot spots) for shallow modules, proposes deepening candidates with a
  strength rating, and stops for you to pick one. Nothing is refactored
  until you approve the chosen candidate's design. An unattended run, or
  "pick for you", builds the top recommendation only when it is `Strong`,
  off the ask list, sets no new pattern and fits the size budget, and opens
  it as an `ssa-ask` PR that shows the choice. Otherwise it ends at the
  report. The refactor is built test-first at the deepened
  interface, replacing the old shallow tests. Adapted from
  `mattpocock/skills`.
- A `to-spec` skill: turns the conversation into a spec with no interview,
  agrees the seams, and checks the draft against the four "handed a spec"
  questions, so it comes back Ready. Adapted from `mattpocock/skills`.
- A `to-tickets` skill: breaks a spec into tracer-bullet tickets sized to
  one PR and one context window, each with its blocking edges, and
  expand-migrate-contract for wide refactors. You approve the breakdown
  before anything is published. Adapted from `mattpocock/skills`.
- A tracker. `setup` writes `docs/agents/issue-tracker.md` for GitHub,
  GitLab, local files in `docs/plans/`, or a tracker you describe, and adds
  `Tracker` and `Domain docs` lines to Project gates. Publishing to a remote
  tracker always asks first. The templates are adapted from
  `mattpocock/skills`.
- Domain docs: agents read `GLOSSARY.md` and the ADRs for the area before
  exploring, use the glossary's terms, and flag ADR conflicts
  (`coding-process`).
- A `code-review` skill: before a PR opens, and once over a whole spec,
  helpers review the diff against the repo's standards (plus a baseline of
  Fowler smells) and against the spec, reported side by side. Findings are
  fixed in one pass as `refactor` and `fix` commits. Adapted from
  `mattpocock/skills`.

- Running a spec's tickets (`delegate`): the next wave is the frontier,
  worked out from what has merged rather than the tracker's counts. A
  research helper writes notes outside the repo and the others get a
  pointer. Helpers check their worktree base and merge in its tip before
  reporting. Shared names are pinned in every brief.
- An unattended run reviews the whole spec once after its last stage, makes
  one fix pass, and stops reviewing (`unattended-run`).

### Changed
- `AGENTS.md` rule 2 allows one kind of failing commit: a TDD red step that
  holds only the new failing test, made green by the next commit.
- Stacks are split by slice, not by layer. "Logic, then UI, then docs" is
  gone from `coding-process`.
- The full gate runs before every PR opens and before every push to an open
  PR (`run` rule 7).
- Helpers are briefed to work test-first and return the failure each new
  test showed (`delegate`).
- Tickets that don't block each other are sibling PRs, not one long stack,
  and a ticket closes on the top PR of the stack that delivers it
  (`stacked-prs`).
- A suite that skips tests when a fixture or database is missing no longer
  passes for green: read the counts, especially in a fresh worktree
  (`testing`, `coding-process`).

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
  and carries the nine working rules.
- A `delegate` skill. Delegation was four bullets in `coding-process` that
  an agent could read and then do everything itself. It is now the default
  with something to check: the agent says how the work splits before it
  builds, sets a cheaper model on every helper, sends a self-contained
  handoff, treats what comes back as evidence, and states in the PR what was
  delegated or why nothing was. A `Delegation` line in Project gates names
  the helper models, or turns it `off`; so can the user, for a task. Adapted from Builder.io's `efficient-orchestrator`
  skill (MIT), which is opt-in; this one is not.
- A `usage-limits` skill, replacing one sentence in `unattended-run`. The
  agent first finds out how its harness reports usage, from the new
  `Usage check` line in Project gates, the harness's own tool, or its current
  docs. It checks before substantial work and between waves of helpers,
  stops launching work at 95% of any window, commits and pushes before
  pausing, and re-checks the real window on resume. Adapted from Builder.io's
  `stay-within-limits` skill (MIT), made harness-agnostic.
- A `docs-before-memory` skill, grown out of the section in
  `coding-process`. It adds when to read first (dependencies, fast-moving
  APIs, expensive or irreversible areas, errors that say the ground moved),
  an order of sources that starts with the repo's own specs, a seven-step
  pass that ends with saying what was read, and when a local read is enough.
  Adapted from Builder.io's `read-the-damn-docs` skill (MIT).
- A status line. A response that finishes a unit of work ends with one line:
  🟢 done, 🟡 done with a named non-routine follow-up, or 🔴 blocked on the
  user. It is a guardrail in `AGENTS.md`, not a skill, because nothing would
  trigger a skill at the end of every response. Adapted from Builder.io's
  `quick-recap` skill (MIT).
- A `handoff` skill, grown out of four lines in `coding-process`. An agent
  whose context is running long writes a handoff at 70% of the window
  instead of waiting to be compacted, and a shorter one past 80%. A helper
  returns status `handoff` and the lead briefs a fresh helper from it. A
  lead commits and pushes the handoff, then gets a new session started on
  it: a wake tool, an automation a maintainer set up, or a 🟡 status naming
  the file. Unattended runs refresh the handoff at every stage checkpoint,
  so a hard stop loses one stage at most. The next session verifies what it
  inherits before building on it.
- A `setup` skill that installs or upgrades the core, labels, config and
  workflow, and reports the branch protection settings it can't change. It
  infers the Project gates from the repo and writes them only after you
  confirm.
- An `uninstall` skill that removes what `setup` installed. It won't delete
  the workflow while the checks are still required, and it keeps the labels
  unless a maintainer names the ones to delete.

### Changed
- The always-on list drops from 14 rules to nine guardrails. Propose before
  building, the PR size budget, the test bar, browser-verified UI, docs before
  memory, docs sync, check cadence and clean breaks moved to `run`, which rule
  1 loads before any code change. `run` adds a ninth, delegation. What stays is what has to hold when nobody
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
- A lead agent can't start its own successor. `handoff` relies on a wake
  tool, an existing automation or a person, and on the harness reporting
  context use. Where it reports none, the checkpoint refresh is the
  safeguard.

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
