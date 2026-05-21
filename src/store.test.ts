import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG } from './store';

describe('DEFAULT_CONFIG Invariants', () => {
  it('should maintain the essential 10-pillar daily questions', () => {
    const requiredIds = [
      "driver",
      "frame",
      "ego",
      "outlook",
      "relational",
      "ram",
      "gratitude",
      "boundary",
      "responsibility",
      "agency"
    ];

    const actualIds = DEFAULT_CONFIG.daily_questions.map(q => q.id);
    
    // Ensure all required IDs are present
    requiredIds.forEach(id => {
      expect(actualIds).toContain(id);
    });

    // Ensure no more, no less (to catch accidental simplifications)
    expect(actualIds.length).toBe(10);
  });

  it('should have 4 options for each question', () => {
    DEFAULT_CONFIG.daily_questions.forEach(q => {
      expect(q.options.length).toBe(4);
    });
  });

  it('should maintain the 10-level training objective scale', () => {
    expect(DEFAULT_CONFIG.scales.training.objective.length).toBe(10);
  });

  it('should maintain the 10-level recovery objective scale', () => {
    expect(DEFAULT_CONFIG.scales.recovery.objective.length).toBe(10);
  });
});
