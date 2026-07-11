import { AIExecutionSuggestion, Platform, UserSettings, Pillar } from '../types';

const API_BASE = '/api';

const post = async (path: string, body: object) => {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

export const generatePillarIdeas = async (
  topic: string,
  settings: UserSettings
): Promise<{ title: string; coreIdea: string }[]> => {
  return post('/generate-pillars', { topic, voice: settings.globalVoice });
};

export const generateExecutions = async (
  pillarIdea: string,
  platforms: Platform[],
  extraInstructions: string,
  settings: UserSettings
): Promise<AIExecutionSuggestion[]> => {
  return post('/generate-executions', {
    pillarIdea,
    platforms,
    extraInstructions,
    voice: settings.globalVoice,
  });
};

export const refineCopy = async (
  currentContent: string,
  instruction: string,
  settings: UserSettings
): Promise<string> => {
  const data = await post('/refine-copy', {
    content: currentContent,
    instruction,
    voice: settings.globalVoice,
  });
  return data.content;
};

export const analyzeThemes = async (
  pillars: Pillar[],
  settings: UserSettings
): Promise<{ pillarId: string; themes: string[] }[]> => {
  return post('/analyze-themes', { pillars });
};
