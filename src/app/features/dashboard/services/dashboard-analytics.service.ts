import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of } from 'rxjs';

import { getAppointmentStatusLabel, getAppointmentStatusVariant } from '../../appointments/utils/appointment-presenters';
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
import { FinancialTransactionsService } from '../../financial-transactions/services/financial-transactions.service';
import {
  buildCurrentMonthDateRange,
  formatFinancialCount,
  formatFinancialCurrency,
} from '../../financial-transactions/utils/financial-transaction-presenters';
import { Patient } from '../../patients/models/patient.models';
import { PatientsService } from '../../patients/services/patients.service';
import { SessionNote } from '../../session-notes/models/session-note.models';
import { SessionNotesService } from '../../session-notes/services/session-notes.service';
import {
  DashboardAgendaWidget,
  DashboardAppointmentItem,
  DashboardClinicalActivityItem,
  DashboardClinicalActivityWidget,
  DashboardFinanceMetric,
  DashboardFinanceSummaryWidget,
  DashboardKpiItem,
  DashboardOperationalAlertItem,
  DashboardOperationalAlertsWidget,
  DashboardQuickActionItem,
  DashboardSnapshot,
  DashboardViewModel,
} from '../models/dashboard-analytics.models';

export interface DashboardAnalyticsResult {
  snapshot: DashboardSnapshot;
  viewModel: DashboardViewModel;
}

@Injectable({ providedIn: 'root' })
export class DashboardAnalyticsService {
  private readonly appointmentsService = inject(AppointmentsService);
  private readonly caseFilesService = inject(CaseFilesService);
  private readonly documentsService = inject(DocumentsService);
  private readonly financialTransactionsService = inject(FinancialTransactionsService);
  private readonly patientsService = inject(PatientsService);
  private readonly sessionNotesService = inject(SessionNotesService);

  private static readonly KPI_TOTAL = 4;
  private static readonly AGENDA_TODAY_LIMIT = 4;
  private static readonly UPCOMING_LIMIT = 4;
  private static readonly ACTIVITY_LIMIT = 5;
  private static readonly ALERTS_LIMIT = 3;

  loadDashboardData(): Observable<DashboardAnalyticsResult> {
    return this.loadSnapshot().pipe(
      map((snapshot) => ({
        snapshot,
        viewModel: this.buildViewModel(snapshot),
      }))
    );
  }

  loadDashboardViewModel(): Observable<DashboardViewModel> {
    return this.loadDashboardData().pipe(map((result) => result.viewModel));
  }

  loadSnapshot(): Observable<DashboardSnapshot> {
    const failedSources: string[] = [];
    const monthRange = buildCurrentMonthDateRange();

    return forkJoin({
      patients: this.patientsService.getPatients().pipe(
        catchError(() => this.fallback<Patient[]>([], failedSources, 'pacientes'))
      ),
      appointments: this.appointmentsService.getAppointments().pipe(
        catchError(() => this.fallback([], failedSources, 'citas'))
      ),
      caseFiles: this.caseFilesService.getCaseFiles().pipe(
        catchError(() => this.fallback<CaseFile[]>([], failedSources, 'expedientes'))
      ),
      sessionNotes: this.sessionNotesService.getSessionNotes().pipe(
        catchError(() => this.fallback<SessionNote[]>([], failedSources, 'notas'))
      ),
      documents: this.documentsService.getAll().pipe(
        catchError(() => this.fallback<ClinicalDocument[]>([], failedSources, 'documentos'))
      ),
      financialSummary: this.financialTransactionsService.findSummary(monthRange).pipe(
        catchError(() => this.fallback(null, failedSources, 'resumen financiero'))
      ),
    }).pipe(
      map((result) => ({
        ...result,
        failedSources,
        generatedAt: new Date().toISOString(),
      }))
    );
  }

