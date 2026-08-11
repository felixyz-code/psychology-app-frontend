import { TestBed } from '@angular/core/testing';

import {
  TENANT_AUTHORITY_CHANGE_STORAGE_KEY,
  TenantAuthorityChange,
  TenantAuthorityChangeService,
} from './tenant-authority-change.service';

describe('TenantAuthorityChangeService', () => {
  let service: TenantAuthorityChangeService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [TenantAuthorityChangeService] });
    localStorage.clear();
    service = TestBed.inject(TenantAuthorityChangeService);
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('publishes one safe event with only non-authoritative metadata', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem');

    service.emitOwnershipTransferred('organization-a');

    expect(setItem).toHaveBeenCalledOnce();
    expect(removeItem).toHaveBeenCalledWith(TENANT_AUTHORITY_CHANGE_STORAGE_KEY);
    const payload = JSON.parse(setItem.mock.calls[0][1]) as Record<string, unknown>;
    expect(payload).toMatchObject({
      schemaVersion: 1,
      type: 'OWNERSHIP_TRANSFERRED',
      organizationId: 'organization-a',
    });
    expect(typeof payload['eventId']).toBe('string');
    expect(Object.keys(payload).sort()).toEqual(
      ['eventId', 'organizationId', 'schemaVersion', 'timestamp', 'type'].sort(),
    );
    expect(payload).not.toHaveProperty('roles');
    expect(payload).not.toHaveProperty('capabilities');
    expect(payload).not.toHaveProperty('userId');
  });

  it('accepts a valid receiving event and ignores malformed, duplicate and remove events', () => {
    const received: TenantAuthorityChange[] = [];
    service.changes.subscribe((change) => received.push(change));
    const valid = {
      schemaVersion: 1,
      type: 'OWNERSHIP_TRANSFERRED',
      organizationId: 'organization-a',
      eventId: 'event-1',
    };

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: TENANT_AUTHORITY_CHANGE_STORAGE_KEY,
        newValue: JSON.stringify(valid),
      }),
    );
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: TENANT_AUTHORITY_CHANGE_STORAGE_KEY,
        newValue: JSON.stringify(valid),
      }),
    );
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: TENANT_AUTHORITY_CHANGE_STORAGE_KEY,
        newValue: null,
      }),
    );
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: TENANT_AUTHORITY_CHANGE_STORAGE_KEY,
        newValue: JSON.stringify({ ...valid, eventId: 'event-2', role: 'OWNER' }),
      }),
    );

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject(valid);
  });

  it('does not emit a same-tab event as a substitute for local reconciliation', () => {
    const received: TenantAuthorityChange[] = [];
    service.changes.subscribe((change) => received.push(change));

    service.emitOwnershipTransferred('organization-a');

    expect(received).toEqual([]);
  });
});
