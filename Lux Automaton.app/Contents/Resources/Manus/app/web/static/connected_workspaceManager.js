// connected_workspaceManager.js

export class WorkspaceManager {
    constructor(fileClickCallback) {
        this.workspaceContainer = document.getElementById('workspace-files');
        this.refreshCountdownElement = document.getElementById('refresh-countdown');
        this.fileClickCallback = fileClickCallback;
        this.workspaces = [];
        this.refreshTimer = null;
        this.countdownValue = 5;
    }

    init() {
        this.startRefreshTimer();
    }

    updateWorkspaces(workspaces) {
        if (!Array.isArray(workspaces)) {
            return;
        }

        this.workspaces = workspaces;
        this.renderWorkspaces();
    }

    renderWorkspaces() {
        this.workspaceContainer.innerHTML = '';

        if (this.workspaces.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'empty-hint';
            emptyDiv.textContent = 'No workspace files yet.';
            this.workspaceContainer.appendChild(emptyDiv);
            return;
        }

        this.workspaces.forEach((workspace) => {
            const workspaceItem = this.createWorkspaceItem(workspace);
            this.workspaceContainer.appendChild(workspaceItem);

            if (workspace.files && workspace.files.length > 0) {
                workspace.files.forEach((file) => {
                    const fileItem = this.createFileItem(file);
                    this.workspaceContainer.appendChild(fileItem);
                });
            }
        });
    }

    createWorkspaceItem(workspace) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'workspace-item';

        const iconDiv = document.createElement('div');
        iconDiv.className = 'workspace-icon';
        iconDiv.textContent = '📁';
        itemDiv.appendChild(iconDiv);

        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'workspace-details';

        const nameDiv = document.createElement('div');
        nameDiv.className = 'workspace-name';
        nameDiv.textContent = workspace.name;
        detailsDiv.appendChild(nameDiv);

        const dateDiv = document.createElement('div');
        dateDiv.className = 'workspace-date';
        dateDiv.textContent = this.formatDate(workspace.modified);
        detailsDiv.appendChild(dateDiv);

        itemDiv.appendChild(detailsDiv);
        return itemDiv;
    }

    createFileItem(file) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'file-item';
        itemDiv.dataset.path = file.path;

        const iconDiv = document.createElement('div');
        iconDiv.className = 'file-icon';
        iconDiv.textContent = this.getFileIcon(file.type);
        itemDiv.appendChild(iconDiv);

        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'file-details';

        const nameDiv = document.createElement('div');
        nameDiv.className = 'file-name';
        nameDiv.textContent = file.name;
        detailsDiv.appendChild(nameDiv);

        const metaDiv = document.createElement('div');
        metaDiv.className = 'file-meta';
        metaDiv.textContent = `${this.formatFileSize(file.size)} · ${this.formatDate(file.modified)}`;
        detailsDiv.appendChild(metaDiv);

        itemDiv.appendChild(detailsDiv);

        itemDiv.addEventListener('click', () => {
            document.querySelectorAll('.file-item').forEach((item) => item.classList.remove('selected'));
            itemDiv.classList.add('selected');

            if (this.fileClickCallback) {
                this.fileClickCallback(file.path);
            }
        });

        return itemDiv;
    }

    getFileIcon(fileType) {
        switch ((fileType || '').toLowerCase()) {
            case 'txt':
            case 'md':
                return '📄';
            case 'html':
            case 'css':
            case 'js':
            case 'ts':
            case 'tsx':
            case 'jsx':
            case 'py':
            case 'json':
            case 'yaml':
            case 'yml':
            case 'xml':
            case 'sql':
                return '💻';
            case 'png':
            case 'jpg':
            case 'jpeg':
            case 'gif':
            case 'webp':
            case 'svg':
                return '🖼️';
            case 'pdf':
                return '📕';
            case 'doc':
            case 'docx':
                return '📘';
            case 'xls':
            case 'xlsx':
            case 'csv':
                return '📊';
            case 'ppt':
            case 'pptx':
                return '📽️';
            case 'zip':
            case 'tar':
            case 'gz':
                return '🗜️';
            default:
                return '📦';
        }
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

    formatDate(timestamp) {
        if (!timestamp) {
            return '';
        }
        const date = new Date(timestamp * 1000);
        return date.toLocaleString();
    }

    startRefreshTimer() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }

        this.countdownValue = 5;
        this.refreshCountdownElement.textContent = `Refresh in ${this.countdownValue}s`;

        this.refreshTimer = setInterval(() => {
            this.countdownValue -= 1;

            if (this.countdownValue > 0) {
                this.refreshCountdownElement.textContent = `Refresh in ${this.countdownValue}s`;
                return;
            }

            this.refreshCountdownElement.textContent = 'Refreshing...';
            this.refreshWorkspaces();
            this.countdownValue = 5;
            this.refreshCountdownElement.textContent = `Refresh in ${this.countdownValue}s`;
        }, 1000);
    }

    async refreshWorkspaces() {
        try {
            const response = await fetch('/api/files');
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            this.updateWorkspaces(data.workspaces);
        } catch (error) {
            console.error('Workspace refresh error:', error);
        }
    }
}
