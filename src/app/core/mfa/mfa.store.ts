import { computed, Injectable, signal } from '@angular/core';
import { MfaElevation } from './mfa.models';

@Injectable({ providedIn: 'root' })
export class MfaStore {
  private readonly tokenState = signal<string | null>(null);
  private readonly expiresAtState = signal<string | null>(null);
  private expirationTimer: ReturnType<typeof setTimeout> | null = null;

  readonly token = this.tokenState.asReadonly();
  readonly expiresAt = this.expiresAtState.asReadonly();
  readonly elevated = computed(() => this.hasFreshElevation());

  setElevation(elevation: MfaElevation): void {
    this.tokenState.set(elevation.mfaToken);
    this.expiresAtState.set(elevation.expiresAt);
    this.scheduleExpiration(elevation.expiresAt);
  }

  clear(): void {
    this.clearExpirationTimer();
    this.tokenState.set(null);
    this.expiresAtState.set(null);
  }

  hasFreshElevation(): boolean {
    const token = this.tokenState();
    const expiresAt = this.expiresAtState();
    return Boolean(token && expiresAt && new Date(expiresAt).getTime() > Date.now());
  }

  private scheduleExpiration(expiresAt: string): void {
    this.clearExpirationTimer();
    const delay = new Date(expiresAt).getTime() - Date.now();
    if (!Number.isFinite(delay) || delay <= 0) {
      this.clear();
      return;
    }

    this.expirationTimer = setTimeout(() => this.clear(), delay);
  }

  private clearExpirationTimer(): void {
    if (this.expirationTimer) {
      clearTimeout(this.expirationTimer);
      this.expirationTimer = null;
    }
  }
}
