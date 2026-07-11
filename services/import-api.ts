/**
 * Import API Service
 * Handles bulk import of ideas from external sources
 */

import { db } from './database';
import { Idea } from './database';

export interface ImportedIdea {
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
}

export interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors?: string[];
  ideas?: Idea[];
}

/**
 * Import multiple ideas into the database
 */
export async function importIdeas(
  importedIdeas: ImportedIdea[],
  source: string = 'manual'
): Promise<ImportResult> {
  const results: ImportResult = {
    success: false,
    imported: 0,
    failed: 0,
    errors: [],
    ideas: []
  };

  if (!db.isInitialized) {
    await db.init();
  }

  for (const importedIdea of importedIdeas) {
    try {
      const idea: Idea = {
        id: `idea-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        pillarId: '', // Ideas don't belong to pillars in the new model
        gist: importedIdea.title,
        hooks: importedIdea.hooks || [],
        content: importedIdea.coreIdea,
        source: importedIdea.source || {
          type: source,
          title: importedIdea.title
        },
        tags: importedIdea.tags,
        status: 'approved' // Imported ideas are pre-approved
      };

      await db.ideas.add(idea);
      results.ideas?.push(idea);
      results.imported++;
    } catch (error) {
      results.failed++;
      results.errors?.push(
        `Failed to import "${importedIdea.title}": ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  results.success = results.imported > 0;

  // Log import activity
  console.log(`Import completed: ${results.imported} success, ${results.failed} failed`);

  return results;
}

/**
 * Import ideas from JSON file (for manual imports)
 */
export async function importFromFile(jsonData: any): Promise<ImportResult> {
  try {
    const { ideas, source = 'file', timestamp } = jsonData;

    if (!Array.isArray(ideas)) {
      throw new Error('Invalid import data: ideas must be an array');
    }

    console.log(`Importing ${ideas.length} ideas from ${source} (${timestamp})`);

    return await importIdeas(ideas, source);
  } catch (error) {
    return {
      success: false,
      imported: 0,
      failed: 0,
      errors: [error instanceof Error ? error.message : 'Import failed']
    };
  }
}