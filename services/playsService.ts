/**
 * Plays Service for Flow Content Pipeline
 * Manages content multiplication patterns
 */

import { Play, PlayInput, PlayOutput } from './database';
import { Platform } from '../types';
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(API_KEY);

// Starter Play Library
export const BUILTIN_PLAYS: Play[] = [
  {
    id: 'pillar-satellite',
    name: 'Pillar & Satellite',
    description: 'Transform long-form content into multiple platform-specific posts',
    trigger: 'long-form',
    inputs: [
      {
        name: 'core_idea',
        type: 'idea_reference',
        required: true
      },
      {
        name: 'tone',
        type: 'select',
        required: false,
        options: ['professional', 'casual', 'provocative', 'educational']
      }
    ],
    outputs: [
      { platform: 'linkedin', count: 5, description: '5-7 LinkedIn posts' },
      { platform: 'twitter', count: 3, description: '3-5 tweet threads' },
      { platform: 'newsletter', count: 1, description: '1 newsletter section' }
    ],
    promptTemplate: `
You are a content strategist executing the "Pillar & Satellite" play.

Core Idea: {core_idea}
Tone: {tone}

Transform this core idea into multiple pieces of content:

1. LinkedIn Posts (5-7 variations):
   - Each should explore a different angle or sub-topic
   - 1,200-1,500 characters each
   - Professional tone with personal insights
   - Include a strong hook and clear takeaway

2. Twitter Threads (3-5 threads):
   - Each thread 5-8 tweets
   - Different angles than LinkedIn
   - More conversational and punchy
   - Use numbered lists and bullet points

3. Newsletter Section (1 deep dive):
   - 400-600 words
   - Comprehensive exploration of the topic
   - Include examples and actionable advice
   - Suitable for email format

Generate diverse content that feels native to each platform while maintaining the core message.
`,
    isBuiltin: true
  },
  {
    id: 'controversy-cascade',
    name: 'Controversy Cascade',
    description: 'Create a content sequence from a hot take',
    trigger: 'hot-take',
    inputs: [
      {
        name: 'controversial_opinion',
        type: 'text',
        required: true
      },
      {
        name: 'supporting_evidence',
        type: 'text',
        required: false
      }
    ],
    outputs: [
      { platform: 'linkedin', count: 4, description: 'Initial → Defense → Nuance → Lessons' },
      { platform: 'twitter', count: 2, description: 'Hot take thread + Follow-up' },
      { platform: 'newsletter', count: 1, description: 'Full exploration' }
    ],
    promptTemplate: `
You are executing the "Controversy Cascade" play.

Hot Take: {controversial_opinion}
Evidence: {supporting_evidence}

Create a content cascade:

1. Initial Hot Take (LinkedIn Post #1):
   - Bold, attention-grabbing statement
   - 800-1,000 characters
   - Designed to spark discussion

2. Defense/Clarification (LinkedIn Post #2):
   - Address common objections
   - Provide supporting data
   - 1,200 characters

3. Adding Nuance (LinkedIn Post #3):
   - Acknowledge edge cases
   - Show sophisticated thinking
   - 1,000 characters

4. What I Learned (LinkedIn Post #4):
   - Synthesize community feedback
   - Show growth and learning
   - 800 characters

5. Twitter Thread Version:
   - Condensed hot take (5-7 tweets)
   - More provocative framing

6. Newsletter Deep Dive:
   - Complete argument with all nuance
   - 500-700 words
   - Include counterarguments

Make each piece feel like a natural progression, not repetition.
`,
    isBuiltin: true
  },
  {
    id: 'case-study-atomizer',
    name: 'Case Study Atomizer',
    description: 'Break down a client win into multiple content pieces',
    trigger: 'case-study',
    inputs: [
      {
        name: 'case_study',
        type: 'text',
        required: true
      },
      {
        name: 'metrics',
        type: 'text',
        required: true
      },
      {
        name: 'lessons',
        type: 'text',
        required: true
      }
    ],
    outputs: [
      { platform: 'linkedin', count: 3, description: 'Metrics → Lessons → How-to' },
      { platform: 'twitter', count: 2, description: 'Results thread + Process thread' },
      { platform: 'newsletter', count: 1, description: 'Full case study' }
    ],
    promptTemplate: `
You are executing the "Case Study Atomizer" play.

Case Study: {case_study}
Key Metrics: {metrics}
Lessons Learned: {lessons}

Break this down into content pieces:

1. Metrics Focus (LinkedIn Post #1):
   - Lead with impressive numbers
   - Brief context on achievement
   - 1,000 characters

2. Lessons Learned (LinkedIn Post #2):
   - 3-5 key takeaways
   - Applicable to reader's context
   - 1,200 characters

3. How We Did It (LinkedIn Post #3):
   - Step-by-step process
   - Replicable framework
   - 1,500 characters

4. Results Thread (Twitter):
   - Metrics-focused thread (5-7 tweets)
   - Visual/emoji-heavy

5. Process Thread (Twitter):
   - How-to thread (6-8 tweets)
   - Actionable steps

6. Newsletter Case Study:
   - Complete narrative (600-800 words)
   - Background → Challenge → Solution → Results → Lessons
   - Include specific examples

Ensure each piece stands alone while contributing to the overall narrative.
`,
    isBuiltin: true
  }
];

