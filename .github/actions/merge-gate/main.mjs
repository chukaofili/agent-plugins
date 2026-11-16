// Gathers the facts for a pull request and reports one check. Everything that
// decides anything is in decide.mjs.
import { readFileSync, appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { parseConfig, labelCheck, mergeGate, latestApproval } from './decide.mjs';
import { replay, fetchCommits } from './replay.mjs';
import { rerunGate } from './rerun.mjs';

const MAX_FILES = 3000; // the API stops listing a PR's files here

export function githubApi({ token, repo, fetchImpl = fetch }) {
  // withLink: also return the Link header's next URL, for lists paged by cursor.
  const call = async (path, { accept = 'application/vnd.github+json', method = 'GET', body, empty = false, url = `https://api.github.com/repos/${repo}${path}`, withLink = false } = {}) => {
    const res = await fetchImpl(url, {
      method,
      headers: { authorization: `Bearer ${token}`, accept, 'x-github-api-version': '2022-11-28', ...(body ? { 'content-type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`${method} ${path}: HTTP ${res.status}`);
    if (withLink) return { body: await res.json(), next: res.headers.get('link')?.match(/<([^>]+)>;\s*rel="next"/)?.[1] ?? null };
    return res.status === 204 || empty ? null : res.json();
  };
  // Every page of a list. items picks the list out of a response that wraps it.
  const pages = async (path, items = (body) => body) => {
    const all = [];
    for (let page = 1; ; page++) {
      const batch = items(await call(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`));
      all.push(...batch);
      if (batch.length < 100) return all;
    }
  };
  return {
    config: async (path, ref) => Buffer.from((await call(`/contents/${path}?ref=${ref}`)).content, 'base64').toString('utf8'),
    labels: async (n) => (await pages(`/issues/${n}/labels`)).map((l) => l.name),
    files: async (n) => {
      const files = await pages(`/pulls/${n}/files`);
      return files.length >= MAX_FILES ? null : files.flatMap((f) => [f.filename, f.previous_filename].filter(Boolean));
    },
    labelEvents: async (n) =>
      (await pages(`/issues/${n}/events`))
        .filter((e) => (e.event === 'labeled' || e.event === 'unlabeled') && e.label && e.actor)
        .map((e) => ({ event: e.event, label: e.label.name, actor: e.actor.login, at: e.created_at })),
    reviews: async (n) =>
      (await pages(`/pulls/${n}/reviews`))
        .filter((r) => r.user && r.submitted_at)
        .map((r) => ({ actor: r.user.login, state: r.state, commit: r.commit_id, at: r.submitted_at })),
    mergeBase: async (base, head) => (await call(`/compare/${base}...${head}?per_page=1`)).merge_base_commit.sha,
    removeLabel: (n, label) => call(`/issues/${n}/labels/${label}`, { method: 'DELETE' }),
    comment: (n, body) => call(`/issues/${n}/comments`, { method: 'POST', body: { body } }),
    // Every page: one PR's runs at a shared head must not push another's out of view.
    gateRuns: (workflow, sha) =>
      pages(`/actions/workflows/${workflow}/runs?event=pull_request_target&head_sha=${sha}`, (body) => body.workflow_runs),
    rerun: (id) => call(`/actions/runs/${id}/rerun`, { method: 'POST', empty: true }),
    // Every update to this repository's branch at or after a time, newest
    // first: pushes and fast-forwards as well as force-pushes, each with the
    // commit it replaced. The list is paged by cursor and reads back from now,
    // so it stops at the first page that reaches past the time.
    refUpdatesSince: async (branch, at) => {
      const since = Date.parse(at);
      const all = [];
      let url = `https://api.github.com/repos/${repo}/activity?ref=${encodeURIComponent(`refs/heads/${branch}`)}&per_page=100`;
      while (url) {
        const { body, next } = await call('/activity', { url, withLink: true });
        for (const a of body) {
          if (Date.parse(a.timestamp) < since) return all;
          all.push({ type: a.activity_type, before: a.before, after: a.after, at: a.timestamp });
        }
        url = next;
      }
      return all;
    },
  };
}

// The base branch's tip when the approval was given. In a stack the base is
// the stage below, and restacking it leaves its old tip out of the new
// history, so the merge-base with today's base would reach down to the trunk
// and count the lower stage's old commits as part of this patch. GitHub's
// activity list records every update to the branch with the commit it
// replaced, so the first update after the approval replaced the tip the
// reviewer saw. Fast-forwards count: a force-push alone can name a commit the
// branch only reached after the approval. No updates since means today's tip
// is that tip. Nothing here comes from the head, so a push cannot choose it.
async function baseTipAtApproval({ api, pr, approval }) {
  const updates = await api.refUpdatesSince(pr.base.ref, approval.at);
  if (updates.some((u) => Date.parse(u.at) === Date.parse(approval.at))) {
    throw new Error(`${pr.base.ref} moved in the same second as the approval, so its tip then is unknown`);
  }
  const first = updates.at(-1);
  if (!first) return pr.base.sha;
  if (/^0+$/.test(first.before)) throw new Error(`${pr.base.ref} did not exist when the approval was given`);
  return first.before;
}

// Whether the approval still stands for this head: the same commit, or that
// commit replayed onto a base that moved. { covered, why }: covered is null
// when the comparison could not be made, which is not the same as a changed
// patch. why says which files, or what failed.
async function covers({ api, fetchGit, approval, pr }) {
  if (approval.commit === pr.head.sha) return { covered: true };
  try {
    // GitHub showed the reviewer the diff from here: the merge-base of the base's tip then and the approved commit.
    const oldBase = await api.mergeBase(await baseTipAtApproval({ api, pr, approval }), approval.commit);
    const newBase = await api.mergeBase(pr.base.sha, pr.head.sha);
    const git = fetchGit([oldBase, newBase, approval.commit, pr.head.sha]);
    const r = replay({ git, oldBase, newBase, approved: approval.commit, head: pr.head.sha });
    return { covered: r.match, why: r.why };
  } catch (e) {
    return { covered: null, why: e.message };
  }
}

// Every call rules on the pull request as it stands now. Nothing here depends
// on which event triggered it, so a failed or missed run cannot leave an old
// clearance standing: the next run reaches the same verdict from scratch.
export async function run({ check, eventName, event, api, fetchGit, configPath, defaultBranch }) {
  if (eventName === 'merge_group') {
    return { ok: true, reason: 'merge group: the gate was checked when the pull request was queued', removed: false };
  }
  const pr = event.pull_request;
  const n = pr.number;
  let config;
  try {
    config = parseConfig(await api.config(configPath, defaultBranch));
  } catch (e) {
    return { ok: false, reason: `cannot read ${configPath} on ${defaultBranch}: ${e.message}`, removed: false };
  }
  const labels = await api.labels(n);
  const lc = labelCheck({ labels, files: await api.files(n), config });
  if (check === 'label-check') return { ok: lc.ok, reason: lc.reason, removed: false };

  const approval = latestApproval(await api.reviews(n), config);
  const { covered, why } = approval && labels.includes('merge-auto') ? await covers({ api, fetchGit, approval, pr }) : { covered: false };
  const mg = mergeGate({ author: pr.user?.login, labels, events: await api.labelEvents(n), config, labelCheckResult: lc, approval, covered, why });

  let removed = false;
  if (mg.remove) {
    // Housekeeping: the check is already red. Taking the label off keeps the
    // PR list honest, and a failure here changes nothing about the verdict.
    try {
      await api.removeLabel(n, 'merge-auto');
      await api.comment(n, `Removed \`merge-auto\` at ${pr.head.sha.slice(0, 7)}: ${mg.reason}.`);
      removed = true;
    } catch {}
  }
  return { ok: mg.ok, reason: mg.reason, removed };
}

// Everything the script does but read the event file, print and exit. A gate
// that cannot run is not passing, so any error, in setting up the check or in
// running it, becomes a failing verdict.
export async function entry({ env, event, fetchImpl = fetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  const check = env.GATE_CHECK;
  if (!['label-check', 'merge-gate', 'rerun'].includes(check)) return { ok: false, line: `unknown check "${check}"` };
  let result;
  try {
    result = await gate({ check, env, event, fetchImpl, sleep });
  } catch (e) {
    result = { ok: false, reason: `the gate could not run: ${e.message}` };
  }
  return { ok: result.ok, line: `${check}: ${result.ok ? 'pass' : 'not passing'}. ${result.reason}` };
}

// One check, wired to GitHub and git from the action's environment.
function gate({ check, env, event, fetchImpl, sleep }) {
  const api = githubApi({ token: env.GITHUB_TOKEN, repo: env.GITHUB_REPOSITORY, fetchImpl });
  return check === 'rerun'
    ? rerunGate({ api, headSha: event.workflow_run?.head_sha, workflow: env.GATE_WORKFLOW, sleep })
    : run({
        check,
        eventName: env.GITHUB_EVENT_NAME,
        event,
        api,
        fetchGit: (shas) =>
          fetchCommits({
            url: `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}`,
            shas,
            extraHeader: `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${env.GITHUB_TOKEN}`).toString('base64')}`,
          }),
        configPath: env.GATE_CONFIG_PATH,
        defaultBranch: event.repository.default_branch,
      });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const env = process.env;
  const { ok, line } = await entry({ env, event: JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, 'utf8')) });
  console.log(ok ? line : `::error::${line}`);
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, `${line}\n`);
  process.exit(ok ? 0 : 1);
}
