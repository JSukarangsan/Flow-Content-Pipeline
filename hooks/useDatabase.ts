/**
 * React hook for IndexedDB integration
 * Manages database initialization and provides data persistence
 */

import { useState, useEffect, useCallback } from 'react';
import { db, Idea, Post } from '../services/database';
import { Pillar, Execution, UserSettings } from '../types';
import { INITIAL_PILLARS, INITIAL_EXECUTIONS, DEFAULT_SETTINGS } from '../constants';

interface UseDatabaseResult {
  isDbReady: boolean;
  isInitialized: boolean;
  dbError: Error | null;
  pillars: Pillar[];
  executions: Execution[];
  ideas: Idea[];
  posts: Post[];
  settings: UserSettings;
  savePillar: (pillar: Pillar) => Promise<void>;
  saveExecution: (execution: Execution) => Promise<void>;
  saveSettings: (settings: UserSettings) => Promise<void>;
  deletePillar: (id: string) => Promise<void>;
  deleteExecution: (id: string) => Promise<void>;
  setPillars: (pillars: Pillar[]) => Promise<void>;
  setExecutions: (executions: Execution[]) => Promise<void>;
  addIdea: (idea: Omit<Idea, 'importedAt' | 'updatedAt'> & Partial<Pick<Idea, 'importedAt' | 'updatedAt'>>) => Promise<void>;
  updateIdea: (idea: Idea) => Promise<void>;
  deleteIdea: (id: string) => Promise<void>;
  addPost: (post: Omit<Post, 'pillarId' | 'createdAt' | 'updatedAt'> & Partial<Pick<Post, 'pillarId' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  updatePost: (post: Post) => Promise<void>;
  deletePost: (id: string) => Promise<void>;
}

export function useDatabase(): UseDatabaseResult {
  const [isDbReady, setIsDbReady] = useState(false);
  const [dbError, setDbError] = useState<Error | null>(null);
  const [pillars, setPillarsState] = useState<Pillar[]>([]);
  const [executions, setExecutionsState] = useState<Execution[]>([]);
  const [ideas, setIdeasState] = useState<Idea[]>([]);
  const [posts, setPostsState] = useState<Post[]>([]);
  const [settings, setSettingsState] = useState<UserSettings>(DEFAULT_SETTINGS);

  // Initialize database and load data
  useEffect(() => {
    async function initializeDatabase() {
      try {
        await db.init();
        await db.migrateFromLocalStorage();

        // Load existing data or use initial data
        const [savedPillars, savedExecutions, savedIdeas, savedPosts, savedSettings] = await Promise.all([
          db.getAllPillars(),
          db.getAllExecutions(),
          db.getAllIdeas(),
          db.getAllPosts(),
          db.getSettings()
        ]);

        // Migration: cap idea tags to 3
        const ideasNeedingTrim = savedIdeas.filter(i => (i.tags?.length ?? 0) > 3);
        if (ideasNeedingTrim.length > 0) {
          await Promise.all(ideasNeedingTrim.map(idea =>
            db.saveIdea({ ...idea, tags: idea.tags.slice(0, 3) })
          ));
          savedIdeas.forEach(i => { if (i.tags?.length > 3) i.tags = i.tags.slice(0, 3); });
          console.log(`Trimmed themes to 3 for ${ideasNeedingTrim.length} ideas`);
        }

        // Use saved data if available, otherwise use initial data
        if (savedPillars.length > 0) {
          setPillarsState(savedPillars);
        } else {
          setPillarsState(INITIAL_PILLARS);
          await db.savePillars(INITIAL_PILLARS);
        }

        if (savedExecutions.length > 0) {
          setExecutionsState(savedExecutions);
        } else {
          setExecutionsState(INITIAL_EXECUTIONS);
          await db.saveExecutions(INITIAL_EXECUTIONS);
        }

        setIdeasState(savedIdeas);
        setPostsState(savedPosts);

        if (savedSettings) {
          setSettingsState(savedSettings);
        } else {
          const localStorageSettings = localStorage.getItem('flow_settings');
          if (localStorageSettings) {
            const parsed = JSON.parse(localStorageSettings);
            setSettingsState(parsed);
            await db.saveSettings(parsed);
          }
        }

        setIsDbReady(true);
      } catch (error) {
        console.error('Database initialization failed:', error);
        setDbError(error as Error);

        // Fallback to localStorage if IndexedDB fails
        setPillarsState(INITIAL_PILLARS);
        setExecutionsState(INITIAL_EXECUTIONS);

        const savedSettings = localStorage.getItem('flow_settings');
        if (savedSettings) {
          setSettingsState(JSON.parse(savedSettings));
        }

        setIsDbReady(true);
      }
    }

    initializeDatabase();
  }, []);

  const savePillar = useCallback(async (pillar: Pillar) => {
    try {
      await db.savePillar(pillar);
      setPillarsState(prev => {
        const index = prev.findIndex(p => p.id === pillar.id);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = pillar;
          return updated;
        }
        return [...prev, pillar];
      });
    } catch (error) {
      console.error('Failed to save pillar:', error);
      throw error;
    }
  }, []);

