import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';

import { TenantContextStore, TenantStateInvalidation } from './tenant-context.store';
import {
  TenantAuthorityChangeService,
  TenantAuthorityChange,
} from './tenant-authority-change.service';
import {
  TenantAuthorityReconciled,
  TenantStateInvalidationCoordinator,
} from './tenant-state-invalidation.coordinator';

describe('Cross-Tenant State Invalidation coordinator', () => {
  let invalidations: Subject<TenantStateInvalidation>;
  let closeAll: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let routerUrl: string;
  let authorityChanges: Subject<TenantAuthorityChange>;
  let synchronizeCanonicalContext: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    invalidations = new Subject<TenantStateInvalidation>();
    closeAll = vi.fn();
    navigate = vi.fn(() => Promise.resolve(true));
    routerUrl = '/patients';
    authorityChanges = new Subject<TenantAuthorityChange>();
    synchronizeCanonicalContext = vi.fn(() => Promise.resolve('synchronized'));

    TestBed.configureTestingModule({
      providers: [
        TenantStateInvalidationCoordinator,
        {
          provide: TenantContextStore,
          useValue: {
            invalidations: invalidations.asObservable(),
            selectedOrganizationId: vi.fn(() => 'organization-a'),
            switchGeneration: vi.fn(() => 3),
            isRequestContextCurrent: vi.fn(() => true),
            synchronizeCanonicalContext,
          },
        },
        {
          provide: TenantAuthorityChangeService,
          useValue: { changes: authorityChanges.asObservable() },
        },
        { provide: MatDialog, useValue: { closeAll } },
        {
          provide: Router,
          useValue: {
            get url() {
              return routerUrl;
            },
            navigate,
          },
        },
      ],
    });

    TestBed.inject(TenantStateInvalidationCoordinator);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('closes tenant-sensitive overlays and leaves successful switch navigation to the caller', () => {
    invalidations.next({ reason: 'tenant-switch', generation: 2 });

    expect(closeAll).toHaveBeenCalledOnce();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('routes a completed self-leave to organization selection', () => {
    invalidations.next({ reason: 'membership-left', generation: 2 });

    expect(closeAll).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(['/organization-selection'], { replaceUrl: true });
  });

  it('closes overlays idempotently without redirecting a logout handled by AuthService', () => {
    invalidations.next({ reason: 'logout', generation: 2 });

    expect(closeAll).toHaveBeenCalledOnce();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('routes invalid context recovery away from tenant-aware UI', () => {
    invalidations.next({ reason: 'invalid-context', generation: 2 });

    expect(closeAll).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(['/organization-selection'], { replaceUrl: true });
  });

  it('closes overlays and leaves tenant-aware routes after authorization loss', () => {
    invalidations.next({ reason: 'authorization-loss', generation: 2 });

    expect(closeAll).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(['/organization-selection'], { replaceUrl: true });
  });

  it('closes operational surfaces but preserves the suspended-safe administration route', () => {
    invalidations.next({ reason: 'organization-suspended', generation: 2 });

    expect(closeAll).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(['/organization-administration'], { replaceUrl: true });
  });

  it('does not remount organization administration when suspension is confirmed there', () => {
    routerUrl = '/organization-administration';

    invalidations.next({ reason: 'organization-suspended', generation: 2 });

    expect(closeAll).toHaveBeenCalledOnce();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not enqueue redundant selector navigation when already recovering', () => {
    routerUrl = '/organization-selection';

    invalidations.next({ reason: 'tenant-switch', generation: 2 });

    expect(closeAll).toHaveBeenCalledOnce();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('revalidates the same tenant after a valid authority-change signal', () => {
    authorityChanges.next({
      schemaVersion: 1,
      type: 'OWNERSHIP_TRANSFERRED',
      organizationId: 'organization-a',
      eventId: 'event-a',
    });

    expect(closeAll).toHaveBeenCalledOnce();
    expect(synchronizeCanonicalContext).toHaveBeenCalledWith(3, 'organization-a', true);
  });

  it('publishes row reconciliation only after synchronized V1 context remains current', async () => {
    const reconciled: TenantAuthorityReconciled[] = [];
    const coordinator = TestBed.inject(TenantStateInvalidationCoordinator);
    coordinator.authorityReconciled.subscribe((event) => reconciled.push(event));

    authorityChanges.next({
      schemaVersion: 1,
      type: 'OWNERSHIP_TRANSFERRED',
      organizationId: 'organization-a',
      eventId: 'event-a',
    });
    await vi.waitFor(() => expect(reconciled).toHaveLength(1));

    expect(reconciled).toEqual([{ organizationId: 'organization-a', generation: 3 }]);
  });

  it.each([
    ['failed', () => Promise.resolve('failed')],
    ['stale', () => Promise.resolve('stale')],
    ['rejected', () => Promise.reject(new Error('refresh failed'))],
  ])('does not publish row reconciliation when V1 synchronization is %s', async (_label, result) => {
    synchronizeCanonicalContext.mockImplementationOnce(result);
    const reconciled: TenantAuthorityReconciled[] = [];
    const coordinator = TestBed.inject(TenantStateInvalidationCoordinator);
    coordinator.authorityReconciled.subscribe((event) => reconciled.push(event));

    authorityChanges.next({
      schemaVersion: 1,
      type: 'OWNERSHIP_TRANSFERRED',
      organizationId: 'organization-a',
      eventId: `event-${_label}`,
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(reconciled).toEqual([]);
  });

  it('ignores an authority-change signal for a different selected tenant', () => {
    authorityChanges.next({
      schemaVersion: 1,
      type: 'OWNERSHIP_TRANSFERRED',
      organizationId: 'organization-b',
      eventId: 'event-b',
    });

    expect(closeAll).not.toHaveBeenCalled();
    expect(synchronizeCanonicalContext).not.toHaveBeenCalled();
  });
});