  buildViewModel(snapshot: DashboardSnapshot): DashboardViewModel {
    return {
      generatedAt: snapshot.generatedAt,
      currentDateLabel: this.formatCurrentDate(snapshot.generatedAt),
      kpiStrip: this.buildKpiStrip(snapshot),
      agendaToday: this.buildAgendaToday(snapshot),
      upcomingAppointments: this.buildUpcomingAppointments(snapshot),
      financeSummary: this.buildFinanceSummary(snapshot),
      clinicalActivity: this.buildClinicalActivity(snapshot),
      operationalAlerts: this.buildOperationalAlerts(snapshot),
      quickActions: this.buildQuickActions(),
      warnings: this.buildWarnings(snapshot),
    };
  }

  buildKpiStrip(snapshot: DashboardSnapshot): DashboardKpiItem[] {
    const now = this.parseSnapshotDate(snapshot.generatedAt);
    const totalPatients = snapshot.patients.length;
    const todayAppointments = this.getTodayAppointments(snapshot, now);
    const upcomingAppointments = this.getUpcomingAppointments(snapshot, now);
    const nextUpcomingAppointment = upcomingAppointments[0] ?? null;

    const metrics: DashboardKpiItem[] = [
      {
        id: 'patients-total',
        icon: 'groups',
        label: 'Pacientes registrados',
        value: this.formatCount(totalPatients, 'paciente', 'pacientes'),
        supportingText: 'Base clinica disponible para la operacion diaria.',
        variant: 'blue',
      },
      {
        id: 'appointments-today',
        icon: 'today',
        label: 'Citas de hoy',
        value: this.formatCount(todayAppointments.length, 'cita', 'citas'),
        supportingText: todayAppointments.length
          ? 'Agenda activa para la jornada actual.'
          : 'No hay citas programadas para hoy.',
        variant: 'green',
      },
      {
        id: 'upcoming-appointments',
        icon: 'event_upcoming',
        label: 'Proximas citas',
        value: this.formatCount(upcomingAppointments.length, 'cita', 'citas'),
        supportingText: nextUpcomingAppointment
          ? `${nextUpcomingAppointment.patientName} - ${nextUpcomingAppointment.scheduleLabel}`
          : 'No hay atenciones futuras programadas.',
        variant: 'amber',
      },
      {
        id: 'monthly-balance',
        icon: 'account_balance_wallet',
        label: 'Balance del mes',
        value: snapshot.financialSummary
          ? formatFinancialCurrency(snapshot.financialSummary.netTotal)
          : '--',
        supportingText: snapshot.financialSummary
          ? 'Diferencia neta entre ingresos y egresos del rango mensual activo.'
          : 'No fue posible obtener el resumen financiero del mes.',
        variant: 'violet',
      },
    ];

    return metrics.slice(0, DashboardAnalyticsService.KPI_TOTAL);
  }

  buildAgendaToday(snapshot: DashboardSnapshot): DashboardAgendaWidget {
    const now = this.parseSnapshotDate(snapshot.generatedAt);
    const todayAppointments = this.getTodayAppointments(snapshot, now);
    const items = todayAppointments.slice(0, DashboardAnalyticsService.AGENDA_TODAY_LIMIT);

    return {
      title: 'Agenda de hoy',
      subtitle: 'Atenciones programadas para la jornada actual.',
      items,
      totalCount: todayAppointments.length,
      emptyTitle: 'Sin citas para hoy',
      emptyMessage: 'La agenda del dia esta libre por ahora.',
    };
  }

  buildUpcomingAppointments(snapshot: DashboardSnapshot): DashboardAgendaWidget {
    const now = this.parseSnapshotDate(snapshot.generatedAt);
    const upcomingAppointments = this.getUpcomingAppointments(snapshot, now);
    const items = upcomingAppointments.slice(0, DashboardAnalyticsService.UPCOMING_LIMIT);

    return {
      title: 'Proximas citas',
      subtitle: 'Siguientes atenciones programadas para dar continuidad a la agenda.',
      items,
      totalCount: upcomingAppointments.length,
      emptyTitle: 'Sin citas proximas',
      emptyMessage: 'No hay atenciones futuras pendientes en la agenda.',
    };
  }

