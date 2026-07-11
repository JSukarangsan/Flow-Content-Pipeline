/**
 * Browser Console Import Script
 * Copy and paste this entire script into the browser console while on http://localhost:3000
 */

// The import data from Evissa
const importData = {
  "timestamp": "2026-03-16T21:45:17.966Z",
  "ideas": [] // This will be populated below
};

// Function to import ideas
async function importEvissaIdeas() {
  console.log('🚀 Starting Evissa ideas import...');

  try {
    // Open the IndexedDB
    const request = indexedDB.open('FlowContentPipeline', 1);

    request.onsuccess = async (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('ideas')) {
        throw new Error('Ideas store not found. Make sure Flow has been initialized.');
      }

      const transaction = db.transaction(['ideas'], 'readwrite');
      const store = transaction.objectStore('ideas');

      let imported = 0;
      let failed = 0;

      // Import each idea
      for (const idea of importData.ideas) {
        try {
          const flowIdea = {
            id: `evissa-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            pillarId: '',
            gist: idea.title,
            hooks: idea.hooks || [],
            content: idea.coreIdea,
            source: idea.source || { type: 'evissa', title: idea.title },
            tags: idea.tags || [],
            status: 'approved',
            importedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          await new Promise((resolve, reject) => {
            const addRequest = store.add(flowIdea);
            addRequest.onsuccess = () => resolve();
            addRequest.onerror = () => reject(addRequest.error);
          });

          imported++;
          console.log(`✅ Imported: ${idea.title.substring(0, 50)}...`);
        } catch (error) {
          console.error(`❌ Failed to import: ${idea.title}`, error);
          failed++;
        }
      }

      console.log(`
========================================
✅ Import Complete!
========================================
Imported: ${imported} ideas
Failed: ${failed} ideas

⚠️  IMPORTANT: Refresh the page to see the imported ideas
========================================
      `);

      // Auto-refresh after 2 seconds
      setTimeout(() => {
        console.log('Refreshing page...');
        window.location.reload();
      }, 2000);
    };

    request.onerror = () => {
      console.error('Failed to open database:', request.error);
    };

  } catch (error) {
    console.error('Import failed:', error);
  }
}

// Note: The actual idea data will be appended below by the generation script