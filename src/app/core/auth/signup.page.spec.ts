import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { TenantContextState } from '../tenant-context/tenant-context.models';
import { TenantContextStore } from '../tenant-context/tenant-context.store';
import { FreelancerBootstrapResponse } from './auth.models';
import { AuthService } from './auth.service';
import { SignupPage, utf8ByteLength } from './signup.page';

const bootstrapResponse: FreelancerBootstrapResponse = {
  accessToken: 'bootstrap-token',
  user: {
    id: 'user-new',
    name: 'Dra. Nueva',
    email: 'new@example.com',
    role: 'PSYCHOLOGIST',
  },
  organization: {
    id: 'organization-new',
    slug: 'consulta-nueva',
    legalName: 'Consulta Nueva',
    displayName: 'Consulta Nueva',
    status: 'ACTIVE',
    timezone: 'UTC',
    locale: 'es-MX',
    currency: 'MXN',
    createdAt: '2026-08-11T00:00:00.000Z',
    updatedAt: '2026-08-11T00:00:00.000Z',
  },
  membership: {
    id: 'membership-new',
    userId: 'user-new',
    organizationId: 'organization-new',
    role: 'OWNER',
    status: 'ACTIVE',
    createdAt: '2026-08-11T00:00:00.000Z',
    updatedAt: '2026-08-11T00:00:00.000Z',
  },
};

const validForm = {
  name: 'Dra. Nueva',
  email: 'new@example.com',
  organizationName: 'Consulta Nueva',
  password: 'abcdefghijkl',
  confirmPassword: 'abcdefghijkl',
};

