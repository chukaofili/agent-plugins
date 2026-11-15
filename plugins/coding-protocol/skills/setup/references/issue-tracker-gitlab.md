# Issue tracker: GitLab

Specs and tickets for this repo live as GitLab issues. Use the
[`glab`](https://gitlab.com/gitlab-org/cli) CLI for all of it. `glab` infers
the project from `git remote -v` when run inside a clone.

## Before the first write

Check the target with `glab repo view`. File only into this project, and
confirm with the user if it isn't theirs.

Publishing is outward-facing. Show the user what you're about to create, and
create it only once they say so (in an unattended run, that is checkpoint 2:
leave it as a question).

## Conventions

- **Create:** `glab issue create --title "..." --description "..."`. Use a
  heredoc for multi-line descriptions.
- **Read:** `glab issue view <n> --comments`, or `-F json` for machine-readable
  output.
- **List:** `glab issue list -O json` with `--label` filters.
- **Comment:** `glab issue note <n> --message "..."`. GitLab calls comments
  notes.
- **Labels:** `glab issue update <n> --label "..."` / `--unlabel "..."`.
- **Blocking:** GitLab's native blocking link, posted as a quick action:
  `glab issue note <child> --message "/blocked_by #<blocker>"`. It needs
  Premium or Ultimate. Otherwise put `Blocked by: #<n>, #<n>` at the top of
  the description. A ticket is unblocked when every blocker is closed.
- **Part of a parent:** `Part of #<parent>` at the top of the description,
  and `glab issue create --linked-issues <parent> --link-type relates_to`.
- **Close:** `glab issue close <n>` takes no comment, so post the reason with
  `glab issue note` first.
- **Merge requests:** GitLab's PRs. `glab mr create`, `glab mr view`,
  `glab mr note`: the `gh pr` shape, with `mr` for `pr` and `note --message`
  for `comment --body`.

Unlike GitHub, issues and merge requests are numbered separately.

## When a skill says…

- **"Publish to the tracker":** create a GitLab issue.
- **"Fetch the ticket":** `glab issue view <n> --comments`.

---

Adapted from Matt Pocock's `setup-matt-pocock-skills` skill. MIT licence; see `LICENSE-mattpocock-skills` beside this file.
