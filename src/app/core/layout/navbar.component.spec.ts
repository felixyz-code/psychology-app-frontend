import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';

import { AuthUser } from '../auth/auth.models';
import { AuthService } from '../auth/auth.service';
import { AuthStore } from '../auth/auth.store';
import { ThemeService } from '../theme/theme.service';
import { TenantContextStore } from '../tenant-context/tenant-context.store';
import { NavbarComponent } from './navbar.component';

const user: AuthUser = {
  id: 'user-1',
  name: 'Dra. Rivera',
  email: 'rivera@example.com',
  role: 'PSYCHOLOGIST',
};

describe('NavbarComponent', () => {
  let component: NavbarComponent;
  let store: AuthStore;
  let authService: { logout: ReturnType<typeof vi.fn> };
  let router: { url: string; navigate: ReturnType<typeof vi.fn> };
  let tenantContextStore: {
    snapshot: ReturnType<typeof vi.fn>;
    preferredPersistenceState: ReturnType<typeof vi.fn>;
    selectableMemberships: ReturnType<typeof vi.fn>;
    selectOrganization: ReturnType<typeof vi.fn>;
    selectedOrganizationId: ReturnType<typeof vi.fn>;
    isActiveTenantReady: ReturnType<typeof vi.fn>;
    isAdminSuspendedContext: ReturnType<typeof vi.fn>;
  };
  let selectedOrganizationId: string;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();

    authService = { logout: vi.fn() };
    router = { url: '/patients', navigate: vi.fn(() => Promise.resolve(true)) };
    selectedOrganizationId = 'organization-a';
    tenantContextStore = {
      snapshot: vi.fn(() => null),
      preferredPersistenceState: vi.fn(() => 'IDLE'),
      selectableMemberships: vi.fn(() => []),
      selectOrganization: vi.fn(async (organizationId: string) => {
        selectedOrganizationId = organizationId;
      }),
      selectedOrganizationId: vi.fn(() => selectedOrganizationId),
      isActiveTenantReady: vi.fn(() => true),
      isAdminSuspendedContext: vi.fn(() => false),
    };

    TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
        { provide: ThemeService, useValue: {} },
        {
          provide: TenantContextStore,
          useValue: tenantContextStore,
        },
      ],
    });

    store = TestBed.inject(AuthStore);
    authService.logout.mockImplementation(() => store.clearSession());
    component = TestBed.runInInjectionContext(() => new NavbarComponent());
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('renders official branding with svg isotype and title', () => {
    const fixture = TestBed.createComponent(NavbarComponent);
    fixture.detectChanges();

    const brandElement = fixture.nativeElement.querySelector('.navbar__brand');
    const logoElement = fixture.nativeElement.querySelector('.navbar__logo');
    const titleElement = fixture.nativeElement.querySelector('.navbar__title');

    expect(brandElement).not.toBeNull();
    expect(logoElement).not.toBeNull();
    expect(titleElement?.textContent).toContain('Psicologia App');
  });

  it('clears the authenticated session and navigates to login on logout', () => {
    store.setSession('active-token', user);

    component.logout();

    expect(authService.logout).toHaveBeenCalledOnce();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    expect(store.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('psychology_app_access_token')).toBeNull();
    expect(localStorage.getItem('psychology_app_auth_user')).toBeNull();
  });

  it('shows a non-blocking warning when preference persistence fails', () => {
    tenantContextStore.preferredPersistenceState.mockReturnValue('ERROR');

    const fixture = TestBed.createComponent(NavbarComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No se guardo como preferida');
  });

  it('shows one selected organization as identity without a fake switch affordance', () => {
    tenantContextStore.snapshot.mockReturnValue({
      organization: { id: 'organization-a', displayName: 'Organization A' },
    });
    tenantContextStore.selectableMemberships.mockReturnValue([
      selectableMembership('organization-a', 'Organization A'),
    ]);

    const fixture = TestBed.createComponent(NavbarComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.organization-identity')?.textContent).toContain(
      'Organization A',
    );
    expect(fixture.nativeElement.querySelector('.organization-menu-trigger')).toBeNull();
    expect(fixture.nativeElement.querySelector('.organization-control__chevron')).toBeNull();
    expect(
      fixture.nativeElement.querySelector('.organization-identity')?.getAttribute('aria-label'),
    ).toBe('Organización actual: Organization A');
  });

  it('shows no switch affordance when the current context has no selectable organizations', () => {
    tenantContextStore.snapshot.mockReturnValue({
      organization: { id: 'organization-a', displayName: 'Organization A' },
    });
    tenantContextStore.selectableMemberships.mockReturnValue([]);

    const fixture = TestBed.createComponent(NavbarComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.organization-identity')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.organization-menu-trigger')).toBeNull();
  });

  it('exposes an inline switch menu for canonical multi-organization memberships', async () => {
    tenantContextStore.snapshot.mockReturnValue({
      organization: { id: 'organization-a', displayName: 'Organization A' },
    });
    tenantContextStore.selectableMemberships.mockReturnValue([
      selectableMembership('organization-a', 'Organization A'),
      selectableMembership('organization-b', 'Organization B'),
    ]);

    const fixture = TestBed.createComponent(NavbarComponent);
    fixture.detectChanges();
    const trigger = fixture.nativeElement.querySelector(
      '.organization-menu-trigger',
    ) as HTMLButtonElement;

    expect(trigger).not.toBeNull();
    expect(trigger.getAttribute('aria-label')).toBe('Cambiar organización: Organization A');
    trigger.click();
    await fixture.whenStable();
    fixture.detectChanges();

    const currentItem = document.body.querySelector(
      '.organization-switch-menu__item[aria-current="true"]',
    );
    expect(currentItem?.textContent).toContain('Organization A');
  });

  it('uses canonical tenant selection and navigates after a successful navbar switch', async () => {
    tenantContextStore.snapshot.mockReturnValue({
      organization: { id: 'organization-a', displayName: 'Organization A' },
    });

    await component.switchOrganization('organization-b');

    expect(tenantContextStore.selectOrganization).toHaveBeenCalledWith('organization-b');
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard'], { replaceUrl: true });
    expect(component.organizationSwitchError()).toBe('');
  });

  it('keeps a successful switch error-free when already on the dashboard', async () => {
    router.url = '/dashboard';
    router.navigate.mockResolvedValue(false);
    tenantContextStore.snapshot.mockReturnValue({
      organization: { id: 'organization-a', displayName: 'Organization A' },
    });

    await component.switchOrganization('organization-b');

    expect(tenantContextStore.selectOrganization).toHaveBeenCalledWith('organization-b');
    expect(selectedOrganizationId).toBe('organization-b');
    expect(router.navigate).not.toHaveBeenCalled();
    expect(component.organizationSwitchError()).toBe('');
  });

  it('shows the switch error only when canonical selection actually fails', async () => {
    tenantContextStore.snapshot.mockReturnValue({
      organization: { id: 'organization-a', displayName: 'Organization A' },
    });
    tenantContextStore.selectOrganization.mockRejectedValue(new Error('Context unavailable'));

    await component.switchOrganization('organization-b');

    expect(router.navigate).not.toHaveBeenCalled();
    expect(component.organizationSwitchError()).toContain('No fue posible cambiar de organización');
  });

  it('prevents duplicate navbar switch submissions while canonical selection is pending', async () => {
    tenantContextStore.snapshot.mockReturnValue({
      organization: { id: 'organization-a', displayName: 'Organization A' },
    });
    let completeSelection!: () => void;
    tenantContextStore.selectOrganization.mockReturnValue(
      new Promise<void>((resolve) => {
        completeSelection = resolve;
      }),
    );

    const firstSwitch = component.switchOrganization('organization-b');
    const duplicateSwitch = component.switchOrganization('organization-b');

    expect(tenantContextStore.selectOrganization).toHaveBeenCalledOnce();
    expect(component.isSwitchingOrganization()).toBe(true);

    completeSelection();
    await Promise.all([firstSwitch, duplicateSwitch]);
    expect(component.isSwitchingOrganization()).toBe(false);
  });
});

function selectableMembership(organizationId: string, organizationDisplayName: string) {
  return {
    membershipId: 'membership-' + organizationId,
    organizationId,
    organizationDisplayName,
    organizationRole: 'PSYCHOLOGIST',
  };
}
