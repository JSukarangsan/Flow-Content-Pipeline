#!/usr/bin/env node

/**
 * Import Ideas from Evissa to Flow
 * Reads markdown files from evissa/content/ideas/backlog
 * Imports them into Flow's IndexedDB
 * Archives processed files
 */

const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');
const axios = require('axios');

// Configuration
const EVISSA_BACKLOG_PATH = '/Users/jonsukarangsan/Documents/apps/evissa/content/ideas/backlog';
const EVISSA_ARCHIVE_PATH = '/Users/jonsukarangsan/Documents/apps/evissa/content/ideas/archive';
const FLOW_API_URL = 'http://localhost:3001/api/import-ideas'; // We'll create this endpoint
const LOG_FILE = path.join(__dirname, 'import-log.json');

// Priority to topic mapping
const priorityToTopic = {
  'high': 'Strategy',
  'medium': 'Tactics',
  'low': 'Operations'
};

/**
 * Parse a markdown file and extract idea data
 */
async function parseIdeaFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const parsed = matter(content);

    // Extract frontmatter
    const { title, source, tags, priority, created, audience } = parsed.data;

    // Extract content sections
    const markdownContent = parsed.content;

    // Extract Core Insight
    const coreInsightMatch = markdownContent.match(/## Core Insight\n([\s\S]*?)(?=\n##|$)/);
    const coreInsight = coreInsightMatch ? coreInsightMatch[1].trim() : '';

    // Extract Key Concepts
    const keyConceptsMatch = markdownContent.match(/## Key Concepts\n([\s\S]*?)(?=\n##|$)/);
    const keyConcepts = keyConceptsMatch ? keyConceptsMatch[1].trim() : '';

    // Extract Possible Hooks
    const hooksMatch = markdownContent.match(/## Possible Hooks\n([\s\S]*?)(?=\n##|$)/);
    const hooksText = hooksMatch ? hooksMatch[1].trim() : '';
    const hooks = hooksText.split('\n')
      .filter(line => line.trim().match(/^\d+\./))
      .map(line => line.replace(/^\d+\.\s*/, '').replace(/^[""]|[""]$/g, ''));

    // Combine core insight and key concepts for the full idea content
    const fullContent = [
      coreInsight,
      keyConcepts ? `\n\nKey Concepts:\n${keyConcepts}` : ''
    ].filter(Boolean).join('');

    return {
      title: title || 'Untitled Idea',
      coreIdea: fullContent,
      topic: priorityToTopic[priority] || 'Strategy',
      tags: tags || [],
      source: {
        type: 'evissa',
        title: source || 'Evissa Import',
        url: `evissa://ideas/${path.basename(filePath)}`
      },
      hooks: hooks,
      audience: audience || [],
      created: created || new Date().toISOString(),
      originalFile: path.basename(filePath)
    };
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error);
    throw error;
  }
}

/**
 * Archive a processed file
 */
async function archiveFile(filePath) {
  const timestamp = new Date().toISOString().split('T')[0];
  const basename = path.basename(filePath, '.md');
  const archiveName = `${basename}-${timestamp}.md`;
  const archivePath = path.join(EVISSA_ARCHIVE_PATH, archiveName);

  await fs.rename(filePath, archivePath);
  console.log(`Archived: ${path.basename(filePath)} → ${archiveName}`);
  return archiveName;
}

/**
 * Send ideas to Flow API
 */
async function sendToFlow(ideas) {
  try {
    const response = await axios.post(FLOW_API_URL, {
      ideas: ideas,
      source: 'evissa-import',
      timestamp: new Date().toISOString()
    });
    return response.data;
  } catch (error) {
    // If API endpoint doesn't exist yet, save to a JSON file for manual import
    console.warn('Flow API not available, saving to JSON file for manual import');
    const outputPath = path.join(__dirname, 'import-data.json');
    await fs.writeFile(outputPath, JSON.stringify({ ideas, timestamp: new Date().toISOString() }, null, 2));
    console.log(`Saved ${ideas.length} ideas to ${outputPath}`);
    return { success: true, fallback: true, path: outputPath };
  }
}

