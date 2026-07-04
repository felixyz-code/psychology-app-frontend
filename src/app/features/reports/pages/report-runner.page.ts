import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Subscription, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { FilterToolbarComponent } from '../../../shared/components/filter-toolbar/filter-toolbar.component';
import { MetricCardComponent } from '../../../shared/components/metric-card/metric-card.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import {
  AppointmentStatus,
} from '../../appointments/models/appointment.models';
import {
  APPOINTMENT_STATUSES,
  getAppointmentStatusLabel,
} from '../../appointments/utils/appointment-presenters';
import {
  FinancialTransactionCategory,
  FinancialTransactionStatus,
  FinancialTransactionType,
  PaymentMethod,
} from '../../financial-transactions/models/financial-transaction.models';
import {
  FINANCIAL_TRANSACTION_CATEGORIES,
  FINANCIAL_TRANSACTION_STATUSES,
  FINANCIAL_TRANSACTION_TYPES,
  getFinancialTransactionCategoryLabel,
  getFinancialTransactionStatusLabel,
  getFinancialTransactionTypeLabel,
  getPaymentMethodLabel,
  PAYMENT_METHODS,
} from '../../financial-transactions/utils/financial-transaction-presenters';
import { Patient } from '../../patients/models/patient.models';
import { PatientsService } from '../../patients/services/patients.service';
import { ClinicalRecordReportFilters } from '../models/clinical-record-report.model';
import { ClinicalSummaryReportFilters } from '../models/clinical-summary-report.model';
import { ReportExportMenuComponent } from '../components/report-export-menu.component';
import { ReportFiltersPanelComponent } from '../components/report-filters-panel.component';
import { ReportPreviewShellComponent } from '../components/report-preview-shell.component';
import { ReportDefinition, ReportExportFormat, ReportKey } from '../models/report-definition.model';
import {
  AgendaReportFilters,
  FinancialReportFilters,
  ReportFilters,
} from '../models/report-filters.model';
import { ReportResult } from '../models/report-result.model';
import { ReportsCatalogService } from '../services/reports-catalog.service';
import { ReportsExportService } from '../services/reports-export.service';
import { ReportsRunnerService } from '../services/reports-runner.service';
import { buildCurrentMonthDateRange } from '../utils/report-date-range';

@Component({
  selector: 'app-report-runner-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    FilterToolbarComponent,
    MetricCardComponent,
    PageHeaderComponent,
    ReportExportMenuComponent,
    ReportFiltersPanelComponent,
    ReportPreviewShellComponent,
  ],
  templateUrl: './report-runner.page.html',
  styleUrl: './report-runner.page.scss',
})
export class ReportRunnerPage {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly patientsService = inject(PatientsService);
  private readonly reportsCatalogService = inject(ReportsCatalogService);
  private readonly reportsExportService = inject(ReportsExportService);
  private readonly reportsRunnerService = inject(ReportsRunnerService);
  private readonly reportKey = this.activatedRoute.snapshot.data['reportKey'] as ReportKey;
  private readonly defaultDateRange = buildCurrentMonthDateRange();
  private reportLoadSubscription?: Subscription;

