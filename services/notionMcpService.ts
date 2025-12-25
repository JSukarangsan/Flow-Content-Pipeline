import { NotionIdea, MCPConfig } from '../types';

// MCP Notion Service
// This service provides an interface for fetching ideas from Notion via MCP
// When MCP is not available, it falls back to demo/mock data

export interface NotionDatabase {
  id: string;
  title: string;
  itemCount?: number;
}

// Check if MCP Notion tools are available
export const isMCPAvailable = (): boolean => {
  // In a real implementation, this would check for MCP tool availability
  // For now, we'll use a flag that can be set via settings
  return typeof window !== 'undefined' && (window as any).__MCP_AVAILABLE__ === true;
};

// Fetch available Notion databases (for selection in settings)
export const fetchNotionDatabases = async (): Promise<NotionDatabase[]> => {
  if (!isMCPAvailable()) {
    // Return demo databases when MCP is not available
    return [
      { id: 'demo-db-1', title: 'Content Ideas', itemCount: 12 },
      { id: 'demo-db-2', title: 'Research Queue', itemCount: 8 },
      { id: 'demo-db-3', title: 'Article Backlog', itemCount: 15 },
    ];
  }

  // In production, this would call the MCP Notion tool
  // Example: mcp__notion__search_databases()
  try {
    // Placeholder for actual MCP call
    return [];
  } catch (error) {
    console.error('Failed to fetch Notion databases:', error);
    return [];
  }
};

// Fetch unprocessed ideas from the selected Notion database
export const fetchNotionIdeas = async (
  config: MCPConfig
): Promise<NotionIdea[]> => {
  if (!config.enabled || !config.notionDatabaseId) {
    return [];
  }

  if (!isMCPAvailable()) {
    // Return demo ideas when MCP is not available
    return getDemoIdeas();
  }

  // In production, this would call the MCP Notion tool
  // Example: mcp__notion__query_database({ database_id: config.notionDatabaseId, filter: { property: 'Status', select: { equals: 'unprocessed' } } })
  try {
    // Placeholder for actual MCP call
    return [];
  } catch (error) {
    console.error('Failed to fetch Notion ideas:', error);
    return [];
  }
};

// Mark an idea as used in Notion
export const markIdeaAsUsed = async (
  ideaId: string,
  config: MCPConfig
): Promise<boolean> => {
  if (!config.enabled || !isMCPAvailable()) {
    // In demo mode, just return success
    return true;
  }

  // In production, this would call the MCP Notion tool
  // Example: mcp__notion__update_page({ page_id: ideaId, properties: { Status: { select: { name: 'used' } } } })
  try {
    // Placeholder for actual MCP call
    return true;
  } catch (error) {
    console.error('Failed to mark idea as used:', error);
    return false;
  }
};

// Demo data for testing without MCP
function getDemoIdeas(): NotionIdea[] {
  return [
    {
      id: 'demo-idea-1',
      title: 'The hidden cost of "move fast and break things"',
      url: 'https://example.com/article-1',
      notes: 'Great article about technical debt. Could tie into our ops pillar.',
      tags: ['Operations', 'Technical Debt'],
      status: 'unprocessed',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'demo-idea-2',
      title: 'How Stripe builds products',
      url: 'https://example.com/article-2',
      notes: 'Process insights from Stripe. Good case study material.',
      tags: ['Case Study', 'Product'],
      status: 'unprocessed',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'demo-idea-3',
      title: 'AI agents are changing how we work',
      url: 'https://example.com/article-3',
      notes: 'Hot topic right now. Could do a contrarian take.',
      tags: ['AI', 'Future of Work'],
      status: 'unprocessed',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'demo-idea-4',
      title: 'Why most content strategies fail',
      notes: 'My own observation from client work. Could be a thread.',
      tags: ['Strategy', 'Content'],
      status: 'unprocessed',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'demo-idea-5',
      title: 'The 80/20 of LinkedIn growth',
      notes: 'Based on patterns from top creators I follow.',
      tags: ['LinkedIn', 'Growth'],
      status: 'unprocessed',
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

// Get ideas for planning (wrapper that handles state)
export const getIdeasForPlanning = async (
  config: MCPConfig,
  cachedIdeas?: NotionIdea[]
): Promise<NotionIdea[]> => {
  // If we have cached ideas and they were fetched recently, use them
  if (cachedIdeas && cachedIdeas.length > 0) {
    return cachedIdeas.filter(idea => idea.status === 'unprocessed');
  }

  // Otherwise fetch fresh
  return fetchNotionIdeas(config);
};
