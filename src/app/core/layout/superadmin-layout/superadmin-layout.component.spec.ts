import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../auth/auth.service';
import { AuthStore } from '../../auth/auth.store';
import { SuperAdminLayoutComponent } from './superadmin-layout.component';

describe('SuperAdminLayoutComponent', () => {
  let component: SuperAdminLayoutComponent;
  let fixture: ComponentFixture<SuperAdminLayoutComponent>;
  let mockAuthStore: {
    user: ReturnType<typeof vi.fn>;
    isSuperAdmin: ReturnType<typeof vi.fn>;
  };
  let mockAuthService: {
    logout: ReturnType<typeof vi.fn>;
  };
  let router: Router;

  beforeEach(async () => {
    mockAuthStore = {
      user: vi.fn(() => ({
        id: 'super-1',
        name: 'Platform Root Admin',
        email: 'superadmin@psiqueos.app',
        role: 'SUPERADMIN',
        isSuperAdmin: true,
      })),
      isSuperAdmin: vi.fn(() => true),
    };

    mockAuthService = {
      logout: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [SuperAdminLayoutComponent],
      providers: [
        provideRouter([]),
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SuperAdminLayoutComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('renders platform governance header and brand', () => {
    expect(fixture.nativeElement.textContent).toContain('Platform Suite Governance');
    expect(fixture.nativeElement.textContent).toContain('SUPERADMIN');
    expect(fixture.nativeElement.textContent).toContain('Platform Root Admin');
  });

  it('renders dedicated platform navigation links', () => {
    expect(fixture.nativeElement.textContent).toContain('Organizaciones');
    expect(fixture.nativeElement.textContent).toContain('Auditoría Global');
    expect(fixture.nativeElement.textContent).toContain('Métricas & Salud');
  });

  it('toggles sidebar collapse state', () => {
    expect(component.sidebarCollapsed()).toBe(false);
    component.toggleSidebar();
    expect(component.sidebarCollapsed()).toBe(true);
  });

  it('logs out and redirects to /login', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.logout();

    expect(mockAuthService.logout).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });
});
