import { CommonModule, DatePipe } from '@angular/common';
import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import {
  LongitudinalAssessmentSeriesDto,
  LongitudinalDataPoint,
} from '../../../../core/models/assessment.models';
import { AssessmentsHttpService } from '../../../../core/services/assessments-http.service';
import { StatusBadgeComponent, StatusBadgeVariant } from '../../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-assessment-longitudinal',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
    StatusBadgeComponent,
  ],
  templateUrl: './assessment-longitudinal.component.html',
  styleUrl: './assessment-longitudinal.component.scss',
})
export class AssessmentLongitudinalComponent implements OnInit {
  @Input({ required: true }) patientId!: string;
  @Input() patientName?: string;

  private readonly assessmentsHttp = inject(AssessmentsHttpService);

  readonly seriesData = signal<LongitudinalAssessmentSeriesDto | null>(null);
  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  selectedInstrumentCode: string = '';

  readonly availableInstruments = signal<Array<{ code: string; name: string }>>([
    { code: '', name: 'Todos los instrumentos' },
    { code: 'PHQ-9', name: 'PHQ-9 (Depresión)' },
    { code: 'GAD-7', name: 'GAD-7 (Ansiedad)' },
  ]);

  ngOnInit(): void {
    if (this.patientId) {
      this.loadSeries();
    }
  }

  loadSeries(): void {
    this.loading.set(true);
    this.error.set(null);

    const params: { instrumentCode?: string } = {};
    if (this.selectedInstrumentCode) {
      params.instrumentCode = this.selectedInstrumentCode;
    }

    this.assessmentsHttp.getLongitudinalSeries(this.patientId, params).subscribe({
      next: (data) => {
        this.seriesData.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(
          err?.error?.message ||
            'Error al cargar la serie longitudinal del paciente.',
        );
        this.loading.set(false);
      },
    });
  }

  onInstrumentChange(code: string): void {
    this.selectedInstrumentCode = code;
    this.loadSeries();
  }

  getSeverityVariant(severity?: string | null): StatusBadgeVariant {
    const s = (severity || '').toUpperCase();
    if (s.includes('CRITICAL') || s.includes('EMERGENCY') || s.includes('SEVERE')) return 'danger';
    if (s.includes('MODERATE') || s.includes('WARNING')) return 'warning';
    if (s.includes('MILD') || s.includes('MINIMAL') || s.includes('INFO')) return 'primary';
    return 'neutral';
  }

  getTrendIcon(trend?: string): string {
    switch (trend) {
      case 'IMPROVING':
        return 'trending_down'; // score menor = mejoría clínica
      case 'WORSENING':
        return 'trending_up'; // score mayor = empeoramiento
      case 'STABLE':
        return 'trending_flat';
      default:
        return 'help_outline';
    }
  }

  getTrendClass(trend?: string): string {
    switch (trend) {
      case 'IMPROVING':
        return 'trend--improving';
      case 'WORSENING':
        return 'trend--worsening';
      case 'STABLE':
        return 'trend--stable';
      default:
        return 'trend--unknown';
    }
  }

  getTrendLabel(trend?: string): string {
    switch (trend) {
      case 'IMPROVING':
        return 'MEJORÍA CLÍNICA';
      case 'WORSENING':
        return 'EMPEORAMIENTO';
      case 'STABLE':
        return 'ESTABLE';
      default:
        return 'DATOS INSUFICIENTES';
    }
  }
}
