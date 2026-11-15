# Spec template

```markdown
# <Feature>

## Problem

The problem the user faces, from their side.

## Solution

What changes for them, from their side.

## Approach

The approach chosen, in a few sentences, and the alternatives considered,
with a line each on why they lost. If the choice was left to the builder,
say so.

## User stories

A long, numbered list covering every aspect of the feature:

1. As a <actor>, I want <feature>, so that <benefit>.

## Implementation decisions

- the modules built or changed, and their interfaces
- schema changes, API contracts, specific interactions
- architectural decisions and technical clarifications

## Ask-list design

For anything on the ask list (data model, auth, billing, tenant scoping,
security boundaries, public API shape, and the `Ask list` line in Project
gates): the design, spelled out. A schema change names its columns. Or: "Touches nothing on the ask list."

## Testing

- The seams the tests go through, with a line each on what they catch and
  what they miss (agreed with the user).
- Which modules are tested, and the prior art in the repo.
- A good test checks behaviour through the interface, never internals.

## Done check

The checks that pass or fail when the feature is done: the commands, or the
behaviour you can observe. Not "works well".

## Out of scope

## Open questions

Anything you'd have asked in an interview. Empty if there are none.
```

---

Adapted from Matt Pocock's `to-spec` skill, MIT licence.
