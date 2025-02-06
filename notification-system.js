class NotificationSystem {
    static TYPES = {
        SUCCESS: 'success',
        ERROR: 'error',
        WARNING: 'warning',
        INFO: 'info'
    };

    constructor() {
        this.initializeContainer();
    }

    initializeContainer() {
        const container = document.createElement('div');
        container.id = 'jira-extension-notifications';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 350px;
        `;
        document.body.appendChild(container);
    }

    show(message, type = NotificationSystem.TYPES.INFO, duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `jira-notification ${type}`;
        notification.style.cssText = `
            padding: 12px 24px;
            margin-bottom: 10px;
            border-radius: 4px;
            color: white;
            font-size: 14px;
            opacity: 0;
            transition: opacity 0.3s ease-in-out;
            position: relative;
            ${this.#getTypeStyles(type)}
        `;

        const messageText = document.createElement('span');
        messageText.textContent = message;
        notification.appendChild(messageText);

        const closeButton = this.#createCloseButton(notification);
        notification.appendChild(closeButton);

        const container = document.getElementById('jira-extension-notifications');
        container.appendChild(notification);

        // Trigger animation
        requestAnimationFrame(() => {
            notification.style.opacity = '1';
        });

        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                this.#removeNotification(notification);
            }, duration);
        }
    }

    #createCloseButton(notification) {
        const close = document.createElement('button');
        close.innerHTML = '×';
        close.style.cssText = `
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
            padding: 0 5px;
        `;
        close.onclick = () => this.#removeNotification(notification);
        return close;
    }

    #removeNotification(notification) {
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }

    #getTypeStyles(type) {
        const styles = {
            [NotificationSystem.TYPES.SUCCESS]: 'background-color: #43a047;',
            [NotificationSystem.TYPES.ERROR]: 'background-color: #d32f2f;',
            [NotificationSystem.TYPES.WARNING]: 'background-color: #ffa000;',
            [NotificationSystem.TYPES.INFO]: 'background-color: #1976d2;'
        };
        return styles[type] || styles[NotificationSystem.TYPES.INFO];
    }
}