import { CommonModule, DatePipe } from '@angular/common';
import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { PsychometricReportDto } from '../../../../core/models/assessment.models';
import { AssessmentsHttpService } from '../../../../core/services/assessments-http.service';
import { StatusBadgeComponent, StatusBadgeVariant } from '../../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-psychometric-report-view',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    StatusBadgeComponent,
  ],
  templateUrl: './psychometric-report-view.component.html',
  styleUrl: './psychometric-report-view.component.scss',
})
export class PsychometricReportViewComponent implements OnInit {
  @Input() administrationId?: string;

  private readonly assessmentsHttp = inject(AssessmentsHttpService);

  readonly report = signal<PsychometricReportDto | null>(null);
  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    if (this.administrationId) {
      this.loadReport(this.administrationId);
    }
  }

  loadReport(id: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.assessmentsHttp.getPsychometricReport(id).subscribe({
      next: (data) => {
        this.report.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(
          err?.error?.message ||
            'Error al cargar el reporte psicométrico formal.',
        );
        this.loading.set(false);
      },
    });
  }

  getSeverityVariant(severity?: string | null): StatusBadgeVariant {
    const s = (severity || '').toUpperCase();
    if (s.includes('CRITICAL') || s.includes('EMERGENCY') || s.includes('SEVERE')) return 'danger';
    if (s.includes('MODERATE') || s.includes('WARNING')) return 'warning';
    if (s.includes('MILD') || s.includes('MINIMAL') || s.includes('INFO')) return 'primary';
    return 'neutral';
  }

  printReport(): void {
    window.print();
  }
}
