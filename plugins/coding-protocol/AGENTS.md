<!-- coding-protocol v1.0.0 — https://github.com/chukaofili/agent-plugins
     To upgrade: replace everything above the "Project" divider. Never edit below it from upstream. -->

# Coding protocol

These rules apply to every session. Each names the skill that carries the
detail; load it when the rule applies. If a rule says to ask and nobody is
there to answer (a cloud or issue-driven run), treat the task text as the
approved plan, decide, record the assumption in the PR, and flag anything that
would have been a question.

1. **Propose before building.** Problem → approaches with trade-offs →
   explicit approval → build. When debugging, investigate and report first; no
   speculative fix rounds. *(skill: `coding-process`)*
2. **Atomic conventional commits** (`type(scope): message`), each compiling and
   passing on its own. Ask before committing, except in an unattended run or a
   skill whose contract is to commit (`sync-docs`). Never commit to `main`;
   stage files by path, never `git add -A`.
3. **PR size budget: ~300 changed lines, 500 ceiling.** Count hand-written code
   and tests; not lockfiles, generated code, snapshots, fixtures or vendored
   files. Decide the split in the plan, not mid-write. *(skill: `stacked-prs`)*
4. **Test bar.** Every feature gets unit tests and at least one integration
   test; UI features add E2E tests; bug fixes add a regression test you saw
   fail first. Missing harness → ask once, and never substitute throwaway
   tests. *(skill: `testing`)*
5. **UI changes are driven in a real browser, with screenshots in the PR.** If
   the environment can't run a browser, the PR's Testing section says so and
   what was verified instead. *(skill: `verify-ui`)*
6. **Docs before memory.** Never trust training knowledge for a framework,
   package or API. Read the installed version's current docs online before
   adopting or implementing against it. *(skill: `coding-process`)*
7. **Sync docs** after every stacked-PR stage or completed feature, before the
   PR opens. *(skill: `sync-docs`)*
8. **Narrowest relevant check while editing; the full gate at stage
   checkpoints** and before pushing.
9. **Use a git worktree** when another agent or human may be working in the
   same checkout and the harness hasn't already put you in one.
   *(skill: `coding-process`)*
10. **Plans and handoffs live in `docs/plans/`**, dated:
    `YYYY-MM-DD-<topic>-{design,plan,handoff}.md`.
11. **No AI attribution** in commits, PR bodies or review replies.
12. **Comment only the why** (a gotcha, a constraint); never narrate the code.
13. **Communicate concisely.** Lead with the answer.
14. **"Steps" means a runbook** for the human to execute, not actions to run.
15. **Clean breaks over legacy shims** when nothing depends on the old shape.
16. **Unattended runs** follow the `unattended-run` skill.

<!-- ───────── Project (yours; never overwritten on upgrade) ───────── -->

## Project gates

- Fast check:      <e.g. pnpm build>
- Full gate:       <CI-equivalent command>
- Reviewer:        <@handle | human>
- Test harnesses:  unit=<runner|declined>, integration=<runner|declined>, e2e=<runner|declined|n/a>
- Docs inventory:  docs/DOCS.md
