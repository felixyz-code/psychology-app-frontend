import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
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
import { PatientFormDialogComponent } from '../../patients/components/patient-form-dialog.component';
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
  type: 'patient' | 'appointment' | 'note' | 'document';
  title: string;
  description: string;
  patientName: string;
  date: string;
}

interface DashboardMetric {
  tone: 'blue' | 'green' | 'amber' | 'violet';
  icon: string;
  label: string;
  value: string;
  supportingText: string;
}

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [DatePipe, MatButtonModule, MatCardModule, MatIconModule, PageHeaderComponent],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
})
export class DashboardPage {
  readonly DASHBOARD_UPCOMING_LIMIT = 3;
  readonly DASHBOARD_ACTIVITY_LIMIT = 3;
  readonly dashboardSkeletonKpis = Array.from({ length: 4 });
  readonly dashboardSkeletonList = Array.from({ length: 4 });
  readonly today = signal(new Date());
  readonly fallbackActivity: ActivityItem[] = [
    {
      id: 'fallback-patient',
      type: 'patient',
      title: 'Primer paciente listo para registrar',
      description: 'Agrega un paciente nuevo para comenzar a construir tu historial clinico.',
      patientName: 'Actividad inicial',
      date: new Date().toISOString(),
    },
    {
      id: 'fallback-appointment',
      type: 'appointment',
      title: 'Agenda una cita del dia',
      description: 'Las nuevas citas apareceran aqui para dar seguimiento rapido a tu jornada.',
      patientName: 'Actividad inicial',
      date: new Date().toISOString(),
    },
  ];

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

  readonly patientNames = computed(() =>
    this.data().patients.reduce<Record<string, string>>((names, patient) => {
      names[patient.id] = `${patient.firstName} ${patient.lastName}`;
      return names;
    }, {})
  );

  readonly caseFilePatientIds = computed(() =>
    this.data().caseFiles.reduce<Record<string, string>>((ids, caseFile) => {
      ids[caseFile.id] = caseFile.patientId;
      return ids;
    }, {})
  );

  readonly todayAppointments = computed(() =>
    sortAppointmentsByScheduledAt(
      this.data().appointments.filter((appointment) => isSameLocalDay(appointment.scheduledAt, this.today()))
    )
  );

  readonly upcomingAppointments = computed(() =>
    sortAppointmentsByScheduledAt(
      this.data().appointments.filter((appointment) => {
        return appointment.status !== 'CANCELLED' && isAfterTodayLocal(appointment.scheduledAt, this.today());
      })
    )
  );

  readonly upcomingAppointmentsPreview = computed(() =>
    this.todayAppointments().slice(0, this.DASHBOARD_UPCOMING_LIMIT)
  );

  readonly nextAppointment = computed(() => this.upcomingAppointments()[0] ?? this.todayAppointments()[0] ?? null);

  readonly dashboardMetrics = computed<DashboardMetric[]>(() => [
    {
      tone: 'blue',
      icon: 'groups',
      label: 'Total pacientes',
      value: this.formatCount(this.data().patients.length, 'paciente', 'pacientes'),
      supportingText: 'Base clinica registrada en el sistema.',
    },
    {
      tone: 'green',
      icon: 'today',
      label: 'Citas de hoy',
      value: this.formatCount(this.todayAppointments().length, 'cita', 'citas'),
      supportingText: this.todayAppointments().length
        ? 'Agenda activa para la jornada actual.'
        : 'No hay citas programadas para hoy.',
    },
    {
      tone: 'amber',
      icon: 'event_upcoming',
      label: 'Proxima cita',
      value: this.getNextAppointmentValue(),
      supportingText: this.getNextAppointmentSupportingText(),
    },
    {
      tone: 'violet',
      icon: 'notes',
      label: 'Session Notes',
      value: this.formatCount(this.data().sessionNotes.length, 'nota', 'notas'),
      supportingText: 'Registros clinicos acumulados disponibles.',
    },
  ]);

