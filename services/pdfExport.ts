/**
 * PDF Export Service for Flow Content Pipeline
 * Generates beautiful strategy documents for client presentations
 */

import jsPDF from 'jspdf';
import { Pillar, Execution } from '../types';

export interface ExportOptions {
  includeExecutions?: boolean;
  includeThemes?: boolean;
  includeStats?: boolean;
  watermark?: boolean;
}

export class PDFExportService {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number = 20;
  private currentY: number = 20;
  private lineHeight: number = 7;

  // Brand colors
  private colors = {
    primary: [99, 102, 241],     // Indigo (accent-600)
    secondary: [107, 114, 128],   // Gray
    dark: [17, 24, 39],          // Gray-900
    light: [243, 244, 246]       // Gray-100
  } as const;

  constructor() {
    this.doc = new jsPDF();
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
  }

  /**
   * Export strategy to PDF
   */
  async exportStrategy(
    pillars: Pillar[],
    executions: Execution[],
    options: ExportOptions = {}
  ): Promise<Blob> {
    this.doc = new jsPDF();
    this.currentY = this.margin;

    // Add header
    this.addHeader();

    // Add title page
    this.addTitlePage(pillars.length, executions.length);

    // Add table of contents
    this.addTableOfContents(pillars);

    // Add overview statistics
    if (options.includeStats) {
      this.addNewPage();
      this.addStatistics(pillars, executions);
    }

    // Add pillars section
    this.addNewPage();
    this.addSectionHeader('Strategic Pillars');

    for (const pillar of pillars) {
      this.addPillar(pillar);

      if (options.includeExecutions) {
        const pillarExecutions = executions.filter(e => e.pillarId === pillar.id);
        if (pillarExecutions.length > 0) {
          this.addExecutions(pillarExecutions);
        }
      }

      // Add spacing between pillars
      this.currentY += 10;
      if (this.currentY > this.pageHeight - 40) {
        this.addNewPage();
      }
    }

    // Add themes analysis if available
    if (options.includeThemes) {
      const allThemes = this.extractThemes(pillars);
      if (allThemes.length > 0) {
        this.addNewPage();
        this.addThemesAnalysis(allThemes, pillars);
      }
    }

    // Add footer to all pages
    this.addFooters();

    // Add watermark if requested
    if (options.watermark) {
      this.addWatermark();
    }

    // Return as blob
    return this.doc.output('blob');
  }

  /**
   * Add header to first page
   */
  private addHeader(): void {
    this.doc.setFillColor(...this.colors.primary);
    this.doc.rect(0, 0, this.pageWidth, 15, 'F');

    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(10);
    this.doc.text('CONTENT STRATEGY', this.margin, 9);

    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    this.doc.text(date, this.pageWidth - this.margin, 9, { align: 'right' });
  }

  /**
   * Add title page
   */
  private addTitlePage(pillarCount: number, executionCount: number): void {
    this.currentY = 60;

    // Title
    this.doc.setTextColor(...this.colors.dark);
    this.doc.setFontSize(32);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Content Strategy', this.pageWidth / 2, this.currentY, { align: 'center' });

    this.currentY += 15;
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(...this.colors.secondary);
    this.doc.text('Strategic Framework & Execution Plan', this.pageWidth / 2, this.currentY, { align: 'center' });

    // Stats boxes
    this.currentY = 100;
    const boxWidth = 60;
    const boxHeight = 30;
    const spacing = 10;
    const startX = (this.pageWidth - (boxWidth * 2 + spacing)) / 2;

    // Pillars box
    this.doc.setFillColor(...this.colors.light);
    this.doc.roundedRect(startX, this.currentY, boxWidth, boxHeight, 3, 3, 'F');
    this.doc.setFontSize(24);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...this.colors.primary);
    this.doc.text(pillarCount.toString(), startX + boxWidth / 2, this.currentY + 15, { align: 'center' });
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(...this.colors.secondary);
    this.doc.text('STRATEGIC PILLARS', startX + boxWidth / 2, this.currentY + 22, { align: 'center' });

