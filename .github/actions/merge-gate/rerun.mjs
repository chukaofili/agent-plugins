// Re-runs the gate after a review changes. pull_request_target has no review
// event, and a check from a workflow_run job doesn't count for branch
// protection, so the gate's own run for the head is run again instead: same
// default-branch workflow, and it re-reads the PR from scratch.
export async function rerunGate({ api, headSha, workflow, sleep, attempts = 20, intervalMs = 15000 }) {
  if (!headSha) return { ok: false, reason: 'the triggering run has no head commit' };
  const at = headSha.slice(0, 7);
  for (let i = 1; ; i++) {
    const runs = await api.gateRuns(workflow, headSha);
    const latest = [...runs].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
    if (!latest) return { ok: false, reason: `no ${workflow} run found for ${at}, so nothing would update its checks` };
    // A run still going may have read the reviews before this change.
    if (latest.status === 'completed') {
      await api.rerun(latest.id);
      return { ok: true, reason: `re-ran ${workflow} run ${latest.id} for ${at}` };
    }
    if (i >= attempts) return { ok: false, reason: `${workflow} run ${latest.id} for ${at} is still ${latest.status}` };
    await sleep(intervalMs);
  }
}
