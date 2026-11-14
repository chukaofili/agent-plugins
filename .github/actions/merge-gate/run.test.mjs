// Drives run() end to end against a fake GitHub API and real git repositories.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run, githubApi } from './main.mjs';
import { fetchCommits } from './replay.mjs';

const CONFIG = JSON.stringify({ merge_approvers: ['anton'], humans: ['chuka'], ask_paths: ['**/migrations/**'] });
const T = (min) => `2026-11-14T10:${String(min).padStart(2, '0')}:00Z`;
const approvedAt = (commit, min = 20) => [{ actor: 'anton', state: 'APPROVED', commit, at: T(min) }];
const labelled = (min = 30, actor = 'anton') => [{ event: 'labeled', label: 'merge-auto', actor, at: T(min) }];

function fakeApi({ labels, files = ['src/a.ts'], events = [], reviews = [], repo = null, config = CONFIG, failFilesOnce = false }) {
  const calls = [];
  let filesFailed = false;
  return {
    calls,
    config: async () => { if (config === null) throw new Error('HTTP 404'); return config; },
    labels: async () => [...labels],
    files: async () => { if (failFilesOnce && !filesFailed) { filesFailed = true; throw new Error('HTTP 502'); } return files; },
    labelEvents: async () => events,
    reviews: async () => reviews,
    mergeBase: async (base, head) => { if (!repo) throw new Error('HTTP 404'); return repo.git('merge-base', base, head); },
    removeLabel: async (n, label) => { calls.push(['removeLabel', label]); },
    comment: async (n, body) => { calls.push(['comment', body]); },
  };
}
const pr = (action, head = 'H2aaaaaaa', base = 'B2') => ({ action, pull_request: { number: 7, base: { sha: base }, head: { sha: head } } });
// The commits are fetched for real, by SHA and one snapshot deep, the way the action fetches them.
const go = (check, event, api, { eventName = 'pull_request_target', repo = null } = {}) =>
  run({ check, eventName, event, api, configPath: 'c.json', defaultBranch: 'main', fetchGit: (shas) => fetchCommits({ url: `file://${repo.dir}`, shas }) });

const AUTH = (admin, anon) => `def allow_admin():\n    a = 1\n    b = 2\n    return ${admin}\n    c = 3\n\n\ndef allow_anonymous():\n    a = 1\n    b = 2\n    return ${anon}\n    c = 3\n`;

// A repository with an approved commit and the pushes that might follow it.
function repo() {
  const dir = mkdtempSync(join(tmpdir(), 'gate-'));
  const git = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' } }).trim();
  const write = (f, s) => writeFileSync(join(dir, f), s);
  const commit = (msg) => { git('commit', '-qam', msg); return git('rev-parse', 'HEAD'); };
  git('init', '-q', '-b', 'main');
  git('config', 'uploadpack.allowAnySHA1InWant', 'true'); // GitHub serves any commit by SHA; so must the stand-in
  write('auth.py', AUTH('False', 'False')); write('b.txt', 'b\n'); git('add', '.'); git('commit', '-qm', 'base');
  const oldMain = git('rev-parse', 'HEAD');
  git('checkout', '-qb', 'feature');
  write('auth.py', AUTH('True', 'False'));
  const approved = commit('let admins in');
  git('commit', '-q', '--amend', '-m', 'reworded');
  const reworded = git('rev-parse', 'HEAD');
  git('checkout', '-q', 'main'); write('b.txt', 'b moved on\n');
  const main = commit('main moves');
  git('checkout', '-q', 'feature'); git('rebase', '-q', 'main');
  const rebased = git('rev-parse', 'HEAD');
  // Same words, different place: the admin change is undone and applied to the other function.
  write('auth.py', AUTH('False', 'True'));
  const relocated = commit('relocate');
  // Same words, different indentation: the return leaves its block.
  write('auth.py', AUTH('True', 'False').replace('    return True', 'return True'));
  const dedented = commit('dedent');
  return { dir, git, oldMain, main, approved, reworded, rebased, relocated, dedented };
}
const cleared = (g, extra = {}) => fakeApi({ labels: ['ssa-show', 'merge-auto'], events: labelled(), reviews: approvedAt(g.approved), repo: g, ...extra });

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
  const api = cleared(g);
  const r = await go('merge-gate', pr('synchronize', g.rebased, g.main), api, { repo: g });
  assert.deepEqual([r.ok, r.removed, api.calls], [true, false, []]);
});

