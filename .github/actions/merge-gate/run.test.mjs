// Drives run() end to end against a fake GitHub API, with diffs from real git.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run, githubApi } from './main.mjs';
import { fingerprint } from './decide.mjs';

const CONFIG = JSON.stringify({ merge_approvers: ['anton'], humans: ['chuka'], ask_paths: ['**/migrations/**'] });
const T = (min) => `2026-11-14T10:${String(min).padStart(2, '0')}:00Z`;
const approvedAt = (commit, min = 20) => [{ actor: 'anton', state: 'APPROVED', commit, at: T(min) }];
const labelled = (min = 30, actor = 'anton') => [{ event: 'labeled', label: 'merge-auto', actor, at: T(min) }];

function fakeApi({ labels, files = ['src/a.ts'], events = [], reviews = [], diffs = {}, config = CONFIG, failFilesOnce = false }) {
  const calls = [];
  let filesFailed = false;
  return {
    calls,
    config: async () => { if (config === null) throw new Error('HTTP 404'); return config; },
    labels: async () => [...labels],
    files: async () => { if (failFilesOnce && !filesFailed) { filesFailed = true; throw new Error('HTTP 502'); } return files; },
    labelEvents: async () => events,
    reviews: async () => reviews,
    diff: async (base, head) => { const d = diffs[`${base}...${head}`]; if (d === undefined) throw new Error('HTTP 404'); return d; },
    removeLabel: async (n, label) => { calls.push(['removeLabel', label]); },
    comment: async (n, body) => { calls.push(['comment', body]); },
  };
}
const pr = (action, head = 'H2aaaaaaa', base = 'B2') => ({ action, pull_request: { number: 7, base: { sha: base }, head: { sha: head } } });
const go = (check, event, api, eventName = 'pull_request_target') => run({ check, eventName, event, api, configPath: 'c.json', defaultBranch: 'main' });

// A real repository: approved commit, a clean rebase of it, then an edit that
// only changes indentation and with it what the function returns.
function repo() {
  const dir = mkdtempSync(join(tmpdir(), 'gate-'));
  const git = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' } }).trim();
  const write = (f, s) => writeFileSync(join(dir, f), s);
  git('init', '-q', '-b', 'main');
  write('a.py', 'def allowed(admin):\n    return False\n'); write('b.txt', 'b\n'); git('add', '.'); git('commit', '-qm', 'base');
  git('checkout', '-qb', 'feature');
  write('a.py', 'def allowed(admin):\n    if admin:\n        pass\n        return True\n    return False\n'); git('commit', '-qam', 'feature');
  const approved = git('rev-parse', 'HEAD');
  git('checkout', '-q', 'main'); write('b.txt', 'b moved on\n'); git('commit', '-qam', 'main moves');
  git('checkout', '-q', 'feature'); git('rebase', '-q', 'main');
  const rebased = git('rev-parse', 'HEAD');
  write('a.py', 'def allowed(admin):\n    if admin:\n        pass\n    return True\n    return False\n'); git('commit', '-qam', 'dedent');
  const dedented = git('rev-parse', 'HEAD');
  const main = git('rev-parse', 'main');
  const diff = (head) => git('diff', `${git('merge-base', main, head)}..${head}`) + '\n';
  const patchId = (head) => execFileSync('git', ['patch-id', '--stable'], { cwd: dir, input: diff(head), encoding: 'utf8' }).split(' ')[0];
  const diffs = Object.fromEntries([approved, rebased, dedented].map((h) => [`${main}...${h}`, diff(h)]));
  return { main, approved, rebased, dedented, diff, diffs, patchId };
}

test('real diffs: the fingerprint survives a clean rebase and catches a dedent that git patch-id misses', () => {
  const r = repo();
  assert.equal(fingerprint(r.diff(r.approved)), fingerprint(r.diff(r.rebased)));
  assert.notEqual(fingerprint(r.diff(r.rebased)), fingerprint(r.diff(r.dedented)));
  assert.equal(r.patchId(r.rebased), r.patchId(r.dedented)); // why patch-id is not used
});

