import { PerformanceMetrics, Platform, Execution } from '../types';

// LinkedIn CSV columns (from LinkedIn Analytics export)
interface LinkedInCSVRow {
  Date: string;
  'Post Link'?: string;
  'Post Title'?: string;
  'Post text'?: string;
  Impressions: string;
  Clicks: string;
  Reactions: string;
  Comments: string;
  Reposts: string;
  'Engagement rate'?: string;
}

// Kit (ConvertKit) Newsletter CSV columns
interface KitCSVRow {
  'Subject'?: string;
  'Sent At'?: string;
  'Recipients': string;
  'Opens': string;
  'Open Rate': string;
  'Clicks': string;
  'Click Rate': string;
  'Unsubscribes': string;
}

export interface ImportedPerformanceData {
  platform: Platform;
  publishedAt: string;
  contentSnippet: string;
  metrics: PerformanceMetrics;
  score: number;
  rawContent?: string;
}

// Parse CSV string into rows
function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  // Handle quoted CSV values with commas inside
  const parseRow = (row: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseRow(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }

  return rows;
}

// Calculate performance score (0-100) based on metrics
function calculateLinkedInScore(metrics: PerformanceMetrics): number {
  const impressions = metrics.impressions || 0;
  const engagements = (metrics.reactions || 0) + (metrics.comments || 0) + (metrics.shares || 0);

  if (impressions === 0) return 0;

  const engagementRate = (engagements / impressions) * 100;

  // Score based on engagement rate thresholds
  // < 1% = poor, 1-3% = average, 3-5% = good, > 5% = excellent
  if (engagementRate >= 5) return Math.min(100, 70 + engagementRate * 3);
  if (engagementRate >= 3) return 50 + (engagementRate - 3) * 10;
  if (engagementRate >= 1) return 30 + (engagementRate - 1) * 10;
  return Math.max(0, engagementRate * 30);
}

function calculateNewsletterScore(metrics: PerformanceMetrics): number {
  const openRate = metrics.openRate || 0;
  const clickRate = metrics.clickRate || 0;

  // Newsletter scoring: open rate (60% weight) + click rate (40% weight)
  // Open rate: < 20% poor, 20-40% average, 40-60% good, > 60% excellent
  // Click rate: < 2% poor, 2-5% average, 5-10% good, > 10% excellent

  let openScore = 0;
  if (openRate >= 60) openScore = 100;
  else if (openRate >= 40) openScore = 70 + (openRate - 40) * 1.5;
  else if (openRate >= 20) openScore = 40 + (openRate - 20) * 1.5;
  else openScore = openRate * 2;

  let clickScore = 0;
  if (clickRate >= 10) clickScore = 100;
  else if (clickRate >= 5) clickScore = 70 + (clickRate - 5) * 6;
  else if (clickRate >= 2) clickScore = 40 + (clickRate - 2) * 10;
  else clickScore = clickRate * 20;

  return Math.round(openScore * 0.6 + clickScore * 0.4);
}

// Parse LinkedIn CSV export
export function parseLinkedInCSV(csvText: string): ImportedPerformanceData[] {
  const rows = parseCSV(csvText) as unknown as LinkedInCSVRow[];

  return rows.map((row) => {
    const metrics: PerformanceMetrics = {
      impressions: parseInt(row.Impressions) || 0,
      clicks: parseInt(row.Clicks) || 0,
      reactions: parseInt(row.Reactions) || 0,
      comments: parseInt(row.Comments) || 0,
      shares: parseInt(row.Reposts) || 0,
      engagementRate: row['Engagement rate']
        ? parseFloat(row['Engagement rate'].replace('%', ''))
        : undefined,
    };

    const contentSnippet = row['Post text'] || row['Post Title'] || 'LinkedIn Post';

    return {
      platform: 'linkedin' as Platform,
      publishedAt: row.Date || new Date().toISOString(),
      contentSnippet: contentSnippet.slice(0, 100) + (contentSnippet.length > 100 ? '...' : ''),
      rawContent: row['Post text'],
      metrics,
      score: calculateLinkedInScore(metrics),
    };
  }).filter(item => item.metrics.impressions && item.metrics.impressions > 0);
}

// Parse Kit (ConvertKit) newsletter CSV export
export function parseKitCSV(csvText: string): ImportedPerformanceData[] {
  const rows = parseCSV(csvText) as unknown as KitCSVRow[];

  return rows.map((row) => {
    const metrics: PerformanceMetrics = {
      opens: parseInt(row.Opens) || 0,
      openRate: row['Open Rate']
        ? parseFloat(row['Open Rate'].replace('%', ''))
        : undefined,
      clicks: parseInt(row.Clicks) || 0,
      clickRate: row['Click Rate']
        ? parseFloat(row['Click Rate'].replace('%', ''))
        : undefined,
      unsubscribes: parseInt(row.Unsubscribes) || 0,
    };

    const contentSnippet = row.Subject || 'Newsletter';

    return {
      platform: 'newsletter' as Platform,
      publishedAt: row['Sent At'] || new Date().toISOString(),
      contentSnippet: contentSnippet.slice(0, 100) + (contentSnippet.length > 100 ? '...' : ''),
      rawContent: row.Subject,
      metrics,
      score: calculateNewsletterScore(metrics),
    };
  });
}

// Detect CSV type based on headers
export function detectCSVType(csvText: string): 'linkedin' | 'kit' | 'unknown' {
  const firstLine = csvText.split('\n')[0].toLowerCase();

  if (firstLine.includes('impressions') && firstLine.includes('reactions')) {
    return 'linkedin';
  }
  if (firstLine.includes('open rate') || firstLine.includes('sent at')) {
    return 'kit';
  }
  return 'unknown';
}

// Match imported data to existing executions by content similarity
export function matchToExecutions(
  importedData: ImportedPerformanceData[],
  executions: Execution[]
): Map<string, ImportedPerformanceData> {
  const matches = new Map<string, ImportedPerformanceData>();

  importedData.forEach((imported) => {
    // Find matching execution by platform and content similarity
    const platformExecutions = executions.filter(
      (e) => e.platform === imported.platform && e.status === 'published'
    );

    for (const execution of platformExecutions) {
      // Simple content matching: check if execution content contains the snippet
      // or if the raw content matches closely
      const executionContent = execution.content.toLowerCase().trim();
      const importedContent = (imported.rawContent || imported.contentSnippet).toLowerCase().trim();

      // Check for significant overlap (at least 50 chars matching)
      if (
        executionContent.includes(importedContent.slice(0, 50)) ||
        importedContent.includes(executionContent.slice(0, 50))
      ) {
        matches.set(execution.id, imported);
        break;
      }
    }
  });

  return matches;
}

// Parse and process a CSV file
export function parseCSVFile(
  csvText: string
): { type: 'linkedin' | 'kit' | 'unknown'; data: ImportedPerformanceData[] } {
  const type = detectCSVType(csvText);

  if (type === 'linkedin') {
    return { type, data: parseLinkedInCSV(csvText) };
  }
  if (type === 'kit') {
    return { type, data: parseKitCSV(csvText) };
  }

  return { type: 'unknown', data: [] };
}
