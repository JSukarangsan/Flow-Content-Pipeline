/**
 * File Watcher Service for Flow Content Pipeline
 * Monitors inbox folder for new digest JSON files and imports them
 */

import { db, Idea } from './database';
import { Pillar } from '../types';
import flowConfig from '../config/flow.config.json';

// Digest JSON Schema (from Claude Code)
export interface DigestIdea {
  id: string;
  pillar: string;
  gist: string;
  hooks: string[];
  source: {
    type: 'notion' | 'youtube' | 'manual';
    url?: string;
    title?: string;
  };
  content: string;
  tags?: string[];
}

export interface DigestJSON {
  generated_at: string;
  ideas: DigestIdea[];
}

class FileWatcherService {
  private watchInterval: NodeJS.Timeout | null = null;
  private processedFiles = new Set<string>();
  private isProcessing = false;

  async start(): Promise<void> {
    if (this.watchInterval) {
      console.log('File watcher already running');
      return;
    }

    console.log('Starting file watcher service...');

    // Initial scan
    await this.scanInbox();

    // Set up periodic scanning
    if (flowConfig.watch_enabled) {
      this.watchInterval = setInterval(() => {
        this.scanInbox();
      }, flowConfig.watch_interval_ms);
    }
  }

  stop(): void {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = null;
      console.log('File watcher service stopped');
    }
  }

  private async scanInbox(): Promise<void> {
    if (this.isProcessing) {
      console.log('Already processing files, skipping scan');
      return;
    }

    this.isProcessing = true;

    try {
      const inboxPath = flowConfig.inbox_path;

      // In a real implementation, we'd use fs.readdir here
      // For browser environment, we'll use a different approach
      const files = await this.getInboxFiles();

      for (const file of files) {
        if (!this.processedFiles.has(file) && file.endsWith('.json')) {
          await this.processFile(file);
        }
      }
    } catch (error) {
      console.error('Error scanning inbox:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async getInboxFiles(): Promise<string[]> {
    // In browser environment, we'll need to use IndexedDB or localStorage
    // to track files, or use a File API input
    // For now, returning empty array - this would be implemented
    // differently in a Node.js environment or with a proper file API
    return [];
  }

  private async processFile(filename: string): Promise<void> {
    console.log(`Processing file: ${filename}`);

    try {
      // Read and parse JSON file
      const content = await this.readFile(filename);
      const digest: DigestJSON = JSON.parse(content);

      // Validate digest structure
      if (!this.validateDigest(digest)) {
        throw new Error('Invalid digest format');
      }

      // Process each idea in the digest
      let importedCount = 0;
      for (const digestIdea of digest.ideas) {
        await this.importIdea(digestIdea, digest.generated_at);
        importedCount++;
      }

      // Move file to processed folder
      await this.moveToProcessed(filename);
      this.processedFiles.add(filename);

      // Show notification (would be a toast in the UI)
      console.log(`✅ Imported ${importedCount} ideas from ${filename}`);
      this.showNotification(`Imported ${importedCount} ideas from ${filename}`);

    } catch (error) {
      console.error(`Failed to process ${filename}:`, error);

      // Move to errors folder
      await this.moveToErrors(filename);
      this.processedFiles.add(filename); // Don't try to process again

      this.showNotification(`Failed to process ${filename}`, 'error');
    }
  }

  private async readFile(filename: string): Promise<string> {
    // In a real implementation, this would read from the file system
    // For browser, would need to use File API or fetch from server
    throw new Error('File reading not implemented in browser environment');
  }

  private validateDigest(digest: any): digest is DigestJSON {
    if (!digest || typeof digest !== 'object') return false;

    // Check if it's Evissa import format
    if (digest.timestamp && Array.isArray(digest.ideas)) {
      // Validate Evissa format
      for (const idea of digest.ideas) {
        if (!idea.title || typeof idea.title !== 'string') return false;
        if (!idea.coreIdea || typeof idea.coreIdea !== 'string') return false;
        if (!idea.topic || typeof idea.topic !== 'string') return false;
      }
      // Convert to standard format
      digest.generated_at = digest.timestamp || new Date().toISOString();
      digest.ideas = digest.ideas.map((idea: any) => ({
        id: `evissa-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        pillar: idea.title,
        gist: idea.title,
        hooks: idea.hooks || [],
        source: idea.source || { type: 'evissa', title: idea.title },
        content: idea.coreIdea,
        tags: idea.tags || []
      }));
      return true;
    }

    // Standard digest format validation
    if (!digest.generated_at || typeof digest.generated_at !== 'string') return false;
    if (!Array.isArray(digest.ideas)) return false;

    for (const idea of digest.ideas) {
      if (!idea.id || typeof idea.id !== 'string') return false;
      if (!idea.pillar || typeof idea.pillar !== 'string') return false;
      if (!idea.gist || typeof idea.gist !== 'string') return false;
      if (!Array.isArray(idea.hooks)) return false;
      if (!idea.source || typeof idea.source !== 'object') return false;
      if (!idea.content || typeof idea.content !== 'string') return false;
    }

    return true;
  }

  private async importIdea(digestIdea: DigestIdea, generatedAt: string): Promise<void> {
    // Check if idea already exists (by gist/title)
    const existingIdeas = await db.getAllIdeas();
    const existingIdea = existingIdeas.find(i =>
      i.gist === digestIdea.gist || i.id === digestIdea.id
    );

    if (existingIdea) {
      // Update existing idea
      const updatedIdea: Idea = {
        ...existingIdea,
        gist: digestIdea.gist,
        hooks: digestIdea.hooks,
        content: digestIdea.content,
        source: digestIdea.source,
        tags: digestIdea.tags || [],
        updatedAt: new Date().toISOString()
      };
      await db.saveIdea(updatedIdea);
      console.log(`Updated existing idea: ${digestIdea.gist.substring(0, 50)}...`);
    } else {
      // Create new idea (not tied to specific pillar)
      const newIdea: Idea = {
        id: digestIdea.id,
        pillarId: '', // Ideas don't belong to pillars in the new model
        gist: digestIdea.gist,
        hooks: digestIdea.hooks,
        content: digestIdea.content,
        source: digestIdea.source,
        tags: digestIdea.tags || [],
        status: 'approved', // Imported ideas are pre-approved
        importedAt: generatedAt,
        updatedAt: new Date().toISOString()
      };
      await db.saveIdea(newIdea);
      console.log(`Created new idea: ${digestIdea.gist.substring(0, 50)}...`);
    }
  }

  private async moveToProcessed(filename: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const processedFilename = `${filename.replace('.json', '')}-${timestamp}.json`;
    console.log(`Moving ${filename} to processed as ${processedFilename}`);
    // In a real implementation, would move the file
  }

  private async moveToErrors(filename: string): Promise<void> {
    const errorFilename = `${filename}.error`;
    console.log(`Moving ${filename} to errors as ${errorFilename}`);
    // In a real implementation, would move the file
  }

  private showNotification(message: string, type: 'success' | 'error' = 'success'): void {
    // This would be connected to a toast notification system in the UI
    // For now, just console log
    console.log(`[${type.toUpperCase()}] ${message}`);

    // Dispatch custom event that the UI can listen to
    window.dispatchEvent(new CustomEvent('flow-notification', {
      detail: { message, type }
    }));
  }

  // Manual import method for drag-and-drop or file input
  async importFromFile(file: File): Promise<void> {
    const reader = new FileReader();

    return new Promise((resolve, reject) => {
      reader.onload = async (event) => {
        try {
          // Ensure database is initialized
          if (!db.isInitialized) {
            await db.init();
          }

          const content = event.target?.result as string;
          const digest: DigestJSON = JSON.parse(content);

          if (!this.validateDigest(digest)) {
            throw new Error('Invalid digest format');
          }

          let importedCount = 0;
          for (const digestIdea of digest.ideas) {
            await this.importIdea(digestIdea, digest.generated_at);
            importedCount++;
          }

          this.showNotification(`✅ Imported ${importedCount} ideas from ${file.name}`);
          resolve();
        } catch (error) {
          console.error('Import failed:', error);
          this.showNotification(`Failed to import ${file.name}`, 'error');
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsText(file);
    });
  }
}

// Export singleton instance
export const fileWatcher = new FileWatcherService();