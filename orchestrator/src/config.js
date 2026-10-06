const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`missing required configuration: ${name}`);
  return value;
};

const csv = (name) => (process.env[name] || '').split(',').map((value) => value.trim()).filter(Boolean);

export const loadConfig = () => ({
  enabled: process.env.AI_SDLC_ENABLED === 'true',
  pollMs: Number(process.env.AI_POLL_MS || 300000),
  projectKey: required('JIRA_PROJECT_KEY'),
  aiReadyStatus: process.env.JIRA_AI_READY_STATUS || 'AI Ready',
  inProgressStatus: process.env.JIRA_IN_PROGRESS_STATUS || 'AI In Progress',
  reviewStatus: process.env.JIRA_REVIEW_STATUS || 'In Review',
  failedStatus: process.env.JIRA_FAILED_STATUS || 'AI Failed',
  releasedStatus: process.env.JIRA_RELEASED_STATUS || 'Released',
  trustedAccountIds: csv('JIRA_TRUSTED_ACCOUNT_IDS'),
  jiraBaseUrl: required('JIRA_BASE_URL').replace(/\/$/, ''),
  jiraEmail: required('JIRA_EMAIL'),
  jiraToken: required('JIRA_API_TOKEN'),
  githubOwner: required('GITHUB_OWNER'),
  githubRepo: required('GITHUB_REPO'),
  githubAppId: required('GITHUB_APP_ID'),
  githubAppPrivateKey: required('GITHUB_APP_PRIVATE_KEY').replace(/\\n/g, '\n'),
  githubInstallationId: required('GITHUB_INSTALLATION_ID'),
  vertexProject: required('VERTEX_PROJECT_ID'),
  vertexLocation: process.env.VERTEX_LOCATION || 'us-central1',
  vertexModel: process.env.VERTEX_MODEL || 'gemini-2.5-pro',
  workspace: process.env.AI_WORKSPACE || '/opt/sdlc-ai/workspace',
  statePath: process.env.AI_STATE_PATH || '/var/lib/sdlc-ai/state.json'
});
