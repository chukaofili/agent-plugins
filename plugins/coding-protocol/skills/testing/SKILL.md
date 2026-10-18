---
name: testing
description: Use when writing or reviewing tests, deciding which tests a change needs, choosing or setting up a test harness, working in a repo with no test runner or no integration/E2E setup, or dealing with flaky, time-dependent or suspiciously always-green tests. Covers the unit + integration + E2E bar, what to do when a harness is missing, proving a test can fail, asserting guarantees rather than mechanisms, and keeping tests off the wall clock.
---

# Testing

## The bar

| Change | Required tests |
|---|---|
| Any feature | Unit tests for the new logic, plus **at least one integration test** |
| UI feature | All of the above, plus **E2E tests** for the user flow |
| Bug fix | A **regression test** that fails without the fix |

- **Integration** means real boundaries: a real database, queue, HTTP server or
  filesystem, not mocks of them. Mock only what you don't own and can't run
  locally, such as a third-party API.
- **E2E** means driving the user flow in a real browser (or the real client)
  against a running app.

## When a harness is missing

1. **Detect it.** Check for a unit runner, an integration setup (test
   containers, a test database, a seeded server) and an E2E framework. Also
   check the `Test harnesses` line in the Project gates block of `AGENTS.md`:
   a recorded `declined` means don't ask again.
2. **Ask once.** Name the harness, what setting it up involves (dependencies,
   config, CI changes) and roughly how big it is.
3. **If the user says yes,** set it up as its own atomic commit, or its own
   stage if it's large, then write the tests.
4. **If the user says no,** skip that test type. Record `declined` in the
   Project gates block, and state the gap in the PR's Testing section.
5. **Never write throwaway tests in place of the missing type.** A unit test
   with everything mocked is not an integration test, and pretending
   otherwise is worse than an honest gap.

Non-interactive runs, and unattended runs (where harness setup counts as
scope), don't set up a harness. Flag it in the PR and write the tests that the
existing harnesses support.

## Believe a test only after you've seen it fail

A green result means nothing until the same test has gone red against broken
code. Break the code (or revert the fix), watch the test fail for the right
reason, then restore it.

Two ways a test goes green without testing anything:

- **Stale build artifacts.** Some harnesses only rebuild when the output
  directory is missing, so a run after a source change tests the previous
  build. Clean first, or know exactly when your harness rebuilds. A
  falsifiability check against a stale build is worse than none.
- **Retrying assertions can't see transients.** Polling assertions retry until
  the state is satisfied, so they pass right over a dialog that renders twice,
  or an error that flashes and clears. To catch a transient, synchronise on
  the incoming state, then check the count **once**.

## Assert the guarantee, not the mechanism

Test the product rule, not the timing of the library that reveals it.

- For a disabled control, assert its accessible name or `aria-disabled` state,
  which is in the DOM from first paint. Don't assert the tooltip that appears
  on hover.
- A click that lands before the page is interactive (hydrated, listeners
  attached) is accepted by the DOM and dropped by the app. Retry the click
  together with the assertion, not just the assertion.
- When something can re-render between two steps, check atomically. For
  example, focus the element and read `document.activeElement` in one
  evaluation, not across two round-trips.

## Never depend on the wall clock

If a fixture has an absolute date and the code compares it against "now", the
test has an expiry date. It passes until that date arrives, then fails on
`main` and on every open branch at once, with nothing in the diff to explain
it. (A real one: a billing test asserted a subscription period ending on a
fixed date, and started failing for everyone at that moment, looking like a
regression on an unrelated docs PR.)

Pick a strategy in this order:

1. **Inject the clock.** Pass `now` as a parameter, or take a constructor
   dependency: `this.now = deps.now ?? (() => new Date())`. Tests declare one
   `const NOW = new Date('…')` and thread it through. A service that calls
   `new Date()` internally has no seam. When you touch one, add the seam.
2. **Pin the ambient clock** with fake timers (e.g. `vi.useFakeTimers()` +
   `vi.setSystemTime()`), restored afterwards. Use this when there's no seam
   and adding one is out of scope.
3. **Derive the fixture from now** (`Date.now() + 30 * DAY`). This is the last
   resort: the assertion can no longer name a literal date.

**Never** choose a fixture date because it's "in the future". The future is
temporary.

**Both branches of a time gate need their own pinned test.** A test whose
fixture has lapsed often keeps passing while silently testing the *other*
branch. When you fix a loud failure, check whether the branch it stopped
covering has its own test.

**Auditing for expiry:** shift the process clock forward and re-run the
suite. Preload a shim that moves `Date.now()` and `new Date()` but leaves
timers alone. Tests that pin their own clock correctly will override it.

```js
// timeshift.mjs: run with NODE_OPTIONS="--import file:///abs/path/timeshift.mjs"
const OFFSET_MS = Number(process.env.TIME_SHIFT_DAYS ?? 400) * 86400000;
const RealDate = Date;
class ShiftedDate extends RealDate {
  constructor(...a) { a.length === 0 ? super(RealDate.now() + OFFSET_MS) : super(...a); }
  static now() { return RealDate.now() + OFFSET_MS; }
}
globalThis.Date = ShiftedDate;
```

The shim produces false positives in integration tests: the database keeps
its real clock, so comparisons against DB-generated timestamps see invented
skew. Confirm any hit at offset 0 before believing it, and never "fix" a test
that only fails under the shim. A clean run tells you the tests don't expire,
and nothing about whether the logic is correct.
