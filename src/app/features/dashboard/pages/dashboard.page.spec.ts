import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { TenantContextStore } from '../../../core/tenant-context/tenant-context.store';
import { DashboardSnapshot, DashboardViewModel } from '../models/dashboard-analytics.models';
import { DashboardAnalyticsService } from '../services/dashboard-analytics.service';
import { PatientsService } from '../../patients/services/patients.service';
import { DashboardPage } from './dashboard.page';

describe('DashboardPage finance capabilities', () => {
  let fixture: ComponentFixture<DashboardPage>;
  let capabilities: WritableSignal<string[]>;
  let navigate: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    capabilities = signal(['finance.read', 'finance.summary_read']);
    navigate = vi.fn(() => Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        {
          provide: DashboardAnalyticsService,
          useValue: { loadDashboardData: () => of(dashboardResult()) },
        },
        { provide: MatDialog, useValue: { open: vi.fn() } },
        { provide: PatientsService, useValue: { getPatients: vi.fn(() => of([])) } },
        { provide: Router, useValue: { navigate } },
        {
          provide: TenantContextStore,
          useValue: {
            hasCapability: (capability: string) => capabilities().includes(capability),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('omits inaccessible financial presentation and navigation', () => {
    capabilities.set([]);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).not.toContain('Balance del mes');
    expect(text).not.toContain('Resumen financiero');
    expect(text).not.toContain('Ir a finanzas');
  });

  it('removes stale financial affordances when current tenant capabilities change', () => {
    expect(fixture.nativeElement.textContent).toContain('Balance del mes');
    expect(fixture.nativeElement.textContent).toContain('Resumen financiero');
    expect(fixture.nativeElement.textContent).toContain('Ir a finanzas');

    capabilities.set([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Balance del mes');
    expect(fixture.nativeElement.textContent).not.toContain('Resumen financiero');
    expect(fixture.nativeElement.textContent).not.toContain('Ir a finanzas');

    fixture.componentInstance.navigateToFinance();
    fixture.componentInstance.handleQuickAction('open-finance');
    expect(navigate).not.toHaveBeenCalled();
  });
});

function dashboardResult(): { snapshot: DashboardSnapshot; viewModel: DashboardViewModel } {
  return {
    snapshot: {
      patients: [],
      appointments: [],
      caseFiles: [],
      sessionNotes: [],
      documents: [],
      financialSummary: null,
      failedSources: [],
      generatedAt: '2026-07-02T18:00:00.000Z',
    },
    viewModel: {
      generatedAt: '2026-07-02T18:00:00.000Z',
      currentDateLabel: 'jueves, 2 de julio de 2026',
      kpiStrip: [
        {
          id: 'monthly-balance',
          icon: 'account_balance_wallet',
          label: 'Balance del mes',
          value: '$1,000.00',
          supportingText: 'Balance mensual.',
          variant: 'violet',
        },
      ],
      agendaToday: emptyAgenda('Agenda de hoy'),
      upcomingAppointments: emptyAgenda('Proximas citas'),
      financeSummary: {
        title: 'Resumen financiero',
        subtitle: 'Resumen mensual.',
        metrics: [],
        periodLabel: 'Mes en curso',
        emptyTitle: 'Sin resumen',
        emptyMessage: 'Sin datos.',
      },
      financeNavigationAvailable: true,
      clinicalActivity: {
        title: 'Actividad clinica',
        subtitle: 'Actividad reciente.',
        items: [],
        emptyTitle: 'Sin actividad',
        emptyMessage: 'Sin datos.',
      },
      operationalAlerts: {
        title: 'Alertas operativas',
        subtitle: 'Alertas recientes.',
        items: [],
        emptyTitle: 'Sin alertas',
        emptyMessage: 'Sin datos.',
      },
      quickActions: {
        title: 'Acciones rapidas',
        subtitle: 'Accesos frecuentes.',
        items: [
          { id: 'open-finance', icon: 'payments', label: 'Ir a finanzas', variant: 'secondary' },
        ],
      },
      warnings: [],
    },
  };
}

function emptyAgenda(title: string): DashboardViewModel['agendaToday'] {
  return {
    title,
    subtitle: 'Agenda.',
    items: [],
    totalCount: 0,
    emptyTitle: 'Sin citas',
    emptyMessage: 'Sin datos.',
  };
}
