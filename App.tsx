import React, { useState, useEffect, useCallback, useRef } from 'react';
import { INITIAL_PILLARS, INITIAL_EXECUTIONS, TOPICS, PLATFORM_CONFIG, DEFAULT_SETTINGS } from './constants';
import { Pillar, Execution, NavState, Platform, UserSettings, PlatformSettings } from './types';
import { PillarCard } from './components/PillarCard';
import { ExecutionCard } from './components/ExecutionCard';
import { NotionImport } from './components/NotionImport';
import { ImportDropzone } from './components/ImportDropzone';
import { generateExecutions, generatePillarIdeas, refineCopy, analyzeThemes } from './services/geminiService';
import { useDatabase } from './hooks/useDatabase';

const ShortcutHint: React.FC<{ keys: string[]; label: string }> = ({ keys, label }) => (
  <span className="flex items-center gap-1.5 text-[11px] text-gray-600">
    {keys.map((k, i) => (
      <kbd key={i} className="px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-400 font-mono text-[10px] leading-none">{k}</kbd>
    ))}
    <span>{label}</span>
  </span>
);

function App() {
  // Initialize database
  const {
    isInitialized,
    ideas,
    posts,
    addIdea,
    updateIdea,
    deleteIdea,
    addPost,
    updatePost,
    deletePost
  } = useDatabase();

  // --- State ---
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  
  // Selection State
  const [selectedPillarId, setSelectedPillarId] = useState<string | null>(INITIAL_PILLARS[0]?.id || null);
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null); // highlighted in list
  const [editingExecutionId, setEditingExecutionId] = useState<string | null>(null);   // open in editor
  
  // UI State
  const [navState, setNavState] = useState<NavState>({ column: 0, editing: false });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTopic, setFilterTopic] = useState<string | null>(null);
  const [filterTheme, setFilterTheme] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState('');

  // Settings State
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'general' | Platform>('general');

  // Generator Modal State
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [genPlatforms, setGenPlatforms] = useState<Platform[]>(['twitter', 'linkedin']);
  const [genInstructions, setGenInstructions] = useState('');

  // Idea Modal State
  const [isIdeaModalOpen, setIsIdeaModalOpen] = useState(false);
  const [ideaModalTab, setIdeaModalTab] = useState<'manual' | 'notion'>('manual');
  const [selectedIdea, setSelectedIdea] = useState<Pillar | null>(null);

  // Import Modal State
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isThemeManagerOpen, setIsThemeManagerOpen] = useState(false);
  const [isAutoImporting, setIsAutoImporting] = useState(false);

  // New Idea Form State
  const [newIdeaTitle, setNewIdeaTitle] = useState('');
  const [newIdeaCoreInsight, setNewIdeaCoreInsight] = useState('');
  const [newIdeaPriority, setNewIdeaPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [newIdeaStage, setNewIdeaStage] = useState<'backlog' | 'active'>('backlog');
  const [newIdeaAudience, setNewIdeaAudience] = useState('');
  const [newIdeaTags, setNewIdeaTags] = useState('');

  // AI Editor State
  const [editorPrompt, setEditorPrompt] = useState('');

  // Editor Refs
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const genInputRef = useRef<HTMLInputElement>(null);
  const aiEditorInputRef = useRef<HTMLInputElement>(null);
  const ideasListRef = useRef<HTMLDivElement>(null);

  // --- Database Sync ---
  useEffect(() => {
    if (isInitialized) {
      // Convert ideas to pillars format
      if (ideas.length > 0) {
        const dbPillars: Pillar[] = ideas.map(idea => ({
          id: idea.id,
          title: idea.gist || 'Untitled',
          coreIdea: idea.content || '',
          topic: '',
          color: 'bg-purple-600',
          themes: idea.tags || []
        }));
        setPillars(dbPillars);
      } else if (pillars.length === 0) {
        // Use initial data if database is empty
        setPillars(INITIAL_PILLARS);
        // Save initial pillars to database
        INITIAL_PILLARS.forEach(pillar => {
          addIdea({
            id: pillar.id,
            pillarId: '',
            gist: pillar.title,
            hooks: [],
            content: pillar.coreIdea,
            source: { type: 'manual' },
            tags: pillar.themes || [],
            status: 'approved'
          });
        });
      }

      // Convert posts to executions format
      if (posts.length > 0) {
        const dbExecutions: Execution[] = posts.map(post => ({
          id: post.id,
          pillarId: post.ideaId || '',
          platform: post.platform,
          content: post.content || '',
          status: post.status as 'draft' | 'scheduled' | 'published',
          reasoning: ''
        }));
        setExecutions(dbExecutions);
      } else if (executions.length === 0) {
        // Use initial data if database is empty
        setExecutions(INITIAL_EXECUTIONS);
        // Save initial executions to database
        INITIAL_EXECUTIONS.forEach(exec => {
          addPost({
            id: exec.id,
            ideaId: exec.pillarId,
            platform: exec.platform,
            content: exec.content,
            status: exec.status,
            scheduledFor: exec.status === 'scheduled' ? new Date().toISOString() : undefined,
            performance: {}
          });
        });
      }
    }
  }, [isInitialized, ideas, posts]);

  // --- Settings Persistence ---
  useEffect(() => {
    const savedSettings = localStorage.getItem('flow_settings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) { console.error("Failed to load settings", e); }
    }
  }, []);

  const updateSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
    localStorage.setItem('flow_settings', JSON.stringify(newSettings));
  };

  // --- Derived Data ---
  
  // Extract themes that appear on 2+ pillars, sorted by frequency, capped at 10
  const allThemes = (() => {
    const counts = new Map<string, number>();
    pillars.forEach(p => (p.themes || []).filter(Boolean).forEach(t => counts.set(t, (counts.get(t) || 0) + 1)));
    return Array.from(counts.entries())
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([theme]) => theme);
  })();

  const filteredPillars = pillars.filter(p => {
    const matchSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        p.coreIdea.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTopic = filterTopic ? p.topic === filterTopic : true;
    const matchTheme = filterTheme ? p.themes?.includes(filterTheme) : true;
    
    return matchSearch && matchTopic && matchTheme;
  });

  const filteredExecutions = executions.filter(e => e.pillarId === selectedPillarId);

  // --- Keyboard Navigation ---
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const activeEl = document.activeElement;
    const isTyping = activeEl instanceof HTMLInputElement ||
                     activeEl instanceof HTMLTextAreaElement ||
                     activeEl instanceof HTMLSelectElement;

    // Escape always works
    if (e.key === 'Escape') {
      if (selectedIdea) { setSelectedIdea(null); return; }
      if (isIdeaModalOpen) { setIsIdeaModalOpen(false); return; }
      if (isImportOpen) { setIsImportOpen(false); return; }
      if (isGeneratorOpen) { setIsGeneratorOpen(false); return; }
      if (isSettingsOpen) { setIsSettingsOpen(false); return; }
      if (editingExecutionId) { setEditingExecutionId(null); return; }
      if (isTyping) {
        (activeEl as HTMLElement).blur();
        setNavState(prev => ({ ...prev, editing: false }));
        return;
      }
    }

    // Cmd+Enter in generator modal
    if (isGeneratorOpen) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') document.getElementById('btn-confirm-generate')?.click();
      return;
    }

    // Ctrl+S: save current draft (works while editing)
    if ((e.ctrlKey || e.metaKey) && e.key === 's' && editingExecutionId) {
      e.preventDefault();
      const exec = executions.find(ex => ex.id === editingExecutionId);
      const post = posts.find(p => p.id === editingExecutionId);
      if (exec && post) {
        updatePost({ ...post, content: exec.content });
      }
      return;
    }

    // Cmd+K: focus search (works even when typing)
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      document.getElementById('search-input')?.focus();
      return;
    }

    // /: focus search (works when not typing)
    if (e.key === '/' && !isTyping) {
      e.preventDefault();
      document.getElementById('search-input')?.focus();
      return;
    }

    // Cmd+J: focus AI editor input
    if (navState.column === 1 && (e.metaKey || e.ctrlKey) && e.key === 'j') {
      e.preventDefault();
      aiEditorInputRef.current?.focus();
      return;
    }

    // Block nav if any modal open or if typing in an input
    if (isSettingsOpen || isIdeaModalOpen || selectedIdea) return;
    if (isTyping) return;

    // N: new idea
    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      setIsIdeaModalOpen(true);
      return;
    }

    const arrowKey = e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown';

    // ArrowLeft in editor at position 0 → exit back to ideas panel
    if (editingExecutionId && e.key === 'ArrowLeft') {
      const ta = editorRef.current;
      if (ta && ta.selectionStart === 0 && ta.selectionEnd === 0) {
        e.preventDefault();
        setEditingExecutionId(null);
        setNavState(prev => ({ ...prev, column: 0 }));
      }
      return;
    }

    if (arrowKey) e.preventDefault();

    // Don't intercept other arrow keys while in the editor
    if (editingExecutionId) return;

    // Left/Right: switch columns
    if (e.key === 'ArrowRight' && navState.column === 0) {
      const execToSelect = filteredExecutions.find(ex => ex.id === selectedExecutionId) ?? filteredExecutions[0];
      if (execToSelect) {
        setSelectedExecutionId(execToSelect.id);
      }
      setNavState(prev => ({ ...prev, column: 1 }));
    } else if (e.key === 'ArrowLeft' && navState.column === 1) {
      setSelectedExecutionId(null);
      setNavState(prev => ({ ...prev, column: 0 }));
    }

    // Up/Down: navigate items in the active column
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const isDown = e.key === 'ArrowDown';
      if (navState.column === 0) {
        const idx = filteredPillars.findIndex(p => p.id === selectedPillarId);
        const next = isDown ? Math.min(idx + 1, filteredPillars.length - 1) : Math.max(idx - 1, 0);
        if (filteredPillars[next]) setSelectedPillarId(filteredPillars[next].id);
      } else if (navState.column === 1) {
        const idx = filteredExecutions.findIndex(ex => ex.id === selectedExecutionId);
        const first = idx === -1 ? 0 : isDown ? Math.min(idx + 1, filteredExecutions.length - 1) : Math.max(idx - 1, 0);
        if (filteredExecutions[first]) setSelectedExecutionId(filteredExecutions[first].id);
      }
    }

    // Enter: open idea detail (col 0) or open draft editor (col 1)
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (navState.column === 0 && selectedPillarId) {
        const pillar = filteredPillars.find(p => p.id === selectedPillarId);
        if (pillar) setSelectedIdea(pillar);
      } else if (navState.column === 1 && selectedExecutionId) {
        setEditingExecutionId(selectedExecutionId);
      }
    }
  }, [navState, filteredPillars, filteredExecutions, selectedPillarId, selectedExecutionId, editingExecutionId, isGeneratorOpen, isSettingsOpen, isIdeaModalOpen, selectedIdea, executions, posts, updatePost]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);


  useEffect(() => {
    if (selectedPillarId) {
      // Always close editor and clear draft selection when switching ideas.
      // User must explicitly press Right arrow or click to enter the drafts panel.
      setEditingExecutionId(null);
      setSelectedExecutionId(null);
      // Scroll only if card is outside the visible area — use getBoundingClientRect
      // so the calculation is correct regardless of offsetParent
      const container = ideasListRef.current;
      const card = document.getElementById(`pillar-${selectedPillarId}`);
      if (container && card) {
        const cRect = container.getBoundingClientRect();
        const kRect = card.getBoundingClientRect();
        const topDelta = kRect.top - cRect.top;
        const bottomDelta = kRect.bottom - cRect.bottom;
        if (bottomDelta > 0) {
          container.scrollTop += bottomDelta;
        } else if (topDelta < 0) {
          container.scrollTop += topDelta;
        }
      }
    }
  }, [selectedPillarId]);

  // Focus input when modal opens
  useEffect(() => {
    if (isGeneratorOpen) {
      setTimeout(() => genInputRef.current?.focus(), 50);
    }
  }, [isGeneratorOpen]);


  // --- Handlers ---
  // --- Theme Management ---
  const renameTheme = (oldName: string, newName: string) => {
    const trimmed = newName.trim().toLowerCase();
    if (!trimmed || trimmed === oldName) return;
    setPillars(prev => prev.map(p => ({
      ...p,
      themes: p.themes
        ? Array.from(new Set(p.themes.map(t => t === oldName ? trimmed : t)))
        : p.themes
    })));
  };

  const deleteTheme = (name: string) => {
    setPillars(prev => prev.map(p => ({
      ...p,
      themes: p.themes ? p.themes.filter(t => t !== name) : p.themes
    })));
  };

  const updatePillarThemes = (pillarId: string, themes: string[]) => {
    setPillars(prev => prev.map(p => p.id === pillarId ? { ...p, themes } : p));
    if (selectedIdea?.id === pillarId) setSelectedIdea(prev => prev ? { ...prev, themes } : prev);
  };

  const updateExecutionContent = (newContent: string) => {
    const id = editingExecutionId || selectedExecutionId;
    if (!id) return;
    setExecutions(prev => prev.map(e => e.id === id ? { ...e, content: newContent, lastEdited: new Date().toISOString() } : e));
  };

  const handleAddPillar = async () => {
    const topic = filterTopic || 'General';
    setIsAiLoading(true);
    setAiMessage(`Ideating pillars for ${topic}...`);
    try {
      const generatedIdeas = await generatePillarIdeas(topic, settings);
      const newPillars = await Promise.all(generatedIdeas.map(async (idea, i) => {
        const newId = `idea-${Date.now()}-${i}`;
        const newPillar = {
          id: newId,
          title: idea.title,
          coreIdea: idea.coreIdea,
          topic: topic,
          color: 'bg-purple-600',
          status: 'active' as const,
        };

        // Save to database
        await addIdea({
          id: newId,
          pillarId: '',
          gist: idea.title,
          hooks: [],
          content: idea.coreIdea,
          source: { type: 'manual' },
          tags: [topic],
          status: 'approved'
        });

        return newPillar;
      }));
      setPillars(prev => [...newPillars, ...prev]);
      if (newPillars.length > 0) setSelectedPillarId(newPillars[0].id);
    } catch (e) {
      alert("Failed to generate ideas");
    } finally {
      setIsAiLoading(false);
      setAiMessage('');
    }
  };

  const handleAnalyzeThemes = async () => {
    if (pillars.length === 0) return;
    setIsAiLoading(true);
    setAiMessage('Identifying themes...');
    try {
      const updates = await analyzeThemes(pillars, settings);
      const updatedPillars = pillars.map(p => {
        const update = updates.find(u => u.pillarId === p.id);
        return update ? { ...p, themes: update.themes.map(t => t.toLowerCase()) } : p;
      });
      setPillars(updatedPillars);
    } catch (e) {
      alert("Failed to analyze themes");
    } finally {
      setIsAiLoading(false);
      setAiMessage('');
    }
  };

  const openGenerator = () => {
    if(!selectedPillarId) return;
    setIsGeneratorOpen(true);
  };

  const toggleGenPlatform = (p: Platform) => {
    setGenPlatforms(prev => 
      prev.includes(p) ? prev.filter(i => i !== p) : [...prev, p]
    );
  };

  const confirmGeneration = async () => {
    const pillar = pillars.find(p => p.id === selectedPillarId);
    if (!pillar || genPlatforms.length === 0) return;

    setIsGeneratorOpen(false);
    setIsAiLoading(true);
    setAiMessage(`Drafting posts for "${pillar.title}"...`);

    try {
      const suggestions = await generateExecutions(pillar.coreIdea, genPlatforms, genInstructions, settings);
      const newExecutions = await Promise.all(suggestions.map(async (s, i) => {
        const newId = `post-${Date.now()}-${i}`;
        const newExecution = {
          id: newId,
          pillarId: pillar.id,
          platform: s.platform,
          status: 'draft' as const,
          content: s.content,
          lastEdited: new Date().toISOString(),
        };

        // Save to database
        await addPost({
          id: newId,
          ideaId: pillar.id,
          platform: s.platform,
          content: s.content,
          status: 'draft',
          performance: {}
        });

        return newExecution;
      }));
      setExecutions(prev => [...prev, ...newExecutions]);
      if (newExecutions.length > 0) setSelectedExecutionId(newExecutions[0].id);
      setGenInstructions(''); // Reset
    } catch (e) {
      alert("Failed to generate drafts");
    } finally {
      setIsAiLoading(false);
      setAiMessage('');
    }
  };

  const handleAiEdit = async (instruction: string = editorPrompt) => {
    if (!instruction) return;
    const exec = executions.find(e => e.id === selectedExecutionId);
    if (!exec) return;

    setIsAiLoading(true);
    setAiMessage('Refining...');
    try {
      const newContent = await refineCopy(exec.content, instruction, settings);
      updateExecutionContent(newContent);
      setEditorPrompt(''); // Clear prompt on success
    } finally {
      setIsAiLoading(false);
      setAiMessage('');
    }
  };

  // --- Settings Helpers ---
  const handlePlatformSettingChange = (platform: Platform, field: keyof PlatformSettings, value: string) => {
    const newSettings = { ...settings };
    newSettings.platforms[platform] = {
      ...newSettings.platforms[platform],
      [field]: value
    };
    updateSettings(newSettings);
  };

  // --- Rendering ---

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-200 font-sans selection:bg-accent-500/30 selection:text-white">
      
      {/* Top Bar */}
      <header className="h-auto min-h-14 border-b border-gray-800 flex flex-col justify-center px-4 bg-gray-950 z-10 shrink-0 py-2">
        <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-6">
              <h1 className="font-bold tracking-tight text-lg text-gray-100">Flow</h1>

              <div className="relative group">
                <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-accent-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input
                  id="search-input"
                  type="text"
                  placeholder="Search (Cmd+K)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-gray-900 border border-gray-800 rounded-md pl-9 pr-4 py-1.5 text-sm focus:ring-1 focus:ring-accent-500 outline-none w-64 placeholder-gray-600 text-gray-300 transition-colors focus:border-gray-700"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4 text-xs text-gray-500 font-mono">
              {isAiLoading && (
                <div className="flex items-center text-accent-400 animate-pulse">
                  <svg className="w-3 h-3 mr-2 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                  {aiMessage}
                </div>
              )}
              
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 text-gray-500 hover:text-white transition-colors rounded-md hover:bg-gray-900"
                title="Settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </button>
              
              <div className="flex space-x-2 border-l border-gray-800 pl-4">
                <span className="flex items-center"><kbd className="bg-gray-900 border border-gray-800 px-1 rounded mr-1">←</kbd><kbd className="bg-gray-900 border border-gray-800 px-1 rounded">→</kbd> Col</span>
                <span className="flex items-center"><kbd className="bg-gray-900 border border-gray-800 px-1 rounded mr-1">↑</kbd><kbd className="bg-gray-900 border border-gray-800 px-1 rounded">↓</kbd> Nav</span>
              </div>
            </div>
        </div>
      </header>

      {/* Filter Panel */}
      <div className="bg-gray-900/50 border-b border-gray-800 px-4 py-3 space-y-3">
        {/* Topics Row */}
        <div className="flex items-center space-x-3">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider min-w-[80px]">Topics</span>
          <div className="flex flex-wrap gap-2">
            <button
                onClick={() => setFilterTopic(null)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${!filterTopic ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'}`}
              >All</button>
            {TOPICS.map(t => (
              <button
                key={t}
                onClick={() => setFilterTopic(t)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${filterTopic === t ? 'bg-accent-600/20 text-accent-400 border border-accent-500/30' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'}`}
              >{t}</button>
            ))}
          </div>
        </div>

        {/* Themes Row (If they exist) */}
        {allThemes.length > 0 && (
          <div className="flex items-center space-x-3">
              <div className="flex items-center gap-2 min-w-[80px]">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Themes</span>
                <button onClick={() => setIsThemeManagerOpen(true)} className="text-[10px] text-indigo-500 hover:text-indigo-300 transition-colors">Manage</button>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterTheme(null)}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${!filterTheme ? 'bg-indigo-900/30 text-indigo-300 border border-indigo-500/30' : 'text-indigo-400/70 hover:text-indigo-300 hover:bg-indigo-900/20'}`}
                >All</button>
                {allThemes.map(t => (
                  <button
                    key={t}
                    onClick={() => setFilterTheme(t)}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${filterTheme === t ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-indigo-400/70 hover:text-indigo-300 hover:bg-indigo-900/20'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
          </div>
        )}
      </div>

      {/* Main 2-Column Layout */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT: Ideas */}
        <section
          onClick={() => setNavState({ ...navState, column: 0 })}
          className={`w-[420px] shrink-0 flex flex-col border-r border-gray-800 bg-gray-950 transition-colors ${navState.column === 0 ? 'bg-gray-900/20' : ''}`}
        >
          <div className="p-4 border-b border-gray-800 flex justify-between items-center shrink-0">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Ideas</h2>
            <div className="flex space-x-2">
              <button onClick={(e) => { e.stopPropagation(); setIsImportOpen(true); }} className="w-7 h-7 rounded-md bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition-colors" title="Import Ideas">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              </button>
              <button onClick={(e) => { e.stopPropagation(); setIsIdeaModalOpen(true); }} className="w-7 h-7 rounded-md bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition-colors" title="Add Idea">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </button>
            </div>
          </div>
          <div ref={ideasListRef} className="overflow-y-auto flex-1 pb-10">
            {filteredPillars.map(p => (
              <PillarCard
                key={p.id}
                pillar={p}
                isActive={selectedPillarId === p.id}
                onClick={() => {
                  setSelectedPillarId(p.id);
                  setNavState({ ...navState, column: 0 });
                }}
              />
            ))}
          </div>
        </section>

        {/* RIGHT: Editor panel */}
        <section
          className="flex-1 flex flex-col bg-gray-950 min-w-0"
          onClick={() => setNavState({ ...navState, column: 1 })}
        >
          {editingExecutionId ? (
            /* ── EDITOR VIEW ── */
            (() => {
              const current = executions.find(e => e.id === editingExecutionId);
              if (!current) return null;
              const cfg = PLATFORM_CONFIG[current.platform];
              return (
                <>
                  {/* Header */}
                  <div className="shrink-0 flex items-center justify-between px-6 pt-4 pb-2 border-b border-gray-800/50">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingExecutionId(null); }}
                        className="text-gray-600 hover:text-gray-300 transition-colors"
                        title="Back to drafts (Esc)"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                      </button>
                      <span className={`text-xs font-semibold uppercase tracking-widest ${cfg.color}`}>{cfg.label}</span>
                      <span className="text-[10px] text-gray-600 font-mono">{current.content?.length || 0}{cfg.maxChars ? ` / ${cfg.maxChars}` : ''}</span>
                    </div>
                    <div className="text-[10px] text-gray-600 font-mono">Cmd+J · AI</div>
                  </div>

                  {/* Textarea — always editable */}
                  <textarea
                    ref={editorRef}
                    value={current.content || ''}
                    onChange={(e) => updateExecutionContent(e.target.value)}
                    autoFocus
                    className={`flex-1 w-full bg-transparent resize-none outline-none font-mono text-base leading-relaxed px-8 py-6 text-gray-100 placeholder-gray-600 ${isAiLoading ? 'opacity-50 blur-[1px]' : ''}`}
                    placeholder="Start writing..."
                  />

                  {/* AI command input only */}
                  <div className="shrink-0 px-6 pb-6 pt-2">
                    <div className="relative flex items-center bg-gray-900/80 border border-gray-800 rounded-lg focus-within:border-accent-500/50 focus-within:ring-1 focus-within:ring-accent-500/50 transition-colors">
                      <div className="pl-3 text-gray-500">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      </div>
                      <input
                        ref={aiEditorInputRef}
                        type="text"
                        value={editorPrompt}
                        onChange={(e) => setEditorPrompt(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiEdit(); } }}
                        disabled={isAiLoading}
                        placeholder="Ask AI to edit... (Cmd+J)"
                        className="w-full bg-transparent border-none text-sm px-3 py-3 text-white placeholder-gray-500 focus:ring-0 outline-none"
                      />
                      <button
                        onClick={() => handleAiEdit()}
                        disabled={!editorPrompt || isAiLoading}
                        className="mr-2 p-1.5 bg-gray-800 hover:bg-gray-700 rounded-md text-gray-400 hover:text-white transition-colors disabled:opacity-30"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                      </button>
                    </div>
                  </div>
                </>
              );
            })()
          ) : (
            /* ── DRAFT LIST VIEW ── */
            <>
              <div className="shrink-0 px-6 py-3 border-b border-gray-800 flex items-center justify-between">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Drafts</h2>
                <button
                  onClick={(e) => { e.stopPropagation(); openGenerator(); }}
                  disabled={!selectedPillarId}
                  className="text-xs text-gray-500 hover:text-white flex items-center gap-1 disabled:opacity-30 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Generate
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {filteredExecutions.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-24 text-gray-700 select-none">
                    <svg className="w-10 h-10 mb-3 opacity-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <p className="text-sm font-mono opacity-40">{selectedPillarId ? 'No drafts — press Generate' : 'Select an idea to begin'}</p>
                  </div>
                ) : (
                  filteredExecutions.map(ex => {
                    const cfg = PLATFORM_CONFIG[ex.platform];
                    const isActive = selectedExecutionId === ex.id;
                    const firstLine = ex.content?.trim().split('\n')[0] || '';
                    const rest = ex.content?.trim().split('\n').slice(1).join(' ').trim() || '';
                    return (
                      <div
                        key={ex.id}
                        onClick={(e) => { e.stopPropagation(); setEditingExecutionId(ex.id); setSelectedExecutionId(ex.id); setNavState({ ...navState, column: 1 }); }}
                        className={`flex items-start gap-4 px-6 py-4 border-b border-gray-800/60 cursor-pointer transition-colors select-none ${
                          isActive ? 'bg-gray-800/60 border-l-2 border-l-accent-500' : 'hover:bg-gray-900/50 border-l-2 border-l-transparent'
                        }`}
                      >
                        <div className="shrink-0 pt-0.5">
                          <span className={`text-xs font-bold uppercase tracking-wider ${cfg.color}`}>{cfg.label}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-200 truncate">{firstLine || <span className="text-gray-600 italic">Empty draft</span>}</p>
                          {rest && <p className="text-xs text-gray-500 truncate mt-0.5">{rest}</p>}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {/* GENERATOR MODAL */}
      {isGeneratorOpen && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-start pt-[15vh] justify-center z-50">
           <div className="bg-gray-900 border border-gray-800 w-[500px] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-fade-in-down">
              <div className="p-6 border-b border-gray-800">
                <h3 className="text-lg font-medium text-white mb-1">Generate Drafts</h3>
                <p className="text-sm text-gray-500">Configure formats and instructions for your content.</p>
              </div>
              
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-gray-500 mb-3">Formats</label>
                  <div className="flex flex-wrap gap-2">
                    {(['twitter', 'linkedin', 'newsletter', 'instagram', 'youtube'] as Platform[]).map(p => {
                      const isSelected = genPlatforms.includes(p);
                      return (
                        <button 
                          key={p}
                          onClick={() => toggleGenPlatform(p)}
                          className={`px-3 py-1.5 text-sm rounded-md border transition-all ${
                            isSelected 
                            ? 'bg-accent-600 border-accent-500 text-white shadow-lg shadow-accent-900/20' 
                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-200'
                          }`}
                        >
                          {PLATFORM_CONFIG[p].label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                   <label className="block text-xs uppercase tracking-wider text-gray-500 mb-3">Directives (Optional)</label>
                   <input 
                      ref={genInputRef}
                      type="text"
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-sm focus:border-accent-500 focus:ring-1 focus:ring-accent-500 outline-none text-white placeholder-gray-600"
                      placeholder="e.g. 'Make it controversial', 'Use bullet points', 'Target CTOs'"
                      value={genInstructions}
                      onChange={(e) => setGenInstructions(e.target.value)}
                   />
                </div>
              </div>

              <div className="p-4 bg-gray-950/50 border-t border-gray-800 flex justify-between items-center">
                 <span className="text-xs text-gray-600 font-mono">Cmd+Enter to run</span>
                 <div className="flex space-x-3">
                    <button 
                      onClick={() => setIsGeneratorOpen(false)}
                      className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      id="btn-confirm-generate"
                      onClick={confirmGeneration}
                      disabled={genPlatforms.length === 0}
                      className="px-4 py-2 bg-white text-black text-sm font-medium rounded hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Generate Content
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* IDEA MODAL */}
      {isIdeaModalOpen && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 w-[600px] rounded-xl shadow-2xl overflow-hidden flex flex-col">

            {/* Header */}
            <div className="h-12 border-b border-gray-800 flex items-center justify-between px-6 shrink-0">
              <div className="flex gap-1 bg-gray-950 rounded-md p-0.5">
                <button
                  onClick={() => setIdeaModalTab('manual')}
                  className={`px-3 py-1 text-xs rounded transition-colors ${ideaModalTab === 'manual' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >Manual</button>
                <button
                  onClick={() => setIdeaModalTab('notion')}
                  className={`px-3 py-1 text-xs rounded transition-colors ${ideaModalTab === 'notion' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >Notion</button>
              </div>
              <button onClick={() => setIsIdeaModalOpen(false)} className="text-gray-600 hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {ideaModalTab === 'manual' ? (
              <div className="flex flex-col px-6 py-2">
                {/* Title row */}
                <div className="flex items-center gap-4 py-3 border-b border-gray-800/60">
                  <span className="text-sm text-gray-500 w-20 shrink-0">Title</span>
                  <input
                    autoFocus
                    type="text"
                    value={newIdeaTitle}
                    onChange={e => setNewIdeaTitle(e.target.value)}
                    className="flex-1 bg-transparent text-white placeholder-gray-600 outline-none text-sm"
                    placeholder="What's the idea?"
                  />
                </div>

                {/* Description */}
                <textarea
                  value={newIdeaCoreInsight}
                  onChange={e => setNewIdeaCoreInsight(e.target.value)}
                  className="w-full bg-transparent text-gray-300 placeholder-gray-600 outline-none resize-none text-sm leading-relaxed py-4 min-h-[140px]"
                  placeholder="Describe the core insight or angle..."
                />

                {/* Themes row */}
                <div className="flex items-center gap-4 py-3 border-t border-gray-800/60">
                  <span className="text-sm text-gray-500 w-20 shrink-0">Themes</span>
                  <input
                    type="text"
                    value={newIdeaTags}
                    onChange={e => setNewIdeaTags(e.target.value)}
                    className="flex-1 bg-transparent text-indigo-300 placeholder-gray-600 outline-none text-sm"
                    placeholder="transformation, ai-strategy  (comma separated, max 3)"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 py-3 border-t border-gray-800/60">
                  <button onClick={() => setIsIdeaModalOpen(false)} className="px-4 py-1.5 text-sm text-gray-500 hover:text-white transition-colors">
                    Cancel
                  </button>
                  <button
                    disabled={!newIdeaTitle.trim()}
                    onClick={async () => {
                      if (!newIdeaTitle.trim()) return;
                      const newId = `idea-${Date.now()}`;
                      const tags = newIdeaTags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean).slice(0, 3);
                      const newPillar: Pillar = {
                        id: newId,
                        title: newIdeaTitle.trim(),
                        coreIdea: newIdeaCoreInsight.trim(),
                        topic: '',
                        status: 'active',
                        themes: tags,
                      };
                      setPillars(prev => [newPillar, ...prev]);
                      await addIdea({
                        id: newId,
                        pillarId: '',
                        gist: newPillar.title,
                        hooks: [],
                        content: newPillar.coreIdea,
                        source: { type: 'manual', title: newPillar.title },
                        tags,
                        status: 'approved'
                      });
                      setNewIdeaTitle('');
                      setNewIdeaCoreInsight('');
                      setNewIdeaTags('');
                      setIsIdeaModalOpen(false);
                    }}
                    className="px-5 py-1.5 text-sm bg-accent-600 hover:bg-accent-500 text-white rounded-lg transition-colors disabled:opacity-40"
                  >
                    Add Idea
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6">
                <NotionImport
                  onImport={async (notionIdeas) => {
                    for (const idea of notionIdeas) {
                      const newId = `idea-${Date.now()}-${Math.random()}`;
                      const newPillar: Pillar = {
                        id: newId,
                        title: idea.title,
                        coreIdea: idea.content,
                        topic: '',
                        themes: (idea.tags || []).slice(0, 3)
                      };
                      setPillars(prev => [...prev, newPillar]);
                      await addIdea({
                        id: newId,
                        pillarId: '',
                        gist: idea.title,
                        hooks: [],
                        content: idea.content,
                        source: { type: 'notion', url: idea.url, title: idea.title },
                        tags: (idea.tags || []).slice(0, 3),
                        status: 'approved'
                      });
                    }
                    setIsIdeaModalOpen(false);
                    alert(`Successfully imported ${notionIdeas.length} idea${notionIdeas.length !== 1 ? 's' : ''}`);
                  }}
                  onClose={() => setIsIdeaModalOpen(false)}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* IMPORT MODAL */}
      {isImportOpen && (
        <ImportDropzone
          onClose={() => setIsImportOpen(false)}
          onImportSuccess={() => {
            // Refresh data from database
            window.location.reload(); // Simple refresh for now to reload from IndexedDB
          }}
        />
      )}

      {/* IDEA DETAIL MODAL */}
      {selectedIdea && (
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedIdea(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setSelectedIdea(null);
          }}
        >
          <div className="bg-gray-900 border border-gray-800 w-[90vw] max-w-[1200px] h-[90vh] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-fade-in-down">
            {/* Header */}
            <div className="h-14 border-b border-gray-800 flex items-center justify-between px-6 shrink-0">
              <h3 className="text-lg font-medium text-white">Idea Details</h3>
              <button
                onClick={() => setSelectedIdea(null)}
                className="text-gray-500 hover:text-white p-1"
                title="Close (Esc)"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8">
              {/* Title and Topic */}
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-white mb-4">{selectedIdea.title}</h1>
                <div className="flex items-center space-x-3 text-sm">
                  <span className="px-3 py-1 bg-accent-600/20 text-accent-400 rounded-md">
                    {selectedIdea.topic}
                  </span>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {(selectedIdea.themes || []).map(theme => (
                      <span key={theme} className="flex items-center gap-1 px-2 py-0.5 bg-indigo-900/30 text-indigo-300 rounded text-xs group">
                        {theme}
                        <button
                          onClick={() => updatePillarThemes(selectedIdea.id, (selectedIdea.themes || []).filter(t => t !== theme))}
                          className="opacity-0 group-hover:opacity-100 text-indigo-400 hover:text-red-400 transition-opacity leading-none"
                        >×</button>
                      </span>
                    ))}
                    <input
                      placeholder="+ tag"
                      className="bg-transparent text-xs text-indigo-300 placeholder-indigo-500 w-14 focus:w-24 outline-none transition-all"
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          const val = (e.target as HTMLInputElement).value.trim().toLowerCase();
                          if (val && !(selectedIdea.themes || []).includes(val)) {
                            updatePillarThemes(selectedIdea.id, [...(selectedIdea.themes || []), val]);
                          }
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Core Idea - Larger content area */}
              <div className="mb-8">
                <h4 className="text-sm font-medium text-gray-400 mb-3">Core Concept</h4>
                <div className="bg-gray-950 border border-gray-800 rounded-lg p-6 min-h-[300px]">
                  <p className="text-lg leading-relaxed text-gray-200 whitespace-pre-wrap">{selectedIdea.coreIdea}</p>
                </div>
              </div>

              {/* Smaller Quick Actions Bar */}
              <div className="border-t border-gray-800 pt-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Quick Actions</h4>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedIdea(null);
                        setIsGeneratorOpen(true);
                      }}
                      className="flex items-center space-x-2 px-3 py-1.5 text-xs bg-gray-950 border border-gray-700 rounded-md hover:bg-gray-900 hover:border-accent-500 transition-all group"
                      title="Generate Drafts (G)"
                    >
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <span className="text-gray-400 group-hover:text-white">Generate</span>
                    </button>

                    <button
                      onClick={() => {
                        // TODO: Implement edit functionality
                        alert('Edit functionality coming soon!');
                      }}
                      className="flex items-center space-x-2 px-3 py-1.5 text-xs bg-gray-950 border border-gray-700 rounded-md hover:bg-gray-900 hover:border-blue-500 transition-all group"
                      title="Edit Idea (E)"
                    >
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span className="text-gray-400 group-hover:text-white">Edit</span>
                    </button>

                    <button
                      onClick={() => {
                        // TODO: Add to plays/multiply content
                        alert('Content multiplication coming soon!');
                      }}
                      className="flex items-center space-x-2 px-3 py-1.5 text-xs bg-gray-950 border border-gray-700 rounded-md hover:bg-gray-900 hover:border-purple-500 transition-all group"
                      title="Use in Play (P)"
                    >
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span className="text-gray-400 group-hover:text-white">Play</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Metadata */}
              <div className="mt-6 pt-6 border-t border-gray-800">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Created:</span>
                    <span className="ml-2 text-gray-300">Today</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Last Modified:</span>
                    <span className="ml-2 text-gray-300">Just now</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="border-t border-gray-800 px-6 py-4 flex justify-between">
              <button
                onClick={async () => {
                  if (confirm('Are you sure you want to delete this idea?')) {
                    setPillars(prev => prev.filter(p => p.id !== selectedIdea.id));
                    await deleteIdea(selectedIdea.id);
                    setSelectedIdea(null);
                  }
                }}
                className="text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                Delete Idea
              </button>
              <button
                onClick={() => setSelectedIdea(null)}
                className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* THEME MANAGER MODAL */}
      {isThemeManagerOpen && (() => {
        // All unique themes with usage counts, sorted by count desc
        const themeCounts = new Map<string, number>();
        pillars.forEach(p => (p.themes || []).forEach(t => themeCounts.set(t, (themeCounts.get(t) || 0) + 1)));
        const allThemesList = Array.from(themeCounts.entries()).sort((a, b) => b[1] - a[1]);
        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsThemeManagerOpen(false)}>
            <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-gray-800">
                <h2 className="text-lg font-semibold text-white">Manage Themes</h2>
                <button onClick={() => setIsThemeManagerOpen(false)} className="text-gray-500 hover:text-white">✕</button>
              </div>
              <div className="p-5 max-h-[60vh] overflow-y-auto">
                {allThemesList.length === 0 ? (
                  <p className="text-sm text-gray-500">No themes yet. Run "Analyze Themes" to generate some.</p>
                ) : (
                  <div className="space-y-2">
                    {allThemesList.map(([theme, count]) => (
                      <div key={theme} className="flex items-center gap-2 group">
                        <span className="text-xs text-gray-600 w-5 text-right shrink-0">{count}</span>
                        <input
                          defaultValue={theme}
                          className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
                          onBlur={e => renameTheme(theme, e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                        />
                        <button
                          onClick={() => { if (confirm(`Remove "${theme}" from all pillars?`)) deleteTheme(theme); }}
                          className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-sm transition-opacity px-1"
                        >✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-gray-800 text-xs text-gray-500">
                Edit a name to rename it across all pillars. Click ✕ to remove.
              </div>
            </div>
          </div>
        );
      })()}

      {/* SETTINGS MODAL */}
      {/* Bottom Bar */}
      <div className="shrink-0 h-9 border-t border-gray-800/80 bg-gray-950 flex items-center justify-center gap-6 px-6 z-10">
        <ShortcutHint keys={['N']} label="new idea" />
        <ShortcutHint keys={['/']} label="search" />
        {editingExecutionId && <ShortcutHint keys={['⌃', 'S']} label="save" />}
      </div>

      {isSettingsOpen && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
           <div className="bg-gray-900 border border-gray-800 w-[900px] h-[600px] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-fade-in-down">
              <div className="h-14 border-b border-gray-800 flex items-center justify-between px-6 shrink-0">
                <h3 className="text-lg font-medium text-white">Settings & Tuning</h3>
                <button onClick={() => setIsSettingsOpen(false)} className="text-gray-500 hover:text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              
              <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <div className="w-56 border-r border-gray-800 bg-gray-950 overflow-y-auto py-4">
                  <div className="px-4 mb-2 text-xs font-mono text-gray-500 uppercase tracking-widest">General</div>
                  <button 
                    onClick={() => setSettingsTab('general')}
                    className={`w-full text-left px-6 py-2 text-sm transition-colors ${settingsTab === 'general' ? 'text-accent-400 bg-gray-900 border-r-2 border-accent-500' : 'text-gray-400 hover:bg-gray-900 hover:text-gray-200'}`}
                  >
                    Global Voice & Model
                  </button>
                  
                  <div className="px-4 mt-6 mb-2 text-xs font-mono text-gray-500 uppercase tracking-widest">Platform Tuning</div>
                  {(['twitter', 'linkedin', 'newsletter', 'instagram', 'youtube'] as Platform[]).map(p => (
                    <button 
                      key={p}
                      onClick={() => setSettingsTab(p)}
                      className={`w-full text-left px-6 py-2 text-sm transition-colors ${settingsTab === p ? 'text-accent-400 bg-gray-900 border-r-2 border-accent-500' : 'text-gray-400 hover:bg-gray-900 hover:text-gray-200'}`}
                    >
                      {PLATFORM_CONFIG[p].label}
                    </button>
                  ))}
                </div>

                {/* Content */}
                <div className="flex-1 bg-gray-900 p-8 overflow-y-auto">
                  {settingsTab === 'general' ? (
                    <div className="space-y-8">
                       <div>
                         <label className="block text-sm font-medium text-gray-300 mb-2">AI Model</label>
                         <div className="text-xs text-gray-500 mb-3">Select the intelligence level for content generation.</div>
                         <div className="flex gap-4">
                           <label className={`flex-1 p-4 border rounded-lg cursor-pointer transition-colors ${settings.model === 'gemini-2.5-flash' ? 'bg-gray-800 border-accent-500' : 'bg-transparent border-gray-700 hover:bg-gray-800'}`}>
                              <input 
                                type="radio" 
                                name="model" 
                                value="gemini-2.5-flash" 
                                checked={settings.model === 'gemini-2.5-flash'}
                                onChange={() => updateSettings({...settings, model: 'gemini-2.5-flash'})}
                                className="hidden"
                              />
                              <div className="font-medium text-gray-200">Gemini 2.5 Flash</div>
                              <div className="text-xs text-gray-500 mt-1">Fast, efficient, great for drafting and simple edits.</div>
                           </label>
                           <label className={`flex-1 p-4 border rounded-lg cursor-pointer transition-colors ${settings.model === 'gemini-3-pro-preview' ? 'bg-gray-800 border-accent-500' : 'bg-transparent border-gray-700 hover:bg-gray-800'}`}>
                              <input 
                                type="radio" 
                                name="model" 
                                value="gemini-3-pro-preview" 
                                checked={settings.model === 'gemini-3-pro-preview'}
                                onChange={() => updateSettings({...settings, model: 'gemini-3-pro-preview'})}
                                className="hidden"
                              />
                              <div className="font-medium text-gray-200">Gemini 3.0 Pro</div>
                              <div className="text-xs text-gray-500 mt-1">High-intelligence, better reasoning for complex strategy.</div>
                           </label>
                         </div>
                       </div>

                       <div>
                         <label className="block text-sm font-medium text-gray-300 mb-2">Global Brand Voice</label>
                         <div className="text-xs text-gray-500 mb-3">The core personality that applies to ALL content.</div>
                         <textarea 
                            className="w-full h-32 bg-gray-950 border border-gray-700 rounded-lg p-4 text-sm text-gray-200 focus:border-accent-500 focus:ring-1 focus:ring-accent-500 outline-none resize-none"
                            value={settings.globalVoice}
                            onChange={(e) => updateSettings({...settings, globalVoice: e.target.value})}
                            placeholder="Describe your voice..."
                         />
                       </div>
                    </div>
                  ) : (
                    <div className="space-y-8">
                       <div className="flex items-center space-x-2 mb-6">
                          <h3 className="text-xl font-medium text-white">{PLATFORM_CONFIG[settingsTab].label}</h3>
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase border ${settingsTab === 'linkedin' ? 'border-blue-900 text-blue-500' : 'border-gray-700 text-gray-500'}`}>Configuration</span>
                       </div>

                       <div>
                         <label className="block text-sm font-medium text-gray-300 mb-2">Format Guidelines</label>
                         <div className="text-xs text-gray-500 mb-3">Specific rules for structure, length, and formatting on this channel.</div>
                         <textarea 
                            className="w-full h-32 bg-gray-950 border border-gray-700 rounded-lg p-4 text-sm text-gray-200 focus:border-accent-500 focus:ring-1 focus:ring-accent-500 outline-none resize-none"
                            value={settings.platforms[settingsTab].customPrompt}
                            onChange={(e) => handlePlatformSettingChange(settingsTab, 'customPrompt', e.target.value)}
                            placeholder={`How should ${PLATFORM_CONFIG[settingsTab].label} posts look?`}
                         />
                       </div>

                       <div>
                         <label className="block text-sm font-medium text-gray-300 mb-2">Writing Samples (Few-Shot)</label>
                         <div className="text-xs text-gray-500 mb-3">Paste 3-5 examples of your BEST content on this platform. The AI will mimic this style.</div>
                         <textarea 
                            className="w-full h-48 bg-gray-950 border border-gray-700 rounded-lg p-4 text-sm text-gray-200 focus:border-accent-500 focus:ring-1 focus:ring-accent-500 outline-none resize-none font-mono"
                            value={settings.platforms[settingsTab].writingSamples}
                            onChange={(e) => handlePlatformSettingChange(settingsTab, 'writingSamples', e.target.value)}
                            placeholder="Paste examples here..."
                         />
                       </div>
                    </div>
                  )}
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

export default App;