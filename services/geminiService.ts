import { GoogleGenAI, Type } from "@google/genai";
import { AIExecutionSuggestion, Platform, UserSettings, Pillar } from '../types';

// Initialize the client safely
const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY is missing from environment");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generatePillarIdeas = async (topic: string, settings: UserSettings): Promise<{ title: string; coreIdea: string }[]> => {
  const ai = getAiClient();
  if (!ai) throw new Error("API Key not configured");

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
  const ai = getAiClient();
  if (!ai) throw new Error("API Key not configured");

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
  const ai = getAiClient();
  if (!ai) throw new Error("API Key not configured");

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
  const ai = getAiClient();
  if (!ai) throw new Error("API Key not configured");

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