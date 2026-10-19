# coding-protocol

An opinionated way of working for coding agents, extracted from a production
codebase where agents ship most of the code. It works in any agent that reads
[`AGENTS.md`](https://agents.md) or [Agent Skills](https://agentskills.io).

It is deliberately opinionated. If you disagree with a rule, fork it.

## What it enforces

- **Propose before building.** Approaches and trade-offs first, code only after approval.
- **Small, atomic PRs.** Aim for ~300 changed lines, with 500 as the ceiling. Bigger work ships as a stack of PRs reviewed one stage at a time.
- **A real test bar.** Every feature gets unit tests and at least one integration test. UI features also get E2E tests. Every bug fix gets a regression test.
- **UI verified in a real browser,** with screenshots in the PR.
- **Docs before memory.** Read the installed version's current docs before using a framework or package.
- **Docs kept in sync** after every stage.
- **Safe unattended runs.** Four hard checkpoints, frequent pushes, and audited delegation.

## How it's packaged

| Part | Loaded | Contents |
|---|---|---|
| [`AGENTS.md`](AGENTS.md) | Every session | 16 one-line rules plus your project gates |
| [`skills/`](skills) | When relevant | `coding-process`, `unattended-run`, `stacked-prs`, `testing`, `verify-ui`, `sync-docs` |

## Install

Two steps: copy the core into your repo, then install the skills. Use one
skills installer per agent. Running two gives you duplicate skills.

### 1. The core (every agent)

Copy [`AGENTS.md`](AGENTS.md) to your repo root, then fill in the **Project
gates** block at the bottom.

| Agent | Extra step |
|---|---|
| Codex, Cursor, GitHub Copilot, Amp, Jules, Zed | None. They read `AGENTS.md` natively. |
| Claude Code | If the repo has a `CLAUDE.md`, add a line `@AGENTS.md` to it. Claude Code reads `AGENTS.md` itself only when no `CLAUDE.md` exists. |
| Gemini CLI | In `.gemini/settings.json`, set `{ "context": { "fileName": ["AGENTS.md", "GEMINI.md"] } }` |

### 2. The skills

**Claude Code** (v2.1.275+):

```
/plugin install coding-protocol --marketplace chukaofili/agent-plugins
```

Skills are namespaced, for example `/coding-protocol:testing`.

**Any other agent**, via the [`skills`](https://github.com/vercel-labs/skills) CLI:

```bash
npx skills add chukaofili/agent-plugins
```

Or copy `skills/*` into your agent's skills directory.

## Upgrading

`AGENTS.md` is split by a divider. Replace everything above the
`Project` divider with the new version, and keep your project gates below it.

## License

MIT
