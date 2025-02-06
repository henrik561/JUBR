/**
 * JiraRequest class: Loads credentials from Chrome storage and provides
 * methods to interact with the Jira API.
 */
class JiraRequest {
    constructor() {
        // Set the Jira REST API base URL.
        // (Adjust the URL if your Jira instance uses a different domain.)
        this.baseUrl = 'https://jifeline.atlassian.net/rest/api/3';
        // Credentials will be loaded asynchronously.
        this.email = null;
        this.apiToken = null;
    }

    /**
     * Initializes the JiraRequest instance by loading the credentials.
     * @returns {Promise} Resolves if credentials are found, rejects otherwise.
     */
    init() {
        return new Promise((resolve, reject) => {
            chrome.storage.sync.get(['jiraEmail', 'jiraApiToken'], (result) => {
                if (result.jiraEmail && result.jiraApiToken) {
                    this.email = result.jiraEmail;
                    this.apiToken = result.jiraApiToken;
                    resolve();
                } else {
                    reject('Jira credentials not set. Please update your credentials via the extension popup.');
                }
            });
        });
    }

    /**
     * Returns the Basic Auth header value using the stored credentials.
     */
    getAuthHeader() {
        // Encode the email and API token in base64
        const token = btoa(`${this.email}:${this.apiToken}`);
        return `Basic ${token}`;
    }

    /**
     * Fetches the current authenticated user's details using the /myself endpoint.
     * @returns {Promise} A promise that resolves with the user data.
     */
    myself() {
        return $.ajax({
            url: `${this.baseUrl}/myself`,
            method: 'GET',
            headers: {
                'Authorization': this.getAuthHeader(),
                'Accept': 'application/json'
            }
        });
    }

    /**
     * Creates a Jira issue.
     *
     * @param {string} title - The summary (title) for the issue.
     * @param {string} reporterId - The reporterId for the issue.
     * @param {string} [parentKey='WS-0000'] - The description for the issue.
     *
     * @returns {Promise} A promise that resolves with the result of the API call.
     */
    createIssue(title, reporterId, parentKey = 'WS-0000',) {
        // Build the payload for the create issue API.
        const data = {
            fields: {
                summary: title,
                parent: {
                    key: parentKey
                },
                reporter: {
                    id: reporterId
                }
            }
        };

        // Return the AJAX promise.
        return $.ajax({
            url: `${this.baseUrl}/issue`,
            method: 'POST',
            data: JSON.stringify(data),
            contentType: 'application/json',
            headers: {
                'Authorization': this.getAuthHeader(),
                'Accept': 'application/json'
            }
        });
    }
}

// Expose the classes to the global scope if needed.
window.JiraRequest = JiraRequest;