export class PlaysService {
  private model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  /**
   * Execute a play to generate multiple content pieces
   */
  async executePlay(
    play: Play,
    inputs: Record<string, any>,
    settings?: any
  ): Promise<Array<{ platform: Platform; content: string }>> {
    try {
      // Build the prompt from template
      let prompt = play.promptTemplate;

      // Replace placeholders with actual values
      for (const [key, value] of Object.entries(inputs)) {
        const placeholder = `{${key}}`;
        prompt = prompt.replace(new RegExp(placeholder, 'g'), value || '');
      }

      // Add user's global voice if available
      if (settings?.globalVoice) {
        prompt += `\n\nBrand Voice Guidelines: ${settings.globalVoice}`;
      }

      // Generate content
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse the response into platform-specific content
      return this.parsePlayOutput(text, play.outputs);
    } catch (error) {
      console.error('Play execution failed:', error);
      throw error;
    }
  }

  /**
   * Parse AI response into structured platform content
   */
  private parsePlayOutput(
    text: string,
    expectedOutputs: PlayOutput[]
  ): Array<{ platform: Platform; content: string }> {
    const results: Array<{ platform: Platform; content: string }> = [];

    // Split by platform sections
    const sections = text.split(/\n(?=\d\.|#{1,2}\s)/);

    for (const output of expectedOutputs) {
      const platform = output.platform as Platform;

      // Find sections for this platform
      const platformSections = sections.filter(section =>
        section.toLowerCase().includes(platform.toLowerCase()) ||
        section.toLowerCase().includes(this.getPlatformAlias(platform))
      );

      // Extract content for each expected piece
      for (let i = 0; i < output.count; i++) {
        if (platformSections[i]) {
          // Clean up the content
          let content = platformSections[i]
            .replace(/^\d+\.\s*/, '') // Remove numbering
            .replace(/^#{1,2}\s*.*?\n/, '') // Remove headers
            .replace(/^.*?:\s*\n?/, '') // Remove labels
            .trim();

          results.push({ platform, content });
        }
      }
    }

    // Fallback: if parsing fails, split evenly
    if (results.length === 0) {
      const totalExpected = expectedOutputs.reduce((sum, o) => sum + o.count, 0);
      const contentPerPiece = Math.ceil(text.length / totalExpected);

      let offset = 0;
      for (const output of expectedOutputs) {
        for (let i = 0; i < output.count; i++) {
          const content = text.substring(offset, offset + contentPerPiece).trim();
          results.push({ platform: output.platform as Platform, content });
          offset += contentPerPiece;
        }
      }
    }

    return results;
  }

  private getPlatformAlias(platform: string): string {
    const aliases: Record<string, string> = {
      'twitter': 'tweet',
      'linkedin': 'linkedin',
      'newsletter': 'email',
      'instagram': 'insta',
      'youtube': 'video'
    };
    return aliases[platform] || platform;
  }

  /**
   * Get all available plays (builtin + custom)
   */
  async getAllPlays(): Promise<Play[]> {
    // In future, this would also fetch custom plays from database
    return BUILTIN_PLAYS;
  }

  /**
   * Get a specific play by ID
   */
  async getPlay(id: string): Promise<Play | undefined> {
    const plays = await this.getAllPlays();
    return plays.find(p => p.id === id);
  }

  /**
   * Validate play inputs
   */
  validateInputs(play: Play, inputs: Record<string, any>): string[] {
    const errors: string[] = [];

    for (const input of play.inputs) {
      if (input.required && !inputs[input.name]) {
        errors.push(`Missing required input: ${input.name}`);
      }

      if (input.type === 'select' && input.options && inputs[input.name]) {
        if (!input.options.includes(inputs[input.name])) {
          errors.push(`Invalid option for ${input.name}`);
        }
      }
    }

    return errors;
  }
}

// Export singleton instance
export const playsService = new PlaysService();