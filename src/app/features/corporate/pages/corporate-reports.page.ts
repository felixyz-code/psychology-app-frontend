import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  BillingStatementResponse,
  ExecutiveReportResponse,
} from '../../../core/models/corporate.models';
import { CorporateReportsService } from '../../../core/services/corporate-reports.service';

@Component({
  selector: 'app-corporate-reports-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './corporate-reports.page.html',
  styleUrls: ['./corporate-reports.page.scss'],
})
export class CorporateReportsPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly reportsService = inject(CorporateReportsService);
  private readonly fb = inject(FormBuilder);

  readonly agreementId = signal<string>('');
  readonly isLoading = signal<boolean>(true);
  readonly isExporting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly executiveReport = signal<ExecutiveReportResponse | null>(null);
  readonly billingStatement = signal<BillingStatementResponse | null>(null);

  readonly filterForm: FormGroup = this.fb.group({
    startDate: [''],
    endDate: [''],
    unitPrice: [500],
  });

  readonly agreement = computed(() => this.executiveReport()?.agreement ?? null);
  readonly kpis = computed(() => this.executiveReport()?.kpis ?? null);
  readonly pools = computed(() => this.executiveReport()?.poolBreakdown ?? []);
  readonly departments = computed(
    () => this.executiveReport()?.departmentDistribution ?? [],
  );
  readonly billing = computed(() => this.billingStatement() ?? null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.agreementId.set(id);
      this.loadReports();
    } else {
      this.errorMessage.set('Identificador de convenio no proporcionado');
      this.isLoading.set(false);
    }
  }

  loadReports(): void {
    const id = this.agreementId();
    if (!id) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const formValues = this.filterForm.value;
    const queryParams = {
      startDate: formValues.startDate || undefined,
      endDate: formValues.endDate || undefined,
      unitPrice: formValues.unitPrice ? Number(formValues.unitPrice) : undefined,
    };

    // Load executive report
    this.reportsService.getExecutiveReport(id, queryParams).subscribe({
      next: (report) => {
        this.executiveReport.set(report);
        this.loadBilling(id, queryParams);
      },
      error: (err) => {
        this.errorMessage.set(
          err?.error?.message || 'Error al cargar el reporte ejecutivo B2B',
        );
        this.isLoading.set(false);
      },
    });
  }

  private loadBilling(id: string, params: any): void {
    this.reportsService.getBillingStatement(id, params).subscribe({
      next: (statement) => {
        this.billingStatement.set(statement);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(
          err?.error?.message || 'Error al cargar el estado de cuenta de facturación',
        );
        this.isLoading.set(false);
      },
    });
  }

  exportCsv(): void {
    const id = this.agreementId();
    if (!id) return;

    this.isExporting.set(true);
    const formValues = this.filterForm.value;

    this.reportsService
      .downloadBillingCsv(id, {
        startDate: formValues.startDate || undefined,
        endDate: formValues.endDate || undefined,
        unitPrice: formValues.unitPrice ? Number(formValues.unitPrice) : undefined,
      })
      .subscribe({
        next: (blob) => {
          const url = globalThis.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `paef-billing-${id}-${Date.now()}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          globalThis.URL.revokeObjectURL(url);
          this.isExporting.set(false);
        },
        error: () => {
          this.isExporting.set(false);
        },
      });
  }

  printSummary(): void {
    globalThis.print();
  }
}
