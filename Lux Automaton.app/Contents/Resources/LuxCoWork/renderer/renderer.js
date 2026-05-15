// Browser Fallback Polyfill for Electron Bridge if loaded outside of Electron
if (typeof window !== 'undefined' && !window.electronAPI) {
  const SERVER_URL = window.location.origin;
  let currentAbortController = null;

  window.electronAPI = {
    abortCurrentRequest: () => {
      if (currentAbortController) {
        console.log('[BROWSER POLYFILL] Aborting current request');
        currentAbortController.abort();
        currentAbortController = null;
      }
    },

    stopQuery: async (chatId, provider = 'opencode') => {
      console.log('[BROWSER POLYFILL] Stopping query for chatId:', chatId);
      try {
        const response = await fetch(`${SERVER_URL}/api/abort`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId, provider })
        });
        return await response.json();
      } catch (error) {
        console.error('[BROWSER POLYFILL] Error stopping query:', error);
        return { success: false, error: error.message };
      }
    },

    sendMessage: async (message, chatId, provider = 'opencode', model = null) => {
      if (currentAbortController) {
        currentAbortController.abort();
      }
      currentAbortController = new AbortController();
      const signal = currentAbortController.signal;

      return new Promise((resolve, reject) => {
        console.log('[BROWSER POLYFILL] Sending message to backend:', message);
        fetch(`${SERVER_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, chatId, provider, model }),
          signal
        })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
          }
          console.log('[BROWSER POLYFILL] Connected successfully');
          resolve({
            getReader: async function() {
              const reader = response.body.getReader();
              const decoder = new TextDecoder();
              return {
                read: async () => {
                  try {
                    const { done, value } = await reader.read();
                    return {
                      done,
                      value: done ? undefined : decoder.decode(value, { stream: true })
                    };
                  } catch (readError) {
                    console.error('[BROWSER POLYFILL] Read error:', readError);
                    throw readError;
                  }
                }
              };
            }
          });
        })
        .catch(error => {
          console.error('[BROWSER POLYFILL] Connection error:', error);
          reject(new Error(`Failed to connect to backend: ${error.message}`));
        });
      });
    },

    getProviders: async () => {
      try {
        const response = await fetch(`${SERVER_URL}/api/providers`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
      } catch (error) {
        console.error('[BROWSER POLYFILL] Error fetching providers:', error);
        return { providers: ['opencode'], default: 'opencode' };
      }
    }
  };
}

// DOM Elements - Views
const homeView = document.getElementById('homeView');
const chatView = document.getElementById('chatView');

// DOM Elements - Home
const homeForm = document.getElementById('homeForm');
const homeInput = document.getElementById('homeInput');
const homeSendBtn = document.getElementById('homeSendBtn');

// DOM Elements - Chat
const chatForm = document.getElementById('chatForm');
const messageInput = document.getElementById('messageInput');
const chatSendBtn = document.getElementById('chatSendBtn');
const chatMessages = document.getElementById('chatMessages');
const chatTitle = document.getElementById('chatTitle');

// DOM Elements - Right Sidebar
const rightSidebar = document.getElementById('rightSidebar');
const rightSidebarToggle = document.getElementById('rightSidebarToggle');
const rightSidebarExpand = document.getElementById('rightSidebarExpand');
const stepsList = document.getElementById('stepsList');
const stepsCount = document.getElementById('stepsCount');
const toolCallsList = document.getElementById('toolCallsList');
const emptySteps = document.getElementById('emptySteps');
const emptyTools = document.getElementById('emptyTools');

// DOM Elements - Left Sidebar (Chat History)
const chatHistoryList = document.getElementById('chatHistoryList');
const leftSidebar = document.getElementById('leftSidebar');
const leftSidebarToggle = document.getElementById('leftSidebarToggle');
const leftSidebarExpand = document.getElementById('leftSidebarExpand');

// State
let isFirstMessage = true;
let todos = [];
let toolCalls = [];
let attachedFiles = [];
let selectedProvider = 'opencode';
let selectedModel = 'opencode/big-pickle';
let thinkingMode = 'normal';
let isWaitingForResponse = false;

let activeBrowserSession = null;
let browserDisplayMode = 'hidden';

let allChats = [];
let currentChatId = null;

const APP_SETTINGS_KEY = 'luxCoworkSettings';
let availableProviders = ['opencode'];

const providerDisplayNames = {
  opencode: 'Opencode',
  claude: 'Claude',
};

const DEFAULT_SETTINGS = {
  defaultTab: 'cowork',
  provider: 'opencode',
  model: 'opencode/minimax-m2.5-free',
  thinkingMode: 'normal',
  collapseLeftOnStartup: false,
  collapseRightOnStartup: false,
};

let appSettings = { ...DEFAULT_SETTINGS };

let providerModels = {
  opencode: [
    { value: 'opencode/minimax-m2.5-free', label: 'Zen MiniMax 2.5', desc: 'Free · Default for all modes', default: true },
    { value: 'opencode/big-pickle', label: 'Big Pickle', desc: 'Free reasoning model' },
    { value: 'opencode/gpt-5-nano', label: 'GPT-5 Nano', desc: 'OpenAI reasoning model' },
    { value: 'opencode/glm-4.7-free', label: 'GLM-4.7', desc: 'Zhipu GLM free' },
    { value: 'opencode/grok-code', label: 'Grok Code', desc: 'xAI coding model' },
    { value: 'opencode/minimax-m2.1-free', label: 'MiniMax M2.1', desc: 'MiniMax free legacy' },
    { value: 'anthropic/claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5', desc: 'Anthropic via Opencode (paid)' },
    { value: 'anthropic/claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', desc: 'Anthropic via Opencode (paid)' }
  ]
};

function getProviderLabel(provider) {
  if (!provider) return 'Provider';
  return providerDisplayNames[provider] || provider.charAt(0).toUpperCase() + provider.slice(1);
}

// Initialize
function init() {
  loadAppSettings();
  updateGreeting();
  setupEventListeners();
  loadAllChats();
  loadAvailableProviders();
  applySettingsToUi();
  renderChatHistory();
  homeInput.focus();
  animateProgressBar();
  if (typeof initComposioConnector === 'function') {
    initComposioConnector();
  }
}

function createProviderModelList(provider) {
  if (provider === 'claude') {
    return [
      { value: 'anthropic/claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5', desc: 'Anthropic API', default: true },
      { value: 'anthropic/claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', desc: 'Anthropic API' },
    ];
  }
  return [
    { value: 'opencode/big-pickle', label: 'Big Pickle', desc: 'Free reasoning model', default: true },
    { value: 'opencode/grok-code', label: 'Grok Code', desc: 'xAI coding model' },
  ];
}

function upsertProviderCatalog(providerName) {
  if (!providerName) return;
  const provider = providerName.toLowerCase();
  if (!providerModels[provider]) {
    providerModels[provider] = createProviderModelList(provider);
  }
}

function rebuildProviderDropdowns() {
  const providers = availableProviders.length > 0 ? availableProviders : Object.keys(providerModels);
  const menuHtml = providers
    .map((provider) => {
      const selected = provider === selectedProvider;
      const check = selected
        ? `<svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`
        : '';
      return `
        <div class="dropdown-item${selected ? ' selected' : ''}" data-value="${provider}">
          <div class="item-row">
            <span class="item-label">${getProviderLabel(provider)}</span>
            ${check}
          </div>
        </div>`;
    })
    .join('');

  document.querySelectorAll('.provider-menu').forEach((menu) => {
    menu.innerHTML = menuHtml;
  });
}

async function loadAvailableProviders() {
  try {
    if (!window.electronAPI || typeof window.electronAPI.getProviders !== 'function') {
      availableProviders = ['opencode'];
      upsertProviderCatalog('opencode');
      rebuildProviderDropdowns();
      updateProviderUI(selectedProvider);
      populateSettingsForm();
      return;
    }

    const payload = await window.electronAPI.getProviders();
    const providers = Array.isArray(payload?.providers) && payload.providers.length > 0
      ? payload.providers.map((name) => String(name).toLowerCase())
      : ['opencode'];

    availableProviders = providers;
    availableProviders.forEach(upsertProviderCatalog);
    rebuildProviderDropdowns();

    if (!availableProviders.includes(selectedProvider)) {
      selectedProvider = payload?.default && availableProviders.includes(payload.default)
        ? payload.default
        : availableProviders[0];
    }

    updateProviderUI(selectedProvider);
    populateSettingsForm();
  } catch (error) {
    console.error('[Providers] Failed to load provider list:', error);
    availableProviders = ['opencode'];
    upsertProviderCatalog('opencode');
    rebuildProviderDropdowns();
    updateProviderUI(selectedProvider);
    populateSettingsForm();
  }
}

function loadAppSettings() {
  try {
    const raw = localStorage.getItem(APP_SETTINGS_KEY);
    if (!raw) {
      appSettings = { ...DEFAULT_SETTINGS };
      return;
    }
    const parsed = JSON.parse(raw);
    appSettings = {
      ...DEFAULT_SETTINGS,
      ...(parsed && typeof parsed === 'object' ? parsed : {}),
    };
  } catch (error) {
    console.error('[Settings] Failed to load settings:', error);
    appSettings = { ...DEFAULT_SETTINGS };
  }
}

function saveAppSettings() {
  localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(appSettings));
}

function setWorkspaceMode(tabName) {
  const mode = String(tabName || 'cowork').toLowerCase();
  
  // Update Tab Switcher Buttons
  document.querySelectorAll('.sidebar-tab-switcher .tab-btn').forEach((btn) => {
    const isMatch = btn.id.toLowerCase().includes(mode);
    btn.classList.toggle('active', isMatch);
  });

  // Toggle Workspace Divs
  const coworkWs = document.getElementById('coworkWorkspace');
  const chatWs = document.getElementById('chatWorkspace');
  const codeWs = document.getElementById('codeWorkspace');

  if (coworkWs) coworkWs.classList.toggle('hidden', mode !== 'cowork');
  if (chatWs) chatWs.classList.toggle('hidden', mode !== 'chat');
  if (codeWs) codeWs.classList.toggle('hidden', mode !== 'code');

  // Toggle Sidebar sub-panels
  const subCowork = document.getElementById('sidebarSubCowork');
  const subChat = document.getElementById('sidebarSubChat');
  const subCode = document.getElementById('sidebarSubCode');

  if (subCowork) subCowork.classList.toggle('hidden', mode !== 'cowork');
  if (subChat) subChat.classList.toggle('hidden', mode !== 'chat');
  if (subCode) subCode.classList.toggle('hidden', mode !== 'code');

  // Toggle Right Sidebar visibility based on Cowork Mode (USER REQUEST!)
  const rightSidebar = document.getElementById('rightSidebar');
  const rightSidebarExpand = document.getElementById('rightSidebarExpand');
  if (rightSidebar) {
    if (mode === 'cowork') {
      rightSidebar.classList.remove('hidden');
      const isCollapsed = localStorage.getItem('rightSidebarCollapsed') === 'true';
      rightSidebar.classList.toggle('collapsed', isCollapsed);
      if (rightSidebarExpand) {
        rightSidebarExpand.classList.toggle('hidden', !isCollapsed);
        rightSidebarExpand.classList.toggle('visible', isCollapsed);
      }
    } else {
      rightSidebar.classList.add('hidden');
      if (rightSidebarExpand) {
        rightSidebarExpand.classList.add('hidden');
        rightSidebarExpand.classList.remove('visible');
      }
    }
  }

  // Update section-specific dynamic logo & title
  const brandLogo = document.getElementById('sidebarBrandLogo');
  const brandName = document.getElementById('sidebarBrandName');
  if (brandLogo && brandName) {
    if (mode === 'chat') {
      brandLogo.src = 'assets/LUX_MANUS.png';
      brandName.textContent = 'Lux AI Chat';
    } else if (mode === 'code') {
      brandLogo.src = 'assets/LUX_CLAUDE.png';
      brandName.textContent = 'Lux AI Code';
    } else {
      brandLogo.src = 'assets/COWORK.jpeg';
      brandName.textContent = 'Lux CoWork';
    }
  }

  // Removed hardcoded model selection logic to respect the user's current settings

  const tagline = document.querySelector('.tagline-branding');
  if (tagline) {
    if (mode === 'chat') tagline.textContent = 'Conversational brainstorming desk is ready';
    else if (mode === 'code') tagline.textContent = 'Full-stack software engineering suite is active';
    else tagline.textContent = "Let's knock something off your list";
  }

  localStorage.setItem('selectedModel', selectedModel);
}

function applySettingsToUi() {
  thinkingMode = appSettings.thinkingMode === 'extended' ? 'extended' : 'normal';
  document.querySelectorAll('.thinking-btn').forEach((btn) => {
    btn.classList.toggle('active', thinkingMode === 'extended');
  });

  upsertProviderCatalog(appSettings.provider);
  if (providerModels[appSettings.provider]) {
    selectedProvider = appSettings.provider;
  }
  updateProviderUI(selectedProvider);

  if (appSettings.model) {
    selectedModel = appSettings.model;
    const modelInfo = (providerModels[selectedProvider] || []).find((model) => model.value === selectedModel);
    if (modelInfo) {
      document.querySelectorAll('.model-selector .model-label').forEach((label) => {
        label.textContent = modelInfo.label;
      });
    }
  }

  if (!currentChatId) {
    setWorkspaceMode(appSettings.defaultTab);
  }

  if (appSettings.collapseLeftOnStartup && !leftSidebar.classList.contains('collapsed')) {
    toggleLeftSidebar();
  }
  if (!appSettings.collapseLeftOnStartup && leftSidebar.classList.contains('collapsed')) {
    toggleLeftSidebar();
  }
  if (appSettings.collapseRightOnStartup && rightSidebar && !rightSidebar.classList.contains('collapsed')) {
    toggleRightSidebar();
  }
  if (!appSettings.collapseRightOnStartup && rightSidebar && rightSidebar.classList.contains('collapsed')) {
    toggleRightSidebar();
  }
}

function generateId() {
  return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Save current chat state
function saveState() {
  if (!currentChatId) return;

  if (isWaitingForResponse) {
    console.log('[Save] Skipping save during streaming');
    return;
  }

  const chatData = {
    id: currentChatId,
    title: chatTitle.textContent,
    messages: Array.from(chatMessages.children).map(msg => {
      const contentDiv = msg.querySelector('.message-content');
      const rawContent = contentDiv?.dataset.rawContent || contentDiv?.textContent || '';

      // Save complete message structure including tool calls
      return {
        class: msg.className,
        content: rawContent,
        html: contentDiv?.innerHTML || '' // Save rendered HTML to restore tool calls
      };
    }),
    todos,
    toolCalls,
    provider: selectedProvider,
    model: selectedModel,
    updatedAt: Date.now()
  };

  // Update or add chat in allChats
  const index = allChats.findIndex(c => c.id === currentChatId);
  if (index >= 0) {
    allChats[index] = chatData;
  } else {
    allChats.unshift(chatData);
  }

  // Save to localStorage
  localStorage.setItem('allChats', JSON.stringify(allChats));
  localStorage.setItem('currentChatId', currentChatId);
  // Also save current provider/model globally
  localStorage.setItem('selectedProvider', selectedProvider);
  localStorage.setItem('selectedModel', selectedModel);

  renderChatHistory();
}

// Load all chats from localStorage
function loadAllChats() {
  try {
    const saved = localStorage.getItem('allChats');
    allChats = saved ? JSON.parse(saved) : [];
    currentChatId = localStorage.getItem('currentChatId');

    // Restore global provider/model settings
    const savedProvider = localStorage.getItem('selectedProvider');
    const savedModel = localStorage.getItem('selectedModel');
    if (savedProvider && providerModels[savedProvider]) {
      selectedProvider = savedProvider;
      updateProviderUI(savedProvider);
    }
    if (savedModel) {
      selectedModel = savedModel;
      // Find the model label to update UI
      const models = providerModels[selectedProvider] || [];
      const modelInfo = models.find(m => m.value === savedModel);
      if (modelInfo) {
        document.querySelectorAll('.model-selector .model-label').forEach(l => {
          l.textContent = modelInfo.label;
        });
      }
    }

    // If there's a current chat, load it
    if (currentChatId) {
      const chat = allChats.find(c => c.id === currentChatId);
      if (chat) {
        loadChat(chat);
      } else {
        currentChatId = null;
        localStorage.removeItem('currentChatId');
      }
    }
  } catch (err) {
    console.error('Failed to load chats:', err);
    allChats = [];
  }
}

// Update provider UI across all dropdowns
function updateProviderUI(provider) {
  const providerLabel = getProviderLabel(provider);
  document.querySelectorAll('.provider-selector .provider-label').forEach(l => {
    l.textContent = providerLabel;
  });
  document.querySelectorAll('.provider-menu .dropdown-item').forEach(item => {
    const isSelected = item.dataset.value === provider;
    item.classList.toggle('selected', isSelected);
    const checkIcon = item.querySelector('.check-icon');
    if (checkIcon) {
      checkIcon.style.display = isSelected ? 'block' : 'none';
    }
  });

  updateModelDropdowns(provider, selectedModel);
}

// Load a specific chat
function loadChat(chat) {
  currentChatId = chat.id;
  chatTitle.textContent = chat.title;
  isFirstMessage = false;
  todos = chat.todos || [];
  toolCalls = chat.toolCalls || [];

  // Restore provider/model for this chat
  if (chat.provider && providerModels[chat.provider]) {
    selectedProvider = chat.provider;
    updateProviderUI(chat.provider);
  }
  if (chat.model) {
    selectedModel = chat.model;
    const models = providerModels[selectedProvider] || [];
    const modelInfo = models.find(m => m.value === chat.model);
    if (modelInfo) {
      document.querySelectorAll('.model-selector .model-label').forEach(l => {
        l.textContent = modelInfo.label;
      });
      // Update checkmarks in model menu
      document.querySelectorAll('.model-menu .dropdown-item').forEach(item => {
        const isSelected = item.dataset.value === chat.model;
        item.classList.toggle('selected', isSelected);
        const checkIcon = item.querySelector('.check-icon');
        if (checkIcon) {
          checkIcon.style.display = isSelected ? 'block' : 'none';
        }
      });
    }
  }

  // Switch to chat view
  switchToChatView();

  // Restore messages
  chatMessages.innerHTML = '';
  (chat.messages || []).forEach(msgData => {
    const messageDiv = document.createElement('div');
    messageDiv.className = msgData.class;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.dataset.rawContent = msgData.content;

    if (msgData.class.includes('user')) {
      contentDiv.textContent = msgData.content;
    } else if (msgData.class.includes('assistant')) {
      // Restore complete HTML structure including tool calls
      if (msgData.html) {
        contentDiv.innerHTML = msgData.html;
      } else {
        // Fallback for old messages without HTML
        renderMarkdown(contentDiv);
      }
    }

    messageDiv.appendChild(contentDiv);

    if (msgData.class.includes('assistant')) {
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'message-actions';
      actionsDiv.innerHTML = `
        <button class="action-btn" title="Copy" onclick="copyMessage(this)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </button>
      `;
      messageDiv.appendChild(actionsDiv);
    }

    chatMessages.appendChild(messageDiv);
  });

  renderTodos();

  scrollToBottom();
  renderChatHistory();
  localStorage.setItem('currentChatId', currentChatId);
}

// Render chat history sidebar
function renderChatHistory() {
  chatHistoryList.innerHTML = '';

  if (allChats.length === 0) {
    chatHistoryList.innerHTML = '<div class="chat-history-empty">No chats yet</div>';
    return;
  }

  // Sort by updated time (most recent first)
  const sortedChats = [...allChats].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  sortedChats.forEach(chat => {
    const item = document.createElement('div');
    item.className = 'chat-history-item' + (chat.id === currentChatId ? ' active' : '');
    item.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
      <span class="chat-title">${escapeHtml(chat.title || 'New chat')}</span>
      <button class="delete-chat-btn" onclick="deleteChat('${chat.id}', event)" title="Delete">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;
    item.onclick = (e) => {
      if (!e.target.closest('.delete-chat-btn')) {
        switchToChat(chat.id);
      }
    };
    chatHistoryList.appendChild(item);
  });
}

// Switch to a different chat
function switchToChat(chatId) {
  // Abort any ongoing request when switching chats
  if (isWaitingForResponse) {
    window.electronAPI?.abortCurrentRequest?.();
    isWaitingForResponse = false;
  }

  if (currentChatId) {
    saveState();
  }

  const chat = allChats.find(c => c.id === chatId);
  if (chat) {
    loadChat(chat);
  }

  // Update send button states
  updateSendButton(homeInput, homeSendBtn);
  updateSendButton(messageInput, chatSendBtn);
}

// Delete a chat
window.deleteChat = function(chatId, event) {
  event.stopPropagation();

  allChats = allChats.filter(c => c.id !== chatId);
  localStorage.setItem('allChats', JSON.stringify(allChats));

  if (currentChatId === chatId) {
    // If deleting current chat, go to home or load another chat
    if (allChats.length > 0) {
      loadChat(allChats[0]);
    } else {
      currentChatId = null;
      localStorage.removeItem('currentChatId');
      homeView.classList.remove('hidden');
      chatView.classList.add('hidden');
      isFirstMessage = true;
    }
  }

  renderChatHistory();
}

// Update greeting based on time of day
function updateGreeting() {
  // Greeting is now static, no need to update
}

function toggleRightSidebar() {
  const rightSidebar = document.getElementById('rightSidebar');
  const rightSidebarExpand = document.getElementById('rightSidebarExpand');
  if (!rightSidebar || !rightSidebarExpand) return;

  const isCollapsed = rightSidebar.classList.toggle('collapsed');
  rightSidebarExpand.classList.toggle('hidden', !isCollapsed);
  rightSidebarExpand.classList.toggle('visible', isCollapsed);

  localStorage.setItem('rightSidebarCollapsed', isCollapsed ? 'true' : 'false');
}
window.toggleRightSidebar = toggleRightSidebar;

// Setup all event listeners
function setupEventListeners() {
  // Home form
  homeForm.addEventListener('submit', handleSendMessage);
  homeInput.addEventListener('input', () => {
    updateSendButton(homeInput, homeSendBtn);
    autoResizeTextarea(homeInput);
  });
  homeInput.addEventListener('keydown', (e) => handleKeyPress(e, homeForm));

  // Chat form
  chatForm.addEventListener('submit', handleSendMessage);
  messageInput.addEventListener('input', () => {
    updateSendButton(messageInput, chatSendBtn);
    autoResizeTextarea(messageInput);
  });
  messageInput.addEventListener('keydown', (e) => handleKeyPress(e, chatForm));

  // Right sidebar toggle
  rightSidebarToggle?.addEventListener('click', toggleRightSidebar);
  rightSidebarExpand?.addEventListener('click', toggleRightSidebar);

  const openGuideBtn = document.getElementById('openGuideBtn');
  openGuideBtn?.addEventListener('click', () => window.openFullGuide?.());

  // Left sidebar toggle (chat history)
  leftSidebarToggle.addEventListener('click', toggleLeftSidebar);
  leftSidebarExpand.addEventListener('click', toggleLeftSidebar);

  // File attachment buttons
  const homeAttachBtn = document.getElementById('homeAttachBtn');
  const chatAttachBtn = document.getElementById('chatAttachBtn');
  const homeFileInput = document.getElementById('homeFileInput');
  const chatFileInput = document.getElementById('chatFileInput');

  homeAttachBtn.addEventListener('click', () => homeFileInput.click());
  chatAttachBtn.addEventListener('click', () => chatFileInput.click());
  homeFileInput.addEventListener('change', (e) => handleFileSelect(e, 'home'));
  chatFileInput.addEventListener('change', (e) => handleFileSelect(e, 'chat'));

  // Setup dropdowns
  setupDropdowns();

  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown-container')) {
      document.querySelectorAll('.dropdown-container.open').forEach((d) => d.classList.remove('open'));
    }
  });

  // Rename chat title
  const chatTitleBtn = document.getElementById('chatTitleBtn');
  chatTitleBtn?.addEventListener('click', renameCurrentChat);

  // Settings modal
  bindSettingsModalEvents();

  // Connector actions
  const connectorFooter = document.querySelector('.connector-footer');
  connectorFooter?.addEventListener('click', openConnectorsHub);

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSettings();
    }
  });
}

function renameCurrentChat() {
  if (!currentChatId) return;
  const nextTitle = window.prompt('Rename chat', chatTitle.textContent || 'New chat');
  if (!nextTitle) return;
  const trimmed = nextTitle.trim();
  if (!trimmed) return;
  chatTitle.textContent = trimmed;
  saveState();
  renderChatHistory();
}

function bindSettingsModalEvents() {
  const closeBtn = document.getElementById('settingsCloseBtn');
  const backdrop = document.getElementById('settingsBackdrop');
  const saveBtn = document.getElementById('settingsSaveBtn');
  const resetBtn = document.getElementById('settingsResetBtn');
  const clearChatsBtn = document.getElementById('settingsClearChatsBtn');
  const providerSelect = document.getElementById('settingsProvider');

  closeBtn?.addEventListener('click', closeSettings);
  backdrop?.addEventListener('click', closeSettings);
  saveBtn?.addEventListener('click', handleSaveSettings);
  resetBtn?.addEventListener('click', resetSettings);
  clearChatsBtn?.addEventListener('click', clearAllChats);

  providerSelect?.addEventListener('change', () => {
    updateSettingsModelOptions(providerSelect.value);
  });
}

function setSettingsStatus(text, isError = false) {
  const status = document.getElementById('settingsStatus');
  if (!status) return;
  status.textContent = text || '';
  status.style.color = isError ? '#fca5a5' : 'var(--text-secondary)';
}

function populateSettingsForm() {
  const defaultTab = document.getElementById('settingsDefaultTab');
  const provider = document.getElementById('settingsProvider');
  const model = document.getElementById('settingsModel');
  const thinking = document.getElementById('settingsThinkingDefault');
  const collapseLeft = document.getElementById('settingsCollapseLeft');
  const collapseRight = document.getElementById('settingsCollapseRight');

  if (!defaultTab || !provider || !model || !thinking || !collapseLeft || !collapseRight) {
    return;
  }

  const providers = availableProviders.length > 0 ? availableProviders : Object.keys(providerModels);
  provider.innerHTML = providers
    .map((value) => `<option value="${value}">${getProviderLabel(value)}</option>`)
    .join('');

  defaultTab.value = appSettings.defaultTab || 'cowork';
  provider.value = providers.includes(appSettings.provider) ? appSettings.provider : providers[0];
  thinking.checked = appSettings.thinkingMode === 'extended';
  collapseLeft.checked = Boolean(appSettings.collapseLeftOnStartup);
  collapseRight.checked = Boolean(appSettings.collapseRightOnStartup);

  updateSettingsModelOptions(provider.value, appSettings.model);
}

function updateSettingsModelOptions(provider, preferred = null) {
  const modelSelect = document.getElementById('settingsModel');
  if (!modelSelect) return;

  const models = providerModels[provider] || providerModels.opencode || [];
  modelSelect.innerHTML = models
    .map((item) => `<option value="${item.value}">${item.label}</option>`)
    .join('');

  const hasPreferred = preferred && models.some((item) => item.value === preferred);
  if (hasPreferred) {
    modelSelect.value = preferred;
  } else if (models.length > 0) {
    modelSelect.value = models.find((item) => item.default)?.value || models[0].value;
  }
}

function handleSaveSettings() {
  const defaultTab = document.getElementById('settingsDefaultTab');
  const provider = document.getElementById('settingsProvider');
  const model = document.getElementById('settingsModel');
  const thinking = document.getElementById('settingsThinkingDefault');
  const collapseLeft = document.getElementById('settingsCollapseLeft');
  const collapseRight = document.getElementById('settingsCollapseRight');

  if (!defaultTab || !provider || !model || !thinking || !collapseLeft || !collapseRight) {
    return;
  }

  appSettings = {
    ...appSettings,
    defaultTab: defaultTab.value,
    provider: provider.value,
    model: model.value,
    thinkingMode: thinking.checked ? 'extended' : 'normal',
    collapseLeftOnStartup: collapseLeft.checked,
    collapseRightOnStartup: collapseRight.checked,
  };

  selectedProvider = appSettings.provider;
  selectedModel = appSettings.model;
  thinkingMode = appSettings.thinkingMode;

  saveAppSettings();
  updateProviderUI(selectedProvider);
  updateModelDropdowns(selectedProvider, selectedModel);
  setWorkspaceMode(appSettings.defaultTab);

  document.querySelectorAll('.thinking-btn').forEach((btn) => {
    btn.classList.toggle('active', thinkingMode === 'extended');
  });

  if (appSettings.collapseLeftOnStartup && !leftSidebar.classList.contains('collapsed')) {
    toggleLeftSidebar();
  }
  if (!appSettings.collapseLeftOnStartup && leftSidebar.classList.contains('collapsed')) {
    toggleLeftSidebar();
  }
  if (appSettings.collapseRightOnStartup && !sidebar.classList.contains('collapsed')) {
    toggleSidebar();
  }
  if (!appSettings.collapseRightOnStartup && sidebar.classList.contains('collapsed')) {
    toggleSidebar();
  }

  localStorage.setItem('selectedProvider', selectedProvider);
  localStorage.setItem('selectedModel', selectedModel);
  setSettingsStatus('Settings saved.');
}

function resetSettings() {
  appSettings = { ...DEFAULT_SETTINGS };
  saveAppSettings();
  populateSettingsForm();
  applySettingsToUi();
  setSettingsStatus('Settings reset to defaults.');
}

function clearAllChats() {
  const shouldClear = window.confirm('Clear all saved chats? This cannot be undone.');
  if (!shouldClear) return;

  allChats = [];
  currentChatId = null;
  localStorage.removeItem('allChats');
  localStorage.removeItem('currentChatId');

  chatMessages.innerHTML = '';
  chatTitle.textContent = 'New chat';
  isFirstMessage = true;
  todos = [];
  toolCalls = [];
  attachedFiles = [];

  stepsList.innerHTML = '';
  emptySteps.style.display = 'block';
  stepsCount.textContent = '0 steps';
  toolCallsList.innerHTML = '';
  emptyTools.style.display = 'block';

  homeView.classList.remove('hidden');
  chatView.classList.add('hidden');
  window.closeGuide?.();
  renderChatHistory();
  clearAttachedFiles();
  setSettingsStatus('All chats cleared.');
}

window.openSettings = function() {
  populateSettingsForm();
  setSettingsStatus('');
  const modal = document.getElementById('settingsModal');
  if (!modal) return;
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
};

window.closeSettings = function() {
  const modal = document.getElementById('settingsModal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
};

function closeSettings() {
  window.closeSettings();
}

function openConnector(name) {
  const links = {
    linear: 'https://linear.app/integrations',
  };
  const key = String(name || '').toLowerCase();
  if (links[key]) {
    window.open(links[key], '_blank');
    return;
  }
  window.alert(`No connector URL is configured for "${name}" yet.`);
}

function openConnectorsHub() {
  window.open('https://platform.composio.dev', '_blank');
}

window.openConnector = openConnector;
window.openConnectorsHub = openConnectorsHub;

window.openFullGuide = async function() {
  document.getElementById('homeView').classList.add('hidden');
  document.getElementById('chatView').classList.add('hidden');
  const guideView = document.getElementById('guideView');
  if (guideView) guideView.classList.remove('hidden');

  const contentDiv = document.getElementById('guidePageContent');
  if (contentDiv) {
    const markdownText = `
# Lux CoWork - Ultimate Instructions and Use Cases Desk

Welcome to **Lux CoWork**, the conversational intelligence and execution engine built to unify your developer and content workflows. Lux CoWork interfaces with local AI providers (via Opencode on port \`4096\`) and acts as the central command node for **Lux Manus**, **Hermes**, and **Lux Claude Code**.

---

## 📖 Operational Instructions & Modes

Lux CoWork adapts to your workflow with three integrated task modes, toggleable at the top of your left sidebar:

| Mode | Core Focus | Target Model | Recommended Activity |
| :--- | :--- | :--- | :--- |
| **Chat** | Conversational Ideation | \`opencode/big-pickle\` | Brainstorming, drafting scripts, outline generation |
| **Cowork** | General Task Execution | \`anthropic/claude-sonnet-4-5-20250929\` | Local toolchains, automation setups, full-workspace operations |
| **Code** | Technical Implementation | \`opencode/grok-code\` | Script refactoring, debugging, file operations, web scrapers |

---

## ⚡ 50 Masterclass Use Cases

### 💻 Category 1: Software Engineering & Coding
1. **Scaffold a Node.js Express App**: Ask Grok Code to instantly scaffold a clean directory tree with routing and controllers for a new project.
2. **CSS Glassmorphism Generation**: Design glowing neon visual layers for web assets with absolute code precision.
3. **Regex Pattern Synthesizer**: Create advanced regular expressions for validating multi-tier metadata filters.
4. **Git Workflow Autopilot**: Auto-generate beautiful, detailed commit logs based on recent code modifications.
5. **JSON Schema Validator**: Output flawless validator objects to enforce structural safety in API routes.
6. **SQL Query Optimizer**: Transform sluggish nested database queries into lightning-fast indexed queries.
7. **Python Scraper Architect**: Develop resilient Beautiful Soup scripts with custom retry intervals and user-agent rotating arrays.
8. **Unit Test Coverage Suite**: Generate robust Jest or Mocha test suites asserting edge-case inputs for complex math models.
9. **API Mock Endpoint Setup**: Fast-track testing by generating mock JSON payloads simulating third-party integration statuses.
10. **Refactor Legacy Code**: Translate old, repetitive ES5 codebases into slick, modular ESNext structure.

---

### 🎥 Category 2: Content Creation & YouTube Automation (Lux Tube Hub)
11. **YouTube Shorts Concept Hook Builder**: Draft 20 psychological curiosity-gap Hooks tailored to viral tech topics.
12. **High-CTR Title Synthesis**: Blend trending keywords into 15 compelling title variations.
13. **Short-Form Video Scripting**: Script 60-second high-energy audio lines with precise, timestamped visual slide prompts.
14. **Optimized SEO Meta Generator**: Compile complete, description-ready YouTube upload metadata blocks containing targeted hashtags.
15. **Channel Persona Definition**: Create custom persona voices to guide follow-up comment interactions.
16. **Voiceover Script Pacing Optimization**: Re-sentence complex narratives into readable 120-word-per-minute voice prompts.
17. **Community Engagement Planner**: Create poll ideas and pinned comment threads to boost YouTube comment-section retention.
18. **B-Roll Selection Guide**: List vivid, search-friendly stock-footage search descriptions for video editors.
19. **Content Competitor Auditor**: Outline video trends from competitor transcripts to find high-performing content patterns.
20. **Visual Moodboard Prompting**: Synthesize descriptive Midjourney prompts to build stunning custom video thumbnail designs.

---

### 📊 Category 3: Data Analytics & Research
21. **CSV Log Analyzer**: Feed raw client performance metrics to extract high-leverage outliers and convert them into Markdown tables.
22. **Productivity Metric Tracking**: Summarize task duration logs into organized weekly progress grids.
23. **Trend Sentiment Evaluator**: Analyze feedback collections to categorize user satisfaction indexes from 1 to 5.
24. **Local Directory Storage Sweep**: Scan folder directories to list files over 100MB and organize cleanups.
25. **Comparative Feature Breakdown**: Construct side-by-side matrices comparing rival AI service provider capabilities.
26. **Market Persona Profiler**: Generate 3 detailed ideal-user profiles mapping needs, pains, and favorite platforms.
27. **Pricing Tier Structuring**: Devise optimized subscription packages with custom feature access gating logic.
28. **Scientific Term Simplifier**: Translate complex scientific reports into clear, digestible, one-paragraph customer newsletters.
29. **Statistical Projection Modeling**: Format raw numbers into structured forecast data objects ready for spreadsheet plotting.
30. **Bibliography & Citation Generator**: Convert academic links into clean APA or MLA formatted reference sections.

---

### 💼 Category 4: Workspace Productivity & Automation (Connected with Hermes)
31. **Hermes Cron Trigger Configurator**: Design precise prompt triggers to fetch and mail news summaries daily.
32. **Linear Project Issue Scaffolder**: Create formatted issue templates detailing task requirements, bugs, and target dates.
33. **Email Draft Synthesizer**: Compose warm outreach pitches with custom dynamic merge tags for fast client scaling.
34. **Interactive Meeting Agenda Builder**: Produce itemized calendar summaries with precise time allocations and action goals.
35. **Customer Refund Reply Auto-draft**: Write soft-tempered, professional responses to refund requests maintaining customer satisfaction.
36. **Knowledge Base Documentation**: Draft modular FAQ pages answering complex installation issues in standard markdown.
37. **Standard Operating Procedure (SOP)**: Outline step-by-step guidelines for deploying new updates to production targets.
38. **Weekly Retrospective Architect**: Standardize team reviews covering what went well, bottlenecks, and action items.
39. **Pitch Deck Text Outlining**: Construct 10 high-impact slides pacing investor pitches from problem identification to revenue.
40. **Affiliate Partnership Proposal**: Script strategic outreach requests highlighting win-win metrics for potential brand affiliates.

---

### 🖥️ Category 5: System Administration & Ops
41. **Docker Container Configuration**: Generate bulletproof Dockerfiles optimized for multi-stage caching and small footprint sizes.
42. **Nginx Reverse Proxy Blocks**: Configure secure server blocks with proper SSL pathways and header sets.
43. **Bash Automation Utility**: Write lightweight, robust bash scripts to zip and backup critical documents every midnight.
44. **Node Dependency Audit Analyzer**: Decode yarn or npm audit lists to prioritize critical security package upgrades.
45. **Cron Job Schedule Planner**: Design crontab patterns to cleanly run cleanups without system overlaps.
46. **Local Network Port Scanner Script**: Code portable, safe python scripts to find available local development ports.
47. **Log File Parsing Routine**: Filter system error files to extract unique error traces matching timestamp blocks.
48. **Environment Variable Template Builder**: Scaffold pristine \`.env.example\` structures with safety directions for developers.
49. **Secure SSH Key Guide**: Write clear CLI steps to generate, register, and secure fresh terminal SSH profiles.
50. **Hardware Resource Profiler**: Output automated terminal scripts to check system CPU, RAM, and thermals.

---

## 🛠️ Official Claude Cowork Prompt Templates & Workflows

Below are premium copy-paste prompt templates directly imported from the **claude-cowork-guide** library.

### 1. Organize Workspace Downloads
\`\`\`
Organize all files in my ~/Downloads by type.
Create folders: Documents, Images, Spreadsheets, Archives, Code, Other.
Move files (don't copy). Save a summary report to ~/Desktop/organization-summary.txt
\`\`\`

### 2. Receipt to Excel Extraction
\`\`\`
Extract expense data from receipt images in ~/Desktop/receipts/
Create an Excel file with columns: Date, Vendor, Amount, Category, Notes.
Add a summary sheet with totals by category.
Save to ~/Desktop/expenses.xlsx
\`\`\`

### 3. Competitor Tool Research
\`\`\`
Research the top 5 AI coding tools.
Create a comparison table with: Name, Website, Key Features, Pricing, Pros, Cons.
Include a recommendation section.
Save to ~/Desktop/AI-tools-research.md
\`\`\`

### 4. Client Briefing Generation
\`\`\`
Task: Create a client briefing document
Input: Search the web for recent news about Acme Corp.
Output: ~/Desktop/acme-briefing.docx

Format:
- Company Overview (1 page)
- Key Contacts with titles
- Recent News (last 3 months)
- Talking Points (5-7 bullets)
- Questions to Ask (5-7 questions)

Constraints: Professional tone, Maximum 5 pages, Include date prepared in header
\`\`\`
    `;
    contentDiv.innerHTML = marked.parse(markdownText);
  }
}

window.closeGuide = function() {
  const guideView = document.getElementById('guideView');
  if (guideView) guideView.classList.add('hidden');
  
  if (currentChatId) {
    document.getElementById('chatView').classList.remove('hidden');
  } else {
    document.getElementById('homeView').classList.remove('hidden');
  }
}

// Setup dropdown functionality
function setupDropdowns() {
  // Thinking mode toggle buttons
  ['homeThinkingBtn', 'chatThinkingBtn'].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      thinkingMode = thinkingMode === 'normal' ? 'extended' : 'normal';

      // Update all thinking buttons
      document.querySelectorAll('.thinking-btn').forEach(b => {
        b.classList.toggle('active', thinkingMode === 'extended');
    });
  });

  ['homeProviderDropdown', 'chatProviderDropdown'].forEach(id => {
    const dropdown = document.getElementById(id);
    if (!dropdown) return;

    const btn = dropdown.querySelector('.provider-selector');
    const menu = dropdown.querySelector('.provider-menu');

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeOtherDropdowns(dropdown);
      dropdown.classList.toggle('open');
    });

    menu?.addEventListener('click', (event) => {
      const item = event.target.closest('.dropdown-item');
      if (!item) return;

        const value = item.dataset.value;
        if (!value) return;

        const labelNode = item.querySelector('.item-label');
        const label = labelNode ? labelNode.textContent : getProviderLabel(value);
        selectedProvider = value;

        // Update all provider selectors
        document.querySelectorAll('.provider-selector .provider-label').forEach(l => {
          l.textContent = label;
        });

        // Update selected state and checkmarks for provider dropdowns
        document.querySelectorAll('.provider-menu .dropdown-item').forEach(i => {
          const isSelected = i.dataset.value === value;
          i.classList.toggle('selected', isSelected);

          // Update checkmark visibility
          let checkIcon = i.querySelector('.check-icon');
          if (isSelected && !checkIcon) {
            // Add checkmark if selected and doesn't have one
            const itemRow = i.querySelector('.item-row');
            if (itemRow) {
              checkIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
              checkIcon.setAttribute('class', 'check-icon');
              checkIcon.setAttribute('viewBox', '0 0 24 24');
              checkIcon.setAttribute('fill', 'none');
              checkIcon.setAttribute('stroke', 'currentColor');
              checkIcon.setAttribute('stroke-width', '2');
              checkIcon.innerHTML = '<polyline points="20 6 9 17 4 12"></polyline>';
              itemRow.appendChild(checkIcon);
            }
          }
          if (checkIcon) {
            checkIcon.style.display = isSelected ? 'block' : 'none';
          }
        });

        // Update model dropdown for new provider
        updateModelDropdowns(value);
        populateSettingsForm();

        // Save to localStorage immediately
        localStorage.setItem('selectedProvider', value);
        localStorage.setItem('selectedModel', selectedModel);

        dropdown.classList.remove('open');
      });
    });
  });

  // Model selector dropdowns
  ['homeModelDropdown', 'chatModelDropdown'].forEach(id => {
    const dropdown = document.getElementById(id);
    if (!dropdown) return;

    const btn = dropdown.querySelector('.model-selector');

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeOtherDropdowns(dropdown);
      dropdown.classList.toggle('open');
    });

    // Event delegation for model items (since they're dynamically updated)
    dropdown.querySelector('.model-menu').addEventListener('click', (e) => {
      const item = e.target.closest('.dropdown-item');
      if (!item) return;

      const value = item.dataset.value;
      if (!value) return;

      const labelNode = item.querySelector('.item-label');
      const label = labelNode ? labelNode.textContent : value;
      selectedModel = value;

      // Update all model selectors
      document.querySelectorAll('.model-selector .model-label').forEach(l => {
        l.textContent = label;
      });

      // Update selected state and checkmarks
      document.querySelectorAll('.model-menu .dropdown-item').forEach(i => {
        const isSelected = i.dataset.value === value;
        i.classList.toggle('selected', isSelected);

        // Update checkmark visibility
        const checkIcon = i.querySelector('.check-icon');
        if (checkIcon) {
          checkIcon.style.display = isSelected ? 'block' : 'none';
        }
      });

      // Save to localStorage immediately
      localStorage.setItem('selectedModel', value);

      dropdown.classList.remove('open');
    });
  });
}

