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

  const categorizedIssues = await categorizeIssues(data);

  return categorizedIssues;
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

// Sort issues into the 4 categories: 'Urgent' and 'Important', 'Not Urgent' and 'Important', 'Urgent' and 'Not Important', 'Not Urgent' and 'Not Important'.
export const categorizeIssues = async (data) => {
  // Ignore all completed issues
  const filteredIssues = data.issues.filter(issue => issue.fields.status.name !== 'Done');

  // Create categories based on Urgency and Importance
  const categorizedIssues = {
    'Urgent and Important': [],
    'Not Urgent and Important': [],
    'Urgent and Not Important': [],
    'Not Urgent and Not Important': []
  };

  filteredIssues.forEach(issue => {
    // Calculate days left until due date or sets as inf if there is no due date
    const dueDate = issue.fields.duedate;
    const daysLeft = dueDate ? Math.ceil((new Date(dueDate) - new Date()) / (1000 * 3600 * 24)) : Infinity;
    
    // Determine urgency based on if theres more or less than 7 days until it's due
    const urgency = daysLeft <= 7 ? 'Urgent' : 'Not Urgent';
    
    // Determine importance based on priority, Highest-Medium = Important, Low-Lowest = Not Important
    const priority = issue.fields.priority.name.toLowerCase();
    const importance = (priority !== 'low' && priority !== 'lowest') ? 'Important' : 'Not Important';
    
    // Categorize the issue
    const category = `${urgency} and ${importance}`;
    categorizedIssues[category].push({
      key: issue.key,
      summary: issue.fields.summary,
      dueDate: issue.fields.duedate,
      priority: issue.fields.priority.name,
      assignee: issue.fields.assignee ? issue.fields.assignee.displayName : 'Unassigned',
      status: issue.fields.status.name,
      labels: issue.fields.labels.length > 0 ? issue.fields.labels.join(', ') : 'No labels'
    });
  });

  return categorizedIssues;
}
