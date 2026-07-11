#!/usr/bin/env node

/**
 * Manual Import Script
 * Imports the generated import-data.json into Flow
 */

const fs = require('fs').promises;
const path = require('path');

// Import the API service
const { importFromFile } = require('../services/import-api');

async function runImport() {
  try {
    console.log('📥 Starting manual import of ideas into Flow...\n');

    // Read the import-data.json file
    const importPath = path.join(__dirname, 'import-data.json');
    const jsonData = await fs.readFile(importPath, 'utf-8');
    const data = JSON.parse(jsonData);

    console.log(`Found ${data.ideas.length} ideas to import`);
    console.log(`Generated at: ${data.timestamp}\n`);

    // Show a preview of the ideas
    console.log('Ideas to import:');
    data.ideas.slice(0, 5).forEach((idea, i) => {
      console.log(`${i + 1}. ${idea.title}`);
    });
    if (data.ideas.length > 5) {
      console.log(`... and ${data.ideas.length - 5} more\n`);
    }

    // Import the ideas
    console.log('Importing ideas into Flow database...');
    const result = await importFromFile(data);

    if (result.success) {
      console.log('\n✅ Import completed successfully!');
      console.log(`   Imported: ${result.imported} ideas`);
      if (result.failed > 0) {
        console.log(`   Failed: ${result.failed} ideas`);
        if (result.errors && result.errors.length > 0) {
          console.log('\nErrors:');
          result.errors.forEach(err => console.log(`   - ${err}`));
        }
      }
    } else {
      console.error('\n❌ Import failed');
      if (result.errors && result.errors.length > 0) {
        console.log('\nErrors:');
        result.errors.forEach(err => console.log(`   - ${err}`));
      }
    }

    console.log('\n📝 Note: Refresh your Flow app (http://localhost:3000) to see the imported ideas');

  } catch (error) {
    console.error('Import error:', error);
    process.exit(1);
  }
}

// Run the import
runImport();