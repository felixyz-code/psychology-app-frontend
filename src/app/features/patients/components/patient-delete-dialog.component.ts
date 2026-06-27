import { Component, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { Patient } from '../models/patient.models';
import { PatientsService } from '../services/patients.service';

interface PatientDeleteDialogData {
  patient: Patient;
}

@Component({
  selector: 'app-patient-delete-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule, MatProgressSpinnerModule],
  templateUrl: './patient-delete-dialog.component.html',
  styleUrl: './patient-delete-dialog.component.scss',
})
export class PatientDeleteDialogComponent {
  private readonly data = inject<PatientDeleteDialogData>(MAT_DIALOG_DATA);
  private readonly patientsService = inject(PatientsService);
  private readonly dialogRef = inject(MatDialogRef<PatientDeleteDialogComponent, boolean>);

  readonly isDeleting = signal(false);
  readonly errorMessage = signal('');

  readonly patient = this.data.patient;

  confirmDelete(): void {
    if (this.isDeleting()) {
      return;
    }

    this.isDeleting.set(true);
    this.errorMessage.set('');

    this.patientsService
      .deletePatient(this.patient.id)
      .pipe(finalize(() => this.isDeleting.set(false)))
      .subscribe({
        next: () => {
          this.dialogRef.close(true);
        },
        error: () => {
          this.errorMessage.set('No fue posible eliminar el paciente.');
        },
      });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  getFullName(): string {
    return `${this.patient.firstName} ${this.patient.lastName}`;
  }
}
