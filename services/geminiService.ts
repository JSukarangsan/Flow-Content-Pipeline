import { GoogleGenAI, Type } from "@google/genai";
import { AIExecutionSuggestion, Platform, UserSettings, Pillar, Play, Execution, PlannedPost, NotionIdea } from '../types';

// Initialize the client with user-provided API key
const getAiClient = (settings: UserSettings) => {
  // Try user-provided key first, fall back to env var
  const apiKey = settings.apiKey || process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY is not configured. Add it in Settings.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generatePillarIdeas = async (topic: string, settings: UserSettings): Promise<{ title: string; coreIdea: string }[]> => {
  const ai = getAiClient(settings);
  if (!ai) throw new Error("API Key not configured. Add your Gemini API key in Settings.");

  const prompt = `Generate 3 contrarian or insightful content pillar ideas for the topic: "${topic}". 
  Avoid generic advice. Focus on strong opinions or specific methodologies.
  
  Style Guide: ${settings.globalVoice}`;

  try {
    const response = await ai.models.generateContent({
      model: settings.model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              coreIdea: { type: Type.STRING },
            },
            required: ['title', 'coreIdea'],
          },
        },
      },
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Error generating pillars:", error);
    throw error;
  }
};

export const analyzeThemes = async (pillars: Pillar[], settings: UserSettings): Promise<{ pillarId: string; themes: string[] }[]> => {
  const ai = getAiClient(settings);
  if (!ai) throw new Error("API Key not configured. Add your Gemini API key in Settings.");

  const pillarsInput = pillars.map(p => ({ id: p.id, title: p.title, coreIdea: p.coreIdea, topic: p.topic }));

  const prompt = `Analyze the following content pillars. Identify recurring "Red Thread" themes that connect them. 
  These themes should be distinct from their broad topics (e.g. "Productivity"). 
  They should be specific narrative arcs or connective tissues (e.g., "Async First", "Human vs Machine", "Systems Thinking").
  
  1. Identify 3-6 strong cross-cutting themes across the dataset.
  2. Assign 1-2 themes to EACH pillar.
  3. Ensure every pillar has at least one theme.
  
  Input Pillars:
  ${JSON.stringify(pillarsInput, null, 2)}
  
  Return a JSON array mapping pillar IDs to their new themes.`;

  try {
    const response = await ai.models.generateContent({
      model: settings.model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              pillarId: { type: Type.STRING },
              themes: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['pillarId', 'themes'],
          },
        },
      },
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Error analyzing themes:", error);
    throw error;
  }
};

export const generateExecutions = async (
  coreIdea: string,
  platforms: Platform[],
  instructions: string,
  settings: UserSettings
): Promise<AIExecutionSuggestion[]> => {
  const ai = getAiClient(settings);
  if (!ai) throw new Error("API Key not configured. Add your Gemini API key in Settings.");

  const platformString = platforms.join(', ');

  // Build platform specific prompts
  const platformInstructions = platforms.map(p => {
    const config = settings.platforms[p];
    return `
    --- ${p.toUpperCase()} GUIDELINES ---
    Format/Style: ${config.customPrompt}
    ${config.writingSamples ? `Reference Examples (Writing Style ONLY):\n${config.writingSamples}` : ''}
    `;
  }).join('\n');
  
  const prompt = `You are an expert social media strategist with the following voice: "${settings.globalVoice}".
  
  Based on this core idea: "${coreIdea}", generate distinct social media posts for these platforms: ${platformString}.
  
  Additional User Instructions: "${instructions || "Optimize for high engagement."}"
  
  Apply the following specific guidelines for each platform:
  ${platformInstructions}
  
  Adapt the tone, formatting, and length for each platform perfectly based on the guidelines above.`;

  try {
    const response = await ai.models.generateContent({
      model: settings.model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              platform: { type: Type.STRING, enum: ['linkedin', 'twitter', 'newsletter', 'youtube', 'instagram'] },
              content: { type: Type.STRING },
              reasoning: { type: Type.STRING },
            },
            required: ['platform', 'content', 'reasoning'],
          },
        },
      },
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Error generating executions:", error);
    throw error;
  }
};

export const refineCopy = async (currentCopy: string, instructions: string, settings: UserSettings): Promise<string> => {
  const ai = getAiClient(settings);
  if (!ai) throw new Error("API Key not configured. Add your Gemini API key in Settings.");

  const prompt = `You are an expert editor with this voice: "${settings.globalVoice}".
  
  Refine the following content based on these specific instructions: "${instructions}".
  
  Current Content:
  """
  ${currentCopy}
  """
  
  Return only the refined content text. Do not add markdown code blocks or explanations.`;

  try {
    const response = await ai.models.generateContent({
      model: settings.model,
      contents: prompt,
    });

    return response.text || currentCopy;
  } catch (error) {
    console.error("Error refining copy:", error);
    return currentCopy;
  }
};

// Play execution
export interface PlayExecutionOutput {
  platform: Platform;
  content: string;
  description: string;
}

