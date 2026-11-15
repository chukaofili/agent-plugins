# coding-protocol v2.1.0 plan: TDD, tracer bullets, specs and tickets

Status: approved 2026-11-15.

## What 2.1 is

Test-first becomes the default way to implement, work is sliced into
tracer-bullet vertical slices, and the protocol gains the skills to write a
spec, break it into tickets and review a branch against both. It adapts seven
of Matt Pocock's engineering skills (MIT, credited in each skill and the
README): `tdd`, `codebase-design`, `improve-codebase-architecture`,
`to-spec`, `to-tickets`, `code-review` and `setup-matt-pocock-skills`. It also adopts the gaps found by comparing
`implement-spec` with `coding-process`.

The skills are **adapted, not copied**. Upstream points at things this repo
doesn't have (`/setup-matt-pocock-skills`, `GLOSSARY.md` tooling, triage
labels, `.scratch/`, Claude-only frontmatter). Where the upstream rules and
ours conflict, ours win.

## Decisions made

1. **One kind of red commit is allowed: TDD's red step.** It holds only the
   new failing test for the current slice, and the very next commit makes it
   green. Every other commit still compiles and passes on its own, and so
   does the existing suite inside the red commit: only the new test fails.
   AGENTS.md rule 2 and `coding-process` say exactly this. Still required:
   conventional, one logical change, staged by path, never on `main`.
2. **The full gate runs before every PR opens**, and before every push to an
   open PR (`run` rule 7). The narrowest check while editing is unchanged.
3. **Seams are agreed in the proposal or plan.** One approval covers them. A
   ready spec that names them settles them. An unattended run takes them from
   the spec, or picks them and records that as an assumption.
4. **Vertical slices replace the horizontal split.** "Logic, then UI, then
   docs" goes. Each stage of a stack is a tracer bullet: a thin path through
   every layer, demoable on its own, kept and grown rather than thrown away
   (unlike a prototype). Tickets that don't block each other can be sibling
   PRs off the same base, not only a linear stack.
5. **Tracer bullets are a working rule in `run`**, so they load whenever code
   changes. The detail lives in `coding-process`.
6. **Design it twice** runs only when the user asks, with the design helpers
   on the lead's model. Design stays judgement work (see `delegate`).
7. **Refactoring happens at review, as its own commits.** The `code-review`
   skill reports, and refactors fix its findings in `refactor(...)` commits
   while the tests stay green.
8. **`to-spec` output passes the four questions** in "When you're handed a
   spec": problem, approach, done check and ask-list design. Upstream's
   template gains a done check and the seams.
9. **The tracker is configured by `setup`**: GitHub, GitLab, local or other.
   The chosen template is written to `docs/agents/issue-tracker.md`, and the
   Project gates block gets a `Tracker:` line. Local means `docs/plans/`
   (`-spec.md`, and `-tickets/NN-<slug>.md`), not `.scratch/`.
10. **Domain docs are read if present.** The consumer rules (read
    `GLOSSARY.md` and the ADRs in the area you touch, use the glossary's
    terms, flag ADR conflicts, never nag about missing files) go in
    `coding-process`. A `Domain docs:` gate line records the layout.
11. **No triage labels.** There is no `triage` skill here. A ticket the
    maintainer approved in chat and that the agent published counts as
    maintainer-assigned.
12. **TDD is a guardrail in the always-on core.** A new `AGENTS.md` rule
    says every change to behaviour is built test-first, in tracer-bullet
    slices, however small *(skill: `tdd`)*. A bug fix is one slice: the
    regression test is the red step. A change with no behaviour to test
    (docs, copy, config values, dependency bumps, purely visual styling
    covered by `verify-ui`) is exempt, and the PR says why. It holds even
    when `run` didn't load. `run` and `tdd` carry the detail.
13. **`to-spec` and `to-tickets` can load on their own description.** They
    ask before publishing to a remote tracker.
14. The review skill keeps the name `code-review`. Claude Code namespaces it
    as `coding-protocol:code-review`.

## Upstream parts left out

- **Writing domain docs.** Upstream's `improve-codebase-architecture` adds
  new terms to `GLOSSARY.md` as they settle, and offers an ADR when a
  candidate is rejected for a lasting reason. Here, skills only read
  `GLOSSARY.md` and ADRs (decision 10). Nothing writes them.
- **Grilling.** Upstream walks the picked candidate through its `grilling`
  skill. Here it goes through propose-before-building instead.
- **Triage labels, `.scratch/`, wayfinder and PR-triage operations.** There
  are no skills here that use them.

## Conflicts with `implement-spec`: ours win

- One integration branch and one draft PR → stack stages under the size
  budget, each `ssa-ask`.
- No limit on parallel helpers → the five-helper cap and `usage-limits`.
- A merger subagent lands unreviewed work → a helper's return is evidence,
  and the lead reviews it.
- Marking a PR ready or closing tickets with no approval → the merge gate,
  plus the unattended-run checkpoint for anything that leaves the machine.
- No check on who wrote the spec → maintainer-written or assigned only.

## The stack

Five PRs above this plan. Each one adds its own `## Unreleased` changelog entry and syncs the
README. The last one bumps the version.

