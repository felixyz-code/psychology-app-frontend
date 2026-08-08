import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AuthStore } from '../auth/auth.store';
import { TenantContextService } from './tenant-context.service';
import {
  AuthContextResponseV1,
  AuthContextPreferenceResponse,
  SelectableMembership,
  TENANT_CAPABILITIES,
  TenantCapability,
  TenantContextError,
  TenantContextState,
} from './tenant-context.models';

const SELECTED_ORGANIZATION_KEY = 'psychology_app_selected_organization_id';

const VALID_STATUSES = new Set([
  'ACTIVE_TENANT_READY',
  'AMBIGUOUS_SELECTION',
  'NO_ACTIVE_TENANT',
  'ADMIN_SUSPENDED_CONTEXT',
]);

@Injectable({ providedIn: 'root' })
export class TenantContextStore {
  private readonly authStore = inject(AuthStore);
  private readonly contextService = inject(TenantContextService);

  private readonly stateSignal = signal<TenantContextState>('UNINITIALIZED');
  private readonly candidateOrganizationIdSignal = signal<string | null>(null);
  private readonly selectedOrganizationIdSignal = signal<string | null>(null);
  private readonly contextVersionSignal = signal(0);
  private readonly switchGenerationSignal = signal(0);
  private readonly snapshotSignal = signal<AuthContextResponseV1 | null>(null);
  private readonly selectableMembershipsSignal = signal<SelectableMembership[]>([]);
  private readonly preferredOrganizationIdSignal = signal<string | null>(null);
  private readonly preferredPersistenceStateSignal = signal<'IDLE' | 'SAVING' | 'SAVED' | 'ERROR'>(
    'IDLE',
  );
  private readonly preferredPersistenceErrorSignal = signal<TenantContextError | null>(null);
  private readonly errorSignal = signal<TenantContextError | null>(null);
  private pendingLoad: Promise<void> | null = null;
  private pendingPreferencePersistence: Promise<void> | null = null;
  private requestSequence = 0;
  private preferenceRequestSequence = 0;
  private identityId: string | null = null;

  readonly state = computed(() => this.stateSignal());
  readonly candidateOrganizationId = computed(() => this.candidateOrganizationIdSignal());
  readonly selectedOrganizationId = computed(() => this.selectedOrganizationIdSignal());
  readonly contextVersion = computed(() => this.contextVersionSignal());
  readonly switchGeneration = computed(() => this.switchGenerationSignal());
  readonly snapshot = computed(() => this.snapshotSignal());
  readonly error = computed(() => this.errorSignal());
  readonly capabilities = computed(() => this.snapshotSignal()?.capabilities ?? []);
  readonly selectableMemberships = computed(() => this.selectableMembershipsSignal());
  readonly preferredOrganizationId = computed(() => this.preferredOrganizationIdSignal());
  readonly preferredPersistenceState = computed(() => this.preferredPersistenceStateSignal());
  readonly preferredPersistenceError = computed(() => this.preferredPersistenceErrorSignal());
  readonly isLoading = computed(
    () => this.stateSignal() === 'LOADING' || this.stateSignal() === 'SWITCHING',
  );
  readonly isActiveTenantReady = computed(() => this.stateSignal() === 'ACTIVE_TENANT_READY');
  readonly isAdminSuspendedContext = computed(
    () => this.stateSignal() === 'ADMIN_SUSPENDED_CONTEXT',
  );

  constructor() {
    this.authStore.sessionChanges.subscribe((user) => {
      if (!user) {
        this.identityId = null;
        this.resetTenantState('logout', this.switchGenerationSignal() + 1);
        return;
      }

      void this.startForIdentity(user.id);
    });
  }

  bootstrap(): Promise<void> {
    const user = this.authStore.user();

    if (!user) {
      this.identityId = null;
      this.resetTenantState('anonymous-bootstrap', this.switchGenerationSignal());
      return Promise.resolve();
    }

    if (this.identityId !== user.id) {
      this.identityId = user.id;
      this.resetTenantState('identity-bootstrap', this.switchGenerationSignal() + 1);
    }

    if (this.stateSignal() !== 'UNINITIALIZED') {
      return this.pendingLoad ?? Promise.resolve();
    }

    return this.loadContext(
      'initial',
      this.readPersistedOrganizationId(),
      this.switchGenerationSignal(),
    );
  }

