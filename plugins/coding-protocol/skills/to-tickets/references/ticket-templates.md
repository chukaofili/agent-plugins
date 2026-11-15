# Ticket templates

In either form, leave out file paths and code snippets: they go stale
first. The exception is a prototype's snippet that pins a decision more
exactly than prose can (a state machine, a schema, a type shape), trimmed to
the decision and marked as coming from a prototype.

## Local file

```markdown
# <NN>: <Ticket title>

**Status:** open

**Blocked by:** <numbers and titles>, or "None (can start now)".

**What to build:** the end-to-end behaviour this ticket makes work, from the
user's side. Not a layer-by-layer list.

**Tests at:** the seam its tests go through.

## Acceptance criteria

- [ ] <criterion that passes or fails>
- [ ] <criterion>
```

## Issue

```markdown
## Parent

A link to the parent issue, if the source was one. Otherwise leave this
section out.

## What to build

The end-to-end behaviour this ticket makes work, from the user's side.

## Tests at

The seam its tests go through.

## Acceptance criteria

- [ ] <criterion that passes or fails>
- [ ] <criterion>

## Blocked by

A link to each blocking ticket, or "None (can start now)". Leave this
section out when the blockers were set as native links.
```

---

Adapted from Matt Pocock's `to-tickets` skill, MIT licence.
