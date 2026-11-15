# Deepening

How to turn a cluster of shallow modules into one deep module safely. Uses
the vocabulary in the skill: module, interface, seam, adapter.

## Classify the dependencies

The category decides what sits behind the seam and how tests cross it.

1. **In-process.** Pure computation and in-memory state, with no I/O. Always
   deepenable: merge the modules and test through the new interface. No
   adapter needed.
2. **Local-substitutable.** Something with a local stand-in, such as a test
   database or an in-memory filesystem. Deepenable when the stand-in exists:
   run it in the suite. The seam stays internal, with no port on the
   module's interface. This is what `testing` calls an integration test.
3. **Remote but owned.** Your own services across a network. Define a
   **port** at the seam. The deep module owns the logic, and the transport
   is an injected adapter: HTTP or a queue in production, in-memory in tests.
4. **True external.** Third-party services you don't control, such as Stripe
   or Twilio. The module takes them as an injected port, and tests use a
   mock adapter. This is the only category that mocks (see `tdd`'s
   `references/mocking.md`).

## Seam discipline

- **Two adapters, or no port.** A port with one adapter is indirection, not a
  seam.
- **Internal seams stay internal.** Don't widen the interface because a test
  wants to reach inside.

## Replace the tests; don't layer them

- Write the new tests at the deepened module's interface, test-first (see
  `tdd`).
- Once they cover a behaviour, delete the old tests on the shallow modules
  for it. Keeping both doubles the upkeep and tests the old shape.
- Assert what a caller can observe, never internal state. A test that has to
  change when the implementation changes is testing past the interface.
- The PR lists each deleted test and the test that now covers it, so a
  reviewer doesn't read it as lost coverage.

---

Adapted from Matt Pocock's `codebase-design` skill, MIT licence.
