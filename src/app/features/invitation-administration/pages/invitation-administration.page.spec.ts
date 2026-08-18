import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of, Subject } from 'rxjs';
import { TenantContextStore } from '../../../core/tenant-context/tenant-context.store';
import { InvitationListItem } from '../models/invitation.models';
import { InvitationsService } from '../services/invitations.service';
import { InvitationAdministrationPage } from './invitation-administration.page';

describe('InvitationAdministrationPage', () => {
  let fixture: ComponentFixture<InvitationAdministrationPage>;
  let component: InvitationAdministrationPage;
  let currentLoad: Subject<InvitationListItem[]>;
  let dialogClosed: Subject<unknown>;
  let dialog: { open: ReturnType<typeof vi.fn> };
  let scope: { organizationId: string | null; generation: number; active: boolean };
  let activeTenantReady: ReturnType<typeof signal<boolean>>;
  let capabilities: ReturnType<typeof signal<string[]>>;
  let synchronizationPending: ReturnType<typeof signal<boolean>>;
  let service: {
    list: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    revoke: ReturnType<typeof vi.fn>;
    resend: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    currentLoad = new Subject<InvitationListItem[]>();
    dialogClosed = new Subject<unknown>();
    scope = { organizationId: 'organization-a', generation: 1, active: true };
    activeTenantReady = signal(true);
    synchronizationPending = signal(false);
    capabilities = signal([
      'invitation.read',
      'invitation.create',
      'invitation.revoke',
      'invitation.resend',
    ]);
    service = {
      list: vi.fn(() => currentLoad.asObservable()),
      create: vi.fn(() => of(undefined)),
      revoke: vi.fn(() => of(undefined)),
      resend: vi.fn(() => of(undefined)),
    };
    const tenantStore = {
      selectedOrganizationId: vi.fn(() => scope.organizationId),
      switchGeneration: vi.fn(() => scope.generation),
      isActiveTenantReady: vi.fn(() => activeTenantReady()),
      isCanonicalContextSynchronizationPending: vi.fn(() => synchronizationPending()),
      hasCapability: vi.fn((capability: string) => capabilities().includes(capability)),
      snapshot: vi.fn(() => ({
        organization: { id: 'organization-a', displayName: 'Consultorio Rivera' },
      })),
      refreshContext: vi.fn(() => Promise.resolve()),
    };
    dialog = { open: vi.fn(() => ({ afterClosed: () => dialogClosed.asObservable() })) };
    await TestBed.configureTestingModule({
      imports: [InvitationAdministrationPage],
      providers: [
        { provide: TenantContextStore, useValue: tenantStore },
        { provide: InvitationsService, useValue: service },
        { provide: MatDialog, useValue: dialog },
      ],
    }).compileComponents();
    TestBed.overrideProvider(MatDialog, { useValue: dialog });
    fixture = TestBed.createComponent(InvitationAdministrationPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders loading, empty and recoverable error states', () => {
    expect(fixture.nativeElement.textContent).toContain('Cargando invitaciones');
    currentLoad.next([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No hay invitaciones');
  });

  it('offers a recoverable error state when loading fails', () => {
    currentLoad.error(new HttpErrorResponse({ status: 503 }));
    fixture.detectChanges();
    expect(component.viewState()).toBe('error');
    expect(fixture.nativeElement.textContent).toContain('No fue posible cargar las invitaciones');
    expect(fixture.nativeElement.textContent).toContain('Reintentar');
  });

  it('renders all lifecycle statuses and a long-email wrapping structure', () => {
    currentLoad.next([
      invitation({ id: '1', logicalStatus: 'PENDING' }),
      invitation({ id: '2', logicalStatus: 'ACCEPTED', acceptedAt: '2026-08-10T01:00:00Z' }),
      invitation({ id: '3', logicalStatus: 'REJECTED', rejectedAt: '2026-08-10T01:00:00Z' }),
      invitation({ id: '4', logicalStatus: 'REVOKED', revokedAt: '2026-08-10T01:00:00Z' }),
      invitation({
        id: '5',
        email: `${'very-long.'.repeat(15)}person@example.com`,
        logicalStatus: 'EXPIRED',
        expiredAt: '2026-08-10T01:00:00Z',
      }),
    ]);
    fixture.detectChanges();
    for (const label of ['Pendiente', 'Aceptada', 'Rechazada', 'Revocada', 'Expirada'])
      expect(fixture.nativeElement.textContent).toContain(label);
    expect(fixture.nativeElement.querySelectorAll('.invitation-admin-email').length).toBe(5);
  });

  it('derives effective expiration without mutating the server row', () => {
    const row = invitation({ logicalStatus: 'PENDING', expiresAt: '2026-08-10T00:00:00Z' });
    component.now.set(new Date('2026-08-10T00:00:01Z').getTime());
    expect(component.effectiveStatus(row)).toBe('EXPIRED');
    expect(row.logicalStatus).toBe('PENDING');
  });

  it('uses capabilities for OWNER actions and hides them from create-only ADMIN UX', () => {
    const row = invitation();
    expect(component.canRevoke(row)).toBe(true);
    expect(component.canResend(row)).toBe(true);
    capabilities.set(['invitation.read', 'invitation.create']);
    expect(component.canRevoke(row)).toBe(false);
    expect(component.canResend(row)).toBe(false);
  });

  it('allows revoke only for pending and resend only for pending or expired', () => {
    expect(component.canRevoke(invitation({ logicalStatus: 'PENDING' }))).toBe(true);
    expect(component.canRevoke(invitation({ logicalStatus: 'ACCEPTED' }))).toBe(false);
    expect(component.canResend(invitation({ logicalStatus: 'EXPIRED' }))).toBe(true);
    for (const status of ['ACCEPTED', 'REJECTED', 'REVOKED'] as const)
      expect(component.canResend(invitation({ logicalStatus: status }))).toBe(false);
  });

  it('creates once and refreshes the canonical list instead of appending the response', () => {
    currentLoad.next([]);
    component.openCreateDialog();
    dialogClosed.next({ email: 'new@example.com', role: 'ADMIN' });
    expect(service.create).toHaveBeenCalledTimes(1);
    expect(service.list).toHaveBeenCalledTimes(2);
    expect(component.invitations()).toEqual([]);
  });

  it('reactively clears invitation data and fails closed when read capability is lost', () => {
    currentLoad.next([invitation({ email: 'visible@example.com' })]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('visible@example.com');

    capabilities.set(['invitation.create', 'invitation.revoke', 'invitation.resend']);
    fixture.detectChanges();

    expect(component.invitations()).toEqual([]);
    expect(component.viewState()).toBe('forbidden');
    expect(fixture.nativeElement.textContent).not.toContain('visible@example.com');
    component.openCreateDialog();
    expect(dialog.open).not.toHaveBeenCalled();
    expect(service.create).not.toHaveBeenCalled();
  });

  it('fails closed during canonical synchronization and reloads after it settles', () => {
    currentLoad.next([invitation({ email: 'visible@example.com' })]);
    synchronizationPending.set(true);
    fixture.detectChanges();
    expect(component.viewState()).toBe('forbidden');
    expect(component.invitations()).toEqual([]);

    synchronizationPending.set(false);
    fixture.detectChanges();
    expect(component.viewState()).toBe('loading');
    expect(service.list).toHaveBeenCalledTimes(2);
  });

  it.each(['invitation.create', 'invitation.read'])(
    'does not create after %s is lost while the dialog is open',
    (capability) => {
      currentLoad.next([]);
      component.openCreateDialog();
      capabilities.update((values) => values.filter((value) => value !== capability));
      fixture.detectChanges();
      dialogClosed.next({ email: 'new@example.com', role: 'ADMIN' });
      expect(service.create).not.toHaveBeenCalled();
    },
  );

  it('confirms revoke and refreshes after success', () => {
    const row = invitation();
    currentLoad.next([row]);
    component.openConfirmation(row, 'REVOKE');
    dialogClosed.next(true);
    expect(service.revoke).toHaveBeenCalledWith('organization-a', row.id);
    expect(service.list).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['REVOKE', 'invitation.revoke'],
    ['RESEND', 'invitation.resend'],
  ] as const)(
    'does not execute %s after its capability is lost in the dialog',
    (action, capability) => {
      const row = invitation();
      currentLoad.next([row]);
      component.openConfirmation(row, action);
      capabilities.update((values) => values.filter((value) => value !== capability));
      dialogClosed.next(true);
      expect(action === 'REVOKE' ? service.revoke : service.resend).not.toHaveBeenCalled();
    },
  );

  it('rechecks local status eligibility after confirmation closes', () => {
    const row = invitation();
    currentLoad.next([row]);
    component.openConfirmation(row, 'REVOKE');
    component.invitations.set([invitation({ id: row.id, logicalStatus: 'ACCEPTED' })]);
    dialogClosed.next(true);
    expect(service.revoke).not.toHaveBeenCalled();
  });

  it.each([404, 409])('refreshes canonical state after revoke status %s', (status) => {
    const mutation = new Subject<void>();
    service.revoke.mockReturnValue(mutation.asObservable());
    const row = invitation();
    currentLoad.next([row]);
    component.openConfirmation(row, 'REVOKE');
    dialogClosed.next(true);
    mutation.error(
      new HttpErrorResponse({
        status,
        error: { code: status === 409 ? 'CONCURRENT_UPDATE' : 'RESOURCE_NOT_FOUND' },
      }),
    );
    expect(service.revoke).toHaveBeenCalledTimes(1);
    expect(service.list).toHaveBeenCalledTimes(2);
  });

  it('refreshes after resend success and treats the response as a replacement', () => {
    const row = invitation();
    currentLoad.next([row]);
    component.openConfirmation(row, 'RESEND');
    dialogClosed.next(true);
    expect(service.resend).toHaveBeenCalledWith('organization-a', row.id);
    expect(service.list).toHaveBeenCalledTimes(2);
    expect(component.invitations()).toEqual([row]);
  });

  it('refreshes after create conflict without parsing backend messages', () => {
    const mutation = new Subject<void>();
    service.create.mockReturnValue(mutation.asObservable());
    currentLoad.next([]);
    component.openCreateDialog();
    dialogClosed.next({ email: 'new@example.com', role: 'ADMIN' });
    mutation.error(
      new HttpErrorResponse({ status: 409, error: { code: 'CONFLICT', message: 'arbitrary' } }),
    );
    expect(service.list).toHaveBeenCalledTimes(2);
    expect(component.errorMessage()).toContain('lista canónica');
  });

  it('locks create until an uncertain outcome finishes canonical reconciliation', () => {
    const mutation = new Subject<void>();
    service.create.mockReturnValue(mutation.asObservable());
    currentLoad.next([]);
    component.openCreateDialog();
    dialogClosed.next({ email: 'new@example.com', role: 'ADMIN' });
    mutation.error(new HttpErrorResponse({ status: 0 }));

    expect(component.viewState()).toBe('loading');
    expect(component.interactionLocked()).toBe(true);
    component.openCreateDialog();
    component['createInvitation'](
      { organizationId: 'organization-a', generation: 1 },
      { email: 'second@example.com', role: 'ADMIN' },
    );
    expect(dialog.open).toHaveBeenCalledTimes(1);
    expect(service.create).toHaveBeenCalledTimes(1);

    currentLoad.next([]);
    expect(component.viewState()).toBe('empty');
    expect(component.interactionLocked()).toBe(false);
    component.openCreateDialog();
    expect(dialog.open).toHaveBeenCalledTimes(2);
  });

  it('refreshes an uncertain resend and never retries the old invitation id', () => {
    const mutation = new Subject<void>();
    service.resend.mockReturnValue(mutation.asObservable());
    const row = invitation();
    currentLoad.next([row]);
    component.openConfirmation(row, 'RESEND');
    dialogClosed.next(true);
    mutation.error(new HttpErrorResponse({ status: 0 }));
    expect(service.resend).toHaveBeenCalledTimes(1);
    expect(service.list).toHaveBeenCalledTimes(2);
    expect(component.errorMessage()).toContain('no se reintentó automáticamente');
  });

  it('ignores stale A responses across A to B to C switches', () => {
    scope = { organizationId: 'organization-b', generation: 2, active: true };
    scope = { organizationId: 'organization-c', generation: 3, active: true };
    currentLoad.next([invitation({ email: 'tenant-a@example.com' })]);
    expect(component.invitations()).toEqual([]);
  });

  it('ignores stale mutation completion after a tenant switch', () => {
    const mutation = new Subject<void>();
    service.revoke.mockReturnValue(mutation.asObservable());
    const row = invitation();
    currentLoad.next([row]);
    component.openConfirmation(row, 'REVOKE');
    dialogClosed.next(true);
    scope = { organizationId: 'organization-b', generation: 2, active: true };
    mutation.next();
    mutation.complete();
    expect(service.list).toHaveBeenCalledTimes(1);
    expect(component.successMessage()).toBe('');
  });

  it('fails closed when the organization is suspended', () => {
    activeTenantReady.set(false);
    fixture.detectChanges();
    expect(component.viewState()).toBe('forbidden');
    expect(component.invitations()).toEqual([]);
  });
});

function invitation(overrides: Partial<InvitationListItem> = {}): InvitationListItem {
  return {
    id: 'invitation-a',
    email: 'ana@example.com',
    role: 'ADMIN',
    logicalStatus: 'PENDING',
    expiresAt: '2099-08-12T00:00:00.000Z',
    acceptedAt: null,
    rejectedAt: null,
    revokedAt: null,
    expiredAt: null,
    createdAt: '2026-08-10T00:00:00.000Z',
    updatedAt: '2026-08-10T00:00:00.000Z',
    ...overrides,
  };
}
