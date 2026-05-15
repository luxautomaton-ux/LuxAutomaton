import { WebSocketManager } from '/static/connected_websocketManager.js';
import { ChatManager } from '/static/connected_chatManager.js';
import { ThinkingManager } from '/static/connected_thinkingManager.js';
import { WorkspaceManager } from '/static/connected_workspaceManager.js';
import { FileViewerManager } from '/static/connected_fileViewerManager.js';
import { initLanguage, updatePageTexts, t } from '/static/i18n.js';

const SESSION_STORE_KEY = 'lux_manus_sessions';
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_ATTACHMENTS = 15;

const LUX_TOOL_CONTEXT = `
You are running inside Lux Higgsfield Studio with integrated local tools:
- Lux Manus (this web app) for task orchestration
- Lux CLI at http://localhost:3001 for coding session control
- Lux Claude via terminal command: openclaude
- Ollama local models at http://localhost:11434
- Lux Higgsfield Studio desktop app for image/video generation

Use local/private paths first. If files are attached, inspect them and use them in your plan.
`;

class App {
    constructor() {
        this.sessionId = null;
        this.isProcessing = false;
        this.pendingAttachments = [];
        this.sessionHistory = this.loadSessionHistory();

        this.websocketManager = new WebSocketManager(this.handleWebSocketMessage.bind(this));
        this.chatManager = new ChatManager(this.handleSendMessage.bind(this));
        this.thinkingManager = new ThinkingManager();
        this.workspaceManager = new WorkspaceManager(this.handleFileClick.bind(this));
        this.fileViewerManager = new FileViewerManager();

        this.bindEvents();
    }

    init() {
        console.log('Lux Manus initialized');

        initLanguage();
        updatePageTexts();

        this.chatManager.init();
        this.thinkingManager.init();
        this.workspaceManager.init();
        this.fileViewerManager.init();

        this.renderSessionHistory();
        this.renderAttachmentList();
        this.loadWorkspaceFiles();

        if (!this.sessionHistory.length) {
            this.chatManager.addSystemMessage('Welcome to Lux Manus. Upload files, images, or PDFs and I will use them in the task.');
        }
    }

