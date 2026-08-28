import { Injectable } from '@angular/core';
import { StoredSession } from './auth.models';

const key = 'citas_altoq_session';

@Injectable({ providedIn: 'root' })
export class SessionStorageAdapter {
  read(): StoredSession | null {
    return this.readFrom(localStorage) ?? this.readFrom(sessionStorage);
  }

  write(session: StoredSession): void {
    this.clear();
    const storage = session.remember ? localStorage : sessionStorage;
    storage.setItem(key, JSON.stringify(session));
  }

  clear(): void {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }

  private readFrom(storage: Storage): StoredSession | null {
    const raw = storage.getItem(key);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as StoredSession;
      if (!parsed.accessToken || parsed.expiresAt <= Date.now()) {
        storage.removeItem(key);
        return null;
      }

      return parsed;
    } catch {
      storage.removeItem(key);
      return null;
    }
  }
}
