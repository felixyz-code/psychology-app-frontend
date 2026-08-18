import { DestroyRef, inject, Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export const TENANT_AUTHORITY_CHANGE_STORAGE_KEY = 'psychology_app_tenant_authority_change';

export interface TenantAuthorityChange {
  readonly schemaVersion: 1;
  readonly type: 'OWNERSHIP_TRANSFERRED';
  readonly organizationId: string;
  readonly eventId: string;
  readonly timestamp?: number;
}

@Injectable({ providedIn: 'root' })
export class TenantAuthorityChangeService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly changesSubject = new Subject<TenantAuthorityChange>();
  private readonly seenEventIds = new Set<string>();

  readonly changes = this.changesSubject.asObservable();

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('storage', this.handleStorageEvent);
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('storage', this.handleStorageEvent);
    });
  }

  emitOwnershipTransferred(organizationId: string): void {
    if (typeof window === 'undefined' || !organizationId.trim()) {
      return;
    }

    const event: TenantAuthorityChange = {
      schemaVersion: 1,
      type: 'OWNERSHIP_TRANSFERRED',
      organizationId,
      eventId: this.createEventId(),
      timestamp: Date.now(),
    };

    this.seenEventIds.add(event.eventId);

    try {
      window.localStorage.setItem(TENANT_AUTHORITY_CHANGE_STORAGE_KEY, JSON.stringify(event));
      window.localStorage.removeItem(TENANT_AUTHORITY_CHANGE_STORAGE_KEY);
    } catch {
      // Cross-tab transport is best effort; the initiating tab reconciles directly.
    }
  }

  private readonly handleStorageEvent = (event: StorageEvent): void => {
    if (event.key !== TENANT_AUTHORITY_CHANGE_STORAGE_KEY || event.newValue === null) {
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(event.newValue);
    } catch {
      return;
    }

    const change = parseTenantAuthorityChange(parsed);
    if (!change || this.seenEventIds.has(change.eventId)) {
      return;
    }

    this.seenEventIds.add(change.eventId);
    this.changesSubject.next(change);
  };

  private createEventId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

function parseTenantAuthorityChange(value: unknown): TenantAuthorityChange | null {
  if (!isRecord(value)) {
    return null;
  }

  const keys = Object.keys(value);
  const allowedKeys = new Set(['schemaVersion', 'type', 'organizationId', 'eventId', 'timestamp']);
  if (keys.some((key) => !allowedKeys.has(key))) {
    return null;
  }

  if (
    value['schemaVersion'] !== 1 ||
    value['type'] !== 'OWNERSHIP_TRANSFERRED' ||
    !isNonEmptyString(value['organizationId']) ||
    !isNonEmptyString(value['eventId']) ||
    (value['timestamp'] !== undefined &&
      (typeof value['timestamp'] !== 'number' || !Number.isFinite(value['timestamp'])))
  ) {
    return null;
  }

  return value as unknown as TenantAuthorityChange;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
