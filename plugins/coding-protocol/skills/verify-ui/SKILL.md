---
name: verify-ui
description: Use when a change touches anything a user sees, such as components, pages, views, screens, styles, templates, dialogs, forms or copy, and before opening a PR for it. Covers driving the change in a real browser through every state, running a review sweep against the repo's design and framework guidelines, and capturing screenshots for the PR, including what to do when no browser is available.
---

# Verify UI

Building the screens is the first half. A UI change isn't done until it has
been driven in a real browser and its screenshots are in the PR. A clean type
check, lint run and unit suite say the code compiles and its logic holds. None
of them say the panel renders, or that the footer sits where the design puts
it. Reviewers who never run the branch judge the work from the screenshots, or
not at all.

## 1. Drive it in a real browser, against real data

Use a running app with a real (seeded) database, not mocks, and not just a
screenshot of the happy path. Walk every state the design names, plus the ones
it doesn't:

- **Both themes.** Hand-written colours are where dark-mode variants get
  forgotten.
- **Mobile and desktop.** Layouts reorder at breakpoints, and footers and
  toolbars can orphan half their content.
- **Empty, loading, at-limit and failure states,** not only the populated one.
- **Every handoff** where one dialog or view closes and another opens.
- **Open every menu, popover and dropdown you added.** A menu you never open
  looks identical to one that crashes the page when it opens.
- Check the browser console and network panel for errors while you go.

## 2. Run a review sweep

Review the change against the design and framework guidelines the repo uses
(design system, accessibility, framework best practices). If your agent can
spawn subagents, run one reviewer per guideline in parallel on a cheaper
model. It's pattern-matching work, not judgement.

- **Give reviewers the repo's own rules.** A reviewer who hasn't read them will
  report documented decisions as violations.
- **Tell them to report only.** Then judge each finding yourself by real-world
  probability. Reject findings that would be true of a different product, such
  as virtualisation advice for a list that's bounded at a dozen rows.

## 3. Capture screenshots for the PR

Not a description of the screens: the screens. Capturing them is also the
cheapest way to catch a state you haven't actually looked at.

- **Drive the real app.** A throwaway browser script that reaches each state is
  fine. Use the E2E harness's seed helpers to reach states no UI flow produces,
  then delete the script once the images exist. It asserts nothing and isn't
  coverage.
- **Rebuild before capturing.** Otherwise you may screenshot the bug you just
  fixed.
- **Wait for animations before the shutter.** "Visible" resolves when an
  element is laid out, not when its entrance transition ends, so a naive
  capture shows half-faded dialogs with no backdrop. Wait for finite
  animations to finish (filter out infinite ones such as skeleton pulses), with
  a timeout.
- **Reach each state the way a user would** where you can. Forcing a flag skips
  the race that might expose a bug.
- **Commit them** to `docs/screenshots/<topic>/`, next to the design they
  implement if there is one.
- **Reference them by commit SHA, not branch,** e.g.
  `https://github.com/<org>/<repo>/blob/<sha>/<path>?raw=true`. A branch URL
  dies when the branch is deleted at merge, and leaves the PR full of broken
  images.

## No browser available

If the environment genuinely can't run the UI (no browser tooling, missing
credentials, infrastructure you don't control), say so in the PR's Testing
section. Name what blocked it and what you verified instead. Silence reads as
"verified".

## Ship review fixes as a stage on top

Fixes found by this pass go in a new stacked PR on top of the feature, so the
build and the review pass stay separately reviewable (see `stacked-prs`).

## What this pass catches

None of these came from a type checker, linter or unit suite:

- **A loading skeleton that didn't match its page.** It skeletoned a toolbar
  the page doesn't have, so every navigation jumped between two layouts.
  Mirror the real layout row for row, or don't ship a skeleton.
- **Two dialogs painted at once** on a handoff, because every dialog was
  mounted and only its `open` flag toggled. Hidden is not unmounted.
- **A flash of wrong identity:** the user's own row offered to remove them for
  one paint, because the client read the session after first render. Identity
  the server already knows should come down with the page.
- **A false empty state:** "No results found" rendered for a frame before the
  query resolved, because zero rows meant both "loading" and "empty".
- **A design token swapped for a similar-looking one,** visibly different in
  one of the themes.
- **A hardcoded label** next to four other call sites that read the same label
  from a shared catalogue.
- **A menu that crashed the page on open,** because a sub-component required a
  parent it didn't have. A manual click-through missed it twice, because nobody
  opened the menu.
- **A spec item quietly skipped,** and another dropped for a good reason but
  left undocumented. Any deviation from the design needs a note saying why.
- **A dialog contradicting itself,** found by looking at the screenshot: a
  notice said "all seats are in use" while the footer beside it still offered
  "2 seats left".
