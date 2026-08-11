import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of, Subject, throwError } from 'rxjs';
import { signal } from '@angular/core';

import { TenantContextStore } from '../../../core/tenant-context/tenant-context.store';
import { TenantAuthorityChangeService } from '../../../core/tenant-context/tenant-authority-change.service';
import {
  TenantAuthorityReconciled,
  TenantStateInvalidationCoordinator,
} from '../../../core/tenant-context/tenant-state-invalidation.coordinator';
import { MembershipListItem } from '../models/membership.models';
import { MembershipsService } from '../services/memberships.service';
import { MembershipAdministrationPage } from './membership-administration.page';

describe('MembershipAdministrationPage', () => {
  let fixture: ComponentFixture<MembershipAdministrationPage>;
  let component: MembershipAdministrationPage;
  let currentLoad: Subject<MembershipListItem[]>;
  let dialogClosed: Subject<unknown>;
  let scope: { organizationId: string | null; generation: number };
  let contextVersion: number;
  let actorRole: 'OWNER' | 'ADMIN';
  let ownershipTransferCapability: boolean;
  let activeTenantReady: boolean;
  let canLeaveCapability: boolean;
  let capabilities: ReturnType<typeof signal<string[]>>;
  let tenantStore: {
    selectedOrganizationId: ReturnType<typeof vi.fn>;
    switchGeneration: ReturnType<typeof vi.fn>;
    hasCapability: ReturnType<typeof vi.fn>;
    isActiveTenantReady: ReturnType<typeof vi.fn>;
    isCanonicalContextSynchronizationPending: ReturnType<typeof vi.fn>;
    contextVersion: ReturnType<typeof vi.fn>;
    capabilities: ReturnType<typeof vi.fn>;
    snapshot: ReturnType<typeof vi.fn>;
    refreshContext: ReturnType<typeof vi.fn>;
    synchronizeCanonicalContext: ReturnType<typeof vi.fn>;
    resetTenantState: ReturnType<typeof vi.fn>;
  };
  let membershipsService: {
    list: ReturnType<typeof vi.fn>;
    changeRole: ReturnType<typeof vi.fn>;
    changeStatus: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    leave: ReturnType<typeof vi.fn>;
    transferOwnership: ReturnType<typeof vi.fn>;
  };
  let dialog: { open: ReturnType<typeof vi.fn> };
  let authorityChange: { emitOwnershipTransferred: ReturnType<typeof vi.fn> };
  let authorityReconciled: Subject<TenantAuthorityReconciled>;

  beforeEach(async () => {
    currentLoad = new Subject<MembershipListItem[]>();
    dialogClosed = new Subject<unknown>();
    scope = { organizationId: 'organization-a', generation: 1 };
    canLeaveCapability = false;
    contextVersion = 1;
    actorRole = 'ADMIN';
    ownershipTransferCapability = false;
    activeTenantReady = true;
    tenantStore = {
      selectedOrganizationId: vi.fn(() => scope.organizationId),
      switchGeneration: vi.fn(() => scope.generation),
      hasCapability: vi.fn(
        (capability: string) =>
          capability === 'membership.read' ||
          (capability === 'membership.leave' && canLeaveCapability) ||
          (capability === 'ownership.transfer' && ownershipTransferCapability),
      ),
      isActiveTenantReady: vi.fn(() => activeTenantReady),
      isCanonicalContextSynchronizationPending: vi.fn(() => false),
      contextVersion: vi.fn(() => contextVersion),
      capabilities: vi.fn(() => capabilities()),
      snapshot: vi.fn(() => ({
        membership: {
          id: 'membership-a',
          userId: 'user-a',
          role: actorRole,
          status: 'ACTIVE',
        },
        organization: { id: 'organization-a', displayName: 'Consultorio Rivera' },
      })),
      refreshContext: vi.fn(() => Promise.resolve()),
      synchronizeCanonicalContext: vi.fn(() => Promise.resolve('synchronized')),
      resetTenantState: vi.fn(),
    };
    membershipsService = {
      list: vi.fn(() => currentLoad.asObservable()),
      changeRole: vi.fn(() => of(createMutationResponse())),
      changeStatus: vi.fn(() => of(createMutationResponse())),
      remove: vi.fn(() => of(createMutationResponse({ status: 'REVOKED' }))),
      leave: vi.fn(() => of(createMutationResponse({ status: 'REVOKED' }))),
      transferOwnership: vi.fn(() => of(createOwnershipTransferResponse())),
    };
    dialog = { open: vi.fn(() => ({ afterClosed: () => dialogClosed.asObservable() })) };
    authorityChange = { emitOwnershipTransferred: vi.fn() };
    authorityReconciled = new Subject<TenantAuthorityReconciled>();
    capabilities = signal<string[]>([]);

    await TestBed.configureTestingModule({
      imports: [MembershipAdministrationPage],
      providers: [
        { provide: TenantContextStore, useValue: tenantStore },
        { provide: MembershipsService, useValue: membershipsService },
        { provide: TenantAuthorityChangeService, useValue: authorityChange },
        {
          provide: TenantStateInvalidationCoordinator,
          useValue: { authorityReconciled: authorityReconciled.asObservable() },
        },
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

    const triggers = fixture.nativeElement.querySelectorAll(
      '.membership-admin-more-actions',
    ) as NodeListOf<HTMLButtonElement>;
    const trigger = triggers[triggers.length - 1];
    component.setActionMenuMembership(membership);
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

  it('shows ownership transfer only for an eligible non-owner target', async () => {
    actorRole = 'OWNER';
    ownershipTransferCapability = true;
    const target = createTargetMembership();
    currentLoad.next([createMembership({ role: 'OWNER' }), target]);
    fixture.detectChanges();

    expect(component.isOwnershipTransferEligible(target)).toBe(true);
    const triggers = fixture.nativeElement.querySelectorAll(
      '.membership-admin-more-actions',
    ) as NodeListOf<HTMLButtonElement>;
    const trigger = triggers[triggers.length - 1];
    component.setActionMenuMembership(target);
    trigger.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(document.body.textContent).toContain('Transferir propiedad');
    expect(component.isOwnershipTransferEligible(createMembership())).toBe(false);
  });

  it('completes ownership transfer through POST, V1 reconciliation and canonical reload', async () => {
    actorRole = 'OWNER';
    ownershipTransferCapability = true;
    const source = createMembership({ role: 'OWNER' });
    const target = createTargetMembership();
    const updatedSource = createMembership({ role: 'ADMIN', allowedActions: [] });
    const updatedTarget = createTargetMembership({ role: 'OWNER', allowedActions: [] });
    currentLoad.next([source, target]);
    membershipsService.list.mockReturnValueOnce(of([updatedSource, updatedTarget]));
    membershipsService.transferOwnership.mockReturnValueOnce(
      of(createOwnershipTransferResponse('membership-target', 'user-target')),
    );
    tenantStore.synchronizeCanonicalContext.mockImplementation(() => {
      actorRole = 'ADMIN';
      ownershipTransferCapability = false;
      capabilities.set(['membership.read']);
      return Promise.resolve('synchronized');
    });

    component.openOwnershipTransferDialog(target);
    dialogClosed.next(true);
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();

    expect(membershipsService.transferOwnership).toHaveBeenCalledOnce();
    expect(membershipsService.transferOwnership).toHaveBeenCalledWith(
      'organization-a',
      'membership-target',
    );
    expect(authorityChange.emitOwnershipTransferred).toHaveBeenCalledOnce();
    expect(tenantStore.synchronizeCanonicalContext).toHaveBeenCalledWith(1, 'organization-a', true);
    expect(membershipsService.list).toHaveBeenCalledTimes(2);
    expect(component.memberships()).toEqual([updatedSource, updatedTarget]);
    expect(component.viewState()).toBe('loaded');
    expect(component.tenantContextStore.selectedOrganizationId()).toBe('organization-a');
    expect(component.tenantContextStore.hasCapability('ownership.transfer')).toBe(false);
    expect(component.isMutating()).toBe(false);
    expect(component.successMessage()).toContain('propiedad se transfirió');
    expect(component.errorMessage()).not.toContain('No fue posible cargar los miembros');
    expect(component.ownershipReconciliationPending()).toBe(false);
    expect(component.isOwnershipTransferEligible(updatedTarget)).toBe(false);
  });

  it('preserves empty state when a successful membership reload completes', async () => {
    actorRole = 'OWNER';
    ownershipTransferCapability = true;
    const target = createTargetMembership();
    currentLoad.next([createMembership({ role: 'OWNER' }), target]);
    membershipsService.transferOwnership.mockReturnValueOnce(
      of(createOwnershipTransferResponse('membership-target', 'user-target')),
    );
    membershipsService.list.mockReturnValueOnce(of([]));

    component.openOwnershipTransferDialog(target);
    dialogClosed.next(true);

    await vi.waitFor(() => expect(component.isMutating()).toBe(false));

    expect(component.memberships()).toEqual([]);
    expect(component.viewState()).toBe('empty');
    expect(component.errorMessage()).not.toContain('No fue posible cargar los miembros');
    expect(component.ownershipReconciliationPending()).toBe(false);
  });

  it('rejects targets that are current, same-user, owner or non-active', () => {
    actorRole = 'OWNER';
    ownershipTransferCapability = true;
    currentLoad.next([createMembership({ role: 'OWNER' })]);

    expect(component.isOwnershipTransferEligible(createMembership({ role: 'OWNER' }))).toBe(false);
    expect(
      component.isOwnershipTransferEligible(
        createTargetMembership({ id: 'membership-other', userId: 'user-a' }),
      ),
    ).toBe(false);
    expect(component.isOwnershipTransferEligible(createTargetMembership({ role: 'OWNER' }))).toBe(
      false,
    );
    expect(
      component.isOwnershipTransferEligible(createTargetMembership({ status: 'SUSPENDED' })),
    ).toBe(false);
    expect(
      component.isOwnershipTransferEligible(createTargetMembership({ status: 'INVITED' })),
    ).toBe(false);
    expect(
      component.isOwnershipTransferEligible(createTargetMembership({ status: 'REVOKED' })),
    ).toBe(false);
  });

  it('fails closed when admin authority, capability or active tenant state is lost after opening', () => {
    actorRole = 'OWNER';
    ownershipTransferCapability = true;
    const target = createTargetMembership();
    currentLoad.next([createMembership({ role: 'OWNER' }), target]);

    component.openOwnershipTransferDialog(target);
    actorRole = 'ADMIN';
    ownershipTransferCapability = false;
    activeTenantReady = false;
    dialogClosed.next(true);

    expect(membershipsService.transferOwnership).not.toHaveBeenCalled();
  });

  it('cannot post when an admin directly invokes the imperative transfer path', () => {
    const transfer = component as unknown as {
      transferOwnership: (scope: {
        organizationId: string;
        generation: number;
        contextVersion: number;
        actorMembershipId: string;
        actorUserId: string;
        targetMembershipId: string;
        targetUserId: string;
      }) => void;
    };

    transfer.transferOwnership({
      organizationId: 'organization-a',
      generation: 1,
      contextVersion: 1,
      actorMembershipId: 'membership-a',
      actorUserId: 'user-a',
      targetMembershipId: 'membership-target',
      targetUserId: 'user-target',
    });

    expect(membershipsService.transferOwnership).not.toHaveBeenCalled();
  });

  it('discards a dialog confirmation after a tenant switch and never posts', () => {
    actorRole = 'OWNER';
    ownershipTransferCapability = true;
    const target = createTargetMembership();
    currentLoad.next([createMembership({ role: 'OWNER' }), target]);

    component.openOwnershipTransferDialog(target);
    scope = { organizationId: 'organization-b', generation: 2 };
    dialogClosed.next(true);

    expect(membershipsService.transferOwnership).not.toHaveBeenCalled();
  });

  it('revalidates current state when only contextVersion changes', () => {
    actorRole = 'OWNER';
    ownershipTransferCapability = true;
    const target = createTargetMembership();
    currentLoad.next([createMembership({ role: 'OWNER' }), target]);
    component.openOwnershipTransferDialog(target);
    contextVersion = 2;
    dialogClosed.next(true);

    expect(membershipsService.transferOwnership).toHaveBeenCalledOnce();
  });

  it('does not retry a conflict and reconciles before making transfer available again', async () => {
    actorRole = 'OWNER';
    ownershipTransferCapability = true;
    const target = createTargetMembership();
    const pendingTransfer = new Subject<ReturnType<typeof createOwnershipTransferResponse>>();
    currentLoad.next([createMembership({ role: 'OWNER' }), target]);
    membershipsService.transferOwnership.mockReturnValueOnce(pendingTransfer.asObservable());
    membershipsService.list.mockReturnValueOnce(of([createMembership({ role: 'OWNER' }), target]));

    component.openOwnershipTransferDialog(target);
    dialogClosed.next(true);
    pendingTransfer.error(new HttpErrorResponse({ status: 409 }));
    await new Promise((resolve) => setTimeout(resolve));

    expect(membershipsService.transferOwnership).toHaveBeenCalledOnce();
    expect(tenantStore.synchronizeCanonicalContext).toHaveBeenCalledWith(1, 'organization-a', true);
    expect(membershipsService.list).toHaveBeenCalledTimes(2);
  });

  it('releases ownership locks when the transfer observable completes without an emission', () => {
    actorRole = 'OWNER';
    ownershipTransferCapability = true;
    const target = createTargetMembership();
    const pendingTransfer = new Subject<ReturnType<typeof createOwnershipTransferResponse>>();
    currentLoad.next([createMembership({ role: 'OWNER' }), target]);
    membershipsService.transferOwnership.mockReturnValueOnce(pendingTransfer.asObservable());

    component.openOwnershipTransferDialog(target);
    dialogClosed.next(true);
    pendingTransfer.complete();

    expect(component.isMutating()).toBe(false);
    expect(component.ownershipReconciliationPending()).toBe(false);
    expect(tenantStore.synchronizeCanonicalContext).not.toHaveBeenCalled();
    expect(component.successMessage()).toBe('');
    expect(component.errorMessage()).toBe('');
  });

  it('keeps the lock through normal next-then-complete while reconciliation is pending', async () => {
    actorRole = 'OWNER';
    ownershipTransferCapability = true;
    const target = createTargetMembership();
    const pendingTransfer = new Subject<ReturnType<typeof createOwnershipTransferResponse>>();
    const pendingReload = new Subject<MembershipListItem[]>();
    let resolveSynchronization!: (result: 'synchronized') => void;
    const synchronization = new Promise<'synchronized'>((resolve) => {
      resolveSynchronization = resolve;
    });
    currentLoad.next([createMembership({ role: 'OWNER' }), target]);
    membershipsService.transferOwnership.mockReturnValueOnce(pendingTransfer.asObservable());
    membershipsService.list.mockReturnValueOnce(pendingReload.asObservable());
    tenantStore.synchronizeCanonicalContext.mockReturnValueOnce(synchronization);

    component.openOwnershipTransferDialog(target);
    dialogClosed.next(true);
    pendingTransfer.next(createOwnershipTransferResponse('membership-target', 'user-target'));
    pendingTransfer.complete();
    await Promise.resolve();

    expect(component.isMutating()).toBe(true);
    expect(component.ownershipReconciliationPending()).toBe(true);

    resolveSynchronization('synchronized');
    await vi.waitFor(() => expect(membershipsService.list).toHaveBeenCalledTimes(2));
    pendingReload.next([createTargetMembership({ role: 'OWNER', allowedActions: [] })]);
    await vi.waitFor(() => expect(component.isMutating()).toBe(false));
  });

  it('settles a membership reload that completes without an emission', async () => {
    actorRole = 'OWNER';
    ownershipTransferCapability = true;
    const target = createTargetMembership();
    const pendingReload = new Subject<MembershipListItem[]>();
    currentLoad.next([createMembership({ role: 'OWNER' }), target]);
    membershipsService.transferOwnership.mockReturnValueOnce(
      of(createOwnershipTransferResponse('membership-target', 'user-target')),
    );
    membershipsService.list.mockReturnValueOnce(pendingReload.asObservable());

    component.openOwnershipTransferDialog(target);
    dialogClosed.next(true);
    await vi.waitFor(() => expect(membershipsService.list).toHaveBeenCalledTimes(2));
    pendingReload.complete();

    await vi.waitFor(() => expect(component.isMutating()).toBe(false));
    expect(component.ownershipReconciliationPending()).toBe(false);
    expect(component.successMessage()).toBe('');
  });

  it('shows a refresh warning instead of all-clear success when membership reload fails', async () => {
    actorRole = 'OWNER';
    ownershipTransferCapability = true;
    const target = createTargetMembership();
    currentLoad.next([createMembership({ role: 'OWNER' }), target]);
    membershipsService.transferOwnership.mockReturnValueOnce(
      of(createOwnershipTransferResponse('membership-target', 'user-target')),
    );
    membershipsService.list.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    component.openOwnershipTransferDialog(target);
    dialogClosed.next(true);

    await vi.waitFor(() =>
      expect(component.errorMessage()).toContain('actualizar la lista de miembros'),
    );
    expect(component.successMessage()).not.toContain('lista de miembros');
    expect(component.isMutating()).toBe(false);
    expect(component.ownershipReconciliationPending()).toBe(false);
    expect(membershipsService.transferOwnership).toHaveBeenCalledOnce();
  });

  it('does not let a stale operation token unlock the active operation', () => {
    actorRole = 'OWNER';
    ownershipTransferCapability = true;
    const target = createTargetMembership();
    const pendingTransfer = new Subject<ReturnType<typeof createOwnershipTransferResponse>>();
    currentLoad.next([createMembership({ role: 'OWNER' }), target]);
    membershipsService.transferOwnership.mockReturnValueOnce(pendingTransfer.asObservable());

    component.openOwnershipTransferDialog(target);
    dialogClosed.next(true);

    const internal = component as unknown as {
      activeOwnershipOperationId: number | null;
      finishOwnershipTransfer: (operationId: number, publishFeedback: boolean) => void;
    };
    const activeOperationId = internal.activeOwnershipOperationId;
    internal.activeOwnershipOperationId = (activeOperationId ?? 0) + 1;
    internal.finishOwnershipTransfer(activeOperationId ?? 0, false);

    expect(component.isMutating()).toBe(true);
    expect(component.ownershipReconciliationPending()).toBe(true);
  });

  it('reloads receiving-tab membership rows only for the current reconciled scope', () => {
    const updatedTarget = createTargetMembership({ role: 'OWNER', allowedActions: [] });
    currentLoad.next([createMembership({ role: 'OWNER' }), createTargetMembership()]);
    membershipsService.list.mockReturnValueOnce(of([createMembership({ role: 'ADMIN' }), updatedTarget]));

    authorityReconciled.next({ organizationId: 'organization-a', generation: 1 });

    expect(membershipsService.list).toHaveBeenCalledTimes(2);
    expect(component.memberships()).toEqual([createMembership({ role: 'ADMIN' }), updatedTarget]);

    authorityReconciled.next({ organizationId: 'organization-b', generation: 2 });
    expect(membershipsService.list).toHaveBeenCalledTimes(2);
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

function createTargetMembership(overrides: Partial<MembershipListItem> = {}): MembershipListItem {
  return createMembership({
    id: 'membership-target',
    userId: 'user-target',
    displayName: 'Target Admin',
    email: 'target@example.com',
    role: 'ADMIN',
    allowedActions: [],
    ...overrides,
  });
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

function createOwnershipTransferResponse(
  targetMembershipId = 'membership-b',
  targetUserId = 'user-b',
) {
  return {
    organizationId: 'organization-a',
    sourceMembership: {
      id: 'membership-a',
      userId: 'user-a',
      role: 'ADMIN' as const,
      status: 'ACTIVE' as const,
    },
    targetMembership: {
      id: targetMembershipId,
      userId: targetUserId,
      role: 'OWNER' as const,
      status: 'ACTIVE' as const,
    },
    transferredAt: '2026-08-10T12:00:00.000Z',
  };
}
