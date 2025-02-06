// content-script.js
class JiraCardHandler {
    static SELECTORS = {
        CONTAINER: '[data-testid="platform-inline-card-create.ui.trigger.visible.button"]',
        SUMMARY_FIELD: '[data-testid="platform-inline-card-create.ui.container"] [data-testid="platform-inline-card-create.ui.form.summary.styled-text-area"]',
        SWIMLANE: '[data-testid="platform-board-kit.ui.swimlane.swimlane-wrapper"]',
        PARENT_KEY: '[data-testid="platform-card.common.ui.key.key"] a',
        BOARD_CONTENT: '[data-testid="software-board.board-container.board-content"]'
    };

    static ERROR_MESSAGES = {
        NO_TITLE: 'Please enter a title for the issue',
        NO_PARENT: 'Could not determine parent issue',
        NO_REPORTER: 'Could not determine reporter ID',
        INVALID_PARENT: 'Invalid parent issue format',
        CREATION_FAILED: 'Failed to create issue'
    };

    constructor() {
        this.jira = new JiraRequest();
        this.notifications = new NotificationSystem();
        this.isProcessing = false;
        this.bindEvents();
    }

    /**
     * Binds all necessary event listeners.
     * This version fetches all container buttons and their corresponding swimlane containers,
     * then attaches a click handler that passes the pre-fetched swimlane.
     */
    bindEvents() {
        // Pre-fetch all container buttons with their corresponding swimlane containers.
        $(JiraCardHandler.SELECTORS.CONTAINER).each((_, button) => {
            const $button = $(button);
            const $swimlane = $button.closest(JiraCardHandler.SELECTORS.SWIMLANE);

            if (!$swimlane.length) {
                console.warn('Swimlane container not found for button:', $button);
                return;
            }

            $button.on('click', (e) => {
                this.handleContainerClick(e, $swimlane);
            });
        });

        // Listen for board content changes (for dynamic updates)
        const boardContent = document.querySelector(JiraCardHandler.SELECTORS.BOARD_CONTENT);
        if (boardContent) {
            new MutationObserver(() => this.refreshEventListeners())
                .observe(boardContent, { childList: true, subtree: true });
        }
    }

    /**
     * Refresh event listeners after dynamic content updates.
     */
    refreshEventListeners() {
        $(JiraCardHandler.SELECTORS.SUMMARY_FIELD).each((_, element) => {
            if (!$(element).data('handler-attached')) {
                this.attachKeydownHandler($(element));
                $(element).data('handler-attached', true);
            }
        });
    }

    /**
     * Handles the click on the container element.
     * @param {Event} e - Click event.
     * @param {jQuery} $swimlane - Pre-fetched swimlane container element.
     */
    handleContainerClick(e, $swimlane) {
        e.preventDefault();
        // Use the pre-fetched swimlane container to find the summary field.
        const $summaryField = $swimlane.find(JiraCardHandler.SELECTORS.SUMMARY_FIELD);

        if (!$summaryField.length) {
            console.warn('Summary field not found');
            return;
        }

        this.attachKeydownHandler($summaryField);
    }

