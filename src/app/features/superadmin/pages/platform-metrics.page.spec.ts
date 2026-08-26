import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlatformMetricsResponse } from '../models/superadmin.models';
import { SuperadminTenantsService } from '../services/superadmin-tenants.service';
import { PlatformMetricsPage } from './platform-metrics.page';

describe('PlatformMetricsPage', () => {
  let component: PlatformMetricsPage;
  let fixture: ComponentFixture<PlatformMetricsPage>;
  let mockSuperadminService: {
    getPlatformMetrics: ReturnType<typeof vi.fn>;
  };

  const mockMetrics: PlatformMetricsResponse = {
    status: 'HEALTHY',
    uptimeSeconds: 90065,
    serverTimestamp: '2026-08-26T05:00:00.000Z',
    environment: 'production',
    databaseStatus: 'ONLINE',
    tenants: {
      total: 12,
      active: 10,
      suspended: 2,
      trialing: 4,
      lifetime: 3,
      activeSubscriptions: 3,
    },
    aggregates: {
      totalPatients: 145,
      totalAppointments: 530,
      totalUsers: 28,
    },
    memory: {
      heapUsedMB: 75,
      heapTotalMB: 120,
      rssMB: 160,
    },
  };

  beforeEach(async () => {
    mockSuperadminService = {
      getPlatformMetrics: vi.fn(() => of(mockMetrics)),
    };

    await TestBed.configureTestingModule({
      imports: [PlatformMetricsPage],
      providers: [
        {
          provide: SuperadminTenantsService,
          useValue: mockSuperadminService,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlatformMetricsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads and renders platform metrics on initialization', () => {
    expect(mockSuperadminService.getPlatformMetrics).toHaveBeenCalled();
    expect(component.metrics()).toEqual(mockMetrics);
    expect(fixture.nativeElement.textContent).toContain('Métricas & Salud de Infraestructura');
    expect(fixture.nativeElement.textContent).toContain('HEALTHY');
    expect(fixture.nativeElement.textContent).toContain('12');
    expect(fixture.nativeElement.textContent).toContain('145');
  });

  it('formats uptime correctly into days, hours, minutes, seconds', () => {
    expect(component.formatUptime(90065)).toContain('1d 1h 1m 5s');
    expect(component.formatUptime(45)).toBe('45s');
    expect(component.formatUptime(3665)).toBe('1h 1m 5s');
  });

  it('handles error when loading metrics', () => {
    mockSuperadminService.getPlatformMetrics.mockReturnValue(
      throwError(() => ({ error: { message: 'Network offline' } })),
    );

    component.loadMetrics();
    fixture.detectChanges();

    expect(component.errorMessage()).toContain('Network offline');
    expect(component.isLoading()).toBe(false);
  });
});
