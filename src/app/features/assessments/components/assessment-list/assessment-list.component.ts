import { CommonModule, DatePipe } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { catchError, finalize, of } from 'rxjs';

import {
  AdministrationStatus,
  AssessmentAdministration,
} from '../../../../core/models/assessment.models';
import { AssessmentsHttpService } from '../../../../core/services/assessments-http.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  StatusBadgeComponent,
  StatusBadgeVariant,
} from '../../../../shared/components/status-badge/status-badge.component';
import { SectionCardComponent } from '../../../../shared/components/section-card/section-card.component';
import { AssessmentAssignDialogComponent } from '../assessment-assign-dialog/assessment-assign-dialog.component';
import { AssessmentLongitudinalComponent } from '../assessment-longitudinal/assessment-longitudinal.component';
import { AssessmentResultDialogComponent } from '../assessment-result-dialog/assessment-result-dialog.component';

@Component({
  selector: 'app-assessment-list',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
    SectionCardComponent,
    StatusBadgeComponent,
    AssessmentLongitudinalComponent,
  ],
  templateUrl: './assessment-list.component.html',
  styleUrl: './assessment-list.component.scss',
})
export class AssessmentListComponent implements OnInit {
  @Input({ required: true }) patientId!: string;
  @Input() patientName = '';
  @Input() branchId?: string | null;
  @Input() caseFileId?: string | null;
  @Output() assessmentChanged = new EventEmitter<void>();

  private readonly assessmentsService = inject(AssessmentsHttpService);
  private readonly dialog = inject(MatDialog);
  private readonly toastService = inject(ToastService);

  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly assessments = signal<AssessmentAdministration[]>([]);
  readonly displayedColumns = [
    'instrument',
    'status',
    'score',
    'assignedAt',
    'completedAt',
    'actions',
  ];

  ngOnInit(): void {
    if (this.patientId) {
      this.loadAssessments();
    }
  }

  loadAssessments(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.assessmentsService
      .getAdministrations({ patientId: this.patientId, limit: 50 })
      .pipe(
        finalize(() => this.isLoading.set(false)),
        catchError(() => {
          this.errorMessage.set('No fue posible cargar las evaluaciones psicométricas.');
          return of({ data: [], meta: { total: 0, page: 1, limit: 50, totalPages: 1 } });
        }),
      )
      .subscribe({
        next: (res) => {
          this.assessments.set(res.data);
        },
      });
  }

  openAssignDialog(): void {
    const dialogRef = this.dialog.open(AssessmentAssignDialogComponent, {
      width: '520px',
      data: {
        patientId: this.patientId,
        patientName: this.patientName,
        branchId: this.branchId,
        caseFileId: this.caseFileId,
      },
    });

    dialogRef.afterClosed().subscribe((created) => {
      if (created) {
        this.toastService.success('Evaluación psicométrica asignada correctamente.');
        this.loadAssessments();
        this.assessmentChanged.emit();
      }
    });
  }

  openResultDialog(administration: AssessmentAdministration): void {
    this.dialog.open(AssessmentResultDialogComponent, {
      width: '680px',
      data: { administration },
    });
  }

  copyRunnerLink(administration: AssessmentAdministration): void {
    if (!administration.accessToken) {
      this.toastService.warning('Esta evaluación no tiene enlace remoto generado.');
      return;
    }

    const runnerUrl = `${window.location.origin}/assessment-runner/${administration.accessToken}`;
    navigator.clipboard.writeText(runnerUrl).then(() => {
      this.toastService.success('Enlace de evaluación copiado al portapapeles.');
    });
  }

  openRunnerTab(administration: AssessmentAdministration): void {
    if (!administration.accessToken) return;
    const runnerUrl = `/assessment-runner/${administration.accessToken}`;
    window.open(runnerUrl, '_blank');
  }

  getStatusVariant(status: AdministrationStatus): StatusBadgeVariant {
    switch (status) {
      case AdministrationStatus.COMPLETED:
        return 'success';
      case AdministrationStatus.IN_PROGRESS:
        return 'warning';
      case AdministrationStatus.ASSIGNED:
        return 'primary';
      case AdministrationStatus.EXPIRED:
        return 'danger';
      case AdministrationStatus.CANCELLED:
      default:
        return 'neutral';
    }
  }

  getStatusLabel(status: AdministrationStatus): string {
    switch (status) {
      case AdministrationStatus.COMPLETED:
        return 'Completada';
      case AdministrationStatus.IN_PROGRESS:
        return 'En Progreso';
      case AdministrationStatus.ASSIGNED:
        return 'Asignada';
      case AdministrationStatus.EXPIRED:
        return 'Expirada';
      case AdministrationStatus.CANCELLED:
        return 'Cancelada';
      default:
        return status;
    }
  }

  getSeverityVariant(severity?: string | null): StatusBadgeVariant {
    const s = (severity || '').toUpperCase();
    if (s.includes('CRITICAL') || s.includes('SEVERE')) return 'danger';
    if (s.includes('MODERATE')) return 'warning';
    if (s.includes('MILD') || s.includes('MINIMAL')) return 'primary';
    return 'neutral';
  }

  hasRiskFlags(admin: AssessmentAdministration): boolean {
    if (!admin.result?.flagsJson) return false;
    if (Array.isArray(admin.result.flagsJson) && admin.result.flagsJson.length > 0) return true;
    return false;
  }

  getRiskAlertsCount(admin: AssessmentAdministration): number {
    if (!admin.result?.flagsJson) return 0;
    if (Array.isArray(admin.result.flagsJson)) return admin.result.flagsJson.length;
    return 0;
  }
}
