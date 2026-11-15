---
name: codebase-design
description: Use when designing or reshaping a module's interface, deciding where a seam goes, choosing what sits behind it and how tests cross it, judging whether a module is deep or shallow, making code testable, or when another skill needs the deep-module vocabulary (module, interface, implementation, depth, seam, adapter, leverage, locality). Covers the vocabulary, the deletion test, designing for testability, deepening by dependency category, and design it twice. A reference, not a task driver. To find what to refactor in an area, use improve-codebase-architecture.
---

# Codebase design

Design **deep modules**: a lot of behaviour behind a small interface, at a
clean seam, tested through that interface. Callers get leverage, maintainers
get locality, and tests get one place to look.

This is a reference. Use its words wherever code is designed or reshaped,
and don't run it as a process of its own.

## Vocabulary

Use these terms exactly. Consistent words are the point.

- **Module:** anything with an interface and an implementation, at any
  scale: a function, a class, a package, a slice through several tiers. Not
  "unit", "component" or "service".
- **Interface:** everything a caller must know to use the module correctly.
  The type signature, and also invariants, ordering, error modes, required
  configuration and performance. Not just "the API" or "the signature".
- **Implementation:** the code inside the module.
- **Depth:** behaviour per unit of interface. A module is **deep** when a lot
  of behaviour sits behind a small interface, and **shallow** when the
  interface is nearly as complex as the implementation.
- **Seam:** the place where a module's interface lives, and so where callers
  and tests cross into it. Where to put it is its own decision. Not
  "boundary".
- **Adapter:** something that satisfies an interface at a seam. It names a
  role, not what's inside: a Postgres repository and an in-memory fake are
  both adapters.
- **Leverage:** what callers get from depth. One implementation pays back
  across every call site and every test.
- **Locality:** what maintainers get from depth. Changes, bugs and checks
  land in one place. Fix it once, and it's fixed everywhere.

## Principles

- **Depth belongs to the interface.** A deep module can be built from small,
  swappable parts inside. They just aren't part of its interface. It can
  have internal seams for its own tests as well as the external one.
- **The deletion test.** Imagine deleting the module. If the complexity
  vanishes, it was a pass-through. If it reappears across the callers, it
  was earning its keep.
- **The interface is the test surface.** Callers and tests cross the same
  seam. Wanting to test past the interface means the module is the wrong
  shape.
- **One adapter is a hypothetical seam; two make it real.** Don't add a seam
  unless something actually varies across it, usually production and test.

When designing an interface, ask: can it have fewer entry points, simpler
parameters, and more of the complexity hidden inside?

## Designing for testability

1. **Accept dependencies; don't create them.**

   ```typescript
   function processOrder(order, paymentGateway) {}   // testable
   function processOrder(order) {                    // hard to test
     const gateway = new StripeGateway();
   }
   ```

2. **Return results rather than producing side effects.**

   ```typescript
   function calculateDiscount(cart): Discount {}     // testable
   function applyDiscount(cart): void {              // hard to test
     cart.total -= discount;
   }
   ```

3. **A small surface.** Fewer entry points need fewer tests. Fewer
   parameters need less setup.

## Going deeper

- **Deepening a cluster of shallow modules:** `references/deepening.md`. How
  to classify the dependencies, what goes behind the seam, and why the new
  tests replace the old ones rather than sitting on top of them.
- **Design it twice:** `references/design-it-twice.md`. Several helpers each
  design the interface under a different constraint, and you compare them.
  It runs only when the user asks.

---

Adapted from Matt Pocock's
[`codebase-design`](https://github.com/mattpocock/skills/tree/main/skills/engineering/codebase-design)
skill. MIT licence, Copyright (c) 2026 Matt Pocock; see `LICENSE` in this
folder.
