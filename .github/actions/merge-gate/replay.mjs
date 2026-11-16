// Decides whether a pushed head is exactly the commit a reviewer approved,
// replayed onto a base that has moved. It compares whole trees, so position,
// whitespace and binary content all count: nothing is normalised away.
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// git: (args) => trimmed stdout, throwing on a non-zero exit with the error's
// status and raw stdout attached, as execFileSync does.
// oldBase and newBase are where the approved commit and the head each fork
// from the base branch. When the base has not moved the replay is the
// approved tree itself, so a squash or a reworded commit still matches.
// Returns { match: true }, or { match: false, why } naming the files.
export function replay({ git, oldBase, newBase, approved, head }) {
  let out;
  try {
    out = git(['merge-tree', '--write-tree', '--name-only', `--merge-base=${oldBase}`, newBase, approved]);
  } catch (e) {
    // Status 1 is a conflict. A rebase that needed a hand-made resolution is
    // not the change the reviewer saw. Anything else is a failure to check.
    if (e.status !== 1 || typeof e.stdout !== 'string') throw new Error(`git merge-tree: ${firstLine(e.stderr)}`);
    const conflicted = e.stdout.split('\n\n')[0].split('\n').slice(1).filter(Boolean);
    return { match: false, why: `replaying it conflicts in ${some(conflicted)}` };
  }
  const differs = git(['diff-tree', '-r', '--name-only', out.split('\n')[0], `${head}^{tree}`]).split('\n').filter(Boolean);
  return differs.length ? { match: false, why: `the new head differs in ${some(differs)}` } : { match: true };
}

const some = (files) => {
  const unique = [...new Set(files)];
  return `${unique.slice(0, 3).join(', ')}${unique.length > 3 ? `, and ${unique.length - 3} more` : ''}`;
};
const firstLine = (text) => String(text ?? '').trim().split('\n')[0] || 'failed';

// Fetches the named commits, one snapshot each, into a throwaway bare
// repository. Objects only: nothing is checked out and nothing from the pull
// request is executed.
export function fetchCommits({ url, shas, extraHeader }) {
  const dir = mkdtempSync(join(tmpdir(), 'merge-gate-'));
  const git = (args) => execFileSync('git', ['--git-dir', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git(['init', '-q', '--bare']);
  try {
    git([...(extraHeader ? ['-c', `http.extraheader=${extraHeader}`] : []), 'fetch', '-q', '--no-tags', '--depth=1', url, ...new Set(shas)]);
  } catch (e) {
    // The error's message repeats the command line, token header and all, so
    // only git's own complaint goes on.
    throw new Error(`git fetch: ${firstLine(e.stderr)}`);
  }
  return git;
}
