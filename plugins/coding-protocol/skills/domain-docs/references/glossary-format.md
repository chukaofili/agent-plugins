# Glossary format

`GLOSSARY.md` is a flat, alphabetical list of the domain's terms. It is not
a design doc: no architecture, no file paths, no implementation detail.

```markdown
# Glossary

## <Term>

<One or two sentences: what it is, in the domain's own words.>

- Avoid: <synonyms the project doesn't use for this>
- Related: <other terms, and how they relate>
```

Each entry has:

- **Term:** the exact word the code uses, capitalised as a noun. One term per
  concept.
- **Definition:** what it means to the business, not how it is stored. "A
  request from a Customer to buy one or more Products", not "a row in the
  `orders` table".
- **Avoid** (optional): names that would be easy to reach for and mean the
  same thing. This is what stops drift.
- **Related** (optional): the terms it is easily confused with or always
  appears beside, and the difference: "an Order has one or more Order Lines".

## Example

```markdown
# Glossary

## Amount

A sum of money in one Currency, held as an integer count of its minor unit.
See ADR-0008.

- Avoid: price, value, total (as a type name)
- Related: an Invoice's total is an Amount; so is each Order Line's.

## Order

A request from a Customer to buy one or more Products. An Order is placed
once and never edited; changes after placing it are an Amendment.

- Avoid: purchase, cart (a cart is what becomes an Order when placed)
- Related: has one or more Order Lines; may have Amendments.
```

## The map, for multi-context repos

`GLOSSARY-MAP.md` lists each bounded context, where its glossary and ADRs
live, and the terms that mean different things in different contexts:

```markdown
# Glossary map

| Context | Glossary | ADRs |
|---|---|---|
| Billing | services/billing/GLOSSARY.md | services/billing/docs/adr/ |
| Fulfilment | services/fulfilment/GLOSSARY.md | services/fulfilment/docs/adr/ |

Cross-context ADRs live in `docs/adr/`.

## Shared terms with different meanings

- **Order:** in Billing, what gets invoiced; in Fulfilment, what gets
  shipped. One Billing Order can become several Fulfilment Orders.
```