  readonly recentActivity = computed<ActivityItem[]>(() => {
    const patientActivity = this.data().patients.map<ActivityItem>((patient) => ({
      id: patient.id,
      type: 'patient',
      title: `${patient.firstName} ${patient.lastName}`,
      description: 'Paciente agregado al sistema clinico.',
      patientName: `${patient.firstName} ${patient.lastName}`,
      date: patient.createdAt,
    }));

    const appointmentActivity = this.data().appointments.map<ActivityItem>((appointment) => ({
      id: appointment.id,
      type: 'appointment',
      title: this.getPatientName(appointment.patientId),
      description: `Cita creada para ${this.getAppointmentScheduleLabel(appointment)}.`,
      patientName: this.getPatientName(appointment.patientId),
      date: appointment.createdAt,
    }));

    const noteActivity = this.data().sessionNotes.map<ActivityItem>((note) => ({
      id: note.id,
      type: 'note',
      title: note.title || 'Nota de sesion',
      description: 'Nota clinica registrada.',
      patientName: this.getPatientNameByCaseFileId(note.caseFileId),
      date: note.createdAt,
    }));

    const documentActivity = this.data().documents.map<ActivityItem>((document) => ({
      id: document.id,
      type: 'document',
      title: document.fileName,
      description: 'Documento agregado al expediente.',
      patientName: this.getPatientNameByCaseFileId(document.caseFileId),
      date: document.uploadedAt,
    }));

    const derivedActivity = [...patientActivity, ...appointmentActivity, ...noteActivity, ...documentActivity]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, this.DASHBOARD_ACTIVITY_LIMIT);

    return derivedActivity.length ? derivedActivity : this.fallbackActivity;
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
      NO_SHOW: 'No asistio',
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
    const icons: Record<ActivityItem['type'], string> = {
      patient: 'person_add',
      appointment: 'event',
      note: 'notes',
      document: 'description',
    };

    return icons[type];
  }

  getActivityTypeLabel(type: ActivityItem['type']): string {
    const labels: Record<ActivityItem['type'], string> = {
      patient: 'Paciente agregado',
      appointment: 'Cita creada',
      note: 'Nota clinica registrada',
      document: 'Documento agregado',
    };

    return labels[type];
  }

  getAppointmentScheduleLabel(appointment: Appointment): string {
    const date = parseAppointmentDate(appointment.scheduledAt);
    const duration = `${appointment.durationMinutes} min`;

    return `${this.formatAppointmentDate(date)} · ${duration}`;
  }

  getAppointmentDescription(appointment: Appointment): string {
    return appointment.notes?.trim() || 'Sin motivo clinico registrado.';
  }

  navigateToAppointments(): void {
    void this.router.navigate(['/appointments']);
  }

  navigateToPatients(): void {
    void this.router.navigate(['/patients']);
  }

  openCreatePatientDialog(): void {
    const dialogRef = this.dialog.open(PatientFormDialogComponent, {
      width: '720px',
      maxWidth: '95vw',
      autoFocus: false,
      data: {
        mode: 'create',
      },
    });

    dialogRef.afterClosed().subscribe((created) => {
      if (created) {
        this.refreshDashboardData();
      }
    });
  }

  openCreateAppointmentDialog(): void {
    const dialogRef = this.dialog.open(AppointmentFormDialogComponent, {
      width: '720px',
      maxWidth: '95vw',
      autoFocus: false,
      data: {
        mode: 'create',
        patients: this.data().patients,
      },
    });

    dialogRef.afterClosed().subscribe((created) => {
      if (created) {
        this.refreshDashboardData();
      }
    });
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

  private fallback<T>(value: T, failedSources: string[], source: string) {
    failedSources.push(source);
    return of(value);
  }

  private getNextAppointmentValue(): string {
    const appointment = this.nextAppointment();

    if (!appointment) {
      return 'Sin citas';
    }

    return this.formatTime(parseAppointmentDate(appointment.scheduledAt));
  }

  private getNextAppointmentSupportingText(): string {
    const appointment = this.nextAppointment();

    if (!appointment) {
      return 'Programa una nueva cita para verla destacada aqui.';
    }

    const appointmentDate = parseAppointmentDate(appointment.scheduledAt);
    return `${this.getPatientName(appointment.patientId)} · ${this.formatRelativeDateLabel(appointmentDate)}`;
  }

  private formatRelativeDateLabel(date: Date): string {
    const dayDifference = getLocalDayDifference(date, this.today());

    if (dayDifference === 0) {
      return 'Hoy';
    }

    if (dayDifference === 1) {
      return 'Manana';
    }

    return this.formatShortDate(date);
  }

  private formatShortDate(date: Date): string {
    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'short',
    }).format(date);
  }

  private formatCount(count: number, singular: string, plural: string): string {
    return `${count} ${count === 1 ? singular : plural}`;
  }

  private formatAppointmentDate(date: Date): string {
    const dayDifference = getLocalDayDifference(date, this.today());
    const time = this.formatTime(date);

    if (dayDifference === 0) {
      return `Hoy · ${time}`;
    }

    if (dayDifference === 1) {
      return `Manana · ${time}`;
    }

    if (dayDifference === 2) {
      return `Pasado manana · ${time}`;
    }

    if (dayDifference > 2 && dayDifference <= 7) {
      return `${this.formatWeekday(date)} · ${time}`;
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