  startForIdentity(userId: string): Promise<void> {
    if (this.identityId === userId && this.stateSignal() !== 'UNINITIALIZED') {
      return this.pendingLoad ?? Promise.resolve();
    }

    this.identityId = userId;
    this.resetTenantState('identity-change', this.switchGenerationSignal() + 1);
    return this.loadContext(
      'initial',
      this.readPersistedOrganizationId(),
      this.switchGenerationSignal(),
    );
  }

  refreshContext(): Promise<void> {
    if (!this.authStore.isAuthenticated()) {
      this.resetTenantState('refresh-without-identity');
      return Promise.resolve();
    }

    const generation = this.switchGenerationSignal();
    this.stateSignal.set('LOADING');
    this.errorSignal.set(null);

    return this.loadContext('refresh', this.selectedOrganizationIdSignal(), generation);
  }

  switchTenant(organizationId: string): Promise<void> {
    if (!organizationId.trim()) {
      throw new Error('Organization selection is required');
    }

    const generation = this.switchGenerationSignal() + 1;
    this.switchGenerationSignal.set(generation);
    this.candidateOrganizationIdSignal.set(organizationId);
    this.selectedOrganizationIdSignal.set(null);
    this.snapshotSignal.set(null);
    this.errorSignal.set(null);
    this.preferredPersistenceStateSignal.set('IDLE');
    this.preferredPersistenceErrorSignal.set(null);
    this.removePersistedOrganizationId();
    this.stateSignal.set('SWITCHING');

    return this.loadContext('switch', organizationId, generation);
  }

  async selectOrganization(organizationId: string): Promise<void> {
    await this.switchTenant(organizationId);

    if (
      this.selectedOrganizationId() !== organizationId ||
      (!this.isActiveTenantReady() && !this.isAdminSuspendedContext())
    ) {
      return;
    }

    if (this.preferredOrganizationIdSignal() !== organizationId) {
      this.persistPreferredOrganization(organizationId, this.switchGenerationSignal());
    }
  }

  resetTenantState(reason: string, generation?: number): void {
    const hasTenantState =
      this.stateSignal() !== 'UNINITIALIZED' ||
      this.candidateOrganizationIdSignal() !== null ||
      this.selectedOrganizationIdSignal() !== null ||
      this.snapshotSignal() !== null ||
      this.errorSignal() !== null;
    const nextGeneration =
      generation ??
      (hasTenantState ? this.switchGenerationSignal() + 1 : this.switchGenerationSignal());

    this.switchGenerationSignal.set(nextGeneration);
    this.candidateOrganizationIdSignal.set(null);
    this.selectedOrganizationIdSignal.set(null);
    this.contextVersionSignal.set(0);
    this.snapshotSignal.set(null);
    this.selectableMembershipsSignal.set([]);
    this.preferredOrganizationIdSignal.set(null);
    this.preferredPersistenceStateSignal.set('IDLE');
    this.preferredPersistenceErrorSignal.set(null);
    this.errorSignal.set(null);
    this.stateSignal.set('UNINITIALIZED');
    this.removePersistedOrganizationId();

    if (reason === 'logout' || reason === 'access-loss') {
      this.identityId = null;
    }
  }

  hasCapability(capability: TenantCapability | string): boolean {
    return this.capabilities().includes(capability);
  }