/**
 * Log import activity
 */
async function logImport(results) {
  let log = [];
  try {
    const existingLog = await fs.readFile(LOG_FILE, 'utf-8');
    log = JSON.parse(existingLog);
  } catch (error) {
    // Log file doesn't exist yet
  }

  log.push({
    timestamp: new Date().toISOString(),
    ...results
  });

  // Keep only last 100 entries
  if (log.length > 100) {
    log = log.slice(-100);
  }

  await fs.writeFile(LOG_FILE, JSON.stringify(log, null, 2));
}

/**
 * Main import function
 */
async function importIdeas(isManual = true) {
  console.log('Starting Evissa → Flow import...');
  console.log(`Source: ${EVISSA_BACKLOG_PATH}`);

  try {
    // Get all markdown files from backlog
    const files = await fs.readdir(EVISSA_BACKLOG_PATH);
    const mdFiles = files.filter(f => f.endsWith('.md'));

    if (mdFiles.length === 0) {
      console.log('No markdown files found in backlog');
      return { success: true, imported: 0, message: 'No files to import' };
    }

    console.log(`Found ${mdFiles.length} ideas to import`);

    // Parse all files
    const ideas = [];
    const parseErrors = [];

    for (const file of mdFiles) {
      const filePath = path.join(EVISSA_BACKLOG_PATH, file);
      try {
        console.log(`Parsing: ${file}`);
        const idea = await parseIdeaFile(filePath);
        ideas.push(idea);
      } catch (error) {
        console.error(`Failed to parse ${file}:`, error.message);
        parseErrors.push({ file, error: error.message });
      }
    }

    if (ideas.length === 0) {
      console.error('No ideas could be parsed successfully');
      return { success: false, errors: parseErrors };
    }

    console.log(`Successfully parsed ${ideas.length} ideas`);

    // Send to Flow
    console.log('Sending ideas to Flow...');
    const flowResponse = await sendToFlow(ideas);

    if (flowResponse.success || flowResponse.fallback) {
      // Archive processed files
      console.log('Archiving processed files...');
      const archived = [];

      for (const file of mdFiles) {
        const filePath = path.join(EVISSA_BACKLOG_PATH, file);
        // Only archive if the idea was successfully parsed
        if (ideas.some(idea => idea.originalFile === file)) {
          try {
            const archiveName = await archiveFile(filePath);
            archived.push(archiveName);
          } catch (error) {
            console.error(`Failed to archive ${file}:`, error.message);
          }
        }
      }

      const results = {
        success: true,
        imported: ideas.length,
        archived: archived.length,
        parseErrors: parseErrors.length,
        files: mdFiles.map(f => f),
        timestamp: new Date().toISOString(),
        isManual
      };

      // Log the import
      await logImport(results);

      console.log('\n✅ Import completed successfully!');
      console.log(`   Imported: ${ideas.length} ideas`);
      console.log(`   Archived: ${archived.length} files`);
      if (parseErrors.length > 0) {
        console.log(`   Errors: ${parseErrors.length} files couldn't be parsed`);
      }

      if (flowResponse.fallback) {
        console.log(`\n📝 Ideas saved to: ${flowResponse.path}`);
        console.log('   (Flow API not available - manual import required)');
      }

      return results;
    } else {
      console.error('Failed to send ideas to Flow');
      return { success: false, error: 'API call failed' };
    }

  } catch (error) {
    console.error('Import failed:', error);
    return { success: false, error: error.message };
  }
}

// Run the import if called directly
if (require.main === module) {
  importIdeas(true).then(results => {
    process.exit(results.success ? 0 : 1);
  });
}

module.exports = { importIdeas };