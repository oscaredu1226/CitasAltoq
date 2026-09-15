import { computed, Injectable, signal } from '@angular/core';
import { MfaElevation, MfaStatus } from './mfa.models';

@Injectable({ providedIn: 'root' })
export class MfaStore {
  private readonly tokenState = signal<string | null>(null);
  private readonly expiresAtState = signal<string | null>(null);
  private readonly enrolledState = signal(false);
  private expirationTimer: ReturnType<typeof setTimeout> | null = null;

  readonly token = this.tokenState.asReadonly();
  readonly expiresAt = this.expiresAtState.asReadonly();
  readonly enrolled = this.enrolledState.asReadonly();
  readonly elevated = computed(() => this.hasFreshElevation());

  setElevation(elevation: MfaElevation): void {
    this.tokenState.set(elevation.mfaToken);
    this.expiresAtState.set(elevation.expiresAt);
    this.scheduleExpiration(elevation.expiresAt);
  }

  setStatus(status: MfaStatus): void {
    this.enrolledState.set(status.enrolled);
  }

  markEnrolled(): void {
    this.enrolledState.set(true);
  }

  clearElevation(): void {
    this.clearExpirationTimer();
    this.tokenState.set(null);
    this.expiresAtState.set(null);
  }

  clear(): void {
    this.clearElevation();
    this.enrolledState.set(false);
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
      this.clearElevation();
      return;
    }

    this.expirationTimer = setTimeout(() => this.clearElevation(), delay);
  }

  private clearExpirationTimer(): void {
    if (this.expirationTimer) {
      clearTimeout(this.expirationTimer);
      this.expirationTimer = null;
    }
  }
}
