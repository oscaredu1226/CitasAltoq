import { computed, inject, Injectable, signal } from '@angular/core';
import { CurrentUser, StoredSession } from './auth.models';
import { SessionStorageAdapter } from './session-storage.adapter';

@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly storage = inject(SessionStorageAdapter);
  private readonly sessionState = signal<StoredSession | null>(this.storage.read());
  private readonly userState = signal<CurrentUser | null>(null);
  private readonly restoringState = signal(false);

  readonly session = this.sessionState.asReadonly();
  readonly user = this.userState.asReadonly();
  readonly restoring = this.restoringState.asReadonly();
  readonly token = computed(() => this.sessionState()?.accessToken ?? null);
  readonly authenticated = computed(() => Boolean(this.token() && this.userState()));

  setSession(session: StoredSession): void {
    this.storage.write(session);
    this.sessionState.set(session);
  }

  setUser(user: CurrentUser | null): void {
    this.userState.set(user);
  }

  setRestoring(restoring: boolean): void {
    this.restoringState.set(restoring);
  }

  clear(): void {
    this.storage.clear();
    this.sessionState.set(null);
    this.userState.set(null);
  }
}
