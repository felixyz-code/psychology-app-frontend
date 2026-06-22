import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { Patient } from '../models/patient.models';

interface PatientDetailDialogData {
  patient: Patient;
}

@Component({
  selector: 'app-patient-detail-dialog',
  standalone: true,
  imports: [DatePipe, MatButtonModule, MatDialogModule],
  templateUrl: './patient-detail-dialog.component.html',
  styleUrl: './patient-detail-dialog.component.scss',
})
export class PatientDetailDialogComponent {
  private readonly data = inject<PatientDetailDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(
    MatDialogRef<PatientDetailDialogComponent, { action: 'close' } | { action: 'edit'; patient: Patient }>
  );

  readonly patient = this.data.patient;

  close(): void {
    this.dialogRef.close({ action: 'close' });
  }

  edit(): void {
    this.dialogRef.close({
      action: 'edit',
      patient: this.patient,
    });
  }

  getFullName(): string {
    return `${this.patient.firstName} ${this.patient.lastName}`;
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
}
