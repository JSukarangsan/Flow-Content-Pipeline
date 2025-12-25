import { Play } from './types';

export const PLAYS: Play[] = [
  {
    id: 'pillar-satellite',
    name: 'Pillar & Satellite',
    description: 'Transform a long-form piece into multiple platform-specific posts that orbit around the core idea.',
    trigger: 'long-form',
    icon: '🛰️',
    inputs: [
      {
        id: 'pillar',
        label: 'Select Pillar',
        type: 'pillar-select',
        placeholder: 'Choose a pillar to expand',
        required: true,
      },
      {
        id: 'angle',
        label: 'Specific Angle (Optional)',
        type: 'text',
        placeholder: 'e.g., "Focus on the controversial aspects"',
        required: false,
      },
    ],
    outputs: [
      { platform: 'linkedin', description: '3-5 LinkedIn posts with different hooks' },
      { platform: 'twitter', description: '2-3 tweet threads or standalone tweets' },
      { platform: 'newsletter', description: '1 newsletter section/teaser' },
    ],
    promptTemplate: `You are a content strategist helping multiply a core idea into platform-specific content.

CORE IDEA (from Pillar):
"""
{{coreIdea}}
"""

PILLAR TITLE: {{title}}

{{#if angle}}
SPECIFIC ANGLE TO EMPHASIZE: {{angle}}
{{/if}}

Generate content for each platform that:
1. Maintains the core message but adapts tone and format
2. Uses different hooks/angles to reach different audiences
3. Feels native to each platform

Generate the following outputs:
- 3 LinkedIn posts (professional, thought-leadership tone, use line breaks)
- 2 Twitter posts (punchy, conversational, under 280 chars each OR thread format)
- 1 Newsletter section (personal, deeper dive, can be longer)

Each piece should stand alone but connect back to the core idea.`,
  },
  {
    id: 'case-study-atomizer',
    name: 'Case Study Atomizer',
    description: 'Break down a client win or project into multiple content pieces: metrics, lessons, and how-to threads.',
    trigger: 'case-study',
    icon: '🔬',
    inputs: [
      {
        id: 'client',
        label: 'Client/Project Name',
        type: 'text',
        placeholder: 'e.g., "Acme Corp redesign"',
        required: true,
      },
      {
        id: 'challenge',
        label: 'The Challenge',
        type: 'textarea',
        placeholder: 'What problem were you solving?',
        required: true,
      },
      {
        id: 'solution',
        label: 'The Solution',
        type: 'textarea',
        placeholder: 'What did you do? Key actions taken.',
        required: true,
      },
      {
        id: 'results',
        label: 'The Results',
        type: 'textarea',
        placeholder: 'Metrics, outcomes, testimonials. Be specific.',
        required: true,
      },
    ],
    outputs: [
      { platform: 'linkedin', description: '1 metrics-focused post + 1 lessons learned post' },
      { platform: 'twitter', description: '1 "How we did it" thread' },
      { platform: 'newsletter', description: '1 detailed case study section' },
    ],
    promptTemplate: `You are a content strategist turning a case study into multiple content pieces.

CASE STUDY DETAILS:
Client/Project: {{client}}

Challenge:
"""
{{challenge}}
"""

Solution:
"""
{{solution}}
"""

Results:
"""
{{results}}
"""

Generate content that showcases this success story from different angles:

1. LINKEDIN - Metrics Post: Lead with the impressive numbers. Make it scannable with line breaks. End with a takeaway.

2. LINKEDIN - Lessons Learned Post: Focus on 3-5 key learnings from this project. Be humble but valuable.

3. TWITTER - "How We Did It" Thread: Break down the process into 5-7 tweets. Start with the hook (result), then walk through the journey.

4. NEWSLETTER - Case Study Section: Deeper dive with context. Include the challenge, approach, and results. Personal reflection welcome.

Make each piece feel authentic and valuable on its own.`,
  },
  {
    id: 'question-flip',
    name: 'Question Flip',
    description: 'Take a common question you keep answering and turn it into content from multiple angles.',
    trigger: 'question',
    icon: '🔄',
    inputs: [
      {
        id: 'question',
        label: 'The Question',
        type: 'text',
        placeholder: 'e.g., "Should I learn to code as a designer?"',
        required: true,
      },
      {
        id: 'directAnswer',
        label: 'Your Direct Answer',
        type: 'textarea',
        placeholder: 'How do you typically answer this?',
        required: true,
      },
      {
        id: 'nuance',
        label: 'The Nuance (Optional)',
        type: 'textarea',
        placeholder: 'What context or caveats do you usually add?',
        required: false,
      },
    ],
    outputs: [
      { platform: 'linkedin', description: '1 direct answer post + 1 contrarian angle post' },
      { platform: 'twitter', description: '1 hot take tweet + 1 nuanced thread' },
      { platform: 'newsletter', description: '1 deep-dive on the topic' },
    ],
    promptTemplate: `You are a content strategist creating multiple content pieces from a frequently asked question.

THE QUESTION: "{{question}}"

YOUR ANSWER:
"""
{{directAnswer}}
"""

{{#if nuance}}
ADDITIONAL NUANCE:
"""
{{nuance}}
"""
{{/if}}

Generate content that explores this question from multiple angles:

1. LINKEDIN - Direct Answer: Start with the question as a hook. Give a clear, opinionated answer. Use line breaks for readability.

2. LINKEDIN - Contrarian Angle: Challenge the premise of the question OR take an unexpected stance. Make people think.

3. TWITTER - Hot Take: One punchy tweet that captures your core belief. Designed to spark engagement.

4. TWITTER - Nuanced Thread: 4-6 tweets that break down the "it depends" factors. Show depth of thought.

5. NEWSLETTER - Deep Dive: Explore the question thoroughly. Include your journey/experience with this topic. Be personal.

Each piece should feel like a fresh take, not repetitive.`,
  },
];

export const getPlayById = (id: string): Play | undefined => {
  return PLAYS.find(p => p.id === id);
};
