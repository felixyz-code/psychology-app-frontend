import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs';

import { TenantContextStore } from '../../../core/tenant-context/tenant-context.store';
import { OrganizationConfigurationStore } from '../../../core/organization-configuration/organization-configuration.store';
import { OrganizationLogoStore } from '../../../core/organization-logo/organization-logo.store';
import {
  canonicalOrganizationBrandColor,
  isSafeOrganizationBrandColor,
} from '../../../core/organization-configuration/organization-brand-color';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SectionCardComponent } from '../../../shared/components/section-card/section-card.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { OrganizationColorPickerComponent } from '../components/organization-color-picker/organization-color-picker.component';
import { OrganizationLogoDropzoneComponent } from '../components/organization-logo-dropzone/organization-logo-dropzone.component';
import {
  OrganizationLogoRemoveConfirmDialogComponent,
  OrganizationLogoRemoveConfirmDialogData,
} from '../components/organization-logo-remove-confirm-dialog.component';
import {
  OrganizationStatusConfirmDialogComponent,
  OrganizationStatusConfirmDialogData,
} from '../components/organization-status-confirm-dialog.component';
import { PresentOrganizationLogoResponse } from '../models/organization-logo.models';
import {
  OrganizationDetails,
  OrganizationStatus,
  UpdateOrganizationDto,
} from '../models/organization.models';
import { OrganizationsService } from '../services/organizations.service';

type ViewState = 'loading' | 'loaded' | 'forbidden' | 'not-found' | 'error';

interface RequestScope {
  organizationId: string;
  generation: number;
}

@Component({
  selector: 'app-organization-administration-page',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    PageHeaderComponent,
    SectionCardComponent,
    StatusBadgeComponent,
    OrganizationColorPickerComponent,
    OrganizationLogoDropzoneComponent,
  ],
  templateUrl: './organization-administration.page.html',
  styleUrl: './organization-administration.page.scss',
})
export class OrganizationAdministrationPage implements OnDestroy {
  private readonly dialog = inject(MatDialog);
  private readonly organizationsService = inject(OrganizationsService);
  readonly tenantContextStore = inject(TenantContextStore);
  readonly organizationConfigurationStore = inject(OrganizationConfigurationStore);
  readonly organizationLogoStore = inject(OrganizationLogoStore);
  private readonly logoFileInput = viewChild<ElementRef<HTMLInputElement>>('logoFileInput');
  private loadSubscription?: Subscription;
  private mutationSubscription?: Subscription;
  private institutionalMutationSubscription?: Subscription;
  private loadSequence = 0;
  private destroyed = false;
  private configurationFormScope = '';

  readonly viewState = signal<ViewState>('loading');
  readonly organization = signal<OrganizationDetails | null>(null);
  readonly isSaving = signal(false);
  readonly isSavingInstitutional = signal(false);
  readonly isChangingStatus = signal(false);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');
  readonly institutionalSuccess = signal('');
  readonly institutionalError = signal('');
  readonly contextWarning = signal('');
  readonly canManage = computed(() => this.tenantContextStore.hasCapability('organization.manage'));
  readonly isSuspended = computed(() => this.organization()?.status === 'SUSPENDED');
  readonly presentLogo = computed(() => {
    const logo = this.organizationLogoStore.logo();
    return logo?.rowState === 'PRESENT' ? logo : null;
  });
  readonly isCanonicalContextSynchronizationPending =
    this.tenantContextStore.isCanonicalContextSynchronizationPending;

