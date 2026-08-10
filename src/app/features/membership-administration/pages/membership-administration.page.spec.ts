import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of, Subject } from 'rxjs';
import { signal } from '@angular/core';

import { TenantContextStore } from '../../../core/tenant-context/tenant-context.store';
import { MembershipListItem } from '../models/membership.models';
import { MembershipsService } from '../services/memberships.service';
import { MembershipAdministrationPage } from './membership-administration.page';

describe('MembershipAdministrationPage', () => {
  let fixture: ComponentFixture<MembershipAdministrationPage>;
  let component: MembershipAdministrationPage;
  let currentLoad: Subject<MembershipListItem[]>;
  let dialogClosed: Subject<unknown>;
  let scope: { organizationId: string | null; generation: number };
  let canLeaveCapability: boolean;
  let capabilities: ReturnType<typeof signal<string[]>>;
  let tenantStore: {
    selectedOrganizationId: ReturnType<typeof vi.fn>;
    switchGeneration: ReturnType<typeof vi.fn>;
    hasCapability: ReturnType<typeof vi.fn>;
    capabilities: ReturnType<typeof vi.fn>;
    snapshot: ReturnType<typeof vi.fn>;
    refreshContext: ReturnType<typeof vi.fn>;
    resetTenantState: ReturnType<typeof vi.fn>;
  };
  let membershipsService: {
    list: ReturnType<typeof vi.fn>;
    changeRole: ReturnType<typeof vi.fn>;
    changeStatus: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    leave: ReturnType<typeof vi.fn>;
  };
  let dialog: { open: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    currentLoad = new Subject<MembershipListItem[]>();
    dialogClosed = new Subject<unknown>();
    scope = { organizationId: 'organization-a', generation: 1 };
    canLeaveCapability = false;
    tenantStore = {
      selectedOrganizationId: vi.fn(() => scope.organizationId),
      switchGeneration: vi.fn(() => scope.generation),
      hasCapability: vi.fn(
        (capability: string) =>
          capability === 'membership.read' ||
          (capability === 'membership.leave' && canLeaveCapability),
      ),
      capabilities: vi.fn(() => capabilities()),
      snapshot: vi.fn(() => ({
        membership: { id: 'membership-a' },
        organization: { id: 'organization-a', displayName: 'Consultorio Rivera' },
      })),
      refreshContext: vi.fn(() => Promise.resolve()),
      resetTenantState: vi.fn(),
    };
    membershipsService = {
      list: vi.fn(() => currentLoad.asObservable()),
      changeRole: vi.fn(() => of(createMutationResponse())),
      changeStatus: vi.fn(() => of(createMutationResponse())),
      remove: vi.fn(() => of(createMutationResponse({ status: 'REVOKED' }))),
      leave: vi.fn(() => of(createMutationResponse({ status: 'REVOKED' }))),
    };
    dialog = { open: vi.fn(() => ({ afterClosed: () => dialogClosed.asObservable() })) };
    capabilities = signal<string[]>([]);

    await TestBed.configureTestingModule({
      imports: [MembershipAdministrationPage],
      providers: [
        { provide: TenantContextStore, useValue: tenantStore },
        { provide: MembershipsService, useValue: membershipsService },
        { provide: MatDialog, useValue: dialog },
      ],
    }).compileComponents();
    TestBed.overrideProvider(MatDialog, { useValue: dialog });

    fixture = TestBed.createComponent(MembershipAdministrationPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('projects displayName and email and renders only backend allowed actions', () => {
    const membership = createMembership({ allowedActions: ['CHANGE_ROLE'] });
    currentLoad.next([membership]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ana Admin');
    expect(fixture.nativeElement.textContent).toContain('ana@example.com');
    expect(fixture.nativeElement.textContent).toContain('Cambiar rol');
    expect(fixture.nativeElement.textContent).not.toContain('Suspender');
    expect(fixture.nativeElement.textContent).not.toContain('Revocar');
  });

  it('removes technical server-authority copy from the user-facing directory', () => {
    currentLoad.next([createMembership()]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain(
      'Las acciones disponibles en cada fila provienen del servidor.',
    );
    expect(fixture.nativeElement.textContent).toContain('Directorio de miembros');
  });

  it('derives the membership overview from the canonical loaded list', () => {
    currentLoad.next([
      createMembership(),
      createMembership({
        id: 'membership-b',
        userId: 'user-b',
        status: 'SUSPENDED',
        allowedActions: ['REACTIVATE'],
      }),
    ]);
    fixture.detectChanges();

    const summaryValues = Array.from<HTMLElement>(
      fixture.nativeElement.querySelectorAll('.membership-admin-summary dd'),
    ).map((element) => element.textContent.trim());
    expect(summaryValues).toEqual(['2', '1', '1']);
  });

  it('moves only backend-allowed secondary actions into the contextual menu', async () => {
    const membership = createMembership({ allowedActions: ['SUSPEND', 'REMOVE'] });
    currentLoad.next([membership]);
    fixture.detectChanges();

    const trigger = fixture.nativeElement.querySelector(
      '.membership-admin-more-actions',
    ) as HTMLButtonElement;
    expect(trigger).not.toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Suspender');
    trigger.click();
    await fixture.whenStable();
    fixture.detectChanges();

    const overlayText = document.body.textContent ?? '';
    expect(overlayText).toContain('Suspender');
    expect(overlayText).toContain('Revocar acceso');
    expect(overlayText).not.toContain('Reactivar');
  });

  it('exposes no forbidden row actions for an owner without allowedActions', () => {
    currentLoad.next([
      createMembership({ role: 'OWNER', allowedActions: [], displayName: 'Olivia Owner' }),
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.membership-admin-more-actions')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Cambiar rol');
  });

  it('renders joined dates with Spanish-friendly month names', () => {
    currentLoad.next([
      createMembership({ joinedAt: '2026-01-15T12:00:00.000Z', allowedActions: [] }),
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.toLocaleLowerCase('es-MX')).toContain('ene');
    expect(fixture.nativeElement.textContent).not.toContain('Jan');
  });

  it('captures the observed row version when confirming a role change', () => {
    const membership = createMembership({ allowedActions: ['CHANGE_ROLE'] });
    currentLoad.next([membership]);

    component.openRoleDialog(membership);
    dialogClosed.next({ role: 'PSYCHOLOGIST', expectedUpdatedAt: membership.updatedAt });

    expect(membershipsService.changeRole).toHaveBeenCalledWith('organization-a', 'membership-a', {
      role: 'PSYCHOLOGIST',
      expectedUpdatedAt: '2026-08-08T12:00:00.000Z',
    });
  });

  it('refetches canonical data after a concurrent update without retrying the stale mutation', () => {
    const membership = createMembership({ allowedActions: ['REMOVE'] });
    const pendingMutation = new Subject<ReturnType<typeof createMutationResponse>>();
    membershipsService.remove.mockReturnValue(pendingMutation.asObservable());
    currentLoad.next([membership]);

    component.openActionConfirmation(membership, 'REMOVE');
    dialogClosed.next(true);
    pendingMutation.error(
      new HttpErrorResponse({ status: 409, error: { code: 'CONCURRENT_UPDATE' } }),
    );

    expect(membershipsService.remove).toHaveBeenCalledOnce();
    expect(membershipsService.list).toHaveBeenCalledTimes(2);
    expect(component.errorMessage()).toContain('cambió mientras trabajabas');
  });

  it('rejects a late organization A list response after switching to organization B', () => {
    const membership = createMembership();
    scope = { organizationId: 'organization-b', generation: 2 };
    currentLoad.next([membership]);

    expect(component.memberships()).toEqual([]);
    expect(component.viewState()).toBe('loading');
  });

  it('shows safe last-owner protection without parsing backend message text', () => {
    const membership = createMembership({ allowedActions: ['REMOVE'] });
    const pendingMutation = new Subject<ReturnType<typeof createMutationResponse>>();
    membershipsService.remove.mockReturnValue(pendingMutation.asObservable());
    currentLoad.next([membership]);

    component.openActionConfirmation(membership, 'REMOVE');
    dialogClosed.next(true);
    pendingMutation.error(
      new HttpErrorResponse({
        status: 409,
        error: { code: 'LAST_OWNER_PROTECTED', message: 'backend text is not displayed' },
      }),
    );

    expect(component.errorMessage()).toContain('conservar al menos un propietario activo');
    expect(component.errorMessage()).not.toContain('backend text');
  });

  it('recovers tenant context after a stable TENANT_CONTEXT_REQUIRED mutation error', () => {
    const membership = createMembership({ allowedActions: ['REMOVE'] });
    const pendingMutation = new Subject<ReturnType<typeof createMutationResponse>>();
    membershipsService.remove.mockReturnValue(pendingMutation.asObservable());
    currentLoad.next([membership]);

    component.openActionConfirmation(membership, 'REMOVE');
    dialogClosed.next(true);
    pendingMutation.error(
      new HttpErrorResponse({ status: 409, error: { code: 'TENANT_CONTEXT_REQUIRED' } }),
    );

    expect(tenantStore.refreshContext).toHaveBeenCalledOnce();
    expect(component.contextWarning()).toContain('necesita actualizarse');
  });

  it('does not apply a pending organization A mutation result after switching to B', () => {
    const membership = createMembership({ allowedActions: ['REMOVE'] });
    const pendingMutation = new Subject<ReturnType<typeof createMutationResponse>>();
    membershipsService.remove.mockReturnValue(pendingMutation.asObservable());
    currentLoad.next([membership]);

    component.openActionConfirmation(membership, 'REMOVE');
    dialogClosed.next(true);
    scope = { organizationId: 'organization-b', generation: 2 };
    pendingMutation.next(createMutationResponse({ status: 'REVOKED' }));

    expect(membershipsService.list).toHaveBeenCalledOnce();
    expect(component.isMutating()).toBe(false);
    expect(component.memberships()).toEqual([membership]);
  });

  it('shows self-leave only from membership.leave and the canonical current membership', () => {
    const membership = createMembership();
    currentLoad.next([membership]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Salir de la organización');

    canLeaveCapability = true;
    capabilities.set(['membership.leave']);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Salir de la organización');
  });

  it('sends the current membership version for leave and invalidates after canonical refresh', async () => {
    const membership = createMembership();
    const pendingLeave = new Subject<ReturnType<typeof createMutationResponse>>();
    membershipsService.leave.mockReturnValue(pendingLeave.asObservable());
    canLeaveCapability = true;
    capabilities.set(['membership.leave']);
    currentLoad.next([membership]);

    component.openActionConfirmation(membership, 'LEAVE');
    dialogClosed.next(true);
    pendingLeave.next(createMutationResponse({ status: 'REVOKED' }));
    await Promise.resolve();

    expect(membershipsService.leave).toHaveBeenCalledWith('organization-a', {
      expectedUpdatedAt: membership.updatedAt,
    });
    expect(tenantStore.refreshContext).toHaveBeenCalledOnce();
    expect(tenantStore.resetTenantState).toHaveBeenCalledWith('membership-left', 2);
  });

  it('preserves every canonical membership when self-leave fails', () => {
    const currentMembership = createMembership();
    const otherMembership = createMembership({
      id: 'membership-b',
      userId: 'user-b',
      displayName: 'Bruno Psychologist',
      email: 'bruno@example.com',
    });
    const pendingLeave = new Subject<ReturnType<typeof createMutationResponse>>();
    membershipsService.leave.mockReturnValue(pendingLeave.asObservable());
    canLeaveCapability = true;
    capabilities.set(['membership.leave']);
    currentLoad.next([currentMembership, otherMembership]);

    component.openActionConfirmation(currentMembership, 'LEAVE');
    dialogClosed.next(true);
    pendingLeave.error(
      new HttpErrorResponse({ status: 409, error: { code: 'LAST_OWNER_PROTECTED' } }),
    );

    expect(component.memberships()).toEqual([currentMembership, otherMembership]);
    expect(component.viewState()).toBe('loaded');
    expect(component.isMutating()).toBe(false);
  });

  it('keeps successful mutation feedback visible during canonical reconciliation', () => {
    const membership = createMembership({ allowedActions: ['REMOVE'] });
    const pendingLoad = new Subject<MembershipListItem[]>();
    membershipsService.list.mockReturnValueOnce(of([membership])).mockReturnValueOnce(pendingLoad);
    currentLoad.next([membership]);

    component.openActionConfirmation(membership, 'REMOVE');
    dialogClosed.next(true);

    expect(component.successMessage()).toContain('revocada');
    pendingLoad.next([createMembership({ status: 'REVOKED', allowedActions: [] })]);
    expect(component.successMessage()).toContain('revocada');
  });
});

function createMembership(overrides: Partial<MembershipListItem> = {}): MembershipListItem {
  return {
    id: 'membership-a',
    userId: 'user-a',
    displayName: 'Ana Admin',
    email: 'ana@example.com',
    role: 'ADMIN',
    status: 'ACTIVE',
    joinedAt: '2026-01-01T00:00:00.000Z',
    suspendedAt: null,
    revokedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-08-08T12:00:00.000Z',
    allowedActions: ['CHANGE_ROLE', 'SUSPEND', 'REMOVE'],
    ...overrides,
  };
}

function createMutationResponse(
  overrides: Partial<{
    role: MembershipListItem['role'];
    status: MembershipListItem['status'];
  }> = {},
) {
  return {
    id: 'membership-a',
    userId: 'user-a',
    role: overrides.role ?? 'ADMIN',
    status: overrides.status ?? 'ACTIVE',
    updatedAt: '2026-08-08T12:01:00.000Z',
  };
}