### PR 1 — `feat(coding-protocol): test-first and tracer bullets` (ssa-ask)

- New `tdd` skill: the red → green loop, seams, anti-patterns, rules of the
  loop. `references/tests.md` and `references/mocking.md`. The description
  triggers on any implementation, not only on request.
- `testing` keeps the bar, harnesses, falsifiability and the clock. Its
  "seen it fail" section points at the loop instead of duplicating it.
  "Integration" keeps its meaning of real boundaries.
- `run`: rule 3 becomes test-first, a new tracer-bullet rule, rule 7 moves
  the full gate to before a PR opens, and `tdd` is added to the Feature, Bug
  fix and Refactor rows. Update "nine working rules" in the description and
  README.
- `coding-process`: the commit rule change, a tracer-bullet section (versus
  horizontal slicing and versus prototypes), the vertical "Plan the split",
  and seams in the proposal.
- `AGENTS.md`: rule 2's red-step wording and the new test-first guardrail
  (decision 12), mirrored in `setup/references/AGENTS.md`.
- `delegate`: helpers follow the loop, and return red-then-green evidence.

### PR 2 — `feat(coding-protocol): codebase-design and code-review` (ssa-ask)

- New `codebase-design` skill: the vocabulary (module, interface, depth,
  seam, adapter, leverage, locality) and the principles.
  `references/deepening.md` and `references/design-it-twice.md`, adapted to
  decision 6.
- New `code-review` skill: two axes, Standards (repo docs plus the Fowler
  smell baseline) and Spec (the originating spec or ticket), in parallel
  helpers, reported side by side. Findings are fixed as `refactor` or `fix`
  commits. Run once over the whole spec after the last ticket, then one fix
  pass, then focused checks only, with no second broad review.
- `run`: table rows (Refactor and interface design → `codebase-design`;
  reviewing a branch → `code-review`), and `code-review` in the usual order
  before the PR opens.

### PR 3 — `feat(coding-protocol): improve-codebase-architecture` (ssa-ask)

Added at the user's request after approval. Split out of PR 2 to keep both
under the size budget.

- New `improve-codebase-architecture` skill, adapted from upstream. It scopes
  the scan by commit hot spots, applies the deletion test, writes candidates
  up with a strength rating and ask-list flags, and stops for the user to
  pick one. It proposes the interface before any code changes, and builds an
  approved deepening test-first, replacing the old shallow tests. The report
  is upstream's HTML (Tailwind and Mermaid from CDNs), with an ask-list
  badge added (the user's call). With nobody to pick, or on "pick for you",
  the agent builds its top recommendation only when it is `Strong`, off the
  ask list, sets no new pattern and fits the size budget, as an `ssa-ask`
  PR that shows the choice (the user's call). Otherwise the run ends at the
  report.
- `tdd`: a refactor that introduces a new interface starts that interface
  red, while the existing seam stays green.
- `codebase-design`'s description hands "find what to refactor" to the new
  skill.
- `run`: a row for architecture reviews.

### PR 4 — `feat(coding-protocol): specs, tickets and the tracker` (ssa-ask)

- `setup`: a Tracker step (GitHub, GitLab, local or other) that writes
  `docs/agents/issue-tracker.md` from `references/issue-tracker-*.md`
  (adapted: no wayfinder or PR-triage sections, and the "file only into the
  user's own repo" check kept). A Domain docs step. Two new gate lines.
- `uninstall` removes `docs/agents/issue-tracker.md` and the gate lines.
- New `to-spec` skill: synthesise from the conversation with no interview,
  agree the seams, and use the merged template (decision 8). Publish to the
  tracker.
- New `to-tickets` skill: tracer-bullet tickets with blocking edges,
  expand–contract for wide refactors, sized to the PR budget and one
  context window, and the user approves the breakdown before anything is
  published.
- `run`: rows for writing a spec and for breaking work into tickets.

### PR 5 — `feat(coding-protocol): run a spec's tickets` (ssa-ask)

The `implement-spec` gaps, and the release.

- `delegate`: frontier scheduling from your own record of what has merged,
  not the tracker's blocked-by counts. A research helper writes notes
  outside the repo, and others get pointers. Helpers check their worktree
  base and merge the base tip in before reporting. Shared names are pinned in
  every brief.
- `coding-process` Worktrees and `testing`: tests that skip silently in a
  fresh worktree (gitignored fixtures, missing local databases).
- `stacked-prs`: sibling PRs for independent tickets, and the closing-tickets
  reference on the top PR.
- `unattended-run`: the whole-spec review and its single fix pass.
- Version 2.1.0 in `plugin.json`, the marketplace entry and both AGENTS.md
  headers, plus the CHANGELOG with upgrade notes (re-run `setup` for the new
  rule 2 wording and the tracker).

## Done check

- `python3 scripts/validate.py` passes on every PR.
- Each new skill reads as the protocol's own: no references to upstream-only
  skills, files or labels (`grep -rn 'setup-matt-pocock\|\.scratch\|ready-for-agent'`
  is empty except in the credit). `GLOSSARY-MAP.md` is kept on purpose: it
  is the multi-context layout of the domain docs (decision 10).
- `run`'s table and rules name every new skill, and the README lists them.
- No PR passes 500 changed lines.
