import { DatePipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DataTableEmptyStateComponent } from '../../../shared/components/data-table-empty-state/data-table-empty-state.component';
import { StatusBadgeComponent, StatusBadgeVariant } from '../../../shared/components/status-badge/status-badge.component';

import { Appointment, AppointmentStatus } from '../models/appointment.models';
import { parseAppointmentDate } from '../utils/appointment-datetime';

@Component({
  selector: 'app-appointments-daily-agenda',
  standalone: true,
  imports: [
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    DataTableEmptyStateComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './appointments-daily-agenda.component.html',
  styleUrl: './appointments-daily-agenda.component.scss',
})
export class AppointmentsDailyAgendaComponent {
  readonly appointments = input.required<Appointment[]>();
  readonly selectedDate = input.required<Date>();
  readonly cancellingAppointmentId = input<string | null>(null);
  readonly getPatientName = input.required<(patientId: string) => string>();
  readonly getStatusLabel = input.required<(status: AppointmentStatus) => string>();
  readonly getStatusClass = input.required<(status: AppointmentStatus) => StatusBadgeVariant>();

  readonly previousDay = output<void>();
  readonly nextDay = output<void>();
  readonly today = output<void>();
  readonly createAppointment = output<void>();
  readonly appointmentSelected = output<Appointment>();
  readonly cancelAppointment = output<Appointment>();
  readonly deleteAppointment = output<Appointment>();

  readonly selectedDateLabel = computed(() => this.formatSelectedDate(this.selectedDate()));

  openPreviousDay(): void {
    this.previousDay.emit();
  }

  openNextDay(): void {
    this.nextDay.emit();
  }

  openToday(): void {
    this.today.emit();
  }

  openCreateAppointment(): void {
    this.createAppointment.emit();
  }

  openAppointment(appointment: Appointment): void {
    this.appointmentSelected.emit(appointment);
  }

  requestCancelAppointment(appointment: Appointment, event: Event): void {
    event.stopPropagation();
    this.cancelAppointment.emit(appointment);
  }

  requestDeleteAppointment(appointment: Appointment, event: Event): void {
    event.stopPropagation();
    this.deleteAppointment.emit(appointment);
  }

  handleAppointmentKeydown(event: KeyboardEvent, appointment: Appointment): void {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    this.openAppointment(appointment);
  }

  trackAppointment(_: number, appointment: Appointment): string {
    return appointment.id;
  }

  isCancellingAppointment(appointmentId: string): boolean {
    return this.cancellingAppointmentId() === appointmentId;
  }

  protected readonly parseAppointmentDate = parseAppointmentDate;

  getCompactPatientName(patientId: string): string {
    const fullName = this.getPatientName()(patientId).trim();

    if (!fullName) {
      return '';
    }

    const nameParts = fullName.split(/\s+/).filter(Boolean);

    if (nameParts.length < 2) {
      return fullName;
    }

    const firstName = nameParts[0];
    const lastNameInitial = nameParts[nameParts.length - 1]?.charAt(0);

    return lastNameInitial ? `${firstName} ${lastNameInitial}.` : firstName;
  }

  private formatSelectedDate(value: Date): string {
    const formatted = new Intl.DateTimeFormat('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(value);

    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }
}
