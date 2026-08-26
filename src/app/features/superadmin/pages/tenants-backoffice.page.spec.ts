import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminTenantItem } from '../models/superadmin.models';
import { SuperadminTenantsService } from '../services/superadmin-tenants.service';
import { TenantsBackofficePage } from './tenants-backoffice.page';

describe('TenantsBackofficePage', () => {
  let component: TenantsBackofficePage;
  let fixture: ComponentFixture<TenantsBackofficePage>;
  let mockService: {
    listTenants: ReturnType<typeof vi.fn>;
    extendTrial: ReturnType<typeof vi.fn>;
    grantLifetime: ReturnType<typeof vi.fn>;
    updateQuotas: ReturnType<typeof vi.fn>;
    freezeTenant: ReturnType<typeof vi.fn>;
  };
  let mockDialog: {
    open: ReturnType<typeof vi.fn>;
  };
  let mockSnackBar: {
    open: ReturnType<typeof vi.fn>;
  };

  const mockTenants: AdminTenantItem[] = [
    {
      id: 'org-1',
      slug: 'org-alpha',
      displayName: 'Clínica Alpha',
      legalName: 'Alpha SC',
      status: 'ACTIVE',
      timezone: 'America/Hermosillo',
      createdAt: '2026-01-01T00:00:00Z',
      subscription: {
        id: 'sub-1',
        status: 'LIFETIME_SPONSOR',
        planTier: 'ENTERPRISE',
        planCode: 'enterprise-allied',
        planName: 'Enterprise Patrocinado',
        isExempt: true,
        sponsorNotes: 'Convenio Red Psicológica Sonora',
        customTherapistsLimit: 20,
        customPatientsLimit: 500,
        customBranchesLimit: 3,
      },
      usage: {
        therapistsCount: 5,
        patientsCount: 40,
        branchesCount: 2,
        therapistsLimit: 20,
        patientsLimit: 500,
        branchesLimit: 3,
      },
    },
    {
      id: 'org-2',
      slug: 'org-beta',
      displayName: 'Consultorio Beta',
      legalName: 'Beta SA',
      status: 'ACTIVE',
      timezone: 'America/Mexico_City',
      createdAt: '2026-02-01T00:00:00Z',
      subscription: {
        id: 'sub-2',
        status: 'TRIALING',
        planTier: 'PROFESSIONAL',
        planCode: 'pro-monthly',
        planName: 'Plan Profesional',
        trialEndsAt: '2026-09-01T00:00:00Z',
        isExempt: false,
      },
      usage: {
        therapistsCount: 1,
        patientsCount: 10,
        branchesCount: 1,
        therapistsLimit: 1,
        patientsLimit: 50,
        branchesLimit: 1,
      },
    },
  ];

  beforeEach(async () => {
    mockService = {
      listTenants: vi.fn(() => of(mockTenants)),
      extendTrial: vi.fn(() => of({})),
      grantLifetime: vi.fn(() => of({})),
      updateQuotas: vi.fn(() => of({})),
      freezeTenant: vi.fn(() => of({ success: true, isFrozen: true, message: 'Ok' })),
    };

    mockDialog = {
      open: vi.fn(() => ({
        afterClosed: vi.fn(() => of(true)),
      })),
    };

    mockSnackBar = {
      open: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [TenantsBackofficePage],
      providers: [
        { provide: SuperadminTenantsService, useValue: mockService },
        { provide: MatDialog, useValue: mockDialog },
        { provide: MatSnackBar, useValue: mockSnackBar },
      ],
    })
      .overrideComponent(TenantsBackofficePage, {
        set: {
          providers: [
            { provide: MatDialog, useValue: mockDialog },
            { provide: MatSnackBar, useValue: mockSnackBar },
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(TenantsBackofficePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads tenants and calculates statistics', () => {
    expect(mockService.listTenants).toHaveBeenCalled();
    expect(component.tenants()).toHaveLength(2);
    expect(component.stats()).toEqual({
      total: 2,
      lifetime: 1,
      trialing: 1,
      active: 0,
      frozen: 0,
    });
  });

  it('filters tenants by search query', () => {
    component.searchQuery.set('Alpha');
    expect(component.filteredTenants()).toHaveLength(1);
    expect(component.filteredTenants()[0].displayName).toBe('Clínica Alpha');

    component.searchQuery.set('NonExistent');
    expect(component.filteredTenants()).toHaveLength(0);
  });

  it('filters tenants by status', () => {
    component.statusFilter.set('LIFETIME');
    expect(component.filteredTenants()).toHaveLength(1);
    expect(component.filteredTenants()[0].id).toBe('org-1');

    component.statusFilter.set('TRIAL');
    expect(component.filteredTenants()).toHaveLength(1);
    expect(component.filteredTenants()[0].id).toBe('org-2');
  });

  it('opens extend trial dialog and reloads upon confirmation', () => {
    component.openExtendTrial(mockTenants[1]);

    expect(mockDialog.open).toHaveBeenCalled();
    expect(mockSnackBar.open).toHaveBeenCalledWith(
      'Periodo de prueba extendido exitosamente.',
      'Cerrar',
      expect.any(Object),
    );
    expect(mockService.listTenants).toHaveBeenCalledTimes(2);
  });

  it('opens grant lifetime dialog and reloads upon confirmation', () => {
    component.openGrantLifetime(mockTenants[1]);

    expect(mockDialog.open).toHaveBeenCalled();
    expect(mockSnackBar.open).toHaveBeenCalledWith(
      'Membresía vitalicia otorgada correctamente.',
      'Cerrar',
      expect.any(Object),
    );
  });

  it('opens adjust quotas dialog and reloads upon confirmation', () => {
    component.openAdjustQuotas(mockTenants[0]);

    expect(mockDialog.open).toHaveBeenCalled();
    expect(mockSnackBar.open).toHaveBeenCalledWith(
      'Cuotas personalizadas actualizadas.',
      'Cerrar',
      expect.any(Object),
    );
  });

  it('opens freeze tenant dialog and reloads upon confirmation', () => {
    component.openFreezeTenant(mockTenants[0]);

    expect(mockDialog.open).toHaveBeenCalled();
    expect(mockSnackBar.open).toHaveBeenCalled();
  });

  it('handles error state gracefully when list fails', () => {
    mockService.listTenants.mockReturnValue(
      throwError(() => ({ error: { message: 'Network Failure' } })),
    );

    component.loadTenants();

    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toBe('Network Failure');
  });
});
