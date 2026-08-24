import { FormBuilder } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthService } from './auth.service';
import { ForgotPasswordPage } from './forgot-password.page';

describe('ForgotPasswordPage', () => {
  let page: ForgotPasswordPage;
  let authService: { forgotPassword: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authService = { forgotPassword: vi.fn() };

    TestBed.configureTestingModule({
      imports: [ForgotPasswordPage],
      providers: [
        FormBuilder,
        { provide: AuthService, useValue: authService },
        { provide: ActivatedRoute, useValue: {} },
      ],
    });

    page = TestBed.runInInjectionContext(() => new ForgotPasswordPage());
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('submits valid email and displays confirmation state', () => {
    authService.forgotPassword.mockReturnValue(
      of({ success: true, message: 'Instrucciones enviadas' }),
    );
    page.forgotPasswordForm.setValue({ email: 'rivera@example.com' });

    page.submit();

    expect(authService.forgotPassword).toHaveBeenCalledWith('rivera@example.com');
    expect(page.isLoading()).toBe(false);
    expect(page.isSubmitted()).toBe(true);
    expect(page.submittedEmail()).toBe('rivera@example.com');
  });

  it('handles error when forgot-password fails', () => {
    authService.forgotPassword.mockReturnValue(
      throwError(() => new Error('Server error')),
    );
    page.forgotPasswordForm.setValue({ email: 'rivera@example.com' });

    page.submit();

    expect(authService.forgotPassword).toHaveBeenCalledWith('rivera@example.com');
    expect(page.isLoading()).toBe(false);
    expect(page.isSubmitted()).toBe(false);
    expect(page.errorMessage()).toContain('No fue posible');
  });

  it('does not submit invalid form', () => {
    page.submit();

    expect(authService.forgotPassword).not.toHaveBeenCalled();
    expect(page.forgotPasswordForm.touched).toBe(true);
  });

  it('resets confirmation state when requested', () => {
    page.isSubmitted.set(true);
    page.submittedEmail.set('rivera@example.com');

    page.reset();

    expect(page.isSubmitted()).toBe(false);
    expect(page.forgotPasswordForm.controls.email.value).toBe('');
  });

  it('exposes navigation to login', () => {
    expect(page.loginRoute).toBe('/login');
  });

  it('renders split screen with brand panel and recovery card', () => {
    const fixture = TestBed.createComponent(ForgotPasswordPage);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-auth-brand-panel')).toBeTruthy();
    expect(el.querySelector('.auth-card__eyebrow')?.textContent?.trim()).toContain('PsiqueOS');
    expect(el.querySelector('.auth-card__title')?.textContent?.trim()).toBe('Recupera tu acceso');
  });
});
