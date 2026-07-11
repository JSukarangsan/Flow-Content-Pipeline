/**
 * IndexedDB Service for Flow Content Pipeline
 * Provides persistent storage for pillars, ideas, posts, and plays
 */

import { Pillar, Execution, UserSettings } from '../types';

// Extended types for V1.1+ features
export interface Idea {
  id: string;
  pillarId: string;
  gist: string;
  hooks: string[];
  content: string;
  source: {
    type: 'notion' | 'youtube' | 'manual';
    url?: string;
    title?: string;
  };
  tags: string[];
  status: 'inbox' | 'approved' | 'archived';
  importedAt: string;
  updatedAt: string;
}

export interface Post {
  id: string;
  ideaId: string;
  pillarId: string;
  playId?: string;
  platform: 'linkedin' | 'twitter' | 'newsletter' | 'instagram' | 'youtube';
  content: string;
  status: 'draft' | 'ready' | 'published';
  publishedAt?: string;
  performanceScore?: 'low' | 'medium' | 'high' | 'viral';
  performanceNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Play {
  id: string;
  name: string;
  description: string;
  trigger: 'long-form' | 'idea' | 'case-study' | 'hot-take' | 'question' | 'recap';
  inputs: PlayInput[];
  outputs: PlayOutput[];
  promptTemplate: string;
  isBuiltin: boolean;
}

export interface PlayInput {
  name: string;
  type: 'text' | 'select' | 'idea_reference';
  required: boolean;
  options?: string[];
}

export interface PlayOutput {
  platform: string;
  count: number;
  description: string;
}

class FlowDatabase {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'FlowContentPipeline';
  private readonly DB_VERSION = 1;

  get isInitialized(): boolean {
    return this.db !== null;
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('pillars')) {
          const pillarsStore = db.createObjectStore('pillars', { keyPath: 'id' });
          pillarsStore.createIndex('topic', 'topic', { unique: false });
          pillarsStore.createIndex('status', 'status', { unique: false });
        }

        if (!db.objectStoreNames.contains('executions')) {
          const executionsStore = db.createObjectStore('executions', { keyPath: 'id' });
          executionsStore.createIndex('pillarId', 'pillarId', { unique: false });
          executionsStore.createIndex('platform', 'platform', { unique: false });
          executionsStore.createIndex('status', 'status', { unique: false });
        }

        if (!db.objectStoreNames.contains('ideas')) {
          const ideasStore = db.createObjectStore('ideas', { keyPath: 'id' });
          ideasStore.createIndex('pillarId', 'pillarId', { unique: false });
          ideasStore.createIndex('status', 'status', { unique: false });
        }

        if (!db.objectStoreNames.contains('posts')) {
          const postsStore = db.createObjectStore('posts', { keyPath: 'id' });
          postsStore.createIndex('ideaId', 'ideaId', { unique: false });
          postsStore.createIndex('pillarId', 'pillarId', { unique: false });
          postsStore.createIndex('platform', 'platform', { unique: false });
          postsStore.createIndex('status', 'status', { unique: false });
        }

        if (!db.objectStoreNames.contains('plays')) {
          const playsStore = db.createObjectStore('plays', { keyPath: 'id' });
          playsStore.createIndex('isBuiltin', 'isBuiltin', { unique: false });
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }
      };
    });
  }

  private getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): IDBObjectStore {
    if (!this.db) throw new Error('Database not initialized');
    const transaction = this.db.transaction([storeName], mode);
    return transaction.objectStore(storeName);
  }

  // === Pillars ===
  async getAllPillars(): Promise<Pillar[]> {
    const store = this.getStore('pillars');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async savePillar(pillar: Pillar): Promise<void> {
    const store = this.getStore('pillars', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(pillar);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deletePillar(id: string): Promise<void> {
    const store = this.getStore('pillars', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // === Executions ===
  async getAllExecutions(): Promise<Execution[]> {
    const store = this.getStore('executions');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getExecutionsByPillar(pillarId: string): Promise<Execution[]> {
    const store = this.getStore('executions');
    const index = store.index('pillarId');
    return new Promise((resolve, reject) => {
      const request = index.getAll(pillarId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveExecution(execution: Execution): Promise<void> {
    const store = this.getStore('executions', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(execution);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteExecution(id: string): Promise<void> {
    const store = this.getStore('executions', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // === Ideas (for future use) ===
  async getAllIdeas(): Promise<Idea[]> {
    const store = this.getStore('ideas');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveIdea(idea: Idea): Promise<void> {
    const store = this.getStore('ideas', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(idea);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteIdea(id: string): Promise<void> {
    const store = this.getStore('ideas', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // === Posts (for future use) ===
  async getAllPosts(): Promise<Post[]> {
    const store = this.getStore('posts');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async savePost(post: Post): Promise<void> {
    const store = this.getStore('posts', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(post);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deletePost(id: string): Promise<void> {
    const store = this.getStore('posts', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // === Plays (for future use) ===
  async getAllPlays(): Promise<Play[]> {
    const store = this.getStore('plays');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async savePlay(play: Play): Promise<void> {
    const store = this.getStore('plays', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(play);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // === Settings ===
  async getSettings(): Promise<UserSettings | null> {
    const store = this.getStore('settings');
    return new Promise((resolve, reject) => {
      const request = store.get('user-settings');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveSettings(settings: UserSettings): Promise<void> {
    const store = this.getStore('settings', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put({ ...settings, id: 'user-settings' });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // === Migration from localStorage ===
  async migrateFromLocalStorage(): Promise<void> {
    try {
      // Check if migration already happened
      const existingPillars = await this.getAllPillars();
      if (existingPillars.length > 0) {
        console.log('Migration already completed, skipping...');
        return;
      }

      // Migrate settings
      const savedSettings = localStorage.getItem('flow_settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        await this.saveSettings(settings);
        console.log('Migrated settings to IndexedDB');
      }

      // Note: Pillars and Executions are currently in React state (from constants.ts)
      // They will be migrated when the App component saves them for the first time

      console.log('LocalStorage migration completed');
    } catch (error) {
      console.error('Migration failed:', error);
    }
  }

  // === Batch Operations ===
  async savePillars(pillars: Pillar[]): Promise<void> {
    const store = this.getStore('pillars', 'readwrite');
    return new Promise((resolve, reject) => {
      const transaction = store.transaction;
      let completed = 0;

      pillars.forEach(pillar => {
        const request = store.put(pillar);
        request.onsuccess = () => {
          completed++;
          if (completed === pillars.length) resolve();
        };
        request.onerror = () => reject(request.error);
      });

      if (pillars.length === 0) resolve();
    });
  }

  async saveExecutions(executions: Execution[]): Promise<void> {
    const store = this.getStore('executions', 'readwrite');
    return new Promise((resolve, reject) => {
      const transaction = store.transaction;
      let completed = 0;

      executions.forEach(execution => {
        const request = store.put(execution);
        request.onsuccess = () => {
          completed++;
          if (completed === executions.length) resolve();
        };
        request.onerror = () => reject(request.error);
      });

      if (executions.length === 0) resolve();
    });
  }
}

// Export singleton instance
export const db = new FlowDatabase();