// Drives run() end to end through githubApi against a fake GitHub and real git repositories.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run, githubApi } from './main.mjs';
import { fetchCommits } from './replay.mjs';
import { fakeGitHub, reply, prRoutes, review, labelEvent, file } from './fake-github.mjs';

const CONFIG = JSON.stringify({ merge_approvers: ['anton'], humans: ['chuka'], ask_paths: ['**/migrations/**'] });
const approvedAt = (commit, min = 20) => [review('anton', 'APPROVED', commit, min)];
const labelled = (min = 30, actor = 'anton') => [labelEvent('labeled', 'merge-auto', actor, min)];
const REMOVE = 'DELETE /issues/7/labels/merge-auto';
const COMMENT = 'POST /issues/7/comments';

// GitHub for PR #7. /compare answers from the test repository, as GitHub
// answers from the real one; without a repository, or for a commit it lacks, it is a 404.
function gitHub({ labels, files = ['src/a.ts'], events = [], reviews = [], repo = null, config = CONFIG, fail = {} }) {
  const compare = ({ params }) => {
    const [base, head] = params.range.split('...');
    try {
      return { merge_base_commit: { sha: repo.git('merge-base', base, head) } };
    } catch {
      return reply(404, { message: 'Not Found' });
    }
  };
  const gh = fakeGitHub({ routes: { ...prRoutes({ config, labels, files: files.map((f) => (typeof f === 'string' ? file(f) : f)), events, reviews }), 'GET /compare/:range': compare }, fail });
  return { ...gh, api: githubApi({ token: 't', repo: 'o/r', fetchImpl: gh.fetchImpl }), written: () => gh.writes().map((w) => `${w.method} ${w.path}`) };
}
const pr = (action, head = 'H2aaaaaaa', base = 'B2', author = 'author-bot') => ({ action, pull_request: { number: 7, user: { login: author }, base: { sha: base }, head: { sha: head } } });
// The commits are fetched for real, by SHA and one snapshot deep, the way the action fetches them.
const go = (check, event, gh, { eventName = 'pull_request_target', repo = null } = {}) =>
  run({ check, eventName, event, api: gh.api, configPath: 'c.json', defaultBranch: 'main', fetchGit: (shas) => fetchCommits({ url: `file://${repo.dir}`, shas }) });

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

const cleared = (g, extra = {}) => gitHub({ labels: ['ssa-show', 'merge-auto'], events: labelled(), reviews: approvedAt(g.approved), repo: g, ...extra });

test('label-check reports on its own and never touches labels', async () => {
  const gh = gitHub({ labels: ['ssa-ship', 'merge-auto'], files: ['db/migrations/1.sql'] });
  assert.equal((await go('label-check', pr('synchronize'), gh)).ok, false);
  assert.deepEqual(gh.written(), []);
});

test('label-check passes on a correctly labelled PR that nobody has cleared to merge', async () => {
  const gh = gitHub({ labels: ['ssa-show'] });
  assert.equal((await go('label-check', pr('opened'), gh)).ok, true);
  assert.equal((await go('merge-gate', pr('opened'), gh)).ok, false);
});

test('a file renamed out of the ask list still counts as touching it', async () => {
  const gh = gitHub({ labels: ['ssa-show'], files: [file('src/new.sql', 'db/migrations/old.sql')] });
  const r = await go('label-check', pr('synchronize'), gh);
  assert.equal(r.ok, false);
  assert.match(r.reason, /db\/migrations\/old\.sql/);
});

test('a file list too long to read in full needs ssa-ask', async () => {
  // GitHub stops listing a pull request's files at 3000.
  const gh = gitHub({ labels: ['ssa-show'], files: Array.from({ length: 3000 }, (_, i) => `src/${i}.ts`) });
  const r = await go('label-check', pr('synchronize'), gh);
  assert.equal(r.ok, false);
  assert.match(r.reason, /could not be listed in full/);
});

test('the gate config is read from the default branch, never the pull request', async () => {
  const gh = gitHub({ labels: ['ssa-show'] });
  await go('label-check', pr('opened'), gh);
  assert.deepEqual(gh.requests.filter((r) => r.path === '/contents/c.json').map((r) => r.query.ref), ['main']);
});

test('approved and cleared at the head: open, no diff needed', async () => {
  const gh = gitHub({ labels: ['ssa-show', 'merge-auto'], events: labelled(), reviews: approvedAt('H2aaaaaaa') });
  const r = await go('merge-gate', pr('labeled'), gh);
  assert.deepEqual([r.ok, r.removed, gh.written()], [true, false, []]);
});

test('a merge-auto label event past the first page of the PR\'s history still counts', async () => {
  const chatter = Array.from({ length: 120 }, () => ({ event: 'commented', created_at: '2026-11-14T10:00:00Z' }));
  const gh = gitHub({ labels: ['ssa-show', 'merge-auto'], events: [...chatter, ...labelled()], reviews: approvedAt('H2aaaaaaa') });
  assert.equal((await go('merge-gate', pr('labeled'), gh)).ok, true);
});