// Update model dropdowns based on selected provider
function updateModelDropdowns(provider, preferredModel = null) {
  const models = providerModels[provider] || providerModels.opencode;
  if (!Array.isArray(models) || models.length === 0) return;

  const preferred = preferredModel && models.find((model) => model.value === preferredModel);
  const defaultModel = preferred || models.find((model) => model.default) || models[0];
  selectedModel = defaultModel.value;

  localStorage.setItem('selectedModel', selectedModel);

  const modelItemsHtml = models.map((model) => {
    const isSelected = model.value === selectedModel;
    return `
      <div class="dropdown-item${isSelected ? ' selected' : ''}" data-value="${model.value}">
        <div class="item-row">
          <span class="item-label">${model.label}</span>
          ${isSelected ? `<svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>` : ''}
        </div>
        <span class="item-desc">${model.desc || ''}</span>
      </div>
    `;
  }).join('');

  document.querySelectorAll('.model-menu').forEach((menu) => {
    menu.innerHTML = modelItemsHtml;
    menu.dataset.provider = provider;
  });

  document.querySelectorAll('.model-selector .model-label').forEach((label) => {
    label.textContent = defaultModel.label;
  });
}

// Close other dropdowns
function closeOtherDropdowns(currentDropdown) {
  document.querySelectorAll('.dropdown-container.open').forEach(d => {
    if (d !== currentDropdown) d.classList.remove('open');
  });
}

