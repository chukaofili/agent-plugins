---
name: to-spec
description: Use when asked to turn the conversation into a spec, write up what was agreed, "spec this out", or capture a feature before breaking it into tickets. Synthesises what is already known with no interview, agrees the seams the tests will go through, writes the spec so it passes the handed-a-spec check in coding-process (problem, approach, done check, ask-list design), and publishes it to the tracker named in Project gates, asking first when that tracker is remote.
---

# To spec

Turn what the conversation and the code already say into a spec. Don't
interview the user: synthesise. Anything you'd have to ask about goes in the
spec as an open question instead.

A spec this skill writes is a draft until the user approves it. Once they
do, it is a spec a maintainer handed you, and it counts as the approved
plan (see `coding-process`).

## 1. Know the code

Explore the repo if you haven't already. If it has a `GLOSSARY.md` or ADRs
for the area (the `Domain docs` line in Project gates), read them and use
their terms. Flag a decision that contradicts an ADR; don't quietly override
it.

## 2. Agree the seams

Sketch where the tests for this feature will go (see `tdd`):

- prefer seams that already exist
- use the highest seam that can observe the behaviour
- the fewer seams the better; one is ideal
- a new seam goes as high as it can

Check them with the user. Their yes covers the seams, the same as an
approved proposal would.

## 3. Write it

Use the template in `references/spec-template.md`. Then read the draft
against the four questions in "When you're handed a spec" in
`coding-process`, as if someone else had written it:

1. Is the problem stated?
2. Is the approach chosen?
3. Is there a done check that can pass or fail?
4. For anything on the ask list, is the design spelled out?

A "no" is a gap. Fill it from what you know, or list it under Open
questions. A spec that would come back as "Gaps" from its own author isn't
finished.

**No file paths and no code snippets.** They go stale first. The exception
is a prototype's snippet that pins a decision more exactly than prose can,
such as a state machine, a schema or a type shape. Trim it to the decision,
and say it came from a prototype.

## 4. Publish it

Where it goes is in `docs/agents/issue-tracker.md` (the `Tracker` line in
Project gates). No tracker file? Publish it locally, as
`docs/plans/YYYY-MM-DD-<topic>-spec.md`.

- **Local:** write the file and commit it.
- **GitHub, GitLab or other:** show the user the draft and where it's going,
  and publish only once they say so. Follow the tracker file's commands.
  With nobody to ask, publishing is checkpoint 2 in `unattended-run`: write
  it locally instead, and leave publishing as a question.

Then say where it went. Breaking it into tickets is `to-tickets`.

---

Adapted from Matt Pocock's
[`to-spec`](https://github.com/mattpocock/skills/blob/main/skills/engineering/to-spec/SKILL.md)
skill. MIT licence, Copyright (c) 2026 Matt Pocock; see `LICENSE` in this
folder.