test('a review from a deleted account is skipped, not fatal', async () => {
  // GitHub reports a deleted reviewer as user: null.
  const ghost = { user: null, state: 'COMMENTED', commit_id: 'H2aaaaaaa', submitted_at: null };
  const gh = gitHub({ labels: ['ssa-show', 'merge-auto'], events: labelled(), reviews: [ghost, ...approvedAt('H2aaaaaaa')] });
  assert.equal((await go('merge-gate', pr('labeled'), gh)).ok, true);
});

test('an approver who authored the PR cannot open its gate with merge-auto', async () => {
  const gh = gitHub({ labels: ['ssa-show', 'merge-auto'], events: labelled(30, 'anton'), reviews: [review('chuka', 'APPROVED', 'H2aaaaaaa', 20)], config: JSON.stringify({ merge_approvers: ['anton', 'chuka'], humans: ['chuka'] }) });
  const r = await go('merge-gate', pr('labeled', 'H2aaaaaaa', 'B2', 'anton'), gh);
  assert.deepEqual([r.ok, gh.written()], [false, []]);
  assert.match(r.reason, /anton.*author/);
});

test('a clean rebase after clearance keeps the gate open', async () => {
  const g = repo();
  const gh = cleared(g);
  const r = await go('merge-gate', pr('synchronize', g.rebased, g.main), gh, { repo: g });
  assert.deepEqual([r.ok, r.removed, gh.written()], [true, false, []]);
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
  const r = await go('merge-gate', pr('synchronize', g.relocated, g.main), cleared(g), { repo: g });
  assert.deepEqual([r.ok, r.removed], [false, true]);
  assert.match(r.reason, /older patch/);
});

test('a push that only changes indentation shuts the gate and removes merge-auto', async () => {
  const g = repo();
  const gh = cleared(g);
  const r = await go('merge-gate', pr('synchronize', g.dedented, g.main), gh, { repo: g });
  assert.deepEqual([r.ok, r.removed], [false, true]);
  assert.deepEqual(gh.written(), [REMOVE, COMMENT]);
  assert.match(gh.writes()[1].body.body, /^Removed `merge-auto` at /);
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
  const gh = cleared(g, { labels: ['ssa-show', 'merge-auto', 'bug'], fail: { 'GET /pulls/7/files': [502] } });
  await assert.rejects(go('merge-gate', pr('synchronize', g.dedented, g.main), gh, { repo: g }), /HTTP 502/);
  assert.deepEqual(gh.written(), []); // the push run died before it could remove anything
  const r = await go('merge-gate', pr('labeled', g.dedented, g.main), gh, { repo: g });
  assert.deepEqual([r.ok, r.removed], [false, true]);
  assert.match(r.reason, /older patch/);
});

test('an approved commit that can no longer be fetched covers nothing', async () => {
  const g = repo();
  const gh = cleared(g, { reviews: approvedAt('0'.repeat(40)) });
  assert.equal((await go('merge-gate', pr('synchronize', g.rebased, g.main), gh, { repo: g })).ok, false);
});

test('re-approved after a change: the old label does not carry over until it is added again', async () => {
  const reviews = [...approvedAt('H1', 20), ...approvedAt('H2aaaaaaa', 40)];
  const stale = gitHub({ labels: ['ssa-show', 'merge-auto'], events: labelled(30), reviews });
  assert.deepEqual([(await go('merge-gate', pr('labeled'), stale)).ok, stale.written()[0]], [false, REMOVE]);
  const fresh = gitHub({ labels: ['ssa-show', 'merge-auto'], events: [...labelled(30), ...labelled(41)], reviews });
  assert.equal((await go('merge-gate', pr('labeled'), fresh)).ok, true);
});

test('no approval yet: shut, and the label is left alone', async () => {
  const gh = gitHub({ labels: ['ssa-show', 'merge-auto'], events: labelled() });
  const r = await go('merge-gate', pr('labeled'), gh);
  assert.deepEqual([r.ok, r.removed, gh.written()], [false, false, []]);
});

test('a label that cannot be removed leaves the gate shut all the same', async () => {
  const gh = gitHub({ labels: ['ssa-show', 'merge-auto'], events: labelled(), reviews: approvedAt('H1'), fail: { [REMOVE]: [403] } });
  assert.deepEqual(await go('merge-gate', pr('synchronize'), gh).then((r) => [r.ok, r.removed]), [false, false]);
});

test('a missing config fails both checks closed', async () => {
  for (const check of ['label-check', 'merge-gate']) {
    const r = await go(check, pr('labeled'), gitHub({ labels: ['ssa-ask', 'merge-auto'], events: labelled(), reviews: approvedAt('H2aaaaaaa'), config: null }));
    assert.equal(r.ok, false);
    assert.match(r.reason, /cannot read c\.json/);
  }
});

test('a merge group passes: the gate held when the pull request was queued', async () => {
  const gh = gitHub({ labels: [] });
  assert.equal((await go('merge-gate', {}, gh, { eventName: 'merge_group' })).ok, true);
  assert.deepEqual(gh.requests, []);
});
