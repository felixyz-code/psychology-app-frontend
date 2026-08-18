import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { AuthService } from './auth.service';
import { LoginPage } from './login.page';
import { TenantContextStore } from '../tenant-context/tenant-context.store';

describe('LoginPage', () => {
  const credentials = {
    email: 'rivera@example.com',
    password: 'secret-password',
  };

  let page: LoginPage;
  let authService: { login: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };
  let tenantContextStore: {
    isActiveTenantReady: ReturnType<typeof vi.fn>;
    isAdminSuspendedContext: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    authService = { login: vi.fn() };
    router = { navigate: vi.fn(() => Promise.resolve(true)) };
    tenantContextStore = {
      isActiveTenantReady: vi.fn(() => true),
      isAdminSuspendedContext: vi.fn(() => false),
    };

    TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        FormBuilder,
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: {} },
        { provide: TenantContextStore, useValue: tenantContextStore },
      ],
    });

    page = TestBed.runInInjectionContext(() => new LoginPage());
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('submits valid credentials and navigates to the dashboard after login succeeds', () => {
    authService.login.mockReturnValue(of({ accessToken: 'token', user: {} }));
    page.loginForm.setValue(credentials);

    page.submit();

    expect(authService.login).toHaveBeenCalledWith(credentials);
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(page.isLoading()).toBe(false);
  });

  it('keeps the login error observable and does not navigate when login fails', () => {
    authService.login.mockReturnValue(throwError(() => new Error('Invalid credentials')));
    page.loginForm.setValue(credentials);

    page.submit();

    expect(router.navigate).not.toHaveBeenCalled();
    expect(page.errorMessage()).toBe('Correo o contraseña incorrectos.');
    expect(page.isLoading()).toBe(false);
  });

  it('does not submit an invalid form', () => {
    page.submit();

    expect(authService.login).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(page.loginForm.touched).toBe(true);
  });

  it('exposes signup navigation without raw location changes', () => {
    expect(page.signupRoute).toBe('/signup');
  });

  it('renders the product eyebrow and one login task heading', () => {
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    expect(nativeElement.querySelector('.login-card__eyebrow')?.textContent?.trim()).toBe(
      'Psicologia App',
    );
    const headings = nativeElement.querySelectorAll('h1');
    expect(headings).toHaveLength(1);
    expect(headings[0].textContent?.trim()).toBe('Inicia sesión');
  });
});