describe('SignupPage', () => {
  let page: SignupPage;
  let authService: { freelancerBootstrap: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };
  let tenantContextStore: {
    state: ReturnType<typeof vi.fn>;
    refreshContext: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    authService = { freelancerBootstrap: vi.fn() };
    router = { navigate: vi.fn(() => Promise.resolve(true)) };
    tenantContextStore = {
      state: vi.fn(() => 'ACTIVE_TENANT_READY' as TenantContextState),
      refreshContext: vi.fn(() => Promise.resolve()),
    };

    TestBed.configureTestingModule({
      providers: [
        FormBuilder,
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
        { provide: TenantContextStore, useValue: tenantContextStore },
      ],
    });

    page = TestBed.runInInjectionContext(() => new SignupPage());
  });

  afterEach(() => TestBed.resetTestingModule());

  it('requires every field and rejects presentation fields containing only whitespace', () => {
    page.signupForm.setValue({
      name: '   ',
      email: '',
      organizationName: '\t',
      password: '',
      confirmPassword: '',
    });

    expect(page.signupForm.controls.name.hasError('trimmedRequired')).toBe(true);
    expect(page.signupForm.controls.email.hasError('trimmedRequired')).toBe(true);
    expect(page.signupForm.controls.organizationName.hasError('trimmedRequired')).toBe(true);
    expect(page.signupForm.controls.password.hasError('required')).toBe(true);
    expect(page.signupForm.controls.confirmPassword.hasError('required')).toBe(true);
  });

  it('enforces trimmed email validity, ASCII, and presentation length limits', () => {
    page.signupForm.controls.name.setValue('n'.repeat(151));
    page.signupForm.controls.email.setValue('usuário@example.com');
    page.signupForm.controls.organizationName.setValue('o'.repeat(256));

    expect(page.signupForm.controls.name.hasError('maxlength')).toBe(true);
    expect(page.signupForm.controls.email.hasError('asciiOnly')).toBe(true);
    expect(page.signupForm.controls.organizationName.hasError('maxlength')).toBe(true);

    page.signupForm.controls.email.setValue('not-an-email');
    expect(page.signupForm.controls.email.hasError('email')).toBe(true);

    page.signupForm.controls.email.setValue(`${'a'.repeat(244)}@example.com`);
    expect(page.signupForm.controls.email.hasError('maxlength')).toBe(true);
  });

  it('accepts the exact name, email, and organization maximum lengths', () => {
    page.signupForm.controls.name.setValue('n'.repeat(150));
    page.signupForm.controls.email.setValue(`${'a'.repeat(243)}@example.com`);
    page.signupForm.controls.organizationName.setValue('o'.repeat(255));

    expect(page.signupForm.controls.name.hasError('maxlength')).toBe(false);
    expect(page.signupForm.controls.email.value.length).toBe(255);
    expect(page.signupForm.controls.email.hasError('maxlength')).toBe(false);
    expect(page.signupForm.controls.organizationName.hasError('maxlength')).toBe(false);
  });

  it('enforces the password character minimum and UTF-8 byte maximum at both boundaries', () => {
    const control = page.signupForm.controls.password;

    control.setValue('a'.repeat(11));
    expect(control.hasError('minlength')).toBe(true);

    control.setValue('a'.repeat(12));
    expect(control.valid).toBe(true);

    control.setValue('a'.repeat(72));
    expect(control.hasError('utf8MaxBytes')).toBe(false);

    control.setValue('a'.repeat(73));
    expect(control.hasError('utf8MaxBytes')).toBe(true);

    const unicodeBoundary = `${'a'.repeat(10)}${'é'.repeat(31)}`;
    expect(utf8ByteLength(unicodeBoundary)).toBe(72);
    control.setValue(unicodeBoundary);
    expect(control.hasError('utf8MaxBytes')).toBe(false);

    control.setValue(`${unicodeBoundary}é`);
    expect(utf8ByteLength(control.value)).toBe(74);
    expect(control.hasError('utf8MaxBytes')).toBe(true);
  });

  it('requires an exact password confirmation and never trims password values', () => {
    page.signupForm.patchValue({
      password: ' 1234567890 ',
      confirmPassword: ' 1234567890',
    });
    expect(page.signupForm.hasError('passwordMismatch')).toBe(true);

    page.signupForm.controls.confirmPassword.setValue(' 1234567890 ');
    expect(page.signupForm.hasError('passwordMismatch')).toBe(false);
    expect(page.signupForm.controls.password.value).toBe(' 1234567890 ');
  });

  it('trims identity fields but sends the exact backend body without confirmPassword', () => {
    authService.freelancerBootstrap.mockReturnValue(of(bootstrapResponse));
    page.signupForm.setValue({
      ...validForm,
      name: '  Dra. Nueva  ',
      email: '  new@example.com ',
      organizationName: ' Consulta Nueva ',
      password: ' 1234567890 ',
      confirmPassword: ' 1234567890 ',
    });

    page.submit();

    expect(authService.freelancerBootstrap).toHaveBeenCalledWith({
      name: 'Dra. Nueva',
      email: 'new@example.com',
      organizationName: 'Consulta Nueva',
      password: ' 1234567890 ',
    });
  });

  it('locks a non-idempotent submission before the first response settles', () => {
    const pending = new Subject<FreelancerBootstrapResponse>();
    authService.freelancerBootstrap.mockReturnValue(pending);
    page.signupForm.setValue(validForm);

    page.submit();
    page.submit();

    expect(authService.freelancerBootstrap).toHaveBeenCalledOnce();
    expect(page.submissionLocked()).toBe(true);
    expect(page.isSubmitting()).toBe(true);
  });

  it('routes ACTIVE_TENANT_READY to the dashboard exactly once', () => {
    authService.freelancerBootstrap.mockReturnValue(of(bootstrapResponse));
    page.signupForm.setValue(validForm);

    page.submit();

    expect(router.navigate).toHaveBeenCalledOnce();
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(page.submissionLocked()).toBe(true);
  });

  it('routes AMBIGUOUS_SELECTION to organization selection without selecting the bootstrap organization', () => {
    tenantContextStore.state.mockReturnValue('AMBIGUOUS_SELECTION');
    authService.freelancerBootstrap.mockReturnValue(of(bootstrapResponse));
    page.signupForm.setValue(validForm);

    page.submit();

    expect(router.navigate).toHaveBeenCalledWith(['/organization-selection']);
    expect(tenantContextStore.refreshContext).not.toHaveBeenCalled();
  });

  it.each(['NO_ACTIVE_TENANT', 'ERROR', 'FORBIDDEN', 'ADMIN_SUSPENDED_CONTEXT'] as const)(
    'fails closed for canonical state %s after the account was created',
    (state) => {
      tenantContextStore.state.mockReturnValue(state);
      authService.freelancerBootstrap.mockReturnValue(of(bootstrapResponse));
      page.signupForm.setValue(validForm);

      page.submit();

      expect(router.navigate).not.toHaveBeenCalled();
      expect(page.accountCreated()).toBe(true);
      expect(page.submissionLocked()).toBe(true);
      expect(page.errorMessage()).toContain('Tu cuenta fue creada');
      expect(authService.freelancerBootstrap).toHaveBeenCalledOnce();
    },
  );

  it('retries tenant context only after partial success', async () => {
    tenantContextStore.state.mockReturnValueOnce('ERROR').mockReturnValue('ACTIVE_TENANT_READY');
    authService.freelancerBootstrap.mockReturnValue(of(bootstrapResponse));
    page.signupForm.setValue(validForm);
    page.submit();

    await page.retryContext();

    expect(tenantContextStore.refreshContext).toHaveBeenCalledOnce();
    expect(authService.freelancerBootstrap).toHaveBeenCalledOnce();
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it.each([
    [400, 'Revisa los datos', true],
    [404, 'no está disponible', false],
    [409, 'Si ya tienes una cuenta', false],
    [429, 'demasiados intentos', false],
    [0, 'No pudimos confirmar', false],
    [500, 'No fue posible completar', false],
  ] as const)(
    'maps HTTP %s to safe UX without automatic retry',
    (status, expectedMessage, unlocks) => {
      authService.freelancerBootstrap.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status,
              statusText: status === 0 ? 'Unknown Error' : 'Request failed',
            }),
        ),
      );
      page.signupForm.setValue(validForm);

      page.submit();

      expect(page.errorMessage()).toContain(expectedMessage);
      expect(page.submissionLocked()).toBe(!unlocks);
      expect(authService.freelancerBootstrap).toHaveBeenCalledOnce();
      expect(router.navigate).not.toHaveBeenCalled();

      if (status === 409) {
        expect(page.errorMessage().toLowerCase()).not.toContain('correo ya está registrado');
      }

      if (status === 404) {
        expect(page.errorMessage().toLowerCase()).not.toContain('feature flag');
        expect(page.errorMessage().toLowerCase()).not.toContain('bootstrap');
      }
    },
  );

  it('exposes login navigation for deliberate recovery', () => {
    expect(page.loginRoute).toBe('/login');
  });
});
