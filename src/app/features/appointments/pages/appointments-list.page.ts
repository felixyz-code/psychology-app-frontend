import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import { DataTableEmptyStateComponent } from '../../../shared/components/data-table-empty-state/data-table-empty-state.component';
import { DataTableToolbarComponent } from '../../../shared/components/data-table-toolbar/data-table-toolbar.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { DataTableResult, DataTableState } from '../../../shared/models/data-table.models';
import { matchesSearchTerm, paginateItems } from '../../../shared/utils/data-table';
import { Patient } from '../../patients/models/patient.models';
import { PatientsService } from '../../patients/services/patients.service';
import { AppointmentDeleteDialogComponent } from '../components/appointment-delete-dialog.component';
import { AppointmentFormDialogComponent } from '../components/appointment-form-dialog.component';
import { Appointment, AppointmentStatus } from '../models/appointment.models';
import { AppointmentsService } from '../services/appointments.service';
import { sortAppointmentsByScheduledAt } from '../utils/appointment-datetime';

@Component({
  selector: 'app-appointments-list-page',
  standalone: true,
  imports: [
    DatePipe,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatTableModule,
    DataTableEmptyStateComponent,
    DataTableToolbarComponent,
    PageHeaderComponent,
  ],
  templateUrl: './appointments-list.page.html',
  styleUrl: './appointments-list.page.scss',
})
export class AppointmentsListPage {
  private readonly appointmentsService = inject(AppointmentsService);
  private readonly patientsService = inject(PatientsService);
  private readonly dialog = inject(MatDialog);

  readonly displayedColumns = ['patient', 'scheduledAt', 'durationMinutes', 'status', 'actions'];
  readonly pageSizeOptions = [10, 20, 50, 100];
  readonly appointments = signal<Appointment[]>([]);
  readonly patientNames = signal<Record<string, string>>({});
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly cancellingAppointmentId = signal<string | null>(null);
  readonly tableState = signal<DataTableState>({
    searchTerm: '',
    pageIndex: 0,
    pageSize: 10,
    sortBy: undefined,
    sortDirection: '',
  });
  readonly appointmentsTableResult = computed<DataTableResult<Appointment>>(() => {
    const state = this.tableState();
    const items = this.appointments();
    const filteredItems = items.filter((appointment) =>
      matchesSearchTerm(appointment, state.searchTerm, (item) => this.getAppointmentSearchValues(item))
    );

    return {
      items,
      filteredItems,
      pagedItems: paginateItems(filteredItems, {
        pageIndex: this.safePageIndex(),
        pageSize: state.pageSize,
      }),
      totalItems: items.length,
      totalFilteredItems: filteredItems.length,
      hasActiveFilters: Boolean(state.searchTerm.trim()),
    };
  });
  readonly safePageIndex = computed(() => {
    const state = this.tableState();
    const totalFilteredItems = this.appointments().filter((appointment) =>
      matchesSearchTerm(appointment, state.searchTerm, (item) => this.getAppointmentSearchValues(item))
    ).length;
    const lastPageIndex = Math.max(Math.ceil(totalFilteredItems / state.pageSize) - 1, 0);

    return Math.min(state.pageIndex, lastPageIndex);
  });
  readonly appointmentsCounterLabel = computed(() => {
    const result = this.appointmentsTableResult();

    if (result.hasActiveFilters) {
      return `${result.totalFilteredItems} de ${this.formatAppointmentCount(result.totalItems)}`;
    }

    return this.formatAppointmentCount(result.totalItems);
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
        this.appointments.set(sortAppointmentsByScheduledAt(appointments));
        this.patientNames.set(this.buildPatientNames(patients));
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

  getAppointmentStatusClass(status: AppointmentStatus): string {
    const classes: Record<AppointmentStatus, string> = {
      SCHEDULED: 'app-status-badge--scheduled',
      COMPLETED: 'app-status-badge--completed',
      CANCELLED: 'app-status-badge--cancelled',
      NO_SHOW: 'app-status-badge--no-show',
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

  clearAppointmentFilters(): void {
    this.tableState.update((state) => ({
      ...state,
      searchTerm: '',
      pageIndex: 0,
    }));
  }

  handleAppointmentsPageChange(event: PageEvent): void {
    this.tableState.update((state) => ({
      ...state,
      pageIndex: event.pageIndex,
      pageSize: event.pageSize,
    }));
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
}