  private loadContext(
    origin: 'initial' | 'refresh' | 'switch',
    organizationId: string | null,
    generation: number,
  ): Promise<void> {
    const requestSequence = ++this.requestSequence;

    if (origin === 'initial') {
      this.stateSignal.set('LOADING');
    }
    this.errorSignal.set(null);

    const request = firstValueFrom(this.contextService.getContext(organizationId))
      .then((response) => {
        if (
          generation !== this.switchGenerationSignal() ||
          requestSequence !== this.requestSequence
        ) {
          return;
        }

        if (!isValidContextResponse(response, this.authStore.user()?.id ?? null, organizationId)) {
          this.errorSignal.set({
            statusCode: 0,
            code: 'UNEXPECTED_ERROR',
            message: 'The tenant context response is invalid.',
            requestId: null,
            details: null,
          });
          this.stateSignal.set('ERROR');
          return;
        }

        this.applySnapshot(response);

        if (
          origin === 'initial' &&
          response.status === 'AMBIGUOUS_SELECTION' &&
          response.preferredOrganizationId
        ) {
          return this.switchTenant(response.preferredOrganizationId);
        }

        return undefined;
      })
      .catch((error: unknown) => {
        if (
          generation !== this.switchGenerationSignal() ||
          requestSequence !== this.requestSequence
        ) {
          return;
        }

        const normalized = normalizeError(error);
        this.errorSignal.set(normalized);

        if (normalized.statusCode === 403) {
          this.resetTenantState('access-loss', this.switchGenerationSignal() + 1);
          this.stateSignal.set('FORBIDDEN');
          return;
        }

        if (normalized.statusCode === 401) {
          this.resetTenantState('access-loss', this.switchGenerationSignal() + 1);
          this.stateSignal.set('FORBIDDEN');
          return;
        }

        this.stateSignal.set('ERROR');
      });

    this.pendingLoad = request;
    void request.finally(() => {
      if (this.pendingLoad === request) {
        this.pendingLoad = null;
      }
    });

    return request;
  }

  private applySnapshot(response: AuthContextResponseV1): void {
    this.snapshotSignal.set(response);
    this.selectableMembershipsSignal.set(response.selectableMemberships);
    this.preferredOrganizationIdSignal.set(response.preferredOrganizationId);
    this.contextVersionSignal.update((version) => version + 1);
    this.errorSignal.set(null);
    this.stateSignal.set(response.status);

    if (
      response.status === 'ACTIVE_TENANT_READY' ||
      response.status === 'ADMIN_SUSPENDED_CONTEXT'
    ) {
      const organizationId = response.tenantContext?.organizationId ?? null;
      this.selectedOrganizationIdSignal.set(organizationId);
      this.candidateOrganizationIdSignal.set(null);

      if (organizationId) {
        sessionStorage.setItem(SELECTED_ORGANIZATION_KEY, organizationId);
      }
      return;
    }

    this.selectedOrganizationIdSignal.set(null);
    if (response.status !== 'AMBIGUOUS_SELECTION') {
      this.candidateOrganizationIdSignal.set(null);
      this.removePersistedOrganizationId();
    }
  }

  private persistPreferredOrganization(organizationId: string, generation: number): void {
    const requestSequence = ++this.preferenceRequestSequence;
    this.preferredPersistenceStateSignal.set('SAVING');
    this.preferredPersistenceErrorSignal.set(null);

    const request = firstValueFrom(this.contextService.updatePreferredOrganization(organizationId))
      .then((response) => {
        if (
          generation !== this.switchGenerationSignal() ||
          requestSequence !== this.preferenceRequestSequence
        ) {
          return;
        }

        if (!isValidPreferenceResponse(response)) {
          this.preferredPersistenceStateSignal.set('ERROR');
          this.preferredPersistenceErrorSignal.set({
            statusCode: 0,
            code: 'UNEXPECTED_ERROR',
            message: 'The preferred organization response is invalid.',
            requestId: null,
            details: null,
          });
          return;
        }

        this.preferredOrganizationIdSignal.set(response.preferredOrganizationId);
        this.snapshotSignal.update((snapshot) =>
          snapshot
            ? { ...snapshot, preferredOrganizationId: response.preferredOrganizationId }
            : snapshot,
        );
        this.preferredPersistenceStateSignal.set('SAVED');
      })
      .catch((error: unknown) => {
        if (
          generation !== this.switchGenerationSignal() ||
          requestSequence !== this.preferenceRequestSequence
        ) {
          return;
        }

        this.preferredPersistenceStateSignal.set('ERROR');
        this.preferredPersistenceErrorSignal.set(normalizeError(error));
      });

    this.pendingPreferencePersistence = request;
    void request.finally(() => {
      if (this.pendingPreferencePersistence === request) {
        this.pendingPreferencePersistence = null;
      }
    });
  }

