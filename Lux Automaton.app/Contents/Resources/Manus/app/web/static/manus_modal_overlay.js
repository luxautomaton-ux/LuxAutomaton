/* ==========================================================================
   LUX MANUS MODAL OVERLAY & PLAYBOOK GALLERY SYSTEM
   ========================================================================== */

function initManusSettingsModal() {
  if (document.getElementById('manusSettingsModal')) return;

  const modalHtml = `
    <div id="manusSettingsModal" class="manus-modal-overlay">
      <div class="manus-modal-container">
        <button class="manus-modal-close" onclick="closeManusSettingsModal()" aria-label="Close modal">&times;</button>
        <div class="manus-modal-layout">
          <div class="manus-modal-sidebar">
            <div class="manus-modal-brand">
              <img src="/static/brand/lux-manus-logo.png" alt="Lux Manus Logo" class="manus-modal-logo">
              <span>lux console</span>
            </div>
            <div class="manus-modal-menu">
              <div class="manus-menu-group-title">General</div>
              <button class="manus-menu-item active" data-modal-tab="account" onclick="switchModalTab('account')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Account Profile
              </button>
              <button class="manus-menu-item" data-modal-tab="system" onclick="switchModalTab('system')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                System & Models
              </button>
              
              <div class="manus-menu-group-title">Integrations</div>
              <button class="manus-menu-item" data-modal-tab="skills" onclick="switchModalTab('skills')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12  2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                Skill Center
              </button>
              <button class="manus-menu-item" data-modal-tab="integrations" onclick="switchModalTab('integrations')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2" ry="2"/><path d="M7 2v20"/><path d="M17 2v20"/><path d="M2 12h20"/></svg>
                Connected Apps Hub
              </button>
              
              <div class="manus-menu-group-title">Help & Playbook</div>
              <button class="manus-menu-item" data-modal-tab="guide" onclick="switchModalTab('guide')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                Guide & Use Cases
              </button>
            </div>
          </div>
          <div class="manus-modal-content" id="manusModalContentWrapper">
            <!-- Dynamically populated main views -->
          </div>
        </div>
      </div>
    </div>
  `;

  const containerDiv = document.createElement('div');
  containerDiv.innerHTML = modalHtml;
  document.body.appendChild(containerDiv.firstElementChild);

  // Close modal on escape press
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeManusSettingsModal();
  });
}

function openManusSettingsModal(tabName = 'account') {
  initManusSettingsModal();
  const overlay = document.getElementById('manusSettingsModal');
  if (overlay) {
    overlay.classList.add('open');
    switchModalTab(tabName);
  }
}

function closeManusSettingsModal() {
  const overlay = document.getElementById('manusSettingsModal');
  if (overlay) {
    overlay.classList.remove('open');
  }
}

