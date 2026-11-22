---
name: domain-docs
description: Use when exploring an area of a repo that has a GLOSSARY.md, a GLOSSARY-MAP.md or ADRs in docs/adr/; when naming a domain concept in code, tests, tickets or a spec; when a change contradicts, revisits or replaces an earlier architectural decision; when a decision is hard to reverse, would surprise someone without the context, or came out of a real trade-off; or when asked to "write an ADR", "record this decision", "add this to the glossary" or "define this term". Covers reading the glossary and ADRs before exploring, using the glossary's terms, flagging ADR conflicts, the three-part test for when a decision earns an ADR, writing and superseding ADRs, adding and changing glossary terms, and where each file goes in a single-context or multi-context repo.
---

# Domain docs

Two kinds of file hold a project's own language and its past decisions:

- **The glossary** (`GLOSSARY.md`) names the domain's concepts, one
  definition each, and the synonyms the project avoids.
- **ADRs** (`docs/adr/NNNN-<slug>.md`) record decisions that were hard to
  make and would be expensive to make again.

The `Domain docs` line in Project gates says which the repo has:

| Line | Layout |
|---|---|
| `GLOSSARY.md + docs/adr/` | Single context: one glossary at the root, ADRs in `docs/adr/` |
| `GLOSSARY-MAP.md` | Multi-context: the map lists each context and where its glossary and ADRs live |
| `none` | Neither exists. Carry on without them, and don't suggest creating them |

No Project gates, or the line is missing? Check for the files themselves and
go by what is there.

## Read before exploring

Before exploring an area:

- **Read the glossary** for it: `GLOSSARY.md`, or the one `GLOSSARY-MAP.md`
  points to for that context.
- **Read the ADRs that touch it.** Skim the titles in `docs/adr/` (and the
  context's own ADR folder, if the map names one), and read the ones about
  this area. Skip any marked `Superseded`, except to follow the link to what
  replaced it.

## Use the glossary's terms

Use them in names, tests, tickets, specs and proposals. Don't drift to a
synonym the glossary lists under *Avoid*: if it says "Order" and avoids
"Purchase", a new type is `OrderLine`, not `PurchaseItem`.

A concept that isn't in the glossary is a sign. Either you're inventing
language the project doesn't use (find the existing term and use it), or it
is a real gap. A real gap gets a term; see "Adding a term" below.

## Flag conflicts with an ADR

When a change contradicts an accepted ADR, say so before building, in the
proposal: "This contradicts ADR-0007, but is worth reopening because…".
Never override one quietly. If the user agrees to reopen it, the change
carries a new ADR that supersedes the old one.

## When a decision earns an ADR

Write one only when the decision passes all three:

1. **Hard to reverse.** Undoing it later means a migration, a rewrite or a
   broken contract: a data model, a wire format, a framework, a seam other
   modules depend on, a security boundary.
2. **Surprising without the context.** Someone new, reading the code, would
   ask "why on earth is it done this way?" and might "fix" it.
3. **The result of a real trade-off.** There was at least one serious
   alternative, and something was given up to choose this one.

Fails any of the three? It isn't an ADR. Put the reasoning in the PR
description or a code comment instead. Most decisions don't qualify, and a
folder full of trivial ADRs buries the ones that matter.

## Writing an ADR

Use the template in `references/adr-template.md`.

- **Number:** the highest number already in the folder, plus one, four
  digits (`0008`). On a stacked branch, also check the base branch and open
  PRs above you in the stack. If two branches claim the same number, the one
  that merges second renumbers.
- **Slug:** a few words of the decision, kebab-case:
  `0008-store-money-as-integer-cents.md`.
- **Status:**
  - `Proposed` when it is written ahead of the work, such as alongside a
    spec, and nothing is built yet.
  - `Accepted` when it is written in the PR that makes the change. The PR
    review is the approval; if the PR is closed, the ADR goes with it.
- **Same PR as the change.** An ADR describing code that isn't on the branch
  is a promise, not a record.
- **Use the glossary's terms** throughout.

## Superseding an ADR

An accepted ADR is a record of what was decided at the time. Don't rewrite
its decision, even when the decision changes.

1. Write a new ADR for the new decision. Its Context section names the old
   one and says what changed.
2. In the old ADR, change only the status line: `Superseded by
   [ADR-0012](0012-<slug>.md)`.

Typos, broken links and the status line are the only edits an accepted ADR
ever gets.

## Adding a term

Use the format in `references/glossary-format.md`. Add a term in the same PR
that first names the concept in code, when:

- the concept is part of the domain (something a user, a customer or the
  business would recognise), not an implementation detail like a cache key
  or a helper class;
- you checked the glossary and no existing term covers it; and
- the name will appear in more than one place: a type, a table, an endpoint,
  a ticket.

Keep the list in alphabetical order.

## Changing a term

Renaming a concept is a code change, not a glossary edit. Do it in one PR:
rename it in the code, update the entry, and move the old name under
*Avoid* so nobody brings it back. Changing what a term *means* is a domain
decision; propose it before making it.

## Where files go

- **Single context:** `GLOSSARY.md` at the repo root, ADRs in `docs/adr/`.
- **Multi-context:** `GLOSSARY-MAP.md` lists each context with the path to
  its glossary. An ADR about one context goes in that context's `docs/adr/`,
  next to its glossary. An ADR that cuts across contexts goes in the root
  `docs/adr/`. A term used in two contexts with two meanings gets an entry in
  each glossary, and each entry says how it differs from the other.
- **`none`:** don't create either file. A real gap in the language, or a
  decision that passes the three-part test, goes in the PR description
  instead, under "Decisions".
