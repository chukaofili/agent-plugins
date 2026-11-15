---
name: tdd
description: Use whenever you are about to write or change production code that alters behaviour, such as a feature, a bug fix, or a refactor; when planning which seams to test at; and when asked for "TDD", "test-first" or "red-green". Covers the red → green loop in tracer-bullet slices, agreeing the seams tests go through, the bug-fix slice, which changes are exempt, the one commit that may be red, what a good test is, the anti-patterns (implementation-coupled, tautological, horizontal slicing), and the evidence the PR shows.
---

# Test-driven development

Every change to behaviour is built test-first: red, then green, one
tracer-bullet slice at a time. `testing` decides which tests a change needs.
This skill is how you write them.

## When it applies

- **Any change to behaviour, however small.** A one-line change is one slice,
  not an exemption.
- **A bug fix is one slice.** Reproduce the bug as a failing test first. That
  test is the regression test the test bar asks for. Then fix it.
- **A refactor changes no behaviour,** so it has no new red step. The tests
  at the seam must be green before you start and after you finish. No tests
  there? Write them first, against the current code. They pass from the
  start, so prove each one can fail by breaking the code (see `testing`).
- **Exempt: changes with no behaviour to test.** Docs, copy, config values, a
  dependency bump the existing suite already covers, purely visual styling
  (driven in a browser instead, see `verify-ui`). The PR's Testing section
  names the exemption.

"Too small" is not an exemption. Neither is "hard to test": that is a sign
the interface is the wrong shape, and it is worth saying so.

## Seams: agree where tests go

A **seam** is the public interface a test goes through: the place where you
observe behaviour without reaching inside. Tests live at seams, never against
internals.

- **Seams are agreed with the approach,** in the proposal or plan (see
  `coding-process`). Give each one a line on what it catches and what it
  misses. One approval covers them.
- **Prefer an existing seam,** and the highest one that can observe the
  behaviour. The fewer seams across the codebase, the better.
- **A ready spec that names them settles them.**
- **Nobody to ask?** Take them from the spec, or use the highest existing
  seam and record it as an assumption in the PR. A new seam that sets a
  pattern is a design decision: leave that part unbuilt and flag it.
- **A seam you need mid-build that nobody agreed** is a gap. Raise it; don't
  quietly add it.

## The loop

1. **Pick the next slice:** the thinnest piece of behaviour that runs end to
   end through the seam (see tracer bullets in `coding-process`).
2. **Red.** Write one test for it and run it. Watch it fail for the right
   reason: an assertion about the missing behaviour, not a typo, an import
   error or a broken fixture. In a typed or compiled codebase, add the empty
   signature or a stub first, so the code compiles and the red is the
   assertion. A new test that passes at once is testing something that
   already exists. Fix the test.
3. **Green.** Write the least code that passes it. Don't anticipate the next
   test, and add nothing speculative.
4. **Run the narrowest check,** then commit.
5. **Repeat.** Let each slice respond to what the last one taught you.

**Refactoring is not part of the loop.** Note what you would tidy, and do it
at review, as `refactor` commits with every test green.

## The one commit that may be red

The red step may be committed on its own, as evidence. It is the only commit
allowed to fail, and only like this:

- it holds nothing but the new test for the current slice, plus any stub
  the test needs to compile
- it compiles, and the rest of the suite passes in it: only that test fails
- the next commit makes it green
- it is never the tip of a pushed branch: push after green

Every other commit compiles and passes on its own.

## What a good test is

It checks behaviour through the public interface, not implementation
details. The code behind it can change completely; the test shouldn't. It
reads like a specification: "user can check out with a valid cart" says what
capability exists, and it survives refactors because it doesn't care how.

See `references/tests.md` for examples, and `references/mocking.md` for what
to mock. "Through the public interface" is about where a test looks, not what
it runs against: an integration test still means real boundaries (see
`testing`).

## Anti-patterns

- **Implementation-coupled.** It mocks internal collaborators, tests private
  methods, or checks through a side channel (querying the database instead of
  using the interface). The tell: it breaks on a refactor that changed no
  behaviour.
- **Tautological.** The expected value is computed the way the code computes
  it (`expect(add(a, b)).toBe(a + b)`), so the test passes by construction and
  can never disagree with the code. Expected values come from somewhere
  independent: a known literal, a worked example, the spec.
- **Horizontal slicing.** All the tests first, then all the code. Tests
  written in bulk check imagined behaviour, test the shape of things rather
  than what users see, and fix the test structure before you understand the
  code. One test, one implementation, repeat.

## Evidence in the PR

The Testing section names, for each slice, the test and the failure you saw
before it went green, in a line. Or it names the exemption. A helper working
test-first returns the same (see `delegate`).

---

Adapted from Matt Pocock's
[`tdd`](https://github.com/mattpocock/skills/tree/main/skills/engineering/tdd)
skill. MIT licence, Copyright (c) 2026 Matt Pocock; see `LICENSE` in this
folder.
