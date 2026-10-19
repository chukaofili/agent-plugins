# agent-plugins

Plugins for coding agents. Each plugin is plain markdown in open formats
([`AGENTS.md`](https://agents.md) and [Agent Skills](https://agentskills.io)),
so it works in any agent that reads them. The repo is also a Claude Code
plugin marketplace.

| Plugin | What it does |
|---|---|
| [`coding-protocol`](plugins/coding-protocol) | An opinionated way of working for coding agents: propose before building, atomic stacked PRs under 500 lines, a real test bar, browser-verified UI, docs before memory. |

## Claude Code

```
/plugin marketplace add chukaofili/agent-plugins
/plugin install <plugin>@agent-plugins
```

## Every other agent

Install the skills with the [`skills`](https://github.com/vercel-labs/skills)
CLI, which works across Codex, Cursor, GitHub Copilot, Gemini CLI and other
agents that read [Agent Skills](https://agentskills.io).

List what's available:

```bash
npx skills add chukaofili/agent-plugins --list
```

Install everything:

```bash
npx skills add chukaofili/agent-plugins
```

Install a single skill:

```bash
npx skills add chukaofili/agent-plugins --skill <name>
```

Each plugin's README covers its non-skill parts, such as the `AGENTS.md` core
in [`coding-protocol`](plugins/coding-protocol).

## License

MIT