  readonly form = new FormGroup({
    legalName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(255)],
    }),
    displayName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(150)],
    }),
    slug: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.maxLength(100),
        Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      ],
    }),
    timezone: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    locale: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.maxLength(20),
        Validators.pattern(/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/),
      ],
    }),
    currency: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[A-Z]{3}$/)],
    }),
  });

  readonly institutionalForm = new FormGroup({
    taxId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(50)],
    }),
    tradeName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(150)],
    }),
    phone: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(30)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.email, Validators.maxLength(255)],
    }),
    website: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(500)],
    }),
    address: new FormControl('', {
      nonNullable: true,
    }),
  });

  readonly settingsForm = new FormGroup({
    defaultAppointmentDuration: new FormControl<number | null>(null, [
      Validators.min(1),
      Validators.max(1440),
    ]),
  });

  readonly brandingForm = new FormGroup({
    visualName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(150)],
    }),
    primaryColor: new FormControl<string | null>(null, [
      (control) =>
        control.value === null || isSafeOrganizationBrandColor(control.value)
          ? null
          : { unsafeColor: true },
    ]),
    accentColor: new FormControl<string | null>(null, [
      (control) =>
        control.value === null || isSafeOrganizationBrandColor(control.value)
          ? null
          : { unsafeColor: true },
    ]),
  });

  constructor() {
    this.loadOrganization();
    effect(() => {
      const organizationId = this.tenantContextStore.selectedOrganizationId();
      const generation = this.tenantContextStore.switchGeneration();
      const formScope = `${organizationId ?? 'none'}:${generation}`;

      if (formScope !== this.configurationFormScope) {
        this.configurationFormScope = formScope;
        this.settingsForm.reset({ defaultAppointmentDuration: null });
        this.brandingForm.reset({ visualName: '', primaryColor: null, accentColor: null });
      }
    });
    effect(() => {
      const organizationId = this.tenantContextStore.selectedOrganizationId();
      const generation = this.tenantContextStore.switchGeneration();

      const settings = this.organizationConfigurationStore.settings();
      const settingsOwner = this.organizationConfigurationStore.settingsOwner();
      if (
        settings &&
        settingsOwner?.organizationId === organizationId &&
        settingsOwner.generation === generation
      ) {
        this.settingsForm.reset({
          defaultAppointmentDuration: settings.persistedDefaultAppointmentDuration,
        });
      }
    });
    effect(() => {
      const organizationId = this.tenantContextStore.selectedOrganizationId();
      const generation = this.tenantContextStore.switchGeneration();

      const branding = this.organizationConfigurationStore.branding();
      const brandingOwner = this.organizationConfigurationStore.brandingOwner();
      if (
        branding &&
        brandingOwner?.organizationId === organizationId &&
        brandingOwner.generation === generation
      ) {
        this.brandingForm.reset({
          visualName: branding.visualName ?? '',
          primaryColor: branding.primaryColor,
          accentColor: branding.accentColor,
        });
      }
    });
    effect(() => {
      if (this.organizationConfigurationStore.settingsSaving()) {
        this.settingsForm.disable({ emitEvent: false });
      } else {
        this.settingsForm.enable({ emitEvent: false });
      }

      if (this.organizationConfigurationStore.brandingSaving()) {
        this.brandingForm.disable({ emitEvent: false });
      } else {
        this.brandingForm.enable({ emitEvent: false });
      }
    });
    effect(() => {
      const selectedFile = this.organizationLogoStore.selectedFile();
      const input = this.logoFileInput()?.nativeElement;
      if (!selectedFile && input) input.value = '';
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.loadSubscription?.unsubscribe();
    this.mutationSubscription?.unsubscribe();
    this.institutionalMutationSubscription?.unsubscribe();
  }

  loadOrganization(): void {
    const scope = this.captureScope();
    const sequence = ++this.loadSequence;

    this.loadSubscription?.unsubscribe();
    this.viewState.set('loading');
    this.errorMessage.set('');
    this.contextWarning.set('');
    this.successMessage.set('');

    if (!scope) {
      this.organization.set(null);
      this.viewState.set('error');
      return;
    }

    this.loadSubscription = this.organizationsService.getCurrent(scope.organizationId).subscribe({
      next: (organization) => {
        if (sequence !== this.loadSequence || !this.isScopeCurrent(scope)) {
          return;
        }

        this.applyCanonicalOrganization(organization);
        this.viewState.set('loaded');
        this.reconcileCanonicalLifecycle(scope, organization);
      },
      error: (error: HttpErrorResponse) => {
        if (sequence !== this.loadSequence || !this.isScopeCurrent(scope)) {
          return;
        }

        this.organization.set(null);
        this.viewState.set(this.getLoadErrorState(error));
      },
    });
  }

  save(): void {
    const organization = this.organization();
    const scope = this.captureScope();

    this.clearFeedback();

    if (
      !organization ||
      !scope ||
      !this.canManage() ||
      this.isSaving() ||
      this.isChangingStatus() ||
      this.isCanonicalContextSynchronizationPending()
    ) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Revisa los campos marcados antes de guardar.');
      return;
    }

    const payload = this.buildUpdatePayload(organization);
    if (Object.keys(payload).length === 0) {
      this.successMessage.set('La información ya está actualizada.');
      return;
    }

    this.isSaving.set(true);
    this.mutationSubscription?.unsubscribe();
    this.mutationSubscription = this.organizationsService
      .update(scope.organizationId, payload)
      .subscribe({
        next: (canonical) => {
          if (!this.isScopeCurrent(scope)) {
            return;
          }

          this.applyCanonicalOrganization(canonical);
          void this.finishMutationSynchronization(scope, canonical, 'update');
        },
        error: (error: HttpErrorResponse) => {
          if (!this.isScopeCurrent(scope)) {
            return;
          }

          this.isSaving.set(false);
          this.errorMessage.set(this.getMutationErrorMessage(error, 'update'));
        },
      });
  }

  openStatusConfirmation(): void {
    const organization = this.organization();

    this.clearFeedback();

    if (
      !organization ||
      !this.canManage() ||
      this.isChangingStatus() ||
      this.isSaving() ||
      this.isCanonicalContextSynchronizationPending()
    ) {
      return;
    }

    const targetStatus: OrganizationStatus =
      organization.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const data: OrganizationStatusConfirmDialogData = {
      displayName: organization.displayName,
      targetStatus,
    };
    const dialogRef = this.dialog.open(OrganizationStatusConfirmDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      autoFocus: false,
      data,
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.changeStatus(targetStatus);
      }
    });
  }

  getFieldError(fieldName: keyof typeof this.form.controls): string {
    const control = this.form.controls[fieldName];

    if (!control.touched || !control.errors) {
      return '';
    }

    if (control.hasError('required')) {
      return 'Este campo es obligatorio.';
    }

    if (control.hasError('maxlength')) {
      return 'El valor supera la longitud permitida.';
    }

    if (fieldName === 'slug') {
      return 'Usa minúsculas, números y guiones simples.';
    }

    if (fieldName === 'locale') {
      return 'Usa un locale válido, por ejemplo es-MX.';
    }

    return 'Usa un código ISO de tres letras, por ejemplo MXN.';
  }

  saveAppointmentDefault(): void {
    if (!this.canManage() || this.settingsForm.invalid) {
      this.settingsForm.markAllAsTouched();
      return;
    }
    const value = this.settingsForm.controls.defaultAppointmentDuration.value;
    this.organizationConfigurationStore.saveSettings(value);
    if (
      this.organizationConfigurationStore.settings()?.persistedDefaultAppointmentDuration === value
    ) {
      this.settingsForm.markAsPristine();
    }
  }

  resetAppointmentDefault(): void {
    if (!this.canManage()) return;
    this.settingsForm.controls.defaultAppointmentDuration.setValue(null);
    this.organizationConfigurationStore.saveSettings(null);
    if (
      this.organizationConfigurationStore.settings()?.persistedDefaultAppointmentDuration === null
    ) {
      this.settingsForm.markAsPristine();
    }
  }

  saveBranding(): void {
    if (!this.canManage() || this.brandingForm.invalid) {
      this.brandingForm.markAllAsTouched();
      return;
    }
    const raw = this.brandingForm.getRawValue();
    const visualName = raw.visualName.trim().length > 0 ? raw.visualName.trim() : null;
    const primaryColor =
      raw.primaryColor === null || raw.primaryColor === ''
        ? null
        : canonicalOrganizationBrandColor(raw.primaryColor);
    const accentColor =
      raw.accentColor === null || raw.accentColor === ''
        ? null
        : canonicalOrganizationBrandColor(raw.accentColor);

    this.organizationConfigurationStore.saveBranding({
      visualName,
      primaryColor,
      accentColor,
    });
    const canonical = this.organizationConfigurationStore.branding();
    if (
      canonical?.primaryColor === primaryColor &&
      canonical?.accentColor === accentColor &&
      canonical?.visualName === visualName
    ) {
      this.brandingForm.markAsPristine();
    }
  }

  resetBranding(): void {
    if (!this.canManage()) return;
    this.brandingForm.reset({ visualName: '', primaryColor: null, accentColor: null });
    this.organizationConfigurationStore.saveBranding({
      visualName: null,
      primaryColor: null,
      accentColor: null,
    });
    this.brandingForm.markAsPristine();
  }

  selectLogoFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.organizationLogoStore.selectFile(input.files?.item(0) ?? null);
    if (!this.organizationLogoStore.selectedFile()) input.value = '';
  }

  uploadLogo(): void {
    if (!this.canManage()) return;
    this.organizationLogoStore.uploadSelected();
  }

  openLogoRemoveConfirmation(): void {
    const organization = this.organization();
    const scope = this.captureScope();
    if (
      !organization ||
      !scope ||
      !this.canManage() ||
      this.organizationLogoStore.state() !== 'PRESENT' ||
      this.organizationLogoStore.mutationState() !== 'IDLE'
    ) {
      return;
    }

    const data: OrganizationLogoRemoveConfirmDialogData = {
      displayName: organization.displayName,
    };
    const dialogRef = this.dialog.open(OrganizationLogoRemoveConfirmDialogComponent, {
      width: '520px',
      maxWidth: '95vw',
      data,
    });
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (
        confirmed &&
        this.canManage() &&
        this.isScopeCurrent(scope) &&
        this.organizationLogoStore.state() === 'PRESENT' &&
        this.organizationLogoStore.mutationState() === 'IDLE'
      ) {
        this.organizationLogoStore.remove();
      }
    });
  }

  logoTypeLabel(logo: PresentOrganizationLogoResponse): string {
    return logo.mimeType === 'image/png' ? 'PNG' : 'JPEG';
  }

  logoSizeLabel(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
  }

  private changeStatus(targetStatus: OrganizationStatus): void {
    const scope = this.captureScope();

    if (
      !scope ||
      !this.canManage() ||
      this.isChangingStatus() ||
      this.isSaving() ||
      this.isCanonicalContextSynchronizationPending()
    ) {
      return;
    }

    this.isChangingStatus.set(true);
    this.mutationSubscription?.unsubscribe();
    this.mutationSubscription = this.organizationsService
      .changeStatus(scope.organizationId, { status: targetStatus })
      .subscribe({
        next: (canonical) => {
          if (!this.isScopeCurrent(scope)) {
            return;
          }

          this.applyCanonicalOrganization(canonical);
          void this.finishMutationSynchronization(scope, canonical, 'status');
        },
        error: (error: HttpErrorResponse) => {
          if (!this.isScopeCurrent(scope)) {
            return;
          }

          this.isChangingStatus.set(false);
          this.errorMessage.set(this.getMutationErrorMessage(error, 'status'));
        },
      });
  }

  retryContextSynchronization(): void {
    const scope = this.captureScope();
    const organization = this.organization();

    if (!scope || !organization) {
      return;
    }

    this.contextWarning.set('');
    this.reconcileCanonicalLifecycle(scope, organization);
  }

  private reconcileCanonicalLifecycle(
    scope: RequestScope,
    organization: OrganizationDetails,
  ): void {
    if (!this.hasLifecycleMismatch(organization)) {
      return;
    }

    void this.synchronizeCanonicalContext(scope, organization);
  }

  private async finishMutationSynchronization(
    scope: RequestScope,
    organization: OrganizationDetails,
    operation: 'update' | 'status',
  ): Promise<void> {
    const result = await this.synchronizeCanonicalContext(scope, organization);

    if (this.destroyed) {
      return;
    }

    if (operation === 'update') {
      this.isSaving.set(false);
    } else {
      this.isChangingStatus.set(false);
    }

    if (this.tenantContextStore.selectedOrganizationId() !== scope.organizationId) {
      return;
    }

    if (result === 'synchronized') {
      this.successMessage.set(
        operation === 'update'
          ? 'La organización se actualizó correctamente.'
          : organization.status === 'SUSPENDED'
            ? 'La organización fue suspendida. Solo permanece disponible la administración autorizada.'
            : 'La organización fue reactivada. Los permisos se actualizaron desde el servidor.',
      );
    }
  }

  private async synchronizeCanonicalContext(
    scope: RequestScope,
    organization: OrganizationDetails,
  ): Promise<'synchronized' | 'failed' | 'stale'> {
    const result = await this.tenantContextStore.synchronizeCanonicalContext(
      scope.generation,
      scope.organizationId,
      this.hasLifecycleMismatch(organization),
    );

    if (
      this.destroyed ||
      this.tenantContextStore.selectedOrganizationId() !== scope.organizationId
    ) {
      return result;
    }

    if (result === 'failed') {
      this.contextWarning.set(
        'La información canónica fue recibida, pero no fue posible sincronizar el contexto. Reintenta la sincronización antes de continuar.',
      );
    }

    return result;
  }

  private hasLifecycleMismatch(organization: OrganizationDetails): boolean {
    return this.tenantContextStore.snapshot()?.organization?.status !== organization.status;
  }

  private applyCanonicalOrganization(organization: OrganizationDetails): void {
    this.organization.set(organization);
    this.form.reset({
      legalName: organization.legalName,
      displayName: organization.displayName,
      slug: organization.slug,
      timezone: organization.timezone,
      locale: organization.locale,
      currency: organization.currency,
    });
    this.institutionalForm.reset({
      taxId: organization.taxId ?? '',
      tradeName: organization.tradeName ?? '',
      phone: organization.phone ?? '',
      email: organization.email ?? '',
      website: organization.website ?? '',
      address: organization.address ?? '',
    });
  }

  saveInstitutional(): void {
    const organization = this.organization();
    const scope = this.captureScope();

    this.clearInstitutionalFeedback();

    if (
      !organization ||
      !scope ||
      !this.canManage() ||
      this.isSavingInstitutional() ||
      this.isSaving() ||
      this.isChangingStatus() ||
      this.isCanonicalContextSynchronizationPending()
    ) {
      return;
    }

    if (this.institutionalForm.invalid) {
      this.institutionalForm.markAllAsTouched();
      this.institutionalError.set('Revisa los campos marcados antes de guardar.');
      return;
    }

    const value = this.institutionalForm.getRawValue();
    const payload: UpdateOrganizationDto = {};

    if (value.tradeName.trim() !== (organization.tradeName ?? '')) {
      payload.tradeName = value.tradeName.trim() || undefined;
    }
    if (value.taxId.trim() !== (organization.taxId ?? '')) {
      payload.taxId = value.taxId.trim() || undefined;
    }
    if (value.phone.trim() !== (organization.phone ?? '')) {
      payload.phone = value.phone.trim() || undefined;
    }
    if (value.email.trim() !== (organization.email ?? '')) {
      payload.email = value.email.trim() || undefined;
    }
    if (value.website.trim() !== (organization.website ?? '')) {
      payload.website = value.website.trim() || undefined;
    }
    if (value.address.trim() !== (organization.address ?? '')) {
      payload.address = value.address.trim() || undefined;
    }

    if (Object.keys(payload).length === 0) {
      this.institutionalSuccess.set('La información institucional ya está actualizada.');
      return;
    }

    this.isSavingInstitutional.set(true);
    this.institutionalMutationSubscription?.unsubscribe();
    this.institutionalMutationSubscription = this.organizationsService
      .update(scope.organizationId, payload)
      .subscribe({
        next: (canonical) => {
          if (!this.isScopeCurrent(scope)) return;
          this.applyCanonicalOrganization(canonical);
          void this.finishInstitutionalSynchronization(scope, canonical);
        },
        error: (error: HttpErrorResponse) => {
          if (!this.isScopeCurrent(scope)) return;
          this.isSavingInstitutional.set(false);
          this.institutionalError.set(this.getMutationErrorMessage(error, 'update'));
        },
      });
  }

  private async finishInstitutionalSynchronization(
    scope: RequestScope,
    organization: OrganizationDetails,
  ): Promise<void> {
    const result = await this.synchronizeCanonicalContext(scope, organization);

    if (this.destroyed || !this.isScopeCurrent(scope)) {
      return;
    }

    this.isSavingInstitutional.set(false);

    if (result === 'stale') {
      return;
    }

    if (result === 'synchronized') {
      this.institutionalSuccess.set('Los datos institucionales se actualizaron correctamente.');
    }
  }

  getInstitutionalFieldError(fieldName: keyof typeof this.institutionalForm.controls): string {
    const control = this.institutionalForm.controls[fieldName];
    if (!control.touched || !control.errors) return '';
    if (control.hasError('maxlength')) return 'El valor supera la longitud permitida.';
    if (control.hasError('email')) return 'Ingresa un formato de correo válido.';
    return 'Campo inválido.';
  }

  private clearInstitutionalFeedback(): void {
    this.institutionalSuccess.set('');
    this.institutionalError.set('');
  }

  private buildUpdatePayload(organization: OrganizationDetails): UpdateOrganizationDto {
    const value = this.form.getRawValue();
    const normalized = {
      legalName: value.legalName.trim(),
      displayName: value.displayName.trim(),
      slug: value.slug.trim().toLowerCase(),
      timezone: value.timezone.trim(),
      locale: value.locale.trim(),
      currency: value.currency.trim().toUpperCase(),
    };
    const payload: UpdateOrganizationDto = {};

    for (const key of Object.keys(normalized) as (keyof typeof normalized)[]) {
      if (normalized[key] !== organization[key]) {
        payload[key] = normalized[key];
      }
    }

    return payload;
  }

  private captureScope(): RequestScope | null {
    const organizationId = this.tenantContextStore.selectedOrganizationId();

    if (!organizationId) {
      return null;
    }

    return {
      organizationId,
      generation: this.tenantContextStore.switchGeneration(),
    };
  }

  private isScopeCurrent(scope: RequestScope): boolean {
    return (
      this.tenantContextStore.selectedOrganizationId() === scope.organizationId &&
      this.tenantContextStore.switchGeneration() === scope.generation
    );
  }

  private getLoadErrorState(error: HttpErrorResponse): ViewState {
    if (error.status === 403) {
      return 'forbidden';
    }

    if (error.status === 404) {
      return 'not-found';
    }

    return 'error';
  }

  private getMutationErrorMessage(
    error: HttpErrorResponse,
    operation: 'update' | 'status',
  ): string {
    if (error.status === 403) {
      return 'El servidor rechazó esta acción. Tus permisos pudieron haber cambiado.';
    }

    if (error.status === 409) {
      return 'Existe un conflicto con la información actual o con el identificador solicitado. Recarga y revisa los datos antes de volver a intentarlo.';
    }

    if (error.status === 400) {
      return 'El servidor rechazó los datos. Revisa los campos e intenta nuevamente.';
    }

    if (error.status === 404) {
      return 'La organización ya no está disponible en este contexto.';
    }

    return operation === 'update'
      ? 'No fue posible guardar la información de la organización.'
      : 'No fue posible cambiar el estado de la organización.';
  }

  private clearFeedback(): void {
    this.successMessage.set('');
    this.errorMessage.set('');
    this.contextWarning.set('');
  }
}