test('label-check reports on its own and never touches labels', async () => {
  const api = fakeApi({ labels: ['ssa-ship', 'merge-auto'], files: ['db/migrations/1.sql'] });
  assert.equal((await go('label-check', pr('synchronize'), api)).ok, false);
  assert.deepEqual(api.calls, []);
});

test('label-check passes on a correctly labelled PR that nobody has cleared to merge', async () => {
  const api = fakeApi({ labels: ['ssa-show'] });
  assert.equal((await go('label-check', pr('opened'), api)).ok, true);
  assert.equal((await go('merge-gate', pr('opened'), api)).ok, false);
});

test('approved and cleared at the head: open, no diff needed', async () => {
  const api = fakeApi({ labels: ['ssa-show', 'merge-auto'], events: labelled(), reviews: approvedAt('H2aaaaaaa') });
  const r = await go('merge-gate', pr('labeled'), api);
  assert.deepEqual([r.ok, r.removed, api.calls], [true, false, []]);
});

test('a clean rebase after clearance keeps the gate open', async () => {
  const g = repo();
  const api = fakeApi({ labels: ['ssa-show', 'merge-auto'], events: labelled(), reviews: approvedAt(g.approved), diffs: g.diffs });
  const r = await go('merge-gate', pr('synchronize', g.rebased, g.main), api);
  assert.deepEqual([r.ok, r.removed, api.calls], [true, false, []]);
});

test('a push that only changes indentation shuts the gate and removes merge-auto', async () => {
  const g = repo();
  const api = fakeApi({ labels: ['ssa-show', 'merge-auto'], events: labelled(), reviews: approvedAt(g.approved), diffs: g.diffs });
  const r = await go('merge-gate', pr('synchronize', g.dedented, g.main), api);
  assert.deepEqual([r.ok, r.removed], [false, true]);
  assert.deepEqual(api.calls.map((c) => c[0]), ['removeLabel', 'comment']);
});

test('a failed run on the push does not let a later label event reopen the gate', async () => {
  const g = repo();
  const api = fakeApi({ labels: ['ssa-show', 'merge-auto', 'bug'], events: labelled(), reviews: approvedAt(g.approved), diffs: g.diffs, failFilesOnce: true });
  await assert.rejects(go('merge-gate', pr('synchronize', g.dedented, g.main), api), /HTTP 502/);
  assert.deepEqual(api.calls, []); // the push run died before it could remove anything
  const r = await go('merge-gate', pr('labeled', g.dedented, g.main), api);
  assert.deepEqual([r.ok, r.removed], [false, true]);
  assert.match(r.reason, /older patch/);
});

test('an approved commit that can no longer be compared covers nothing', async () => {
  const api = fakeApi({ labels: ['ssa-show', 'merge-auto'], events: labelled(), reviews: approvedAt('gone'), diffs: { 'B2...H2aaaaaaa': 'diff --git a/x b/x\n--- a/x\n+++ b/x\n@@ -1 +1 @@\n-a\n+b\n' } });
  assert.equal((await go('merge-gate', pr('synchronize'), api)).ok, false);
});

test('re-approved after a change: the old label does not carry over until it is added again', async () => {
  const stale = fakeApi({ labels: ['ssa-show', 'merge-auto'], events: labelled(30), reviews: [...approvedAt('H1', 20), ...approvedAt('H2aaaaaaa', 40)] });
  assert.deepEqual([(await go('merge-gate', pr('labeled'), stale)).ok, stale.calls[0]], [false, ['removeLabel', 'merge-auto']]);
  const fresh = fakeApi({ labels: ['ssa-show', 'merge-auto'], events: [...labelled(30), ...labelled(41)], reviews: [...approvedAt('H1', 20), ...approvedAt('H2aaaaaaa', 40)] });
  assert.equal((await go('merge-gate', pr('labeled'), fresh)).ok, true);
});