// Handle file selection
function handleFileSelect(event, context) {
  const files = Array.from(event.target.files);
  files.forEach(file => {
    if (attachedFiles.length >= 5) {
      alert('Maximum 5 files allowed');
      return;
    }

    // Read file as base64 for images or text
    const reader = new FileReader();
    reader.onload = (e) => {
      attachedFiles.push({
        name: file.name,
        type: file.type,
        size: file.size,
        data: e.target.result
      });
      renderAttachedFiles(context);
    };

    if (file.type.startsWith('image/')) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  });

  // Reset input
  event.target.value = '';
}

// Render attached files preview
function renderAttachedFiles(context) {
  const inputWrapper = context === 'home'
    ? document.querySelector('#homeForm .input-wrapper')
    : document.querySelector('#chatForm .input-wrapper');

  let filesContainer = inputWrapper.querySelector('.attached-files');
  if (!filesContainer) {
    filesContainer = document.createElement('div');
    filesContainer.className = 'attached-files';
    inputWrapper.insertBefore(filesContainer, inputWrapper.firstChild);
  }

  filesContainer.innerHTML = attachedFiles.map((file, index) => `
    <div class="attached-file">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
      </svg>
      <span>${file.name}</span>
      <svg class="remove-file" onclick="removeAttachedFile(${index}, '${context}')" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </div>
  `).join('');

  if (attachedFiles.length === 0) {
    filesContainer.remove();
  }
}