  buildFinanceSummary(snapshot: DashboardSnapshot): DashboardFinanceSummaryWidget {
    const summary = snapshot.financialSummary;
    const metrics: DashboardFinanceMetric[] = [
      {
        id: 'income',
        icon: 'trending_up',
        label: 'Ingresos del mes',
        value: summary ? formatFinancialCurrency(summary.incomeTotal) : '--',
        supportingText: 'Monto acumulado desde el primer dia del mes hasta hoy.',
        variant: 'green',
      },
      {
        id: 'expense',
        icon: 'trending_down',
        label: 'Egresos del mes',
        value: summary ? formatFinancialCurrency(summary.expenseTotal) : '--',
        supportingText: 'Egresos registrados dentro del mismo periodo mensual.',
        variant: 'amber',
      },
      {
        id: 'balance',
        icon: 'account_balance_wallet',
        label: 'Balance mensual',
        value: summary ? formatFinancialCurrency(summary.netTotal) : '--',
        supportingText: 'Lectura ejecutiva del balance neto del mes en curso.',
        variant: 'blue',
      },
      {
        id: 'movements',
        icon: 'receipt_long',
        label: 'Movimientos del mes',
        value: summary ? `${formatFinancialCount(summary.transactionCount)} movimientos` : '--',
        supportingText: 'Cantidad de transacciones encontradas para el rango mensual activo.',
        variant: 'violet',
      },
    ];

    return {
      title: 'Resumen financiero',
      subtitle: 'Lectura ejecutiva del mes en curso sin salir del dashboard.',
      metrics,
      periodLabel: 'Mes en curso',
      emptyTitle: 'Sin resumen financiero disponible',
      emptyMessage: 'No fue posible cargar el resumen financiero mensual.',
    };
  }

  buildClinicalActivity(snapshot: DashboardSnapshot): DashboardClinicalActivityWidget {
    const patientNames = this.buildPatientNamesMap(snapshot.patients);
    const caseFilePatientIds = this.buildCaseFilePatientIds(snapshot.caseFiles);

    const noteActivity = snapshot.sessionNotes.map<DashboardClinicalActivityItem>((note) => ({
      id: `note-${note.id}`,
      type: 'session-note',
      icon: 'notes',
      title: note.title?.trim() || 'Nota de sesion',
      description: 'Nota clinica registrada en el expediente.',
      patientName: this.resolvePatientNameByCaseFileId(caseFilePatientIds, patientNames, note.caseFileId),
      timestamp: note.createdAt,
      dateLabel: this.formatDateTime(note.createdAt),
    }));

    const documentActivity = snapshot.documents.map<DashboardClinicalActivityItem>((document) => ({
      id: `document-${document.id}`,
      type: 'document',
      icon: 'description',
      title: document.fileName,
      description: 'Documento agregado o actualizado en el expediente.',
      patientName: this.resolveDocumentPatientName(document, caseFilePatientIds, patientNames),
      timestamp: document.uploadedAt,
      dateLabel: this.formatDateTime(document.uploadedAt),
    }));

    const caseFileActivity = snapshot.caseFiles.map<DashboardClinicalActivityItem>((caseFile) => ({
      id: `case-file-${caseFile.id}`,
      type: 'case-file',
      icon: 'folder_open',
      title: this.hasFoundationInformation(caseFile) ? 'Expediente con base completa' : 'Expediente actualizado',
      description: this.hasFoundationInformation(caseFile)
        ? 'Diagnostico y plan terapeutico visibles en el expediente.'
        : 'El expediente aun requiere completar informacion base.',
      patientName: this.resolvePatientNameByCaseFileId(caseFilePatientIds, patientNames, caseFile.id),
      timestamp: caseFile.updatedAt,
      dateLabel: this.formatDateTime(caseFile.updatedAt),
    }));

    const items = [...noteActivity, ...documentActivity, ...caseFileActivity]
      .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
      .slice(0, DashboardAnalyticsService.ACTIVITY_LIMIT);

    return {
      title: 'Actividad clinica reciente',
      subtitle: 'Ultimos movimientos clinicos para recuperar contexto rapido.',
      items,
      emptyTitle: 'Sin actividad clinica reciente',
      emptyMessage: 'Cuando existan notas, documentos o expedientes actualizados apareceran aqui.',
    };
  }

