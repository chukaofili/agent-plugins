# Issue tracker: local files

Specs and tickets for this repo live as Markdown files in `docs/plans/`,
next to the plans and handoffs, and go through review in a PR like any other
change.

## Conventions

- **A spec:** `docs/plans/YYYY-MM-DD-<topic>-spec.md`.
- **Tickets:** one file per ticket in `docs/plans/YYYY-MM-DD-<topic>-tickets/`,
  named `NN-<slug>.md` and numbered from `01` in dependency order (blockers
  first). Never one combined file.
- **State:** a `Status:` line near the top of each ticket: `open`, `claimed`
  or `done`.
- **Blocking:** a `Blocked by: NN, NN` line near the top. A ticket is
  unblocked when every file it lists is `done`.
- **Comments:** appended at the bottom under a `## Comments` heading.

## When a skill says…

- **"Publish to the tracker":** write the file, and commit it.
- **"Fetch the ticket":** read the file at the path or number given.

---

Adapted from Matt Pocock's `setup-matt-pocock-skills` skill. MIT licence; see `LICENSE-mattpocock-skills` beside this file.