// Remove attached file
window.removeAttachedFile = function(index, context) {
  attachedFiles.splice(index, 1);
  renderAttachedFiles(context);
}

// Toggle sidebar (right sidebar)
function toggleSidebar() {
  if (typeof toggleRightSidebar === 'function') {
    toggleRightSidebar();
  }
}

// Toggle left sidebar (chat history)
function toggleLeftSidebar() {
  leftSidebar.classList.toggle('collapsed');
  const isCollapsed = leftSidebar.classList.contains('collapsed');

  leftSidebarExpand.classList.toggle('visible', isCollapsed);

  // Update toggle button icon direction
  const icon = leftSidebarToggle.querySelector('svg');
  if (isCollapsed) {
    icon.innerHTML = '<polyline points="9 18 15 12 9 6"></polyline>';
    leftSidebarToggle.title = 'Expand sidebar';
  } else {
    icon.innerHTML = '<polyline points="15 18 9 12 15 6"></polyline>';
    leftSidebarToggle.title = 'Collapse sidebar';
  }
}

// Update send button state
function updateSendButton(input, button) {
  if (isWaitingForResponse) {
    // In streaming mode - show stop icon and enable button
    button.disabled = false;
    button.classList.add('streaming');
    const sendIcon = button.querySelector('.send-icon');
    const stopIcon = button.querySelector('.stop-icon');
    if (sendIcon) sendIcon.classList.add('hidden');
    if (stopIcon) stopIcon.classList.remove('hidden');
  } else {
    // Normal mode - show send icon
    button.disabled = !input.value.trim();
    button.classList.remove('streaming');
    const sendIcon = button.querySelector('.send-icon');
    const stopIcon = button.querySelector('.stop-icon');
    if (sendIcon) sendIcon.classList.remove('hidden');
    if (stopIcon) stopIcon.classList.add('hidden');
  }
}

