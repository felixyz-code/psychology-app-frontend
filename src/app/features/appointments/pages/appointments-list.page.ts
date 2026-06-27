import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule, MatDatepickerInputEvent } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import { DataTableEmptyStateComponent } from '../../../shared/components/data-table-empty-state/data-table-empty-state.component';
import { SectionCardComponent } from '../../../shared/components/section-card/section-card.component';
import { StatusBadgeComponent, StatusBadgeVariant } from '../../../shared/components/status-badge/status-badge.component';
import { DataTableResult, DataTableState } from '../../../shared/models/data-table.models';
import { formatFilteredResultsLabel, getSafePageIndex, matchesSearchTerm, paginateItems, sortItems } from '../../../shared/utils/data-table';
import { Patient } from '../../patients/models/patient.models';
import { PatientsService } from '../../patients/services/patients.service';
import { AppointmentDeleteDialogComponent } from '../components/appointment-delete-dialog.component';
import { AppointmentsCalendarComponent } from '../components/appointments-calendar.component';
import { AppointmentsDailyAgendaComponent } from '../components/appointments-daily-agenda.component';
import { AppointmentFormDialogComponent } from '../components/appointment-form-dialog.component';
import { Appointment, AppointmentStatus } from '../models/appointment.models';
import { AppointmentsService } from '../services/appointments.service';
import {
  endOfLocalMonth,
  isSameLocalDay,
  isWithinLocalDateRange,
  parseAppointmentDate,
  sortAppointmentsByScheduledAt,
  startOfLocalDay,
  startOfLocalMonth,
} from '../utils/appointment-datetime';

interface AppointmentsTableState extends DataTableState {
  statusFilter: 'ALL' | AppointmentStatus;
  startDate: Date | null;
  endDate: Date | null;
}

@Component({
  selector: 'app-appointments-list-page',
  standalone: true,
  imports: [
    DatePipe,
    MatButtonModule,
    MatButtonToggleModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatNativeDateModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSortModule,
    MatTableModule,
    DataTableEmptyStateComponent,
    SectionCardComponent,
    StatusBadgeComponent,
    AppointmentsCalendarComponent,
    AppointmentsDailyAgendaComponent,
  ],
  templateUrl: './appointments-list.page.html',
  styleUrl: './appointments-list.page.scss',
})
export class AppointmentsListPage {
  private readonly appointmentsService = inject(AppointmentsService);
  private readonly patientsService = inject(PatientsService);
  private readonly dialog = inject(MatDialog);
  private readonly defaultDateRange = this.createCurrentMonthDateRange();

