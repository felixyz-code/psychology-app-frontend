import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';

import { AuthService } from '../auth/auth.service';
import { TenantContextStore } from './tenant-context.store';
import { OrganizationSelectionPage } from './organization-selection.page';

describe('OrganizationSelectionPage', () => {
  let component: OrganizationSelectionPage;
  let tenantStore: {
    state: ReturnType<typeof vi.fn>;
    isLoading: ReturnType<typeof vi.fn>;
    isActiveTenantReady: ReturnType<typeof vi.fn>;
    isAdminSuspendedContext: ReturnType<typeof vi.fn>;
    selectableMemberships: ReturnType<typeof vi.fn>;
    preferredOrganizationId: ReturnType<typeof vi.fn>;
    selectOrganization: ReturnType<typeof vi.fn>;
  };
  let router: { navigate: ReturnType<typeof vi.fn> };
  let authService: { logout: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    tenantStore = {
      state: vi.fn(() => 'AMBIGUOUS_SELECTION'),
      isLoading: vi.fn(() => false),
      isActiveTenantReady: vi.fn(() => true),
      isAdminSuspendedContext: vi.fn(() => false),
      selectableMemberships: vi.fn(() => [
        {
          membershipId: 'membership-a',
          organizationId: 'organization-a',
          organizationDisplayName: 'Organization A',
          organizationRole: 'OWNER',
        },
      ]),
      preferredOrganizationId: vi.fn(() => null),
      selectOrganization: vi.fn(() => Promise.resolve()),
    };
    router = { navigate: vi.fn(() => Promise.resolve(true)) };
    authService = { logout: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: TenantContextStore, useValue: tenantStore },
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: authService },
      ],
    });

    component = TestBed.runInInjectionContext(() => new OrganizationSelectionPage());
  });

  afterEach(() => TestBed.resetTestingModule());

  it('confirms a manual selection and navigates only after the context is ready', async () => {
    component.organizationControl.setValue('organization-a');

    component.selectOrganization();
    await Promise.resolve();

    expect(tenantStore.selectOrganization).toHaveBeenCalledWith('organization-a');
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard'], { replaceUrl: true });
  });

  it('requires an organization before submitting', () => {
    component.organizationControl.setValue('');

    component.selectOrganization();

    expect(tenantStore.selectOrganization).not.toHaveBeenCalled();
  });
});
