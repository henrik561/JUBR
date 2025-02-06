// popup.js
class JiraPopup {
    constructor() {
        this.form = document.getElementById('credentialsForm');
        this.emailInput = document.getElementById('email');
        this.tokenInput = document.getElementById('apiToken');
        this.toggleBtn = document.getElementById('toggleToken');
        this.testBtn = document.getElementById('testConnection');
        this.status = document.getElementById('status');

        this.bindEvents();
        this.loadSavedCredentials();
    }

    bindEvents() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.toggleBtn.addEventListener('click', () => this.toggleTokenVisibility());
        this.testBtn.addEventListener('click', () => this.testConnection());

        // Add input validation
        this.emailInput.addEventListener('input', () => this.validateEmail());
        this.tokenInput.addEventListener('input', () => this.validateToken());
    }

    async loadSavedCredentials() {
        try {
            const result = await this.getChromeStorage(['jiraEmail', 'jiraApiToken']);
            if (result.jiraEmail) {
                this.emailInput.value = result.jiraEmail;
            }
            if (result.jiraApiToken) {
                this.tokenInput.value = result.jiraApiToken;
            }
        } catch (error) {
            this.showStatus('Failed to load saved credentials', 'error');
        }
    }

    getChromeStorage(keys) {
        return new Promise((resolve) => {
            chrome.storage.sync.get(keys, resolve);
        });
    }

    setChromeStorage(data) {
        return new Promise((resolve) => {
            chrome.storage.sync.set(data, resolve);
        });
    }

    async handleSubmit(e) {
        e.preventDefault();

        if (!this.validateForm()) {
            return;
        }

        this.setLoading(true);

        try {
            await this.setChromeStorage({
                jiraEmail: this.emailInput.value,
                jiraApiToken: this.tokenInput.value
            });

            this.showStatus('Credentials saved successfully', 'success');

            // Test connection after saving
            await this.testConnection();
        } catch (error) {
            this.showStatus('Failed to save credentials', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    validateForm() {
        return this.validateEmail() && this.validateToken();
    }

    validateEmail() {
        const email = this.emailInput.value;
        const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

        this.emailInput.style.borderColor = isValid ? '' : 'var(--error-color)';
        return isValid;
    }

    validateToken() {
        const token = this.tokenInput.value;
        const isValid = token.length >= 8;

        this.tokenInput.style.borderColor = isValid ? '' : 'var(--error-color)';
        return isValid;
    }

    toggleTokenVisibility() {
        const isPassword = this.tokenInput.type === 'password';
        this.tokenInput.type = isPassword ? 'text' : 'password';
        this.toggleBtn.textContent = isPassword ? 'Hide' : 'Show';
    }

    async testConnection() {
        this.setLoading(true);

        try {
            const response = await fetch('https://jifeline.atlassian.net/rest/api/3/myself', {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${btoa(`${this.emailInput.value}:${this.tokenInput.value}`)}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Invalid credentials');
            }

            const data = await response.json();
            this.showStatus(`Connected successfully as ${data.displayName}`, 'success');
        } catch (error) {
            this.showStatus('Connection failed: Invalid credentials', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    showStatus(message, type) {
        this.status.textContent = message;
        this.status.className = `status ${type}`;

        // Auto-hide success messages after 3 seconds
        if (type === 'success') {
            setTimeout(() => {
                this.status.style.display = 'none';
            }, 3000);
        }
    }

    setLoading(isLoading) {
        document.body.classList.toggle('loading', isLoading);
        this.form.querySelectorAll('button').forEach(button => {
            button.disabled = isLoading;
        });
    }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new JiraPopup();
});