export const executePlay = async (
  play: Play,
  inputValues: Record<string, string>,
  pillar: Pillar | null,
  settings: UserSettings
): Promise<PlayExecutionOutput[]> => {
  const ai = getAiClient(settings);
  if (!ai) throw new Error("API Key not configured. Add your Gemini API key in Settings.");

  // Build the prompt by replacing template variables
  let prompt = play.promptTemplate;

  // Replace pillar-related variables if pillar is selected
  if (pillar) {
    prompt = prompt.replace(/\{\{coreIdea\}\}/g, pillar.coreIdea);
    prompt = prompt.replace(/\{\{title\}\}/g, pillar.title);
    prompt = prompt.replace(/\{\{topic\}\}/g, pillar.topic);
  }

  // Replace input values
  Object.entries(inputValues).forEach(([key, value]) => {
    // Handle conditional blocks {{#if key}}...{{/if}}
    const conditionalRegex = new RegExp(`\\{\\{#if ${key}\\}\\}([\\s\\S]*?)\\{\\{/if\\}\\}`, 'g');
    if (value && value.trim()) {
      prompt = prompt.replace(conditionalRegex, '$1');
      prompt = prompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    } else {
      prompt = prompt.replace(conditionalRegex, '');
    }
  });

  // Add voice and platform guidelines
  const platformGuidelines = play.outputs.map(output => {
    const config = settings.platforms[output.platform];
    return `
--- ${output.platform.toUpperCase()} ---
Expected: ${output.description}
Format Guidelines: ${config.customPrompt}
${config.writingSamples ? `Style Reference:\n${config.writingSamples}` : ''}
    `;
  }).join('\n');

  const fullPrompt = `${prompt}

VOICE/TONE TO USE: ${settings.globalVoice}

PLATFORM-SPECIFIC GUIDELINES:
${platformGuidelines}

Return your response as a JSON array where each item has:
- platform: the platform name (lowercase)
- content: the generated content
- description: a brief note on what this piece is (e.g., "Metrics-focused post", "Hot take tweet")`;

  try {
    const response = await ai.models.generateContent({
      model: settings.model,
      contents: fullPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              platform: { type: Type.STRING, enum: ['linkedin', 'twitter', 'newsletter', 'youtube', 'instagram'] },
              content: { type: Type.STRING },
              description: { type: Type.STRING },
            },
            required: ['platform', 'content', 'description'],
          },
        },
      },
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Error executing play:", error);
    throw error;
  }
};

// Weekly Plan generation
export interface WeeklyPlanInput {
  pillars: Pillar[];
  topPerformingContent: Execution[];
  platformMix: Platform[];
  postsPerWeek: number;
  notionIdeas?: NotionIdea[];
}

export interface GeneratedPlan {
  posts: Omit<PlannedPost, 'id' | 'status' | 'executionId'>[];
  insights: string;
}

export const generateWeeklyPlan = async (
  input: WeeklyPlanInput,
  settings: UserSettings
): Promise<GeneratedPlan> => {
  const ai = getAiClient(settings);
  if (!ai) throw new Error("API Key not configured. Add your Gemini API key in Settings.");

  // Prepare top performing content summary
  const topContentSummary = input.topPerformingContent
    .slice(0, 10)
    .map(e => ({
      platform: e.platform,
      score: e.performanceScore,
      snippet: e.content.slice(0, 200),
      pillarId: e.pillarId,
    }));

  // Prepare pillar summaries
  const pillarSummary = input.pillars.map(p => ({
    id: p.id,
    title: p.title,
    coreIdea: p.coreIdea,
    themes: p.themes,
  }));

  // Prepare Notion ideas if available
  const notionIdeasSection = input.notionIdeas && input.notionIdeas.length > 0
    ? `\n\nEXTERNAL IDEAS FROM NOTION (prioritize incorporating these):\n${JSON.stringify(
        input.notionIdeas.map(idea => ({
          title: idea.title,
          notes: idea.notes,
          tags: idea.tags,
          url: idea.url,
        })),
        null,
        2
      )}`
    : '';

  const prompt = `You are a content strategist creating a weekly content plan.

AVAILABLE PILLARS:
${JSON.stringify(pillarSummary, null, 2)}

TOP PERFORMING CONTENT (for style/topic inspiration):
${JSON.stringify(topContentSummary, null, 2)}${notionIdeasSection}

PLATFORM MIX TO USE: ${input.platformMix.join(', ')}
TARGET POSTS THIS WEEK: ${input.postsPerWeek}

VOICE/TONE: ${settings.globalVoice}

Create a weekly content plan that:
1. Distributes posts strategically across the week (0=Sunday, 1=Monday, etc.)
2. Balances different pillars and themes
3. Uses insights from top-performing content to inform hooks and angles
4. Varies the platforms according to the platform mix
5. Provides a compelling hook (opening line) for each post
6. Explains the reasoning behind each post's timing and angle
${input.notionIdeas && input.notionIdeas.length > 0 ? '7. IMPORTANT: Incorporate the Notion ideas provided - use them as inspiration for specific posts' : ''}

Also provide overall insights about the plan - what themes are emphasized, any strategic recommendations, etc.`;

  try {
    const response = await ai.models.generateContent({
      model: settings.model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            posts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  dayOfWeek: { type: Type.NUMBER },
                  platform: { type: Type.STRING, enum: ['linkedin', 'twitter', 'newsletter', 'youtube', 'instagram'] },
                  pillarId: { type: Type.STRING },
                  hook: { type: Type.STRING },
                  angle: { type: Type.STRING },
                  reasoning: { type: Type.STRING },
                },
                required: ['dayOfWeek', 'platform', 'pillarId', 'hook', 'angle', 'reasoning'],
              },
            },
            insights: { type: Type.STRING },
          },
          required: ['posts', 'insights'],
        },
      },
    });

    const text = response.text;
    if (!text) return { posts: [], insights: '' };
    return JSON.parse(text);
  } catch (error) {
    console.error("Error generating weekly plan:", error);
    throw error;
  }
};