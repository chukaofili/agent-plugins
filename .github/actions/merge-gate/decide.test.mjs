import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseConfig, labelCheck, mergeGate, mergeHumanInForce, latestApproval } from './decide.mjs';

const config = parseConfig(JSON.stringify({
  merge_approvers: ['anton', 'Chuka'],
  humans: ['chuka'],
  ask_paths: ['**/migrations/**', '**/billing/**'],
}));
const T = (min) => `2026-11-14T10:${String(min).padStart(2, '0')}:00Z`;
const ev = (event, label, actor, min = 30) => ({ event, label, actor, at: T(min) });
const rev = (actor, state, commit, min) => ({ actor, state, commit, at: T(min) });
const approval = rev('anton', 'APPROVED', 'aaaaaaa1', 20);
const gate = (o) => mergeGate({ config, author: 'author-bot', labelCheckResult: passing, approval, covered: true, events: [], ...o });
const passing = { ok: true, reason: 'ssa-show' };

test('config: rejects bad JSON, wrong types and an empty approver list', () => {
  assert.throws(() => parseConfig('{'), /not valid JSON/);
  assert.throws(() => parseConfig('{"merge_approvers":"anton"}'), /list of strings/);
  assert.throws(() => parseConfig('{"humans":["a"]}'), /merge_approvers.*empty/);
});

test('label-check: needs exactly one ssa label', () => {
  assert.equal(labelCheck({ labels: [], files: [], config }).ok, false);
  assert.equal(labelCheck({ labels: ['ssa-ship', 'ssa-ask'], files: [], config }).ok, false);
  assert.equal(labelCheck({ labels: ['bug', 'ssa-show'], files: ['src/a.ts'], config }).ok, true);
});

test('label-check: an ask-list path forces ssa-ask', () => {
  const files = ['src/a.ts', 'db/migrations/007_drop.sql'];
  const r = labelCheck({ labels: ['ssa-ship'], files, config });
  assert.equal(r.ok, false);
  assert.match(r.reason, /007_drop\.sql/);
  assert.equal(labelCheck({ labels: ['ssa-ask'], files, config }).ok, true);
});

test('label-check: the gate and its config are always on the ask list', () => {
  assert.equal(labelCheck({ labels: ['ssa-show'], files: ['.github/coding-protocol.json'], config }).ok, false);
  assert.equal(labelCheck({ labels: ['ssa-show'], files: ['.github/workflows/merge-gate.yml'], config }).ok, false);
});

test('label-check: an unreadable file list needs ssa-ask', () => {
  assert.equal(labelCheck({ labels: ['ssa-show'], files: null, config }).ok, false);
  assert.equal(labelCheck({ labels: ['ssa-ask'], files: null, config }).ok, true);
});

test('merge-gate: opens for merge-auto added by an approver after an approval that covers the head', () => {
  const r = gate({ labels: ['ssa-show', 'merge-auto'], events: [ev('labeled', 'merge-auto', 'Anton')] });
  assert.deepEqual([r.ok, r.remove], [true, false]);
});

test('merge-gate: stays shut with no merge label, or a failing label-check', () => {
  assert.equal(gate({ labels: ['ssa-show'] }).ok, false);
  // The label came off but its history is still there: history alone opens nothing.
  const gone = gate({ labels: ['ssa-show'], events: [ev('labeled', 'merge-auto', 'anton'), ev('unlabeled', 'merge-auto', 'anton', 31)] });
  assert.equal(gone.ok, false);
  assert.match(gate({ labels: ['ssa-show'], events: [ev('labeled', 'merge-auto', 'anton')] }).reason, /no merge-auto label/);
  const r = gate({ labels: ['ssa-ship', 'merge-auto'], events: [ev('labeled', 'merge-auto', 'anton')], labelCheckResult: { ok: false, reason: 'x' } });
  assert.equal(r.ok, false);
});

test('merge-gate: the author cannot open it', () => {
  const r = gate({ labels: ['ssa-show', 'merge-auto'], events: [ev('labeled', 'merge-auto', 'author-bot')] });
  assert.equal(r.ok, false);
  assert.match(r.reason, /author-bot/);
});

test('merge-gate: an author who is also a merge approver cannot clear their own PR', () => {
  // Both accounts are approvers; only the PR author is barred, whatever the case of the login.
  const own = gate({ author: 'Anton', labels: ['ssa-show', 'merge-auto'], events: [ev('labeled', 'merge-auto', 'anton')] });
  assert.deepEqual([own.ok, own.remove], [false, false]);
  assert.match(own.reason, /author/);
  assert.equal(gate({ author: 'chuka', labels: ['ssa-show', 'merge-auto'], events: [ev('labeled', 'merge-auto', 'anton')] }).ok, true);
});