    // Executions box
    const execX = startX + boxWidth + spacing;
    this.doc.setFillColor(...this.colors.light);
    this.doc.roundedRect(execX, this.currentY, boxWidth, boxHeight, 3, 3, 'F');
    this.doc.setFontSize(24);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...this.colors.primary);
    this.doc.text(executionCount.toString(), execX + boxWidth / 2, this.currentY + 15, { align: 'center' });
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(...this.colors.secondary);
    this.doc.text('CONTENT PIECES', execX + boxWidth / 2, this.currentY + 22, { align: 'center' });

    // Generated by Flow
    this.currentY = this.pageHeight - 30;
    this.doc.setFontSize(9);
    this.doc.setTextColor(...this.colors.secondary);
    this.doc.text('Generated with Flow Content Pipeline', this.pageWidth / 2, this.currentY, { align: 'center' });
  }

  /**
   * Add table of contents
   */
  private addTableOfContents(pillars: Pillar[]): void {
    this.addNewPage();
    this.currentY = 30;

    this.doc.setFontSize(20);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...this.colors.dark);
    this.doc.text('Table of Contents', this.margin, this.currentY);

    this.currentY += 15;
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'normal');

    let pageNum = 3; // Start after title and TOC pages

    // Overview section
    this.doc.setTextColor(...this.colors.secondary);
    this.doc.text('Overview & Statistics', this.margin + 5, this.currentY);
    this.doc.text(pageNum.toString(), this.pageWidth - this.margin - 5, this.currentY, { align: 'right' });
    this.currentY += this.lineHeight;
    pageNum++;

    // Pillars
    this.currentY += 5;
    this.doc.setTextColor(...this.colors.dark);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Strategic Pillars', this.margin + 5, this.currentY);
    this.currentY += this.lineHeight;

    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(...this.colors.secondary);
    for (const pillar of pillars) {
      this.doc.text(`• ${pillar.title}`, this.margin + 10, this.currentY);
      this.doc.text(pageNum.toString(), this.pageWidth - this.margin - 5, this.currentY, { align: 'right' });
      this.currentY += this.lineHeight;
      pageNum++;
    }

    // Themes
    this.currentY += 5;
    this.doc.setTextColor(...this.colors.dark);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Cross-Cutting Themes', this.margin + 5, this.currentY);
    this.doc.text(pageNum.toString(), this.pageWidth - this.margin - 5, this.currentY, { align: 'right' });
  }

  /**
   * Add statistics page
   */
  private addStatistics(pillars: Pillar[], executions: Execution[]): void {
    this.currentY = 30;

    this.doc.setFontSize(20);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...this.colors.dark);
    this.doc.text('Overview & Statistics', this.margin, this.currentY);

    this.currentY += 20;

    // Platform breakdown
    const platformCounts: Record<string, number> = {};
    for (const exec of executions) {
      platformCounts[exec.platform] = (platformCounts[exec.platform] || 0) + 1;
    }

    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Content Distribution by Platform', this.margin, this.currentY);
    this.currentY += 10;

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    for (const [platform, count] of Object.entries(platformCounts)) {
      const percentage = Math.round((count / executions.length) * 100);
      this.doc.setTextColor(...this.colors.secondary);
      this.doc.text(`${platform.charAt(0).toUpperCase() + platform.slice(1)}:`, this.margin + 5, this.currentY);
      this.doc.setTextColor(...this.colors.primary);
      this.doc.text(`${count} pieces (${percentage}%)`, this.margin + 40, this.currentY);
      this.currentY += this.lineHeight;
    }

    // Status breakdown
    this.currentY += 10;
    const statusCounts: Record<string, number> = {};
    for (const exec of executions) {
      statusCounts[exec.status] = (statusCounts[exec.status] || 0) + 1;
    }

    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...this.colors.dark);
    this.doc.text('Content Status', this.margin, this.currentY);
    this.currentY += 10;

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    for (const [status, count] of Object.entries(statusCounts)) {
      this.doc.setTextColor(...this.colors.secondary);
      this.doc.text(`${status.charAt(0).toUpperCase() + status.slice(1)}:`, this.margin + 5, this.currentY);
      this.doc.setTextColor(...this.colors.primary);
      this.doc.text(`${count} pieces`, this.margin + 40, this.currentY);
      this.currentY += this.lineHeight;
    }
  }

  /**
   * Add section header
   */
  private addSectionHeader(title: string): void {
    this.currentY = 30;

    this.doc.setFillColor(...this.colors.primary);
    this.doc.rect(0, this.currentY - 10, this.pageWidth, 25, 'F');

    this.doc.setFontSize(18);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(255, 255, 255);
    this.doc.text(title, this.pageWidth / 2, this.currentY, { align: 'center' });

    this.currentY += 25;
  }

  /**
   * Add pillar to PDF
   */
  private addPillar(pillar: Pillar): void {
    // Check if we need a new page
    if (this.currentY > this.pageHeight - 60) {
      this.addNewPage();
    }

    // Pillar title
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...this.colors.primary);
    this.doc.text(pillar.title, this.margin, this.currentY);

    // Topic badge
    if (pillar.topic) {
      const textWidth = this.doc.getTextWidth(pillar.title);
      this.doc.setFontSize(8);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(...this.colors.secondary);
      this.doc.text(`[${pillar.topic}]`, this.margin + textWidth + 5, this.currentY);
    }

    this.currentY += 8;

    // Core idea
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(...this.colors.dark);
    const lines = this.doc.splitTextToSize(pillar.coreIdea, this.pageWidth - 2 * this.margin);
    for (const line of lines) {
      this.doc.text(line, this.margin, this.currentY);
      this.currentY += this.lineHeight;
    }

    // Themes
    if (pillar.themes && pillar.themes.length > 0) {
      this.currentY += 3;
      this.doc.setFontSize(9);
      this.doc.setTextColor(...this.colors.secondary);
      this.doc.text('Themes: ' + pillar.themes.join(', '), this.margin, this.currentY);
      this.currentY += this.lineHeight;
    }
  }

  /**
   * Add executions for a pillar
   */
  private addExecutions(executions: Execution[]): void {
    this.currentY += 5;

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...this.colors.secondary);
    this.doc.text('Content Pieces:', this.margin + 10, this.currentY);
    this.currentY += this.lineHeight;

    this.doc.setFont('helvetica', 'normal');
    for (const exec of executions) {
      this.doc.setFontSize(9);
      this.doc.setTextColor(...this.colors.secondary);

      // Platform and status
      const platform = exec.platform.charAt(0).toUpperCase() + exec.platform.slice(1);
      const status = exec.status === 'published' ? '✓' : exec.status === 'ready' ? '•' : '○';

      this.doc.text(`${status} ${platform}`, this.margin + 15, this.currentY);

      // Content preview (first 100 chars)
      const preview = exec.content.substring(0, 80) + '...';
      const previewLines = this.doc.splitTextToSize(preview, this.pageWidth - 2 * this.margin - 25);
      this.doc.setFontSize(8);
      this.doc.text(previewLines[0], this.margin + 40, this.currentY);

      this.currentY += this.lineHeight;
    }
  }

  /**
   * Add themes analysis
   */
  private addThemesAnalysis(themes: string[], pillars: Pillar[]): void {
    this.addSectionHeader('Cross-Cutting Themes');

    this.currentY += 10;
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(...this.colors.secondary);

    const intro = 'The following themes emerge across your content strategy, connecting multiple pillars:';
    const introLines = this.doc.splitTextToSize(intro, this.pageWidth - 2 * this.margin);
    for (const line of introLines) {
      this.doc.text(line, this.margin, this.currentY);
      this.currentY += this.lineHeight;
    }

    this.currentY += 5;

    for (const theme of themes) {
      // Theme name
      this.doc.setFontSize(11);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(...this.colors.primary);
      this.doc.text(`• ${theme}`, this.margin, this.currentY);
      this.currentY += this.lineHeight;

      // Pillars using this theme
      const relatedPillars = pillars.filter(p => p.themes?.includes(theme));
      if (relatedPillars.length > 0) {
        this.doc.setFontSize(9);
        this.doc.setFont('helvetica', 'normal');
        this.doc.setTextColor(...this.colors.secondary);
        const pillarNames = relatedPillars.map(p => p.title).join(', ');
        const text = `Found in: ${pillarNames}`;
        const lines = this.doc.splitTextToSize(text, this.pageWidth - 2 * this.margin - 10);
        for (const line of lines) {
          this.doc.text(line, this.margin + 10, this.currentY);
          this.currentY += this.lineHeight - 1;
        }
      }

      this.currentY += 5;
    }
  }

  /**
   * Extract unique themes from pillars
   */
  private extractThemes(pillars: Pillar[]): string[] {
    const themes = new Set<string>();
    for (const pillar of pillars) {
      if (pillar.themes) {
        for (const theme of pillar.themes) {
          themes.add(theme);
        }
      }
    }
    return Array.from(themes).sort();
  }

  /**
   * Add footer to all pages
   */
  private addFooters(): void {
    const pageCount = this.doc.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      this.doc.setFontSize(8);
      this.doc.setTextColor(...this.colors.secondary);

      // Page number
      if (i > 1) { // Skip first page
        this.doc.text(`Page ${i - 1} of ${pageCount - 1}`, this.pageWidth / 2, this.pageHeight - 10, { align: 'center' });
      }

      // Flow branding
      this.doc.setTextColor(...this.colors.primary);
      this.doc.text('Built with Flow', this.pageWidth - this.margin, this.pageHeight - 10, { align: 'right' });
    }
  }

  /**
   * Add watermark to all pages
   */
  private addWatermark(): void {
    const pageCount = this.doc.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      this.doc.setFontSize(60);
      this.doc.setTextColor(200, 200, 200, 0.1); // Very light gray with opacity
      this.doc.text('CONFIDENTIAL', this.pageWidth / 2, this.pageHeight / 2, {
        align: 'center',
        angle: 45
      });
    }
  }

  /**
   * Add new page
   */
  private addNewPage(): void {
    this.doc.addPage();
    this.currentY = this.margin;
  }

  /**
   * Save PDF to file
   */
  async savePDF(
    filename: string,
    pillars: Pillar[],
    executions: Execution[],
    options: ExportOptions = {}
  ): Promise<void> {
    const blob = await this.exportStrategy(pillars, executions, options);

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();

    // Clean up
    URL.revokeObjectURL(url);
  }
}

// Export singleton instance
export const pdfExporter = new PDFExportService();