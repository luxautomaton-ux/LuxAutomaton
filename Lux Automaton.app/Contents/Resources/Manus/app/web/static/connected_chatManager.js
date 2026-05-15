// connected_chatManager.js

export class ChatManager {
    constructor(sendMessageCallback) {
        this.chatContainer = document.getElementById('chat-messages');
        this.userInput = document.getElementById('user-input');
        this.sendButton = document.getElementById('send-btn');
        this.sendMessageCallback = sendMessageCallback;
    }

    init() {
        this.sendButton?.addEventListener('click', () => this.sendMessage());

        this.userInput?.addEventListener('keypress', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                this.sendMessage();
            }
        });

        this.userInput?.addEventListener('input', () => this.adjustTextareaHeight());
    }

    sendMessage() {
        const message = this.userInput?.value?.trim();
        if (!message) {
            return;
        }

        if (this.sendMessageCallback) {
            this.sendMessageCallback(message);
        }

        this.userInput.value = '';
        this.adjustTextareaHeight();
    }

    addUserMessage(message) {
        const element = this.createMessageElement('user-message', message);
        this.chatContainer.appendChild(element);
        this.scrollToBottom();
    }

    addAIMessage(message) {
        const element = this.createMessageElement('ai-message', message);
        this.chatContainer.appendChild(element);
        this.scrollToBottom();
    }

    addSystemMessage(message) {
        const element = this.createMessageElement('system-message', message);
        this.chatContainer.appendChild(element);
        this.scrollToBottom();
    }

    createMessageElement(className, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${className}`;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = this.formatMessage(content);

        messageDiv.appendChild(contentDiv);
        return messageDiv;
    }

    formatMessage(content) {
        if (!content) {
            return '';
        }

        let formatted = String(content)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        formatted = formatted.replace(/\`\`\`([^\`]+)\`\`\`/g, '<pre><code>$1</code></pre>');
        formatted = formatted.replace(/\`([^\`]+)\`/g, '<code>$1</code>');
        formatted = formatted.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>');
        formatted = formatted.replace(/\*([^\*]+)\*/g, '<em>$1</em>');
        formatted = formatted.replace(/\n/g, '<br>');

        return formatted;
    }

    clearMessages() {
        this.chatContainer.innerHTML = '';
    }

    scrollToBottom() {
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }

    adjustTextareaHeight() {
        this.userInput.style.height = 'auto';
        this.userInput.style.height = `${this.userInput.scrollHeight}px`;
    }
}