    /**
     * Attaches keydown handler to the summary field.
     * @param {jQuery} $field - jQuery element.
     */
    attachKeydownHandler($field) {
        $field.on('keydown', async (e) => {
            console.log(e.key, 'KEYYY');
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.stopImmediatePropagation();

                if (this.isProcessing) {
                    this.notifications.show(
                        'Please wait while the previous issue is being created',
                        NotificationSystem.TYPES.WARNING
                    );
                    return;
                }

                await this.handleIssueCreation($field);
            }
        });
    }

    /**
     * Handles the creation of a new issue.
     * @param {jQuery} $field - jQuery element containing the summary field.
     */
    async handleIssueCreation($field) {
        this.isProcessing = true;

        try {
            const title = this.validateAndGetTitle($field);
            const parentKey = this.validateAndGetParentKey($field);

            this.notifications.show(
                'Creating issue...',
                NotificationSystem.TYPES.INFO
            );

            await this.jira.init();
            const userData = await this.myself();
            const reporterId = this.validateAndGetReporterId(userData);

            const issue = await this.jira.createIssue({
                title,
                reporterId,
                parentKey
            });

            this.handleSuccess($field, issue);
        } catch (error) {
            this.handleError(error);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Validates and retrieves the title from the field.
     * @param {jQuery} $field - jQuery element.
     * @returns {string} Validated title.
     */
    validateAndGetTitle($field) {
        console.log($field, "FIELD");
        console.log($($field), "FIELD");
        console.log($($field).val(), "FIELD");
        const title = $($field).val();
        if (!title) {
            throw new Error(JiraCardHandler.ERROR_MESSAGES.NO_TITLE);
        }
        return title;
    }

    /**
     * Validates and retrieves the parent key.
     * @param {jQuery} $field - jQuery element.
     * @returns {string} Validated parent key.
     */
    validateAndGetParentKey($field) {
        // Using the summary field's closest swimlane (which should be valid, thanks to pre-fetching)
        const $swimlane = $field.closest(JiraCardHandler.SELECTORS.SWIMLANE);
        const parentHref = $swimlane.find(JiraCardHandler.SELECTORS.PARENT_KEY).attr('href');

        if (!parentHref) {
            throw new Error(JiraCardHandler.ERROR_MESSAGES.NO_PARENT);
        }

        const parentKey = parentHref.replace('/browse/', '');
        if (!this.isValidJiraKey(parentKey)) {
            throw new Error(JiraCardHandler.ERROR_MESSAGES.INVALID_PARENT);
        }

        return parentKey;
    }

    /**
     * Validates and retrieves the reporter ID from user data.
     * @param {Object} userData - User data from Jira API.
     * @returns {string} Reporter ID.
     */
    validateAndGetReporterId(userData) {
        const reporterId = userData.accountId || userData.id;
        if (!reporterId) {
            throw new Error(JiraCardHandler.ERROR_MESSAGES.NO_REPORTER);
        }
        return reporterId;
    }

    /**
     * Handles successful issue creation.
     * @param {jQuery} $field - Summary field element.
     * @param {Object} issue - Created issue data.
     */
    handleSuccess($field, issue) {
        this.notifications.show(
            `Issue ${issue.key} created successfully!`,
            NotificationSystem.TYPES.SUCCESS
        );
        $field.val('');

        // Optionally refresh the board to show the new issue.
        this.refreshBoard();
    }

    /**
     * Handles errors during issue creation.
     * @param {Error} error - Error object.
     */
    handleError(error) {
        console.error('Failed to create issue:', error);
        this.notifications.show(
            error.message || JiraCardHandler.ERROR_MESSAGES.CREATION_FAILED,
            NotificationSystem.TYPES.ERROR
        );
    }

    /**
     * Validates a Jira issue key format.
     * @param {string} key - Issue key to validate.
     * @returns {boolean} Whether the key is valid.
     */
    isValidJiraKey(key) {
        return /^[A-Z][A-Z0-9_]*-[0-9]+$/.test(key);
    }

    /**
     * Refreshes the board to show updates.
     */
    refreshBoard() {
        // Find and click the refresh button if it exists.
        const refreshButton = $('[aria-label="Refresh board"]');
        if (refreshButton.length) {
            refreshButton.click();
        }
    }

    /**
     * Fetches current user details with error handling.
     * @returns {Promise<Object>} User data.
     */
    async myself() {
        try {
            return await this.jira.myself();
        } catch (error) {
            throw new Error('Failed to fetch user details: ' + error.message);
        }
    }
}

// Initialize the handler when the document is ready.
$(() => {
    try {
        new JiraCardHandler();
    } catch (error) {
        console.error('Failed to initialize Jira Card Handler:', error);
    }
});
