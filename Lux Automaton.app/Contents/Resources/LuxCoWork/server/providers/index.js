import { OpencodeProvider } from './opencode-provider.js';

const providers = {
  opencode: OpencodeProvider
};

const providerInstances = new Map();

export function getProvider(providerName, config = {}) {
  const name = providerName?.toLowerCase() || 'opencode';

  if (!providers[name]) {
    throw new Error(`Unknown provider: ${name}. Available providers: ${Object.keys(providers).join(', ')}`);
  }

  const cacheKey = `${name}:${JSON.stringify(config)}`;
  if (providerInstances.has(cacheKey)) {
    return providerInstances.get(cacheKey);
  }

  const ProviderClass = providers[name];
  const instance = new ProviderClass(config);
  providerInstances.set(cacheKey, instance);

  return instance;
}

export function getAvailableProviders() {
  return Object.keys(providers);
}

export function registerProvider(name, ProviderClass) {
  providers[name.toLowerCase()] = ProviderClass;
}

export async function clearProviderCache() {
  for (const instance of providerInstances.values()) {
    if (instance.cleanup) {
      await instance.cleanup();
    }
  }
  providerInstances.clear();
}

export async function initializeProviders() {
  console.log('[Providers] Initializing providers...');
  try {
    const opencodeProvider = getProvider('opencode');
    await opencodeProvider.initialize();
    console.log('[Providers] Opencode provider initialized');
  } catch (error) {
    console.error('[Providers] Error initializing providers:', error.message);
  }
}

export { OpencodeProvider } from './opencode-provider.js';
export { BaseProvider } from './base-provider.js';