test('merge-gate: an author on the humans list may clear their own PR', () => {
  assert.equal(gate({ author: 'Chuka', labels: ['ssa-show', 'merge-auto'], events: [ev('labeled', 'merge-auto', 'chuka')] }).ok, true);
});

test('merge-gate: the latest merge-auto event decides, not an earlier one', () => {
  const events = [ev('labeled', 'merge-auto', 'anton'), ev('unlabeled', 'merge-auto', 'github-actions[bot]'), ev('labeled', 'merge-auto', 'author-bot')];
  assert.equal(gate({ labels: ['ssa-show', 'merge-auto'], events }).ok, false);
});

test('merge-gate: needs an approval from a merge approver', () => {
  const r = gate({ labels: ['ssa-show', 'merge-auto'], events: [ev('labeled', 'merge-auto', 'anton')], approval: null, covered: false });
  assert.deepEqual([r.ok, r.remove], [false, false]);
  assert.match(r.reason, /no approval/);
});

test('merge-gate: an approval that covers an older patch shuts it and drops the label', () => {
  const r = gate({ labels: ['ssa-show', 'merge-auto'], events: [ev('labeled', 'merge-auto', 'anton')], covered: false });
  assert.deepEqual([r.ok, r.remove], [false, true]);
  assert.match(r.reason, /older patch/);
});

test('merge-gate: the reason says what changed in the patch', () => {
  const r = gate({ labels: ['ssa-show', 'merge-auto'], events: [ev('labeled', 'merge-auto', 'anton')], covered: false, why: 'replaying it conflicts in auth.py' });
  assert.match(r.reason, /older patch \(replaying it conflicts in auth\.py\)/);
});

test('merge-gate: an approval that could not be checked shuts it but keeps the label', () => {
  // A failed fetch is not a changed patch; the next run checks again.
  const r = gate({ labels: ['ssa-show', 'merge-auto'], events: [ev('labeled', 'merge-auto', 'anton')], covered: null, why: 'GET /compare: HTTP 502' });
  assert.deepEqual([r.ok, r.remove], [false, false]);
  assert.match(r.reason, /could not check .* HTTP 502/);
});

test('merge-gate: a label older than the approval does not carry over', () => {
  // Cleared, then the patch changed, then re-approved: the old label must not reopen the gate.
  const r = gate({ labels: ['ssa-show', 'merge-auto'], events: [ev('labeled', 'merge-auto', 'anton', 10)] });
  assert.deepEqual([r.ok, r.remove], [false, true]);
  assert.match(r.reason, /before the approval/);
  assert.equal(gate({ labels: ['ssa-show', 'merge-auto'], events: [ev('labeled', 'merge-auto', 'anton', 20)] }).ok, true);
});

test('merge-gate: merge-human wins when both labels are present', () => {
  const events = [ev('labeled', 'merge-auto', 'anton'), ev('labeled', 'merge-human', 'anton')];
  const r = gate({ labels: ['ssa-ask', 'merge-auto', 'merge-human'], events });
  assert.deepEqual([r.ok, r.remove], [false, false]);
});

test('merge-human: only a person on the humans list clears it', () => {
  const held = [ev('labeled', 'merge-human', 'anton')];
  assert.equal(mergeHumanInForce({ labels: [], events: [...held, ev('unlabeled', 'merge-human', 'anton')], config }), true);
  assert.equal(mergeHumanInForce({ labels: [], events: [...held, ev('unlabeled', 'merge-human', 'author-bot')], config }), true);
  assert.equal(mergeHumanInForce({ labels: [], events: [...held, ev('unlabeled', 'merge-human', 'Chuka')], config }), false);
  assert.equal(mergeHumanInForce({ labels: [], events: [], config }), false);
});

test('merge-gate: a person clears merge-human, then their merge-auto opens it', () => {
  const events = [ev('labeled', 'merge-human', 'anton', 21), ev('unlabeled', 'merge-human', 'chuka', 40), ev('labeled', 'merge-auto', 'chuka', 41)];
  assert.equal(gate({ labels: ['ssa-ask', 'merge-auto'], events }).ok, true);
});

test('approval: each approver\'s latest verdict counts, and only approvers count', () => {
  assert.equal(latestApproval([rev('author-bot', 'APPROVED', 'c1', 1)], config), null);
  assert.equal(latestApproval([rev('anton', 'APPROVED', 'c1', 1), rev('anton', 'CHANGES_REQUESTED', 'c2', 2)], config), null);
  assert.equal(latestApproval([rev('anton', 'APPROVED', 'c1', 1), rev('anton', 'DISMISSED', 'c1', 2)], config), null);
  assert.equal(latestApproval([rev('anton', 'APPROVED', 'c1', 1), rev('anton', 'COMMENTED', 'c2', 2)], config).commit, 'c1');
  assert.equal(latestApproval([rev('anton', 'APPROVED', 'c1', 1), rev('Chuka', 'APPROVED', 'c2', 2)], config).commit, 'c2');
});
