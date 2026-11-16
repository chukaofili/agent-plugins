// Drives entry(), the action's whole flow behind the script shim: env and event
// in, the verdict line out. GitHub is the fake; git is a real repository served
// over file://, at the path the action builds from GITHUB_SERVER_URL and GITHUB_REPOSITORY.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { entry } from './main.mjs';
import { fakeGitHub, reply, gateRun, gateRuns, prRoutes, review, labelEvent } from './fake-github.mjs';

const CONFIG = JSON.stringify({ merge_approvers: ['anton'], humans: ['chuka'], ask_paths: ['**/migrations/**'] });
const HEAD = 'H2aaaaaaa';

const env = (o = {}) => ({ GATE_CHECK: 'merge-gate', GITHUB_EVENT_NAME: 'pull_request_target', GITHUB_TOKEN: 't', GITHUB_REPOSITORY: 'o/r', GITHUB_SERVER_URL: 'file:///nowhere', GATE_CONFIG_PATH: 'c.json', GATE_WORKFLOW: 'merge-gate.yml', ...o });
const prEvent = (head = HEAD, base = 'B2', branch = 'main') => ({ repository: { default_branch: branch }, pull_request: { number: 7, user: { login: 'author-bot' }, base: { sha: base }, head: { sha: head } } });
const go = (gh, e, event) => entry({ env: e, event, fetchImpl: gh.fetchImpl, sleep: async () => {} });

// A repository at <server>/o/r with an approved commit, and a head that is a clean rebase of it onto a moved base.
function repo() {
  const server = mkdtempSync(join(tmpdir(), 'gate-entry-'));
  const dir = join(server, 'o', 'r');
  mkdirSync(dir, { recursive: true });
  const git = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' } }).trim();
  const commit = (msg) => { git('commit', '-qam', msg); return git('rev-parse', 'HEAD'); };
  git('init', '-q', '-b', 'main');
  git('config', 'uploadpack.allowAnySHA1InWant', 'true');
  writeFileSync(join(dir, 'a.txt'), 'a\n'); writeFileSync(join(dir, 'b.txt'), 'b\n'); git('add', '.'); git('commit', '-qm', 'base');
  git('checkout', '-qb', 'feature');
  writeFileSync(join(dir, 'a.txt'), 'a changed\n');
  const approved = commit('feature');
  git('checkout', '-q', 'main'); writeFileSync(join(dir, 'b.txt'), 'b moved on\n');
  const main = commit('main moves');
  git('checkout', '-q', 'feature'); git('rebase', '-q', 'main');
  const rebased = git('rev-parse', 'HEAD');
  return { server, main, approved, rebased, git };
}

// GitHub for PR #7. /compare answers from the test repository.
function gitHub({ g = null, config = CONFIG, fail = {}, ...rest }) {
  const compare = ({ params }) => {
    const [base, head] = params.range.split('...');
    return { merge_base_commit: { sha: g.git('merge-base', base, head) } };
  };
  return fakeGitHub({ routes: { ...prRoutes({ config, ...rest }), ...(g ? { 'GET /compare/:range': compare } : {}) }, fail });
}
const cleared = { labels: ['ssa-show', 'merge-auto'], events: [labelEvent('labeled', 'merge-auto', 'anton', 30)] };

test('an unknown check fails closed and makes no request', async () => {
  const gh = gitHub({});
  const r = await go(gh, env({ GATE_CHECK: 'nope' }), prEvent());
  assert.deepEqual(r, { ok: false, line: 'unknown check "nope"' });
  assert.deepEqual(gh.requests, []);
});

test('merge-gate reads the config from the default branch at GATE_CONFIG_PATH', async () => {
  const gh = gitHub({ ...cleared, reviews: [review('anton', 'APPROVED', HEAD, 20)] });
  const r = await go(gh, env(), prEvent(HEAD, 'B2', 'trunk'));
  assert.equal(r.ok, true, r.line);
  const reads = gh.requests.filter((q) => q.path === '/contents/c.json');
  assert.deepEqual(reads.map((q) => q.query.ref), ['trunk']);
});

test('an API failure fails closed with the gate could not run', async () => {
  const gh = gitHub({ labels: ['ssa-show'], fail: { 'GET /issues/7/labels': [502] } });
  const r = await go(gh, env(), prEvent());
  assert.equal(r.ok, false);
  assert.match(r.line, /^merge-gate: not passing\. the gate could not run: .*HTTP 502/);
});

test('rerun re-runs the gate workflow run for the triggering head', async () => {
  const gh = fakeGitHub({ routes: { 'GET /actions/workflows/merge-gate.yml/runs': gateRuns([gateRun(11)]), 'POST /actions/runs/:id/rerun': reply(201) } });
  const r = await go(gh, env({ GATE_CHECK: 'rerun' }), { repository: { default_branch: 'main' }, workflow_run: { head_sha: HEAD } });
  assert.equal(r.ok, true, r.line);
  assert.match(r.line, /^rerun: pass\. re-ran merge-gate\.yml run 11 for H2aaaaa/);
  const list = gh.requests.find((q) => q.path.endsWith('/runs'));
  assert.equal(list.query.head_sha, HEAD);
  assert.deepEqual(gh.writes().map((w) => `${w.method} ${w.path}`), ['POST /actions/runs/11/rerun']);
});

test('merge-gate passes an approval at an older commit when the head is a clean rebase of it', async () => {
  const g = repo();
  const gh = gitHub({ g, ...cleared, reviews: [review('anton', 'APPROVED', g.approved, 20)] });
  const r = await go(gh, env({ GITHUB_SERVER_URL: `file://${g.server}` }), prEvent(g.rebased, g.main));
  assert.equal(r.ok, true, r.line);
  assert.match(r.line, /^merge-gate: pass\. /);
});

test('label-check reports a pass in the verdict line', async () => {
  const gh = gitHub({ labels: ['ssa-show'] });
  const r = await go(gh, env({ GATE_CHECK: 'label-check' }), prEvent());
  assert.equal(r.ok, true, r.line);
  assert.match(r.line, /^label-check: pass\. /);
});

test('a merge group passes without reading the pull request', async () => {
  const gh = gitHub({});
  const r = await go(gh, env({ GITHUB_EVENT_NAME: 'merge_group' }), { repository: { default_branch: 'main' } });
  assert.equal(r.ok, true, r.line);
  assert.match(r.line, /^merge-gate: pass\. merge group/);
  assert.deepEqual(gh.requests, []);
});