    bindEvents() {
        const stopBtn = document.getElementById('stop-btn');
        const clearBtn = document.getElementById('clear-btn');
        const clearThinkingBtn = document.getElementById('clear-thinking');
        const refreshFilesBtn = document.getElementById('refresh-files');
        const newChatBtn = document.getElementById('new-chat-btn');
        const installSkillsBtn = document.getElementById('install-skills-btn');
        const addSkillBtn = document.getElementById('add-skill-btn');
        const openGuideBtn = document.getElementById('open-guide-btn');

        stopBtn?.addEventListener('click', () => {
            if (this.sessionId && this.isProcessing) {
                this.stopProcessing();
            }
        });

        clearBtn?.addEventListener('click', () => {
            this.chatManager.clearMessages();
            this.clearAttachments();
        });

        clearThinkingBtn?.addEventListener('click', () => {
            this.thinkingManager.clearThinking();
        });

        refreshFilesBtn?.addEventListener('click', () => {
            this.loadWorkspaceFiles();
        });

        newChatBtn?.addEventListener('click', () => {
            this.startNewTask();
        });

        installSkillsBtn?.addEventListener('click', () => {
            this.installSafeSkillPack();
        });

        addSkillBtn?.addEventListener('click', () => {
            this.promptAndInstallCustomSkill();
        });

        openGuideBtn?.addEventListener('click', () => {
            this.openFullGuide();
        });

        document.querySelectorAll('#quick-actions .quick-action-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                const input = document.getElementById('user-input');
                const template = btn.getAttribute('data-template') || '';
                if (input) {
                    input.value = `${template} `;
                    input.focus();
                }
            });
        });

        this.bindUploadEvents();
    }

    async openFullGuide() {
        try {
            const response = await fetch('/api/files/FULL_GUIDE_USE_CASES.md');
            if (!response.ok) {
                throw new Error(`Guide fetch failed (${response.status})`);
            }

            const data = await response.json();
            if (data.binary) {
                window.open('/api/files/download/FULL_GUIDE_USE_CASES.md', '_blank');
                return;
            }

            const content = typeof data.content === 'string' ? data.content : '';
            this.fileViewerManager.showFile('FULL_GUIDE_USE_CASES.md', content);
        } catch (error) {
            console.error('Failed to open full guide:', error);
            this.chatManager.addSystemMessage(`Could not open full guide: ${error.message}`);
        }
    }

    bindUploadEvents() {
        const attachBtn = document.getElementById('attach-btn');
        const fileInput = document.getElementById('file-upload-input');
        const dropzone = document.getElementById('upload-dropzone');

        attachBtn?.addEventListener('click', () => fileInput?.click());

        fileInput?.addEventListener('change', async (event) => {
            const files = Array.from(event.target.files || []);
            await this.addFiles(files);
            event.target.value = '';
        });

        if (!dropzone) {
            return;
        }

        ['dragenter', 'dragover'].forEach((name) => {
            dropzone.addEventListener(name, (event) => {
                event.preventDefault();
                event.stopPropagation();
                dropzone.classList.add('active');
            });
        });

        ['dragleave', 'drop'].forEach((name) => {
            dropzone.addEventListener(name, (event) => {
                event.preventDefault();
                event.stopPropagation();
                dropzone.classList.remove('active');
            });
        });

        dropzone.addEventListener('drop', async (event) => {
            const files = Array.from(event.dataTransfer?.files || []);
            await this.addFiles(files);
        });
    }

    async addFiles(files) {
        if (!files.length) {
            return;
        }

        const status = document.getElementById('status-indicator');
        for (const file of files) {
            if (this.pendingAttachments.length >= MAX_ATTACHMENTS) {
                this.chatManager.addSystemMessage(`Attachment limit reached (${MAX_ATTACHMENTS}).`);
                break;
            }

            if (file.size > MAX_FILE_SIZE) {
                this.chatManager.addSystemMessage(`Skipped ${file.name}: file exceeds 20MB.`);
                continue;
            }

            status.textContent = `Reading ${file.name}...`;
            const contentBase64 = await this.readFileAsBase64(file);

            this.pendingAttachments.push({
                id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
                name: file.name,
                mimeType: file.type || 'application/octet-stream',
                size: file.size,
                content: contentBase64,
                previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
            });
        }

        status.textContent = '';
        this.renderAttachmentList();
    }

    readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = String(reader.result || '');
                if (result.includes(',')) {
                    resolve(result.split(',')[1]);
                } else {
                    resolve(result);
                }
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    }

    renderAttachmentList() {
        const list = document.getElementById('attachment-list');
        if (!list) {
            return;
        }

        list.innerHTML = '';
        if (!this.pendingAttachments.length) {
            return;
        }

        for (const file of this.pendingAttachments) {
            const chip = document.createElement('div');
            chip.className = 'attachment-chip';

            if (file.previewUrl) {
                const img = document.createElement('img');
                img.src = file.previewUrl;
                img.alt = file.name;
                chip.appendChild(img);
            }

            const name = document.createElement('span');
            name.className = 'chip-name';
            name.textContent = `${file.name} (${this.formatFileSize(file.size)})`;
            chip.appendChild(name);

            const remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'chip-remove';
            remove.textContent = '×';
            remove.addEventListener('click', () => this.removeAttachment(file.id));
            chip.appendChild(remove);

            list.appendChild(chip);
        }
    }

    removeAttachment(id) {
        this.pendingAttachments = this.pendingAttachments.filter((file) => {
            if (file.id === id && file.previewUrl) {
                URL.revokeObjectURL(file.previewUrl);
            }
            return file.id !== id;
        });
        this.renderAttachmentList();
    }

    clearAttachments() {
        for (const file of this.pendingAttachments) {
            if (file.previewUrl) {
                URL.revokeObjectURL(file.previewUrl);
            }
        }
        this.pendingAttachments = [];
        this.renderAttachmentList();
    }

    updateDynamicTexts() {
        const statusIndicator = document.getElementById('status-indicator');
        if (statusIndicator.textContent.toLowerCase().includes('processing')) {
            statusIndicator.textContent = t('processing_request');
        } else if (statusIndicator.textContent.toLowerCase().includes('stopped')) {
            statusIndicator.textContent = t('processing_stopped');
        }

        const recordCount = document.getElementById('record-count');
        const count = parseInt(recordCount.textContent, 10);
        if (!Number.isNaN(count)) {
            recordCount.textContent = t('records_count', { count });
        }

        const refreshCountdown = document.getElementById('refresh-countdown');
        const seconds = refreshCountdown.textContent.match(/\d+/);
        if (seconds) {
            refreshCountdown.textContent = t('refresh_countdown', { seconds: seconds[0] });
        }
    }

    async handleSendMessage(message) {
        if (this.isProcessing) {
            this.chatManager.addSystemMessage(t('processing_in_progress'));
            return;
        }

        this.isProcessing = true;
        document.getElementById('send-btn').disabled = true;
        document.getElementById('stop-btn').disabled = false;
        document.getElementById('status-indicator').textContent = t('processing_request');

        const model = document.getElementById('model-selector')?.value || 'ollama';
        const mode = document.getElementById('mode-selector')?.value || 'agent';
        const attachmentPayload = this.pendingAttachments.map((file) => ({
            name: file.name,
            mime_type: file.mimeType,
            size: file.size,
            content: file.content,
        }));

        let attachmentText = '';
        if (attachmentPayload.length) {
            attachmentText = `\n\nAttached files (${attachmentPayload.length}): ${attachmentPayload.map((a) => a.name).join(', ')}`;
        }

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: `${LUX_TOOL_CONTEXT}\n\nMode: ${mode}\nModel: ${model}\n\nUser request:\n${message}${attachmentText}`,
                    mode,
                    model,
                    attachments: attachmentPayload,
                }),
            });

            if (!response.ok) {
                throw new Error(t('api_error', { status: response.status }));
            }

            const data = await response.json();
            this.sessionId = data.session_id;

            this.chatManager.addUserMessage(message);
            if (attachmentPayload.length) {
                this.chatManager.addSystemMessage(`Attached ${attachmentPayload.length} file(s): ${attachmentPayload.map((a) => a.name).join(', ')}`);
            }

            this.websocketManager.connect(this.sessionId);
            this.thinkingManager.clearThinking();

            this.pushSessionHistory({
                id: this.sessionId,
                title: message.slice(0, 55),
                workspace: data.workspace || '',
                timestamp: Date.now(),
                mode,
                model,
            });

            this.clearAttachments();
        } catch (error) {
            console.error(t('send_message_error', { message: error.message }), error);
            this.chatManager.addSystemMessage(t('error_occurred', { message: error.message }));
            this.isProcessing = false;
            document.getElementById('send-btn').disabled = false;
            document.getElementById('stop-btn').disabled = true;
            document.getElementById('status-indicator').textContent = '';
        }
    }

    handleWebSocketMessage(data) {
        if (data.status && (data.status === 'completed' || data.status === 'error' || data.status === 'stopped')) {
            this.isProcessing = false;
            document.getElementById('send-btn').disabled = false;
            document.getElementById('stop-btn').disabled = true;
            document.getElementById('status-indicator').textContent = '';

            if (data.result) {
                this.chatManager.addAIMessage(data.result);
            }
        }

        if (data.thinking_steps && data.thinking_steps.length > 0) {
            this.thinkingManager.addThinkingSteps(data.thinking_steps);
        }

        if (data.system_logs && data.system_logs.length > 0) {
            const logSteps = data.system_logs.map((log) => ({
                message: typeof log === 'string' ? log : (log.message || 'System log'),
                type: 'system_log',
                details: typeof log === 'string' ? null : JSON.stringify(log, null, 2),
                timestamp: Date.now() / 1000,
            }));

            this.thinkingManager.addThinkingSteps(logSteps);
        }

        if (data.status === 'completed') {
            setTimeout(() => this.loadWorkspaceFiles(), 800);
        }
    }

    async stopProcessing() {
        if (!this.sessionId) {
            return;
        }

        try {
            const response = await fetch(`/api/chat/${this.sessionId}/stop`, {
                method: 'POST',
            });

            if (!response.ok) {
                throw new Error(t('api_error', { status: response.status }));
            }

            this.chatManager.addSystemMessage(t('processing_stopped'));
            document.getElementById('status-indicator').textContent = t('processing_stopped');
            document.getElementById('send-btn').disabled = false;
            document.getElementById('stop-btn').disabled = true;
            this.isProcessing = false;
        } catch (error) {
            console.error(t('stop_processing_error', { message: error.message }), error);
            this.chatManager.addSystemMessage(t('error_occurred', { message: error.message }));
        }
    }

    async loadWorkspaceFiles() {
        try {
            const response = await fetch('/api/files');
            if (!response.ok) {
                throw new Error(t('api_error', { status: response.status }));
            }

            const data = await response.json();
            this.workspaceManager.updateWorkspaces(data.workspaces);
        } catch (error) {
            console.error(t('load_workspace_error', { message: error.message }), error);
        }
    }

    async handleFileClick(filePath) {
        try {
            const response = await fetch(`/api/files/${encodeURIComponent(filePath)}`);
            if (!response.ok) {
                throw new Error(t('api_error', { status: response.status }));
            }

            const data = await response.json();
            if (data.binary && data.download_url) {
                this.chatManager.addSystemMessage(`Binary file selected: ${data.name}. Open/download from ${data.download_url}`);
            } else {
                this.fileViewerManager.showFile(data.name, data.content || '');
            }
        } catch (error) {
            console.error(t('load_file_error', { message: error.message }), error);
            this.chatManager.addSystemMessage(t('error_occurred', { message: error.message }));
        }
    }

    startNewTask() {
        this.sessionId = null;
        this.isProcessing = false;
        this.websocketManager.close();
        this.chatManager.clearMessages();
        this.thinkingManager.clearThinking();
        this.clearAttachments();
        document.getElementById('status-indicator').textContent = 'New task ready.';
        document.getElementById('send-btn').disabled = false;
        document.getElementById('stop-btn').disabled = true;
    }

    async installSafeSkillPack() {
        const status = document.getElementById('status-indicator');
        status.textContent = 'Installing safe skill pack...';
        try {
            const response = await fetch('/api/skills/install-safe-pack', { method: 'POST' });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.detail || data.message || 'Skill install failed');
            }
            this.chatManager.addSystemMessage(`Skills installed: ${data.installed.join(', ')}`);
            status.textContent = 'Safe skill pack installed.';
        } catch (error) {
            this.chatManager.addSystemMessage(`Skill install failed: ${error.message}`);
            status.textContent = 'Skill install failed.';
        }
    }

    async promptAndInstallCustomSkill() {
        const repository = window.prompt('Enter GitHub repo (owner/repo) or full URL', 'owner/repo');
        if (!repository || repository === 'owner/repo') {
            return;
        }

        const status = document.getElementById('status-indicator');
        status.textContent = `Installing ${repository}...`;

        try {
            const response = await fetch('/api/skills/install', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repository }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.detail || data.message || 'Install failed');
            }

            this.chatManager.addSystemMessage(`Skill ${data.skill} ${data.action}. Path: ${data.path}`);
            status.textContent = `Installed ${data.skill}.`;
        } catch (error) {
            this.chatManager.addSystemMessage(`Custom skill install failed: ${error.message}`);
            status.textContent = 'Custom skill install failed.';
        }
    }

    loadSessionHistory() {
        try {
            const raw = localStorage.getItem(SESSION_STORE_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            if (Array.isArray(parsed)) {
                return parsed;
            }
            return [];
        } catch (_error) {
            return [];
        }
    }

    pushSessionHistory(item) {
        this.sessionHistory = [item, ...this.sessionHistory.filter((entry) => entry.id !== item.id)].slice(0, 50);
        localStorage.setItem(SESSION_STORE_KEY, JSON.stringify(this.sessionHistory));
        this.renderSessionHistory();
    }

    renderSessionHistory() {
        const container = document.getElementById('session-history');
        if (!container) {
            return;
        }

        container.innerHTML = '';

        if (!this.sessionHistory.length) {
            const empty = document.createElement('div');
            empty.className = 'empty-hint';
            empty.textContent = 'No sessions yet. Start a task to create history.';
            container.appendChild(empty);
            return;
        }

        for (const session of this.sessionHistory) {
            const item = document.createElement('div');
            item.className = `session-item${session.id === this.sessionId ? ' active' : ''}`;
            item.innerHTML = `
                <div class="session-title">${this.escapeHtml(session.title || 'Untitled task')}</div>
                <div class="session-meta">${new Date(session.timestamp).toLocaleString()} · ${this.escapeHtml(session.mode || 'agent')} · ${this.escapeHtml(session.model || 'ollama')}</div>
            `;
            item.addEventListener('click', () => {
                this.sessionId = session.id;
                this.renderSessionHistory();
                this.chatManager.addSystemMessage(`Switched context to session ${session.id}.`);
            });
            container.appendChild(item);
        }
    }

    escapeHtml(value) {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
    }

    formatFileSize(size) {
        if (size < 1024) {
            return `${size} B`;
        }
        if (size < 1024 * 1024) {
            return `${(size / 1024).toFixed(0)} KB`;
        }
        return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
    window.app = app;
});