// Stop the current streaming query
async function stopCurrentQuery() {
  if (!isWaitingForResponse || !currentChatId) return;

  console.log('[Chat] Stopping query for chatId:', currentChatId);

  // Abort the client-side fetch
  window.electronAPI?.abortCurrentRequest?.();

  // Tell the backend to stop processing
  if (window.electronAPI?.stopQuery) {
    await window.electronAPI.stopQuery(currentChatId, selectedProvider);
  }

  // Reset state
  isWaitingForResponse = false;
  updateSendButton(messageInput, chatSendBtn);
  updateSendButton(homeInput, homeSendBtn);

  // Remove loading indicator from last assistant message
  const lastMessage = chatMessages.lastElementChild;
  if (lastMessage && lastMessage.classList.contains('assistant')) {
    const loadingIndicator = lastMessage.querySelector('.loading-indicator');
    if (loadingIndicator) loadingIndicator.remove();

    // Add a note that the response was stopped
    const contentDiv = lastMessage.querySelector('.message-content');
    if (contentDiv) {
      const stoppedNote = document.createElement('p');
      stoppedNote.style.color = '#888';
      stoppedNote.style.fontStyle = 'italic';
      stoppedNote.textContent = '[Response stopped]';
      contentDiv.appendChild(stoppedNote);
    }
  }

  saveState();
}

// Handle key press
function handleKeyPress(e, form) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    form.dispatchEvent(new Event('submit'));
  }
}


function autoResizeTextarea(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
}

// Reset textarea height after sending
function resetTextareaHeight(textarea) {
  textarea.style.height = 'auto';
}

function summarizeAttachment(file) {
  const sizeKb = typeof file.size === 'number' ? Math.round(file.size / 1024) : 0;
  if (file.type && file.type.startsWith('image/')) {
    return `- ${file.name} (${sizeKb} KB, image file)`;
  }
  let snippet = '';
  if (typeof file.data === 'string') {
    snippet = file.data.slice(0, 1200).replace(/\s+/g, ' ').trim();
  }
  return `- ${file.name} (${sizeKb} KB)${snippet ? `\n  Preview: ${snippet}` : ''}`;
}

function buildPromptWithAttachments(message, files) {
  if (!Array.isArray(files) || files.length === 0) return message;
  const list = files.map(summarizeAttachment).join('\n');
  return `${message}\n\nAttached files:\n${list}`;
}

function clearAttachedFiles() {
  attachedFiles = [];
  ['home', 'chat'].forEach((context) => {
    try {
      renderAttachedFiles(context);
    } catch (error) {
      // Ignore stale wrapper states when switching views.
    }
  });
}

// Switch to chat view
function switchToChatView() {
  homeView.classList.add('hidden');
  chatView.classList.remove('hidden');
  messageInput.focus();
}

