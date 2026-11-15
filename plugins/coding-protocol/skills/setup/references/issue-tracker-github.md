# Issue tracker: GitHub

Specs and tickets for this repo live as GitHub issues. Use the `gh` CLI for
all of it. `gh` infers the repo from `git remote -v` when run inside a clone.

## Before the first write

Check the target with `gh repo view --json nameWithOwner`. In a fork, `gh`
can default to the upstream parent: file only into this repo, and confirm
with the user if the name isn't theirs.

Publishing is outward-facing. Show the user what you're about to create, and
create it only once they say so (in an unattended run, that is checkpoint 2:
leave it as a question).

## Conventions

- **Create:** `gh issue create --title "..." --body-file <file>`. Use a file
  or a heredoc for multi-line bodies.
- **Read:** `gh issue view <n> --json number,title,body,labels,comments`.
- **List:** `gh issue list --state open --json number,title,labels` with
  `--label` and `--state` filters.
- **Sub-issue of a parent:** `gh issue create --parent <parent> ...`, or
  `gh issue edit <parent> --add-sub-issue <child>` (`gh` 2.94+). Older `gh`:
  `gh api --method POST repos/<owner>/<repo>/issues/<parent>/sub_issues -F sub_issue_id=<child-db-id>`.
  Without sub-issues, put `Part of #<parent>` at the top of the child body.
- **Blocking:** GitHub's native issue dependencies. Add an edge with
  `gh issue create --blocked-by <n>,<n> ...` or
  `gh issue edit <child> --add-blocked-by <blocker>` (`gh` 2.94+). Older
  `gh`: `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`,
  where the database id comes from
  `gh api repos/<owner>/<repo>/issues/<n> --jq .id` (not the `#number`). No
  dependencies available? Put `Blocked by: #<n>, #<n>` at the top of the
  child body. A ticket is unblocked when every blocker is closed.
- **Count open blockers:**
  `gh api repos/<owner>/<repo>/issues/<n> --jq .issue_dependencies_summary.blocked_by`
  (0 means it can start).
- **Comment:** `gh issue comment <n> --body "..."`.
- **Labels:** `gh issue edit <n> --add-label "..."` / `--remove-label "..."`.
- **Close:** comment with the reason first, then `gh issue close <n>`. On an
  already-closed issue, `gh issue close --comment` drops the comment and
  still exits 0.

GitHub shares one number space between issues and PRs: a bare `#42` may be
either. Resolve it with `gh pr view 42`, then `gh issue view 42`.

## When a skill says…

- **"Publish to the tracker":** create a GitHub issue.
- **"Fetch the ticket":** read it as above, comments included.

---

Adapted from Matt Pocock's `setup-matt-pocock-skills` skill. MIT licence; see `LICENSE-mattpocock-skills` beside this file.
