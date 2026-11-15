// The review re-run: a review changed, so the gate's own pull_request_target
// run for the head is run again and rules on the PR as it now stands.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { run, githubApi } from './main.mjs';
import { rerunGate } from './rerun.mjs';

const T = (min) => `2026-11-14T10:${String(min).padStart(2, '0')}:00Z`;
const HEAD = 'H2aaaaaaa';
const gateRun = (id, status = 'completed', min = 30) => ({ id, status, created_at: T(min) });

function fakeApi({ runs = [[gateRun(11)]] } = {}) {
  const calls = [];
  let poll = 0;
  return {
    calls,
    gateRuns: async (workflow, sha) => { calls.push(['gateRuns', workflow, sha]); return runs[Math.min(poll++, runs.length - 1)]; },
    rerun: async (id) => { calls.push(['rerun', id]); },
  };
}
const rerun = (api, o = {}) => rerunGate({ api, headSha: HEAD, workflow: 'merge-gate.yml', sleep: async () => {}, ...o });

test('a green gate goes red when the re-run follows a dismissal', async () => {
  const reviews = [{ actor: 'anton', state: 'APPROVED', commit: HEAD, at: T(20) }];
  const prApi = {
    config: async () => JSON.stringify({ merge_approvers: ['anton'], humans: ['chuka'] }),
    labels: async () => ['ssa-show', 'merge-auto'],
    files: async () => ['src/a.ts'],
    labelEvents: async () => [{ event: 'labeled', label: 'merge-auto', actor: 'anton', at: T(30) }],
    reviews: async () => reviews,
    removeLabel: async () => {},
    comment: async () => {},
  };
  // The payload a re-run replays: the same pull_request_target event as the first attempt.
  const event = { pull_request: { number: 7, user: { login: 'author-bot' }, base: { sha: 'B2' }, head: { sha: HEAD } } };
  const gate = () => run({ check: 'merge-gate', eventName: 'pull_request_target', event, api: prApi, configPath: 'c.json', defaultBranch: 'main', fetchGit: () => { throw new Error('no git needed'); } });

  assert.equal((await gate()).ok, true);
  reviews.push({ actor: 'anton', state: 'DISMISSED', commit: HEAD, at: T(40) });
  const api = fakeApi();
  const r = await rerun(api);
  assert.equal(r.ok, true);
  assert.deepEqual(api.calls, [['gateRuns', 'merge-gate.yml', HEAD], ['rerun', 11]]);
  const after = await gate();
  assert.equal(after.ok, false);
  assert.match(after.reason, /no approval/);
});

test('the newest gate run for the head is the one re-run', async () => {
  const api = fakeApi({ runs: [[gateRun(11, 'completed', 10), gateRun(12, 'completed', 30), gateRun(13, 'completed', 20)]] });
  await rerun(api);
  assert.deepEqual(api.calls.at(-1), ['rerun', 12]);
});

test('a gate run still in progress is waited for, then re-run', async () => {
  // It may have read the reviews before this one changed.
  const api = fakeApi({ runs: [[gateRun(12, 'in_progress')], [gateRun(12, 'queued')], [gateRun(12)]] });
  const r = await rerun(api);
  assert.equal(r.ok, true);
  assert.deepEqual(api.calls.filter((c) => c[0] === 'rerun'), [['rerun', 12]]);
  assert.equal(api.calls.filter((c) => c[0] === 'gateRuns').length, 3);
});

test('a gate run that never finishes fails the re-run loudly instead of passing', async () => {
  const api = fakeApi({ runs: [[gateRun(12, 'in_progress')]] });
  const r = await rerun(api, { attempts: 3 });
  assert.equal(r.ok, false);
  assert.match(r.reason, /still in_progress/);
  assert.equal(api.calls.some((c) => c[0] === 'rerun'), false);
});

test('no gate run for the head fails loudly: nothing would update the check', async () => {
  const api = fakeApi({ runs: [[]] });
  const r = await rerun(api);
  assert.equal(r.ok, false);
  assert.match(r.reason, /no merge-gate\.yml run/);
});

test('an event without a head commit fails closed', async () => {
  const r = await rerun(fakeApi(), { headSha: undefined });
  assert.equal(r.ok, false);
});

test('the API client lists pull_request_target gate runs by head and posts the re-run', async () => {
  const seen = [];
  const fetchImpl = async (url, init) => {
    seen.push(`${init.method} ${url.replace('https://api.github.com/repos/o/r', '')}`);
    if (url.includes('/runs?')) return { ok: true, status: 200, json: async () => ({ workflow_runs: [{ id: 5, status: 'completed', created_at: T(1), extra: 1 }] }) };
    if (url.endsWith('/actions/runs/5/rerun')) return { ok: true, status: 201, json: async () => { throw new Error('empty body'); } };
    return { ok: false, status: 404 };
  };
  const api = githubApi({ token: 't', repo: 'o/r', fetchImpl });
  assert.deepEqual(await api.gateRuns('merge-gate.yml', 'abc'), [{ id: 5, status: 'completed', created_at: T(1) }]);
  await api.rerun(5);
  assert.deepEqual(seen, [
    'GET /actions/workflows/merge-gate.yml/runs?event=pull_request_target&head_sha=abc&per_page=20',
    'POST /actions/runs/5/rerun',
  ]);
});
