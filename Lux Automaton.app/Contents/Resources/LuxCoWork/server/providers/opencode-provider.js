import { createOpencodeClient } from '@opencode-ai/sdk';
import { BaseProvider } from './base-provider.js';

export class OpencodeProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.client = null;
    this.serverInstance = null;
    this.defaultModel = config.model;
    this.hostname = config.hostname || '127.0.0.1';
    this.port = config.port || 4096;
    this.useExistingServer = config.useExistingServer !== false;
    this.existingServerUrl = config.existingServerUrl || null;
    this.abortControllers = new Map();
  }

  get name() {
    return 'opencode';
  }

  abort(chatId) {
    const controller = this.abortControllers.get(chatId);
    if (controller) {
      console.log('[Opencode] Aborting query for chatId:', chatId);
      controller.abort();
      this.abortControllers.delete(chatId);
      return true;
    }
    return false;
  }

  async initialize() {
    if (this.client) return;

    try {
      let connectionWorked = false;
      const url = this.existingServerUrl || `http://${this.hostname}:${this.port}`;

      if (this.useExistingServer) {
        console.log('[Opencode] Testing connection to existing server at:', url);
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1200);
          const res = await fetch(`${url}/api/health`, { signal: controller.signal });
          clearTimeout(timeoutId);
          
          if (res.ok) {
            console.log('[Opencode] Successfully verified connection to existing server at:', url);
            this.client = createOpencodeClient({
              baseUrl: url
            });
            connectionWorked = true;
          }
        } catch (e) {
          console.log('[Opencode] Existing server not responding. Falling back to spawning local server.');
        }
      }

      if (!connectionWorked) {
        const { createOpencode } = await import('@opencode-ai/sdk');
        console.log('[Opencode] Creating new server on', this.hostname, ':', this.port);
        const { client, server } = await createOpencode({
          hostname: this.hostname,
          port: this.port
        });
        this.client = client;
        this.serverInstance = server;
      }
      console.log('[Opencode] Initialized successfully');
    } catch (error) {
      console.error('[Opencode] Initialization error:', error);
      throw error;
    }
  }

  buildMcpConfig(mcpServers) {
    const mcpConfig = {};

    for (const [name, config] of Object.entries(mcpServers)) {
      if (config.type === 'http' || config.type === 'remote') {
        mcpConfig[name] = {
          type: 'remote',
          url: config.url,
          headers: config.headers || {}
        };
      } else if (config.type === 'local') {
        mcpConfig[name] = {
          type: 'local',
          command: config.command,
          args: config.args || [],
          environment: config.env || {}
        };
      }
    }

    return mcpConfig;
  }

  async *query(params) {
    const {
      prompt,
      chatId,
      mcpServers = {},
      model = null
    } = params;

    const modelToUse = model || this.defaultModel || 'opencode/minimax-m2.5-free';
    console.log('[Opencode] Using model:', modelToUse);

    await this.initialize();

    let sessionId = chatId ? this.getSession(chatId) : null;
    console.log('[Opencode] Session for', chatId, ':', sessionId || 'new');

    const abortController = new AbortController();
    if (chatId) {
      this.abortControllers.set(chatId, abortController);
    }

    try {
      if (!sessionId) {
        console.log('[Opencode] Creating session with model:', modelToUse);
        const sessionConfig = { model: modelToUse };
        if (params.systemPrompt) {
          sessionConfig.systemPrompt = params.systemPrompt;
        }
        
        const sessionResult = await this.client.session.create({
          body: {
            config: sessionConfig
          }
        });
        sessionId = sessionResult.data?.id || sessionResult.id;
        if (chatId && sessionId) {
          this.setSession(chatId, sessionId);
        }
        console.log('[Opencode] Session:', sessionId);

        yield {
          type: 'session_init',
          session_id: sessionId,
          provider: this.name
        };
      }

      const [providerID, ...modelParts] = modelToUse.split('/');
      const modelID = modelParts.join('/');

      console.log('[Opencode] Sending sync prompt to session:', sessionId);

      // Use the synchronous prompt method which waits for completion
      const result = await this.client.session.prompt({
        path: { id: sessionId },
        body: {
          model: { providerID, modelID },
          parts: [{ type: 'text', text: prompt }]
        }
      });

      console.log('[Opencode] Got response, type:', typeof result);
      console.log('[Opencode] Response keys:', Object.keys(result || {}).join(', '));

      const data = result?.data || result;
      console.log('[Opencode] Data keys:', Object.keys(data || {}).join(', '));

      // Extract assistant text from the response
      let assistantText = '';
      const parts = data?.parts || data?.info?.parts || [];
      
      if (parts.length > 0) {
        for (const part of parts) {
          if (part.type === 'text' && part.text) {
            assistantText += part.text;
          } else if (part.type === 'tool-invocation' || part.type === 'tool_invocation') {
            const toolId = part.toolInvocationId || part.callID || part.id;
            const toolName = part.toolName || part.tool || part.name;
            const toolArgs = part.state?.input || part.args || part.input || {};
            
            console.log('[Opencode] Tool call:', toolName);
            yield {
              type: 'tool_use',
              name: toolName,
              input: toolArgs,
              id: toolId,
              provider: this.name
            };
          }
        }
      }

      // Try alternative response locations
      if (!assistantText) {
        assistantText = data?.text || data?.content || data?.message || '';
      }

      // If we still have nothing, try the messages list
      if (!assistantText && data?.messages) {
        const msgs = Array.isArray(data.messages) ? data.messages : [];
        const assistantMsg = msgs.find(m => (m.info?.role || m.role) === 'assistant');
        if (assistantMsg) {
          const aParts = assistantMsg.parts || assistantMsg.info?.parts || [];
          for (const p of aParts) {
            if (p.type === 'text' && p.text) assistantText += p.text;
          }
        }
      }

      console.log('[Opencode] Extracted text length:', assistantText.length);
      console.log('[Opencode] Text preview:', assistantText.slice(0, 200));

      if (assistantText) {
        yield {
          type: 'text',
          content: assistantText,
          provider: this.name
        };
      } else {
        // Last resort: try raw HTTP to the opencode server API
        console.log('[Opencode] No text from SDK, trying raw HTTP fallback...');
        const serverUrl = this.existingServerUrl || `http://${this.hostname}:${this.port}`;
        
        try {
          const httpRes = await fetch(`${serverUrl}/api/session/${sessionId}/message`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
          });
          
          if (httpRes.ok) {
            const messages = await httpRes.json();
            console.log('[Opencode] Raw messages count:', Array.isArray(messages) ? messages.length : 'not array');
            
            const msgList = Array.isArray(messages) ? messages : messages?.data || [];
            // Find the latest assistant message
            for (let i = msgList.length - 1; i >= 0; i--) {
              const msg = msgList[i];
              const role = msg?.info?.role || msg?.role;
              if (role === 'assistant') {
                const mParts = msg?.parts || msg?.info?.parts || [];
                for (const p of mParts) {
                  if (p.type === 'text' && p.text) {
                    assistantText += p.text;
                  }
                }
                break;
              }
            }
            
            if (assistantText) {
              console.log('[Opencode] Got text from raw HTTP, length:', assistantText.length);
              yield {
                type: 'text',
                content: assistantText,
                provider: this.name
              };
            }
          }
        } catch (httpErr) {
          console.log('[Opencode] Raw HTTP fallback failed:', httpErr.message);
        }
      }

      if (!assistantText) {
        console.log('[Opencode] Full response dump:', JSON.stringify(data).slice(0, 1000));
        yield {
          type: 'text',
          content: 'The AI model processed your request but returned no text. This may be a temporary issue with the model. Please try again.',
          provider: this.name
        };
      }

      yield {
        type: 'done',
        provider: this.name
      };
      console.log('[Opencode] Query completed');

    } catch (error) {
      console.error('[Opencode] Query error:', error);
      yield {
        type: 'error',
        message: error.message,
        provider: this.name
      };
    } finally {
      if (chatId) {
        this.abortControllers.delete(chatId);
      }
    }
  }

  async cleanup() {
    await super.cleanup();
    if (this.serverInstance) {
      try {
        await this.serverInstance.close();
        console.log('[Opencode] Server closed');
      } catch (e) {
        console.error('[Opencode] Error closing server:', e);
      }
    }
    this.client = null;
    this.serverInstance = null;
  }
}