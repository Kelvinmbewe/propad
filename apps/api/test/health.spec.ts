import { describe, it, expect } from 'vitest';
import { HealthController } from '../src/health/health.controller';

describe('HealthController', () => {
  it('returns status ok', () => {
    const controller = new HealthController();
    expect(controller.health()).toEqual({ status: 'ok' });
  });
});
