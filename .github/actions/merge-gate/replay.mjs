// Decides whether a pushed head is exactly the commit a reviewer approved,
// replayed onto a base that has moved. It compares whole trees, so position,
// whitespace and binary content all count: nothing is normalised away.
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// git: (args) => trimmed stdout, throwing on a non-zero exit.
// oldBase and newBase are where the approved commit and the head each fork
// from the base branch. When the base has not moved the replay is the
// approved tree itself, so a squash or a reworded commit still matches.
export function replayMatches({ git, oldBase, newBase, approved, head }) {
  const tree = (commit) => git(['rev-parse', `${commit}^{tree}`]);
  let replayed;
  try {
    // Exits non-zero on a conflict. A rebase that needed a hand-made
    // resolution is not the change the reviewer saw.
    replayed = git(['merge-tree', '--write-tree', `--merge-base=${oldBase}`, newBase, approved]);
  } catch {
    return false;
  }
  return replayed.split('\n')[0] === tree(head);
}

// Fetches the named commits, one snapshot each, into a throwaway bare
// repository. Objects only: nothing is checked out and nothing from the pull
// request is executed.
export function fetchCommits({ url, shas, extraHeader }) {
  const dir = mkdtempSync(join(tmpdir(), 'merge-gate-'));
  const git = (args) => execFileSync('git', ['--git-dir', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git(['init', '-q', '--bare']);
  git([...(extraHeader ? ['-c', `http.extraheader=${extraHeader}`] : []), 'fetch', '-q', '--no-tags', '--depth=1', url, ...new Set(shas)]);
  return git;
}