  readonly displayedColumns = ['patient', 'scheduledAt', 'durationMinutes', 'status', 'actions'];
  readonly pageSizeOptions = [10, 20, 50, 100];
  readonly appointmentStatuses: AppointmentStatus[] = ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
  readonly viewMode = signal<'table' | 'calendar' | 'agenda'>('table');
  readonly selectedAgendaDate = signal(startOfLocalDay(new Date()));
  readonly patientNameResolver = (patientId: string) => this.getPatientName(patientId);
  readonly appointmentStatusLabelResolver = (status: AppointmentStatus) => this.getAppointmentStatusLabel(status);
  readonly appointmentStatusClassResolver = (status: AppointmentStatus) => this.getAppointmentStatusClass(status);
  readonly appointments = signal<Appointment[]>([]);
  readonly patientNames = signal<Record<string, string>>({});
  readonly availablePatients = signal<Patient[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly cancellingAppointmentId = signal<string | null>(null);
  readonly tableState = signal<AppointmentsTableState>({
    searchTerm: '',
    pageIndex: 0,
    pageSize: 10,
    statusFilter: 'ALL',
    startDate: this.defaultDateRange.startDate,
    endDate: this.defaultDateRange.endDate,
    sortBy: undefined,
    sortDirection: '',
  });
  readonly baseFilteredAppointments = computed(() => {
    const state = this.tableState();

    return this.appointments()
      .filter((appointment) =>
        matchesSearchTerm(appointment, state.searchTerm, (item) => this.getAppointmentSearchValues(item))
      )
      .filter((appointment) => (state.statusFilter === 'ALL' ? true : appointment.status === state.statusFilter));
  });
  readonly filteredAppointments = computed(() => {
    const state = this.tableState();

    return this.baseFilteredAppointments().filter((appointment) =>
      isWithinLocalDateRange(appointment.scheduledAt, state.startDate, state.endDate)
    );
  });
  readonly tableSortedAppointments = computed(() =>
    sortItems(this.filteredAppointments(), {
      sortBy: this.tableState().sortBy,
      sortDirection: this.tableState().sortDirection,
      getSortValue: (appointment, sortBy) => this.getAppointmentSortValue(appointment, sortBy),
    })
  );
  readonly calendarAppointments = computed(() =>
    sortAppointmentsByScheduledAt(this.filteredAppointments())
  );
  readonly appointmentsForSelectedDay = computed(() =>
    sortAppointmentsByScheduledAt(
      this.baseFilteredAppointments().filter((appointment) =>
        isSameLocalDay(appointment.scheduledAt, this.selectedAgendaDate())
      )
    )
  );
  readonly appointmentsTableResult = computed<DataTableResult<Appointment>>(() => {
    const state = this.tableState();
    const items = this.appointments();
    const filteredItems = this.filteredAppointments();
    const sortedItems = this.tableSortedAppointments();

    return {
      items,
      filteredItems,
      pagedItems: paginateItems(sortedItems, {
        pageIndex: this.safePageIndex(),
        pageSize: state.pageSize,
      }),
      totalItems: items.length,
      totalFilteredItems: filteredItems.length,
      hasActiveFilters: Boolean(state.searchTerm.trim()) || state.statusFilter !== 'ALL' || this.hasDateRangeFilter(state),
    };
  });
  readonly showDateRangeReset = computed(() => !this.isCurrentMonthDateRange(this.tableState()));
  readonly hasNonDateFilters = computed(() => {
    const state = this.tableState();
    return Boolean(state.searchTerm.trim()) || state.statusFilter !== 'ALL';
  });
  readonly showToolbarReset = computed(() => {
    return this.hasNonDateFilters() || this.showDateRangeReset();
  });
  readonly safePageIndex = computed(() => {
    const state = this.tableState();
    return getSafePageIndex(this.filteredAppointments().length, state.pageIndex, state.pageSize);
  });
  readonly appointmentsCounterLabel = computed(() => {
    const result = this.appointmentsTableResult();

    return formatFilteredResultsLabel(
      result.totalFilteredItems,
      result.totalItems,
      (count) => this.formatAppointmentCount(count),
      result.hasActiveFilters
    );
  });
  readonly visibleCalendarMonth = computed(() => {
    const startDate = this.tableState().startDate;
    const monthReference = startDate ?? new Date();

    return new Date(monthReference.getFullYear(), monthReference.getMonth(), 1);
  });

  constructor() {
    this.loadAppointments();
  }

  loadAppointments(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.appointments.set([]);

    forkJoin({
      appointments: this.appointmentsService.getAppointments(),
      patients: this.patientsService.getPatients().pipe(catchError(() => of([] as Patient[]))),
    }).subscribe({
      next: ({ appointments, patients }) => {
        const sortedPatients = [...patients].sort((first, second) =>
          `${first.firstName} ${first.lastName}`.localeCompare(`${second.firstName} ${second.lastName}`)
        );

        this.appointments.set(appointments);
        this.patientNames.set(this.buildPatientNames(sortedPatients));
        this.availablePatients.set(sortedPatients);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('No fue posible cargar las citas.');
      },
    });
  }

  openEditAppointmentDialog(appointment: Appointment): void {
    this.successMessage.set('');

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
        this.loadAppointments();
      }
    });
  }

  openCreateAppointmentDialog(selectedDate?: Date): void {
    this.successMessage.set('');

    const dialogRef = this.dialog.open(AppointmentFormDialogComponent, {
      width: '720px',
      maxWidth: '95vw',
      autoFocus: false,
      data: {
        mode: 'create',
        patients: this.availablePatients(),
        scheduledAt: selectedDate,
      },
    });

    dialogRef.afterClosed().subscribe((created) => {
      if (created) {
        this.loadAppointments();
      }
    });
  }

  cancelAppointment(appointment: Appointment): void {
    if (this.cancellingAppointmentId()) {
      return;
    }

    this.errorMessage.set('');
    this.successMessage.set('');
    this.cancellingAppointmentId.set(appointment.id);

    this.appointmentsService
      .updateAppointment(appointment.id, {
        status: 'CANCELLED',
      })
      .pipe(finalize(() => this.cancellingAppointmentId.set(null)))
      .subscribe({
        next: () => {
          this.successMessage.set('La cita fue cancelada correctamente.');
          this.loadAppointments();
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.getAppointmentActionErrorMessage(error, 'cancelar'));
        },
      });
  }

  openDeleteAppointmentDialog(appointment: Appointment): void {
    this.successMessage.set('');

    const dialogRef = this.dialog.open(AppointmentDeleteDialogComponent, {
      width: '520px',
      maxWidth: '95vw',
      autoFocus: false,
      data: {
        appointment,
      },
    });

    dialogRef.afterClosed().subscribe((deleted) => {
      if (deleted) {
        this.loadAppointments();
      }
    });
  }

  getPatientName(patientId: string): string {
    return this.patientNames()[patientId] ?? patientId;
  }

  getAppointmentStatusLabel(status: AppointmentStatus): string {
    const labels: Record<AppointmentStatus, string> = {
      SCHEDULED: 'Programada',
      COMPLETED: 'Completada',
      CANCELLED: 'Cancelada',
      NO_SHOW: 'No asistió',
    };

    return labels[status];
  }

  getAppointmentStatusClass(status: AppointmentStatus): StatusBadgeVariant {
    const classes: Record<AppointmentStatus, StatusBadgeVariant> = {
      SCHEDULED: 'primary',
      COMPLETED: 'success',
      CANCELLED: 'danger',
      NO_SHOW: 'warning',
    };

    return classes[status];
  }

  updateSearchTerm(searchTerm: string): void {
    this.tableState.update((state) => ({
      ...state,
      searchTerm,
      pageIndex: 0,
    }));
  }

  updateStatusFilter(statusFilter: 'ALL' | AppointmentStatus): void {
    this.tableState.update((state) => ({
      ...state,
      statusFilter,
      pageIndex: 0,
    }));
  }

  updateViewMode(viewMode: 'table' | 'calendar' | 'agenda'): void {
    this.viewMode.set(viewMode);
  }

  clearAppointmentFilters(): void {
    this.tableState.update((state) => ({
      ...state,
      searchTerm: '',
      statusFilter: 'ALL',
      startDate: this.defaultDateRange.startDate,
      endDate: this.defaultDateRange.endDate,
      pageIndex: 0,
    }));
  }

  resetDateRangeToCurrentMonth(): void {
    this.tableState.update((state) => ({
      ...state,
      ...this.createCurrentMonthDateRange(),
      pageIndex: 0,
    }));
  }

  updateStartDate(event: MatDatepickerInputEvent<Date>): void {
    this.tableState.update((state) => {
      const startDate = event.value ? startOfLocalDay(event.value) : null;
      const endDate =
        startDate && state.endDate && startDate.getTime() > state.endDate.getTime() ? startDate : state.endDate;

      return {
        ...state,
        startDate,
        endDate,
        pageIndex: 0,
      };
    });
  }

  updateEndDate(event: MatDatepickerInputEvent<Date>): void {
    this.tableState.update((state) => {
      const endDate = event.value ? startOfLocalDay(event.value) : null;
      const startDate =
        endDate && state.startDate && endDate.getTime() < state.startDate.getTime() ? endDate : state.startDate;

      return {
        ...state,
        startDate,
        endDate,
        pageIndex: 0,
      };
    });
  }

  showPreviousCalendarMonth(): void {
    const visibleMonth = this.visibleCalendarMonth();
    this.setCalendarMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1));
  }

  showNextCalendarMonth(): void {
    const visibleMonth = this.visibleCalendarMonth();
    this.setCalendarMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1));
  }

  showCurrentCalendarMonth(): void {
    this.setCalendarMonth(new Date());
  }

  showPreviousAgendaDay(): void {
    this.shiftAgendaDay(-1);
  }

  showNextAgendaDay(): void {
    this.shiftAgendaDay(1);
  }

  showTodayAgenda(): void {
    this.selectedAgendaDate.set(startOfLocalDay(new Date()));
  }

  handleAppointmentsPageChange(event: PageEvent): void {
    this.tableState.update((state) => ({
      ...state,
      pageIndex: event.pageIndex,
      pageSize: event.pageSize,
    }));
  }

  handleAppointmentsSortChange({ active, direction }: Sort): void {
    this.tableState.update((state) => ({
      ...state,
      sortBy: direction ? active : undefined,
      sortDirection: direction,
      pageIndex: 0,
    }));
  }

  getAppointmentsSortActive(): string {
    return this.tableState().sortBy ?? '';
  }

  getAppointmentsSortDirection(): 'asc' | 'desc' | '' {
    return this.tableState().sortDirection ?? '';
  }

  private buildPatientNames(patients: Patient[]): Record<string, string> {
    return patients.reduce<Record<string, string>>((names, patient) => {
      names[patient.id] = `${patient.firstName} ${patient.lastName}`;
      return names;
    }, {});
  }

  private getAppointmentSearchValues(appointment: Appointment): Array<string | number | null | undefined> {
    return [
      this.getPatientName(appointment.patientId),
      appointment.scheduledAt,
      appointment.durationMinutes,
      appointment.status,
      this.getAppointmentStatusLabel(appointment.status),
      appointment.notes,
    ];
  }

  private getAppointmentSortValue(
    appointment: Appointment,
    sortBy: string
  ): string | number | Date | null | undefined {
    const sortValues: Record<string, string | number | Date | null | undefined> = {
      patient: this.getPatientName(appointment.patientId),
      scheduledAt: this.getAppointmentTimestamp(appointment.scheduledAt),
      durationMinutes: appointment.durationMinutes,
      status: this.getAppointmentStatusLabel(appointment.status),
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
    };

    return sortValues[sortBy];
  }

  private getAppointmentActionErrorMessage(error: HttpErrorResponse, action: 'cancelar'): string {
    if (error.status === 401 || error.status === 403) {
      return `No tienes permisos para ${action} esta cita.`;
    }

    if (error.status === 404) {
      return 'La cita ya no está disponible.';
    }

    return `No fue posible ${action} la cita.`;
  }

  private formatAppointmentCount(count: number): string {
    return count === 1 ? '1 cita' : `${count} citas`;
  }

  private getAppointmentTimestamp(value: string): number {
    return parseAppointmentDate(value).getTime();
  }

  private createCurrentMonthDateRange(): Pick<AppointmentsTableState, 'startDate' | 'endDate'> {
    const today = new Date();

    return {
      startDate: startOfLocalMonth(today),
      endDate: endOfLocalMonth(today),
    };
  }

  private hasDateRangeFilter(state: AppointmentsTableState): boolean {
    return state.startDate !== null || state.endDate !== null;
  }

  private isCurrentMonthDateRange(state: AppointmentsTableState): boolean {
    const currentMonth = this.createCurrentMonthDateRange();

    return (
      this.areDatesEqual(state.startDate, currentMonth.startDate) &&
      this.areDatesEqual(state.endDate, currentMonth.endDate)
    );
  }

  private areDatesEqual(first: Date | null, second: Date | null): boolean {
    if (first === second) {
      return true;
    }

    if (!first || !second) {
      return false;
    }

    return first.getTime() === second.getTime();
  }

  private setCalendarMonth(value: Date): void {
    this.tableState.update((state) => ({
      ...state,
      startDate: startOfLocalMonth(value),
      endDate: endOfLocalMonth(value),
      pageIndex: 0,
    }));
  }

  private shiftAgendaDay(days: number): void {
    this.selectedAgendaDate.update((currentDate) =>
      startOfLocalDay(
        new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + days)
      )
    );
  }
}