// Handle form submission
async function handleSendMessage(e) {
  e.preventDefault();

  // If currently streaming, stop the query instead
  if (isWaitingForResponse) {
    await stopCurrentQuery();
    return;
  }

  const input = isFirstMessage ? homeInput : messageInput;
  const message = input.value.trim();

  if (!message) {
    return;
  }

  if (isFirstMessage) {
    // Always generate a new ID for a new conversation
    currentChatId = generateId();
    switchToChatView();
    isFirstMessage = false;
    chatTitle.textContent = message.length > 30 ? message.substring(0, 30) + '...' : message;
  } else if (!currentChatId) {
    currentChatId = generateId();
    chatTitle.textContent = message.length > 30 ? message.substring(0, 30) + '...' : message;
  }

  const filesForMessage = attachedFiles.map((file) => ({ ...file }));
  const promptToSend = buildPromptWithAttachments(message, filesForMessage);

  // Add user message
  addUserMessage(message, filesForMessage);
  clearAttachedFiles();

  input.value = '';
  resetTextareaHeight(input);

  // Set loading state
  isWaitingForResponse = true;

  // Update buttons to show stop icon
  updateSendButton(homeInput, homeSendBtn);
  updateSendButton(messageInput, chatSendBtn);

  // Create assistant message with loading state
  const assistantMessage = createAssistantMessage();
  const contentDiv = assistantMessage.querySelector('.message-content');

  // Declare heartbeatChecker outside try block so it's accessible in finally
  let heartbeatChecker = null;

  try {
    console.log('[Chat] Sending message to API...');
    // Pass chatId, provider, and model for session management
    if (!window.electronAPI?.sendMessage) {
      throw new Error('Electron bridge is unavailable. Restart Lux CoWork and backend server.');
    }
    const response = await window.electronAPI.sendMessage(promptToSend, currentChatId, selectedProvider, selectedModel);
    console.log('[Chat] Response received');

    const reader = await response.getReader();
    let buffer = '';
    let hasContent = false;
    let receivedStreamingText = false;
    const pendingToolCalls = new Map();

    let lastHeartbeat = Date.now();
    const heartbeatTimeout = 300000;
    let connectionLost = false;

    heartbeatChecker = setInterval(() => {
      const timeSinceLastHeartbeat = Date.now() - lastHeartbeat;
      if (timeSinceLastHeartbeat > heartbeatTimeout) {
        console.warn('[Chat] No data received for 5 minutes - connection may be lost');
      }
    }, 30000); 

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log('[Chat] Stream complete');
          clearInterval(heartbeatChecker);
          const loadingIndicator = contentDiv.querySelector('.loading-indicator');
          if (loadingIndicator && hasContent) {
            loadingIndicator.remove();
          }
          const actionsDiv = assistantMessage.querySelector('.message-actions');
          if (actionsDiv) {
            actionsDiv.classList.remove('hidden');
          }
          for (const [apiId, localId] of pendingToolCalls) {
            updateToolCallStatus(localId, 'success');
          }
          break;
        }

        lastHeartbeat = Date.now();

        buffer += value;
        const lines = buffer.split('\n');
        buffer = lines[lines.length - 1];

        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i];

          // Detect heartbeat comments from server
          if (line.startsWith(':')) {
            continue; // Skip SSE comments (heartbeats)
          }

          if (line.startsWith('data: ')) {
          try {
            const jsonStr = line.slice(6);
            const data = JSON.parse(jsonStr);

            // Debug: log all received events
            console.log('[Frontend] Received event:', data.type, data.name || '');

            if (data.type === 'done') {
              break;
            } else if (data.type === 'text' && data.content) {
              if (!hasContent) {
                const loadingIndicator = contentDiv.querySelector('.loading-indicator');
                if (loadingIndicator) loadingIndicator.remove();
              }
              hasContent = true;
              receivedStreamingText = true;
              if (data.isReasoning) {
                appendToThinking(contentDiv, data.content);
              } else {
                appendToContent(contentDiv, data.content);
              }
            } else if (data.type === 'tool_use') {
              const toolName = data.name || data.tool || 'Tool';
              const toolInput = data.input || {};
              const apiId = data.id; // API's tool ID
              const toolCall = addToolCall(toolName, toolInput, 'running');
              addInlineToolCall(contentDiv, toolName, toolInput, toolCall.id);
              if (apiId) {
                pendingToolCalls.set(apiId, toolCall.id);
              }

              if (toolName === 'TodoWrite' && toolInput.todos) {
                updateTodos(toolInput.todos);
              }

              hasContent = true;
            } else if (data.type === 'tool_result' || data.type === 'result') {
              const result = data.result || data.content || data;
              const apiId = data.tool_use_id;

              // Find the matching tool call by API ID
              const localId = apiId ? pendingToolCalls.get(apiId) : null;
              if (localId) {
                updateToolCallResult(localId, result);
                updateToolCallStatus(localId, 'success');
                updateInlineToolResult(localId, result);
                pendingToolCalls.delete(apiId);
              }

              if (!hasContent) {
                const loadingIndicator = contentDiv.querySelector('.loading-indicator');
                if (loadingIndicator) loadingIndicator.remove();
              }
              hasContent = true;
            } else if (data.type === 'assistant' && data.message) {
              if (data.message.content && Array.isArray(data.message.content)) {
                for (const block of data.message.content) {
                  if (block.type === 'tool_use') {
                    const toolName = block.name || 'Tool';
                    const toolInput = block.input || {};
                    const apiId = block.id; // API's tool ID
                    const toolCall = addToolCall(toolName, toolInput, 'running');
                    addInlineToolCall(contentDiv, toolName, toolInput, toolCall.id);
                    if (apiId) {
                      pendingToolCalls.set(apiId, toolCall.id);
                    }
                    hasContent = true;
                  } else if (block.type === 'text' && block.text) {
                    if (!receivedStreamingText) {
                      if (!hasContent) {
                        const loadingIndicator = contentDiv.querySelector('.loading-indicator');
                        if (loadingIndicator) loadingIndicator.remove();
                      }
                      hasContent = true;
                      appendToContent(contentDiv, block.text);
                    }
                  }
                }
              }

              if (data.message.content && Array.isArray(data.message.content)) {
                for (const block of data.message.content) {
                  if (block.type === 'tool_use' && block.name === 'TodoWrite') {
                    updateTodos(block.input.todos);
                  }
                }
              }
            }

            scrollToBottom();
          } catch (parseError) {
            // Silent fail on parse errors
          }
        }
      }
      }
    } catch (readerError) {
      console.error('[Chat] Reader error:', readerError);
      clearInterval(heartbeatChecker);
      throw readerError; // Re-throw to outer catch
    }
  } catch (error) {
    clearInterval(heartbeatChecker);

    // Don't show error for aborted requests (user clicked stop or switched chats)
    if (error?.name === 'AbortError' || error?.message?.includes('aborted') || error?.message?.includes('abort')) {
      console.log('[Chat] Request was aborted');
      return;
    }

    // Skip showing error if message is undefined or empty (likely an abort)
    if (!error?.message) {
      console.log('[Chat] Request ended without error message (likely aborted)');
      return;
    }

    console.error('[Chat] Error sending message:', error);
    const loadingIndicator = contentDiv.querySelector('.loading-indicator');
    if (loadingIndicator) loadingIndicator.remove();

    const paragraph = document.createElement('p');
    paragraph.textContent = `Error: ${error.message}`;
    paragraph.style.color = '#c0392b';
    contentDiv.appendChild(paragraph);
  } finally {
    if (heartbeatChecker) {
      clearInterval(heartbeatChecker);
    }
    isWaitingForResponse = false;
    saveState();
    updateSendButton(messageInput, chatSendBtn);
    updateSendButton(homeInput, homeSendBtn);
    messageInput.focus();
  }
}

// Add user message to chat
function addUserMessage(text, files = []) {
  // Handle browser transition before adding message
  handleBrowserTransitionOnMessage();

  const messageDiv = document.createElement('div');
  messageDiv.className = 'message user';

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  const attachmentNote = Array.isArray(files) && files.length > 0
    ? `\n\nAttached: ${files.map((file) => file.name).join(', ')}`
    : '';
  const renderedText = `${text}${attachmentNote}`;
  contentDiv.textContent = renderedText;
  contentDiv.dataset.rawContent = renderedText;

  messageDiv.appendChild(contentDiv);
  chatMessages.appendChild(messageDiv);
  scrollToBottom();
  saveState();
}

// Create assistant message with loading state
function createAssistantMessage() {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message assistant';

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';

  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'loading-indicator';
  loadingDiv.innerHTML = `
    <svg class="loading-asterisk" viewBox="0 0 24 24" fill="none">
      <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `;

  contentDiv.appendChild(loadingDiv);

  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'message-actions hidden';
  actionsDiv.innerHTML = `
    <button class="action-btn" title="Copy" onclick="copyMessage(this)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
    </button>
  `;

  messageDiv.appendChild(contentDiv);
  messageDiv.appendChild(actionsDiv);
  chatMessages.appendChild(messageDiv);
  scrollToBottom();
  saveState();

  return messageDiv;
}

function appendToContent(contentDiv, content) {
  if (!contentDiv.dataset.rawContent) {
    contentDiv.dataset.rawContent = '';
  }
  contentDiv.dataset.rawContent += content;

  // Get current chunk container and append to it
  const container = getCurrentMarkdownContainer(contentDiv);
  container.dataset.rawContent += content;
  renderMarkdownContainer(container);

  // Check for Anchor Browser live URL in content
  const browserInfo = extractBrowserUrl(contentDiv.dataset.rawContent);
  if (browserInfo && !activeBrowserSession) {
    addInlineBrowserEmbed(contentDiv, browserInfo.url, browserInfo.sessionId);
  }

  saveState();
}

function appendToThinking(contentDiv, content) {
  // Find or create thinking section (collapsible, above main content)
  let thinkingSection = contentDiv.querySelector('.thinking-section');

  if (!thinkingSection) {
    thinkingSection = document.createElement('details');
    thinkingSection.className = 'thinking-section';
    thinkingSection.open = false; // Collapsed by default

    const summary = document.createElement('summary');
    summary.className = 'thinking-header';
    summary.innerHTML = '<span class="thinking-icon">&#x1F4AD;</span> Thinking...';
    thinkingSection.appendChild(summary);

    const thinkingContent = document.createElement('div');
    thinkingContent.className = 'thinking-content';
    thinkingContent.dataset.rawContent = '';
    thinkingSection.appendChild(thinkingContent);

    // Insert at the beginning of contentDiv
    contentDiv.insertBefore(thinkingSection, contentDiv.firstChild);
  }

  const thinkingContent = thinkingSection.querySelector('.thinking-content');
  thinkingContent.dataset.rawContent += content;

  // Render as plain text (no markdown for thinking)
  thinkingContent.textContent = thinkingContent.dataset.rawContent;

  // Update header to show it's still thinking
  const summary = thinkingSection.querySelector('.thinking-header');
  const thinkingLength = thinkingContent.dataset.rawContent.length;
  summary.innerHTML = `<span class="thinking-icon">&#x1F4AD;</span> Thinking (${thinkingLength} chars)`;
}

// Start a new chat
window.startNewChat = function() {
  // Abort any ongoing request from the previous chat
  if (isWaitingForResponse) {
    window.electronAPI?.abortCurrentRequest?.();
    isWaitingForResponse = false;
  }

  if (currentChatId && chatMessages.children.length > 0) {
    saveState();
  }

  currentChatId = null;

  // Clear all state
  chatMessages.innerHTML = '';
  messageInput.value = '';
  homeInput.value = '';
  chatTitle.textContent = 'New chat';
  isFirstMessage = true;
  todos = [];
  toolCalls = [];
  attachedFiles = [];

  // Reset sidebar
  stepsList.innerHTML = '';
  emptySteps.style.display = 'block';
  stepsCount.textContent = '0 steps';
  toolCallsList.innerHTML = '';
  emptyTools.style.display = 'block';

  // Switch back to home view
  homeView.classList.remove('hidden');
  chatView.classList.add('hidden');
  homeInput.focus();

  // Clear currentChatId from localStorage
  localStorage.removeItem('currentChatId');

  // Update chat history display
  renderChatHistory();

  // Update send button states to ensure they're enabled
  updateSendButton(homeInput, homeSendBtn);
  updateSendButton(messageInput, chatSendBtn);
}

// Get or create the current markdown container for streaming
function getCurrentMarkdownContainer(contentDiv) {
  const chunkIndex = parseInt(contentDiv.dataset.currentChunk || '0');
  let container = contentDiv.querySelector(`.markdown-content[data-chunk="${chunkIndex}"]`);

  if (!container) {
    container = document.createElement('div');
    container.className = 'markdown-content';
    container.dataset.chunk = chunkIndex;
    container.dataset.rawContent = '';
    contentDiv.appendChild(container);
  }

  return container;
}

// Render markdown content for a specific container
function renderMarkdownContainer(container) {
  const rawContent = container.dataset.rawContent || '';

  marked.setOptions({
    breaks: true,
    gfm: true
  });

  container.innerHTML = marked.parse(rawContent);
}

// Legacy function for restoring saved messages
function renderMarkdown(contentDiv) {
  const rawContent = contentDiv.dataset.rawContent || '';

  marked.setOptions({
    breaks: true,
    gfm: true
  });

  let markdownContainer = contentDiv.querySelector('.markdown-content');
  if (!markdownContainer) {
    markdownContainer = document.createElement('div');
    markdownContainer.className = 'markdown-content';
    contentDiv.appendChild(markdownContainer);
  }

  markdownContainer.innerHTML = marked.parse(rawContent);
}

function formatToolPreview(toolInput) {
  if (!toolInput || typeof toolInput !== 'object') {
    return String(toolInput || '').substring(0, 50);
  }

  const keys = Object.keys(toolInput);
  if (keys.length === 0) return '';

  const previewKeys = ['pattern', 'command', 'file_path', 'path', 'query', 'content', 'description'];
  const key = previewKeys.find(k => toolInput[k]) || keys[0];
  const value = toolInput[key];

  if (typeof value === 'string') {
    return `${key}: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`;
  } else if (Array.isArray(value)) {
    return `${key}: [${value.length} items]`;
  } else if (typeof value === 'object') {
    return `${key}: {...}`;
  }
  return `${key}: ${String(value).substring(0, 30)}`;
}

