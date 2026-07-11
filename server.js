import express from 'express';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const app = express();
app.use(express.json());

const runClaude = async (prompt) => {
  const { stdout } = await execFileAsync('claude', ['-p', prompt, '--output-format', 'text'], {
    timeout: 60000,
    maxBuffer: 1024 * 1024,
  });
  return stdout.trim();
};

const extractJson = (text) => {
  const match = text.match(/\[[\s\S]*\]/);
  if (match) return JSON.parse(match[0]);
  throw new Error('No JSON array in response');
};

app.post('/api/generate-pillars', async (req, res) => {
  const { topic, voice } = req.body;
  const prompt = `Generate 3 contrarian or insightful content pillar ideas for the topic: "${topic}".
Avoid generic advice. Focus on strong opinions or specific methodologies.
Style Guide: ${voice || ''}
Return ONLY a JSON array, no other text:
[{"title": "...", "coreIdea": "..."}, ...]`;

  try {
    const text = await runClaude(prompt);
    res.json(extractJson(text));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/generate-executions', async (req, res) => {
  const { pillarIdea, platforms, extraInstructions, voice } = req.body;
  const platformSpecs = {
    twitter:    { maxChars: 280,  style: 'Punchy, conversational' },
    linkedin:   { maxChars: 3000, style: 'Professional, insightful' },
    newsletter: { maxChars: 2000, style: 'Thoughtful, detailed' },
    instagram:  { maxChars: 2200, style: 'Visual, inspiring' },
    youtube:    { maxChars: 5000, style: 'Engaging, structured' },
  };
  const details = platforms.map(p => `${p}: ${JSON.stringify(platformSpecs[p])}`).join('\n');

  const prompt = `Create platform-specific content based on this idea:
"${pillarIdea}"

Platforms and specs:
${details}

Additional instructions: ${extraInstructions || 'None'}
Voice: ${voice || ''}

Return ONLY a JSON array, no other text:
[{"platform": "...", "content": "...", "reasoning": "..."}, ...]`;

  try {
    const text = await runClaude(prompt);
    res.json(extractJson(text));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/refine-copy', async (req, res) => {
  const { content, instruction, voice } = req.body;
  const prompt = `Refine this content based on the instruction:

Current content:
"${content}"

Instruction: ${instruction}
Voice: ${voice || ''}

Return only the refined content, no explanations.`;

  try {
    const text = await runClaude(prompt);
    res.json({ content: text });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/analyze-themes', async (req, res) => {
  const { pillars } = req.body;
  const descriptions = pillars.map(p => `${p.id}: "${p.title}" - ${p.coreIdea}`).join('\n');

  const prompt = `Analyze these content pillars and identify cross-cutting themes:

${descriptions}

For each pillar, identify 2-3 short themes (2-3 words each) that connect to other pillars.

Return ONLY a JSON array, no other text:
[{"pillarId": "...", "themes": ["theme1", "theme2"]}, ...]`;

  try {
    const text = await runClaude(prompt);
    res.json(extractJson(text));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.listen(3001, () => console.log('AI server running on http://localhost:3001'));
