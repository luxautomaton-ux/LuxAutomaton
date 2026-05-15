// English-only text map for Lux Manus

export const translations = {
    page_title: 'Lux Manus - Web Interface',
    app_title: 'Lux Manus',
    app_subtitle: 'Private AI Agent - Web Interface',
    processing_progress: 'Processing Progress',
    ai_thinking_process: 'AI Thinking Process',
    workspace_files: 'Workspace Files',
    conversation: 'Conversation',
    auto_scroll: 'Auto Scroll',
    clear: 'Clear',
    refresh: 'Refresh',
    send: 'Send',
    stop: 'Stop',
    close: 'Close',
    records_count: '{count} records',
    refresh_countdown: 'Refresh in {seconds}s',
    processing_request: 'Processing your request...',
    processing_stopped: 'Processing stopped',
    file_name: 'File Name',
    input_placeholder: 'Give Manus a task to work on...',
    ui_made_by: 'Built for:',
    powered_by: 'Powered by Lux Manus -',
    api_error: 'API error: {status}',
    send_message_error: 'Send message error: {message}',
    stop_processing_error: 'Stop processing error: {message}',
    load_workspace_error: 'Load workspace files error: {message}',
    load_file_error: 'Load file content error: {message}',
    error_occurred: 'Error: {message}',
    processing_in_progress: 'Processing in progress, please wait...'
};

export function initLanguage() {
    return 'en-US';
}

export function t(key, params = {}) {
    let text = translations[key] || key;
    Object.keys(params).forEach(param => {
        text = text.replace(`{${param}}`, params[param]);
    });
    return text;
}

export function updatePageTexts() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            if (element.getAttribute('placeholder')) {
                element.setAttribute('placeholder', t(key));
            }
        } else {
            element.textContent = t(key);
        }
    });
    document.title = t('page_title');
}