// Add inline tool call to message (maintains correct order in stream)
function addInlineToolCall(contentDiv, toolName, toolInput, toolId) {
  const toolDiv = document.createElement('div');
  toolDiv.className = 'inline-tool-call expanded'; // Show expanded by default
  toolDiv.dataset.toolId = toolId;

  const inputPreview = formatToolPreview(toolInput);
  const inputStr = JSON.stringify(toolInput, null, 2);

  toolDiv.innerHTML = `
    <div class="inline-tool-header" onclick="toggleInlineToolCall(this)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
      </svg>
      <span class="tool-name">${toolName}</span>
      <span class="tool-preview">${inputPreview}</span>
      <svg class="expand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </div>
    <div class="inline-tool-result">
      <div class="tool-section">
        <div class="tool-section-label">Input</div>
        <pre>${escapeHtml(inputStr)}</pre>
      </div>
      <div class="tool-section tool-output-section" style="display: none;">
        <div class="tool-section-label">Output</div>
        <pre class="tool-output-content"></pre>
      </div>
    </div>
  `;

  // Append tool call at end (in stream order)
  contentDiv.appendChild(toolDiv);

  // Increment chunk counter so next text creates a new markdown container
  const currentChunk = parseInt(contentDiv.dataset.currentChunk || '0');
  contentDiv.dataset.currentChunk = currentChunk + 1;
}

// Update inline tool result
function updateInlineToolResult(toolId, result) {
  const toolDiv = document.querySelector(`.inline-tool-call[data-tool-id="${toolId}"]`);
  if (toolDiv) {
    const outputSection = toolDiv.querySelector('.tool-output-section');
    const outputContent = toolDiv.querySelector('.tool-output-content');
    if (outputSection && outputContent) {
      const resultStr = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
      outputContent.textContent = resultStr.substring(0, 2000) + (resultStr.length > 2000 ? '...' : '');
      outputSection.style.display = 'block';

      // Check for Anchor Browser live URL in tool result
      const browserInfo = extractBrowserUrl(resultStr);
      if (browserInfo) {
        // Find the parent content div and add browser embed
        const contentDiv = toolDiv.closest('.message-content');
        if (contentDiv) {
          addInlineBrowserEmbed(contentDiv, browserInfo.url, browserInfo.sessionId);
        }
      }
    }
  }
}

// Toggle inline tool call expansion
window.toggleInlineToolCall = function(header) {
  const toolDiv = header.closest('.inline-tool-call');
  toolDiv.classList.toggle('expanded');
};

