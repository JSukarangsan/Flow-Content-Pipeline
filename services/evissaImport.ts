/**
 * Evissa Import Service
 * Direct import of Evissa ideas into Flow
 */

import { db, Idea } from './database';

export interface EvissaIdea {
  title: string;
  coreIdea: string;
  topic: string;
  tags: string[];
  source?: {
    type: string;
    title: string;
    url?: string;
  };
  hooks?: string[];
  audience?: string[];
  created?: string;
  originalFile?: string;
}

export interface EvissaImportData {
  timestamp: string;
  ideas: EvissaIdea[];
}

/**
 * Import Evissa ideas directly into Flow database
 */
export async function importEvissaIdeas(data: EvissaImportData): Promise<{
  success: boolean;
  imported: number;
  failed: number;
  errors: string[];
}> {
  const results = {
    success: false,
    imported: 0,
    failed: 0,
    errors: [] as string[]
  };

  try {
    // Ensure database is initialized
    if (!db.isInitialized) {
      await db.init();
    }

    // Import each idea
    for (const evissaIdea of data.ideas) {
      try {
        // Create Flow idea from Evissa idea
        const flowIdea: Idea = {
          id: `evissa-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          pillarId: '', // Ideas don't belong to pillars in the new model
          gist: evissaIdea.title,
          hooks: evissaIdea.hooks || [],
          content: evissaIdea.coreIdea,
          source: evissaIdea.source || {
            type: 'evissa',
            title: evissaIdea.title
          },
          tags: evissaIdea.tags || [],
          status: 'approved', // Imported ideas are pre-approved
          importedAt: data.timestamp || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Save to database
        await db.saveIdea(flowIdea);
        results.imported++;

        console.log(`✅ Imported: ${evissaIdea.title.substring(0, 50)}...`);
      } catch (error) {
        results.failed++;
        const errorMsg = `Failed to import "${evissaIdea.title}": ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    results.success = results.imported > 0;

    console.log(`Import complete: ${results.imported} success, ${results.failed} failed`);

    return results;

  } catch (error) {
    results.errors.push(error instanceof Error ? error.message : 'Unknown error');
    console.error('Import failed:', error);
    return results;
  }
}

/**
 * Import from file (for drag-and-drop or file input)
 */
export async function importEvissaFromFile(file: File): Promise<{
  success: boolean;
  imported: number;
  failed: number;
  errors: string[];
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content) as EvissaImportData;

        // Validate basic structure
        if (!data.ideas || !Array.isArray(data.ideas)) {
          throw new Error('Invalid import file: missing ideas array');
        }

        const results = await importEvissaIdeas(data);
        resolve(results);

      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}