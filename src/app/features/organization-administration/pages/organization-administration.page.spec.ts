import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of, Subject } from 'rxjs';

import { TenantContextStore } from '../../../core/tenant-context/tenant-context.store';
import { OrganizationDetails } from '../models/organization.models';
import { OrganizationsService } from '../services/organizations.service';
import { OrganizationAdministrationPage } from './organization-administration.page';

describe('OrganizationAdministrationPage', () => {
  let fixture: ComponentFixture<OrganizationAdministrationPage>;
  let component: OrganizationAdministrationPage;
  let currentLoad: Subject<OrganizationDetails>;
  let dialogClosed: Subject<boolean | undefined>;
  let scope: { organizationId: string | null; generation: number; contextVersion: number };
  let canManage: boolean;
  let organizationsService: {
    getCurrent: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    changeStatus: ReturnType<typeof vi.fn>;
  };
  let tenantStore: {
    selectedOrganizationId: ReturnType<typeof vi.fn>;
    switchGeneration: ReturnType<typeof vi.fn>;
    contextVersion: ReturnType<typeof vi.fn>;
    hasCapability: ReturnType<typeof vi.fn>;
    revalidateOperationalContext: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };
  let dialog: { open: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    currentLoad = new Subject<OrganizationDetails>();
    dialogClosed = new Subject<boolean | undefined>();
    scope = { organizationId: 'organization-a', generation: 1, contextVersion: 1 };
    canManage = true;
    organizationsService = {
      getCurrent: vi.fn(() => currentLoad.asObservable()),
      update: vi.fn(),
      changeStatus: vi.fn(),
    };
    tenantStore = {
      selectedOrganizationId: vi.fn(() => scope.organizationId),
      switchGeneration: vi.fn(() => scope.generation),
      contextVersion: vi.fn(() => scope.contextVersion),
      hasCapability: vi.fn(
        (capability: string) =>
          capability === 'organization.read' || (capability === 'organization.manage' && canManage),
      ),
      revalidateOperationalContext: vi.fn(() => Promise.resolve()),
      error: vi.fn(() => null),
    };
    dialog = {
      open: vi.fn(() => ({ afterClosed: () => dialogClosed.asObservable() })),
    };

    TestBed.configureTestingModule({
      imports: [OrganizationAdministrationPage],
      providers: [
        { provide: OrganizationsService, useValue: organizationsService },
        { provide: TenantContextStore, useValue: tenantStore },
        { provide: MatDialog, useValue: dialog },
      ],
    });
    TestBed.overrideProvider(MatDialog, { useValue: dialog });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(OrganizationAdministrationPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('renders loading, active, and suspended states from canonical responses', () => {
    expect(fixture.nativeElement.textContent).toContain('Cargando organización');

    currentLoad.next(createOrganization());
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Practice A');
    expect(fixture.nativeElement.textContent).toContain('Activa');

    component.organization.set(createOrganization({ status: 'SUSPENDED' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('La organización está suspendida');
    expect(fixture.nativeElement.textContent).toContain('Reactivar organización');
  });

  it('renders a recoverable error and retries without presenting an empty state', () => {
    currentLoad.error(new HttpErrorResponse({ status: 500 }));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No fue posible cargar la organización');

    const retryLoad = new Subject<OrganizationDetails>();
    organizationsService.getCurrent.mockReturnValue(retryLoad.asObservable());
    component.loadOrganization();
    retryLoad.next(createOrganization());
    fixture.detectChanges();

    expect(organizationsService.getCurrent).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('Practice A');
  });

  it('shows the backend forbidden state independently from capability projection', () => {
    currentLoad.error(new HttpErrorResponse({ status: 403 }));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Acceso no autorizado');
  });

  it('keeps management actions hidden when organization.manage is absent', () => {
    canManage = false;
    currentLoad.next(createOrganization());
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Tienes acceso de consulta');
    expect(fixture.nativeElement.textContent).not.toContain('Guardar cambios');
    expect(fixture.nativeElement.textContent).not.toContain('Suspender organización');

    component.save();
    component.openStatusConfirmation();
    expect(organizationsService.update).not.toHaveBeenCalled();
    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('validates the certified DTO constraints before submitting', () => {
    currentLoad.next(createOrganization());
    component.form.controls.slug.setValue('Invalid Slug');

    component.save();

    expect(component.form.controls.slug.touched).toBe(true);
    expect(component.errorMessage()).toContain('Revisa los campos');
    expect(organizationsService.update).not.toHaveBeenCalled();
  });

  it('applies the canonical update response and refreshes tenant context', async () => {
    currentLoad.next(createOrganization());
    component.form.controls.displayName.setValue('Local draft');
    organizationsService.update.mockReturnValue(
      of(createOrganization({ displayName: 'Canonical server name' })),
    );

    component.save();
    await Promise.resolve();

    expect(organizationsService.update).toHaveBeenCalledWith('organization-a', {
      displayName: 'Local draft',
    });
    expect(component.organization()?.displayName).toBe('Canonical server name');
    expect(component.form.controls.displayName.value).toBe('Canonical server name');
    expect(tenantStore.revalidateOperationalContext).toHaveBeenCalledWith(1, 'organization-a', 1);
  });

  it('prevents duplicate and competing mutations while an update is pending', () => {
    currentLoad.next(createOrganization());
    component.form.controls.displayName.setValue('Pending change');
    const update = new Subject<OrganizationDetails>();
    organizationsService.update.mockReturnValue(update.asObservable());

    component.save();
    component.save();
    component.openStatusConfirmation();

    expect(organizationsService.update).toHaveBeenCalledOnce();
    expect(dialog.open).not.toHaveBeenCalled();
  });

  it.each([
    [500, 'No fue posible guardar'],
    [403, 'El servidor rechazó esta acción'],
    [409, 'cambió mientras trabajabas'],
  ])('keeps update failure %i visible and recoverable', (status, message) => {
    currentLoad.next(createOrganization());
    component.form.controls.displayName.setValue('Changed');
    const update = new Subject<OrganizationDetails>();
    organizationsService.update.mockReturnValue(update.asObservable());

    component.save();
    if (status === 403) {
      scope.contextVersion = 2;
    }
    update.error(new HttpErrorResponse({ status }));

    expect(component.isSaving()).toBe(false);
    expect(component.errorMessage()).toContain(message);
    expect(component.organization()?.displayName).toBe('Practice A');
  });

  it('cancels suspension without issuing a lifecycle request', () => {
    currentLoad.next(createOrganization());

    component.openStatusConfirmation();
    dialogClosed.next(false);

    expect(organizationsService.changeStatus).not.toHaveBeenCalled();
  });

  it('suspends after confirmation, adopts the canonical response, and refreshes context', async () => {
    currentLoad.next(createOrganization());
    organizationsService.changeStatus.mockReturnValue(
      of(createOrganization({ status: 'SUSPENDED' })),
    );

    component.openStatusConfirmation();
    dialogClosed.next(true);
    await Promise.resolve();

    expect(organizationsService.changeStatus).toHaveBeenCalledWith('organization-a', {
      status: 'SUSPENDED',
    });
    expect(component.organization()?.status).toBe('SUSPENDED');
    expect(tenantStore.revalidateOperationalContext).toHaveBeenCalledWith(1, 'organization-a', 1);
  });

  it('reactivates a suspended organization only through the server operation', () => {
    currentLoad.next(createOrganization({ status: 'SUSPENDED' }));
    organizationsService.changeStatus.mockReturnValue(of(createOrganization()));

    component.openStatusConfirmation();
    dialogClosed.next(true);

    expect(organizationsService.changeStatus).toHaveBeenCalledWith('organization-a', {
      status: 'ACTIVE',
    });
    expect(component.organization()?.status).toBe('ACTIVE');
  });

  it('keeps a lifecycle failure visible without changing local status', () => {
    currentLoad.next(createOrganization());
    const statusChange = new Subject<OrganizationDetails>();
    organizationsService.changeStatus.mockReturnValue(statusChange.asObservable());

    component.openStatusConfirmation();
    dialogClosed.next(true);
    statusChange.error(new HttpErrorResponse({ status: 500 }));

    expect(component.organization()?.status).toBe('ACTIVE');
    expect(component.errorMessage()).toContain('No fue posible cambiar el estado');
  });

  it('discards an out-of-order organization A response after switching to B', () => {
    scope = { organizationId: 'organization-b', generation: 2, contextVersion: 0 };

    currentLoad.next(createOrganization({ displayName: 'Stale A' }));

    expect(component.organization()).toBeNull();
    expect(component.viewState()).toBe('loading');
  });

  it('does not let a pending update from A mutate B after a tenant switch', () => {
    currentLoad.next(createOrganization());
    component.form.controls.displayName.setValue('Draft A');
    const update = new Subject<OrganizationDetails>();
    organizationsService.update.mockReturnValue(update.asObservable());
    component.save();

    scope = { organizationId: 'organization-b', generation: 2, contextVersion: 0 };
    update.next(createOrganization({ displayName: 'Late A' }));

    expect(component.organization()?.displayName).toBe('Practice A');
    expect(tenantStore.revalidateOperationalContext).not.toHaveBeenCalled();
  });
});

function createOrganization(overrides: Partial<OrganizationDetails> = {}): OrganizationDetails {
  return {
    id: 'organization-a',
    slug: 'practice-a',
    legalName: 'Practice A, S.C.',
    displayName: 'Practice A',
    status: 'ACTIVE',
    timezone: 'America/Hermosillo',
    locale: 'es-MX',
    currency: 'MXN',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    ...overrides,
  };
}
