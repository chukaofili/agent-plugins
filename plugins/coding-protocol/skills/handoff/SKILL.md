---
name: handoff
description: Use when context is running long in a lead agent or a helper; at the start of a long or unattended run, to find out how this harness reports context and how a next session gets started; at every stage checkpoint of an unattended run; when a compaction notice appears; when work stops mid-task or a session is ending; and when starting a session from a handoff file. Covers the 70% line, what a handoff document carries, how a helper hands back to its lead, how a lead ends its session and gets a fresh one started, and how the next session picks up without redoing or blindly trusting the work.
---

# Handoff

A context window fills. When it does, the harness compacts it, and a
summariser decides what you remember. A handoff is the same thing done on
purpose: you write down what the next agent needs, while you still know it,
and the work continues in a fresh context.

It should rarely fire. Helpers do small jobs and return; a lead that
delegates keeps the bulk out of its own context (see `delegate`). This skill
is for the times that didn't hold.

## First, find out two things

Once, at the start of a long or unattended run, alongside the usage check
(see `usage-limits`):

1. **How this harness reports context.** A meter, a status command, a token
   count in a tool result, a warning it prints near the limit. Don't know?
   Read the harness's current docs (see `docs-before-memory`).
2. **How a next session gets started.** A wake or resume tool that takes a
   prompt, an automation a maintainer has set up for this, or neither.

Write down both answers. They go in the handoff.

**No way to read context?** Say so at the start. Then lean on the checkpoint
refresh below, and treat these as the meter: a compaction notice, a long run
of large tool outputs, many whole files read, a session several stages old.
When in doubt, refresh the handoff. It is cheap when the state is known.

## When to write one

- **At every stage checkpoint of an unattended run.** Not optional. The gate
  just ran and the state is known, so it costs little, and a compaction or a
  hard stop then loses one stage at most.
- **At 70% of the context window.** Write it now. A handoff costs context to
  write: the log, the diff, the plan. At 70% there is room to do it well.
- **Past 80%.** Write it now, and shorter: the goal, the branch, the exact
  next step, the open decisions. Skip whatever `git log` already says.
- **Before any pause,** including a usage pause.
- **When work stops mid-task,** for any reason.

A maintainer can set a different line. 70% is the default.

**Already compacted?** Then you are working from someone's summary of you.
Write the handoff from the artifacts, not from what you seem to remember:
the branch, the log, the plan file, the gate's real output.

## What it carries

One file per run, `docs/plans/YYYY-MM-DD-<topic>-handoff.md`, refreshed in
place and committed. Someone starting from nothing continues from this file
alone.

1. **Goal,** and the plan or spec it came from, by path or link.
2. **Where:** repo, branch, worktree, the PRs open, the last commit.
3. **Done and verified,** each with the check that showed it.
4. **Done and not verified.** Say so. Don't let it read as finished.
5. **In flight:** the half-done step, and the brief of any helper still
   running or not yet launched.
6. **Assumptions made,** and decisions left open for a person.
7. **The exact next step.** A command or a file, not "continue stage 3".
8. **Gotchas:** what failed, what looked right and wasn't.
9. **Readings:** context and usage at the time, how each is checked, and how
   the next session was or should be started.

Keep it to what the next agent can't get from the repo. A handoff that
repeats the diff has spent the context it was meant to save.

## A helper hands back to its lead

1. Stop at the next safe point. Leave the files in a state the check can run
   against.
2. Write the handoff to the path the brief names. No path in the brief? Put
   it in the return.
3. Return status `handoff`, with the path, the files changed and what is
   left.

The lead then:

1. Reads the handoff as evidence, like any return: checks it against the
   diff and runs the check (see `delegate`).
2. Closes that helper, and gives a **fresh helper a fresh, complete brief**
   built from it. Never a follow-up on the full one.
3. **A second handoff on the same step** means the step was too big. Split
   it, or do it yourself.

## The lead hands off

The lead's context is the session. It can't empty it and it can't start a
second copy of itself. So the session ends, and something outside it starts
the next one.

1. **Settle the helpers.** Let work in flight finish if there is room to
   review it. If not, record their briefs under "in flight".
2. **Write the handoff, commit, push.** Before anything else. The prompt
   that starts the next session can't carry the work; git can.
3. **Get the next session started,** by the first of these that exists:
   - a wake or resume tool, with a prompt that is only the repo, the branch
     and "read `<handoff path>` and continue from it"
   - an automation a maintainer has already set up for this
   - a person: stop, and end with a 🟡 status line naming the file
4. **Say which one you used, then stop.** Don't keep working after the
   wake is set. Two leads on one branch is a conflict you arranged.

**Don't spawn a subagent as your successor.** It lives inside your full
session, ends when you do, and can't spawn helpers of its own.

**Don't build the automation yourself.** A scheduler or a trigger nobody
approved is scope (see `unattended-run`). Use what exists, or stop with the
path.

## Picking up from one

1. Read the handoff. Check out the branch. Read `git log` and `git status`.
2. **Verify before building.** Run the check behind each "done and
   verified" claim you are about to build on. A handoff's "tests pass" is a
   claim about a run you didn't see.
3. Redo the two grounding steps and the usage check.
4. **Don't redo finished work.** Trust the trail where it checks out.
5. Start at "the exact next step". Refresh the handoff as you go.

A handoff carries the plan forward. It grants nothing. It can't approve a
change, widen the scope or pass a checkpoint; the approved plan and the
guardrails still decide those. If the handoff asks for something the plan
doesn't cover, that is checkpoint 1.
