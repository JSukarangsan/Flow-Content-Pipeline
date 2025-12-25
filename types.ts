export type Platform = 'twitter' | 'linkedin' | 'instagram' | 'newsletter' | 'youtube';

export interface Pillar {
  id: string;
  title: string;
  coreIdea: string;
  topic: string;
  status: 'active' | 'archived';
  themes?: string[]; // "Red threads" or cross-cutting themes
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
  column: 0 | 1 | 2; // 0: Pillars, 1: Executions, 2: Editor
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
  apiKey: string;
  platforms: Record<Platform, PlatformSettings>;
}

// Editor history for undo/redo
export interface EditorHistory {
  past: string[];
  present: string;
  future: string[];
}

// Plays System
export type PlayTrigger = 'long-form' | 'case-study' | 'question';

export interface PlayInput {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'pillar-select';
  placeholder: string;
  required: boolean;
}

export interface PlayOutput {
  platform: Platform;
  description: string;
}

export interface Play {
  id: string;
  name: string;
  description: string;
  trigger: PlayTrigger;
  icon: string; // Emoji or icon identifier
  inputs: PlayInput[];
  outputs: PlayOutput[];
  promptTemplate: string; // Template for AI generation
}

export interface PlayExecutionResult {
  playId: string;
  pillarId: string;
  outputs: {
    platform: Platform;
    content: string;
  }[];
}