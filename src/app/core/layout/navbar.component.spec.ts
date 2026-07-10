import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';

import { AuthUser } from '../auth/auth.models';
import { AuthService } from '../auth/auth.service';
import { AuthStore } from '../auth/auth.store';
import { ThemeService } from '../theme/theme.service';
import { NavbarComponent } from './navbar.component';

const user: AuthUser = {
  id: 'user-1',
  name: 'Dra. Rivera',
  email: 'rivera@example.com',
  role: 'PSYCHOLOGIST',
};

describe('NavbarComponent', () => {
  let component: NavbarComponent;
  let store: AuthStore;
  let authService: { logout: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();

    authService = { logout: vi.fn() };
    router = { navigate: vi.fn(() => Promise.resolve(true)) };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
        { provide: ThemeService, useValue: {} },
      ],
    });

    store = TestBed.inject(AuthStore);
    authService.logout.mockImplementation(() => store.clearSession());
    component = TestBed.runInInjectionContext(() => new NavbarComponent());
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('clears the authenticated session and navigates to login on logout', () => {
    store.setSession('active-token', user);

    component.logout();

    expect(authService.logout).toHaveBeenCalledOnce();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    expect(store.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('psychology_app_access_token')).toBeNull();
    expect(localStorage.getItem('psychology_app_auth_user')).toBeNull();
  });
});