test('no approval yet: shut, and the label is left alone', async () => {
  const api = fakeApi({ labels: ['ssa-show', 'merge-auto'], events: labelled() });
  const r = await go('merge-gate', pr('labeled'), api);
  assert.deepEqual([r.ok, r.removed, api.calls], [false, false, []]);
});

test('a label that cannot be removed leaves the gate shut all the same', async () => {
  const api = fakeApi({ labels: ['ssa-show', 'merge-auto'], events: labelled(), reviews: approvedAt('H1') });
  api.removeLabel = async () => { throw new Error('HTTP 403'); };
  assert.deepEqual(await go('merge-gate', pr('synchronize'), api).then((r) => [r.ok, r.removed]), [false, false]);
});

test('a missing config fails both checks closed', async () => {
  for (const check of ['label-check', 'merge-gate']) {
    const r = await go(check, pr('labeled'), fakeApi({ labels: ['ssa-ask', 'merge-auto'], events: labelled(), reviews: approvedAt('H2aaaaaaa'), config: null }));
    assert.equal(r.ok, false);
    assert.match(r.reason, /cannot read c\.json/);
  }
});

test('a merge group passes: the gate held when the pull request was queued', async () => {
  assert.equal((await go('merge-gate', {}, fakeApi({ labels: [] }), 'merge_group')).ok, true);
});

test('the API client pages, maps events and reviews, and gives up on a truncated file list', async () => {
  const seen = [];
  const json = (body) => ({ ok: true, status: 200, json: async () => body, text: async () => body });
  const fetchImpl = async (url, init) => {
    seen.push(`${init.method} ${url.replace('https://api.github.com/repos/o/r', '')}`);
    const page = Number(new URL(url).searchParams.get('page'));
    if (url.includes('/issues/7/events')) {
      return json(page === 1
        ? [...Array(99).fill({ event: 'commented' }), { event: 'labeled', label: { name: 'merge-auto' }, actor: { login: 'anton' }, created_at: T(1) }]
        : [{ event: 'unlabeled', label: { name: 'merge-auto' }, actor: { login: 'github-actions[bot]' }, created_at: T(2) }]);
    }
    if (url.includes('/pulls/7/reviews')) return json([{ user: { login: 'anton' }, state: 'APPROVED', commit_id: 'c1', submitted_at: T(3) }, { user: null, state: 'COMMENTED' }]);
    if (url.includes('/pulls/7/files')) return json(page <= 30 ? Array(100).fill({ filename: 'a.ts' }) : []);
    if (url.includes('/pulls/8/files')) return json([{ filename: 'new.ts', previous_filename: 'db/migrations/old.sql' }]);
    if (url.includes('/contents/')) return json({ content: Buffer.from('{"x":1}').toString('base64') });
    return { ok: false, status: 404 };
  };
  const api = githubApi({ token: 't', repo: 'o/r', fetchImpl });
  assert.deepEqual(await api.labelEvents(7), [
    { event: 'labeled', label: 'merge-auto', actor: 'anton', at: T(1) },
    { event: 'unlabeled', label: 'merge-auto', actor: 'github-actions[bot]', at: T(2) },
  ]);
  assert.deepEqual(await api.reviews(7), [{ actor: 'anton', state: 'APPROVED', commit: 'c1', at: T(3) }]);
  assert.equal(await api.files(7), null);
  assert.deepEqual(await api.files(8), ['new.ts', 'db/migrations/old.sql']);
  assert.equal(await api.config('.github/c.json', 'main'), '{"x":1}');
  assert.ok(seen.includes('GET /contents/.github/c.json?ref=main'));
  await assert.rejects(api.diff('a', 'b'), /HTTP 404/);
});
