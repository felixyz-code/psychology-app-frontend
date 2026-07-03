import { inject, Injectable } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { Appointment } from '../../appointments/models/appointment.models';
import { AppointmentsService } from '../../appointments/services/appointments.service';
import {
  getAppointmentStatusLabel,
  getAppointmentStatusVariant,
} from '../../appointments/utils/appointment-presenters';
import {
  isWithinLocalDateRange,
  parseAppointmentDate,
  sortAppointmentsByScheduledAt,
  startOfLocalDay,
} from '../../appointments/utils/appointment-datetime';
import {
  FinancialTransactionResponse,
  FinancialTransactionSummaryDto,
} from '../../financial-transactions/models/financial-transaction.models';
import { FinancialTransactionsService } from '../../financial-transactions/services/financial-transactions.service';
import {
  formatFinancialAmount,
  formatFinancialCount,
  formatFinancialCurrency,
  formatFinancialDate,
  getFinancialTransactionCategoryLabel,
  getFinancialTransactionStatusLabel,
  getFinancialTransactionTypeLabel,
  getPaymentMethodLabel,
} from '../../financial-transactions/utils/financial-transaction-presenters';
import { Patient } from '../../patients/models/patient.models';
import { PatientsService } from '../../patients/services/patients.service';
import { ReportDefinition, ReportKey } from '../models/report-definition.model';
import { AgendaReportFilters, FinancialReportFilters } from '../models/report-filters.model';
import { ReportContextItem, ReportPreviewGroup, ReportResult, ReportTableRow } from '../models/report-result.model';
import { ReportsCatalogService } from './reports-catalog.service';
import { parseDateInputToLocalDate } from '../utils/report-date-range';

@Injectable({ providedIn: 'root' })
export class ReportsRunnerService {
  private readonly appointmentsService = inject(AppointmentsService);
  private readonly financialTransactionsService = inject(FinancialTransactionsService);
  private readonly patientsService = inject(PatientsService);
  private readonly reportsCatalogService = inject(ReportsCatalogService);

  runFinancialReport(filters: FinancialReportFilters): Observable<ReportResult<FinancialReportFilters>> {
    const definition = this.getDefinition('financial');

    return forkJoin({
      summary: this.financialTransactionsService.findSummary(filters),
      transactions: this.financialTransactionsService.findAll(filters),
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

  private buildFinancialResult(
    definition: ReportDefinition,
    filters: FinancialReportFilters,
    summary: FinancialTransactionSummaryDto,
    transactions: FinancialTransactionResponse[]
  ): ReportResult<FinancialReportFilters> {
    return {
      reportKey: definition.key,
      title: definition.title,
      generatedAt: new Date().toISOString(),
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

    return {
      reportKey: definition.key,
      title: definition.title,
      generatedAt: new Date().toISOString(),
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

  private filterAgendaAppointments(appointments: Appointment[], filters: AgendaReportFilters): Appointment[] {
    const startDate = parseDateInputToLocalDate(filters.from);
    const endDate = parseDateInputToLocalDate(filters.to);

    return appointments
      .filter((appointment) => (filters.status ? appointment.status === filters.status : true))
      .filter((appointment) => (filters.patientId ? appointment.patientId === filters.patientId : true))
      .filter((appointment) => isWithinLocalDateRange(appointment.scheduledAt, startDate, endDate));
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

  private buildDateRangeLabel(filters: { from?: string; to?: string }): string {
    const from = filters.from ? formatFinancialDate(filters.from) : null;
    const to = filters.to ? formatFinancialDate(filters.to) : null;

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
}
