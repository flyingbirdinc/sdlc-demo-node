import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { loadConfig } from './config.js';
import { createStateStore } from './state-store.js';
import { createJiraClient, findTransition } from './jira-client.js';
import { createGitHubClient } from './github-client.js';
import { createVertexClient } from './vertex-client.js';
import { contentHash, parseImplementation, validateEdits } from './guardrails.js';

const execFileAsync = promisify(execFile);
const config = loadConfig();
const state = createStateStore(config.statePath);
const jira = createJiraClient(config);
const vertex = createVertexClient({ project: config.vertexProject, location: config.vertexLocation, model: config.vertexModel });

const transitionTo = async (issue, status) => {
  const transitions = await jira.transitions(issue.key);
  const id = findTransition(transitions, status);
  if (id) await jira.transition(issue.key, id);
};

const repositorySummary = async () => {
  const files = await fs.readdir(config.workspace, { recursive: true });
  return files.filter((file) => !file.includes('node_modules')).slice(0, 200).join('\n');
};

const processIssue = async (issue) => {
  const reporter = issue.fields.reporter?.accountId;
  if (!config.trustedAccountIds.includes(reporter)) throw new Error(`untrusted Jira account for ${issue.key}`);
  const hash = contentHash(issue);
  const previous = await state.get(issue.key);
  if (previous?.contentHash === hash && ['PR_OPEN', 'REVIEWING', 'APPROVED', 'RELEASED'].includes(previous.status)) return;
  await state.update(issue.key, { status: 'IMPLEMENTING', contentHash: hash, updatedAt: new Date().toISOString() });
  await transitionTo(issue, config.inProgressStatus);
  const implementation = parseImplementation(await vertex.implement({ issue, repositorySummary: await repositorySummary() }));
  const checked = validateEdits(config.workspace, implementation.edits);
  if (checked.sensitive) throw new Error('sensitive paths require independent review and are blocked from the first canary');
  for (const edit of implementation.edits) {
    const target = path.resolve(config.workspace, edit.path);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, edit.content);
  }
  await execFileAsync('npm', ['run', 'check'], { cwd: config.workspace, timeout: 120000 });
  await execFileAsync('npm', ['test'], { cwd: config.workspace, timeout: 120000 });
  const github = await createGitHubClient(config);
  const branch = `ai/${issue.key}`;
  const sha = await github.createOrUpdateBranch(branch, implementation.edits, `${issue.key}: ${implementation.summary}\n\nJira-Content-Sha256: ${hash}`);
  const existing = await github.findOpenPr(branch);
  const pr = existing || await github.createPr(branch, `${issue.key}: ${issue.fields.summary}`, `Automated implementation for Jira ${issue.key}.\n\n${implementation.summary}\n\nJira-Content-Sha256: ${hash}`);
  await github.ensureLabel('ai-generated');
  await github.labelPr(pr.number, ['ai-generated']);
  if (!existing) await github.commentPr(pr.number, `AI implementation created from ${issue.key}. Commit ${sha}. Independent review is required before automatic release.`);
  await state.update(issue.key, { status: 'PR_OPEN', branch, pr: pr.number, commit: sha, updatedAt: new Date().toISOString() });
  await transitionTo(issue, config.reviewStatus);
};

const poll = async () => {
  if (!config.enabled) return;
  const result = await jira.searchReady(config.projectKey, config.aiReadyStatus);
  for (const issue of result.issues || []) {
    try { await processIssue(issue); } catch (error) {
      console.error(JSON.stringify({ issue: issue.key, state: 'FAILED', error: error.message }));
      await state.update(issue.key, { status: 'FAILED', error: error.message, updatedAt: new Date().toISOString() });
      try { await jira.comment(issue.key, `AI SDLC failed safely: ${error.message}`); await transitionTo(issue, config.failedStatus); } catch { /* preserve original failure */ }
    }
  }
};

await state.load();
if (process.argv.includes('--once')) await poll();
else {
  await poll();
  setInterval(() => poll().catch((error) => console.error(JSON.stringify({ state: 'POLL_FAILED', error: error.message }))), config.pollMs);
}
