# ADR template

Copy this into `docs/adr/NNNN-<slug>.md`. Keep it to a page: an ADR that
needs more is usually two decisions.

```markdown
# NNNN. <The decision, as a short statement>

- Status: <Accepted | Superseded by [ADR-NNNN](NNNN-<slug>.md)>
- Date: <YYYY-MM-DD the status last changed>

## Context

What forced a decision now: the problem, the constraints, and the forces
pulling in different directions. If this supersedes an earlier ADR, name it
and say what changed since.

## Decision

What was chosen, in a few sentences, in the glossary's terms.

## Alternatives considered

- **<Alternative>:** what it was, and why it lost. One bullet each. At
  least one, or this wasn't a trade-off and doesn't need an ADR.

## Consequences

What gets easier, what gets harder, and what is now ruled out. Include the
cost that was accepted: this is the part a future reader most needs.
```

## Example

```markdown
# 0008. Store money as integer cents

- Status: Accepted
- Date: 2026-11-22

## Context

Invoice totals drifted by a cent when line items were summed as floats, and
two currencies we now support have no minor unit.

## Decision

Every Amount is stored and passed as an integer count of the currency's
minor unit, with the Currency alongside it. Formatting happens only at the
edge.

## Alternatives considered

- **Decimal type in the database:** exact, but the API and the client would
  still parse it into floats.
- **Floats, rounded on display:** what we had; it's the bug.

## Consequences

Arithmetic is exact and cheap. Every boundary (API, CSV export, the payment
provider) has to convert, and a new currency needs its minor unit declared.
```