  buildOperationalAlerts(snapshot: DashboardSnapshot): DashboardOperationalAlertsWidget {
    const now = this.parseSnapshotDate(snapshot.generatedAt);
    const patientNames = this.buildPatientNamesMap(snapshot.patients);

    const items = snapshot.appointments
      .filter((appointment) => appointment.status === 'SCHEDULED')
      .filter((appointment) => parseAppointmentDate(appointment.scheduledAt).getTime() < now.getTime())
      .sort((left, right) => parseAppointmentDate(right.scheduledAt).getTime() - parseAppointmentDate(left.scheduledAt).getTime())
      .slice(0, DashboardAnalyticsService.ALERTS_LIMIT)
      .map<DashboardOperationalAlertItem>((appointment) => ({
        id: appointment.id,
        icon: 'warning',
        title: 'Cita programada sin cierre de estado',
        description: `${patientNames[appointment.patientId] ?? 'Paciente no disponible'} - ${this.formatDateTime(
          appointment.scheduledAt
        )}. Conviene revisar su estado en Agenda.`,
        variant: 'warning',
        badgeLabel: 'Revisar',
      }));

    return {
      title: 'Alertas operativas',
      subtitle: 'Senales concretas que pueden requerir una revision rapida.',
      items,
      emptyTitle: 'Sin alertas operativas inmediatas',
      emptyMessage: 'No se detectaron citas pasadas que sigan marcadas como programadas.',
    };
  }

  buildQuickActions() {
    const items: DashboardQuickActionItem[] = [
      {
        id: 'create-patient',
        icon: 'person_add',
        label: 'Nuevo paciente',
        variant: 'primary',
      },
      {
        id: 'create-appointment',
        icon: 'event',
        label: 'Nueva cita',
        variant: 'secondary',
      },
      {
        id: 'open-patients',
        icon: 'manage_search',
        label: 'Buscar paciente',
        variant: 'secondary',
      },
      {
        id: 'open-finance',
        icon: 'payments',
        label: 'Ir a finanzas',
        variant: 'secondary',
      },
    ];

    return {
      title: 'Acciones rapidas',
      subtitle: 'Accesos frecuentes para iniciar tareas sin salir del overview ejecutivo.',
      items,
    };
  }

  private buildWarnings(snapshot: DashboardSnapshot): string[] {
    return snapshot.failedSources.length
      ? [`Algunos bloques se cargaron con datos parciales: ${snapshot.failedSources.join(', ')}.`]
      : [];
  }

  private getTodayAppointments(snapshot: DashboardSnapshot, referenceDate: Date): DashboardAppointmentItem[] {
    const patientNames = this.buildPatientNamesMap(snapshot.patients);

    return sortAppointmentsByScheduledAt(
      snapshot.appointments.filter((appointment) => isSameLocalDay(appointment.scheduledAt, referenceDate))
    ).map((appointment) => this.mapAppointmentItem(appointment, patientNames, referenceDate));
  }

  private getUpcomingAppointments(snapshot: DashboardSnapshot, referenceDate: Date): DashboardAppointmentItem[] {
    const patientNames = this.buildPatientNamesMap(snapshot.patients);

    return sortAppointmentsByScheduledAt(
      snapshot.appointments.filter((appointment) => {
        if (appointment.status !== 'SCHEDULED') {
          return false;
        }

        return parseAppointmentDate(appointment.scheduledAt).getTime() > referenceDate.getTime();
      })
    ).map((appointment) => this.mapAppointmentItem(appointment, patientNames, referenceDate));
  }

