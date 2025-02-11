import api, { route } from '@forge/api';

// Fetch issues from jira in a specific project
export const getIssues = async (payload, requestContext) => {
  console.log(`Payload: ${JSON.stringify(payload)}`);
  console.log(`Request Context: ${JSON.stringify(requestContext)}`);

  const projectKey = payload.context.jira.projectKey;
  const label = payload.label ? payload.label : null;

  console.log(`Fetching issues for project: ${projectKey} and label: ${label}`);
  const jql = label ? `project=${projectKey} AND labels=${label}` : `project=${projectKey}`;
  const response = await api.asApp().requestJira(route`/rest/api/3/search?jql=${jql}`);
  const data = await response.json();
  const cleanData = await extractIssueDetails(data);

  // TODO: Categorise each issue based on due date and priority 
  // 

  return cleanData;
}

// Extract issue details from the response
export const extractIssueDetails = async (data) => {
  // console.log(`Extracting issue details from response: ${JSON.stringify(data)}`);
  return data.issues.map(issue => ({
      key: issue.key,
      summary: issue.fields.summary,
      description: issue.fields.description ? issue.fields.description : 'No description',
      priority: issue.fields.priority ? issue.fields.priority.name : 'No priority set',
      assignee: issue.fields.assignee ? issue.fields.assignee.displayName : 'Unassigned',
      status: issue.fields.status.name,
      labels: issue.fields.labels > 0 ? issue.fields.labels : 'No labels set',
      daysDue: issue.fields.duedate ? Math.ceil((new Date(issue.fields.duedate) - new Date()) / (1000 * 3600 * 24)) : 'No due date',
      dueDate: issue.fields.duedate ? issue.fields.duedate : 'No due date',
    }));
}