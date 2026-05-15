// connected_fileViewerManager.js

export class FileViewerManager {
    constructor() {
        this.fileViewer = document.getElementById('file-viewer');
        this.fileName = document.getElementById('file-name');
        this.fileContent = document.getElementById('file-content');
        this.closeButton = document.getElementById('close-file-viewer');
    }

    init() {
        this.hideFileViewer();
        this.closeButton?.addEventListener('click', () => this.hideFileViewer());
    }

    showFile(name, content) {
        this.fileName.textContent = name;
        this.fileContent.textContent = this.formatCode(content, this.getFileType(name));
        this.applySyntaxHint(name);
        this.fileViewer.style.display = 'block';
    }

    hideFileViewer() {
        this.fileViewer.style.display = 'none';
    }

    getFileType(fileName) {
        const parts = String(fileName || '').split('.');
        return (parts.pop() || '').toLowerCase();
    }

    applySyntaxHint(fileName) {
        const extension = this.getFileType(fileName);
        this.fileContent.className = `file-content language-${extension || 'text'}`;
    }

    formatCode(code, language) {
        if (!code) {
            return '';
        }

        if (language === 'json') {
            try {
                return JSON.stringify(JSON.parse(code), null, 2);
            } catch (_error) {
                return code;
            }
        }

        return code;
    }
}
