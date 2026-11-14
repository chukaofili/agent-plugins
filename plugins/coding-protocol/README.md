# coding-protocol

An opinionated way of working for coding agents, extracted from a production
codebase where agents ship most of the code. It works in any agent that reads
[`AGENTS.md`](https://agents.md) or [Agent Skills](https://agentskills.io).

It is deliberately opinionated. If you disagree with a rule, fork it.

## What it enforces

- **Propose before building.** Approaches and trade-offs first, code only after approval.
- **Small, atomic PRs.** Aim for ~300 changed lines, with 500 as the ceiling. Bigger work ships as a stack of PRs, all open for review unless you ask for one stage at a time.
- **A review intent on every PR.** One of three labels says whether the PR wants a rubber stamp, non-blocking feedback, or a gate — and the reviewer acts on it rather than guessing.
- **Approval is not permission to merge.** The reviewer clears a PR for auto-merge, or holds it for a person, with a second label. Two status checks enforce it.
- **A real test bar.** Every feature gets unit tests and at least one integration test. UI features also get E2E tests. Every bug fix gets a regression test.
- **UI verified in a real browser,** with screenshots in the PR.
- **Docs before memory.** Read the installed version's current docs before using a framework or package.
- **Docs kept in sync** after every stage.
- **Cheaper models for mechanical work,** by default. The lead agent says how the work splits, reviews what helpers return, and states in the PR what was delegated.
- **Safe unattended runs.** Four hard checkpoints, frequent pushes, and a pause before a usage limit is hit, not after.

## How it's packaged

| Part | Loaded | Contents |
|---|---|---|
| [`AGENTS.md`](AGENTS.md) | Every session | Eight guardrails plus your project gates |
| [`skills/run`](skills/run) | When code changes, or on `/coding-protocol:run` | The nine working rules, and a table that matches the task to the skills below |
| [`skills/`](skills) | When relevant | `coding-process`, `unattended-run`, `stacked-prs`, `ship-show-ask`, `merge-gate`, `delegate`, `usage-limits`, `testing`, `verify-ui`, `sync-docs`, `setup`, `uninstall` |

The guardrails are the rules that have to hold when nobody typed a command:
who can give instructions, how commits are made, the review label on every PR,
and who may merge it. Everything about how to do the work loads with `run`.

## Install

Two steps: install the skills, then run `setup` in each repo. Use one skills
installer per agent. Running two gives you duplicate skills.

### 1. The skills

**Claude Code:**

```
/plugin marketplace add chukaofili/agent-plugins
/plugin install coding-protocol@agent-plugins
```

On Claude Code v2.1.275 or later, one command does both:
`/plugin install coding-protocol --marketplace chukaofili/agent-plugins`.

Skills are namespaced, for example `/coding-protocol:run`.

**Any other agent**, via the [`skills`](https://github.com/vercel-labs/skills) CLI:

```bash
npx skills add chukaofili/agent-plugins
```

To pick skills, list them with `--list`, then install by name:

```bash
npx skills add chukaofili/agent-plugins --skill run setup testing
```

Or copy `skills/*` into your agent's skills directory.

### 2. Each repo

Ask your agent to run the `setup` skill (`/coding-protocol:setup` in Claude
Code). It opens a PR that adds:

- the core in `AGENTS.md`, with your Project gates
- the five labels: `ssa-ship`, `ssa-show`, `ssa-ask`, `merge-auto`, `merge-human`
- `.github/coding-protocol.json`: who may clear a PR to merge, and your ask-list paths
- `.github/workflows/merge-gate.yml`: the `label-check` and `merge-gate` checks

It fills in the Project gates by reading the repo (scripts, CI, `CODEOWNERS`,
test config), shows you what it found, and writes only what you confirm. It
then lists the branch protection settings to turn on. It doesn't change them
for you.

To do it by hand, copy [`AGENTS.md`](AGENTS.md) to your repo root and fill in
the **Project gates** block. That gives you the rules without the merge gate.

## Using it

Start work with `/coding-protocol:run`, or just start: rule 1 of the core loads
the `run` skill before any code change. It matches the task to the skills it
needs.

## Upgrading

Run `setup` again. It replaces everything above the `Project` divider in
`AGENTS.md` and keeps your Project gates below it. For example, your
`Full gate:  pnpm run pipeline` line survives the upgrade, while the
guardrails above the divider are replaced.

**2.0.0 is a breaking release.** Once the checks are required, an approved PR
no longer merges until the reviewer adds `merge-auto`. See "Upgrading from
1.x" in [`CHANGELOG.md`](CHANGELOG.md).

The version is in the header comment of `AGENTS.md`. Pin a release by its tag,
for example `chukaofili/agent-plugins#coding-protocol-v2.0.0`.

## Removing it

Run the `uninstall` skill. It removes the core, the gate config and the
workflow in a PR, after checking the two checks are no longer required. It
keeps your Project gates and the labels, and tells you how to remove the
skills themselves.

## License

MIT
