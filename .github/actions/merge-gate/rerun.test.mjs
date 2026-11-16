// The review re-run: a review changed, so the gate's own pull_request_target
// run for the head is run again and rules on the PR as it now stands. Every
// test goes through githubApi against a fake GitHub, so paging and the
// mapping of GitHub's run list are tested along with the choice of runs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { run, githubApi } from './main.mjs';
import { rerunGate } from './rerun.mjs';
import { fakeGitHub, reply, gateRun, gateRuns, polls, prRoutes, labelEvent, review } from './fake-github.mjs';

const HEAD = 'H2aaaaaaa';
const RUNS = 'GET /actions/workflows/merge-gate.yml/runs';

function gitHub(runs, routes = {}) {
  const gh = fakeGitHub({ routes: { [RUNS]: runs, 'POST /actions/runs/:id/rerun': reply(201), ...routes } });
  return { ...gh, api: githubApi({ token: 't', repo: 'o/r', fetchImpl: gh.fetchImpl }) };
}
const rerun = (gh, o = {}) => rerunGate({ api: gh.api, headSha: HEAD, workflow: 'merge-gate.yml', sleep: async () => {}, ...o });
const rerunIds = (gh) => gh.writes().map((w) => Number(w.path.match(/^\/actions\/runs\/(\d+)\/rerun$/)[1])).sort((a, b) => a - b);
const polled = (gh) => gh.requests.filter((r) => r.path.endsWith('/runs') && (r.query.page ?? '1') === '1').length;

test('a green gate goes red when the re-run follows a dismissal', async () => {
  const reviews = [review('anton', 'APPROVED', HEAD, 20)];
  const gh = gitHub(gateRuns([gateRun(11)]), prRoutes({
    config: JSON.stringify({ merge_approvers: ['anton'], humans: ['chuka'] }),
    labels: ['ssa-show', 'merge-auto'],
    events: [labelEvent('labeled', 'merge-auto', 'anton', 30)],
    reviews,
  }));
  // The payload a re-run replays: the same pull_request_target event as the first attempt.
  const event = { pull_request: { number: 7, user: { login: 'author-bot' }, base: { sha: 'B2' }, head: { sha: HEAD } } };
  const gate = () => run({ check: 'merge-gate', eventName: 'pull_request_target', event, api: gh.api, configPath: 'c.json', defaultBranch: 'main', fetchGit: () => { throw new Error('no git needed'); } });

  assert.equal((await gate()).ok, true);
  reviews.push(review('anton', 'DISMISSED', HEAD, 40));
  const r = await rerun(gh);
  assert.equal(r.ok, true);
  assert.deepEqual(rerunIds(gh), [11]);
  const after = await gate();
  assert.equal(after.ok, false);
  assert.match(after.reason, /no approval/);
});

test('only pull_request_target gate runs for the head are listed', async () => {
  const gh = gitHub(gateRuns([gateRun(11)]));
  await rerun(gh);
  const list = gh.requests.find((r) => r.path.endsWith('/runs'));
  assert.deepEqual([list.query.event, list.query.head_sha], ['pull_request_target', HEAD]);
});

test('the newest gate run for the head is the one re-run', async () => {
  const gh = gitHub(gateRuns([gateRun(11, { min: 10 }), gateRun(12, { min: 30 }), gateRun(13, { min: 20 })]));
  await rerun(gh);
  assert.deepEqual(rerunIds(gh), [12]);
});

test('two pull requests on the same head: each one\'s newest gate run is re-run', async () => {
  // The same branch opened against two bases shares a head SHA; the review was on one of them.
  const gh = gitHub(gateRuns([gateRun(101, { min: 10, pr: 1 }), gateRun(202, { min: 30, pr: 2 }), gateRun(103, { min: 20, pr: 1 })]));
  const r = await rerun(gh);
  assert.equal(r.ok, true);
  assert.deepEqual(rerunIds(gh), [103, 202]);
});

test('fork runs carry no PR number, so every one of them at the head is re-run', async () => {
  // Two fork PRs on one head both report pull_requests: []; neither may hide the other.
  const gh = gitHub(gateRuns([
    gateRun(101, { min: 10, pr: null }),
    gateRun(202, { min: 20, pr: null }),
    gateRun(303, { min: 5, pr: 4 }),
    gateRun(404, { min: 15, pr: 4 }),
  ]));
  assert.equal((await rerun(gh)).ok, true);
  assert.deepEqual(rerunIds(gh), [101, 202, 404]);
});

test('a run on a later page still counts: one PR\'s many runs cannot hide another\'s', async () => {
  // 100 newer runs for PR #2 fill page 1; PR #1's only run is on page 2.
  const many = Array.from({ length: 100 }, (_, i) => gateRun(1000 + i, { min: 50, pr: 2 }));
  const gh = gitHub(gateRuns([...many, gateRun(101, { min: 10, pr: 1 })]));
  await rerun(gh);
  assert.deepEqual(rerunIds(gh), [101, 1000]);
});

test('a gate run still in progress is waited for, then re-run', async () => {
  // It may have read the reviews before this one changed.
  const gh = gitHub(polls(gateRuns([gateRun(12, { status: 'in_progress' })]), gateRuns([gateRun(12, { status: 'queued' })]), gateRuns([gateRun(12)])));
  const r = await rerun(gh);
  assert.equal(r.ok, true);
  assert.deepEqual(rerunIds(gh), [12]);
  assert.equal(polled(gh), 3);
});

test('a gate run that never finishes fails the re-run loudly instead of passing', async () => {
  const gh = gitHub(gateRuns([gateRun(12, { status: 'in_progress' })]));
  const r = await rerun(gh, { attempts: 3 });
  assert.equal(r.ok, false);
  assert.match(r.reason, /still in_progress/);
  assert.deepEqual(gh.writes(), []);
});

test('no gate run for the head fails loudly: nothing would update the check', async () => {
  const r = await rerun(gitHub(gateRuns([])));
  assert.equal(r.ok, false);
  assert.match(r.reason, /no merge-gate\.yml run/);
});

test('a re-run GitHub refuses fails the re-run', async () => {
  const gh = gitHub(gateRuns([gateRun(11)]), { 'POST /actions/runs/:id/rerun': reply(403, { message: 'Forbidden' }) });
  await assert.rejects(rerun(gh), /HTTP 403/);
});

test('an event without a head commit fails closed', async () => {
  const gh = gitHub(gateRuns([gateRun(11)]));
  const r = await rerun(gh, { headSha: undefined });
  assert.equal(r.ok, false);
  assert.deepEqual(gh.requests, []);
});
