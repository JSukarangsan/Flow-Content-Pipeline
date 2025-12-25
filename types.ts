export type Platform = 'twitter' | 'linkedin' | 'instagram' | 'newsletter' | 'youtube';

export interface Pillar {
  id: string;
  title: string;
  coreIdea: string;
  topic: string;
  status: 'active' | 'archived';
  themes?: string[]; // "Red threads" or cross-cutting themes
}

// Performance metrics from CSV imports (LinkedIn, Kit/Newsletter)
export interface PerformanceMetrics {
  impressions?: number;
  engagements?: number;
  clicks?: number;
  reactions?: number;
  comments?: number;
  shares?: number;
  // Newsletter-specific (Kit)
  opens?: number;
  openRate?: number;
  clickRate?: number;
  unsubscribes?: number;
  // Computed
  engagementRate?: number;
}

export interface Execution {
  id: string;
  pillarId: string;
  platform: Platform;
  status: 'draft' | 'scheduled' | 'published';
  content: string;
  lastEdited: string;
  // Strategy Copilot fields
  publishedAt?: string;
  performanceScore?: number; // 0-100 computed score for AI analysis
  performanceMetrics?: PerformanceMetrics;
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
  mcp?: MCPConfig;
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

// Strategy Copilot - Weekly Planning
export interface PlannedPost {
  id: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  platform: Platform;
  pillarId: string;
  hook: string; // Opening line/hook
  angle: string; // The specific angle to take
  reasoning: string; // Why this post at this time
  status: 'planned' | 'drafted' | 'approved';
  executionId?: string; // Links to drafted execution
}

export interface WeeklyPlan {
  id: string;
  weekStart: string; // ISO date of the Monday
  status: 'draft' | 'active' | 'completed';
  posts: PlannedPost[];
  createdAt: string;
  insights?: string; // AI-generated insights about the plan
}

// MCP Integration - Notion
export interface NotionIdea {
  id: string;
  title: string;
  url?: string;
  notes?: string;
  tags: string[];
  status: 'unprocessed' | 'used' | 'archived';
  createdAt?: string;
}

export interface MCPConfig {
  enabled: boolean;
  notionDatabaseId?: string;
  lastSyncAt?: string;
}