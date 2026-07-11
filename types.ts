export type Platform = 'twitter' | 'linkedin' | 'instagram' | 'newsletter' | 'youtube';

export interface Pillar {
  id: string;
  title: string;
  coreIdea: string;
  topic: string;
  status: 'active' | 'archived' | 'backlog';
  themes?: string[]; // "Red threads" or cross-cutting themes
  priority?: 'high' | 'medium' | 'low';
  audience?: string[]; // e.g. ['product-leaders', 'designers']
}

export interface Execution {
  id: string;
  pillarId: string;
  platform: Platform;
  status: 'draft' | 'scheduled' | 'published';
  content: string;
  lastEdited: string;
}

export interface NavState {
  column: 0 | 1; // 0: Ideas, 1: Editor panel
  editing: boolean; // If true, keyboard nav is disabled (for typing in editor)
}

// For Gemini API responses
export interface AIExecutionSuggestion {
  platform: Platform;
  content: string;
  reasoning: string;
}

// Settings
export interface PlatformSettings {
  customPrompt: string;
  writingSamples: string;
}

export interface UserSettings {
  model: string;
  globalVoice: string;
  platforms: Record<Platform, PlatformSettings>;
}