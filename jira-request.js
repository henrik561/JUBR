class JiraRequest {
    static ENDPOINTS = {
        MYSELF: '/myself',
        ISSUE: '/issue'
    };

    static ERROR_MESSAGES = {
        CREDENTIALS_NOT_FOUND: 'Jira credentials not found. Please update via extension popup.',
        NETWORK_ERROR: 'Network error. Please check your internet connection.',
        RATE_LIMIT: 'Rate limit exceeded. Please try again later.',
        UNAUTHORIZED: 'Invalid credentials. Please check your API token.',
        SERVER_ERROR: 'Jira server error. Please try again later.',
        VALIDATION_ERROR: 'Invalid input provided.'
    };

    constructor(baseUrl = 'https://jifeline.atlassian.net/rest/api/3') {
        this.baseUrl = baseUrl;
        this.credentials = null;
    }

    /**
     * Initializes credentials from Chrome storage
     * @throws {Error} If credentials are not found
     */
    async init() {
        this.credentials = await this.#loadCredentials();
        if (!this.credentials?.email || !this.credentials?.apiToken) {
            throw new Error('Jira credentials not found. Please update via extension popup.');
        }
    }

    /**
     * Loads credentials from Chrome storage
     * @returns {Promise<{email: string, apiToken: string}>}
     */
    async #loadCredentials() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['jiraEmail', 'jiraApiToken'], (result) => {
                resolve({
                    email: result.jiraEmail,
                    apiToken: result.jiraApiToken
                });
            });
        });
    }

    async #validateResponse(response) {
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));

            switch (response.status) {
                case 401:
                    throw new Error(JiraRequest.ERROR_MESSAGES.UNAUTHORIZED);
                case 403:
                    throw new Error(JiraRequest.ERROR_MESSAGES.UNAUTHORIZED);
                case 429:
                    throw new Error(JiraRequest.ERROR_MESSAGES.RATE_LIMIT);
                case 400:
                    throw new Error(errorData.message || JiraRequest.ERROR_MESSAGES.VALIDATION_ERROR);
                case 500:
                    throw new Error(JiraRequest.ERROR_MESSAGES.SERVER_ERROR);
                default:
                    throw new Error(errorData.message || 'Unknown error occurred');
            }
        }
        return response;
    }

    /**
     * Makes an authenticated request to Jira API
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Request options
     * @returns {Promise<any>}
     */
    async #makeRequest(endpoint, options = {}) {
        try {
            if (!this.credentials) {
                await this.init();
            }

            const headers = {
                'Authorization': `Basic ${btoa(`${this.credentials.email}:${this.credentials.apiToken}`)}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };

            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                ...options,
                headers: { ...headers, ...options.headers }
            });

            await this.#validateResponse(response);
            return response.json();
        } catch (error) {
            if (error instanceof TypeError) {
                throw new Error(JiraRequest.ERROR_MESSAGES.NETWORK_ERROR);
            }
            throw error;
        }
    }

    /**
     * Fetches current user details
     * @returns {Promise<Object>} User data
     */
    async myself() {
        return this.#makeRequest(JiraRequest.ENDPOINTS.MYSELF);
    }

    /**
     * Creates a Jira issue
     * @param {Object} params - Issue parameters
     * @param {string} params.title - Issue title
     * @param {string} params.reporterId - Reporter ID
     * @param {string} params.parentKey - Parent issue key
     * @returns {Promise<Object>} Created issue data
     */
    async createIssue({ title, reporterId, parentKey }) {
        if (!title || !reporterId || !parentKey) {
            throw new Error('Missing required parameters for issue creation');
        }

        return this.#makeRequest(JiraRequest.ENDPOINTS.ISSUE, {
            method: 'POST',
            body: JSON.stringify({
                fields: {
                    summary: title,
                    issueType: { id: '10003' },
                    parent: { key: parentKey },
                    reporter: { id: reporterId }
                }
            })
        });
    }
}