// Pure decisions for the merge gate. No I/O here: main.mjs gathers the facts
// and these functions rule on them, so every rule can be tested directly.
import { matchesGlob } from 'node:path';

export const SSA = ['ssa-ship', 'ssa-show', 'ssa-ask'];
// A PR that edits the gate or its config must itself be an Ask.
export const ALWAYS_ASK = ['.github/**'];

export function parseConfig(text) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    throw new Error(`gate config is not valid JSON: ${e.message}`);
  }
  const list = (key) => {
    const v = raw[key] ?? [];
    if (!Array.isArray(v) || v.some((x) => typeof x !== 'string')) {
      throw new Error(`gate config: "${key}" must be a list of strings`);
    }
    return v;
  };
  const config = {
    mergeApprovers: list('merge_approvers').map((s) => s.toLowerCase()),
    humans: list('humans').map((s) => s.toLowerCase()),
    askPaths: [...ALWAYS_ASK, ...list('ask_paths')],
  };
  if (config.mergeApprovers.length === 0) {
    throw new Error('gate config: "merge_approvers" is empty, so nobody could open the gate');
  }
  return config;
}

export function askFiles(files, askPaths) {
  return files.filter((f) => askPaths.some((g) => matchesGlob(f, g)));
}

// files === null means the list could not be read in full. Treat that as
// touching the ask list: an unknown diff is not a routine one.
export function labelCheck({ labels, files, config }) {
  const ssa = labels.filter((l) => SSA.includes(l));
  if (ssa.length !== 1) {
    return { ok: false, reason: `expected exactly one ssa-* label, found ${ssa.length}${ssa.length ? ` (${ssa.join(', ')})` : ''}` };
  }
  if (ssa[0] === 'ssa-ask') return { ok: true, reason: 'ssa-ask' };
  if (files === null) {
    return { ok: false, reason: `changed files could not be listed in full, so this needs ssa-ask, not ${ssa[0]}` };
  }
  const hits = askFiles(files, config.askPaths);
  if (hits.length > 0) {
    return { ok: false, reason: `touches the ask list (${hits.slice(0, 3).join(', ')}${hits.length > 3 ? ', …' : ''}), so it needs ssa-ask, not ${ssa[0]}` };
  }
  return { ok: true, reason: `${ssa[0]}, nothing on the ask list` };
}

// events: the PR's label history, oldest first: { event, label, actor, at }.
function last(events, label, kinds) {
  return events.findLast((e) => e.label === label && kinds.includes(e.event));
}

// merge-human is in force while it is on the PR, and also when the last
// account to remove it was not a person on the humans list.
export function mergeHumanInForce({ labels, events, config }) {
  if (labels.includes('merge-human')) return true;
  const e = last(events, 'merge-human', ['labeled', 'unlabeled']);
  return Boolean(e) && e.event === 'unlabeled' && !config.humans.includes(e.actor.toLowerCase());
}

// reviews: oldest first: { actor, state, commit, at }. Each approver's latest
// verdict counts; a later "changes requested" or dismissal cancels an approval.
export function latestApproval(reviews, config) {
  const verdict = new Map();
  for (const r of reviews) {
    const who = r.actor.toLowerCase();
    if (config.mergeApprovers.includes(who) && r.state !== 'COMMENTED') verdict.set(who, r);
  }
  const approvals = [...verdict.values()].filter((r) => r.state === 'APPROVED');
  return approvals.sort((a, b) => Date.parse(a.at) - Date.parse(b.at)).at(-1) ?? null;
}

// author: the PR author's login. approval: latestApproval(), or null. covered: whether that approval's
// commit is the head, or the head is that commit replayed on a moved base. remove: merge-auto no longer
// stands for a reviewed head and should come off the PR.
export function mergeGate({ author, labels, events, config, labelCheckResult, approval, covered }) {
  const no = (reason, remove = false) => ({ ok: false, reason, remove });
  if (!labelCheckResult.ok) return no(`label-check fails: ${labelCheckResult.reason}`);
  if (mergeHumanInForce({ labels, events, config })) {
    return no(labels.includes('merge-human') ? 'merge-human: a person lands this' : 'merge-human was removed by an account that is not on the humans list, so it still holds');
  }
  if (!labels.includes('merge-auto')) return no('no merge-auto label yet');
  const e = last(events, 'merge-auto', ['labeled']);
  if (!e) return no('merge-auto is present but its label event was not found');
  // Being on merge_approvers doesn't let an author clear their own PR.
  if (!author) return no('the pull request author is unknown, so merge-auto cannot be checked against it');
  if (e.actor.toLowerCase() === author.toLowerCase()) {
    return no(`merge-auto was added by ${e.actor}, the pull request's author; the reviewer sets it`);
  }
  if (!config.mergeApprovers.includes(e.actor.toLowerCase())) {
    return no(`merge-auto was added by ${e.actor}, who is not in merge_approvers`);
  }
  if (!approval) return no('no approval from a merge approver yet');
  const at = approval.commit.slice(0, 7);
  if (!covered) return no(`the approval at ${at} covers an older patch; review the new head, approve it, then add merge-auto again`, true);
  if (Date.parse(e.at) < Date.parse(approval.at)) {
    return no(`merge-auto was added before the approval at ${at}; add it again now that the approval is in`, true);
  }
  return { ok: true, reason: `merge-auto, added by ${e.actor} after the approval at ${at}`, remove: false };
}