function switchModalTab(tabName) {
  initManusSettingsModal();
  
  // Set menu item active class
  const items = document.querySelectorAll('.manus-menu-item');
  items.forEach(btn => {
    if (btn.getAttribute('data-modal-tab') === tabName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  const contentWrapper = document.getElementById('manusModalContentWrapper');
  if (!contentWrapper) return;

  if (tabName === 'account') {
    renderAccountTab(contentWrapper);
  } else if (tabName === 'system') {
    renderSystemTab(contentWrapper);
  } else if (tabName === 'skills') {
    renderSkillsTab(contentWrapper);
  } else if (tabName === 'integrations') {
    renderIntegrationsTab(contentWrapper);
  } else if (tabName === 'guide') {
    renderManusUseCases(contentWrapper);
  }
}

// ==========================================================================
// DYNAMIC TABS RENDERING
// ==========================================================================

function renderAccountTab(container) {
  container.innerHTML = `
    <div class="manus-tab-header">
      <h2 class="manus-tab-title">Account Profile</h2>
      <div class="manus-tab-subtitle">Manage your local computer connection profile and credits.</div>
    </div>
    <div class="manus-settings-card">
      <div class="manus-account-row">
        <div class="manus-account-avatar">A</div>
        <div class="manus-account-details">
          <h3>asaspade</h3>
          <p>Local Workspace Operator · Premium License</p>
        </div>
      </div>
      <div class="manus-stats-grid">
        <div class="manus-stat-item">
          <span class="manus-stat-label">Session Usage</span>
          <span class="manus-stat-value">48 Tasks Run</span>
        </div>
        <div class="manus-stat-item">
          <span class="manus-stat-label">Connected Tools</span>
          <span class="manus-stat-value">5 Active MCPs</span>
        </div>
        <div class="manus-stat-item">
          <span class="manus-stat-label">Privacy Mode</span>
          <span class="manus-stat-value text-ok">100% Local</span>
        </div>
      </div>
    </div>
  `;
}

function renderSystemTab(container) {
  // Fetch currently selected model and mode from main app DOM
  const mainModeSelect = document.getElementById('mode-selector');
  const mainModelSelect = document.getElementById('model-selector');
  
  const currentMode = mainModeSelect ? mainModeSelect.value : 'agent';
  const currentModel = mainModelSelect ? mainModelSelect.value : 'ollama';

  container.innerHTML = `
    <div class="manus-tab-header">
      <h2 class="manus-tab-title">System & Models</h2>
      <div class="manus-tab-subtitle">Configure orchestration mode and local hardware routing.</div>
    </div>
    <div class="manus-form-group">
      <label class="manus-form-label">Task Orchestration Mode</label>
      <select id="modal-mode-selector" class="manus-form-select" onchange="syncSystemDropdown('mode')">
        <option value="agent" ${currentMode === 'agent' ? 'selected' : ''}>Agent Mode (Autonomous loops)</option>
        <option value="chat" ${currentMode === 'chat' ? 'selected' : ''}>Chat Mode (Interactive assistance)</option>
      </select>
      <div class="manus-form-hint">Agent Mode runs an autonomous planner loop to write code, install components, and verify correctness.</div>
    </div>
    <div class="manus-form-group">
      <label class="manus-form-label">Hardware Routing / AI Engine</label>
      <select id="modal-model-selector" class="manus-form-select" onchange="syncSystemDropdown('model')">
        <option value="ollama" ${currentModel === 'ollama' ? 'selected' : ''}>Local Ollama (Qwen 2.5 7B)</option>
        <option value="opencode" ${currentModel === 'opencode' ? 'selected' : ''}>Lux Claude Code Terminal</option>
        <option value="openai" ${currentModel === 'openai' ? 'selected' : ''}>External OpenAI (GPT-4o)</option>
      </select>
      <div class="manus-form-hint">Lux Claude Code Terminal connects directly to your local file and shell executors for zero latency.</div>
    </div>
  `;
}

window.syncSystemDropdown = (type) => {
  if (type === 'mode') {
    const modalSelect = document.getElementById('modal-mode-selector');
    const mainSelect = document.getElementById('mode-selector');
    if (modalSelect && mainSelect) {
      mainSelect.value = modalSelect.value;
      mainSelect.dispatchEvent(new Event('change'));
    }
  } else if (type === 'model') {
    const modalSelect = document.getElementById('modal-model-selector');
    const mainSelect = document.getElementById('model-selector');
    if (modalSelect && mainSelect) {
      mainSelect.value = modalSelect.value;
      mainSelect.dispatchEvent(new Event('change'));
    }
  }
};

function renderSkillsTab(container) {
  container.innerHTML = `
    <div class="manus-tab-header">
      <h2 class="manus-tab-title">Skill Center</h2>
      <div class="manus-tab-subtitle">Extend Agent capabilities with prebuilt skill packs or GitHub repositories.</div>
    </div>
    
    <div class="manus-settings-card">
      <div class="manus-action-row">
        <div class="manus-action-info">
          <h3>Safe Skill Pack</h3>
          <p>Deploy curated, pre-verified automation files inside your local system workspace.</p>
        </div>
        <button class="manus-btn-primary" onclick="triggerSkillAction('install-pack')">Install Pack</button>
      </div>
    </div>

    <div class="manus-settings-card" style="margin-top: 14px;">
      <h3>Install Custom Skill Repository</h3>
      <p style="font-size: 12px; color: var(--muted); margin: 4px 0 12px;">Type a GitHub URL or "owner/repo" to clone and register skills.</p>
      <div class="manus-input-group">
        <input type="text" id="modal-skill-repo-input" class="manus-form-input" placeholder="e.g. darkzOGx/youtube-automation-agent" value="">
        <button class="manus-btn-primary" onclick="triggerSkillAction('install-repo')">Register Skill</button>
      </div>
    </div>
  `;
}

window.triggerSkillAction = (action) => {
  if (action === 'install-pack') {
    closeManusSettingsModal();
    const btn = document.getElementById('install-skills-btn');
    if (btn) btn.click();
  } else if (action === 'install-repo') {
    const input = document.getElementById('modal-skill-repo-input');
    const repo = input ? input.value.trim() : '';
    if (!repo) {
      alert('Please enter a valid skill repository URL/slug.');
      return;
    }
    closeManusSettingsModal();
    // Simulate prompting custom skill by overriding window.prompt temporarily
    const originalPrompt = window.prompt;
    window.prompt = () => repo;
    const btn = document.getElementById('add-skill-btn');
    if (btn) btn.click();
    window.prompt = originalPrompt;
  }
};

// ==========================================================================
// USE CASE GALLERY COMPONENT (MATCHES THE BRAND NEW REALISTIC PLAYBOOK)
// ==========================================================================

const MANUS_USE_CASES = [
  {
    icon: '🎥',
    title: 'Automated YouTube Channel Manager',
    desc: 'Creates, optimizes & publishes videos 24/7. Integrates with Google Cloud and OpenCode fast thumbnail diffusion models.',
    category: 'Featured',
    prompt: 'Initialize my fully automated YouTube channel manager. Set up agents to plan, produce, optimize, and publish content 24/7. Include scripts for Google Cloud publishing and OpenCode fast thumbnail generation.'
  },
  {
    icon: '📝',
    title: 'Social Media Content Machine',
    desc: 'Generates engaging viral content plans for Twitter, LinkedIn, and Instagram, matching custom brand tones and hashtags.',
    category: 'Featured',
    prompt: 'Create a 7-day social media content calendar for my product (Lux Automaton). Generate 3 variants for Twitter, 2 long-form articles for LinkedIn, and 2 visual post templates for Instagram. Ensure consistent brand guidelines and relevant hashtags are included.'
  },
  {
    icon: '📈',
    title: 'Tesla Stock Market Analyzer',
    desc: 'Runs deep technical & fundamental financial analysis on TSLA, parsing recent SEC filings and compiling an insights report.',
    category: 'Research',
    prompt: 'Deeply analyze Tesla stocks (TSLA). Fetch current pricing data, scan recent SEC 10-K/10-Q filings, perform fundamental analysis, and compile a technical chart report with actionable insights.'
  },
  {
    icon: '🌐',
    title: 'Competitive Intelligence Web Scraper',
    desc: 'Crawls competitor websites, extracts pricing models and core value propositions, and builds a thorough SWOT matrix.',
    category: 'Research',
    prompt: 'Crawl competitor landing pages in my industry. Extract pricing plans, core value propositions, and listed product features. Create a comparative spreadsheet and compile a thorough SWOT matrix analysis report.'
  },
  {
    icon: '📄',
    title: 'Multi-PDF Executive Synthesizer',
    desc: 'Reads multiple PDF reports from workspace, extracts crucial key performance indicators, and compiles an executive briefing report.',
    category: 'Research',
    prompt: 'Scan my current workspace for PDF files. Parse each document, extract the core themes, methodologies, data tables, and key takeaways. Synthesize everything into a high-level executive briefing markdown report.'
  },
  {
    icon: '🌸',
    title: 'Japan Custom Trip Planner',
    desc: 'Generates a high-quality step-by-step Tokyo, Kyoto & Osaka custom itinerary with local food guides and train ticket calculations.',
    category: 'Life',
    prompt: 'Plan a detailed 10-day trip to Japan covering Tokyo, Kyoto, and Osaka. Include daily itineraries, hotel recommendations, budget estimates, and essential tips for first-time travelers.'
  },
  {
    icon: '⚡',
    title: 'Node/Express & React CRUD Boilerplate',
    desc: 'Generates a complete full-stack CRUD feature package with clean schema definitions, router controllers, and integrated frontend UI components.',
    category: 'Productivity',
    prompt: 'Scaffold a complete full-stack CRUD feature in React and Express. Generate structured schema models, route endpoint controllers with input validation, mock database operations, and a responsive frontend dashboard component styled with clean modern HSL tokens.'
  },
  {
    icon: '💻',
    title: 'AI Code Refactoring Pro',
    desc: 'Automates workspace files analysis for visual polishing, dead-code removal, modular encapsulation, and optimal imports.',
    category: 'Productivity',
    prompt: 'Scan my current workspace project files. Analyze code duplication, style inconsistencies, and performance bottlenecks, and generate an optimization walkthrough.'
  },
  {
    icon: '🏦',
    title: 'Capital Expense & Cash Flow Forecaster',
    desc: 'Models cash flows, fixed overheads, and variable costs over a 12-month period, generating a dynamic forecast table.',
    category: 'Data Analysis',
    prompt: 'Create a 12-month cash-flow projection model for a software startup. Define tables for fixed overheads, customer subscription growth, and variable API costs. Build projection tables showing best-case, base-case, and worst-case scenarios.'
  },
  {
    icon: '📊',
    title: 'CSV Data Cleaning Pipeline',
    desc: 'Cleans, transforms and aggregates multi-sheet spreadsheet data, automatically outputting gorgeous visual charts.',
    category: 'Data Analysis',
    prompt: 'Inspect the CSV data files in my workspace. Clean up empty fields, normalize column names, and create a script that generates beautiful summary charts with consistent HSL color palettes.'
  }
];

function renderManusUseCases(container) {
  let activeCategory = 'Featured';

  function buildHtml() {
    const categories = ['Featured', 'Research', 'Life', 'Data Analysis', 'Productivity'];
    
    const tabsHtml = categories.map(cat => `
      <button class="manus-usecase-tab ${cat === activeCategory ? 'active' : ''}" onclick="setUsecaseCategory('${cat}')">${cat}</button>
    `).join('');

    const filtered = MANUS_USE_CASES.filter(uc => uc.category === activeCategory);
    
    const cardsHtml = filtered.map((uc, idx) => `
      <div class="manus-usecase-card" onclick="selectUsecasePrompt(${idx})">
        <span class="manus-usecase-card-icon">${uc.icon}</span>
        <span class="manus-usecase-card-title">${uc.title}</span>
        <span class="manus-usecase-card-desc">${uc.desc}</span>
        <span class="manus-usecase-card-badge">${uc.category}</span>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="manus-usecase-header">
        <h2 class="manus-usecase-title">Interactive Playbook & Use Cases</h2>
        <div class="manus-usecase-subtitle">Choose a ready-to-use template to deploy Lux Manus on complex tasks. Clicking a card will automatically populate your chat composer!</div>
      </div>
      <div class="manus-usecase-tabs">
        ${tabsHtml}
      </div>
      <div class="manus-usecase-grid">
        ${cardsHtml}
      </div>
    `;
  }

  window.setUsecaseCategory = (cat) => {
    activeCategory = cat;
    buildHtml();
  };

  window.selectUsecasePrompt = (index) => {
    const filtered = MANUS_USE_CASES.filter(uc => uc.category === activeCategory);
    const selected = filtered[index];
    if (selected) {
      const textarea = document.getElementById('user-input');
      if (textarea) {
        textarea.value = selected.prompt;
        textarea.focus();
        // Trigger standard auto-resize if any
        textarea.dispatchEvent(new Event('input'));
      }
      closeManusSettingsModal();
    }
  };

  buildHtml();
}

function focusSidebarSearch() {
  const input = document.getElementById('sessionSearch');
  if (input) {
    input.focus();
  }
}

// Global hook to toggle sidebar collapse
window.toggleSidebarCollapse = () => {
  const shell = document.querySelector('.app-shell');
  if (shell) {
    shell.classList.toggle('sidebar-collapsed');
    const collapsed = shell.classList.contains('sidebar-collapsed') ? '1' : '0';
    localStorage.setItem('lux-manus-sidebar-collapsed', collapsed);
  }
};

function initComposerButtons() {
  const attachTrigger = document.getElementById('manus-attachment-trigger');
  if (attachTrigger) {
    attachTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      const realInput = document.getElementById('file-upload-input');
      if (realInput) realInput.click();
    });
  }

  const modeToggle = document.getElementById('manus-deep-learning-toggle');
  if (modeToggle) {
    const mainSelect = document.getElementById('mode-selector');
    if (mainSelect && mainSelect.value === 'chat') {
      modeToggle.classList.remove('active');
    } else {
      modeToggle.classList.add('active');
    }

    modeToggle.addEventListener('click', (e) => {
      e.preventDefault();
      const select = document.getElementById('mode-selector');
      if (select) {
        if (select.value === 'agent') {
          select.value = 'chat';
          modeToggle.classList.remove('active');
        } else {
          select.value = 'agent';
          modeToggle.classList.add('active');
        }
        select.dispatchEvent(new Event('change'));
      }
    });
  }

  const modelTrigger = document.getElementById('manus-model-selector-trigger');
  if (modelTrigger) {
    modelTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      openManusSettingsModal('system');
    });
  }

  const playbookTrigger = document.getElementById('manus-playbook-trigger');
  if (playbookTrigger) {
    playbookTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      openManusSettingsModal('guide');
    });
  }
}

