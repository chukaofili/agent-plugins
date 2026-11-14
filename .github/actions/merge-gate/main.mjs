// Gathers the facts for a pull request and reports one check. Everything that
// decides anything is in decide.mjs.
import { readFileSync, appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { parseConfig, labelCheck, mergeGate, latestApproval, fingerprint, samePatch } from './decide.mjs';

const MAX_FILES = 3000; // the API stops listing a PR's files here

export function githubApi({ token, repo, fetchImpl = fetch }) {
  const call = async (path, { accept = 'application/vnd.github+json', method = 'GET', body } = {}) => {
    const res = await fetchImpl(`https://api.github.com/repos/${repo}${path}`, {
      method,
      headers: { authorization: `Bearer ${token}`, accept, 'x-github-api-version': '2022-11-28', ...(body ? { 'content-type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`${method} ${path}: HTTP ${res.status}`);
    return accept.endsWith('diff') ? res.text() : res.status === 204 ? null : res.json();
  };
  const pages = async (path) => {
    const all = [];
    for (let page = 1; ; page++) {
      const batch = await call(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
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
    diff: (base, head) => call(`/compare/${base}...${head}`, { accept: 'application/vnd.github.diff' }),
    removeLabel: (n, label) => call(`/issues/${n}/labels/${label}`, { method: 'DELETE' }),
    comment: (n, body) => call(`/issues/${n}/comments`, { method: 'POST', body: { body } }),
  };
}

// Whether the approved commit is the head, or carries the same patch against
// the current base. A diff that cannot be fetched covers nothing.
async function covers({ api, approval, pr }) {
  if (approval.commit === pr.head.sha) return true;
  const print = async (sha) => {
    try {
      return fingerprint(await api.diff(pr.base.sha, sha));
    } catch {
      return null;
    }
  };
  return samePatch(await print(approval.commit), await print(pr.head.sha));
}

// Every call rules on the pull request as it stands now. Nothing here depends
// on which event triggered it, so a failed or missed run cannot leave an old
// clearance standing: the next run reaches the same verdict from scratch.
export async function run({ check, eventName, event, api, configPath, defaultBranch }) {
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
  const covered = Boolean(approval) && labels.includes('merge-auto') && (await covers({ api, approval, pr }));
  const mg = mergeGate({ labels, events: await api.labelEvents(n), config, labelCheckResult: lc, approval, covered });

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

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const env = process.env;
  const event = JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, 'utf8'));
  const check = env.GATE_CHECK;
  if (!['label-check', 'merge-gate'].includes(check)) {
    console.log(`::error::unknown check "${check}"`);
    process.exit(1);
  }
  const result = await run({
    check,
    eventName: env.GITHUB_EVENT_NAME,
    event,
    api: githubApi({ token: env.GITHUB_TOKEN, repo: env.GITHUB_REPOSITORY }),
    configPath: env.GATE_CONFIG_PATH,
    defaultBranch: event.repository.default_branch,
  }).catch((e) => ({ ok: false, reason: `the gate could not run: ${e.message}` }));
  const line = `${check}: ${result.ok ? 'pass' : 'not passing'}. ${result.reason}`;
  console.log(result.ok ? line : `::error::${line}`);
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, `${line}\n`);
  process.exit(result.ok ? 0 : 1);
}
