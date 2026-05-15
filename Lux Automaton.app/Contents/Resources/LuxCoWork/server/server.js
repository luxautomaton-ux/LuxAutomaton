import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import { getProvider, getAvailableProviders, initializeProviders } from './providers/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3002;
const COWORK_ROOT = path.join(__dirname, '..');
const RENDERER_DIR = path.join(COWORK_ROOT, 'renderer');
const ASSETS_DIR = path.join(COWORK_ROOT, 'assets');

app.use(cors());
app.use(express.json());

if (fs.existsSync(ASSETS_DIR)) {
  app.use('/assets', express.static(ASSETS_DIR));
}
if (fs.existsSync(RENDERER_DIR)) {
  app.use(express.static(RENDERER_DIR));
}

app.post('/api/chat', async (req, res) => {
  const {
    message,
    chatId,
    userId = 'default-user',
    provider: providerName = 'opencode',
    model = process.env.DEFAULT_MODEL || null
  } = req.body;

  console.log('[CHAT] Request:', message);
  console.log('[CHAT] Chat ID:', chatId);
  console.log('[CHAT] Provider:', providerName);
  console.log('[CHAT] Model:', model || '(default)');

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const availableProviders = getAvailableProviders();
  if (!availableProviders.includes(providerName.toLowerCase())) {
    return res.status(400).json({
      error: `Invalid provider: ${providerName}. Available: ${availableProviders.join(', ')}`
    });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Processing request...' })}\n\n`);

  const heartbeatInterval = setInterval(() => {
    if (!res.writableEnded) {
      res.write(': heartbeat\n\n');
    }
  }, 15000);

  res.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  try {
    const provider = getProvider(providerName);

    const mcpServers = {
      higgsfield: {
        type: 'local',
        command: '~/.hermes/hermes-agent/venv/bin/python',
        args: ['-m', 'higgsfield_ai_mcp'],
        env: {
          HF_API_KEY: process.env.HF_API_KEY || '',
          HF_SECRET: process.env.HF_SECRET || '',
        }
      }
    };

    // Load Cowork Plugins based on model/mode!
    let pluginToLoad = null;
    let systemPromptText = "You are Lux CoWork, an elite conversational orchestrator.";
    
    if (model === 'opencode/big-pickle') {
      pluginToLoad = 'marketing';
    } else if (model === 'anthropic/claude-sonnet-4-5-20250929' || model === 'anthropic/claude-haiku-4-5-20251001') {
      pluginToLoad = 'productivity';
    } else if (model === 'opencode/grok-code') {
      pluginToLoad = 'engineering';
    } else if (model === 'opencode/minimax-m2.5-free' || model === 'opencode/minimax-m2.1-free') {
      pluginToLoad = 'productivity';
    }

    if (pluginToLoad) {
      try {
        const skillsDir = path.join(COWORK_ROOT, 'plugins', pluginToLoad, 'skills');
        if (fs.existsSync(skillsDir)) {
          console.log('[CHAT] Loading specialized skills for plugin:', pluginToLoad);
          const skillFolders = fs.readdirSync(skillsDir);
          let loadedSkills = '';
          for (const folder of skillFolders) {
            const skillFile = path.join(skillsDir, folder, 'SKILL.md');
            if (fs.existsSync(skillFile)) {
              loadedSkills += fs.readFileSync(skillFile, 'utf8') + '\\n\\n';
            }
          }
          if (loadedSkills) {
            systemPromptText += "\\n\\n### Specialized Skill Modules Loaded:\\n" + loadedSkills;
          }
        }
      } catch (e) {
        console.error('[CHAT] Error loading plugins:', e);
      }
    }

    console.log('[CHAT] Using provider:', provider.name);

    for await (const chunk of provider.query({
      prompt: message,
      chatId,
      userId,
      mcpServers,
      model,
      systemPrompt: systemPromptText,
      allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep', 'WebSearch', 'WebFetch', 'TodoWrite', 'Skill'],
      maxTurns: 100
    })) {
      if (chunk.type === 'tool_use') {
        console.log('[SSE] Sending tool_use:', chunk.name);
      }
      if (chunk.type === 'text') {
        console.log('[SSE] Sending text chunk, length:', chunk.content?.length || 0);
      }
      const data = `data: ${JSON.stringify(chunk)}\n\n`;
      res.write(data);
    }

    clearInterval(heartbeatInterval);
    if (!res.writableEnded) {
      res.end();
    }
    console.log('[CHAT] Stream completed');
  } catch (error) {
    clearInterval(heartbeatInterval);
    console.error('[CHAT] Error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    res.end();
  }
});

app.post('/api/abort', (req, res) => {
  const { chatId, provider: providerName = 'opencode' } = req.body;

  if (!chatId) {
    return res.status(400).json({ error: 'chatId is required' });
  }

  try {
    const provider = getProvider(providerName);
    const aborted = provider.abort(chatId);

    if (aborted) {
      console.log('[ABORT] Successfully aborted chatId:', chatId);
      res.json({ success: true, message: 'Query aborted' });
    } else {
      console.log('[ABORT] No active query found for chatId:', chatId);
      res.json({ success: false, message: 'No active query to abort' });
    }
  } catch (error) {
    console.error('[ABORT] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/providers', (_req, res) => {
  res.json({
    providers: getAvailableProviders(),
    default: 'opencode'
  });
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    providers: getAvailableProviders()
  });
});

app.get('/', (_req, res) => {
  if (!fs.existsSync(path.join(RENDERER_DIR, 'index.html'))) {
    return res.status(503).send('Lux CoWork UI is not installed.');
  }
  res.sendFile(path.join(RENDERER_DIR, 'index.html'));
});

app.get(/^(?!\/api\/).*/, (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }

  const hasFileExtension = path.extname(req.path) !== '';
  if (hasFileExtension) {
    return next();
  }

  if (!fs.existsSync(path.join(RENDERER_DIR, 'index.html'))) {
    return res.status(503).send('Lux CoWork UI is not installed.');
  }

  return res.sendFile(path.join(RENDERER_DIR, 'index.html'));
});

await initializeProviders();

const server = app.listen(PORT, () => {
  console.log(`\n✓ Lux CoWork backend running on http://localhost:${PORT}`);
  console.log(`✓ Chat endpoint: POST http://localhost:${PORT}/api/chat`);
  console.log(`✓ Providers endpoint: GET http://localhost:${PORT}/api/providers`);
  console.log(`✓ Health check: GET http://localhost:${PORT}/api/health`);
  console.log(`✓ Available providers: ${getAvailableProviders().join(', ')}\n`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
});

process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