test('a reworded commit on the same base keeps the gate open', async () => {
  const g = repo();
  const r = await go('merge-gate', pr('synchronize', g.reworded, g.oldMain), cleared(g), { repo: g });
  assert.equal(r.ok, true);
});

test('a new commit on the same base shuts the gate', async () => {
  const g = repo();
  g.git('checkout', '-q', '-b', 'more', g.approved);
  writeFileSync(join(g.dir, 'b.txt'), 'and one more thing\n');
  g.git('commit', '-qam', 'more');
  const r = await go('merge-gate', pr('synchronize', g.git('rev-parse', 'HEAD'), g.oldMain), cleared(g), { repo: g });
  assert.deepEqual([r.ok, r.removed], [false, true]);
});

test('the same edit moved to another function shuts the gate', async () => {
  // Both diffs read "-    return False / +    return True" in identical context.
  const g = repo();
  const api = cleared(g);
  const r = await go('merge-gate', pr('synchronize', g.relocated, g.main), api, { repo: g });
  assert.deepEqual([r.ok, r.removed], [false, true]);
  assert.match(r.reason, /older patch/);
});

test('a push that only changes indentation shuts the gate and removes merge-auto', async () => {
  const g = repo();
  const api = cleared(g);
  const r = await go('merge-gate', pr('synchronize', g.dedented, g.main), api, { repo: g });
  assert.deepEqual([r.ok, r.removed], [false, true]);
  assert.deepEqual(api.calls.map((c) => c[0]), ['removeLabel', 'comment']);
});

test('a rebase that needed a conflict resolution shuts the gate', async () => {
  const g = repo();
  g.git('checkout', '-q', 'main');
  writeFileSync(join(g.dir, 'auth.py'), AUTH('None', 'False'));
  g.git('commit', '-qam', 'main touches the same line');
  const main2 = g.git('rev-parse', 'HEAD');
  g.git('checkout', '-q', '-b', 'resolved', main2);
  writeFileSync(join(g.dir, 'auth.py'), AUTH('True', 'False'));
  g.git('commit', '-qam', 'resolved by hand');
  const r = await go('merge-gate', pr('synchronize', g.git('rev-parse', 'HEAD'), main2), cleared(g), { repo: g });
  assert.equal(r.ok, false);
});

test('a failed run on the push does not let a later label event reopen the gate', async () => {
  const g = repo();
  const api = cleared(g, { labels: ['ssa-show', 'merge-auto', 'bug'], failFilesOnce: true });
  await assert.rejects(go('merge-gate', pr('synchronize', g.dedented, g.main), api, { repo: g }), /HTTP 502/);
  assert.deepEqual(api.calls, []); // the push run died before it could remove anything
  const r = await go('merge-gate', pr('labeled', g.dedented, g.main), api, { repo: g });
  assert.deepEqual([r.ok, r.removed], [false, true]);
  assert.match(r.reason, /older patch/);
});

test('an approved commit that can no longer be fetched covers nothing', async () => {
  const g = repo();
  const api = cleared(g, { reviews: approvedAt('0'.repeat(40)) });
  assert.equal((await go('merge-gate', pr('synchronize', g.rebased, g.main), api, { repo: g })).ok, false);
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
  assert.equal((await go('merge-gate', {}, fakeApi({ labels: [] }), { eventName: 'merge_group' })).ok, true);
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
    if (url.includes('/compare/b...h')) return json({ merge_base_commit: { sha: 'mb1' } });
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
  assert.equal(await api.mergeBase('b', 'h'), 'mb1');
  await assert.rejects(api.mergeBase('x', 'y'), /HTTP 404/);
});
