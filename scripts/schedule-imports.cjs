#!/usr/bin/env node

/**
 * Scheduled Import Service
 * Runs nightly imports from Evissa to Flow
 */

const cron = require('node-cron');
const { importIdeas } = require('./import-evissa-ideas.cjs');
const fs = require('fs').promises;
const path = require('path');

const SCHEDULE_LOG_FILE = path.join(__dirname, 'schedule-log.json');

/**
 * Log scheduler activity
 */
async function logSchedule(event, data = {}) {
  let log = [];
  try {
    const existingLog = await fs.readFile(SCHEDULE_LOG_FILE, 'utf-8');
    log = JSON.parse(existingLog);
  } catch (error) {
    // Log file doesn't exist yet
  }

  log.push({
    timestamp: new Date().toISOString(),
    event,
    ...data
  });

  // Keep only last 30 days of logs
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  log = log.filter(entry => new Date(entry.timestamp).getTime() > thirtyDaysAgo);

  await fs.writeFile(SCHEDULE_LOG_FILE, JSON.stringify(log, null, 2));
}

/**
 * Run the scheduled import
 */
async function runScheduledImport() {
  console.log(`[${new Date().toISOString()}] Running scheduled import...`);
  await logSchedule('import_start');

  try {
    const results = await importIdeas(false); // false = automated import

    await logSchedule('import_complete', results);

    if (results.success) {
      console.log(`[${new Date().toISOString()}] Import completed: ${results.imported} ideas imported`);
    } else {
      console.error(`[${new Date().toISOString()}] Import failed:`, results.error);
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Import error:`, error);
    await logSchedule('import_error', { error: error.message });
  }
}

/**
 * Start the scheduler
 */
function startScheduler() {
  console.log('🕒 Starting Evissa → Flow Import Scheduler');
  console.log('   Schedule: Daily at 2:00 AM');
  console.log('   Press Ctrl+C to stop\n');

  // Schedule for 2 AM daily
  const task = cron.schedule('0 2 * * *', runScheduledImport, {
    scheduled: true,
    timezone: "America/Los_Angeles" // Adjust to your timezone
  });

  // Also allow manual trigger for testing
  if (process.argv.includes('--test')) {
    console.log('🧪 Test mode: Running import immediately...');
    runScheduledImport();
  }

  // Log scheduler start
  logSchedule('scheduler_start', {
    schedule: '0 2 * * *',
    timezone: 'America/Los_Angeles'
  });

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n⏹️  Stopping scheduler...');
    task.stop();
    await logSchedule('scheduler_stop');
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    task.stop();
    await logSchedule('scheduler_stop');
    process.exit(0);
  });

  // Keep the process running
  process.stdin.resume();
}

// Start the scheduler
startScheduler();