import { Pillar, Execution } from './types';

export const INITIAL_PILLARS: Pillar[] = [
  {
    id: 'p1',
    title: 'The Future of Asynchronous Work',
    coreIdea: 'Deep work is impossible in a world of constant pings. We need to move to document-driven cultures where meetings are the last resort, not the first.',
    topic: 'Productivity',
    status: 'active',
  },
  {
    id: 'p2',
    title: 'AI as a Co-pilot, not Pilot',
    coreIdea: 'Generative AI should be treated as a junior developer or intern. It needs guidance, context, and review. Handing over the keys entirely is a mistake.',
    topic: 'Technology',
    status: 'active',
  },
  {
    id: 'p3',
    title: 'Design Systems for Startups',
    coreIdea: 'Startups often skip design systems to move fast, but this creates debt. A minimal viable design system (MVDS) is crucial even at seed stage.',
    topic: 'Design',
    status: 'active',
  },
  {
    id: 'p4',
    title: 'Sustainable Growth Metrics',
    coreIdea: 'Vanity metrics (downloads, views) kill companies. Focus on retention cohorts and net dollar retention from day one.',
    topic: 'Business',
    status: 'active',
  }
];

export const INITIAL_EXECUTIONS: Execution[] = [
  {
    id: 'e1',
    pillarId: 'p1',
    platform: 'twitter',
    status: 'draft',
    content: "Meetings are the death of productivity. \n\nWe've moved to a completely async workflow and output has doubled. \n\nHere is the playbook: \n1. No meetings without an agenda doc.\n2. 24h expected response time on Slack (removes urgency).\n3. Deep work blocks are sacred.\n\n#RemoteWork #Productivity",
    lastEdited: new Date().toISOString(),
  },
  {
    id: 'e2',
    pillarId: 'p1',
    platform: 'linkedin',
    status: 'scheduled',
    content: "Unpopular opinion: The 'Open Door Policy' is actually harmful to deep work.\n\nIt implies interruptions are welcome at any time. In a remote world, this translates to constant Slack availability.\n\nInstead, try 'Office Hours'. Managers set 2 hours a day where they are reachable instantly. The rest of the day? Async only.\n\nThis allows leaders to actually do work, and teams to batch their questions.",
    lastEdited: new Date().toISOString(),
  },
  {
    id: 'e3',
    pillarId: 'p2',
    platform: 'newsletter',
    status: 'draft',
    content: "Subject: Is your AI strategy reckless?\n\nHi everyone,\n\nI've been seeing a trend of companies automating entire customer support flows with LLMs. This is dangerous.\n\nAI hallucinates. It makes up policies. It can be manipulated.\n\nUse AI to draft the response for a human agent to review. Don't let it hit 'Send' without eyes on it.",
    lastEdited: new Date().toISOString(),
  }
];

export const TOPICS = ['Productivity', 'Technology', 'Design', 'Business', 'Marketing'];

export const PLATFORM_CONFIG = {
  twitter: { color: 'text-sky-400', label: 'X / Twitter', maxChars: 280 },
  linkedin: { color: 'text-blue-500', label: 'LinkedIn', maxChars: 3000 },
  instagram: { color: 'text-pink-500', label: 'Instagram', maxChars: 2200 },
  newsletter: { color: 'text-orange-400', label: 'Newsletter', maxChars: null },
  youtube: { color: 'text-red-500', label: 'YouTube Script', maxChars: null },
};