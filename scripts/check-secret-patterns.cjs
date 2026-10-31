// Pattern-based Git history check. Reports locations only, never matched values.
// Public local-demo credentials are documented separately; this is not proof
// that arbitrary credentials or every possible secret format are absent.
const { execFileSync } = require('node:child_process');
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
const commits = git('rev-list', '--all').trim().split('\n').filter(Boolean);
const seen = new Set();
const findings = [];
const rules = [
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['aws-access-key', /\bAKIA[0-9A-Z]{16}\b/],
  ['github-token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})\b/],
  ['openai-token', /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{35,}\b/],
  ['slack-token', /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/],
  ['google-api-key', /\bAIza[A-Za-z0-9_-]{35}\b/],
];

for (const commit of commits) {
  for (const entry of git('ls-tree', '-rz', commit).split('\0').filter(Boolean)) {
    const match = entry.match(/^\d+ blob ([a-f0-9]+)\t([\s\S]+)$/);
    if (!match) continue;
    const [, blob, file] = match;
    if (/(^|\/)\.env($|\.)/.test(file) && !file.endsWith('.example')) {
      findings.push({ commit: commit.slice(0, 7), file, rule: 'tracked-environment-file' });
    }
    if (seen.has(blob)) continue;
    seen.add(blob);
    const content = git('cat-file', 'blob', blob);
    if (content.includes('\0')) continue;
    content.split(/\r?\n/).forEach((line, index) => {
      for (const [rule, pattern] of rules) {
        if (pattern.test(line)) findings.push({ commit: commit.slice(0, 7), file, line: index + 1, rule });
      }
    });
  }
}

console.log(JSON.stringify({ commitsChecked: commits.length, uniqueBlobsChecked: seen.size, findings }, null, 2));
if (findings.length) process.exitCode = 1;
