import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { catchError, forkJoin, of } from 'rxjs';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { AppointmentFormDialogComponent } from '../../appointments/components/appointment-form-dialog.component';
import { Appointment, AppointmentStatus } from '../../appointments/models/appointment.models';
import {
  getLocalDayDifference,
  isAfterTodayLocal,
  isSameLocalDay,
  parseAppointmentDate,
  sortAppointmentsByScheduledAt,
} from '../../appointments/utils/appointment-datetime';
import { AppointmentsService } from '../../appointments/services/appointments.service';
import { CaseFile } from '../../case-files/models/case-file.models';
import { CaseFilesService } from '../../case-files/services/case-files.service';
import { Document as ClinicalDocument } from '../../documents/models/document.models';
import { DocumentsService } from '../../documents/services/documents.service';
import { Patient } from '../../patients/models/patient.models';
import { PatientsService } from '../../patients/services/patients.service';
import { SessionNote } from '../../session-notes/models/session-note.models';
import { SessionNotesService } from '../../session-notes/services/session-notes.service';

interface DashboardData {
  patients: Patient[];
  appointments: Appointment[];
  sessionNotes: SessionNote[];
  documents: ClinicalDocument[];
  caseFiles: CaseFile[];
  failedSources: string[];
}

interface ActivityItem {
  id: string;
  type: 'note' | 'document';
  title: string;
  patientName: string;
  date: string;
}

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [DatePipe, MatCardModule, MatIconModule, PageHeaderComponent],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
})
export class DashboardPage {
  readonly DASHBOARD_TODAY_LIMIT = 3;
  readonly DASHBOARD_UPCOMING_LIMIT = 3;
  readonly DASHBOARD_ACTIVITY_LIMIT = 5;
  readonly dashboardSkeletonKpis = Array.from({ length: 5 });
  readonly dashboardSkeletonList = Array.from({ length: 3 });

  private readonly appointmentsService = inject(AppointmentsService);
  private readonly caseFilesService = inject(CaseFilesService);
  private readonly documentsService = inject(DocumentsService);
  private readonly dialog = inject(MatDialog);
  private readonly patientsService = inject(PatientsService);
  private readonly router = inject(Router);
  private readonly sessionNotesService = inject(SessionNotesService);

  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly data = signal<DashboardData>({
    patients: [],
    appointments: [],
    sessionNotes: [],
    documents: [],
    caseFiles: [],
    failedSources: [],
  });

  readonly patientNames = computed(() => {
    return this.data().patients.reduce<Record<string, string>>((names, patient) => {
      names[patient.id] = `${patient.firstName} ${patient.lastName}`;
      return names;
    }, {});
  });

  readonly caseFilePatientIds = computed(() => {
    return this.data().caseFiles.reduce<Record<string, string>>((ids, caseFile) => {
      ids[caseFile.id] = caseFile.patientId;
      return ids;
    }, {});
  });

  readonly todayAppointments = computed(() => {
    return sortAppointmentsByScheduledAt(
      this.data().appointments.filter((appointment) => isSameLocalDay(appointment.scheduledAt, new Date()))
    );
  });

  readonly todayAppointmentsPreview = computed(() => this.todayAppointments().slice(0, this.DASHBOARD_TODAY_LIMIT));
  readonly hasMoreTodayAppointments = computed(() => this.todayAppointments().length > this.DASHBOARD_TODAY_LIMIT);

  readonly upcomingAppointments = computed(() => {
    return sortAppointmentsByScheduledAt(
      this.data().appointments.filter((appointment) => {
        return appointment.status !== 'CANCELLED' && isAfterTodayLocal(appointment.scheduledAt, new Date());
      })
    );
  });

  readonly upcomingAppointmentsPreview = computed(() => this.upcomingAppointments().slice(0, this.DASHBOARD_UPCOMING_LIMIT));
  readonly hasMoreUpcomingAppointments = computed(() => this.upcomingAppointments().length > this.DASHBOARD_UPCOMING_LIMIT);

