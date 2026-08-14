import { HttpErrorResponse } from '@angular/common/http';
import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of, Subject } from 'rxjs';

import { TenantContextStore } from '../../../core/tenant-context/tenant-context.store';
import { OrganizationConfigurationStore } from '../../../core/organization-configuration/organization-configuration.store';
import { OrganizationLogoStore } from '../../../core/organization-logo/organization-logo.store';
import { OrganizationDetails } from '../models/organization.models';
import {
  OrganizationBrandingResponse,
  OrganizationSettingsResponse,
} from '../models/organization-configuration.models';
import { OrganizationLogoResponse } from '../models/organization-logo.models';
import { OrganizationsService } from '../services/organizations.service';
import { OrganizationAdministrationPage } from './organization-administration.page';

describe('OrganizationAdministrationPage', () => {
  let fixture: ComponentFixture<OrganizationAdministrationPage>;
  let component: OrganizationAdministrationPage;
  let currentLoad: Subject<OrganizationDetails>;
  let dialogClosed: Subject<boolean | undefined>;
  let selectedOrganizationId: WritableSignal<string | null>;
  let switchGeneration: WritableSignal<number>;
  let canManage: boolean;
  let canonicalContextStatus: 'ACTIVE' | 'SUSPENDED';
  let synchronizationPending: boolean;
  let organizationsService: {
    getCurrent: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    changeStatus: ReturnType<typeof vi.fn>;
  };
  let tenantStore: {
    selectedOrganizationId: WritableSignal<string | null>;
    switchGeneration: WritableSignal<number>;
    hasCapability: ReturnType<typeof vi.fn>;
    synchronizeCanonicalContext: ReturnType<typeof vi.fn>;
    isCanonicalContextSynchronizationPending: ReturnType<typeof vi.fn>;
    snapshot: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };
  let dialog: { open: ReturnType<typeof vi.fn> };
  let configurationStore: {
    settings: WritableSignal<OrganizationSettingsResponse | null>;
    branding: WritableSignal<OrganizationBrandingResponse | null>;
    settingsOwner: WritableSignal<{ organizationId: string; generation: number } | null>;
    brandingOwner: WritableSignal<{ organizationId: string; generation: number } | null>;
    settingsState: WritableSignal<string>;
    brandingState: WritableSignal<string>;
    settingsError: WritableSignal<string>;
    brandingError: WritableSignal<string>;
    settingsSaving: WritableSignal<boolean>;
    brandingSaving: WritableSignal<boolean>;
    settingsSuccess: WritableSignal<string>;
    brandingSuccess: WritableSignal<string>;
    effectiveAppointmentDuration: ReturnType<typeof vi.fn>;
    loadCurrent: ReturnType<typeof vi.fn>;
    saveSettings: ReturnType<typeof vi.fn>;
    saveBranding: ReturnType<typeof vi.fn>;
  };
  let logoStore: {
    logo: WritableSignal<OrganizationLogoResponse | null>;
    state: WritableSignal<string>;
    previewUrl: WritableSignal<string | null>;
    selectedFile: WritableSignal<File | null>;
    fileError: WritableSignal<string>;
    errorMessage: WritableSignal<string>;
    successMessage: WritableSignal<string>;
    conflictMessage: WritableSignal<string>;
    mutationState: WritableSignal<string>;
    loadCurrent: ReturnType<typeof vi.fn>;
    selectFile: ReturnType<typeof vi.fn>;
    uploadSelected: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    currentLoad = new Subject<OrganizationDetails>();
    dialogClosed = new Subject<boolean | undefined>();
    selectedOrganizationId = signal<string | null>('organization-a');
    switchGeneration = signal(1);
    canManage = true;
    canonicalContextStatus = 'ACTIVE';
    synchronizationPending = false;
    organizationsService = {
      getCurrent: vi.fn(() => currentLoad.asObservable()),
      update: vi.fn(),
      changeStatus: vi.fn(),
    };
    tenantStore = {
      selectedOrganizationId,
      switchGeneration,
      hasCapability: vi.fn(
        (capability: string) =>
          capability === 'organization.read' || (capability === 'organization.manage' && canManage),
      ),
      synchronizeCanonicalContext: vi.fn(() => Promise.resolve('synchronized')),
      isCanonicalContextSynchronizationPending: vi.fn(() => synchronizationPending),
      snapshot: vi.fn(() => ({ organization: { status: canonicalContextStatus } })),
      error: vi.fn(() => null),
    };
    dialog = {
      open: vi.fn(() => ({ afterClosed: () => dialogClosed.asObservable() })),
    };
    configurationStore = {
      settings: signal<OrganizationSettingsResponse | null>(null),
      branding: signal<OrganizationBrandingResponse | null>(null),
      settingsOwner: signal(null),
      brandingOwner: signal(null),
      settingsState: signal<string>('NOT_LOADED'),
      brandingState: signal<string>('NOT_LOADED'),
      settingsError: signal(''),
      brandingError: signal(''),
      settingsSaving: signal(false),
      brandingSaving: signal(false),
      settingsSuccess: signal(''),
      brandingSuccess: signal(''),
      effectiveAppointmentDuration: vi.fn(() => 60),
      loadCurrent: vi.fn(),
      saveSettings: vi.fn(),
      saveBranding: vi.fn(),
    };
    logoStore = {
      logo: signal<OrganizationLogoResponse | null>(null),
      state: signal<string>('NOT_LOADED'),
      previewUrl: signal<string | null>(null),
      selectedFile: signal<File | null>(null),
      fileError: signal(''),
      errorMessage: signal(''),
      successMessage: signal(''),
      conflictMessage: signal(''),
      mutationState: signal<string>('IDLE'),
      loadCurrent: vi.fn(),
      selectFile: vi.fn(),
      uploadSelected: vi.fn(),
      remove: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [OrganizationAdministrationPage],
      providers: [
        { provide: OrganizationsService, useValue: organizationsService },
        { provide: TenantContextStore, useValue: tenantStore },
        { provide: MatDialog, useValue: dialog },
        { provide: OrganizationConfigurationStore, useValue: configurationStore },
        { provide: OrganizationLogoStore, useValue: logoStore },
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

  it('renders the ABSENT logo placeholder and an accessible constrained file input without duplicate status', () => {
    currentLoad.next(createOrganization());
    publishLogo(absentLogo());
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector(
      '#organization-logo-file',
    ) as HTMLInputElement;
    const label = fixture.nativeElement.querySelector(
      'label[for="organization-logo-file"]',
    ) as HTMLLabelElement;
    expect(fixture.nativeElement.textContent).toContain('Sin logotipo');
    expect(fixture.nativeElement.textContent).toContain('1 MiB');
    expect(label.textContent).toContain('Seleccionar archivo');
    expect(input.accept).toContain('image/png');
    expect(input.getAttribute('aria-describedby')).toContain('organization-logo-constraints');
    expect(fixture.nativeElement.querySelector('#organization-logo-file-feedback')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Ning\u00fan archivo seleccionado.');
    expect(
      fixture.nativeElement.querySelector('.organization-configuration-actions button').disabled,
    ).toBe(true);
  });

  it('renders a protected PRESENT preview with canonical metadata and meaningful alt text', () => {
    currentLoad.next(createOrganization({ displayName: 'Consultorio Norte' }));
    publishLogo(presentLogo({ width: 512, height: 256, byteSize: 2048 }));
    logoStore.previewUrl.set('blob:protected-logo');
    fixture.detectChanges();

    const image = fixture.nativeElement.querySelector('.organization-logo__preview img');
    expect(image.getAttribute('src')).toBe('blob:protected-logo');
    expect(image.getAttribute('alt')).toBe('Logotipo de Consultorio Norte');
    expect(fixture.nativeElement.textContent).toContain('512');
    expect(fixture.nativeElement.textContent).toContain('256 px');
    expect(fixture.nativeElement.textContent).toContain('2.0 KiB');
    expect(fixture.nativeElement.textContent).toContain('Reemplazar logotipo');
  });

  it('keeps logo metadata visible but hides every mutation affordance without manage', () => {
    canManage = false;
    currentLoad.next(createOrganization());
    publishLogo(presentLogo());
    logoStore.previewUrl.set('blob:protected-logo');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#organization-logo-file')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Reemplazar logotipo');
    expect(fixture.nativeElement.textContent).not.toContain('Eliminar logotipo');
    expect(fixture.nativeElement.textContent).toContain('subir, reemplazar o eliminar requiere');
  });

  it('delegates file selection and upload without duplicating the selected filename', () => {
    currentLoad.next(createOrganization());
    publishLogo(absentLogo());
    const file = new File(['png'], 'practice-logo.png', { type: 'image/png' });
    component.selectLogoFile({ target: { files: { item: () => file } } } as unknown as Event);
    logoStore.selectedFile.set(file);
    logoStore.successMessage.set('El logotipo de la organizaci\u00f3n se actualiz\u00f3.');
    fixture.detectChanges();

    component.uploadLogo();

    expect(logoStore.selectFile).toHaveBeenCalledWith(file);
    expect(logoStore.uploadSelected).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.querySelector('#organization-logo-file-feedback')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Archivo seleccionado:');
    expect(fixture.nativeElement.textContent).toContain('se actualiz\u00f3');
    expect(
      fixture.nativeElement.querySelector('.organization-configuration-actions button').disabled,
    ).toBe(false);
  });

  it('keeps visible file validation feedback associated with the input', () => {
    currentLoad.next(createOrganization());
    publishLogo(absentLogo());
    logoStore.fileError.set('Selecciona un archivo PNG o JPEG.');
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector(
      '#organization-logo-file',
    ) as HTMLInputElement;
    const feedback = fixture.nativeElement.querySelector(
      '#organization-logo-file-feedback',
    ) as HTMLParagraphElement;

    expect(feedback.textContent).toContain('Selecciona un archivo PNG o JPEG.');
    expect(feedback.getAttribute('role')).toBe('alert');
    expect(input.getAttribute('aria-describedby')).toContain('organization-logo-file-feedback');
    expect(input.getAttribute('aria-errormessage')).toBe('organization-logo-file-feedback');
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  it('delegates an explicit PRESENT replacement and renders canonical success feedback', () => {
    currentLoad.next(createOrganization());
    publishLogo(presentLogo());
    logoStore.previewUrl.set('blob:current-logo');
    logoStore.selectedFile.set(new File(['jpeg'], 'replacement.jpg', { type: 'image/jpeg' }));
    logoStore.successMessage.set('El logotipo de la organizaci\u00f3n se actualiz\u00f3.');
    fixture.detectChanges();

    component.uploadLogo();

    expect(logoStore.uploadSelected).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.textContent).toContain('Reemplazar logotipo');
    expect(fixture.nativeElement.textContent).toContain('se actualiz\u00f3');
  });

  it('requires explicit confirmation before delegating logo removal', () => {
    currentLoad.next(createOrganization());
    publishLogo(presentLogo());
    logoStore.previewUrl.set('blob:protected-logo');
    fixture.detectChanges();

    component.openLogoRemoveConfirmation();
    expect(logoStore.remove).not.toHaveBeenCalled();
    dialogClosed.next(true);

    expect(dialog.open).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ data: { displayName: 'Practice A' } }),
    );
    expect(logoStore.remove).toHaveBeenCalledOnce();
  });

  it('shows conflict reconciliation feedback without claiming mutation success', () => {
    currentLoad.next(createOrganization());
    publishLogo(presentLogo({ updatedAt: 'v2' }));
    logoStore.previewUrl.set('blob:canonical-v2');
    logoStore.conflictMessage.set(
      'Otra sesi\u00f3n cambi\u00f3 el logotipo. Se carg\u00f3 la versi\u00f3n actual; rev\u00edsala.',
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Otra sesi\u00f3n cambi\u00f3 el logotipo');
    expect(fixture.nativeElement.textContent).not.toContain(
      'El logotipo de la organizaci\u00f3n se actualiz\u00f3',
    );
  });

  it('renders loading and recoverable logo error states and delegates Retry', () => {
    currentLoad.next(createOrganization());
    logoStore.state.set('LOADING');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Cargando logotipo');

    logoStore.state.set('ERROR');
    logoStore.errorMessage.set('No fue posible cargar la informaci\u00f3n del logotipo.');
    fixture.detectChanges();
    const retry = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent.includes('Reintentar')) as HTMLButtonElement;
    retry.click();

    expect(fixture.nativeElement.textContent).toContain('No fue posible cargar');
    expect(logoStore.loadCurrent).toHaveBeenCalledOnce();
  });

  it('clears the visible A preview immediately when tenant B begins loading', () => {
    currentLoad.next(createOrganization());
    publishLogo(presentLogo());
    logoStore.previewUrl.set('blob:organization-a');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('img')?.getAttribute('src')).toBe(
      'blob:organization-a',
    );

    selectedOrganizationId.set('organization-b');
    switchGeneration.set(2);
    logoStore.logo.set(null);
    logoStore.previewUrl.set(null);
    logoStore.state.set('LOADING');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.organization-logo img')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Cargando logotipo');
  });

  it('renders loaded Settings and Branding canonical values', () => {
    currentLoad.next(createOrganization());
    publishConfiguration(
      createSettings({ defaultAppointmentDuration: 45, persistedDefaultAppointmentDuration: 45 }),
      createBranding({ primaryColor: '#2563EB' }),
    );
    fixture.detectChanges();

    expect(component.settingsForm.controls.defaultAppointmentDuration.value).toBe(45);
    expect(component.brandingForm.controls.primaryColor.value).toBe('#2563EB');
    expect(fixture.nativeElement.textContent).toContain('Duración predeterminada');
    expect(fixture.nativeElement.textContent).toContain('Identidad visual');
  });

  it('keeps Settings and Branding helpers and feedback in dynamic document flow', () => {
    currentLoad.next(createOrganization());
    publishConfiguration(createSettings(), createBranding());
    configurationStore.settingsSuccess.set('La duración predeterminada se actualizó.');
    configurationStore.settingsError.set(
      'La configuración cambió en otra sesión. Se cargó la versión más reciente; revísala antes de volver a guardar.',
    );
    configurationStore.brandingSuccess.set('La identidad visual se actualizó.');
    fixture.detectChanges();

    const configurationForms = Array.from(
      fixture.nativeElement.querySelectorAll('.organization-configuration-form'),
    ) as HTMLElement[];
    const settingsField = configurationForms[0].querySelector('mat-form-field');
    const settingsHelper = configurationForms[0].querySelector('mat-hint');
    const settingsSuccess = configurationForms[0].querySelector(
      '.organization-configuration-success',
    );
    const settingsError = configurationForms[0].querySelector('.organization-configuration-error');
    const brandingField = configurationForms[1].querySelector('mat-form-field');
    const brandingSuccess = configurationForms[1].querySelector(
      '.organization-configuration-success',
    );

    expect(
      settingsField?.querySelector('.mat-mdc-form-field-subscript-dynamic-size'),
    ).not.toBeNull();
    expect(
      brandingField?.querySelector('.mat-mdc-form-field-subscript-dynamic-size'),
    ).not.toBeNull();
    expect(settingsHelper?.textContent).toContain('Valor efectivo:');
    expect(settingsSuccess?.textContent).toContain('se actualizó');
    expect(settingsError?.textContent).toContain('antes de volver a guardar');
    expect(brandingSuccess?.textContent).toContain('se actualizó');
    expect(configurationForms[0].children[0]).toBe(settingsField);
    expect(configurationForms[0].children[1]).toBe(settingsSuccess);
    expect(configurationForms[0].children[2]).toBe(settingsError);
  });

  it('delegates Settings and Branding save and reset values', () => {
    currentLoad.next(createOrganization());
    publishConfiguration(createSettings(), createBranding());
    fixture.detectChanges();

    component.settingsForm.controls.defaultAppointmentDuration.setValue(45);
    component.saveAppointmentDefault();
    component.resetAppointmentDefault();
    component.brandingForm.controls.primaryColor.setValue('#7C3AED');
    component.saveBranding();
    component.resetBranding();

    expect(configurationStore.saveSettings).toHaveBeenNthCalledWith(1, 45);
    expect(configurationStore.saveSettings).toHaveBeenNthCalledWith(2, null);
    expect(configurationStore.saveBranding).toHaveBeenNthCalledWith(1, '#7C3AED');
    expect(configurationStore.saveBranding).toHaveBeenNthCalledWith(2, null);
  });

  it('invalidates dirty Settings and Branding drafts when tenant A switches to B', () => {
    currentLoad.next(createOrganization());
    publishConfiguration(
      createSettings({ defaultAppointmentDuration: 45, persistedDefaultAppointmentDuration: 45 }),
      createBranding({ primaryColor: '#2563EB' }),
    );
    fixture.detectChanges();
    component.settingsForm.controls.defaultAppointmentDuration.setValue(90);
    component.settingsForm.controls.defaultAppointmentDuration.markAsDirty();
    component.settingsForm.controls.defaultAppointmentDuration.markAsTouched();
    component.brandingForm.controls.primaryColor.setValue('#7C3AED');
    component.brandingForm.controls.primaryColor.markAsDirty();
    component.brandingForm.controls.primaryColor.setErrors({ server: true });

    selectedOrganizationId.set('organization-b');
    switchGeneration.set(2);
    fixture.detectChanges();

    expect(component.settingsForm.controls.defaultAppointmentDuration.value).toBeNull();
    expect(component.brandingForm.controls.primaryColor.value).toBeNull();
    expect(component.settingsForm.pristine).toBe(true);
    expect(component.settingsForm.untouched).toBe(true);
    expect(component.brandingForm.pristine).toBe(true);
    expect(component.brandingForm.controls.primaryColor.hasError('server')).toBe(false);

    publishConfiguration(
      createSettings({ defaultAppointmentDuration: 30, persistedDefaultAppointmentDuration: 30 }),
      createBranding({ primaryColor: '#7C3AED' }),
      'organization-b',
      2,
    );
    fixture.detectChanges();
    expect(component.settingsForm.controls.defaultAppointmentDuration.value).toBe(30);
    expect(component.brandingForm.controls.primaryColor.value).toBe('#7C3AED');

    component.saveAppointmentDefault();
    component.saveBranding();
    expect(configurationStore.saveSettings).toHaveBeenCalledWith(30);
    expect(configurationStore.saveSettings).not.toHaveBeenCalledWith(90);
    expect(configurationStore.saveBranding).toHaveBeenCalledWith('#7C3AED');
    expect(configurationStore.saveBranding).not.toHaveBeenCalledWith('#2563EB');
  });

  it('allows only C canonical responses to populate forms after A to B to C', () => {
    currentLoad.next(createOrganization());
    component.settingsForm.controls.defaultAppointmentDuration.setValue(90);
    component.settingsForm.controls.defaultAppointmentDuration.markAsDirty();
    component.brandingForm.controls.primaryColor.setValue('#7C3AED');
    component.brandingForm.controls.primaryColor.markAsTouched();

    selectedOrganizationId.set('organization-b');
    switchGeneration.set(2);
    fixture.detectChanges();
    selectedOrganizationId.set('organization-c');
    switchGeneration.set(3);
    fixture.detectChanges();

    publishConfiguration(
      createSettings({ persistedDefaultAppointmentDuration: 45, defaultAppointmentDuration: 45 }),
      createBranding({ primaryColor: '#2563EB' }),
      'organization-b',
      2,
    );
    fixture.detectChanges();
    expect(component.settingsForm.controls.defaultAppointmentDuration.value).toBeNull();
    expect(component.brandingForm.controls.primaryColor.value).toBeNull();

    publishConfiguration(
      createSettings({ persistedDefaultAppointmentDuration: 60, defaultAppointmentDuration: 60 }),
      createBranding({ primaryColor: '#2563EB' }),
      'organization-a',
      1,
    );
    fixture.detectChanges();
    expect(component.settingsForm.controls.defaultAppointmentDuration.value).toBeNull();

    publishConfiguration(
      createSettings({ persistedDefaultAppointmentDuration: 30, defaultAppointmentDuration: 30 }),
      createBranding({ primaryColor: '#7C3AED' }),
      'organization-c',
      3,
    );
    fixture.detectChanges();
    expect(component.settingsForm.controls.defaultAppointmentDuration.value).toBe(30);
    expect(component.brandingForm.controls.primaryColor.value).toBe('#7C3AED');
    expect(component.settingsForm.pristine).toBe(true);
    expect(component.brandingForm.untouched).toBe(true);
  });

  it('replaces in-flight dirty drafts with successful conflict reconciliation responses', () => {
    currentLoad.next(createOrganization());
    publishConfiguration(
      createSettings({ persistedDefaultAppointmentDuration: 45, defaultAppointmentDuration: 45 }),
      createBranding({ primaryColor: '#2563EB' }),
    );
    fixture.detectChanges();
    component.settingsForm.controls.defaultAppointmentDuration.setValue(90);
    component.settingsForm.controls.defaultAppointmentDuration.markAsDirty();
    component.brandingForm.controls.primaryColor.setValue('#7C3AED');
    component.brandingForm.controls.primaryColor.markAsDirty();

    publishConfiguration(
      createSettings({
        rowState: 'PRESENT',
        updatedAt: 'settings-v2',
        persistedDefaultAppointmentDuration: 30,
        defaultAppointmentDuration: 30,
      }),
      createBranding({ rowState: 'PRESENT', updatedAt: 'branding-v2', primaryColor: '#2563EB' }),
    );
    configurationStore.settingsError.set('Se cargó la versión más reciente; revísala.');
    configurationStore.brandingError.set('Se cargó la versión más reciente; revísala.');
    fixture.detectChanges();

    expect(component.settingsForm.controls.defaultAppointmentDuration.value).toBe(30);
    expect(component.brandingForm.controls.primaryColor.value).toBe('#2563EB');
    expect(component.settingsForm.pristine).toBe(true);
    expect(component.brandingForm.pristine).toBe(true);
  });

  it('shows reconciliation reload failure without stale success language', () => {
    currentLoad.next(createOrganization());
    configurationStore.settingsState.set('ERROR');
    configurationStore.settingsSuccess.set('');
    configurationStore.settingsError.set(
      'La configuración cambió, pero no fue posible cargar la versión más reciente. Reintenta antes de guardar.',
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'no fue posible cargar la versión más reciente',
    );
    expect(fixture.nativeElement.textContent).not.toContain(
      'La duración predeterminada se actualizó',
    );
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
    expect(tenantStore.synchronizeCanonicalContext).toHaveBeenCalledWith(
      1,
      'organization-a',
      false,
    );
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
    [409, 'conflicto'],
  ])('keeps update failure %i visible and recoverable', (status, message) => {
    currentLoad.next(createOrganization());
    component.form.controls.displayName.setValue('Changed');
    const update = new Subject<OrganizationDetails>();
    organizationsService.update.mockReturnValue(update.asObservable());

    component.save();
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
    expect(tenantStore.synchronizeCanonicalContext).toHaveBeenCalledWith(1, 'organization-a', true);
  });

  it('uses current tenant identity rather than the obsolete context version after lifecycle success', async () => {
    currentLoad.next(createOrganization());
    const statusChange = new Subject<OrganizationDetails>();
    organizationsService.changeStatus.mockReturnValue(statusChange.asObservable());

    component.openStatusConfirmation();
    dialogClosed.next(true);
    statusChange.next(createOrganization({ status: 'SUSPENDED' }));
    await Promise.resolve();

    expect(tenantStore.synchronizeCanonicalContext).toHaveBeenCalledWith(1, 'organization-a', true);
  });

  it('keeps lifecycle controls locked until canonical context synchronization finishes', async () => {
    currentLoad.next(createOrganization());
    let finishSynchronization: ((result: string) => void) | undefined;
    tenantStore.synchronizeCanonicalContext.mockReturnValue(
      new Promise((resolve) => {
        finishSynchronization = resolve;
      }),
    );
    organizationsService.changeStatus.mockReturnValue(
      of(createOrganization({ status: 'SUSPENDED' })),
    );

    component.openStatusConfirmation();
    dialogClosed.next(true);
    component.openStatusConfirmation();

    expect(component.isChangingStatus()).toBe(true);
    expect(dialog.open).toHaveBeenCalledOnce();

    finishSynchronization?.('synchronized');
    await vi.waitFor(() => expect(component.isChangingStatus()).toBe(false));
  });

  it('reconciles a canonical external suspension before leaving operations available', () => {
    currentLoad.next(createOrganization({ status: 'SUSPENDED' }));

    expect(tenantStore.synchronizeCanonicalContext).toHaveBeenCalledWith(1, 'organization-a', true);
  });

  it('reconciles external reactivation without restoring capabilities locally', () => {
    canonicalContextStatus = 'SUSPENDED';
    currentLoad.next(createOrganization({ status: 'ACTIVE' }));

    expect(tenantStore.synchronizeCanonicalContext).toHaveBeenCalledWith(1, 'organization-a', true);
    expect(tenantStore.hasCapability).not.toHaveBeenCalledWith('patient.read');
  });

  it('uses safe conflict copy that covers concurrency and slug uniqueness', () => {
    currentLoad.next(createOrganization());
    component.form.controls.slug.setValue('duplicate-slug');
    const update = new Subject<OrganizationDetails>();
    organizationsService.update.mockReturnValue(update.asObservable());

    component.save();
    update.error(new HttpErrorResponse({ status: 409 }));

    expect(component.errorMessage()).toContain('conflicto');
    expect(component.errorMessage()).toContain('identificador');
    expect(component.errorMessage()).not.toContain('cambió mientras trabajabas');
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
    selectedOrganizationId.set('organization-b');
    switchGeneration.set(2);

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

    selectedOrganizationId.set('organization-b');
    switchGeneration.set(2);
    update.next(createOrganization({ displayName: 'Late A' }));

    expect(component.organization()?.displayName).toBe('Practice A');
    expect(tenantStore.synchronizeCanonicalContext).not.toHaveBeenCalled();
  });

  function publishConfiguration(
    settings: OrganizationSettingsResponse,
    branding: OrganizationBrandingResponse,
    organizationId = 'organization-a',
    generation = 1,
  ): void {
    configurationStore.settings.set(settings);
    configurationStore.settingsOwner.set({ organizationId, generation });
    configurationStore.branding.set(branding);
    configurationStore.brandingOwner.set({ organizationId, generation });
    configurationStore.settingsState.set('LOADED');
    configurationStore.brandingState.set('LOADED');
  }

  function publishLogo(logo: OrganizationLogoResponse): void {
    logoStore.logo.set(logo);
    logoStore.state.set(logo.rowState);
  }
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

function createSettings(
  overrides: Partial<OrganizationSettingsResponse> = {},
): OrganizationSettingsResponse {
  return {
    rowState: 'ABSENT',
    updatedAt: null,
    defaultAppointmentDuration: 60,
    persistedDefaultAppointmentDuration: null,
    ...overrides,
  };
}

function createBranding(
  overrides: Partial<OrganizationBrandingResponse> = {},
): OrganizationBrandingResponse {
  return { rowState: 'ABSENT', updatedAt: null, primaryColor: null, ...overrides };
}

function absentLogo(): OrganizationLogoResponse {
  return {
    rowState: 'ABSENT',
    updatedAt: null,
    mimeType: null,
    byteSize: null,
    width: null,
    height: null,
  };
}

function presentLogo(
  overrides: Partial<Extract<OrganizationLogoResponse, { rowState: 'PRESENT' }>> = {},
): Extract<OrganizationLogoResponse, { rowState: 'PRESENT' }> {
  return {
    rowState: 'PRESENT',
    updatedAt: 'v1',
    mimeType: 'image/png',
    byteSize: 1024,
    width: 64,
    height: 64,
    ...overrides,
  };
}
