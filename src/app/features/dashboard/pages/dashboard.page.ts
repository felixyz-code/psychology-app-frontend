import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { ActionCardComponent } from '../../../shared/components/action-card/action-card.component';
import { MetricCardComponent } from '../../../shared/components/metric-card/metric-card.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SectionCardComponent } from '../../../shared/components/section-card/section-card.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import {
  DashboardAppointmentItem,
  DashboardQuickActionId,
  DashboardViewModel,
} from '../models/dashboard-analytics.models';
import { DashboardAnalyticsService } from '../services/dashboard-analytics.service';
import { AppointmentFormDialogComponent } from '../../appointments/components/appointment-form-dialog.component';
import { Appointment } from '../../appointments/models/appointment.models';
import { Patient } from '../../patients/models/patient.models';
import { PatientFormDialogComponent } from '../../patients/components/patient-form-dialog.component';
import { PatientsService } from '../../patients/services/patients.service';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    ActionCardComponent,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MetricCardComponent,
    PageHeaderComponent,
    SectionCardComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
})
export class DashboardPage {
  readonly dashboardSkeletonKpis = Array.from({ length: 4 });
  readonly dashboardSkeletonSections = Array.from({ length: 6 });

  private readonly analyticsService = inject(DashboardAnalyticsService);
  private readonly dialog = inject(MatDialog);
  private readonly patientsService = inject(PatientsService);
  private readonly router = inject(Router);

  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly viewModel = signal<DashboardViewModel | null>(null);
  readonly appointmentLookup = signal<Record<string, Appointment>>({});
  readonly availablePatients = signal<Patient[]>([]);

  constructor() {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.analyticsService.loadDashboardData().subscribe({
      next: ({ snapshot, viewModel }) => {
        this.viewModel.set(viewModel);
        this.availablePatients.set(snapshot.patients);
        this.buildAppointmentLookup(snapshot.appointments, viewModel);
        this.isLoading.set(false);
      },
      error: () => {
        this.viewModel.set(null);
        this.availablePatients.set([]);
        this.errorMessage.set('No fue posible cargar el dashboard ejecutivo.');
        this.isLoading.set(false);
      },
    });
  }

  refreshDashboardData(): void {
    this.loadDashboard();
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
    this.openCreateAppointmentDialogWithPatients();
  }

  handleQuickAction(actionId: DashboardQuickActionId): void {
    if (actionId === 'create-patient') {
      this.openCreatePatientDialog();
      return;
    }

    if (actionId === 'create-appointment') {
      this.openCreateAppointmentDialogWithPatients();
      return;
    }

    if (actionId === 'open-patients') {
      this.navigateToPatients();
      return;
    }

    void this.router.navigate(['/financial-transactions']);
  }

  navigateToAppointments(): void {
    void this.router.navigate(['/appointments']);
  }

  navigateToPatients(): void {
    void this.router.navigate(['/patients']);
  }

  navigateToFinance(): void {
    void this.router.navigate(['/financial-transactions']);
  }

  openAppointmentDetails(item: DashboardAppointmentItem): void {
    const appointment = this.appointmentLookup()[item.id];

    if (!appointment) {
      return;
    }

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

  handleAppointmentCardKeydown(event: KeyboardEvent, item: DashboardAppointmentItem): void {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    this.openAppointmentDetails(item);
  }

  private openCreateAppointmentDialogWithPatients(): void {
    const availablePatients = this.availablePatients();

    if (availablePatients.length) {
      this.openAppointmentCreateDialog(availablePatients);
      return;
    }

    this.patientsService.getPatients().subscribe({
      next: (patients) => {
        this.availablePatients.set(patients);
        this.openAppointmentCreateDialog(patients);
      },
      error: () => {
        this.navigateToAppointments();
      },
    });
  }

  private openAppointmentCreateDialog(patients: Patient[]): void {
    const dialogRef = this.dialog.open(AppointmentFormDialogComponent, {
      width: '720px',
      maxWidth: '95vw',
      autoFocus: false,
      data: {
        mode: 'create',
        patients,
      },
    });

    dialogRef.afterClosed().subscribe((created) => {
      if (created) {
        this.refreshDashboardData();
      }
    });
  }

  private buildAppointmentLookup(appointments: Appointment[], viewModel: DashboardViewModel): void {
    const appointmentIds = new Set([
      ...viewModel.agendaToday.items.map((item) => item.id),
      ...viewModel.upcomingAppointments.items.map((item) => item.id),
    ]);

    this.appointmentLookup.set(
      appointments.reduce<Record<string, Appointment>>((lookup, appointment) => {
        if (appointmentIds.has(appointment.id)) {
          lookup[appointment.id] = appointment;
        }

        return lookup;
      }, {})
    );
  }
}
