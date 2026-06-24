import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { catchError, forkJoin, of } from 'rxjs';

import { Appointment, AppointmentStatus } from '../../appointments/models/appointment.models';
import { AppointmentsService } from '../../appointments/services/appointments.service';
import { CaseFile } from '../../case-files/models/case-file.models';
import { CaseFilesService } from '../../case-files/services/case-files.service';
import { Document as ClinicalDocument } from '../../documents/models/document.models';
import { DocumentsService } from '../../documents/services/documents.service';
import { Patient } from '../../patients/models/patient.models';
import { PatientsService } from '../../patients/services/patients.service';
import { SessionNote } from '../../session-notes/models/session-note.models';
import { SessionNotesService } from '../../session-notes/services/session-notes.service';
import { PageHeaderComponent, PageHeaderBreadcrumb } from '../../../shared/components/page-header/page-header.component';

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
  imports: [DatePipe, MatCardModule, MatIconModule, MatProgressSpinnerModule, PageHeaderComponent],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
})
export class DashboardPage {
  private readonly appointmentsService = inject(AppointmentsService);
  private readonly caseFilesService = inject(CaseFilesService);
  private readonly documentsService = inject(DocumentsService);
  private readonly patientsService = inject(PatientsService);
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
  readonly breadcrumbs: PageHeaderBreadcrumb[] = [
    {
      label: 'Inicio',
      url: '/dashboard',
    },
    {
      label: 'Dashboard',
    },
  ];

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
    return this.sortAppointments(
      this.data().appointments.filter((appointment) => this.isToday(appointment.scheduledAt))
    );
  });

  readonly upcomingAppointments = computed(() => {
    const now = new Date().getTime();

    return this.sortAppointments(
      this.data().appointments.filter((appointment) => {
        return appointment.status !== 'CANCELLED' && new Date(appointment.scheduledAt).getTime() >= now;
      })
    ).slice(0, 6);
  });

  readonly recentNotes = computed(() => {
    return [...this.data().sessionNotes]
      .sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime())
      .slice(0, 5);
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
      .slice(0, 6);
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
    const failedSources: string[] = [];

    this.isLoading.set(true);
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
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('No fue posible cargar el dashboard.');
        this.isLoading.set(false);
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

  getActivityTypeLabel(type: ActivityItem['type']): string {
    return type === 'note' ? 'Nota de sesión' : 'Documento';
  }

  private fallback<T>(value: T, failedSources: string[], source: string) {
    failedSources.push(source);
    return of(value);
  }

  private sortAppointments(appointments: Appointment[]): Appointment[] {
    return [...appointments].sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );
  }

  private isToday(value: string): boolean {
    const date = new Date(value);
    const today = new Date();

    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  }
}