  readonly transactionTypes: FinancialTransactionType[] = FINANCIAL_TRANSACTION_TYPES;
  readonly transactionStatuses: FinancialTransactionStatus[] = FINANCIAL_TRANSACTION_STATUSES;
  readonly transactionCategories: FinancialTransactionCategory[] = FINANCIAL_TRANSACTION_CATEGORIES;
  readonly paymentMethods: PaymentMethod[] = PAYMENT_METHODS;
  readonly appointmentStatuses: AppointmentStatus[] = APPOINTMENT_STATUSES;
  readonly availablePatients = signal<Patient[]>([]);
  readonly definition = signal<ReportDefinition | null>(this.reportsCatalogService.getReportByKey(this.reportKey) ?? null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly reportResult = signal<ReportResult<ReportFilters> | null>(null);
  readonly appliedFilters = signal<ReportFilters>(this.defaultDateRange);
  readonly filtersForm = this.formBuilder.group({
    type: '',
    status: '',
    category: '',
    paymentMethod: '',
    patientId: '',
    from: this.defaultDateRange.from,
    to: this.defaultDateRange.to,
  });
  readonly metrics = computed(() => this.reportResult()?.metrics ?? []);
  readonly displayedColumns = computed(() => this.reportResult()?.columns.map((column) => column.key) ?? []);
  readonly resultsLabel = computed(() => {
    const rowCount = this.reportResult()?.rows.length ?? 0;

    if (this.isClinicalSummaryReport()) {
      const hasDocument = Boolean(this.reportResult()?.clinicalContent);
      return hasDocument ? 'Documento clínico listo para revisión' : 'Selecciona un paciente para generar el documento';
    }

    if (this.isClinicalRecordReport()) {
      const hasDocument = Boolean(this.reportResult()?.clinicalContent);
      return hasDocument ? 'Expediente clínico listo para revisión' : 'Selecciona un paciente para generar el expediente';
    }

    const noun = this.isAgendaReport() ? 'cita' : 'movimiento';
    return rowCount === 1 ? `1 ${noun} en la vista previa` : `${rowCount} ${noun}s en la vista previa`;
  });
  readonly filtersPanelSubtitle = computed(() =>
    this.isAgendaReport()
      ? 'Refina el período, el estado y el paciente antes de generar la agenda profesional.'
      : this.isClinicalSummaryReport()
        ? 'Selecciona un paciente y define el período para construir un documento clínico profesional.'
        : this.isClinicalRecordReport()
          ? 'Selecciona un paciente y define el período para construir un expediente clínico estructurado.'
        : 'Refina el período y los criterios financieros antes de generar la vista previa.'
  );
  readonly previewSubtitle = computed(() =>
    this.isAgendaReport()
      ? 'Agenda profesional agrupada por día con citas ordenadas cronológicamente.'
      : this.isClinicalSummaryReport()
        ? 'Documento clínico centrado en el paciente con resumen, evolución y cronología visible.'
        : this.isClinicalRecordReport()
          ? 'Expediente clínico documental con estructura completa, detalle y lectura imprimible.'
        : 'Resumen tabular de movimientos incluidos en el reporte financiero actual.'
  );
  readonly guidedEmptyTitle = computed(() =>
    this.isClinicalSummaryReport() || this.isClinicalRecordReport()
      ? this.isClinicalRecordReport()
        ? 'Selecciona un paciente para generar el expediente'
        : 'Selecciona un paciente para generar el resumen'
      : 'No hay datos para mostrar'
  );
  readonly guidedEmptyMessage = computed(() =>
    this.isClinicalSummaryReport() || this.isClinicalRecordReport()
      ? this.isClinicalRecordReport()
        ? 'El expediente clínico se construye desde el expediente del paciente y su actividad visible en el período.'
        : 'El resumen clínico se construye desde el expediente del paciente y su actividad visible en el período.'
      : 'Ajusta los filtros para generar una vista previa.'
  );

  constructor() {
    this.loadPatientsIfNeeded();

    if (this.isClinicalSummaryReport() || this.isClinicalRecordReport()) {
      this.isLoading.set(false);
      return;
    }

    this.loadReport();
  }

  applyFilters(): void {
    const filters = this.buildFiltersQuery();
    this.appliedFilters.set(filters);
    this.loadReport(filters);
  }

  clearFilters(): void {
    this.filtersForm.reset({
      type: '',
      status: '',
      category: '',
      paymentMethod: '',
      patientId: '',
      from: this.defaultDateRange.from,
      to: this.defaultDateRange.to,
    });

    if (this.isClinicalSummaryReport() || this.isClinicalRecordReport()) {
      this.reportResult.set(null);
      this.appliedFilters.set({
        from: this.defaultDateRange.from,
        to: this.defaultDateRange.to,
      });
      this.errorMessage.set('');
      this.isLoading.set(false);
      return;
    }

    this.appliedFilters.set({
      from: this.defaultDateRange.from,
      to: this.defaultDateRange.to,
    });
    this.loadReport({
      from: this.defaultDateRange.from,
      to: this.defaultDateRange.to,
    });
  }

  retry(): void {
    this.loadReport();
  }

  export(format: ReportExportFormat): void {
    const result = this.reportResult();

    if (!result) {
      return;
    }

    if (format === 'pdf') {
      const exported = this.reportsExportService.exportAsPdf(result);

      if (!exported) {
        this.errorMessage.set(
          'No fue posible abrir la vista de impresión. Verifica que el navegador no esté bloqueando ventanas emergentes.'
        );
      }

      return;
    }

    this.reportsExportService.exportAsCsv(result);
  }

  hasActiveFilters(): boolean {
    return Object.keys(this.appliedFilters()).length > 0;
  }

  isFinancialReport(): boolean {
    return this.reportKey === 'financial';
  }

  isAgendaReport(): boolean {
    return this.reportKey === 'agenda';
  }

  isClinicalSummaryReport(): boolean {
    return this.reportKey === 'clinical-summary';
  }

  isClinicalRecordReport(): boolean {
    return this.reportKey === 'clinical-record';
  }

  getTypeLabel(type: FinancialTransactionType): string {
    return getFinancialTransactionTypeLabel(type);
  }

  getStatusLabel(status: FinancialTransactionStatus): string {
    return getFinancialTransactionStatusLabel(status);
  }

  getCategoryLabel(category: FinancialTransactionCategory): string {
    return getFinancialTransactionCategoryLabel(category);
  }

  getPaymentMethodLabel(paymentMethod: PaymentMethod): string {
    return getPaymentMethodLabel(paymentMethod);
  }

  getAgendaStatusLabel(status: AppointmentStatus): string {
    return getAppointmentStatusLabel(status);
  }

  private loadReport(filters: ReportFilters = this.appliedFilters()): void {
    this.reportLoadSubscription?.unsubscribe();

    if (
      (this.isClinicalSummaryReport() || this.isClinicalRecordReport()) &&
      !(filters as ClinicalSummaryReportFilters | ClinicalRecordReportFilters).patientId
    ) {
      this.reportResult.set(null);
      this.errorMessage.set('');
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    if (this.isFinancialReport()) {
      this.reportLoadSubscription = this.reportsRunnerService
        .runFinancialReport(filters as FinancialReportFilters)
        .subscribe({
          next: (result) => {
            this.reportResult.set(result);
            this.isLoading.set(false);
          },
          error: () => {
            this.reportResult.set(null);
            this.errorMessage.set('No fue posible generar el reporte financiero.');
            this.isLoading.set(false);
          },
        });

      return;
    }

    if (this.isAgendaReport()) {
      this.reportLoadSubscription = this.reportsRunnerService.runAgendaReport(filters as AgendaReportFilters).subscribe({
        next: (result) => {
          this.reportResult.set(result);
          this.isLoading.set(false);
        },
        error: () => {
          this.reportResult.set(null);
          this.errorMessage.set('No fue posible generar el reporte de agenda.');
          this.isLoading.set(false);
        },
      });

      return;
    }

    if (this.isClinicalSummaryReport()) {
      this.reportLoadSubscription = this.reportsRunnerService
        .runClinicalSummaryReport(filters as ClinicalSummaryReportFilters)
        .subscribe({
          next: (result) => {
            this.reportResult.set(result);
            this.isLoading.set(false);
          },
          error: () => {
            this.reportResult.set(null);
            this.errorMessage.set('No fue posible generar el resumen clínico.');
            this.isLoading.set(false);
          },
        });

      return;
    }

    if (this.isClinicalRecordReport()) {
      this.reportLoadSubscription = this.reportsRunnerService
        .runClinicalRecordReport(filters as ClinicalRecordReportFilters)
        .subscribe({
          next: (result) => {
            this.reportResult.set(result);
            this.isLoading.set(false);
          },
          error: () => {
            this.reportResult.set(null);
            this.errorMessage.set('No fue posible generar el expediente clínico.');
            this.isLoading.set(false);
          },
        });

      return;
    }

    this.reportResult.set(null);
    this.errorMessage.set('El reporte solicitado no está disponible.');
    this.isLoading.set(false);
  }

  private loadPatientsIfNeeded(): void {
    if (!this.isAgendaReport() && !this.isClinicalSummaryReport() && !this.isClinicalRecordReport()) {
      return;
    }

    this.patientsService
      .getPatients()
      .pipe(catchError(() => of([] as Patient[])))
      .subscribe((patients) => {
        const sortedPatients = [...patients].sort((left, right) =>
          `${left.firstName} ${left.lastName}`.localeCompare(`${right.firstName} ${right.lastName}`)
        );

        this.availablePatients.set(sortedPatients);
      });
  }

  private buildFiltersQuery(): ReportFilters {
    const rawValue = this.filtersForm.getRawValue();

    if (this.isFinancialReport()) {
      return {
        type: (rawValue.type || undefined) as FinancialTransactionType | undefined,
        status: (rawValue.status || undefined) as FinancialTransactionStatus | undefined,
        category: (rawValue.category || undefined) as FinancialTransactionCategory | undefined,
        paymentMethod: (rawValue.paymentMethod || undefined) as PaymentMethod | undefined,
        from: rawValue.from || undefined,
        to: rawValue.to || undefined,
      } satisfies FinancialReportFilters;
    }

    if (this.isClinicalSummaryReport()) {
      return {
        patientId: rawValue.patientId || '',
        from: rawValue.from || undefined,
        to: rawValue.to || undefined,
      } satisfies ClinicalSummaryReportFilters;
    }

    if (this.isClinicalRecordReport()) {
      return {
        patientId: rawValue.patientId || '',
        from: rawValue.from || undefined,
        to: rawValue.to || undefined,
      } satisfies ClinicalRecordReportFilters;
    }

    return {
      status: (rawValue.status || undefined) as AppointmentStatus | undefined,
      patientId: rawValue.patientId || undefined,
      from: rawValue.from || undefined,
      to: rawValue.to || undefined,
    } satisfies AgendaReportFilters;
  }
}