  const saveExecution = useCallback(async (execution: Execution) => {
    try {
      await db.saveExecution(execution);
      setExecutionsState(prev => {
        const index = prev.findIndex(e => e.id === execution.id);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = execution;
          return updated;
        }
        return [...prev, execution];
      });
    } catch (error) {
      console.error('Failed to save execution:', error);
      throw error;
    }
  }, []);

  const saveSettings = useCallback(async (newSettings: UserSettings) => {
    try {
      await db.saveSettings(newSettings);
      setSettingsState(newSettings);
      localStorage.setItem('flow_settings', JSON.stringify(newSettings));
    } catch (error) {
      console.error('Failed to save settings:', error);
      localStorage.setItem('flow_settings', JSON.stringify(newSettings));
      setSettingsState(newSettings);
    }
  }, []);

  const deletePillar = useCallback(async (id: string) => {
    try {
      await db.deletePillar(id);
      setPillarsState(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Failed to delete pillar:', error);
      throw error;
    }
  }, []);

  const deleteExecution = useCallback(async (id: string) => {
    try {
      await db.deleteExecution(id);
      setExecutionsState(prev => prev.filter(e => e.id !== id));
    } catch (error) {
      console.error('Failed to delete execution:', error);
      throw error;
    }
  }, []);

  const setPillars = useCallback(async (newPillars: Pillar[]) => {
    try {
      await db.savePillars(newPillars);
      setPillarsState(newPillars);
    } catch (error) {
      console.error('Failed to save pillars:', error);
      setPillarsState(newPillars);
    }
  }, []);

  const setExecutions = useCallback(async (newExecutions: Execution[]) => {
    try {
      await db.saveExecutions(newExecutions);
      setExecutionsState(newExecutions);
    } catch (error) {
      console.error('Failed to save executions:', error);
      setExecutionsState(newExecutions);
    }
  }, []);

  const addIdea = useCallback(async (idea: Omit<Idea, 'importedAt' | 'updatedAt'> & Partial<Pick<Idea, 'importedAt' | 'updatedAt'>>) => {
    const now = new Date().toISOString();
    const fullIdea: Idea = { importedAt: now, updatedAt: now, ...idea };
    try {
      await db.saveIdea(fullIdea);
      setIdeasState(prev => [...prev, fullIdea]);
    } catch (error) {
      console.error('Failed to add idea:', error);
      throw error;
    }
  }, []);

  const updateIdea = useCallback(async (idea: Idea) => {
    const updated: Idea = { ...idea, updatedAt: new Date().toISOString() };
    try {
      await db.saveIdea(updated);
      setIdeasState(prev => {
        const index = prev.findIndex(i => i.id === updated.id);
        if (index !== -1) {
          const arr = [...prev];
          arr[index] = updated;
          return arr;
        }
        return [...prev, updated];
      });
    } catch (error) {
      console.error('Failed to update idea:', error);
      throw error;
    }
  }, []);

  const deleteIdea = useCallback(async (id: string) => {
    try {
      await db.deleteIdea(id);
      setIdeasState(prev => prev.filter(i => i.id !== id));
    } catch (error) {
      console.error('Failed to delete idea:', error);
      throw error;
    }
  }, []);

  const addPost = useCallback(async (post: Omit<Post, 'pillarId' | 'createdAt' | 'updatedAt'> & Partial<Pick<Post, 'pillarId' | 'createdAt' | 'updatedAt'>>) => {
    const now = new Date().toISOString();
    const fullPost: Post = { pillarId: post.ideaId || '', createdAt: now, updatedAt: now, ...post };
    try {
      await db.savePost(fullPost);
      setPostsState(prev => [...prev, fullPost]);
    } catch (error) {
      console.error('Failed to add post:', error);
      throw error;
    }
  }, []);

  const updatePost = useCallback(async (post: Post) => {
    const updated: Post = { ...post, updatedAt: new Date().toISOString() };
    try {
      await db.savePost(updated);
      setPostsState(prev => {
        const index = prev.findIndex(p => p.id === updated.id);
        if (index !== -1) {
          const arr = [...prev];
          arr[index] = updated;
          return arr;
        }
        return [...prev, updated];
      });
    } catch (error) {
      console.error('Failed to update post:', error);
      throw error;
    }
  }, []);

  const deletePost = useCallback(async (id: string) => {
    try {
      await db.deletePost(id);
      setPostsState(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Failed to delete post:', error);
      throw error;
    }
  }, []);

  return {
    isDbReady,
    isInitialized: isDbReady,
    dbError,
    pillars,
    executions,
    ideas,
    posts,
    settings,
    savePillar,
    saveExecution,
    saveSettings,
    deletePillar,
    deleteExecution,
    setPillars,
    setExecutions,
    addIdea,
    updateIdea,
    deleteIdea,
    addPost,
    updatePost,
    deletePost,
  };
}