  private readPersistedOrganizationId(): string | null {
    const persisted = sessionStorage.getItem(SELECTED_ORGANIZATION_KEY);
    return persisted?.trim() || null;
  }

  private removePersistedOrganizationId(): void {
    sessionStorage.removeItem(SELECTED_ORGANIZATION_KEY);
  }
}

function isValidPreferenceResponse(response: unknown): response is AuthContextPreferenceResponse {
  return (
    isRecord(response) &&
    hasOwn(response, 'preferredOrganizationId') &&
    (response['preferredOrganizationId'] === null ||
      isNonEmptyString(response['preferredOrganizationId']))
  );
}

function isValidContextResponse(
  response: unknown,
  expectedUserId: string | null,
  expectedOrganizationId: string | null,
): response is AuthContextResponseV1 {
  if (!isRecord(response)) {
    return false;
  }

  const capabilities = response['capabilities'];
  const selectableMemberships = response['selectableMemberships'];

  if (
    !hasOwn(response, 'schemaVersion') ||
    response['schemaVersion'] !== 1 ||
    !hasOwn(response, 'status') ||
    typeof response['status'] !== 'string' ||
    !VALID_STATUSES.has(response['status']) ||
    !hasOwn(response, 'tenantContext') ||
    !hasOwn(response, 'organization') ||
    !hasOwn(response, 'membership') ||
    !Array.isArray(capabilities) ||
    !capabilities.every((value) => typeof value === 'string') ||
    !isSortedUniqueCapabilities(capabilities) ||
    !Array.isArray(selectableMemberships) ||
    !selectableMemberships.every(isSelectableMembership) ||
    !hasOwn(response, 'preferredOrganizationId') ||
    (response['preferredOrganizationId'] !== null &&
      !isNonEmptyString(response['preferredOrganizationId']))
  ) {
    return false;
  }

  if (
    response['preferredOrganizationId'] !== null &&
    !selectableMemberships.some(
      (membership) => membership.organizationId === response['preferredOrganizationId'],
    )
  ) {
    return false;
  }

  const resolved =
    response['status'] === 'ACTIVE_TENANT_READY' ||
    response['status'] === 'ADMIN_SUSPENDED_CONTEXT';

  if (resolved) {
    return (
      isTenantContext(response['tenantContext']) &&
      isOrganization(response['organization']) &&
      isMembership(response['membership']) &&
      isResolvedContextCoherent(response, expectedUserId, expectedOrganizationId)
    );
  }

  return (
    response['tenantContext'] === null &&
    response['organization'] === null &&
    response['membership'] === null &&
    capabilities.length === 0 &&
    (response['status'] !== 'AMBIGUOUS_SELECTION' || selectableMemberships.length > 0)
  );
}