// Add tool call to sidebar
function addToolCall(name, input, status = 'running') {
  const id = 'tool_' + Date.now();
  const toolCall = { id, name, input, status, result: null };
  toolCalls.push(toolCall);

  emptyTools.style.display = 'none';

  const toolDiv = document.createElement('div');
  toolDiv.className = 'tool-call-item expanded'; // Show expanded by default
  toolDiv.dataset.toolId = id;

  const isDispatchOrchestrator = name === 'SendUserMessage' || name.includes('dispatch');
  const iconSvg = isDispatchOrchestrator 
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>`;
  
  const displayName = isDispatchOrchestrator ? `⚡ Dispatch: ${name}` : name;
  const displayStatus = status === 'running' ? 'Running...' : 'Completed';

  toolDiv.innerHTML = `
    <div class="tool-call-header" onclick="toggleToolCall(this)">
      <div class="tool-call-icon ${status}" ${isDispatchOrchestrator ? 'style="background: rgba(249, 115, 22, 0.15); box-shadow: 0 0 8px rgba(249,115,22,0.4);"' : ''}>
        ${iconSvg}
      </div>
      <div class="tool-call-info">
        <div class="tool-call-name" ${isDispatchOrchestrator ? 'style="color: var(--accent-coral); font-weight: 600;"' : ''}>${displayName}</div>
        <div class="tool-call-status">${displayStatus}</div>
      </div>
      <div class="tool-call-expand">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
    </div>
    <div class="tool-call-details">
      <div class="tool-detail-section">
        <div class="tool-detail-label">Input</div>
        <pre>${escapeHtml(JSON.stringify(input, null, 2))}</pre>
      </div>
      <div class="tool-detail-section tool-output-section" style="display: none;">
        <div class="tool-detail-label">Output</div>
        <pre class="sidebar-tool-output"></pre>
      </div>
    </div>
  `;

  toolCallsList.appendChild(toolDiv);
  return toolCall;
}

// Update tool call status
function updateToolCallStatus(toolId, status) {
  const toolDiv = document.querySelector(`.tool-call-item[data-tool-id="${toolId}"]`);
  if (toolDiv) {
    const icon = toolDiv.querySelector('.tool-call-icon');
    const statusText = toolDiv.querySelector('.tool-call-status');

    icon.className = `tool-call-icon ${status}`;
    statusText.textContent = status === 'success' ? 'Completed' : status === 'error' ? 'Failed' : 'Running...';
  }

  // Update in state
  const toolCall = toolCalls.find(t => t.id === toolId);
  if (toolCall) {
    toolCall.status = status;
  }
}

// Update tool call result
function updateToolCallResult(toolId, result) {
  const toolCall = toolCalls.find(t => t.id === toolId);
  if (toolCall) {
    toolCall.result = result;
  }

  // Update sidebar tool output
  const toolDiv = document.querySelector(`.tool-call-item[data-tool-id="${toolId}"]`);
  if (toolDiv) {
    const outputSection = toolDiv.querySelector('.tool-output-section');
    const outputContent = toolDiv.querySelector('.sidebar-tool-output');
    if (outputSection && outputContent) {
      const resultStr = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
      outputContent.textContent = resultStr.substring(0, 2000) + (resultStr.length > 2000 ? '...' : '');
      outputSection.style.display = 'block';
    }
  }
}

// Toggle tool call expansion in sidebar
window.toggleToolCall = function(header) {
  const toolDiv = header.closest('.tool-call-item');
  toolDiv.classList.toggle('expanded');
};

// Update todos from TodoWrite
function updateTodos(newTodos) {
  todos = newTodos;
  renderTodos();
}

// Render todos in sidebar
function renderTodos() {
  stepsList.innerHTML = '';

  if (todos.length === 0) {
    emptySteps.style.display = 'block';
    stepsCount.textContent = '0 steps';
    return;
  }

  emptySteps.style.display = 'none';
  stepsCount.textContent = `${todos.length} steps`;

  todos.forEach((todo) => {
    const stepDiv = document.createElement('div');
    stepDiv.className = 'step-item';

    const statusIcon = todo.status === 'completed'
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>'
      : todo.status === 'in_progress'
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg>'
      : '';

    const displayText = todo.status === 'in_progress' ? (todo.activeForm || todo.content) : todo.content;

    stepDiv.innerHTML = `
      <div class="step-status ${todo.status}">${statusIcon}</div>
      <div class="step-content">
        <div class="step-text">${escapeHtml(displayText)}</div>
      </div>
    `;

    stepsList.appendChild(stepDiv);
  });
}

// Escape HTML for safe display
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Copy message to clipboard
function copyMessage(button) {
  const messageDiv = button.closest('.message');
  const contentDiv = messageDiv.querySelector('.message-content');
  const text = contentDiv.dataset.rawContent || contentDiv.textContent;

  navigator.clipboard.writeText(text).then(() => {
    button.style.color = '#27ae60';
    setTimeout(() => {
      button.style.color = '';
    }, 1000);
  });
}

window.copyMessage = copyMessage;

// Get conversation history for context
function getConversationHistory() {
  const messages = Array.from(chatMessages.children);
  const history = [];

  // Skip the last message (current assistant loading state)
  for (let i = 0; i < messages.length - 1; i++) {
    const msg = messages[i];
    const contentDiv = msg.querySelector('.message-content');
    if (!contentDiv) continue;

    const content = contentDiv.dataset.rawContent || contentDiv.textContent || '';
    if (!content.trim()) continue;

    if (msg.classList.contains('user')) {
      history.push({ role: 'user', content });
    } else if (msg.classList.contains('assistant')) {
      history.push({ role: 'assistant', content });
    }
  }

  return history;
}

// Scroll to bottom of messages
function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ==================== BROWSER EMBED FUNCTIONS ====================

// Check if a string contains an Anchor Browser live URL
function extractBrowserUrl(text) {
  const regex = /https:\/\/live\.anchorbrowser\.io\?sessionId=([a-f0-9-]+)/i;
  const match = text.match(regex);
  if (match) {
    return { url: match[0], sessionId: match[1] };
  }
  return null;
}

// Create inline browser embed in chat
function addInlineBrowserEmbed(contentDiv, url, sessionId) {
  // Remove any existing inline browser embeds (only one at a time)
  const existingEmbed = document.querySelector('.inline-browser-embed');
  if (existingEmbed) {
    existingEmbed.remove();
  }

  const browserDiv = document.createElement('div');
  browserDiv.className = 'inline-browser-embed';
  browserDiv.dataset.sessionId = sessionId;
  browserDiv.dataset.url = url;

  browserDiv.innerHTML = `
    <div class="browser-embed-header">
      <div class="browser-header-left">
        <svg class="browser-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="2" y1="12" x2="22" y2="12"></line>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>
        <span class="browser-title">Live Browser</span>
        <span class="browser-session-badge">Session Active</span>
      </div>
      <div class="browser-header-actions">
        <button class="browser-action-btn" onclick="openBrowserInNewWindow('${url}')" title="Open in new window">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
        </button>
        <button class="browser-action-btn" onclick="moveBrowserToSidebar()" title="Move to sidebar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="15" y1="3" x2="15" y2="21"></line>
          </svg>
        </button>
        <button class="browser-action-btn browser-fullscreen-btn" onclick="toggleBrowserFullscreen(this)" title="Fullscreen">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 3 21 3 21 9"></polyline>
            <polyline points="9 21 3 21 3 15"></polyline>
            <line x1="21" y1="3" x2="14" y2="10"></line>
            <line x1="3" y1="21" x2="10" y2="14"></line>
          </svg>
        </button>
      </div>
    </div>
    <div class="browser-embed-content">
      <iframe
        src="${url}"
        class="browser-iframe"
        allow="clipboard-read; clipboard-write; camera; microphone"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
      ></iframe>
    </div>
    <div class="browser-embed-footer">
      <span class="browser-url">${url}</span>
      <button class="browser-copy-url" onclick="copyBrowserUrl('${url}')" title="Copy URL">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      </button>
    </div>
  `;

  // Store active session
  activeBrowserSession = {
    url: url,
    sessionId: sessionId,
    inlineElement: browserDiv
  };
  browserDisplayMode = 'inline';

  // Append to content
  contentDiv.appendChild(browserDiv);

  // Increment chunk counter
  const currentChunk = parseInt(contentDiv.dataset.currentChunk || '0');
  contentDiv.dataset.currentChunk = currentChunk + 1;

  scrollToBottom();
}

// Move browser from inline to sidebar
function moveBrowserToSidebar() {
  if (!activeBrowserSession) return;

  // Remove inline embed
  if (activeBrowserSession.inlineElement) {
    activeBrowserSession.inlineElement.remove();
  }

  // Show browser in sidebar
  showBrowserInSidebar(activeBrowserSession.url, activeBrowserSession.sessionId);
  browserDisplayMode = 'sidebar';
}

// Show browser in sidebar panel
function showBrowserInSidebar(url, sessionId) {
  // Check if browser section already exists
  let browserSection = document.getElementById('browserSection');

  if (!browserSection) {
    // Create browser section in sidebar
    browserSection = document.createElement('div');
    browserSection.id = 'browserSection';
    browserSection.className = 'sidebar-section browser-section';
    browserSection.innerHTML = `
      <div class="section-header browser-section-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="2" y1="12" x2="22" y2="12"></line>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>
        <span>Live Browser</span>
        <div class="browser-sidebar-actions">
          <button class="browser-sidebar-btn" onclick="moveBrowserToInline()" title="Show inline">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
          </button>
          <button class="browser-sidebar-btn" onclick="closeBrowserSession()" title="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
      <div class="browser-sidebar-content">
        <iframe
          src="${url}"
          class="browser-sidebar-iframe"
          allow="clipboard-read; clipboard-write; camera; microphone"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
        ></iframe>
      </div>
    `;

    // Insert before tool calls section
    const toolCallsSection = sidebar.querySelector('.sidebar-section:last-child');
    sidebar.insertBefore(browserSection, toolCallsSection);
  } else {
    // Update existing iframe
    const iframe = browserSection.querySelector('.browser-sidebar-iframe');
    if (iframe) {
      iframe.src = url;
    }
  }

  // Ensure sidebar is visible
  sidebar.classList.remove('collapsed');

  // Update session reference
  activeBrowserSession = {
    ...activeBrowserSession,
    url: url,
    sessionId: sessionId,
    sidebarElement: browserSection
  };
}

// Move browser back to inline (in the last assistant message)
window.moveBrowserToInline = function() {
  if (!activeBrowserSession) return;

  // Remove from sidebar
  const browserSection = document.getElementById('browserSection');
  if (browserSection) {
    browserSection.remove();
  }

  // Find the last assistant message content div
  const lastAssistantMessage = chatMessages.querySelector('.message.assistant:last-child .message-content');
  if (lastAssistantMessage && activeBrowserSession.url) {
    addInlineBrowserEmbed(lastAssistantMessage, activeBrowserSession.url, activeBrowserSession.sessionId);
  }

  browserDisplayMode = 'inline';
}

// Close browser session
window.closeBrowserSession = function() {
  // Remove inline embed
  const inlineEmbed = document.querySelector('.inline-browser-embed');
  if (inlineEmbed) {
    inlineEmbed.remove();
  }

  // Remove sidebar section
  const browserSection = document.getElementById('browserSection');
  if (browserSection) {
    browserSection.remove();
  }

  activeBrowserSession = null;
  browserDisplayMode = 'hidden';
}

// Open browser in new window
window.openBrowserInNewWindow = function(url) {
  window.open(url, '_blank', 'width=1200,height=800');
}

// Toggle browser fullscreen
window.toggleBrowserFullscreen = function(button) {
  const embedDiv = button.closest('.inline-browser-embed');
  if (embedDiv) {
    embedDiv.classList.toggle('fullscreen');

    // Update icon
    const svg = button.querySelector('svg');
    if (embedDiv.classList.contains('fullscreen')) {
      svg.innerHTML = `
        <polyline points="4 14 10 14 10 20"></polyline>
        <polyline points="20 10 14 10 14 4"></polyline>
        <line x1="14" y1="10" x2="21" y2="3"></line>
        <line x1="3" y1="21" x2="10" y2="14"></line>
      `;
    } else {
      svg.innerHTML = `
        <polyline points="15 3 21 3 21 9"></polyline>
        <polyline points="9 21 3 21 3 15"></polyline>
        <line x1="21" y1="3" x2="14" y2="10"></line>
        <line x1="3" y1="21" x2="10" y2="14"></line>
      `;
    }
  }
}

// Copy browser URL
window.copyBrowserUrl = function(url) {
  navigator.clipboard.writeText(url).then(() => {
    // Show brief feedback
    const btn = document.querySelector('.browser-copy-url');
    if (btn) {
      btn.style.color = '#4ade80';
      setTimeout(() => {
        btn.style.color = '';
      }, 1000);
    }
  });
}

// Handle transition when user sends a new message while browser is inline
function handleBrowserTransitionOnMessage() {
  if (activeBrowserSession && browserDisplayMode === 'inline') {
    // Move browser to sidebar when user sends a new message
    moveBrowserToSidebar();
  }
}

// Populate Prompt from Quick Buttons or Tab Switchers
window.populatePrompt = function(text) {
  // If user clicks switch tab buttons, let's update tab states!
  if (text.startsWith('Switch to ')) {
    const tabName = text.replace('Switch to ', '').toLowerCase();
    setWorkspaceMode(tabName);
    appSettings.defaultTab = tabName;
    appSettings.model = selectedModel;
    saveAppSettings();
    return;
  }

  const input = homeView.classList.contains('hidden') ? messageInput : homeInput;
  const btn = homeView.classList.contains('hidden') ? chatSendBtn : homeSendBtn;
  if (input && btn) {
    input.value = text;
    updateSendButton(input, btn);
    autoResizeTextarea(input);
    input.focus();
  }
}

// Animate Progress Bar on startup
window.animateProgressBar = function() {
  const bar = document.getElementById('statusBarFill');
  const txt = document.getElementById('statusPercent');
  if (!bar || !txt) return;

  let percent = 5;
  const interval = setInterval(() => {
    if (percent >= 100) {
      clearInterval(interval);
      const statusText = document.querySelector('.status-text');
      if (statusText) statusText.textContent = 'Workspace configured and ready.';
      return;
    }
    percent += Math.floor(Math.random() * 5) + 3;
    if (percent > 100) percent = 100;
    bar.style.width = percent + '%';
    txt.textContent = percent + '%';
  }, 100);
}

// Initialize on load
window.addEventListener('load', init);

// Unified iframe communication helper
window.sendToIframe = function(iframeId, text) {
  const iframe = document.getElementById(iframeId);
  if (iframe && iframe.contentWindow) {
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      if (iframeDoc) {
        const textarea = iframeDoc.querySelector('textarea, input[type="text"]');
        const form = iframeDoc.querySelector('form');
        const button = iframeDoc.querySelector('button[type="submit"], .send-btn');
        if (textarea) {
          textarea.value = text;
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.dispatchEvent(new Event('change', { bubbles: true }));
          textarea.focus();
          if (button) {
            setTimeout(() => button.click(), 100);
          } else if (form) {
            setTimeout(() => form.submit(), 100);
          }
        }
      }
    } catch (e) {
      console.log('Cross-origin sandbox restriction, falling back to message sending');
      iframe.contentWindow.postMessage({ type: 'populatePrompt', text: text }, '*');
    }
  }
}

// ==================== NEW: COMPACT MODE, RIGHT SIDEBAR & COMPOSIO CONNECTOR FEATURES ====================
// (toggleRightSidebar was moved up for availability)

window.toggleCompactMode = function() {
  const rightSidebar = document.getElementById('rightSidebar');
  if (!rightSidebar) return;
  const isCompact = rightSidebar.classList.toggle('compact-mode');
  const btnSpan = document.querySelector('#rightToggleCompactBtn span');
  if (btnSpan) btnSpan.textContent = isCompact ? 'Expanded' : 'Compact';
  localStorage.setItem('coworkSidebarCompact', isCompact ? 'true' : 'false');
};

window.validateComposioKey = function() {
  const input = document.getElementById('composioApiKeyInput');
  const btn = document.getElementById('saveComposioKeyBtn');
  if (!input || !btn) return;
  if (input.value.trim().startsWith('comp_') || input.value.trim().length > 10) {
    btn.style.opacity = '1';
  } else {
    btn.style.opacity = '0.7';
  }
};

window.saveComposioKey = function() {
  const input = document.getElementById('composioApiKeyInput');
  const badge = document.getElementById('composioStatusBadge');
  const btn = document.getElementById('saveComposioKeyBtn');
  if (!input || !badge || !btn) return;
  
  const key = input.value.trim();
  if (!key) {
    // Clear key
    localStorage.removeItem('composio_api_key');
    badge.textContent = 'Not Connected';
    badge.style.background = 'rgba(255,255,255,0.05)';
    badge.style.color = 'var(--text-secondary)';
    btn.textContent = 'Connect';
    btn.style.background = 'var(--accent-coral)';
    alert('Composio key cleared.');
    return;
  }

  localStorage.setItem('composio_api_key', key);
  badge.textContent = 'Connected';
  badge.style.background = 'rgba(16, 185, 129, 0.15)';
  badge.style.color = '#10b981';
  btn.textContent = 'Update';
  btn.style.background = 'rgba(255,255,255,0.1)';
  
  // Mask input
  input.value = '••••••••••••••••••••••••••••••••';
  alert('Composio API key securely connected successfully!');
};

window.initComposioConnector = function() {
  const input = document.getElementById('composioApiKeyInput');
  const badge = document.getElementById('composioStatusBadge');
  const btn = document.getElementById('saveComposioKeyBtn');
  const savedKey = localStorage.getItem('composio_api_key');
  if (savedKey && input && badge && btn) {
    input.value = '••••••••••••••••••••••••••••••••';
    badge.textContent = 'Connected';
    badge.style.background = 'rgba(16, 185, 129, 0.15)';
    badge.style.color = '#10b981';
    btn.textContent = 'Update';
    btn.style.background = 'rgba(255,255,255,0.1)';
  }
  
  // Restore right sidebar compact mode
  const isCompact = localStorage.getItem('coworkSidebarCompact') === 'true';
  if (isCompact) {
    const rightSidebar = document.getElementById('rightSidebar');
    if (rightSidebar) {
      rightSidebar.classList.add('compact-mode');
      const btnSpan = document.querySelector('#rightToggleCompactBtn span');
      if (btnSpan) btnSpan.textContent = 'Expanded';
    }
  }

  // Restore right sidebar collapsed state (USER REQUEST!)
  const isRightCollapsed = localStorage.getItem('rightSidebarCollapsed') === 'true';
  const rightSidebar = document.getElementById('rightSidebar');
  const rightSidebarExpand = document.getElementById('rightSidebarExpand');
  if (rightSidebar && rightSidebarExpand) {
    if (isRightCollapsed) {
      rightSidebar.classList.add('collapsed');
      rightSidebarExpand.classList.remove('hidden');
      rightSidebarExpand.classList.add('visible');
    } else {
      rightSidebar.classList.remove('collapsed');
      rightSidebarExpand.classList.add('hidden');
      rightSidebarExpand.classList.remove('visible');
    }
  }
};
