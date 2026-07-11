import { ReactiveFormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { PatientsService } from '../../patients/services/patients.service';
import { ReportResult } from '../models/report-result.model';
import { ReportsCatalogService } from '../services/reports-catalog.service';
import { ReportsExportService } from '../services/reports-export.service';
import { ReportsRunnerService } from '../services/reports-runner.service';
import { ReportRunnerPage } from './report-runner.page';

describe('ReportRunnerPage export feedback', () => {
  it('shows a recoverable error when the HTML print popup is blocked', () => {
    const exportAsPdf = vi.fn(() => false);
    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      providers: [
        ReportsCatalogService,
        { provide: ActivatedRoute, useValue: { snapshot: { data: { reportKey: 'financial' } } } },
        { provide: PatientsService, useValue: { getPatients: vi.fn(() => of([])) } },
        { provide: ReportsRunnerService, useValue: { runFinancialReport: vi.fn(() => of(createResult())) } },
        { provide: ReportsExportService, useValue: { exportAsPdf, exportAsCsv: vi.fn() } },
      ],
    });

    const page = TestBed.runInInjectionContext(() => new ReportRunnerPage());
    page.export('pdf');

    expect(exportAsPdf).toHaveBeenCalledTimes(1);
    expect(page.errorMessage()).toContain('bloqueando ventanas emergentes');
  });

  afterEach(() => TestBed.resetTestingModule());
});

function createResult(): ReportResult<unknown> {
  return {
    reportKey: 'financial',
    title: 'Reporte Financiero',
    generatedAt: '2026-07-01T00:00:00.000Z',
    pdfFileName: 'reporte-financiero.pdf',
    appliedFilters: {},
    contextItems: [],
    metrics: [],
    columns: [],
    rows: [],
    previewMode: 'table',
    groups: [],
    csvFileName: 'reporte-financiero.csv',
    supportedExports: ['pdf', 'csv'],
    emptyTitle: '',
    emptyMessage: '',
  };
}
