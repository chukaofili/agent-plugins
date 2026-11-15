---
name: release
description: Use when releasing coding-protocol from this repo, when asked to cut, tag, bump or publish a release, when merged fixes need to reach repos pinned to `@v<major>`, or when the `v<major>` tag needs moving. Covers picking the version, the five places it lives, the changelog entry, the release PR, and tagging, moving the major tag and publishing the GitHub release after merge.
# Repo tooling, not part of any plugin: keeps `npx skills add` from offering it.
metadata:
  internal: true
---

# Release

For this repo only; it isn't part of any plugin. Releases are what the
outside world sees: repos run the merge-gate action at `@v<major>`, so moving
that tag ships code into every one of them at once.

## 1. Is there anything to release?

```bash
git fetch --tags origin
git log --oneline "$(git describe --tags --abbrev=0 --match 'v*.*.*' origin/main)"..origin/main
```

Nothing but merges of docs-only PRs is still a release if a user reads those
docs through the installed skills. Unmerged PRs are not in it; wait for them
or say they're left out.

## 2. Pick the version

[Semantic Versioning](https://semver.org), read from the user's side:

- **Patch:** a fix. Nobody has to change anything to get it.
- **Minor:** something new (a skill, a rule, a file `setup` installs), or a
  fix that needs repos to act, such as adding a workflow. Say what in an
  "Upgrading from" section.
- **Major:** anything that breaks a repo that does nothing: a renamed input,
  a removed check, a changed config key. A major gets a new `v<major>` tag
  and the old one stays where it is.

When unsure between two, take the higher. The bump is the only notice a
pinned repo gets.

## 3. The release PR

Branch `chore/release-<version>` from an up-to-date `main`. The version lives
in five places, and `scripts/validate.py` fails if they disagree:

- `plugins/coding-protocol/.claude-plugin/plugin.json`
- `.claude-plugin/marketplace.json`
- the header comment of `plugins/coding-protocol/AGENTS.md`
- the same header in `plugins/coding-protocol/skills/setup/references/AGENTS.md`
- the pin example in `plugins/coding-protocol/README.md`

Find them by the old version rather than from this list, in case one moved:

```bash
git grep -n '<old version>' -- ':!plugins/coding-protocol/CHANGELOG.md' ':!.github/workflows/'
```

For a major, the templates under `skills/setup/templates/` call the action at
`@v<major>`; update those too.

Add the changelog entry at the top of `plugins/coding-protocol/CHANGELOG.md`:

```markdown
## <version> — <YYYY-MM-DD>

### Upgrading from <previous minor>   (only when repos must act)
### Added / ### Changed / ### Fixed
```

Each item says what a user sees change, not which file moved. Link the PRs.

```bash
python3 scripts/validate.py
node --test '.github/actions/merge-gate/*.test.mjs'
```

One commit, `chore(release): coding-protocol <version>`. Open the PR with
that title and `ssa-show`; it touches no gate code. Its body lists what is
in the release, and ends with what happens after merge (step 4). It merges
like any other PR: approval, then merge.

## 4. After merge: tag, move, publish

Tag the **merge commit on `main`**, never the branch head; the tags are
lightweight, like the ones already there.

```bash
git fetch origin
sha=$(git rev-parse origin/main)
git log -1 --format='%h %s' "$sha"    # must be the release PR's merge
git tag v<version> "$sha"
git push origin v<version>
```

Move the major tag. This is the one force-push the repo allows, and only on
`v<major>`, never on a `v<x.y.z>` tag, which is immutable once pushed:

```bash
git tag -f v<major> "$sha"
git push -f origin v<major>
```

For a new major, create `v<major>` without `-f` and leave the old one alone.

Publish the release with GitHub's generated notes:

```bash
gh release create v<version> --title v<version> --generate-notes --latest
```

## 5. Check it landed

```bash
git ls-remote --tags origin 'v<major>' 'v<version>'   # same SHA, the merge commit
gh api repos/chukaofili/agent-plugins/releases/latest --jq .tag_name   # v<version>
```

Then name the repos that will pick it up on their next gate run, and anything
they must do themselves: an "Upgrading from" step isn't done until each repo
has done it.
