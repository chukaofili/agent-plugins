# coding-protocol — design

**Date:** 2026-10-18
**Status:** Draft, revised after review (Fable, 2026-10-18)
**Repo:** `chukaofili/coding-protocol` (local only until approved)

## Goal

Package the coding protocol Chuka runs on SolidHooks as something any team can
drop into any repo, for any coding agent — not only Claude Code.

It ships **opinionated**: the protocol as practised, minus project specifics.
People who disagree fork it. No config surface beyond what a project genuinely
has to supply (its gate commands, its reviewer).

## Distribution: two open formats, one thin wrapper

| Layer | Format | Read by | Purpose |
|-------|--------|---------|---------|
| Always-on core | `AGENTS.md` | Codex, Cursor, Copilot, Amp, Jules, Zed natively; Claude Code natively when no `CLAUDE.md` exists, else via `@AGENTS.md` import; Gemini CLI only with `context.fileName` set (see Install) | The short rules that apply every session |
| On-demand detail | Agent Skills (`skills/<name>/SKILL.md`) | Any agent supporting the [Agent Skills](https://agentskills.io/specification) format | Procedures, loaded only when relevant |
| Convenience | `.claude-plugin/` | Claude Code | One-command install of the same `skills/` — no duplicated content. Does **not** ship `AGENTS.md`; the core is always a copy |

The markdown is the single source of truth. Nothing is agent-specific except
the plugin manifest.

**Capability-dependent parts are written conditionally**, so they degrade
instead of breaking on a weaker agent:

- Subagent delegation / cheaper-model tiering / concurrency cap → "if your
  agent can spawn subagents …"
- Browser verification → describes the outcome (driven states, screenshots in
  the PR), never names a tool; no browser → say so in the PR
- Usage-limit pausing → "if your agent exposes usage limits …"
- **Interactive vs non-interactive.** Cloud/issue-driven agents (Copilot coding
  agent, Jules, cloud Codex) have nobody to wait for. Every "ask" / "wait for
  approval" rule carries the same fallback: *the task text is the approved
  plan; decide, record the assumption in the PR, and flag anything that would
  have been a question.*

## Layout

```
coding-protocol/
├── AGENTS.md                      # always-on core, ~45 lines — copy to repo root
├── skills/
│   ├── coding-process/SKILL.md    # propose → approve → build; debugging; docs-first; worktrees
│   ├── unattended-run/SKILL.md    # autonomous sessions: waiver, checkpoints, durability
│   ├── stacked-prs/SKILL.md       # size budget, stacking, handling review feedback
│   ├── testing/SKILL.md           # harness-missing flow, falsifiability, clocks
│   ├── verify-ui/SKILL.md         # browser pass, review sweep, screenshots in PR
│   └── sync-docs/SKILL.md         # audit docs against code after every stage/feature
├── .claude-plugin/
│   ├── plugin.json                # name (+ version, description)
│   └── marketplace.json           # name, owner, plugins[{ source: "./" }]
├── README.md                      # what it is + ONE install path per agent
└── LICENSE                        # MIT
```

Spec limits every skill must meet: `name` equals its directory name;
`description` ≤ 1024 chars; `SKILL.md` under 500 lines (overflow goes to a
`references/` file).

## The always-on core (`AGENTS.md`)

One line per rule; the detail lives in the skill each rule names. The file is
split by a divider so adopters can take protocol upgrades without a merge:

```markdown
<!-- coding-protocol v1.0 — replace everything above "Project" on upgrade -->
… protocol rules …
<!-- ───────── Project (yours; never overwritten) ───────── -->
## Project gates
…
```

**Protocol rules:**

1. **Propose before building.** Problem → approaches with trade-offs →
   explicit approval → build. Debugging: investigate and report first, no
   speculative fix rounds. Non-interactive: the task is the plan; record
   assumptions in the PR. → `coding-process`
2. **Atomic conventional commits** (`type(scope): message`), each compiling and
   passing alone. Ask before committing — *except* in an unattended run or a
   skill whose contract is to commit (`sync-docs`). Never commit to `main`;
   stage files by path, never `git add -A`.
3. **PR size budget: ~300 changed lines, 500 ceiling** (hand-written code and
   tests; not lockfiles, generated code, snapshots, fixtures, vendored files).
   The split is decided in the plan, not mid-write. → `stacked-prs`
4. **Test bar:** every feature gets unit tests + ≥1 integration test; UI
   features add E2E; bug fixes add a regression test seen failing first.
   Missing harness → ask once (non-interactive: flag it), never substitute
   throwaway tests. → `testing`
5. **UI changes are driven in a real browser, with screenshots in the PR.** If
   the environment can't run a browser, the PR's Testing section says so and
   what was verified instead. → `verify-ui`
6. **Docs before memory.** Never trust training knowledge for a framework,
   package or API — read the installed version's current docs online before
   adopting or implementing against it. → `coding-process`
7. **Sync docs** after every stacked-PR stage or completed feature, before the
   PR opens. → `sync-docs`
8. **Run the narrowest relevant check while editing; the full gate at stage
   checkpoints** and before pushing.
9. **Use a git worktree** when another agent or human may be working in the
   same checkout and the harness hasn't already put you in one.
   → `coding-process`
10. **Plans and handoffs live in `docs/plans/`**, dated
    (`YYYY-MM-DD-<topic>-{design,plan,handoff}.md`).
11. **No AI attribution** in commits, PR bodies or review replies.
12. **Comment only the why** — a gotcha, a constraint; never narrate the code.
13. **Communicate concisely:** lead with the answer.
14. **"Steps" means a runbook** for the human to execute, not actions to run.
15. **Clean breaks over legacy shims** when nothing depends on the old shape.
16. **Unattended runs** follow `unattended-run`.

**Project block** (adopter fills in, below the divider):

```markdown
## Project gates
- Fast check:      <e.g. pnpm build>
- Full gate:       <CI-equivalent command>
- Reviewer:        <@handle | human>
- Test harnesses:  unit=<runner|declined>, integration=<…|declined>, e2e=<…|declined|n/a>
- Docs inventory:  docs/DOCS.md
```

`Test harnesses` records a declined harness so the agent doesn't ask every
session. Two lines of project config; everything larger lives in its own file.

*Review note (finding 10):* the reviewer proposed cutting rules 13–15 into
`coding-process`. Kept in the core because Chuka chose them for it, but each
compressed to one line. Expected size ~45 lines including the project block.

## Skills

Each skill's `description` is its trigger. Descriptions name **cues an agent
can match on** (files touched, phrases, situations), not moments in a process.

### `coding-process`
**Description cue:** starting a feature, refactor or bug fix; writing a plan or
handoff; choosing or upgrading a dependency; starting work that will become a
branch.
Source: `.claude/rules/coding-process.md`.
- Propose → mini-spec → approval → one atomic task at a time; stick to the
  spec; ambiguity → ask (non-interactive → assume, record).
- Plan the split up front: a feature over the size budget is staged in the
  plan (typical: logic + unit/integration tests → UI + E2E → docs).
- Debugging: investigate, trace, report, propose, wait. "Check/confirm" means
  report, not fix.
- Context running long → handoff to `docs/plans/…-handoff.md` (goal, progress,
  what's left).
- **Docs before memory:** read the installed version from the
  lockfile/manifest; fetch that version's official docs, changelog and
  migration guide; prefer primary sources; check APIs named in a proposal
  *before* presenting it; docs beat memory, and when docs are silent, verify by
  running it. No web access → say so and flag every unverified API.
- **Worktrees:**
  - Check first: `git rev-parse --git-dir` ≠ `--git-common-dir` means you're
    already in one — use it.
  - Create one when another agent or human may be working in the same
    checkout, or the harness offers them. **Don't** in IDE agents (Cursor,
    Copilot, Zed) working in the user's open checkout — a worktree there is
    invisible to them — or in cloud agents, which already have a fresh clone.
  - `git worktree add ../<repo>-<branch> -b <branch> <base>`, never inside a
    tracked path.
  - Gotchas: no untracked files (copy `.env*`, install deps); the stash stack
    is shared (WIP commit, never bare `git stash`); commit and push early (an
    unchanged worktree can be cleaned up, branch and all); one branch per
    worktree; `git worktree remove` when merged.

### `unattended-run`
**Description cue:** "here's the plan, go"; overnight / autonomous / long
unwatched sessions; executing an approved plan end to end.
Source: `general.md` § Unattended Coding Protocol.
- Presupposes an approved plan; waives only reversible implementation details,
  decided and written down.
- Four hard checkpoints: scope beyond the plan; anything leaving the machine
  (beyond repo pushes/PRs); anything spending money; anything
  destructive/irreversible. Setting up a missing test harness is a scope
  checkpoint — flag it, finish what doesn't depend on it.
- Worktree unless the harness already isolated you.
- Commit + push after each logical unit (overrides rule 2's "ask"); never into
  a pause uncommitted.
- *If subagents are available:* delegate mechanical work to cheaper models, cap
  ~5 concurrent, audit every result before integrating.
- Blockers: surface, don't invent a design-changing workaround; do all
  independent work first.
- UI verification is not optional when unwatched.

### `stacked-prs`
**Description cue:** a change likely over ~300 lines; multi-commit work;
opening a PR; **receiving review feedback on any PR**; rebasing a PR stack.
Source: `general.md` § Shipping + new size rule + `web.md` § 5.
- Size budget in full: what counts, what doesn't, deciding the split in the
  plan; **tests may land as their own stage**; genuinely unsplittable changes
  explain the overage and point to the part that needs reading.
- Stacking: each stage branches off the previous; only the bottom targets
  `main`; `Stacked on #N`; land bottom-up; force-push only own unmerged stack
  branches. Post-review fixes to a UI surface ship as a stage on top, keeping
  build and review pass separately reviewable. `gh stack` optional.
- **Handling review (applies to single PRs too):** verify each finding
  technically; fix, or push back with reasoning — no performative agreement;
  judge by real-world probability; don't add tests that can't fail.
- Sequential review of a stack: request on the bottom PR only → approved →
  next stage. Stalled → flag it, keep building above it locally.

### `testing`
**Description cue:** writing or reviewing tests; choosing or setting up a test
harness; a repo with no test runner; flaky, time-dependent or always-green
tests.
Source: new rules + `general.md` § Time in Tests + `web.md` § 3/3b.
(The bar itself is core rule 4; this skill is the how.)
- What counts: integration = real boundaries (DB/queue/HTTP), not mocks; E2E =
  the user flow in a real browser.
- **Harness-missing flow:** detect → ask once, naming the harness and setup
  cost → yes: set it up as its own atomic commit → no: skip that type, record
  `declined` in the Project gates block, state the gap in the PR.
  Non-interactive: don't set up; flag it.
- **Believe a test only after seeing it fail** (stale build artifacts; retrying
  assertions can't see transients).
- **Assert the guarantee, not the mechanism.**
- **Never depend on the wall clock:** inject the clock → pin it → derive from
  now, in that order; never pick a date because it is "in the future". **Both
  branches of a time gate get their own pinned test.** Includes the clock-shift
  audit shim and its false-positive caveat.

### `verify-ui`
**Description cue:** a change touching components, pages, views, styles,
templates or anything else a user sees.
Source: `web.md` § Shipping a UI surface, generalised.
- Drive it in a real browser against real data: both themes, mobile + desktop,
  empty/loading/at-limit/failure states, every dialog handoff, open every menu.
- Review sweep against the repo's design/framework guidelines (parallel
  subagents if available); give reviewers the repo's rules; adjudicate
  findings yourself.
- Screenshots: drive the real app (a throwaway script is fine, delete after);
  rebuild first; wait for finite animations; commit to
  `docs/screenshots/<topic>/`; reference by commit SHA, not branch.
- No browser available → say so in the PR's Testing section, with what was
  verified instead.
- The "what this pass caught" list, framework-neutral, as the checklist.

### `sync-docs`
**Description cue:** a PR stage or feature is finished; files, routes,
packages, env vars or conventions were added, renamed or moved; "update / sync
docs", "docs are stale".
Source: `.claude/skills/sync-docs/SKILL.md`, generalised.
- **Inventory in `docs/DOCS.md`** (path → what it owns → generator command if
  generated), not in `AGENTS.md`, so the always-on context doesn't grow with
  each sync. Built on first run; a doc found that isn't listed is added in the
  same commit.
- Verify every named file, route, command, env var and export against the
  code; fix drift; never invent behaviour.
- `docs/plans/` is frozen history, never edited by a sync. Spikes are deleted
  once their direction ships or is dropped. Generated docs are regenerated,
  never hand-edited.
- **Contract includes committing:** one atomic `docs(scope): …` commit on the
  **current branch, never `main`**, staging files by path. Doc lines count
  toward the size budget; over 500 → a docs-only stage on top.
- Nothing drifted → "docs checked, no drift" in the PR's Testing section.

## Generalisation map (what gets stripped)

| SolidHooks-specific | Becomes |
|---|---|
| `jarvis-ai-cio`, `@jarvis-ai-cio Review again` | "your reviewer" (Project gates) |
| `pnpm run pipeline:clean`, turbo, `tsc -b` incremental trap | "Full gate"; incremental-cache trap kept as a generic warning |
| Base UI / shadcn / Next specifics in `verify-ui` | framework-neutral; examples kept only where they illustrate a general failure |
| Named review skills (`interface-design`, `vercel-*`) | "the repo's design/framework guidelines" |
| `docs/handoffs/<bundle>/screenshots/` | `docs/screenshots/<topic>/` |
| Postgres.app, Docker, local-DB notes | dropped |
| `BillingService` time-bomb story | kept, anonymised, as the motivating example |
| Claude usage % | "if your agent exposes usage limits" |

## Install (README) — one path per agent

Running two installers for the same agent duplicates skills (e.g. Claude Code
gets both `/testing` and `/coding-protocol:testing`), so the README gives
exactly one path each.

| Agent | Core | Skills |
|---|---|---|
| Claude Code | No `CLAUDE.md` → copy `AGENTS.md`, nothing else. Has `CLAUDE.md` → also add `@AGENTS.md` to it | `/plugin install coding-protocol --marketplace chukaofili/coding-protocol` (or `/plugin marketplace add …` then `/plugin install coding-protocol@<marketplace>`) |
| Codex, Cursor, Copilot, Amp, Jules, Zed | Copy `AGENTS.md` | `npx skills add chukaofili/coding-protocol` |
| Gemini CLI | Copy `AGENTS.md` **and** set `context.fileName: ["AGENTS.md", "GEMINI.md"]` in settings | `npx skills add chukaofili/coding-protocol` |

Every command, path and minimum version is re-verified against current docs
when the README is written (reviewer verified them on 2026-10-18; versions
move).

## Decisions (2026-10-18)

- Opinionated defaults; fork to disagree.
- Lives at `chukaofili/coding-protocol`, separate from `chukaofili/agent-skills`.
- Core includes concise communication, "steps" = runbook, clean breaks,
  docs-before-memory, worktrees (scoped), sync-docs.
- Plans and handoffs prescribed at `docs/plans/`; screenshots at
  `docs/screenshots/`; docs inventory at `docs/DOCS.md`.
- Review (Fable): findings 1–9, 11, 12 accepted; 10 partly accepted (rules kept,
  compressed).

## Implementation sketch (after approval)

Markdown-only repo, so three PRs:
1. Core: `AGENTS.md`, `README.md`, `LICENSE`, plugin manifests
2. Skills: `coding-process`, `unattended-run`, `stacked-prs`
3. Skills: `testing`, `verify-ui`, `sync-docs` — then verify installs in Claude
   Code + one other agent (Codex or Cursor)

Nothing is pushed or published until the local repo is reviewed.
