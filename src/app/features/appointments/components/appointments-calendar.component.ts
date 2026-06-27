import { DatePipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { StatusBadgeComponent, StatusBadgeVariant } from '../../../shared/components/status-badge/status-badge.component';

import { Appointment, AppointmentStatus } from '../models/appointment.models';
import { isSameLocalDay, parseAppointmentDate, startOfLocalDay } from '../utils/appointment-datetime';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  appointments: Appointment[];
}

@Component({
  selector: 'app-appointments-calendar',
  standalone: true,
  imports: [DatePipe, MatButtonModule, MatIconModule, StatusBadgeComponent],
  templateUrl: './appointments-calendar.component.html',
  styleUrl: './appointments-calendar.component.scss',
})
export class AppointmentsCalendarComponent {
  readonly appointments = input.required<Appointment[]>();
  readonly visibleMonth = input.required<Date>();
  readonly getPatientName = input.required<(patientId: string) => string>();
  readonly getStatusLabel = input.required<(status: AppointmentStatus) => string>();
  readonly getStatusClass = input.required<(status: AppointmentStatus) => StatusBadgeVariant>();

  readonly previousMonth = output<void>();
  readonly nextMonth = output<void>();
  readonly today = output<void>();
  readonly daySelected = output<Date>();
  readonly appointmentSelected = output<Appointment>();

  readonly weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  readonly monthLabel = computed(() => this.formatMonthLabel(this.visibleMonth()));
  readonly calendarDays = computed(() => this.buildCalendarDays(this.visibleMonth(), this.appointments()));

  openPreviousMonth(): void {
    this.previousMonth.emit();
  }

  openNextMonth(): void {
    this.nextMonth.emit();
  }

  openToday(): void {
    this.today.emit();
  }

  selectDay(date: Date): void {
    this.daySelected.emit(date);
  }

  selectAppointment(appointment: Appointment, event: Event): void {
    event.stopPropagation();
    this.appointmentSelected.emit(appointment);
  }

  trackDay(_: number, day: CalendarDay): string {
    return day.date.toISOString();
  }

  trackAppointment(_: number, appointment: Appointment): string {
    return appointment.id;
  }

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

  getDayAriaLabel(day: CalendarDay): string {
    const appointmentCount = day.appointments.length;
    const dateLabel = day.date.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    if (!appointmentCount) {
      return `${dateLabel}. Sin citas.`;
    }

    const suffix = appointmentCount === 1 ? '1 cita' : `${appointmentCount} citas`;
    return `${dateLabel}. ${suffix}.`;
  }

  private buildCalendarDays(month: Date, appointments: Appointment[]): CalendarDay[] {
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    const gridStart = this.getCalendarGridStart(monthStart);
    const today = startOfLocalDay(new Date());

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
      const isVisibleMonth =
        date.getMonth() === monthStart.getMonth() && date.getFullYear() === monthStart.getFullYear();

      return {
        date,
        isCurrentMonth: isVisibleMonth,
        isToday: isVisibleMonth && isSameLocalDay(date, today),
        appointments: appointments.filter((appointment) => isSameLocalDay(appointment.scheduledAt, date)),
      };
    });
  }

  private getCalendarGridStart(monthStart: Date): Date {
    const dayOfWeek = monthStart.getDay();
    const mondayBasedOffset = (dayOfWeek + 6) % 7;

    return new Date(monthStart.getFullYear(), monthStart.getMonth(), monthStart.getDate() - mondayBasedOffset);
  }

  private formatMonthLabel(value: Date): string {
    const formatted = new Intl.DateTimeFormat('es-MX', {
      month: 'long',
      year: 'numeric',
    }).format(value);

    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  protected readonly parseAppointmentDate = parseAppointmentDate;
}
