import React, { useState, useEffect, useCallback, useRef } from 'react';
import { INITIAL_PILLARS, INITIAL_EXECUTIONS, TOPICS, PLATFORM_CONFIG, DEFAULT_SETTINGS } from './constants';
import { Pillar, Execution, NavState, Platform, UserSettings, PlatformSettings, Play, WeeklyPlan, PlannedPost, NotionIdea, MCPConfig } from './types';
import { PillarCard } from './components/PillarCard';
import { ExecutionCard } from './components/ExecutionCard';
import { PlayCard } from './components/PlayCard';
import { PlayModal } from './components/PlayModal';
import { CSVImportModal } from './components/CSVImportModal';
import { WeeklyPlanModal } from './components/WeeklyPlanModal';
import { PlanReviewPanel } from './components/PlanReviewPanel';
import { ImportedPerformanceData } from './services/csvImportService';
import { generateExecutions, generatePillarIdeas, refineCopy, analyzeThemes, executePlay } from './services/geminiService';
import { fetchNotionIdeas, fetchNotionDatabases, NotionDatabase, markIdeaAsUsed } from './services/notionMcpService';
import { PLAYS } from './plays';

function App() {
  // --- State ---
  const [pillars, setPillars] = useState<Pillar[]>(() => {
    const saved = localStorage.getItem('flow_pillars');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_PILLARS;
      }
    }
    return INITIAL_PILLARS;
  });
  const [executions, setExecutions] = useState<Execution[]>(() => {
    const saved = localStorage.getItem('flow_executions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_EXECUTIONS;
      }
    }
    return INITIAL_EXECUTIONS;
  });
  
  // Selection State
  const [selectedPillarId, setSelectedPillarId] = useState<string | null>(() => {
    const saved = localStorage.getItem('flow_pillars');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed[0]?.id || null;
      } catch {
        return INITIAL_PILLARS[0]?.id || null;
      }
    }
    return INITIAL_PILLARS[0]?.id || null;
  });
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  
  // UI State
  const [navState, setNavState] = useState<NavState>({ column: 0, editing: false });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTopic, setFilterTopic] = useState<string | null>(null);
  const [filterTheme, setFilterTheme] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'archived'>('active');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState('');

  // Editor History (Undo/Redo)
  const [editorHistory, setEditorHistory] = useState<{ past: string[]; future: string[] }>({ past: [], future: [] });

  // Settings State
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'general' | 'mcp' | Platform>('general');

  // Generator Modal State
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [genPlatforms, setGenPlatforms] = useState<Platform[]>(['twitter', 'linkedin']);
  const [genInstructions, setGenInstructions] = useState('');

  // Plays State
  const [isPlaysOpen, setIsPlaysOpen] = useState(false);
  const [selectedPlay, setSelectedPlay] = useState<Play | null>(null);

  // CSV Import State
  const [isCSVImportOpen, setIsCSVImportOpen] = useState(false);

  // Weekly Plan State
  const [isWeeklyPlanOpen, setIsWeeklyPlanOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [weeklyPlans, setWeeklyPlans] = useState<WeeklyPlan[]>(() => {
    const saved = localStorage.getItem('flow_weekly_plans');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  // Notion/MCP State
  const [notionIdeas, setNotionIdeas] = useState<NotionIdea[]>([]);
  const [notionDatabases, setNotionDatabases] = useState<NotionDatabase[]>([]);
  const [isLoadingNotion, setIsLoadingNotion] = useState(false);

  // AI Editor State
  const [editorPrompt, setEditorPrompt] = useState('');

  // Editor Refs
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const genInputRef = useRef<HTMLInputElement>(null);
  const aiEditorInputRef = useRef<HTMLInputElement>(null);

  // --- Persistence ---
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

  // Persist pillars
  useEffect(() => {
    localStorage.setItem('flow_pillars', JSON.stringify(pillars));
  }, [pillars]);

  // Persist executions
  useEffect(() => {
    localStorage.setItem('flow_executions', JSON.stringify(executions));
  }, [executions]);

  // Persist weekly plans
  useEffect(() => {
    localStorage.setItem('flow_weekly_plans', JSON.stringify(weeklyPlans));
  }, [weeklyPlans]);

  // --- Derived Data ---
  
  // Extract all unique themes from current pillars
  const allThemes = Array.from(new Set(pillars.flatMap(p => p.themes || []).filter(Boolean))).sort();

  const filteredPillars = pillars.filter(p => {
    const matchSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        p.coreIdea.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTopic = filterTopic ? p.topic === filterTopic : true;
    const matchTheme = filterTheme ? p.themes?.includes(filterTheme) : true;
    const matchStatus = filterStatus === 'all' ? true : p.status === filterStatus;

    return matchSearch && matchTopic && matchTheme && matchStatus;
  });

  const filteredExecutions = executions.filter(e => e.pillarId === selectedPillarId);

  // --- Keyboard Navigation ---
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Modal Shortcuts
    if (isGeneratorOpen) {
      if (e.key === 'Escape') setIsGeneratorOpen(false);
      else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') document.getElementById('btn-confirm-generate')?.click();
      return;
    }
    if (isSettingsOpen) {
      if (e.key === 'Escape') setIsSettingsOpen(false);
      return;
    }

    // Editor Shortcuts
    if (navState.column === 2) {
      // Toggle AI Command Input
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        aiEditorInputRef.current?.focus();
        return;
      }
      
      // Escape from editing to nav mode
      if (navState.editing && e.key === 'Escape') {
        setNavState(prev => ({ ...prev, editing: false }));
        editorRef.current?.blur();
        aiEditorInputRef.current?.blur();
        return;
      }
    }

    if (navState.editing) return; // Stop other nav if typing in main editor

    // Column Navigation
    if (e.key === 'ArrowRight') {
      if (navState.column < 2) {
        setNavState(prev => ({ ...prev, column: (prev.column + 1) as 0 | 1 | 2 }));
      }
    } else if (e.key === 'ArrowLeft') {
      if (navState.column > 0) {
        setNavState(prev => ({ ...prev, column: (prev.column - 1) as 0 | 1 | 2 }));
      }
    }

    // Vertical Item Navigation
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const isDown = e.key === 'ArrowDown';

      if (navState.column === 0) {
        const idx = filteredPillars.findIndex(p => p.id === selectedPillarId);
        const nextIdx = isDown ? Math.min(idx + 1, filteredPillars.length - 1) : Math.max(idx - 1, 0);
        if (filteredPillars[nextIdx]) setSelectedPillarId(filteredPillars[nextIdx].id);
      } 
      else if (navState.column === 1) {
        const idx = filteredExecutions.findIndex(e => e.id === selectedExecutionId);
        if (idx === -1 && filteredExecutions.length > 0) {
          setSelectedExecutionId(filteredExecutions[0].id);
        } else {
          const nextIdx = isDown ? Math.min(idx + 1, filteredExecutions.length - 1) : Math.max(idx - 1, 0);
          if (filteredExecutions[nextIdx]) setSelectedExecutionId(filteredExecutions[nextIdx].id);
        }
      }
    }

    // Enter to edit
    else if (e.key === 'Enter') {
      if (navState.column === 2 && selectedExecutionId) {
        e.preventDefault();
        setNavState(prev => ({ ...prev, editing: true }));
        setTimeout(() => editorRef.current?.focus(), 10);
      }
    }
    
    // Shortcuts
    else if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      document.getElementById('search-input')?.focus();
    }
    // Undo/Redo
    else if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      handleUndo();
    }
    else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
      e.preventDefault();
      handleRedo();
    }
  }, [navState, filteredPillars, filteredExecutions, selectedPillarId, selectedExecutionId, isGeneratorOpen, isSettingsOpen, editorHistory]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (selectedPillarId) {
      const related = executions.filter(e => e.pillarId === selectedPillarId);
      if (related.length > 0 && !related.find(e => e.id === selectedExecutionId)) {
         setSelectedExecutionId(related[0].id);
      } else if (related.length === 0) {
        setSelectedExecutionId(null);
      }
    }
  }, [selectedPillarId, executions]);

  // Focus input when modal opens
  useEffect(() => {
    if (isGeneratorOpen) {
      setTimeout(() => genInputRef.current?.focus(), 50);
    }
  }, [isGeneratorOpen]);


  // --- Handlers ---
  const updateExecutionContent = (newContent: string, addToHistory = true) => {
    if (!selectedExecutionId) return;
    const currentExec = executions.find(e => e.id === selectedExecutionId);
    if (addToHistory && currentExec) {
      setEditorHistory(prev => ({
        past: [...prev.past.slice(-49), currentExec.content],
        future: [],
      }));
    }
    setExecutions(prev => prev.map(e => e.id === selectedExecutionId ? { ...e, content: newContent, lastEdited: new Date().toISOString() } : e));
  };

  const handleUndo = () => {
    if (editorHistory.past.length === 0) return;
    const currentExec = executions.find(e => e.id === selectedExecutionId);
    if (!currentExec) return;
    const previous = editorHistory.past[editorHistory.past.length - 1];
    setEditorHistory(prev => ({
      past: prev.past.slice(0, -1),
      future: [currentExec.content, ...prev.future],
    }));
    setExecutions(prev => prev.map(e => e.id === selectedExecutionId ? { ...e, content: previous, lastEdited: new Date().toISOString() } : e));
  };

  const handleRedo = () => {
    if (editorHistory.future.length === 0) return;
    const currentExec = executions.find(e => e.id === selectedExecutionId);
    if (!currentExec) return;
    const next = editorHistory.future[0];
    setEditorHistory(prev => ({
      past: [...prev.past, currentExec.content],
      future: prev.future.slice(1),
    }));
    setExecutions(prev => prev.map(e => e.id === selectedExecutionId ? { ...e, content: next, lastEdited: new Date().toISOString() } : e));
  };

  const handleArchivePillar = (pillarId: string) => {
    setPillars(prev => prev.map(p =>
      p.id === pillarId ? { ...p, status: p.status === 'archived' ? 'active' : 'archived' } : p
    ));
  };

  const handleUpdatePillarThemes = (pillarId: string, themes: string[]) => {
    setPillars(prev => prev.map(p =>
      p.id === pillarId ? { ...p, themes } : p
    ));
  };

  const handleAddPillar = async () => {
    const topic = filterTopic || 'General';
    setIsAiLoading(true);
    setAiMessage(`Ideating pillars for ${topic}...`);
    try {
      const ideas = await generatePillarIdeas(topic, settings);
      const newPillars = ideas.map((idea, i) => ({
        id: `new-p-${Date.now()}-${i}`,
        title: idea.title,
        coreIdea: idea.coreIdea,
        topic: topic,
        status: 'active' as const,
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
        return update ? { ...p, themes: update.themes } : p;
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
      const newExecutions = suggestions.map((s, i) => ({
        id: `new-e-${Date.now()}-${i}`,
        pillarId: pillar.id,
        platform: s.platform,
        status: 'draft' as const,
        content: s.content,
        lastEdited: new Date().toISOString(),
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

  // --- Plays Handlers ---
  const handlePlaySelect = (play: Play) => {
    setSelectedPlay(play);
    setIsPlaysOpen(false);
  };

  const handlePlayExecute = async (inputValues: Record<string, string>) => {
    if (!selectedPlay) return;

    // Find the pillar if one was selected
    const pillarId = inputValues.pillar;
    const pillar = pillarId ? pillars.find(p => p.id === pillarId) : null;

    setIsAiLoading(true);
    setAiMessage(`Running ${selectedPlay.name}...`);

    try {
      const outputs = await executePlay(selectedPlay, inputValues, pillar || null, settings);

      // Create executions from the outputs
      const targetPillarId = pillar?.id || selectedPillarId || pillars[0]?.id;
      const newExecutions = outputs.map((output, i) => ({
        id: `play-e-${Date.now()}-${i}`,
        pillarId: targetPillarId,
        platform: output.platform,
        status: 'draft' as const,
        content: output.content,
        lastEdited: new Date().toISOString(),
      }));

      setExecutions(prev => [...prev, ...newExecutions]);

      // Select the pillar and first new execution
      if (targetPillarId) setSelectedPillarId(targetPillarId);
      if (newExecutions.length > 0) setSelectedExecutionId(newExecutions[0].id);

      setSelectedPlay(null);
    } catch (e) {
      alert(`Failed to run ${selectedPlay.name}`);
    } finally {
      setIsAiLoading(false);
      setAiMessage('');
    }
  };

  // --- CSV Import Handler ---
  const handleCSVImport = (matches: Map<string, ImportedPerformanceData>) => {
    setExecutions(prev => prev.map(exec => {
      const matchedData = matches.get(exec.id);
      if (matchedData) {
        return {
          ...exec,
          status: 'published' as const,
          publishedAt: matchedData.publishedAt,
          performanceScore: matchedData.score,
          performanceMetrics: matchedData.metrics,
        };
      }
      return exec;
    }));
  };

  // --- Weekly Plan Handlers ---
  const handlePlanGenerated = async (plan: WeeklyPlan, usedIdeaIds?: string[]) => {
    setWeeklyPlans(prev => [plan, ...prev]);

    // Mark used Notion ideas as used
    if (usedIdeaIds && usedIdeaIds.length > 0 && settings.mcp?.enabled) {
      // Update local state
      setNotionIdeas(prev => prev.map(idea =>
        usedIdeaIds.includes(idea.id) ? { ...idea, status: 'used' as const } : idea
      ));

      // Mark as used via MCP (async, don't wait)
      usedIdeaIds.forEach(ideaId => {
        markIdeaAsUsed(ideaId, settings.mcp!).catch(console.error);
      });
    }
  };

  const handleUpdatePlannedPost = (postId: string, updates: Partial<PlannedPost>) => {
    setWeeklyPlans(prev => prev.map(plan => ({
      ...plan,
      posts: plan.posts.map(post =>
        post.id === postId ? { ...post, ...updates } : post
      ),
    })));
  };

  const handleDraftFromPlan = (post: PlannedPost) => {
    // Find the pillar for this post
    const pillar = pillars.find(p => p.id === post.pillarId);

    // Create a new execution draft
    const newExecution: Execution = {
      id: `exec-${Date.now()}`,
      pillarId: post.pillarId,
      platform: post.platform,
      status: 'draft',
      content: `${post.hook}\n\n[${post.angle}]`,
      lastEdited: new Date().toISOString(),
    };

    // Add the execution
    setExecutions(prev => [...prev, newExecution]);

    // Update the planned post to drafted status and link to execution
    handleUpdatePlannedPost(post.id, {
      status: 'drafted',
      executionId: newExecution.id,
    });

    // Navigate to the new execution
    if (pillar) setSelectedPillarId(pillar.id);
    setSelectedExecutionId(newExecution.id);
    setNavState({ column: 2, editing: false });
  };

  const selectedPlan = weeklyPlans.find(p => p.id === selectedPlanId);

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

              <div className="flex flex-col space-y-1.5">
                  {/* Topics Row */}
                  <div className="flex space-x-1 items-center">
                    <span className="text-[10px] font-mono text-gray-600 uppercase tracking-wider w-12">Topics</span>
                    <button 
                        onClick={() => setFilterTopic(null)}
                        className={`px-3 py-0.5 text-xs rounded-md transition-colors ${!filterTopic ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900'}`}
                      >All</button>
                    {TOPICS.map(t => (
                      <button 
                        key={t} 
                        onClick={() => setFilterTopic(t)}
                        className={`px-3 py-0.5 text-xs rounded-md transition-colors ${filterTopic === t ? 'bg-accent-600/20 text-accent-500' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900'}`}
                      >{t}</button>
                    ))}
                  </div>

                  {/* Themes Row (If they exist) */}
                  {allThemes.length > 0 && (
                    <div className="flex space-x-1 items-center">
                        <span className="text-[10px] font-mono text-indigo-500/60 uppercase tracking-wider w-12">Themes</span>
                         <button 
                            onClick={() => setFilterTheme(null)}
                            className={`px-3 py-0.5 text-xs rounded-md transition-colors ${!filterTheme ? 'bg-indigo-900/30 text-indigo-200' : 'text-indigo-500/70 hover:text-indigo-300 hover:bg-gray-900'}`}
                          >All</button>
                         {allThemes.map(t => (
                           <button 
                            key={t}
                            onClick={() => setFilterTheme(t)}
                            className={`px-3 py-0.5 text-xs rounded-md transition-colors ${filterTheme === t ? 'bg-indigo-500 text-white' : 'text-indigo-500/70 hover:text-indigo-300 hover:bg-gray-900'}`}
                           >
                             {t}
                           </button>
                         ))}
                    </div>
                  )}
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
                onClick={() => setIsPlaysOpen(true)}
                className="px-3 py-1.5 text-sm bg-accent-600 text-white rounded-md hover:bg-accent-500 transition-colors flex items-center space-x-1"
                title="Run a Play"
              >
                <span>🎬</span>
                <span>Plays</span>
              </button>

              <button
                onClick={() => setIsCSVImportOpen(true)}
                className="px-3 py-1.5 text-sm bg-gray-800 text-gray-300 rounded-md hover:bg-gray-700 hover:text-white transition-colors flex items-center space-x-1"
                title="Import Performance Data"
              >
                <span>📊</span>
                <span>Import</span>
              </button>

              <div className="relative group">
                <button
                  onClick={() => setIsWeeklyPlanOpen(true)}
                  className="px-3 py-1.5 text-sm bg-gray-800 text-gray-300 rounded-md hover:bg-gray-700 hover:text-white transition-colors flex items-center space-x-1"
                  title="Generate Weekly Plan"
                >
                  <span>📅</span>
                  <span>Plan</span>
                  {weeklyPlans.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-accent-600 text-[10px] rounded-full">
                      {weeklyPlans.length}
                    </span>
                  )}
                </button>
                {weeklyPlans.length > 0 && (
                  <div className="absolute right-0 top-full mt-1 w-64 bg-gray-900 border border-gray-800 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                    <div className="p-2 border-b border-gray-800 text-xs text-gray-500 font-medium">
                      Saved Plans
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {weeklyPlans.slice(0, 5).map((plan) => (
                        <button
                          key={plan.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPlanId(plan.id);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-800 transition-colors flex justify-between items-center"
                        >
                          <span className="text-sm text-gray-300">
                            Week of {new Date(plan.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            plan.status === 'draft' ? 'bg-yellow-500/20 text-yellow-400' :
                            plan.status === 'active' ? 'bg-green-500/20 text-green-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {plan.posts.filter(p => p.status === 'drafted' || p.status === 'approved').length}/{plan.posts.length}
                          </span>
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsWeeklyPlanOpen(true);
                      }}
                      className="w-full text-center px-3 py-2 text-xs text-accent-400 hover:bg-gray-800 transition-colors border-t border-gray-800"
                    >
                      + New Plan
                    </button>
                  </div>
                )}
              </div>

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

      {/* Main Columns Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* COLUMN 1: PILLARS (STRATEGY) */}
        <section 
          onClick={() => setNavState({ ...navState, column: 0 })}
          className={`w-[320px] flex flex-col border-r border-gray-800 bg-gray-950 transition-colors ${navState.column === 0 ? 'bg-gray-900/30' : ''}`}
        >
           <div className="p-4 border-b border-gray-800 flex flex-col space-y-2 shrink-0">
              <div className="flex justify-between items-center">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Strategy / Pillars</h2>
                <div className="flex space-x-2">
                  <button onClick={handleAnalyzeThemes} className="text-[10px] px-2 py-1 bg-indigo-900/20 text-indigo-400 rounded hover:bg-indigo-900/40 transition-colors" title="Analyze Themes">
                     ✨ Themes
                  </button>
                  <button onClick={handleAddPillar} className="text-xs hover:text-white text-gray-500 flex items-center transition-colors">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    Ideate
                  </button>
                </div>
              </div>
              <div className="flex space-x-1">
                {(['active', 'archived', 'all'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-2 py-0.5 text-[10px] rounded transition-colors ${filterStatus === status ? 'bg-gray-800 text-white' : 'text-gray-600 hover:text-gray-400'}`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
           </div>
           <div className="overflow-y-auto flex-1 pb-10">
              {filteredPillars.map(p => (
                <PillarCard
                  key={p.id}
                  pillar={p}
                  isActive={selectedPillarId === p.id}
                  onClick={() => { setSelectedPillarId(p.id); setNavState({ ...navState, column: 0 }); }}
                  onArchive={() => handleArchivePillar(p.id)}
                  onUpdateThemes={(themes) => handleUpdatePillarThemes(p.id, themes)}
                />
              ))}
           </div>
        </section>

        {/* COLUMN 2: EXECUTIONS (TACTICS) */}
        <section 
          onClick={() => setNavState({ ...navState, column: 1 })}
          className={`w-[320px] flex flex-col border-r border-gray-800 bg-gray-950 transition-colors ${navState.column === 1 ? 'bg-gray-900/30' : ''}`}
        >
          <div className="p-4 border-b border-gray-800 flex justify-between items-center shrink-0">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Tactics / Drafts</h2>
              <button onClick={openGenerator} className="text-xs hover:text-white text-gray-500 flex items-center disabled:opacity-50 transition-colors" disabled={!selectedPillarId}>
                 <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                 Generate
              </button>
           </div>
           <div className="overflow-y-auto flex-1 pb-10">
              {filteredExecutions.length === 0 ? (
                <div className="p-8 text-center text-gray-700 text-sm">
                  No drafts yet. Select a pillar and generate ideas.
                </div>
              ) : (
                filteredExecutions.map(e => (
                  <ExecutionCard 
                    key={e.id} 
                    execution={e} 
                    isActive={selectedExecutionId === e.id}
                    onClick={() => { setSelectedExecutionId(e.id); setNavState({ ...navState, column: 1 }); }}
                  />
                ))
              )}
           </div>
        </section>

        {/* COLUMN 3: EDITOR (CREATION) - AI NATIVE */}
        <section 
          onClick={() => !navState.editing && setNavState({ ...navState, column: 2 })}
          className={`flex-1 flex flex-col bg-gray-950 transition-all duration-300 relative ${navState.column === 2 ? 'bg-gray-900/10' : ''}`}
        >
          {selectedExecutionId ? (
            <>
              {/* Minimal Info Header */}
              <div className="h-10 flex items-center justify-between px-8 pt-4 opacity-70 select-none">
                {(() => {
                  const current = executions.find(e => e.id === selectedExecutionId);
                  if (!current) return null;
                  const config = PLATFORM_CONFIG[current.platform];
                  return (
                    <div className="flex items-center space-x-3 font-mono text-[10px] text-gray-500 uppercase tracking-widest">
                      <span className={`${config.color}`}>{config.label}</span>
                      <span>/</span>
                      <span>{current.content?.length || 0} {config.maxChars ? `of ${config.maxChars}` : 'chars'}</span>
                      {navState.editing && <span className="text-green-500 ml-2 animate-pulse">● Live Editing</span>}
                    </div>
                  )
                })()}
                <div className="flex items-center space-x-3">
                  <div className="flex space-x-1">
                    <button
                      onClick={handleUndo}
                      disabled={editorHistory.past.length === 0}
                      className="p-1 text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Undo (Cmd+Z)"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                    </button>
                    <button
                      onClick={handleRedo}
                      disabled={editorHistory.future.length === 0}
                      className="p-1 text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Redo (Cmd+Shift+Z)"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg>
                    </button>
                  </div>
                  <div className="text-[10px] text-gray-600 font-mono">Cmd+J to Ask AI</div>
                </div>
              </div>

              {/* Canvas */}
              <div className="flex-1 relative flex flex-col">
                <textarea
                    ref={editorRef}
                    value={executions.find(e => e.id === selectedExecutionId)?.content || ''}
                    onChange={(e) => updateExecutionContent(e.target.value)}
                    disabled={!navState.editing}
                    className={`
                      flex-1 w-full bg-transparent resize-none outline-none font-mono text-base leading-relaxed px-8 py-6
                      ${navState.editing ? 'text-gray-100 placeholder-gray-600' : 'text-gray-300 cursor-default'}
                      ${isAiLoading ? 'opacity-50 blur-[1px] transition-all duration-500' : 'opacity-100 transition-all duration-200'}
                    `}
                    placeholder="Start writing..."
                 />

                 {/* AI Command Deck */}
                 <div className="px-8 pb-6 pt-2 bg-gradient-to-t from-gray-950 via-gray-950 to-transparent">
                    {/* Magic Buttons */}
                    <div className="flex space-x-2 mb-3 overflow-x-auto pb-1 no-scrollbar">
                       {[
                         { label: 'Shorten', prompt: 'Make this shorter and more concise' },
                         { label: 'Punch Up', prompt: 'Make this more engaging, punchy, and viral' },
                         { label: 'Fix Grammar', prompt: 'Fix grammar and spelling errors only' },
                         { label: 'Professional', prompt: 'Make this sound more professional and authoritative' },
                         { label: 'Casual', prompt: 'Make this sound more casual and authentic' }
                       ].map((action) => (
                         <button
                            key={action.label}
                            onClick={() => handleAiEdit(action.prompt)}
                            disabled={isAiLoading}
                            className="shrink-0 px-3 py-1 text-xs bg-gray-900 border border-gray-800 rounded-full text-gray-400 hover:text-white hover:border-gray-600 hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-50"
                         >
                            ✨ {action.label}
                         </button>
                       ))}
                    </div>

                    {/* Command Input */}
                    <div className={`relative flex items-center bg-gray-900/80 border backdrop-blur-sm rounded-lg transition-colors ${navState.column === 2 && !navState.editing ? 'border-gray-700 ring-1 ring-gray-700' : 'border-gray-800 focus-within:border-accent-500/50 focus-within:ring-1 focus-within:ring-accent-500/50'}`}>
                       <div className="pl-3 text-gray-500">
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                       </div>
                       <input 
                          ref={aiEditorInputRef}
                          type="text" 
                          value={editorPrompt}
                          onChange={(e) => setEditorPrompt(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleAiEdit();
                            }
                          }}
                          disabled={isAiLoading}
                          placeholder="Ask AI to edit... (Cmd+J)"
                          className="w-full bg-transparent border-none text-sm px-3 py-3 text-white placeholder-gray-500 focus:ring-0"
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
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-700 flex-col select-none">
              <svg className="w-12 h-12 mb-4 opacity-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              <p className="text-sm font-mono">Select a draft to edit</p>
            </div>
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

      {/* SETTINGS MODAL */}
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

                  <div className="px-4 mt-6 mb-2 text-xs font-mono text-gray-500 uppercase tracking-widest">Integrations</div>
                  <button
                    onClick={() => {
                      setSettingsTab('mcp');
                      // Load databases when opening MCP tab
                      if (notionDatabases.length === 0) {
                        fetchNotionDatabases().then(setNotionDatabases);
                      }
                    }}
                    className={`w-full text-left px-6 py-2 text-sm transition-colors ${settingsTab === 'mcp' ? 'text-accent-400 bg-gray-900 border-r-2 border-accent-500' : 'text-gray-400 hover:bg-gray-900 hover:text-gray-200'}`}
                  >
                    Notion (MCP)
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 bg-gray-900 p-8 overflow-y-auto">
                  {settingsTab === 'general' ? (
                    <div className="space-y-8">
                       <div>
                         <label className="block text-sm font-medium text-gray-300 mb-2">Gemini API Key</label>
                         <div className="text-xs text-gray-500 mb-3">Get your API key from <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-accent-400 hover:underline">Google AI Studio</a>.</div>
                         <input
                           type="password"
                           className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-sm text-gray-200 focus:border-accent-500 focus:ring-1 focus:ring-accent-500 outline-none font-mono"
                           value={settings.apiKey || ''}
                           onChange={(e) => updateSettings({...settings, apiKey: e.target.value})}
                           placeholder="AIza..."
                         />
                         {!settings.apiKey && (
                           <div className="mt-2 text-xs text-yellow-500/80 flex items-center">
                             <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                             API key required for AI features
                           </div>
                         )}
                       </div>

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
                  ) : settingsTab === 'mcp' ? (
                    <div className="space-y-8">
                       <div className="flex items-center space-x-2 mb-6">
                          <h3 className="text-xl font-medium text-white">Notion Integration</h3>
                          <span className="px-2 py-0.5 rounded text-[10px] uppercase border border-indigo-900 text-indigo-500">MCP</span>
                       </div>

                       <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
                         <p className="text-sm text-gray-300">
                           Connect your Notion database to pull ideas directly into your weekly content plans.
                           Ideas marked as &quot;unprocessed&quot; will be suggested during planning.
                         </p>
                       </div>

                       <div>
                         <div className="flex items-center justify-between mb-4">
                           <label className="block text-sm font-medium text-gray-300">Enable Notion Sync</label>
                           <button
                             onClick={() => updateSettings({
                               ...settings,
                               mcp: { ...settings.mcp, enabled: !settings.mcp?.enabled }
                             })}
                             className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                               settings.mcp?.enabled ? 'bg-accent-600' : 'bg-gray-700'
                             }`}
                           >
                             <span
                               className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                 settings.mcp?.enabled ? 'translate-x-6' : 'translate-x-1'
                               }`}
                             />
                           </button>
                         </div>
                       </div>

                       {settings.mcp?.enabled && (
                         <>
                           <div>
                             <label className="block text-sm font-medium text-gray-300 mb-2">Select Database</label>
                             <div className="text-xs text-gray-500 mb-3">
                               Choose the Notion database containing your content ideas.
                             </div>
                             <div className="space-y-2">
                               {notionDatabases.map((db) => (
                                 <button
                                   key={db.id}
                                   onClick={() => updateSettings({
                                     ...settings,
                                     mcp: { ...settings.mcp, enabled: true, notionDatabaseId: db.id }
                                   })}
                                   className={`w-full text-left p-3 rounded-lg border transition-colors ${
                                     settings.mcp?.notionDatabaseId === db.id
                                       ? 'bg-accent-600/20 border-accent-500 text-white'
                                       : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                                   }`}
                                 >
                                   <div className="flex justify-between items-center">
                                     <span className="font-medium">{db.title}</span>
                                     {db.itemCount !== undefined && (
                                       <span className="text-xs text-gray-500">{db.itemCount} items</span>
                                     )}
                                   </div>
                                 </button>
                               ))}
                               {notionDatabases.length === 0 && (
                                 <div className="text-sm text-gray-500 text-center py-4">
                                   Loading databases...
                                 </div>
                               )}
                             </div>
                           </div>

                           {settings.mcp?.notionDatabaseId && (
                             <div>
                               <label className="block text-sm font-medium text-gray-300 mb-2">Sync Ideas</label>
                               <button
                                 onClick={async () => {
                                   setIsLoadingNotion(true);
                                   try {
                                     const ideas = await fetchNotionIdeas(settings.mcp!);
                                     setNotionIdeas(ideas);
                                     updateSettings({
                                       ...settings,
                                       mcp: { ...settings.mcp!, lastSyncAt: new Date().toISOString() }
                                     });
                                   } finally {
                                     setIsLoadingNotion(false);
                                   }
                                 }}
                                 disabled={isLoadingNotion}
                                 className="px-4 py-2 bg-accent-600 text-white text-sm font-medium rounded hover:bg-accent-500 transition-colors disabled:opacity-50"
                               >
                                 {isLoadingNotion ? 'Syncing...' : 'Sync Now'}
                               </button>
                               {settings.mcp?.lastSyncAt && (
                                 <p className="text-xs text-gray-500 mt-2">
                                   Last synced: {new Date(settings.mcp.lastSyncAt).toLocaleString()}
                                 </p>
                               )}
                               {notionIdeas.length > 0 && (
                                 <div className="mt-4">
                                   <p className="text-sm text-gray-400 mb-2">
                                     {notionIdeas.filter(i => i.status === 'unprocessed').length} unprocessed ideas available
                                   </p>
                                   <div className="max-h-48 overflow-y-auto space-y-2">
                                     {notionIdeas.filter(i => i.status === 'unprocessed').slice(0, 5).map((idea) => (
                                       <div key={idea.id} className="p-2 bg-gray-800/50 rounded text-sm">
                                         <div className="text-white">{idea.title}</div>
                                         {idea.tags.length > 0 && (
                                           <div className="flex gap-1 mt-1">
                                             {idea.tags.map((tag) => (
                                               <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-gray-700 rounded text-gray-400">
                                                 {tag}
                                               </span>
                                             ))}
                                           </div>
                                         )}
                                       </div>
                                     ))}
                                   </div>
                                 </div>
                               )}
                             </div>
                           )}
                         </>
                       )}

                       <div className="pt-4 border-t border-gray-800">
                         <p className="text-xs text-gray-600">
                           MCP (Model Context Protocol) enables secure integration with external tools.
                           When running in Claude Code, connect the Notion MCP server for full functionality.
                         </p>
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

      {/* PLAYS LIBRARY MODAL */}
      {isPlaysOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start pt-[10vh] justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 w-[500px] rounded-xl shadow-2xl overflow-hidden animate-fade-in-down">
            <div className="p-6 border-b border-gray-800">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium text-white">Run a Play</h3>
                  <p className="text-sm text-gray-500 mt-1">Transform ideas into multi-platform content</p>
                </div>
                <button
                  onClick={() => setIsPlaysOpen(false)}
                  className="p-1 text-gray-500 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {PLAYS.map((play) => (
                <PlayCard key={play.id} play={play} onClick={() => handlePlaySelect(play)} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PLAY EXECUTION MODAL */}
      {selectedPlay && (
        <PlayModal
          play={selectedPlay}
          pillars={pillars}
          isLoading={isAiLoading}
          onClose={() => setSelectedPlay(null)}
          onExecute={handlePlayExecute}
        />
      )}

      {/* CSV IMPORT MODAL */}
      {isCSVImportOpen && (
        <CSVImportModal
          executions={executions}
          onClose={() => setIsCSVImportOpen(false)}
          onImport={handleCSVImport}
        />
      )}

      {/* WEEKLY PLAN MODAL */}
      {isWeeklyPlanOpen && (
        <WeeklyPlanModal
          pillars={pillars}
          executions={executions}
          settings={settings}
          notionIdeas={notionIdeas}
          onClose={() => setIsWeeklyPlanOpen(false)}
          onPlanGenerated={handlePlanGenerated}
        />
      )}

      {/* PLAN REVIEW PANEL */}
      {selectedPlan && (
        <PlanReviewPanel
          plan={selectedPlan}
          pillars={pillars}
          onUpdatePost={handleUpdatePlannedPost}
          onDraftPost={handleDraftFromPlan}
          onClose={() => setSelectedPlanId(null)}
        />
      )}
    </div>
  );
}

export default App;