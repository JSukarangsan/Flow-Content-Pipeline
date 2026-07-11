#!/usr/bin/env node

/**
 * Generates a browser-executable import script
 * Run this to create a script you can paste into the browser console
 */

const fs = require('fs');
const path = require('path');

// Read the import data
const importDataPath = path.join(__dirname, 'import-data.json');
const importData = JSON.parse(fs.readFileSync(importDataPath, 'utf-8'));

// Read the browser script template
const browserScriptPath = path.join(__dirname, 'browser-import.js');
const browserScript = fs.readFileSync(browserScriptPath, 'utf-8');

// Combine them
const fullScript = browserScript.replace(
  '"ideas": [] // This will be populated below',
  `"ideas": ${JSON.stringify(importData.ideas, null, 2)}`
) + '\n\n// Run the import\nimportEvissaIdeas();';

// Save the complete script
const outputPath = path.join(__dirname, 'browser-import-complete.js');
fs.writeFileSync(outputPath, fullScript);

console.log(`
✅ Browser import script generated successfully!

To import your 25 Evissa ideas into Flow:

1. Open Flow in your browser: http://localhost:3000
2. Open the browser console (Cmd+Option+J on Mac, Ctrl+Shift+J on Windows/Linux)
3. Copy the entire contents of: ${outputPath}
4. Paste it into the console and press Enter
5. The page will auto-refresh after import

The script has been saved to: ${outputPath}
`);

// Also show a summary of what will be imported
console.log(`\nIdeas to import (${importData.ideas.length} total):`);
importData.ideas.slice(0, 5).forEach((idea, i) => {
  console.log(`${i + 1}. ${idea.title}`);
});
if (importData.ideas.length > 5) {
  console.log(`... and ${importData.ideas.length - 5} more\n`);
}