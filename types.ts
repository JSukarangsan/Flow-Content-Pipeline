export type Platform = 'twitter' | 'linkedin' | 'instagram' | 'newsletter' | 'youtube';

export interface Pillar {
  id: string;
  title: string;
  coreIdea: string;
  topic: string;
  status: 'active' | 'archived';
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