import { inject, Injectable } from '@angular/core';
import { forkJoin, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { Appointment } from '../../appointments/models/appointment.models';
import { AppointmentsService } from '../../appointments/services/appointments.service';
import {
  getAppointmentStatusLabel,
  getAppointmentStatusVariant,
} from '../../appointments/utils/appointment-presenters';
import {
  parseAppointmentDate,
  sortAppointmentsByScheduledAt,
  startOfLocalDay,
} from '../../appointments/utils/appointment-datetime';
import {
  CaseFile,
  CaseFileWorkspaceResponse,
  ClinicalTimelineEvent,
} from '../../case-files/models/case-file.models';
import { CaseFilesService } from '../../case-files/services/case-files.service';
import { Document } from '../../documents/models/document.models';
import {
  FindFinancialTransactionsQueryDto,
  FinancialTransactionResponse,
  FinancialTransactionSummaryDto,
} from '../../financial-transactions/models/financial-transaction.models';
import { FinancialTransactionsService } from '../../financial-transactions/services/financial-transactions.service';
import {
  formatFinancialAmount,
  formatFinancialCount,
  formatFinancialCurrency,
  formatFinancialDate,
  formatFinancialDateTime,
  parseLocalDateOnly,
  getFinancialTransactionCategoryLabel,
  getFinancialTransactionStatusLabel,
  getFinancialTransactionTypeLabel,
  getPaymentMethodLabel,
} from '../../financial-transactions/utils/financial-transaction-presenters';
import { Patient } from '../../patients/models/patient.models';
import { PatientsService } from '../../patients/services/patients.service';
import { SessionNote } from '../../session-notes/models/session-note.models';
import {
  ClinicalRecordAppointmentItem,
  ClinicalRecordContent,
  ClinicalRecordDocumentItem,
  ClinicalRecordField,
  ClinicalRecordNoteItem,
  ClinicalRecordReportFilters,
  ClinicalRecordTimelineItem,
} from '../models/clinical-record-report.model';
import {
  ClinicalSummaryContent,
  ClinicalSummaryDocument,
  ClinicalSummaryMetric,
  ClinicalSummaryNote,
  ClinicalSummaryReportFilters,
  ClinicalSummaryTimelineItem,
} from '../models/clinical-summary-report.model';
import { ReportDefinition, ReportKey } from '../models/report-definition.model';
import { AgendaReportFilters, FinancialReportFilters } from '../models/report-filters.model';
import { ReportContextItem, ReportPreviewGroup, ReportResult, ReportTableRow } from '../models/report-result.model';
import { ReportsCatalogService } from './reports-catalog.service';
import {
  nextLocalDayStart,
  startOfLocalDateOnly,
} from '../utils/report-date-range';

@Injectable({ providedIn: 'root' })
export class ReportsRunnerService {
  private readonly appointmentsService = inject(AppointmentsService);
  private readonly caseFilesService = inject(CaseFilesService);
  private readonly financialTransactionsService = inject(FinancialTransactionsService);
  private readonly patientsService = inject(PatientsService);
  private readonly reportsCatalogService = inject(ReportsCatalogService);

  private static readonly CLINICAL_NOTES_PREVIEW_LIMIT = 5;

  runFinancialReport(filters: FinancialReportFilters): Observable<ReportResult<FinancialReportFilters>> {
    const definition = this.getDefinition('financial');
    const query = this.buildInclusiveFinancialQuery(filters);

    return forkJoin({
      summary: this.financialTransactionsService.findSummary(query),
      transactions: this.financialTransactionsService.findAll(query),
    }).pipe(
      map(({ summary, transactions }) => this.buildFinancialResult(definition, filters, summary, transactions))
    );
  }

  runAgendaReport(filters: AgendaReportFilters): Observable<ReportResult<AgendaReportFilters>> {
    const definition = this.getDefinition('agenda');

    return forkJoin({
      appointments: this.appointmentsService.getAppointments(),
      patients: this.patientsService.getPatients().pipe(catchError(() => of([] as Patient[]))),
    }).pipe(map(({ appointments, patients }) => this.buildAgendaResult(definition, filters, appointments, patients)));
  }

  runClinicalSummaryReport(
    filters: ClinicalSummaryReportFilters
  ): Observable<ReportResult<ClinicalSummaryReportFilters>> {
    const definition = this.getDefinition('clinical-summary');

    return this.patientsService.getPatientById(filters.patientId).pipe(
      switchMap((patient) =>
        this.caseFilesService.getCaseFileByPatientId(filters.patientId).pipe(
          switchMap((caseFile) =>
            this.caseFilesService
              .getWorkspace(caseFile.id)
              .pipe(map((workspace) => this.buildClinicalSummaryResult(definition, filters, patient, caseFile, workspace)))
          ),
          catchError((error: { status?: number }) => {
            if (error?.status === 404) {
              return of(this.buildClinicalSummaryResult(definition, filters, patient, null, null));
            }

            return throwError(() => error);
          })
        )
      )
    );
  }

  runClinicalRecordReport(
    filters: ClinicalRecordReportFilters
  ): Observable<ReportResult<ClinicalRecordReportFilters>> {
    const definition = this.getDefinition('clinical-record');

    return this.patientsService.getPatientById(filters.patientId).pipe(
      switchMap((patient) =>
        this.caseFilesService.getCaseFileByPatientId(filters.patientId).pipe(
          switchMap((caseFile) =>
            this.caseFilesService
              .getWorkspace(caseFile.id)
              .pipe(map((workspace) => this.buildClinicalRecordResult(definition, filters, patient, caseFile, workspace)))
          ),
          catchError((error: { status?: number }) => {
            if (error?.status === 404) {
              return of(this.buildClinicalRecordResult(definition, filters, patient, null, null));
            }

            return throwError(() => error);
          })
        )
      )
    );
  }

  private buildFinancialResult(
    definition: ReportDefinition,
    filters: FinancialReportFilters,
    summary: FinancialTransactionSummaryDto,
    transactions: FinancialTransactionResponse[]
  ): ReportResult<FinancialReportFilters> {
    const generatedAt = new Date().toISOString();

    return {
      reportKey: definition.key,
      title: definition.title,
      generatedAt,
      pdfFileName: this.buildPdfFileName('Reporte Financiero', {
        from: filters.from,
        to: filters.to,
        generatedAt,
      }),
      appliedFilters: filters,
      contextItems: this.buildFinancialContextItems(filters),
      metrics: [
        {
          icon: 'trending_up',
          label: 'Ingresos del periodo',
          value: formatFinancialCurrency(summary.incomeTotal),
          supportingText: 'Monto acumulado de ingresos dentro del filtro activo.',
          variant: 'green',
        },
        {
          icon: 'trending_down',
          label: 'Egresos del periodo',
          value: formatFinancialCurrency(summary.expenseTotal),
          supportingText: 'Monto acumulado de egresos para el mismo rango.',
          variant: 'amber',
        },
        {
          icon: 'account_balance_wallet',
          label: 'Balance neto',
          value: formatFinancialCurrency(summary.netTotal),
          supportingText: 'Diferencia entre ingresos y egresos del reporte.',
          variant: 'blue',
        },
        {
          icon: 'receipt_long',
          label: 'Movimientos encontrados',
          value: this.formatMetricCount(summary.transactionCount),
          supportingText: 'Cantidad total de transacciones incluidas en la vista previa.',
          variant: 'violet',
        },
      ],
      columns: [
        { key: 'concept', label: 'Concepto' },
        { key: 'type', label: 'Tipo' },
        { key: 'category', label: 'Categoria' },
        { key: 'status', label: 'Estado' },
        { key: 'amount', label: 'Monto', align: 'end' },
        { key: 'currency', label: 'Moneda' },
        { key: 'paymentMethod', label: 'Metodo de pago' },
        { key: 'occurredAt', label: 'Fecha' },
      ],
      rows: transactions.map((transaction) => ({
        id: transaction.id,
        values: {
          concept: transaction.concept,
          type: getFinancialTransactionTypeLabel(transaction.type),
          category: getFinancialTransactionCategoryLabel(transaction.category),
          status: getFinancialTransactionStatusLabel(transaction.status),
          amount: formatFinancialAmount(transaction.amount, transaction.currency),
          currency: transaction.currency,
          paymentMethod: getPaymentMethodLabel(transaction.paymentMethod),
          occurredAt: formatFinancialDate(transaction.occurredAt),
        },
      })),
      previewMode: 'table',
      groups: [],
      csvFileName: this.buildFinancialCsvFileName(filters),
      supportedExports: definition.supportedExports,
      emptyTitle: 'No hay movimientos para este reporte',
      emptyMessage:
        'Ajusta los filtros o amplia el rango de fechas para visualizar movimientos financieros en el reporte.',
    };
  }

  private buildAgendaResult(
    definition: ReportDefinition,
    filters: AgendaReportFilters,
    appointments: Appointment[],
    patients: Patient[]
  ): ReportResult<AgendaReportFilters> {
    const patientNames = this.buildPatientNamesMap(patients);
    const filteredAppointments = this.filterAgendaAppointments(appointments, filters);
    const sortedAppointments = sortAppointmentsByScheduledAt(filteredAppointments);
    const rows = this.buildAgendaRows(sortedAppointments, patientNames);
    const generatedAt = new Date().toISOString();

    return {
      reportKey: definition.key,
      title: definition.title,
      generatedAt,
      pdfFileName: this.buildPdfFileName('Reporte Agenda', {
        from: filters.from,
        to: filters.to,
        generatedAt,
      }),
      appliedFilters: filters,
      contextItems: this.buildAgendaContextItems(filters, patientNames),
      metrics: this.buildAgendaMetrics(sortedAppointments),
      columns: [
        { key: 'date', label: 'Fecha' },
        { key: 'time', label: 'Hora' },
        { key: 'patient', label: 'Paciente' },
        { key: 'status', label: 'Estado' },
        { key: 'duration', label: 'Duracion', align: 'end' },
        { key: 'notes', label: 'Notas' },
      ],
      rows,
      previewMode: 'grouped',
      groups: this.buildAgendaGroups(sortedAppointments, patientNames),
      csvFileName: this.buildAgendaCsvFileName(filters),
      supportedExports: definition.supportedExports,
      emptyTitle: 'No hay citas para este reporte',
      emptyMessage: 'Ajusta el rango, el estado o el paciente para visualizar la agenda del periodo seleccionado.',
    };
  }

  private buildClinicalSummaryResult(
    definition: ReportDefinition,
    filters: ClinicalSummaryReportFilters,
    patient: Patient,
    caseFile: CaseFile | null,
    workspace: CaseFileWorkspaceResponse | null
  ): ReportResult<ClinicalSummaryReportFilters> {
    const filteredCompletedAppointments = this.getFilteredCompletedAppointments(workspace?.appointments ?? [], filters);
    const filteredNotes = this.getFilteredNotes(workspace?.sessionNotes ?? [], filters);
    const filteredDocuments = this.getFilteredDocuments(workspace?.documents ?? [], filters);
    const filteredTimeline = this.getFilteredTimeline(workspace?.timeline ?? [], filters);
    const sortedTimeline = [...filteredTimeline].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
    const sortedNotes = [...filteredNotes].sort((left, right) => right.sessionDate.localeCompare(left.sessionDate));
    const notesPreview = sortedNotes.slice(0, ReportsRunnerService.CLINICAL_NOTES_PREVIEW_LIMIT);
    const clinicalContent = this.buildClinicalSummaryContent(
      patient,
      caseFile ?? workspace?.caseFile ?? null,
      filteredCompletedAppointments,
      sortedNotes,
      notesPreview,
      filteredDocuments,
      sortedTimeline,
      workspace?.summary.lastActivityAt ?? null
    );

    const generatedAt = new Date().toISOString();

    return {
      reportKey: definition.key,
      title: definition.title,
      generatedAt,
      pdfFileName: this.buildPdfFileName('Resumen Clinico', {
        patientName: `${patient.firstName} ${patient.lastName}`.trim(),
        from: filters.from,
        to: filters.to,
        generatedAt,
      }),
      appliedFilters: filters,
      contextItems: this.buildClinicalSummaryContextItems(filters, patient, caseFile ?? workspace?.caseFile ?? null),
      metrics: this.buildClinicalSummaryMetricCards(clinicalContent.kpis),
      columns: [],
      rows: [],
      previewMode: 'clinical',
      groups: [],
      clinicalContent,
      csvFileName: `resumen-clinico-${filters.patientId}-${filters.from ?? 'sin-desde'}-${filters.to ?? 'sin-hasta'}.csv`,
      supportedExports: definition.supportedExports,
      emptyTitle: 'Selecciona un paciente para generar el resumen',
      emptyMessage: 'El reporte clinico se construye a partir del paciente y su expediente disponible.',
    };
  }

  private buildClinicalRecordResult(
    definition: ReportDefinition,
    filters: ClinicalRecordReportFilters,
    patient: Patient,
    caseFile: CaseFile | null,
    workspace: CaseFileWorkspaceResponse | null
  ): ReportResult<ClinicalRecordReportFilters> {
    const filteredAppointments = this.getFilteredAppointments(workspace?.appointments ?? [], filters);
    const filteredNotes = this.getFilteredNotes(workspace?.sessionNotes ?? [], filters);
    const filteredDocuments = this.getFilteredDocuments(workspace?.documents ?? [], filters);
    const filteredTimeline = this.getFilteredTimeline(workspace?.timeline ?? [], filters);
    const resolvedCaseFile = caseFile ?? workspace?.caseFile ?? null;
    const clinicalContent = this.buildClinicalRecordContent(
      patient,
      resolvedCaseFile,
      filteredAppointments,
      filteredNotes,
      filteredDocuments,
      filteredTimeline,
      workspace?.summary.lastActivityAt ?? null,
      this.buildDateRangeLabel(filters)
    );

    const generatedAt = new Date().toISOString();

    return {
      reportKey: definition.key,
      title: definition.title,
      generatedAt,
      pdfFileName: this.buildPdfFileName('Expediente Clinico', {
        patientName: `${patient.firstName} ${patient.lastName}`.trim(),
        from: filters.from,
        to: filters.to,
        generatedAt,
      }),
      appliedFilters: filters,
      contextItems: this.buildClinicalRecordContextItems(filters, patient, resolvedCaseFile),
      metrics: this.buildClinicalRecordMetricCards(
        resolvedCaseFile,
        filteredAppointments,
        filteredNotes,
        filteredDocuments,
        workspace?.summary.lastActivityAt ?? null
      ),
      columns: [],
      rows: [],
      previewMode: 'clinical',
      groups: [],
      clinicalContent,
      csvFileName: `expediente-clinico-${filters.patientId}-${filters.from ?? 'sin-desde'}-${filters.to ?? 'sin-hasta'}.csv`,
      supportedExports: definition.supportedExports,
      emptyTitle: 'Selecciona un paciente para generar el expediente',
      emptyMessage: 'El expediente clinico se construye a partir del paciente y su expediente disponible.',
    };
  }

  private filterAgendaAppointments(appointments: Appointment[], filters: AgendaReportFilters): Appointment[] {
    const rangeStart = startOfLocalDateOnly(filters.from)?.getTime() ?? Number.NEGATIVE_INFINITY;
    const rangeEndExclusive = nextLocalDayStart(filters.to)?.getTime() ?? Number.POSITIVE_INFINITY;

    return appointments
      .filter((appointment) => (filters.status ? appointment.status === filters.status : true))
      .filter((appointment) => (filters.patientId ? appointment.patientId === filters.patientId : true))
      .filter((appointment) => {
        const appointmentTime = parseAppointmentDate(appointment.scheduledAt).getTime();
        return appointmentTime >= rangeStart && appointmentTime < rangeEndExclusive;
      });
  }

  private buildAgendaRows(appointments: Appointment[], patientNames: Record<string, string>): ReportTableRow[] {
    return appointments.map((appointment) => {
      return {
        id: appointment.id,
        values: {
          date: this.formatAgendaDate(appointment.scheduledAt),
          time: this.formatAgendaTime(appointment.scheduledAt),
          patient: patientNames[appointment.patientId] ?? appointment.patientId,
          status: getAppointmentStatusLabel(appointment.status),
          duration: `${appointment.durationMinutes} min`,
          notes: appointment.notes?.trim() || '-',
        },
      };
    });
  }

  private buildAgendaGroups(appointments: Appointment[], patientNames: Record<string, string>): ReportPreviewGroup[] {
    const groupsMap = new Map<string, ReportPreviewGroup>();

    appointments.forEach((appointment) => {
      const day = startOfLocalDay(appointment.scheduledAt);
      const groupId = day.toISOString();
      const existingGroup = groupsMap.get(groupId);

      if (!existingGroup) {
        groupsMap.set(groupId, {
          id: groupId,
          title: this.formatAgendaGroupDate(day),
          supportingText: '',
          items: [],
        });
      }

      groupsMap.get(groupId)?.items.push({
        id: appointment.id,
        leadingText: this.formatAgendaTime(appointment.scheduledAt),
        title: patientNames[appointment.patientId] ?? appointment.patientId,
        supportingText: appointment.notes?.trim() || 'Sin notas registradas.',
        badge: {
          label: getAppointmentStatusLabel(appointment.status),
          variant: getAppointmentStatusVariant(appointment.status),
        },
        metaItems: [
          {
            label: 'Duracion',
            value: `${appointment.durationMinutes} min`,
          },
        ],
      });
    });

    return [...groupsMap.values()].map((group) => ({
      ...group,
      supportingText: group.items.length === 1 ? '1 cita registrada' : `${group.items.length} citas registradas`,
    }));
  }

  private buildAgendaMetrics(appointments: Appointment[]) {
    const scheduledCount = appointments.filter((appointment) => appointment.status === 'SCHEDULED').length;
    const completedCount = appointments.filter((appointment) => appointment.status === 'COMPLETED').length;
    const incidentsCount = appointments.filter(
      (appointment) => appointment.status === 'CANCELLED' || appointment.status === 'NO_SHOW'
    ).length;
    const totalDurationMinutes = appointments.reduce((total, appointment) => total + appointment.durationMinutes, 0);

    return [
      {
        icon: 'event_note',
        label: 'Citas encontradas',
        value: this.formatAppointmentMetricCount(appointments.length),
        supportingText: 'Cantidad total de citas incluidas en la agenda filtrada.',
        variant: 'blue' as const,
      },
      {
        icon: 'event_available',
        label: 'Programadas',
        value: this.formatAppointmentMetricCount(scheduledCount),
        supportingText: 'Citas pendientes o futuras dentro del periodo consultado.',
        variant: 'green' as const,
      },
      {
        icon: 'task_alt',
        label: 'Completadas',
        value: this.formatAppointmentMetricCount(completedCount),
        supportingText: 'Citas ya atendidas y cerradas en el rango actual.',
        variant: 'violet' as const,
      },
      {
        icon: 'schedule',
        label: 'Duracion total',
        value: this.formatDurationMetric(totalDurationMinutes),
        supportingText: 'Tiempo total reservado entre todas las citas del reporte.',
        variant: 'amber' as const,
      },
      {
        icon: 'event_busy',
        label: 'Incidencias',
        value: this.formatAppointmentMetricCount(incidentsCount),
        supportingText: 'Suma de citas canceladas y marcadas como no asistio.',
        variant: 'blue' as const,
      },
    ];
  }

  private buildPatientNamesMap(patients: Patient[]): Record<string, string> {
    return patients.reduce<Record<string, string>>((accumulator, patient) => {
      accumulator[patient.id] = `${patient.firstName} ${patient.lastName}`;
      return accumulator;
    }, {});
  }

  private getDefinition(key: ReportKey): ReportDefinition {
    const definition = this.reportsCatalogService.getReportByKey(key);

    if (!definition) {
      throw new Error(`Report definition not found for key: ${key}`);
    }

    return definition;
  }

  private buildFinancialCsvFileName(filters: FinancialReportFilters): string {
    const from = filters.from ?? 'sin-desde';
    const to = filters.to ?? 'sin-hasta';

    return `reporte-financiero-${from}-${to}.csv`;
  }

  private buildAgendaCsvFileName(filters: AgendaReportFilters): string {
    const from = filters.from ?? 'sin-desde';
    const to = filters.to ?? 'sin-hasta';

    return `reporte-agenda-${from}-${to}.csv`;
  }

  private buildPdfFileName(
    reportLabel: string,
    options: {
      patientName?: string;
      from?: string;
      to?: string;
      generatedAt: string;
    }
  ): string {
    const dateRangeSegment = this.buildFileDateRangeSegment(options.from, options.to);
    const parts = [
      reportLabel,
      options.patientName?.trim() || undefined,
      dateRangeSegment,
      dateRangeSegment === 'Historico_Completo' ? this.buildGeneratedAtSegment(options.generatedAt) : undefined,
    ].filter((value): value is string => Boolean(value));

    return `${parts.map((part) => this.sanitizeFileNamePart(part)).join('_')}.pdf`;
  }

  private buildFileDateRangeSegment(from?: string, to?: string): string {
    if (from && to) {
      return `${from}_a_${to}`;
    }

    if (from) {
      return `${from}_en_adelante`;
    }

    if (to) {
      return `hasta_${to}`;
    }

    return 'Historico_Completo';
  }

  private buildGeneratedAtSegment(generatedAt: string): string {
    const parsed = new Date(generatedAt);

    if (Number.isNaN(parsed.getTime())) {
      return '';
    }

    return parsed.toISOString().slice(0, 10);
  }

  private sanitizeFileNamePart(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9_-]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '') || 'Sin_Paciente';
  }

  private buildFinancialContextItems(filters: FinancialReportFilters): ReportContextItem[] {
    return [
      {
        label: 'Periodo',
        value: this.buildDateRangeLabel(filters),
      },
      {
        label: 'Tipo',
        value: filters.type ? getFinancialTransactionTypeLabel(filters.type) : 'Todos los tipos',
      },
      {
        label: 'Estado',
        value: filters.status ? getFinancialTransactionStatusLabel(filters.status) : 'Todos los estados',
      },
      {
        label: 'Categoria',
        value: filters.category ? getFinancialTransactionCategoryLabel(filters.category) : 'Todas las categorias',
      },
      {
        label: 'Metodo de pago',
        value: filters.paymentMethod ? getPaymentMethodLabel(filters.paymentMethod) : 'Todos los metodos',
      },
    ];
  }

  private buildAgendaContextItems(
    filters: AgendaReportFilters,
    patientNames: Record<string, string>
  ): ReportContextItem[] {
    return [
      {
        label: 'Periodo',
        value: this.buildDateRangeLabel(filters),
      },
      {
        label: 'Estado',
        value: filters.status ? getAppointmentStatusLabel(filters.status) : 'Todos los estados',
      },
      {
        label: 'Paciente',
        value: filters.patientId ? patientNames[filters.patientId] ?? filters.patientId : 'Todos los pacientes',
      },
    ];
  }

  private buildClinicalSummaryContextItems(
    filters: ClinicalSummaryReportFilters,
    patient: Patient,
    caseFile: CaseFile | null
  ): ReportContextItem[] {
    return [
      {
        label: 'Paciente',
        value: `${patient.firstName} ${patient.lastName}`.trim(),
      },
      {
        label: 'Periodo',
        value: this.buildDateRangeLabel(filters),
      },
      {
        label: 'Expediente',
        value: caseFile ? 'Disponible' : 'Pendiente',
      },
    ];
  }

  private buildClinicalRecordContextItems(
    filters: ClinicalRecordReportFilters,
    patient: Patient,
    caseFile: CaseFile | null
  ): ReportContextItem[] {
    return [
      {
        label: 'Paciente',
        value: `${patient.firstName} ${patient.lastName}`.trim(),
      },
      {
        label: 'Periodo',
        value: this.buildDateRangeLabel(filters),
      },
      {
        label: 'Estado del expediente',
        value: this.getCaseFileAvailabilityLabel(caseFile),
      },
    ];
  }

  private buildDateRangeLabel(filters: { from?: string; to?: string }): string {
    const from = filters.from ? this.formatDateOnlyFilterLabel(filters.from) : null;
    const to = filters.to ? this.formatDateOnlyFilterLabel(filters.to) : null;

    if (from && to) {
      return `${from} al ${to}`;
    }

    if (from) {
      return `Desde ${from}`;
    }

    if (to) {
      return `Hasta ${to}`;
    }

    return 'Historico completo';
  }

  private buildInclusiveFinancialQuery(filters: FinancialReportFilters): FindFinancialTransactionsQueryDto {
    return {
      ...filters,
      from: this.toIsoBoundary(startOfLocalDateOnly(filters.from)),
      to: this.toIsoBoundary(nextLocalDayStart(filters.to)),
    };
  }

  private formatDateOnlyFilterLabel(value: string): string {
    const parsedDate = parseLocalDateOnly(value);

    if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
      return formatFinancialDate(value);
    }

    return parsedDate.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  private toIsoBoundary(value: Date | null): string | undefined {
    return value ? value.toISOString() : undefined;
  }

  private formatMetricCount(value: number): string {
    const count = formatFinancialCount(value);
    return `${count} ${value === 1 ? 'movimiento' : 'movimientos'}`;
  }

  private formatAppointmentMetricCount(value: number): string {
    const count = new Intl.NumberFormat('es-MX', {
      maximumFractionDigits: 0,
    }).format(value);

    return `${count} ${value === 1 ? 'cita' : 'citas'}`;
  }

  private formatDurationMetric(value: number): string {
    const hours = Math.floor(value / 60);
    const minutes = value % 60;

    if (!hours) {
      return `${minutes} min`;
    }

    if (!minutes) {
      return hours === 1 ? '1 hora' : `${hours} horas`;
    }

    return `${hours} h ${minutes} min`;
  }

  private formatAgendaDate(value: string): string {
    const parsedDate = parseAppointmentDate(value);

    return parsedDate.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  private formatAgendaTime(value: string): string {
    const parsedDate = parseAppointmentDate(value);

    return parsedDate.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  private formatAgendaGroupDate(value: Date): string {
    const formatted = value.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  private buildClinicalSummaryContent(
    patient: Patient,
    caseFile: CaseFile | null,
    completedAppointments: Appointment[],
    filteredNotes: SessionNote[],
    notesPreview: SessionNote[],
    filteredDocuments: Document[],
    filteredTimeline: ClinicalTimelineEvent[],
    lastActivityAt: string | null
  ): ClinicalSummaryContent {
    const latestCompletedAppointment = completedAppointments[0] ?? null;
    const timelineItems = filteredTimeline.map((event) => this.mapClinicalTimelineItem(event));
    const notes = notesPreview.map((note) => this.mapClinicalNote(note));
    const documents = [...filteredDocuments]
      .sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt))
      .map((document) => this.mapClinicalDocument(document));
    const hiddenNotesCount = Math.max(filteredNotes.length - notesPreview.length, 0);

    return {
      kind: 'summary',
      patientSection: {
        title: 'Paciente',
        subtitle: 'Datos de identificacion y contacto disponibles en el frontend actual.',
      },
      generalInfoSection: {
        title: 'Informacion clinica general',
        subtitle: 'Resumen base del expediente y su apertura clinica.',
      },
      evolutionSection: {
        title: 'Resumen de evolucion',
        subtitle: 'Sintesis narrativa construida unicamente con datos existentes en el contrato actual.',
        emptyTitle: 'Sin narrativa clinica suficiente',
        emptyMessage: 'Todavia no hay suficiente informacion estructurada para redactar un resumen de evolucion.',
      },
      timelineSection: {
        title: 'Cronologia resumida',
        subtitle: 'Eventos clinicos visibles dentro del rango solicitado.',
        emptyTitle: 'Sin eventos clinicos en el periodo',
        emptyMessage: 'Ajusta el rango de fechas para revisar actividad clinica visible en el workspace.',
      },
      notesSection: {
        title: 'Sesiones relevantes',
        subtitle: 'Notas resumidas para lectura ejecutiva sin imprimir bloques narrativos extensos.',
        emptyTitle: 'Sin notas clinicas en el periodo',
        emptyMessage: 'No se encontraron notas de sesion dentro del rango seleccionado.',
      },
      documentsSection: {
        title: 'Documentos relacionados',
        subtitle: 'Indice de documentos visibles para este expediente en el periodo consultado.',
        emptyTitle: 'Sin documentos relacionados en el periodo',
        emptyMessage: 'No hay documentos visibles en el rango actual.',
      },
      patientFullName: `${patient.firstName} ${patient.lastName}`.trim(),
      patientInitials: this.buildPatientInitials(patient),
      patientDetails: [
        {
          label: 'Telefono',
          value: this.formatOptionalText(patient.phoneNumber),
        },
        {
          label: 'Correo',
          value: this.formatOptionalText(patient.email),
        },
        {
          label: 'Fecha de nacimiento',
          value: this.formatBirthDate(patient.birthDate),
        },
        {
          label: 'Edad',
          value: this.formatPatientAge(patient.birthDate),
        },
      ],
      generalInfo: [
        {
          label: 'Expediente',
          value: this.getCaseFileAvailabilityLabel(caseFile),
        },
        {
          label: 'Fecha de apertura',
          value: caseFile ? this.formatDateTime(caseFile.createdAt) : 'Pendiente',
        },
        {
          label: 'Diagnostico',
          value: this.formatOptionalText(caseFile?.diagnosis),
        },
        {
          label: 'Plan terapeutico',
          value: this.formatOptionalText(caseFile?.treatmentPlan),
        },
      ],
      kpis: this.buildClinicalSummaryKpis(
        caseFile,
        completedAppointments,
        filteredNotes,
        filteredDocuments,
        latestCompletedAppointment,
        lastActivityAt
      ),
      evolutionSummary: this.buildEvolutionSummary(
        patient,
        caseFile,
        completedAppointments,
        filteredNotes,
        filteredDocuments,
        latestCompletedAppointment
      ),
      timelineItems,
      notes,
      hiddenNotesCount,
      documents,
    };
  }

  private buildClinicalRecordContent(
    patient: Patient,
    caseFile: CaseFile | null,
    appointments: Appointment[],
    notes: SessionNote[],
    documents: Document[],
    timeline: ClinicalTimelineEvent[],
    lastActivityAt: string | null,
    periodLabel: string
  ): ClinicalRecordContent {
    const sortedDocuments = [...documents].sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt));
    const sortedTimeline = [...timeline].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
    const mappedDocuments = sortedDocuments.map((document) => this.mapClinicalRecordDocument(document));

    return {
      kind: 'record',
      documentTitle: 'Expediente Clinico',
      patientFullName: `${patient.firstName} ${patient.lastName}`.trim(),
      patientInitials: this.buildPatientInitials(patient),
      generatedAtLabel: this.formatDateTime(new Date().toISOString()),
      periodLabel,
      patientSection: {
        title: 'Identificacion del paciente',
        subtitle: 'Datos generales y de contacto disponibles para este expediente.',
      },
      recordSection: {
        title: 'Datos del expediente',
        subtitle: 'Estado documental del expediente y referencias de seguimiento visibles en el frontend.',
      },
      diagnosisSection: {
        title: 'Diagnostico',
        subtitle: 'Diagnostico clinico registrado en el expediente.',
        emptyTitle: 'Diagnostico no disponible',
        emptyMessage: 'No existe diagnostico clinico registrado en el expediente actual.',
      },
      treatmentPlanSection: {
        title: 'Plan terapeutico',
        subtitle: 'Plan de abordaje registrado para el seguimiento del paciente.',
        emptyTitle: 'Plan terapeutico no disponible',
        emptyMessage: 'No existe plan terapeutico registrado en el expediente actual.',
      },
      appointmentsSection: {
        title: 'Historial de citas',
        subtitle: 'Citas visibles dentro del rango solicitado con estado, duracion y notas asociadas.',
        emptyTitle: 'Sin citas en el periodo',
        emptyMessage: 'No se encontraron citas visibles para el rango seleccionado.',
      },
      notesSection: {
        title: 'Notas clinicas',
        subtitle: 'Registro narrativo completo de notas clinicas visibles en el periodo consultado.',
        emptyTitle: 'Sin notas clinicas en el periodo',
        emptyMessage: 'No se encontraron notas clinicas dentro del rango seleccionado.',
      },
      documentsSection: {
        title: 'Documentos relacionados',
        subtitle: 'Listado documental referencial con nombre, tipo y fecha de carga.',
        emptyTitle: 'Sin documentos en el periodo',
        emptyMessage: 'No se encontraron documentos relacionados dentro del rango seleccionado.',
      },
      timelineSection: {
        title: 'Timeline clinico',
        subtitle: 'Secuencia cronologica de eventos clinicos relevantes dentro del periodo.',
        emptyTitle: 'Sin eventos clinicos en el periodo',
        emptyMessage: 'No se identificaron eventos clinicos visibles para el rango seleccionado.',
      },
      referencesSection: {
        title: 'Referencias y anexos',
        subtitle: 'Indice referencial de documentos asociados. No se embeben archivos reales en este reporte.',
        emptyTitle: 'Sin referencias documentales',
        emptyMessage: 'No hay documentos disponibles para anexar como referencia en el periodo consultado.',
      },
      patientDetails: [
        {
          label: 'Nombre completo',
          value: `${patient.firstName} ${patient.lastName}`.trim(),
        },
        {
          label: 'Telefono',
          value: this.formatOptionalText(patient.phoneNumber),
        },
        {
          label: 'Correo',
          value: this.formatOptionalText(patient.email),
        },
        {
          label: 'Fecha de nacimiento',
          value: this.formatBirthDate(patient.birthDate),
        },
        {
          label: 'Edad',
          value: this.formatPatientAge(patient.birthDate),
        },
      ],
      recordDetails: [
        {
          label: 'Estado derivado',
          value: this.getCaseFileAvailabilityLabel(caseFile),
        },
        {
          label: 'Fecha de apertura',
          value: caseFile ? this.formatDateTime(caseFile.createdAt) : 'Pendiente',
        },
        {
          label: 'Ultima actividad',
          value: lastActivityAt ? this.formatDateTime(lastActivityAt) : 'Sin actividad visible',
        },
        {
          label: 'Periodo consultado',
          value: periodLabel,
        },
      ],
      diagnosis: caseFile?.diagnosis?.trim() || 'No existe diagnostico clinico registrado en el expediente actual.',
      treatmentPlan:
        caseFile?.treatmentPlan?.trim() || 'No existe plan terapeutico registrado en el expediente actual.',
      appointments: appointments.map((appointment) => this.mapClinicalRecordAppointment(appointment)),
      notes: notes.map((note) => this.mapClinicalRecordNote(note)),
      documents: mappedDocuments,
      timelineItems: sortedTimeline.map((event) => this.mapClinicalRecordTimelineItem(event)),
      references: mappedDocuments.map((document, index) => this.buildClinicalRecordReference(document, index)),
    };
  }

  private buildClinicalSummaryMetricCards(kpis: ClinicalSummaryMetric[]) {
    const variants: Array<'blue' | 'green' | 'amber' | 'violet'> = ['blue', 'green', 'amber', 'violet', 'blue'];

    return kpis.map((metric, index) => ({
      icon: ['event_available', 'notes', 'description', 'schedule', 'history'][index] ?? 'insights',
      label: metric.label,
      value: metric.value,
      supportingText: metric.supportingText,
      variant: variants[index] ?? 'blue',
    }));
  }

  private buildClinicalRecordMetricCards(
    caseFile: CaseFile | null,
    appointments: Appointment[],
    notes: SessionNote[],
    documents: Document[],
    lastActivityAt: string | null
  ) {
    const latestAppointment = appointments[0] ?? null;

    return [
      {
        icon: 'folder_shared',
        label: 'Estado del expediente',
        value: this.getCaseFileAvailabilityLabel(caseFile),
        supportingText: 'Condicion derivada de diagnostico y plan terapeutico visibles en el expediente.',
        variant: 'blue' as const,
      },
      {
        icon: 'event_note',
        label: 'Citas visibles',
        value: this.formatAppointmentMetricCount(appointments.length),
        supportingText: 'Citas identificadas dentro del rango inclusivo solicitado.',
        variant: 'green' as const,
      },
      {
        icon: 'notes',
        label: 'Notas clinicas',
        value: this.formatCount(notes.length, 'nota', 'notas'),
        supportingText: 'Notas clinicas completas visibles para el mismo periodo.',
        variant: 'violet' as const,
      },
      {
        icon: 'description',
        label: 'Documentos relacionados',
        value: this.formatCount(documents.length, 'documento', 'documentos'),
        supportingText: 'Documentos referenciales visibles dentro del periodo consultado.',
        variant: 'amber' as const,
      },
      {
        icon: 'history',
        label: 'Ultima actividad',
        value: lastActivityAt ? this.formatDateTime(lastActivityAt) : latestAppointment ? this.formatDateTime(latestAppointment.scheduledAt) : 'Sin actividad visible',
        supportingText: 'Referencia temporal mas reciente encontrada en el expediente visible.',
        variant: 'blue' as const,
      },
    ];
  }

  private buildClinicalSummaryKpis(
    caseFile: CaseFile | null,
    completedAppointments: Appointment[],
    notes: SessionNote[],
    documents: Document[],
    latestCompletedAppointment: Appointment | null,
    lastActivityAt: string | null
  ): ClinicalSummaryMetric[] {
    return [
      {
        label: 'Sesiones completadas',
        value: this.formatAppointmentMetricCount(completedAppointments.length),
        supportingText: 'Citas completadas dentro del periodo.',
      },
      {
        label: 'Notas clinicas',
        value: this.formatCount(notes.length, 'nota', 'notas'),
        supportingText: 'Notas de sesion registradas para el mismo periodo.',
      },
      {
        label: 'Documentos relacionados',
        value: this.formatCount(documents.length, 'documento', 'documentos'),
        supportingText: 'Documentos visibles del expediente dentro del rango solicitado.',
      },
      {
        label: 'Tiempo en seguimiento',
        value: caseFile ? this.formatFollowUpDuration(caseFile.createdAt, lastActivityAt) : 'Pendiente',
        supportingText: 'Tiempo transcurrido desde la apertura del expediente hasta la ultima actividad visible.',
      },
      {
        label: 'Ultima sesion',
        value: latestCompletedAppointment ? this.formatDateTime(latestCompletedAppointment.scheduledAt) : 'Sin sesiones',
        supportingText: 'Ultima cita completada identificada dentro del periodo filtrado.',
      },
    ];
  }

  private buildEvolutionSummary(
    patient: Patient,
    caseFile: CaseFile | null,
    completedAppointments: Appointment[],
    notes: SessionNote[],
    documents: Document[],
    latestCompletedAppointment: Appointment | null
  ): string[] {
    const summary: string[] = [];
    const patientName = `${patient.firstName} ${patient.lastName}`.trim();

    if (caseFile) {
      summary.push(`El expediente clinico de ${patientName} fue abierto el ${this.formatDateTime(caseFile.createdAt)}.`);
    }

    if (caseFile?.diagnosis?.trim()) {
      summary.push(`Diagnostico disponible: ${caseFile.diagnosis.trim()}.`);
    }

    if (caseFile?.treatmentPlan?.trim()) {
      summary.push(`Plan terapeutico registrado: ${caseFile.treatmentPlan.trim()}.`);
    }

    if (completedAppointments.length) {
      summary.push(
        `Durante el periodo filtrado se identifican ${this.formatCount(completedAppointments.length, 'sesion completada', 'sesiones completadas')}.`
      );
    }

    if (latestCompletedAppointment) {
      summary.push(`La ultima sesion visible en el periodo fue el ${this.formatDateTime(latestCompletedAppointment.scheduledAt)}.`);
    }

    if (notes.length) {
      summary.push(`Se registran ${this.formatCount(notes.length, 'nota clinica', 'notas clinicas')} asociadas al expediente en el rango consultado.`);
    }

    if (documents.length) {
      summary.push(`El expediente muestra ${this.formatCount(documents.length, 'documento relacionado', 'documentos relacionados')} en el periodo.`);
    }

    return summary;
  }

  private getFilteredCompletedAppointments(
    appointments: Appointment[],
    filters: ClinicalSummaryReportFilters
  ): Appointment[] {
    return sortAppointmentsByScheduledAt(
      appointments.filter((appointment) => appointment.status === 'COMPLETED' && this.matchesInclusiveRange(appointment.scheduledAt, filters))
    ).reverse();
  }

  private getFilteredAppointments(
    appointments: Appointment[],
    filters: ClinicalSummaryReportFilters | ClinicalRecordReportFilters
  ): Appointment[] {
    return sortAppointmentsByScheduledAt(
      appointments.filter((appointment) => this.matchesInclusiveRange(appointment.scheduledAt, filters))
    ).reverse();
  }

  private getFilteredNotes(
    notes: SessionNote[],
    filters: ClinicalSummaryReportFilters | ClinicalRecordReportFilters
  ): SessionNote[] {
    return [...notes]
      .filter((note) => this.matchesInclusiveRange(note.sessionDate, filters))
      .sort((left, right) => right.sessionDate.localeCompare(left.sessionDate));
  }

  private getFilteredDocuments(
    documents: Document[],
    filters: ClinicalSummaryReportFilters | ClinicalRecordReportFilters
  ): Document[] {
    return documents.filter((document) => this.matchesInclusiveRange(document.uploadedAt, filters));
  }

  private getFilteredTimeline(
    timeline: ClinicalTimelineEvent[],
    filters: ClinicalSummaryReportFilters | ClinicalRecordReportFilters
  ): ClinicalTimelineEvent[] {
    return timeline.filter((event) => this.matchesInclusiveRange(event.occurredAt, filters));
  }

  private matchesInclusiveRange(value: string, filters: { from?: string; to?: string }): boolean {
    const parsedDate = this.parseReportDateValue(value);
    const time = parsedDate?.getTime() ?? Number.NaN;

    if (Number.isNaN(time)) {
      return false;
    }

    const rangeStart = startOfLocalDateOnly(filters.from)?.getTime() ?? Number.NEGATIVE_INFINITY;
    const rangeEndExclusive = nextLocalDayStart(filters.to)?.getTime() ?? Number.POSITIVE_INFINITY;

    return time >= rangeStart && time < rangeEndExclusive;
  }

  private mapClinicalTimelineItem(event: ClinicalTimelineEvent): ClinicalSummaryTimelineItem {
    return {
      id: event.id,
      title: this.getClinicalTimelineTitle(event),
      description: event.description?.trim() || event.title?.trim() || 'Evento clinico registrado en el expediente.',
      occurredAt: event.occurredAt,
      occurredAtLabel: this.formatDateTime(event.occurredAt),
      sourceType: event.sourceType,
    };
  }

  private mapClinicalNote(note: SessionNote): ClinicalSummaryNote {
    return {
      id: note.id,
      sessionDate: note.sessionDate,
      sessionDateLabel: this.formatDateTime(note.sessionDate),
      title: note.title?.trim() || 'Sesion sin titulo',
      excerpt: this.buildExcerpt(note.content),
    };
  }

  private mapClinicalDocument(document: Document): ClinicalSummaryDocument {
    return {
      id: document.id,
      fileName: document.fileName,
      typeLabel: this.getDocumentTypeLabel(document.mimeType),
      uploadedAt: document.uploadedAt,
      uploadedAtLabel: this.formatDateTime(document.uploadedAt),
    };
  }

  private mapClinicalRecordAppointment(appointment: Appointment): ClinicalRecordAppointmentItem {
    return {
      id: appointment.id,
      scheduledAt: appointment.scheduledAt,
      scheduledAtLabel: this.formatDateTime(appointment.scheduledAt),
      statusLabel: getAppointmentStatusLabel(appointment.status),
      durationLabel: `${appointment.durationMinutes} min`,
      notes: appointment.notes?.trim() || 'Sin notas de cita registradas.',
    };
  }

  private mapClinicalRecordNote(note: SessionNote): ClinicalRecordNoteItem {
    return {
      id: note.id,
      sessionDate: note.sessionDate,
      sessionDateLabel: this.formatDateTime(note.sessionDate),
      title: note.title?.trim() || 'Sesion sin titulo',
      content: note.content.trim() || 'Sin contenido narrativo registrado.',
    };
  }

  private mapClinicalRecordDocument(document: Document): ClinicalRecordDocumentItem {
    return {
      id: document.id,
      fileName: document.fileName,
      typeLabel: this.getDocumentTypeLabel(document.mimeType),
      uploadedAt: document.uploadedAt,
      uploadedAtLabel: this.formatDateTime(document.uploadedAt),
    };
  }

  private mapClinicalRecordTimelineItem(event: ClinicalTimelineEvent): ClinicalRecordTimelineItem {
    return {
      id: event.id,
      title: this.getClinicalTimelineTitle(event),
      description: event.description?.trim() || event.title?.trim() || 'Evento clinico registrado en el expediente.',
      occurredAt: event.occurredAt,
      occurredAtLabel: this.formatDateTime(event.occurredAt),
    };
  }

  private buildClinicalRecordReference(
    document: ClinicalRecordDocumentItem,
    index: number
  ): ClinicalRecordField {
    return {
      label: `Anexo ${index + 1}`,
      value: `${document.fileName} | ${document.typeLabel} | ${document.uploadedAtLabel}`,
    };
  }

  private getClinicalTimelineTitle(event: ClinicalTimelineEvent): string {
    const titles: Record<ClinicalTimelineEvent['type'], string> = {
      CASE_FILE_CREATED: 'Expediente creado',
      APPOINTMENT_COMPLETED: 'Sesión completada',
      SESSION_NOTE_CREATED: 'Nota clínica registrada',
      DOCUMENT_UPLOADED: 'Documento agregado',
    };

    return titles[event.type];
  }

  private buildPatientInitials(patient: Patient): string {
    return `${patient.firstName.charAt(0)}${patient.lastName.charAt(0)}`.trim().toUpperCase();
  }

  private getCaseFileAvailabilityLabel(caseFile: CaseFile | null): string {
    if (!caseFile) {
      return 'Sin expediente';
    }

    const hasDiagnosis = Boolean(caseFile.diagnosis?.trim());
    const hasTreatmentPlan = Boolean(caseFile.treatmentPlan?.trim());

    if (hasDiagnosis && hasTreatmentPlan) {
      return 'Base clinica completa';
    }

    return 'Base clinica parcial';
  }

  private formatOptionalText(value?: string | null): string {
    return value?.trim() || 'No disponible';
  }

  private formatBirthDate(value?: string | null): string {
    if (!value) {
      return 'No disponible';
    }

    return formatFinancialDate(value);
  }

  private formatPatientAge(value?: string | null): string {
    if (!value) {
      return 'No disponible';
    }

    const birthDate = new Date(value);

    if (Number.isNaN(birthDate.getTime())) {
      return 'No disponible';
    }

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();

    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
      age -= 1;
    }

    return age >= 0 ? `${age} ${age === 1 ? 'ano' : 'anos'}` : 'No disponible';
  }

  private formatFollowUpDuration(start: string, end?: string | null): string {
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) {
      return 'Pendiente';
    }

    const totalDays = Math.max(Math.floor((endDate.getTime() - startDate.getTime()) / 86_400_000), 0);
    const months = Math.floor(totalDays / 30);
    const days = totalDays % 30;

    if (!months) {
      return `${days || 1} ${days === 1 ? 'dia' : 'dias'}`;
    }

    if (!days) {
      return `${months} ${months === 1 ? 'mes' : 'meses'}`;
    }

    return `${months} ${months === 1 ? 'mes' : 'meses'} y ${days} ${days === 1 ? 'dia' : 'dias'}`;
  }

  private formatDateTime(value: string): string {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return formatFinancialDate(value);
    }

    return formatFinancialDateTime(value);
  }

  private formatCount(value: number, singular: string, plural: string): string {
    return `${new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(value)} ${value === 1 ? singular : plural}`;
  }

  private buildExcerpt(value: string): string {
    const normalized = value.replace(/\s+/g, ' ').trim();

    if (normalized.length <= 180) {
      return normalized;
    }

    return `${normalized.slice(0, 177).trimEnd()}...`;
  }

  private getDocumentTypeLabel(mimeType?: string | null): string {
    const normalized = mimeType?.trim().toLowerCase() ?? '';

    if (normalized === 'application/pdf') {
      return 'PDF';
    }

    if (normalized === 'image/png') {
      return 'Imagen PNG';
    }

    if (normalized === 'image/jpeg' || normalized === 'image/jpg') {
      return 'Imagen JPG';
    }

    if (normalized === 'image/webp') {
      return 'Imagen WEBP';
    }

    if (normalized.startsWith('image/')) {
      return `Imagen ${normalized.slice('image/'.length).toUpperCase()}`;
    }

    if (normalized.startsWith('text/')) {
      return `Texto ${normalized.slice('text/'.length).toUpperCase()}`;
    }

    if (normalized === 'application/msword') {
      return 'Documento Word';
    }

    if (normalized === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return 'Documento Word (DOCX)';
    }

    if (normalized === 'application/vnd.ms-excel') {
      return 'Hoja de calculo Excel';
    }

    if (normalized === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      return 'Hoja de calculo Excel (XLSX)';
    }

    return mimeType?.trim() || 'No disponible';
  }

  private parseReportDateValue(value: string): Date | null {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return parseLocalDateOnly(value);
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
}
