// connected_thinkingManager.js

export class ThinkingManager {
    constructor() {
        this.thinkingContainer = document.getElementById('thinking-timeline');
        this.recordCountElement = document.getElementById('record-count');
        this.autoScrollCheckbox = document.getElementById('auto-scroll');
        this.thinkingSteps = [];
    }

    init() {
        this.updateRecordCount();
    }

    addThinkingStep(step) {
        this.thinkingSteps.push(step);

        const stepElement = this.createStepElement(step);
        this.thinkingContainer.appendChild(stepElement);
        this.updateRecordCount();

        if (this.autoScrollCheckbox.checked) {
            this.scrollToBottom();
        }

        setTimeout(() => {
            stepElement.style.opacity = 1;
        }, 10);
    }

    addThinkingSteps(steps) {
        if (!Array.isArray(steps)) {
            return;
        }
        steps.forEach((step) => this.addThinkingStep(step));
    }

    createStepElement(step) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'timeline-item';
        itemDiv.style.opacity = 0;

        if (step.type === 'conclusion' || step.type === 'completed') {
            itemDiv.classList.add('completed');
        }

        const contentDiv = document.createElement('div');
        contentDiv.className = 'timeline-content';

        const headerDiv = document.createElement('div');
        headerDiv.className = 'timeline-header';
        headerDiv.textContent = this.getStepHeader(step);
        contentDiv.appendChild(headerDiv);

        if (step.details) {
            const detailsButton = document.createElement('button');
            detailsButton.className = 'btn-details';
            detailsButton.textContent = 'Show details ▼';
            contentDiv.appendChild(detailsButton);

            const detailsDiv = document.createElement('div');
            detailsDiv.className = 'timeline-details';
            detailsDiv.style.display = 'none';
            detailsDiv.textContent = step.details;
            contentDiv.appendChild(detailsDiv);

            detailsButton.addEventListener('click', () => {
                if (detailsDiv.style.display === 'none') {
                    detailsDiv.style.display = 'block';
                    detailsButton.textContent = 'Hide details ▲';
                } else {
                    detailsDiv.style.display = 'none';
                    detailsButton.textContent = 'Show details ▼';
                }
            });
        }

        if (step.files && step.files.length > 0) {
            const fileListDiv = document.createElement('div');
            fileListDiv.className = 'file-list';
            fileListDiv.textContent = step.files.join(', ');
            contentDiv.appendChild(fileListDiv);
        }

        itemDiv.appendChild(contentDiv);
        return itemDiv;
    }

    getStepHeader(step) {
        if (step.message) {
            return step.message;
        }

        switch (step.type) {
            case 'thinking':
                return step.content || 'Thinking';
            case 'tool':
                return `Using tool: ${step.tool || ''}`;
            case 'file':
                return `Generated ${step.files ? step.files.length : 0} file(s) in workspace ${step.workspace || ''}`;
            case 'conclusion':
            case 'completed':
                return `Task completed in workspace ${step.workspace || ''}`;
            case 'error':
                return `Error: ${step.error || ''}`;
            case 'system':
                return step.content || 'System message';
            case 'system_log':
                return step.message || 'System log';
            case 'progress':
                return `Step ${step.current}/${step.total}`;
            default:
                return step.content
                    ? step.content.substring(0, 80) + (step.content.length > 80 ? '...' : '')
                    : 'Thinking step';
        }
    }

    updateRecordCount() {
        if (this.recordCountElement) {
            this.recordCountElement.textContent = `${this.thinkingSteps.length} records`;
        }
    }

    clearThinking() {
        this.thinkingSteps = [];
        this.thinkingContainer.innerHTML = '';
        this.updateRecordCount();
    }

    scrollToBottom() {
        this.thinkingContainer.scrollTop = this.thinkingContainer.scrollHeight;
    }
}
