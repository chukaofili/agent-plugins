import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseConfig, labelCheck, mergeGate, mergeHumanInForce, latestApproval, fingerprint, samePatch } from './decide.mjs';

const config = parseConfig(JSON.stringify({
  merge_approvers: ['anton', 'Chuka'],
  humans: ['chuka'],
  ask_paths: ['**/migrations/**', '**/billing/**'],
}));
const T = (min) => `2026-11-14T10:${String(min).padStart(2, '0')}:00Z`;
const ev = (event, label, actor, min = 30) => ({ event, label, actor, at: T(min) });
const rev = (actor, state, commit, min) => ({ actor, state, commit, at: T(min) });
const approval = rev('anton', 'APPROVED', 'aaaaaaa1', 20);
const gate = (o) => mergeGate({ config, labelCheckResult: passing, approval, covered: true, events: [], ...o });
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

const diff = (body, index = 'index 1111111..2222222 100644', hunk = '@@ -1,2 +1,5 @@') =>
  `diff --git a/a.py b/a.py\n${index}\n--- a/a.py\n+++ b/a.py\n${hunk}\n def allowed(admin):\n${body} return False\n`;

test('fingerprint: ignores what a rebase moves', () => {
  const body = '+    if admin:\n+        return True\n';
  assert.equal(fingerprint(diff(body)), fingerprint(diff(body, 'index 3333333..4444444 100644', '@@ -40,2 +44,5 @@ class X:')));
});

test('fingerprint: whitespace counts, unlike git patch-id', () => {
  // Dedenting the return makes allowed(False) true. Same words, different program.
  const inside = '+    if admin:\n+        pass\n+        return True\n';
  const outside = '+    if admin:\n+        pass\n+    return True\n';
  assert.notEqual(fingerprint(diff(inside)), fingerprint(diff(outside)));
  assert.equal(samePatch(fingerprint(diff(inside)), fingerprint(diff(outside))), false);
});

test('fingerprint: a changed word, an empty diff and binary content never match', () => {
  assert.notEqual(fingerprint(diff('+    return admin\n')), fingerprint(diff('+    return True\n')));
  assert.equal(fingerprint(''), null);
  assert.equal(fingerprint('diff --git a/x.png b/x.png\nindex 1..2 100644\nBinary files a/x.png and b/x.png differ\n'), null);
  assert.equal(samePatch(null, null), false);
});
