import type { LLMProvider, AppTab, LoadingProgress } from '../types/app';

export const IS_PLATFORM = true;

export const DEFAULT_PROVIDER: LLMProvider = 'claude';

export const TABS: AppTab[] = ['chat', 'files', 'shell', 'git', 'tasks', 'preview'];

export const APP_LOGO = './assets/logo.png';

export const INITIAL_PROJECT_STATE = [];

export const INITIAL_LOADING_PROGRESS: LoadingProgress | null = null;

export const INITIAL_ACTIVE_TAB: AppTab = 'chat';

export const SETTINGS_TABS = ['agents', 'models', 'tools', 'appearance', 'notifications'];

export const PROVIDERS: LLMProvider[] = ['claude', 'cursor', 'codex', 'gemini'];