  readonly recentNotes = computed(() => {
    return [...this.data().sessionNotes]
      .sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime())
      .slice(0, this.DASHBOARD_ACTIVITY_LIMIT);
  });

  readonly recentActivity = computed<ActivityItem[]>(() => {
    const noteActivity = this.data().sessionNotes.map<ActivityItem>((note) => ({
      id: note.id,
      type: 'note',
      title: note.title || 'Nota de sesión',
      patientName: this.getPatientNameByCaseFileId(note.caseFileId),
      date: note.sessionDate,
    }));

    const documentActivity = this.data().documents.map<ActivityItem>((document) => ({
      id: document.id,
      type: 'document',
      title: document.fileName,
      patientName: this.getPatientNameByCaseFileId(document.caseFileId),
      date: document.uploadedAt,
    }));

    return [...noteActivity, ...documentActivity]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, this.DASHBOARD_ACTIVITY_LIMIT);
  });

  readonly failedSourcesMessage = computed(() => {
    const failedSources = this.data().failedSources;
    return failedSources.length
      ? `Algunos datos no pudieron cargarse: ${failedSources.join(', ')}.`
      : '';
  });

  constructor() {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.fetchDashboardData(true);
  }

  refreshDashboardData(): void {
    this.fetchDashboardData(false);
  }

  private fetchDashboardData(showLoadingState: boolean): void {
    const failedSources: string[] = [];

    if (showLoadingState) {
      this.isLoading.set(true);
    }

    this.errorMessage.set('');

    forkJoin({
      patients: this.patientsService.getPatients().pipe(catchError(() => this.fallback<Patient[]>([], failedSources, 'pacientes'))),
      appointments: this.appointmentsService.getAppointments().pipe(catchError(() => this.fallback<Appointment[]>([], failedSources, 'citas'))),
      sessionNotes: this.sessionNotesService.getSessionNotes().pipe(catchError(() => this.fallback<SessionNote[]>([], failedSources, 'notas'))),
      documents: this.documentsService.getAll().pipe(catchError(() => this.fallback<ClinicalDocument[]>([], failedSources, 'documentos'))),
      caseFiles: this.caseFilesService.getCaseFiles().pipe(catchError(() => this.fallback<CaseFile[]>([], failedSources, 'expedientes'))),
    }).subscribe({
      next: (result) => {
        this.data.set({
          ...result,
          failedSources,
        });
        if (showLoadingState) {
          this.isLoading.set(false);
        }
      },
      error: () => {
        this.errorMessage.set('No fue posible cargar el dashboard.');
        if (showLoadingState) {
          this.isLoading.set(false);
        }
      },
    });
  }

  getPatientName(patientId: string): string {
    return this.patientNames()[patientId] ?? 'Paciente no disponible';
  }

  getPatientNameByCaseFileId(caseFileId: string): string {
    const patientId = this.caseFilePatientIds()[caseFileId];
    return patientId ? this.getPatientName(patientId) : 'Paciente no disponible';
  }

  getStatusLabel(status: AppointmentStatus): string {
    const labels: Record<AppointmentStatus, string> = {
      SCHEDULED: 'Programada',
      COMPLETED: 'Completada',
      CANCELLED: 'Cancelada',
      NO_SHOW: 'No asistió',
    };

    return labels[status];
  }

  getStatusClass(status: AppointmentStatus): string {
    const classes: Record<AppointmentStatus, string> = {
      SCHEDULED: 'app-status-badge--scheduled',
      COMPLETED: 'app-status-badge--completed',
      CANCELLED: 'app-status-badge--cancelled',
      NO_SHOW: 'app-status-badge--no-show',
    };

    return classes[status];
  }

  getActivityIcon(type: ActivityItem['type']): string {
    return type === 'note' ? 'notes' : 'description';
  }

  getAppointmentScheduleLabel(appointment: Appointment): string {
    const date = parseAppointmentDate(appointment.scheduledAt);
    const duration = `${appointment.durationMinutes} min`;

    return `${this.formatAppointmentDate(date)} · ${duration}`;
  }

  getAppointmentDescription(appointment: Appointment): string {
    return appointment.notes?.trim() || 'Sin motivo clínico registrado.';
  }

  getActivityTypeLabel(type: ActivityItem['type']): string {
    return type === 'note' ? 'Nota de sesión' : 'Documento';
  }

  navigateToAppointments(): void {
    void this.router.navigate(['/appointments']);
  }

  openAppointmentDetails(appointment: Appointment): void {
    const dialogRef = this.dialog.open(AppointmentFormDialogComponent, {
      width: '720px',
      maxWidth: '95vw',
      autoFocus: false,
      data: {
        mode: 'edit',
        patientId: appointment.patientId,
        appointment,
      },
    });

    dialogRef.afterClosed().subscribe((updated) => {
      if (updated) {
        this.refreshDashboardData();
      }
    });
  }

  handleAppointmentCardKeydown(event: KeyboardEvent, appointment: Appointment): void {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    this.openAppointmentDetails(appointment);
  }

  private fallback<T>(value: T, failedSources: string[], source: string) {
    failedSources.push(source);
    return of(value);
  }

  private formatAppointmentDate(date: Date): string {
    const dayDifference = getLocalDayDifference(date, new Date());
    const time = this.formatTime(date);

    if (dayDifference === 0) {
      return `Hoy ${time}`;
    }

    if (dayDifference === 1) {
      return `Mañana ${time}`;
    }

    if (dayDifference === 2) {
      return `Pasado mañana ${time}`;
    }

    if (dayDifference > 2 && dayDifference <= 7) {
      return `${this.formatWeekday(date)} ${time}`;
    }

    return this.formatDateTime(date);
  }

  private formatTime(date: Date): string {
    return new Intl.DateTimeFormat('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  }

  private formatDateTime(date: Date): string {
    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  }

  private formatWeekday(date: Date): string {
    const weekday = new Intl.DateTimeFormat('es-MX', {
      weekday: 'long',
    }).format(date);

    return weekday.charAt(0).toUpperCase() + weekday.slice(1);
  }
}
