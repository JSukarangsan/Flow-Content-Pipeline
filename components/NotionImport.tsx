import React, { useState, useEffect } from 'react';

interface NotionIdea {
  id: string;
  title: string;
  content: string;
  url: string;
  created_time: string;
  last_edited_time: string;
  tags?: string[];
}

interface NotionImportProps {
  onImport: (ideas: NotionIdea[]) => void;
  onClose: () => void;
}

export function NotionImport({ onImport, onClose }: NotionImportProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [ideas, setIdeas] = useState<NotionIdea[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch ideas from Notion
  const fetchNotionIdeas = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // For now, we'll use mock data - replace with actual Notion API call
      // TODO: Integrate with Notion MCP or API
      const mockIdeas: NotionIdea[] = [
        {
          id: 'notion-1',
          title: 'AI-First Development Workflow',
          content: 'Exploring how AI tools can be integrated into every stage of the development process, from ideation to deployment.',
          url: 'https://notion.so/ai-first-dev',
          created_time: '2024-02-15T10:30:00Z',
          last_edited_time: '2024-02-20T14:45:00Z',
          tags: ['ai', 'development', 'workflow']
        },
        {
          id: 'notion-2',
          title: 'Content Multiplication Strategy',
          content: 'A systematic approach to creating once and distributing everywhere, maximizing the impact of each piece of content.',
          url: 'https://notion.so/content-multiplication',
          created_time: '2024-02-18T09:15:00Z',
          last_edited_time: '2024-02-19T11:20:00Z',
          tags: ['content', 'strategy', 'marketing']
        },
        {
          id: 'notion-3',
          title: 'Building in Public: Lessons Learned',
          content: 'Documentation of the journey building products in public, including wins, failures, and key insights.',
          url: 'https://notion.so/building-in-public',
          created_time: '2024-02-10T16:00:00Z',
          last_edited_time: '2024-02-22T10:30:00Z',
          tags: ['entrepreneurship', 'marketing', 'growth']
        },
        {
          id: 'notion-4',
          title: 'The Future of Agency Work',
          content: 'How AI is transforming agency operations, client relationships, and service delivery models.',
          url: 'https://notion.so/future-agency',
          created_time: '2024-02-12T13:45:00Z',
          last_edited_time: '2024-02-21T09:15:00Z',
          tags: ['agency', 'ai', 'business']
        }
      ];

      setIdeas(mockIdeas);
    } catch (err) {
      setError('Failed to fetch ideas from Notion. Please check your connection.');
      console.error('Notion fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotionIdeas();
  }, []);

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredIdeas.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredIdeas.map(i => i.id)));
    }
  };

  const handleImport = () => {
    const selectedIdeas = ideas.filter(idea => selectedIds.has(idea.id));
    onImport(selectedIdeas);
  };

  const filteredIdeas = ideas.filter(idea =>
    idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    idea.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    idea.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-medium text-gray-300">Select Ideas to Import</h4>
          <p className="text-xs text-gray-500 mt-1">
            {isLoading ? 'Loading...' : `${ideas.length} ideas found in your Notion database`}
          </p>
        </div>
        {!isLoading && ideas.length > 0 && (
          <button
            onClick={fetchNotionIdeas}
            className="text-xs text-gray-400 hover:text-white transition-colors flex items-center"
          >
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search ideas..."
          className="w-full bg-gray-950 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-accent-500 focus:ring-1 focus:ring-accent-500 outline-none"
        />
        <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Selection Controls */}
      {!isLoading && filteredIdeas.length > 0 && (
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-800">
          <button
            onClick={toggleAll}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            {selectedIds.size === filteredIdeas.length ? 'Deselect All' : 'Select All'}
          </button>
          <span className="text-xs text-gray-500">
            {selectedIds.size} of {filteredIdeas.length} selected
          </span>
        </div>
      )}

      {/* Ideas List */}
      <div className="flex-1 overflow-y-auto space-y-2 mb-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <svg className="w-6 h-6 animate-spin text-accent-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-400 text-sm mb-3">{error}</p>
            <button
              onClick={fetchNotionIdeas}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : filteredIdeas.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">
            {searchQuery ? 'No ideas match your search' : 'No ideas found in your Notion database'}
          </div>
        ) : (
          filteredIdeas.map(idea => (
            <div
              key={idea.id}
              onClick={() => toggleSelection(idea.id)}
              className={`
                border rounded-lg p-3 cursor-pointer transition-all
                ${selectedIds.has(idea.id)
                  ? 'bg-accent-600/10 border-accent-500/50'
                  : 'bg-gray-950/50 border-gray-700 hover:border-gray-600'
                }
              `}
            >
              <div className="flex items-start space-x-3">
                <div className="mt-1">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(idea.id)}
                    onChange={() => {}}
                    className="rounded border-gray-600 bg-gray-900 text-accent-600 focus:ring-accent-500"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-sm font-medium text-white mb-1 truncate">{idea.title}</h5>
                  <p className="text-xs text-gray-400 line-clamp-2 mb-2">{idea.content}</p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>Updated {formatDate(idea.last_edited_time)}</span>
                    {idea.tags && idea.tags.length > 0 && (
                      <div className="flex items-center space-x-1">
                        {idea.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="px-2 py-0.5 bg-gray-800 rounded text-gray-400">
                            {tag}
                          </span>
                        ))}
                        {idea.tags.length > 3 && (
                          <span className="text-gray-600">+{idea.tags.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-800">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleImport}
          disabled={selectedIds.size === 0}
          className={`
            px-6 py-2 text-sm rounded-lg transition-colors
            ${selectedIds.size > 0
              ? 'bg-accent-600 hover:bg-accent-500 text-white'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          Import {selectedIds.size > 0 && `(${selectedIds.size})`}
        </button>
      </div>
    </div>
  );
}