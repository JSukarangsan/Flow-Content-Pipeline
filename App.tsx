import React, { useState, useEffect, useCallback, useRef } from 'react';
import { INITIAL_PILLARS, INITIAL_EXECUTIONS, TOPICS, PLATFORM_CONFIG } from './constants';
import { Pillar, Execution, NavState, Platform } from './types';
import { PillarCard } from './components/PillarCard';
import { ExecutionCard } from './components/ExecutionCard';
import { generateExecutions, generatePillarIdeas, refineCopy } from './services/geminiService';

function App() {
  // --- State ---
  const [pillars, setPillars] = useState<Pillar[]>(INITIAL_PILLARS);
  const [executions, setExecutions] = useState<Execution[]>(INITIAL_EXECUTIONS);
  
  // Selection State
  const [selectedPillarId, setSelectedPillarId] = useState<string | null>(INITIAL_PILLARS[0]?.id || null);
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  
  // UI State
  const [navState, setNavState] = useState<NavState>({ column: 0, editing: false });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTopic, setFilterTopic] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState('');

  // Editor Refs
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // --- Derived Data ---
  const filteredPillars = pillars.filter(p => {
    const matchSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        p.coreIdea.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTopic = filterTopic ? p.topic === filterTopic : true;
    return matchSearch && matchTopic;
  });

  const filteredExecutions = executions.filter(e => e.pillarId === selectedPillarId);

  // --- Keyboard Navigation ---
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (navState.editing) {
      if (e.key === 'Escape') {
        setNavState(prev => ({ ...prev, editing: false }));
        // Refocus the container or simply blur the editor
        editorRef.current?.blur();
      }
      return; // Stop navigation processing if editing
    }

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
        // If nothing selected, select first
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
  }, [navState, filteredPillars, filteredExecutions, selectedPillarId, selectedExecutionId]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Auto-select first execution when switching pillars
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


  // --- Handlers ---
  const updateExecutionContent = (newContent: string) => {
    if (!selectedExecutionId) return;
    setExecutions(prev => prev.map(e => e.id === selectedExecutionId ? { ...e, content: newContent, lastEdited: new Date().toISOString() } : e));
  };

  const handleAddPillar = async () => {
    const topic = filterTopic || 'General';
    setIsAiLoading(true);
    setAiMessage(`Ideating pillars for ${topic}...`);
    try {
      const ideas = await generatePillarIdeas(topic);
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

  const handleGenerateExecutions = async () => {
    const pillar = pillars.find(p => p.id === selectedPillarId);
    if (!pillar) return;

    setIsAiLoading(true);
    setAiMessage(`Drafting posts for "${pillar.title}"...`);
    
    try {
      const suggestions = await generateExecutions(pillar.coreIdea);
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
    } catch (e) {
      alert("Failed to generate drafts");
    } finally {
      setIsAiLoading(false);
      setAiMessage('');
    }
  };

  const handleRefine = async (instruction: string) => {
    const exec = executions.find(e => e.id === selectedExecutionId);
    if (!exec) return;

    setIsAiLoading(true);
    setAiMessage('Refining copy...');
    try {
      const newContent = await refineCopy(exec.content, instruction);
      updateExecutionContent(newContent);
    } finally {
      setIsAiLoading(false);
      setAiMessage('');
    }
  };

  // --- Rendering ---

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-200 font-sans selection:bg-accent-500/30 selection:text-white">
      
      {/* Top Bar */}
      <header className="h-14 border-b border-gray-800 flex items-center px-4 justify-between bg-gray-950/50 backdrop-blur-sm z-10">
        <div className="flex items-center space-x-6">
          <h1 className="font-bold tracking-tight text-lg bg-gradient-to-r from-gray-100 to-gray-400 bg-clip-text text-transparent">Flow</h1>
          
          <div className="relative">
             <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input 
              id="search-input"
              type="text" 
              placeholder="Search (Cmd+K)" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-gray-900 border border-gray-800 rounded-md pl-9 pr-4 py-1.5 text-sm focus:ring-1 focus:ring-accent-500 outline-none w-64 placeholder-gray-600"
            />
          </div>

          <div className="flex space-x-1">
             <button 
                onClick={() => setFilterTopic(null)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${!filterTopic ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}
              >All</button>
             {TOPICS.map(t => (
               <button 
                key={t} 
                onClick={() => setFilterTopic(t)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${filterTopic === t ? 'bg-accent-600/20 text-accent-500' : 'text-gray-500 hover:text-gray-300'}`}
               >{t}</button>
             ))}
          </div>
        </div>

        <div className="flex items-center space-x-4 text-xs text-gray-500 font-mono">
           {isAiLoading && (
             <div className="flex items-center text-accent-400 animate-pulse">
               <svg className="w-3 h-3 mr-2 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
               {aiMessage}
             </div>
           )}
           <div className="flex space-x-2 border-l border-gray-800 pl-4">
            <span className="flex items-center"><kbd className="bg-gray-800 px-1 rounded mr-1">←</kbd><kbd className="bg-gray-800 px-1 rounded">→</kbd> Col</span>
            <span className="flex items-center"><kbd className="bg-gray-800 px-1 rounded mr-1">↑</kbd><kbd className="bg-gray-800 px-1 rounded">↓</kbd> Nav</span>
            <span className="flex items-center"><kbd className="bg-gray-800 px-1 rounded">Enter</kbd> Edit</span>
           </div>
        </div>
      </header>

      {/* Main Columns Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* COLUMN 1: PILLARS (STRATEGY) */}
        <section 
          onClick={() => setNavState({ ...navState, column: 0 })}
          className={`w-[350px] flex flex-col border-r border-gray-800 bg-gray-950 transition-colors ${navState.column === 0 ? 'bg-gray-900/30' : ''}`}
        >
           <div className="p-4 border-b border-gray-800 flex justify-between items-center">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Strategy / Pillars</h2>
              <button onClick={handleAddPillar} className="text-xs hover:text-white text-gray-500 flex items-center">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                Ideate
              </button>
           </div>
           <div className="overflow-y-auto flex-1 pb-10">
              {filteredPillars.map(p => (
                <PillarCard 
                  key={p.id} 
                  pillar={p} 
                  isActive={selectedPillarId === p.id}
                  onClick={() => { setSelectedPillarId(p.id); setNavState({ ...navState, column: 0 }); }}
                />
              ))}
           </div>
        </section>

        {/* COLUMN 2: EXECUTIONS (TACTICS) */}
        <section 
          onClick={() => setNavState({ ...navState, column: 1 })}
          className={`w-[350px] flex flex-col border-r border-gray-800 bg-gray-950 transition-colors ${navState.column === 1 ? 'bg-gray-900/30' : ''}`}
        >
          <div className="p-4 border-b border-gray-800 flex justify-between items-center">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Tactics / Drafts</h2>
              <button onClick={handleGenerateExecutions} className="text-xs hover:text-white text-gray-500 flex items-center disabled:opacity-50" disabled={!selectedPillarId}>
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

        {/* COLUMN 3: EDITOR (CREATION) */}
        <section 
          onClick={() => !navState.editing && setNavState({ ...navState, column: 2 })}
          className={`flex-1 flex flex-col bg-gray-950 transition-all duration-300 relative ${navState.column === 2 ? 'bg-gray-900/20' : ''}`}
        >
          {selectedExecutionId ? (
            <>
              {/* Editor Toolbar */}
              <div className="h-14 border-b border-gray-800 flex items-center justify-between px-6">
                  <div className="flex items-center space-x-4">
                    <div className={`w-2 h-2 rounded-full ${navState.editing ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`}></div>
                    <span className="text-xs text-gray-400 uppercase tracking-wider">
                      {navState.editing ? 'Editing Mode (ESC to exit)' : 'View Mode (Enter to edit)'}
                    </span>
                  </div>
                  <div className="flex space-x-3">
                    <button 
                      onClick={() => handleRefine("Make it more punchy and concise")}
                      className="text-xs text-gray-400 hover:text-white border border-gray-800 hover:border-gray-600 px-3 py-1.5 rounded bg-gray-900"
                    >
                      Make Punchy
                    </button>
                    <button 
                      onClick={() => handleRefine("Fix grammar and improve flow")}
                      className="text-xs text-gray-400 hover:text-white border border-gray-800 hover:border-gray-600 px-3 py-1.5 rounded bg-gray-900"
                    >
                      Fix Grammar
                    </button>
                    <button className="text-xs bg-white text-black font-medium px-4 py-1.5 rounded hover:bg-gray-200">
                      Publish
                    </button>
                  </div>
              </div>

              {/* Actual Editor */}
              <div className="flex-1 p-8 max-w-3xl mx-auto w-full flex flex-col">
                 <div className="flex items-center space-x-2 mb-6 opacity-50">
                    {(() => {
                      const current = executions.find(e => e.id === selectedExecutionId);
                      if (!current) return null;
                      const config = PLATFORM_CONFIG[current.platform];
                      return (
                        <>
                           <span className={`text-sm ${config.color}`}>{config.label}</span>
                           <span className="text-gray-600">•</span>
                           <span className="text-xs text-gray-500">
                              {current.content?.length || 0} {config.maxChars ? `/ ${config.maxChars}` : 'chars'}
                           </span>
                        </>
                      )
                    })()}
                 </div>

                 <textarea
                    ref={editorRef}
                    value={executions.find(e => e.id === selectedExecutionId)?.content || ''}
                    onChange={(e) => updateExecutionContent(e.target.value)}
                    disabled={!navState.editing}
                    className={`
                      flex-1 w-full bg-transparent resize-none outline-none font-mono text-base leading-relaxed
                      ${navState.editing ? 'text-gray-100 placeholder-gray-600' : 'text-gray-300 cursor-default'}
                    `}
                    placeholder="Start writing your masterpiece..."
                 />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-700 flex-col">
              <svg className="w-12 h-12 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              <p>Select a draft to edit</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default App;