function isResolvedContextCoherent(
  response: Record<string, unknown>,
  expectedUserId: string | null,
  expectedOrganizationId: string | null,
): boolean {
  const tenantContext = response['tenantContext'] as Record<string, unknown>;
  const organization = response['organization'] as Record<string, unknown>;
  const membership = response['membership'] as Record<string, unknown>;

  if (
    expectedUserId === null ||
    tenantContext['userId'] !== expectedUserId ||
    membership['userId'] !== expectedUserId ||
    tenantContext['userId'] !== membership['userId'] ||
    tenantContext['organizationId'] !== organization['id'] ||
    tenantContext['membershipId'] !== membership['id'] ||
    tenantContext['organizationRole'] !== membership['role'] ||
    membership['isCurrentUser'] !== true ||
    (expectedOrganizationId !== null && tenantContext['organizationId'] !== expectedOrganizationId)
  ) {
    return false;
  }

  const expectedOrganizationStatus =
    response['status'] === 'ADMIN_SUSPENDED_CONTEXT' ? 'SUSPENDED' : 'ACTIVE';

  if (organization['status'] !== expectedOrganizationStatus) {
    return false;
  }

  if (
    response['status'] === 'ADMIN_SUSPENDED_CONTEXT' &&
    (response['capabilities'] as string[]).some(
      (capability) => !ADMIN_SUSPENDED_CAPABILITIES.has(capability as TenantCapability),
    )
  ) {
    return false;
  }

  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isTenantContext(value: unknown): boolean {
  return (
    isRecord(value) &&
    isNonEmptyString(value['userId']) &&
    isNonEmptyString(value['organizationId']) &&
    isNonEmptyString(value['membershipId']) &&
    ['OWNER', 'ADMIN', 'PSYCHOLOGIST', 'RECEPTIONIST', 'BILLING', 'AUDITOR', 'READ_ONLY'].includes(
      String(value['organizationRole']),
    ) &&
    ['EXPLICIT', 'SINGLE_MEMBERSHIP'].includes(String(value['resolutionMode']))
  );
}

function isOrganization(value: unknown): boolean {
  return (
    isRecord(value) &&
    isNonEmptyString(value['id']) &&
    typeof value['displayName'] === 'string' &&
    ['ACTIVE', 'SUSPENDED'].includes(String(value['status']))
  );
}

function isMembership(value: unknown): boolean {
  return (
    isRecord(value) &&
    isNonEmptyString(value['id']) &&
    isNonEmptyString(value['userId']) &&
    (value['displayName'] === null || typeof value['displayName'] === 'string') &&
    isNonEmptyString(value['email']) &&
    ['OWNER', 'ADMIN', 'PSYCHOLOGIST', 'RECEPTIONIST', 'BILLING', 'AUDITOR', 'READ_ONLY'].includes(
      String(value['role']),
    ) &&
    value['status'] === 'ACTIVE' &&
    isNonEmptyString(value['createdAt']) &&
    isNonEmptyString(value['updatedAt']) &&
    typeof value['isCurrentUser'] === 'boolean'
  );
}

function isSelectableMembership(value: unknown): boolean {
  return (
    isRecord(value) &&
    isNonEmptyString(value['membershipId']) &&
    isNonEmptyString(value['organizationId']) &&
    typeof value['organizationDisplayName'] === 'string' &&
    ['OWNER', 'ADMIN', 'PSYCHOLOGIST', 'RECEPTIONIST', 'BILLING', 'AUDITOR', 'READ_ONLY'].includes(
      String(value['organizationRole']),
    )
  );
}

function isSortedUniqueCapabilities(capabilities: string[]): boolean {
  const previous = new Set<string>();
  let last = '';

  for (const capability of capabilities) {
    if (
      !TENANT_CAPABILITIES.includes(capability as TenantCapability) ||
      previous.has(capability) ||
      capability < last
    ) {
      return false;
    }

    previous.add(capability);
    last = capability;
  }

  return true;
}

const ADMIN_SUSPENDED_CAPABILITIES = new Set<TenantCapability>([
  'invitation.create',
  'invitation.read',
  'invitation.resend',
  'invitation.revoke',
  'membership.leave',
  'membership.manage_role',
  'membership.read',
  'membership.reactivate',
  'membership.remove',
  'membership.suspend',
  'organization.manage',
  'organization.read',
  'ownership.transfer',
]);

function normalizeError(error: unknown): TenantContextError {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as Partial<TenantContextError> | null;

    return {
      statusCode: error.status,
      code: typeof body?.code === 'string' ? body.code : 'UNEXPECTED_ERROR',
      message:
        typeof body?.message === 'string' ? body.message : 'The tenant context request failed.',
      requestId: typeof body?.requestId === 'string' ? body.requestId : null,
      details: body?.details ?? null,
    };
  }

  return {
    statusCode: 0,
    code: 'NETWORK_OFFLINE',
    message: 'The tenant context request could not be completed.',
    requestId: null,
    details: { offline: true },
  };
}
