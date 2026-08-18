import { Router } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthService } from '../auth/auth.service';
import { TenantContextStore } from './tenant-context.store';
import { OrganizationSelectionPage } from './organization-selection.page';

describe('OrganizationSelectionPage', () => {
  let component: OrganizationSelectionPage;
  let fixture: ComponentFixture<OrganizationSelectionPage>;
  let tenantState: string;
  let memberships: Array<{
    membershipId: string;
    organizationId: string;
    organizationDisplayName: string;
    organizationRole: string;
  }>;
  let tenantStore: {
    state: ReturnType<typeof vi.fn>;
    isLoading: ReturnType<typeof vi.fn>;
    isActiveTenantReady: ReturnType<typeof vi.fn>;
    isAdminSuspendedContext: ReturnType<typeof vi.fn>;
    selectableMemberships: ReturnType<typeof vi.fn>;
    preferredOrganizationId: ReturnType<typeof vi.fn>;
    candidateOrganizationId: ReturnType<typeof vi.fn>;
    selectOrganization: ReturnType<typeof vi.fn>;
  };
  let router: { navigate: ReturnType<typeof vi.fn> };
  let authService: { logout: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    tenantState = 'AMBIGUOUS_SELECTION';
    memberships = [
      {
        membershipId: 'membership-a',
        organizationId: 'organization-a',
        organizationDisplayName: 'Organization A',
        organizationRole: 'OWNER',
      },
      {
        membershipId: 'membership-b',
        organizationId: 'organization-b',
        organizationDisplayName: 'Organization B',
        organizationRole: 'ADMIN',
      },
    ];
    tenantStore = {
      state: vi.fn(() => tenantState),
      isLoading: vi.fn(() => false),
      isActiveTenantReady: vi.fn(() => true),
      isAdminSuspendedContext: vi.fn(() => false),
      selectableMemberships: vi.fn(() => memberships),
      preferredOrganizationId: vi.fn(() => null),
      candidateOrganizationId: vi.fn(() => null),
      selectOrganization: vi.fn(() => Promise.resolve()),
    };
    router = { navigate: vi.fn(() => Promise.resolve(true)) };
    authService = { logout: vi.fn() };

    TestBed.configureTestingModule({
      imports: [OrganizationSelectionPage],
      providers: [
        { provide: TenantContextStore, useValue: tenantStore },
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: authService },
      ],
    });

    fixture = TestBed.createComponent(OrganizationSelectionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
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

  it('keeps a failed selection recoverable without showing the false empty state', async () => {
    tenantState = 'ERROR';
    tenantStore.isActiveTenantReady.mockReturnValue(false);
    tenantStore.candidateOrganizationId.mockReturnValue('organization-b');
    component.organizationControl.setValue('organization-b');

    component.selectOrganization();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('No fue posible activar la organizacion seleccionada.');
    expect(text).toContain('Reintentar');
    expect(text).toContain('Organization B');
    expect(text).toContain('Cerrar sesion');
    expect(text).not.toContain('No tienes una organizacion activa disponible.');
    expect(fixture.nativeElement.querySelector('mat-select')).not.toBeNull();

    component.retrySelection();
    await fixture.whenStable();
    expect(tenantStore.selectOrganization).toHaveBeenNthCalledWith(2, 'organization-b');

    component.organizationControl.setValue('organization-a');
    component.selectOrganization();
    await fixture.whenStable();
    expect(tenantStore.selectOrganization).toHaveBeenNthCalledWith(3, 'organization-a');

    component.logout();
    expect(authService.logout).toHaveBeenCalledOnce();
    expect(router.navigate).toHaveBeenLastCalledWith(['/login']);
  });

  it('navigates as soon as tenant selection completes without claiming preference success', async () => {
    component.organizationControl.setValue('organization-b');
    tenantStore.preferredOrganizationId.mockReturnValue('organization-a');

    component.selectOrganization();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledWith(['/dashboard'], { replaceUrl: true });
    expect(fixture.nativeElement.textContent).not.toContain(
      'Se selecciono tu organizacion preferida.',
    );
  });

  it('surfaces a navigation failure after canonical tenant selection succeeds', async () => {
    component.organizationControl.setValue('organization-b');
    router.navigate.mockResolvedValueOnce(false);

    component.selectOrganization();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.errorMessage()).toContain('no fue posible abrir el panel');
    expect(component.isSubmitting()).toBe(false);
  });

  it('shows the empty state only for NO_ACTIVE_TENANT', () => {
    tenantState = 'NO_ACTIVE_TENANT';
    memberships = [];

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'No tienes una organizacion activa disponible.',
    );
  });
});
