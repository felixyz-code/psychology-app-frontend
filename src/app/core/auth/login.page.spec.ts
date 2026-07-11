import { Router } from '@angular/router';
import { FormBuilder } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { AuthService } from './auth.service';
import { LoginPage } from './login.page';

describe('LoginPage', () => {
  const credentials = {
    email: 'rivera@example.com',
    password: 'secret-password',
  };

  let page: LoginPage;
  let authService: { login: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authService = { login: vi.fn() };
    router = { navigate: vi.fn(() => Promise.resolve(true)) };

    TestBed.configureTestingModule({
      providers: [
        FormBuilder,
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
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
});
