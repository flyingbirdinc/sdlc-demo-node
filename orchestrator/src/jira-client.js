const jsonHeaders = (auth) => ({
  accept: 'application/json',
  'content-type': 'application/json',
  authorization: `Basic ${Buffer.from(`${auth.email}:${auth.token}`).toString('base64')}`
});

export const createJiraClient = ({ baseUrl, email, token }) => {
  const auth = { email, token };
  const request = async (method, endpoint, body) => {
    const response = await fetch(`${baseUrl}${endpoint}`, { method, headers: jsonHeaders(auth), body: body ? JSON.stringify(body) : undefined });
    if (!response.ok) throw new Error(`Jira ${method} ${endpoint} failed: ${response.status}`);
    return response.status === 204 ? null : response.json();
  };
  return {
    searchReady: (projectKey, status) => request('GET', `/rest/api/3/search/jql?jql=${encodeURIComponent(`project = ${projectKey} AND status = "${status}" ORDER BY updated ASC`)}&maxResults=20&fields=*all`),
    getIssue: (key) => request('GET', `/rest/api/3/issue/${encodeURIComponent(key)}?expand=transitions,changelog`),
    transition: (key, transitionId) => request('POST', `/rest/api/3/issue/${encodeURIComponent(key)}/transitions`, { transition: { id: transitionId } }),
    transitions: (key) => request('GET', `/rest/api/3/issue/${encodeURIComponent(key)}/transitions`),
    comment: (key, text) => request('POST', `/rest/api/3/issue/${encodeURIComponent(key)}/comment`, { body: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] } })
  };
};

export const findTransition = (transitions, name) => transitions.transitions?.find((item) => item.name === name)?.id;
