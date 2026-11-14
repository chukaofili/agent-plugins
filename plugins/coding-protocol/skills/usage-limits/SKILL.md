---
name: usage-limits
description: Use when starting or resuming long-running, unattended or parallel agent work; before launching a wave of helpers; when a rate-limit or quota error appears; or when work has to pause for a usage window and resume later. Covers finding out how this harness reports usage, checking it before substantial work and between waves, pausing near the cap with the work committed and pushed, and resuming only once the window has really cleared.
---

# Usage limits

Long work runs into the usage windows the harness enforces: a rolling
few-hour window, a weekly one, a token or request quota. Hitting one mid-task
stops the session wherever it happens to be, with nobody watching to notice.
So check, and pause on purpose before it pauses you.

## First, find out how this harness reports usage

Do this once, at the start of the work, before you need the answer.

1. **The Project gates say.** The `Usage check` line in `AGENTS.md` names the
   command or tool for this repo. Use it.
2. **The harness has its own.** A usage or budget tool in your tool list, a
   status command, a limits field in an API response. Prefer whatever the
   harness provides itself.
3. **You don't know.** Then ground yourself: read the current official docs
   for the harness you're running in, the pages on usage, rate limits and
   quotas (see Docs before memory in `coding-process`; don't answer this from
   memory, because plans and limits change). Find out which windows exist, how to read
   where you are in each, and what the error looks like when one is hit.

Write down what you found: the command, the windows, the reset rule. It goes
in the handoff, and in the resume prompt if you pause.

**Don't install a tool to do this** unless the `Usage check` line names it or
a maintainer says to. Running an unpinned package to read your own usage is
scope, and a dependency nobody chose.

**Found no way to check?** Say so at the start, not when it bites. Then work
as if the limit could arrive at any commit:

- smaller waves, fewer helpers at once
- commit and push after every unit, so a hard stop loses nothing
- treat the first rate-limit or quota error as the signal: stop launching
  work, and pause

## When to check

- Before starting substantial work.
- Before each wave of helpers, and after it finishes (see `delegate`).
- At each stage checkpoint, with the full gate.
- In a long single-threaded stretch, at each commit-and-push.
- On resume, before anything else.

Not after every edit. Checking is cheap; a habit of checking instead of
working isn't.

## The rule

**At or above 95% of any active window, stop launching work.** That is the
default. A `Usage check` line or a maintainer can set an earlier threshold.

- **Let work in flight finish.** Don't interrupt a helper to save budget;
  that usually loses what it had done.
- **A cost isn't a percentage.** If the tool reports spend, convert through
  the account's limit when you know it. When you don't, say you can't tell
  how close you are, and work as in "found no way to check".
- **Check every window,** not only the one you hit last time. A weekly cap
  doesn't care that the short window just reset.

## Pausing

1. **Commit and push first.** Never go into a pause with uncommitted work
   (see `unattended-run`).
2. **Write the resume so it stands alone.** The session that picks this up
   may remember nothing. It needs:
   - the plan that's left
   - the usage command, the threshold, and the wave limit
   - which window was over, and its identifier or start time if the tool
     gives one
   - the next checks to run
   - the handoff packets for the next wave, if helpers were mid-plan
3. **Pick how to wait:**
   - a wake or resume tool, when instructions have to travel with the wake
   - a background timer, for a fixed wait a process can sit out
   - a schedule, only for work that recurs
   - none of those: write the resume to a handoff in `docs/plans/` and stop
4. **Say what happened:** which window, the usage you observed, when the next
   check is, and what's left.

If a wake can only be set an hour or so ahead, chain them. Each one checks,
and sets the next if the window hasn't cleared.

## Resuming

**Check the real window before continuing. Don't trust the clock.** "Enough
time has passed" is a guess. A new window identifier or start time is
evidence; so is a usage figure back under the threshold.

Still over? Set the next check and stop again. Under? Carry on from the
resume, starting with its verification steps, not with new work.
