import { describe, it, expect } from 'vitest';
import type { Pillar, Execution, Platform } from '../types';

describe('Types', () => {
  describe('Pillar', () => {
    it('should allow valid pillar structure', () => {
      const pillar: Pillar = {
        id: '1',
        title: 'Test Pillar',
        coreIdea: 'A core idea',
        topic: 'Technology',
        status: 'active',
        themes: ['innovation', 'growth'],
      };

      expect(pillar.id).toBe('1');
      expect(pillar.status).toBe('active');
      expect(pillar.themes).toHaveLength(2);
    });

    it('should allow pillar without themes', () => {
      const pillar: Pillar = {
        id: '2',
        title: 'Minimal Pillar',
        coreIdea: 'Another idea',
        topic: 'Business',
        status: 'archived',
      };

      expect(pillar.themes).toBeUndefined();
    });
  });

  describe('Execution', () => {
    it('should allow valid execution structure', () => {
      const execution: Execution = {
        id: 'exec-1',
        pillarId: 'pillar-1',
        platform: 'linkedin',
        status: 'draft',
        content: 'Some content here',
        lastEdited: '2025-01-01T00:00:00Z',
      };

      expect(execution.platform).toBe('linkedin');
      expect(execution.status).toBe('draft');
    });

    it('should support all platforms', () => {
      const platforms: Platform[] = ['twitter', 'linkedin', 'instagram', 'newsletter', 'youtube'];

      expect(platforms).toHaveLength(5);
      platforms.forEach(p => expect(typeof p).toBe('string'));
    });
  });
});
