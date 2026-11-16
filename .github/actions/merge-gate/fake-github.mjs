// A stand-in for the GitHub REST API, behind githubApi's fetchImpl.
// fakeGitHub knows routes and paging and nothing about the gate. Its fixtures
// are the JSON GitHub itself returns, so the adapter's mapping runs in every
// test and cannot share a mistake with the fake. The builders at the bottom
// make the gate's fixtures in that shape.
const RESPONSE = Symbol('response');

// A reply with a given status. Without a body, reading one throws, like an empty 201.
export const reply = (status, body) => ({ [RESPONSE]: true, status, body });

// routes: { 'GET /pulls/7/reviews': json | (req) => json | reply(...) }, paths
// without /repos/{owner}/{repo}; a :name segment matches anything and lands in
// req.params. A route reads its fixture on every request, so a test can
// change the fixture between calls. fail: { 'GET /path': [502] }
// answers the next requests to that route with those statuses, once each.
export function fakeGitHub({ routes = {}, fail = {} } = {}) {
  const requests = [];
  const fetchImpl = async (url, init = {}) => {
    const u = new URL(url);
    const method = init.method ?? 'GET';
    const path = u.pathname.replace(/^\/repos\/[^/]+\/[^/]+/, '');
    const query = Object.fromEntries(u.searchParams);
    const body = init.body ? JSON.parse(init.body) : undefined;
    requests.push({ method, path, query, body });
    const hit = match(routes, method, path);
    if (hit && fail[hit.key]?.length) return respond(fail[hit.key].shift());
    if (!hit) return respond(404, { message: 'Not Found' });
    const route = routes[hit.key];
    const out = typeof route === 'function' ? route({ method, path, query, body, params: hit.params }) : route;
    if (out?.[RESPONSE]) return respond(out.status, out.body);
    return respond(200, page(out, query));
  };
  // A GraphQL request is a POST that only reads, so it is not a write.
  return { fetchImpl, requests, writes: () => requests.filter((r) => r.method !== 'GET' && r.path !== '/graphql') };
}

function match(routes, method, path) {
  for (const key of Object.keys(routes)) {
    const [m, pattern] = key.split(' ');
    if (m !== method) continue;
    const names = [];
    const re = new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/:(\w+)/g, (_, name) => (names.push(name), '([^/]+)'))}$`);
    const found = path.match(re);
    if (found) return { key, params: Object.fromEntries(names.map((name, i) => [name, found[i + 1]])) };
  }
  return null;
}

function respond(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (body === undefined) throw new Error('no response body');
      return body;
    },
  };
}

// Serves one page of a list, as GitHub does even when no page is asked for:
// per_page defaults to 30 and stops at 100, and pages count from 1.
function page(out, query) {
  const size = Math.min(Number(query.per_page ?? 30), 100);
  const from = (Number(query.page ?? 1) - 1) * size;
  if (Array.isArray(out)) return out.slice(from, from + size);
  if (Array.isArray(out?.workflow_runs)) return { ...out, workflow_runs: out.workflow_runs.slice(from, from + size) };
  return out;
}

// Builders for GitHub's own shapes.
export const T = (min) => `2026-11-14T10:${String(min).padStart(2, '0')}:00Z`;
export const label = (name) => ({ name });
export const labelEvent = (event, name, actor, min) => ({ event, label: { name }, actor: { login: actor }, created_at: T(min) });
export const review = (actor, state, commit, min) => ({ user: { login: actor }, state, commit_id: commit, submitted_at: T(min) });
export const file = (filename, previous) => ({ filename, ...(previous ? { previous_filename: previous } : {}) });
export const content = (text) => ({ content: Buffer.from(text).toString('base64'), encoding: 'base64' });
// pr: the PR number GitHub attaches to the run, or null for a fork PR, which it reports as [].
export const gateRun = (id, { status = 'completed', min = 30, pr = 7 } = {}) => ({ id, status, created_at: T(min), pull_requests: pr === null ? [] : [{ number: pr }] });
export const gateRuns = (runs) => ({ total_count: runs.length, workflow_runs: runs });

// The GraphQL answer for the pull requests whose head is a branch, with each
// one's head force-pushes: [[{ before, after, min }, ...], ...], one list per PR.
// A list with fork: true is a PR from another repository's branch of that name.
export const headPushes = (...prs) => ({
  data: { repository: { pullRequests: { nodes: prs.map((pushes) => ({
    isCrossRepository: Boolean(pushes.fork),
    timelineItems: { nodes: pushes.map((p) => ({ createdAt: T(p.min), beforeCommit: p.before ? { oid: p.before } : null, afterCommit: { oid: p.after } })) },
  })) } } },
});

// A list route whose answer moves on each time the list is read from its first page:
// one answer per poll, the last repeating.
export function polls(...answers) {
  let i = -1;
  return ({ query }) => {
    if ((query.page ?? '1') === '1') i = Math.min(i + 1, answers.length - 1);
    return answers[i];
  };
}

// The routes the gate reads and writes for one pull request.
// config: the gate config's text, served at c.json (the tests' configPath),
// or null for a repository that has none.
export function prRoutes({ n = 7, config, labels = [], files = [file('src/a.ts')], events = [], reviews = [] }) {
  return {
    ...(config === null ? {} : { 'GET /contents/c.json': () => content(config) }),
    [`GET /issues/${n}/labels`]: () => labels.map(label),
    [`GET /pulls/${n}/files`]: files,
    [`GET /issues/${n}/events`]: events,
    [`GET /pulls/${n}/reviews`]: reviews,
    [`DELETE /issues/${n}/labels/merge-auto`]: [],
    [`POST /issues/${n}/comments`]: reply(201, { id: 1 }),
    'POST /graphql': () => headPushes(), // no stage below this PR has been rewritten
  };
}