  private mapAppointmentItem(
    appointment: DashboardSnapshot['appointments'][number],
    patientNames: Record<string, string>,
    referenceDate: Date
  ): DashboardAppointmentItem {
    const appointmentDate = parseAppointmentDate(appointment.scheduledAt);

    return {
      id: appointment.id,
      patientName: patientNames[appointment.patientId] ?? 'Paciente no disponible',
      scheduledAt: appointment.scheduledAt,
      timeLabel: this.formatTime(appointmentDate),
      scheduleLabel: this.formatAppointmentDate(appointmentDate, referenceDate),
      notes: appointment.notes?.trim() || 'Sin notas registradas.',
      statusLabel: getAppointmentStatusLabel(appointment.status),
      statusVariant: getAppointmentStatusVariant(appointment.status),
    };
  }

  private buildPatientNamesMap(patients: Patient[]): Record<string, string> {
    return patients.reduce<Record<string, string>>((names, patient) => {
      names[patient.id] = `${patient.firstName} ${patient.lastName}`.trim();
      return names;
    }, {});
  }

  private buildCaseFilePatientIds(caseFiles: CaseFile[]): Record<string, string> {
    return caseFiles.reduce<Record<string, string>>((ids, caseFile) => {
      ids[caseFile.id] = caseFile.patientId;
      return ids;
    }, {});
  }

  private resolveDocumentPatientName(
    document: ClinicalDocument,
    caseFilePatientIds: Record<string, string>,
    patientNames: Record<string, string>
  ): string {
    const embeddedPatientName = document.patient
      ? `${document.patient.firstName} ${document.patient.lastName}`.trim()
      : document.caseFile?.patient
        ? `${document.caseFile.patient.firstName} ${document.caseFile.patient.lastName}`.trim()
        : '';

    if (embeddedPatientName) {
      return embeddedPatientName;
    }

    const patientId = document.patientId?.trim() || caseFilePatientIds[document.caseFileId];
    return patientId ? patientNames[patientId] ?? 'Paciente no disponible' : 'Paciente no disponible';
  }

  private resolvePatientNameByCaseFileId(
    caseFilePatientIds: Record<string, string>,
    patientNames: Record<string, string>,
    caseFileId: string
  ): string {
    const patientId = caseFilePatientIds[caseFileId];
    return patientId ? patientNames[patientId] ?? 'Paciente no disponible' : 'Paciente no disponible';
  }

  private hasFoundationInformation(caseFile: CaseFile): boolean {
    return Boolean(caseFile.diagnosis?.trim()) && Boolean(caseFile.treatmentPlan?.trim());
  }

  private parseSnapshotDate(value: string): Date {
    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
  }

  private formatCount(count: number, singular: string, plural: string): string {
    return `${count} ${count === 1 ? singular : plural}`;
  }

  private formatAppointmentDate(date: Date, referenceDate: Date): string {
    const dayDifference = getLocalDayDifference(date, referenceDate);
    const time = this.formatTime(date);

    if (dayDifference === 0) {
      return `Hoy - ${time}`;
    }

    if (dayDifference === 1) {
      return `Manana - ${time}`;
    }

    if (dayDifference > 1 && isAfterTodayLocal(date, referenceDate) && dayDifference <= 7) {
      return `${this.formatWeekday(date)} - ${time}`;
    }

    return this.formatDateTime(date.toISOString());
  }

  private formatTime(value: string | Date): string {
    const date = parseAppointmentDate(value);

    return new Intl.DateTimeFormat('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  }

  private formatDateTime(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return 'Pendiente';
    }

    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
      .format(date)
      .replace(',', '');
  }

  private formatCurrentDate(value: string): string {
    const date = new Date(value);

    return new Intl.DateTimeFormat('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }

  private formatWeekday(date: Date): string {
    const weekday = new Intl.DateTimeFormat('es-MX', {
      weekday: 'long',
    }).format(date);

    return weekday.charAt(0).toUpperCase() + weekday.slice(1);
  }

  private fallback<T>(value: T, failedSources: string[], source: string): Observable<T> {
    failedSources.push(source);
    return of(value);
  }
}
