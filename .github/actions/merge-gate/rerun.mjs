// Re-runs the gate after a review changes. pull_request_target has no review
// event, and a check from a workflow_run job doesn't count for branch
// protection, so the gate's own run for the head is run again instead: same
// default-branch workflow, and it re-reads the PR from scratch.
//
// Two PRs can share a head SHA (one branch, two bases), so the newest run of
// every PR at that head is re-run. A run for a fork PR carries no PR number,
// so each of those is re-run rather than guessed apart. A re-run only re-reads
// state, so re-running a neighbour or an older run is harmless.
export async function rerunGate({ api, headSha, workflow, sleep, attempts = 20, intervalMs = 15000 }) {
  if (!headSha) return { ok: false, reason: 'the triggering run has no head commit' };
  const at = headSha.slice(0, 7);
  for (let i = 1; ; i++) {
    const newest = new Map();
    const unknown = [];
    for (const r of await api.gateRuns(workflow, headSha)) {
      if (r.pr === null) { unknown.push(r); continue; }
      const seen = newest.get(r.pr);
      if (!seen || Date.parse(r.created_at) > Date.parse(seen.created_at)) newest.set(r.pr, r);
    }
    const runs = [...newest.values(), ...unknown];
    if (runs.length === 0) return { ok: false, reason: `no ${workflow} run found for ${at}, so nothing would update its checks` };
    // A run still going may have read the reviews before this change.
    const pending = runs.find((r) => r.status !== 'completed');
    if (!pending) {
      for (const r of runs) await api.rerun(r.id);
      return { ok: true, reason: `re-ran ${workflow} run ${runs.map((r) => r.id).join(', ')} for ${at}` };
    }
    if (i >= attempts) return { ok: false, reason: `${workflow} run ${pending.id} for ${at} is still ${pending.status}` };
    await sleep(intervalMs);
  }
}
