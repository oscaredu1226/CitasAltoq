import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { MfaStore } from './mfa.store';

describe('MfaStore', () => {
  it('keeps MFA elevation in memory and clears it when it expires', () => {
    vi.useFakeTimers();
    try {
      TestBed.configureTestingModule({});
      const store = TestBed.inject(MfaStore);

      store.setElevation({
        mfaToken: 'mfa-token',
        expiresAt: new Date(Date.now() + 1_000).toISOString(),
      });

      expect(store.token()).toBe('mfa-token');
      expect(store.elevated()).toBe(true);

      vi.advanceTimersByTime(1_001);

      expect(store.token()).toBeNull();
      expect(store.elevated()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
