import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';

import { TenantContextStore, TenantStateInvalidation } from './tenant-context.store';
import { TenantStateInvalidationCoordinator } from './tenant-state-invalidation.coordinator';

describe('Cross-Tenant State Invalidation coordinator', () => {
  let invalidations: Subject<TenantStateInvalidation>;
  let closeAll: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let routerUrl: string;

  beforeEach(() => {
    invalidations = new Subject<TenantStateInvalidation>();
    closeAll = vi.fn();
    navigate = vi.fn(() => Promise.resolve(true));
    routerUrl = '/patients';

    TestBed.configureTestingModule({
      providers: [
        TenantStateInvalidationCoordinator,
        {
          provide: TenantContextStore,
          useValue: { invalidations: invalidations.asObservable() },
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

  it('closes tenant-sensitive overlays and leaves the old tenant route on switch', () => {
    invalidations.next({ reason: 'tenant-switch', generation: 2 });

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

  it.each(['authorization-loss', 'organization-suspended'])(
    'closes overlays and leaves operational routes after %s',
    (reason) => {
      invalidations.next({ reason, generation: 2 });

      expect(closeAll).toHaveBeenCalledOnce();
      expect(navigate).toHaveBeenCalledWith(['/organization-selection'], { replaceUrl: true });
    },
  );

  it('does not enqueue redundant selector navigation when already recovering', () => {
    routerUrl = '/organization-selection';

    invalidations.next({ reason: 'tenant-switch', generation: 2 });

    expect(closeAll).toHaveBeenCalledOnce();
    expect(navigate).not.toHaveBeenCalled();
  });
});
