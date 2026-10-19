# Changelog

All notable changes to `coding-protocol`. Versions follow
[Semantic Versioning](https://semver.org). Each release is tagged
`coding-protocol-v<version>`. The version appears in two places:
`.claude-plugin/plugin.json` and the header comment in `AGENTS.md`. CI checks
that they match each other and this file.

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
