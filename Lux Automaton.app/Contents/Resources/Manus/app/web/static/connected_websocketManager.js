// connected_websocketManager.js

export class WebSocketManager {
    constructor(messageHandler) {
        this.socket = null;
        this.messageHandler = messageHandler;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.sessionId = null;
    }

    connect(sessionId) {
        this.sessionId = sessionId;

        if (this.socket) {
            this.socket.close();
        }

        this.reconnectAttempts = 0;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/${sessionId}`;
        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = this.handleOpen.bind(this);
        this.socket.onmessage = this.handleMessage.bind(this);
        this.socket.onclose = this.handleClose.bind(this);
        this.socket.onerror = this.handleError.bind(this);
    }

    handleOpen() {
        const status = document.getElementById('status-indicator');
        if (status) {
            status.textContent = 'Connected to server.';
        }
        this.reconnectAttempts = 0;
    }

    handleMessage(event) {
        try {
            const data = JSON.parse(event.data);
            if (this.messageHandler) {
                this.messageHandler(data);
            }
        } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
        }
    }

    handleClose(event) {
        console.log(`WebSocket closed: ${event.code} ${event.reason}`);
        this.attemptReconnect();
    }

    handleError(error) {
        console.error('WebSocket error:', error);
    }

    attemptReconnect() {
        if (!this.sessionId) {
            return;
        }

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            const status = document.getElementById('status-indicator');
            if (status) {
                status.textContent = 'Disconnected. Refresh to reconnect.';
            }
            return;
        }

        this.reconnectAttempts += 1;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        const status = document.getElementById('status-indicator');
        if (status) {
            status.textContent = `Disconnected, retrying (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`;
        }

        setTimeout(() => {
            if (this.sessionId) {
                this.connect(this.sessionId);
            }
        }, delay);
    }

    send(message) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(message));
            return;
        }
        console.error('WebSocket is not connected; cannot send message');
    }

    close() {
        if (!this.socket) {
            return;
        }
        this.socket.close();
        this.socket = null;
    }
}