function renderIntegrationsTab(container) {
  container.innerHTML = `
    <div class="manus-tab-header">
      <h2 class="manus-tab-title">Connected Applications Hub</h2>
      <div class="manus-tab-subtitle">Lux Manus acts as your primary Agentic Orchestrator, seamlessly routing and scheduling workflows across your active local services.</div>
    </div>
    
    <div class="manus-integrations-grid">
      <!-- 1. Lux Claude Code -->
      <div class="manus-integration-card active">
        <div class="manus-integration-header">
          <div class="manus-integration-brand">
            <span class="manus-integration-icon" style="background: #1e1e1e; border: 1.2px solid #ea580c; display: flex; align-items: center; justify-content: center;">💻</span>
            <div>
              <h3 class="manus-integration-title">Lux Claude Code Console</h3>
              <span class="manus-integration-port">Port 3001</span>
            </div>
          </div>
          <span class="manus-integration-status-badge active">CONNECTED</span>
        </div>
        <p class="manus-integration-desc">Serves as the high-speed local terminal executor. Handles file analysis, repository edits, compilation cycles, and system command scripting with near-zero latency.</p>
        <div class="manus-integration-footer">
          <a href="http://localhost:3001" target="_blank" class="manus-integration-btn">Open Claude Code Console ↗</a>
        </div>
      </div>

      <!-- 2. Lux Tube -->
      <div class="manus-integration-card active">
        <div class="manus-integration-header">
          <div class="manus-integration-brand">
            <span class="manus-integration-icon" style="background: #991b1b; display: flex; align-items: center; justify-content: center;">🎬</span>
            <div>
              <h3 class="manus-integration-title">Lux Tube Command Center</h3>
              <span class="manus-integration-port">Port 5173 / 5174</span>
            </div>
          </div>
          <span class="manus-integration-status-badge active">CONNECTED</span>
        </div>
        <p class="manus-integration-desc">Provides autonomous video processing, Shorts layout synthesis, thumbnail creation pipeline, and instant YouTube/TikTok publisher integrations.</p>
        <div class="manus-integration-footer">
          <a href="http://localhost:5173" target="_blank" class="manus-integration-btn">Open Lux Tube Hub ↗</a>
        </div>
      </div>

      <!-- 3. Andre OS Control Plane -->
      <div class="manus-integration-card active">
        <div class="manus-integration-header">
          <div class="manus-integration-brand">
            <span class="manus-integration-icon" style="background: #1e3a8a; display: flex; align-items: center; justify-content: center;">⚙️</span>
            <div>
              <h3 class="manus-integration-title">Andre OS Operator Control</h3>
              <span class="manus-integration-port">Port 3000</span>
            </div>
          </div>
          <span class="manus-integration-status-badge active">CONNECTED</span>
        </div>
        <p class="manus-integration-desc">Deep workflow planner and server supervisor. Manages background process micro-routines, long-running agent threads, and scheduled automation schedules.</p>
        <div class="manus-integration-footer">
          <a href="http://localhost:3000" target="_blank" class="manus-integration-btn">Open Andre OS Plane ↗</a>
        </div>
      </div>

      <!-- 4. Hermes Agent Engine -->
      <div class="manus-integration-card active">
        <div class="manus-integration-header">
          <div class="manus-integration-brand">
            <span class="manus-integration-icon" style="background: #ea580c; color: #000000; font-weight: bold; display: flex; align-items: center; justify-content: center;">🦊</span>
            <div>
              <h3 class="manus-integration-title">Hermes Agent Engine</h3>
              <span class="manus-integration-port">Port 8787</span>
            </div>
          </div>
          <span class="manus-integration-status-badge active">CONNECTED</span>
        </div>
        <p class="manus-integration-desc">Underlying sandbox browser driver. Crawls competitor web structures, processes single-page application tables, and generates high-fidelity scraped database matrix files.</p>
        <div class="manus-integration-footer">
          <a href="http://localhost:8787" target="_blank" class="manus-integration-btn">Open Hermes Engine ↗</a>
        </div>
      </div>
    </div>
  `;
}

// Eager initialization on DOM load
document.addEventListener('DOMContentLoaded', () => {
  initManusSettingsModal();
  initComposerButtons();
  
  // Set initial sidebar collapse state from localStorage
  if (localStorage.getItem('lux-manus-sidebar-collapsed') === '1') {
    const shell = document.querySelector('.app-shell');
    if (shell) shell.classList.add('sidebar-collapsed');
  }
});
