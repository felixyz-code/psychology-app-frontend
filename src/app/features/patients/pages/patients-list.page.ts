import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { PatientDeleteDialogComponent } from '../components/patient-delete-dialog.component';
import { PatientDetailDialogComponent } from '../components/patient-detail-dialog.component';
import { PatientFormDialogComponent } from '../components/patient-form-dialog.component';
import { Patient } from '../models/patient.models';
import { PatientsService } from '../services/patients.service';

@Component({
  selector: 'app-patients-list-page',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    PageHeaderComponent,
  ],
  templateUrl: './patients-list.page.html',
  styleUrl: './patients-list.page.scss',
})
export class PatientsListPage {
  private readonly dialog = inject(MatDialog);
  private readonly patientsService = inject(PatientsService);

  readonly displayedColumns = ['name', 'phoneNumber', 'email', 'birthDate', 'actions'];
  readonly patients = signal<Patient[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');

  constructor() {
    this.loadPatients();
  }

  private loadPatients(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.patientsService.getPatients().subscribe({
      next: (patients) => {
        this.patients.set(patients);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('No fue posible cargar los pacientes.');
        this.isLoading.set(false);
      },
    });
  }

  getFullName(patient: Patient): string {
    return `${patient.firstName} ${patient.lastName}`;
  }

  getDisplayValue(value?: string | null): string {
    return value?.trim() || '-';
  }

  formatBirthDate(value?: string | null): string {
    if (!value) {
      return '-';
    }

    const dateOnly = value.slice(0, 10);
    const [year, month, day] = dateOnly.split('-');

    if (!year || !month || !day) {
      return '-';
    }

    return `${day}/${month}/${year}`;
  }

  openCreatePatientDialog(): void {
    const dialogRef = this.dialog.open(PatientFormDialogComponent, {
      width: '720px',
      maxWidth: '95vw',
      autoFocus: false,
      disableClose: this.isLoading(),
      data: {
        mode: 'create',
      },
    });

    dialogRef.afterClosed().subscribe((created) => {
      if (created) {
        this.loadPatients();
      }
    });
  }

  openEditPatientDialog(patient: Patient): void {
    const dialogRef = this.dialog.open(PatientFormDialogComponent, {
      width: '720px',
      maxWidth: '95vw',
      autoFocus: false,
      disableClose: this.isLoading(),
      data: {
        mode: 'edit',
        patient,
      },
    });

    dialogRef.afterClosed().subscribe((updated) => {
      if (updated) {
        this.loadPatients();
      }
    });
  }

  openPatientDetailDialog(patient: Patient): void {
    const dialogRef = this.dialog.open(PatientDetailDialogComponent, {
      width: '960px',
      maxWidth: '95vw',
      autoFocus: false,
      data: {
        patient,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.action === 'edit' && result.patient) {
        this.openEditPatientDialog(result.patient);
      }
    });
  }

  openDeletePatientDialog(patient: Patient): void {
    const dialogRef = this.dialog.open(PatientDeleteDialogComponent, {
      width: '520px',
      maxWidth: '95vw',
      autoFocus: false,
      disableClose: this.isLoading(),
      data: {
        patient,
      },
    });

    dialogRef.afterClosed().subscribe((deleted) => {
      if (deleted) {
        this.loadPatients();
      }
    });
  }
}
