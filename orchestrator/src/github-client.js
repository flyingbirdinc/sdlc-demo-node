import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from 'octokit';

export const createGitHubClient = async (config) => {
  const auth = createAppAuth({ appId: config.githubAppId, privateKey: config.githubAppPrivateKey, installationId: config.githubInstallationId });
  const { token } = await auth({ type: 'installation' });
  const octokit = new Octokit({ auth: token });
  const repo = { owner: config.githubOwner, repo: config.githubRepo };
  return {
    octokit,
    async findOpenPr(branch) {
      const result = await octokit.rest.pulls.list({ ...repo, state: 'open', head: `${config.githubOwner}:${branch}` });
      return result.data[0];
    },
    async ensureLabel(name) {
      try { await octokit.rest.issues.getLabel({ ...repo, name }); } catch (error) {
        if (error.status !== 404) throw error;
        await octokit.rest.issues.createLabel({ ...repo, name, color: '5319e7', description: 'Created by the AI SDLC orchestrator' });
      }
    },
    async createOrUpdateBranch(branch, files, message) {
      const ref = await octokit.rest.git.getRef({ ...repo, ref: 'heads/main' });
      const baseCommit = await octokit.rest.git.getCommit({ ...repo, commit_sha: ref.data.object.sha });
      const tree = await octokit.rest.git.createTree({ ...repo, base_tree: baseCommit.data.tree.sha, tree: files.map((file) => ({ path: file.path, mode: '100644', type: 'blob', content: file.content })) });
      const commit = await octokit.rest.git.createCommit({ ...repo, message, tree: tree.data.sha, parents: [ref.data.object.sha] });
      try { await octokit.rest.git.updateRef({ ...repo, ref: `heads/${branch}`, sha: commit.data.sha, force: true }); } catch (error) {
        if (error.status !== 422) throw error;
        await octokit.rest.git.createRef({ ...repo, ref: `refs/heads/${branch}`, sha: commit.data.sha });
      }
      return commit.data.sha;
    },
    async createPr(branch, title, body) {
      return (await octokit.rest.pulls.create({ ...repo, head: branch, base: 'main', title, body })).data;
    },
    async labelPr(number, labels) { await octokit.rest.issues.addLabels({ ...repo, issue_number: number, labels }); },
    async commentPr(number, body) { await octokit.rest.issues.createComment({ ...repo, issue_number: number, body }); },
    async enableAutoMerge(number) { await octokit.graphql(`mutation($id:ID!){enablePullRequestAutoMerge(input:{pullRequestId:$id,mergeMethod:SQUASH}){pullRequest{id}}}`, { id: (await octokit.rest.pulls.get({ ...repo, pull_number: number })).data.node_id }); }
  };
};
