import { GoogleGenAI, Type } from "@google/genai";
import { AIExecutionSuggestion, Platform } from '../types';

// Initialize the client safely
const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY is missing from environment");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generatePillarIdeas = async (topic: string): Promise<{ title: string; coreIdea: string }[]> => {
  const ai = getAiClient();
  if (!ai) throw new Error("API Key not configured");

  const prompt = `Generate 3 contrarian or insightful content pillar ideas for the topic: "${topic}". 
  Avoid generic advice. Focus on strong opinions or specific methodologies.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
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

export const generateExecutions = async (coreIdea: string): Promise<AIExecutionSuggestion[]> => {
  const ai = getAiClient();
  if (!ai) throw new Error("API Key not configured");

  const prompt = `You are an expert social media strategist. 
  Based on this core idea: "${coreIdea}", generate 3 distinct social media posts for different platforms (LinkedIn, Twitter, Newsletter).
  Adapt the tone and formatting for each platform perfectly.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              platform: { type: Type.STRING, enum: ['linkedin', 'twitter', 'newsletter', 'youtube'] },
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

export const refineCopy = async (currentCopy: string, instructions: string): Promise<string> => {
  const ai = getAiClient();
  if (!ai) throw new Error("API Key not configured");

  const prompt = `Refine the following content based on these instructions: "${instructions}".
  
  Current Content:
  """
  ${currentCopy}
  """
  
  Return only the refined content text.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || currentCopy;
  } catch (error) {
    console.error("Error refining copy:", error);
    return currentCopy;
  }
};