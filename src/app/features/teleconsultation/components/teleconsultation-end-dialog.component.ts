import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface TeleconsultationEndDialogData {
  patientName: string;
  appointmentId?: string;
  durationMinutes?: number;
  isTherapist?: boolean;
}

export interface TeleconsultationEndDialogResult {
  confirmed: boolean;
  markCompleted: boolean;
}

@Component({
  selector: 'app-teleconsultation-end-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatIconModule,
  ],
  templateUrl: './teleconsultation-end-dialog.component.html',
  styleUrl: './teleconsultation-end-dialog.component.scss',
})
export class TeleconsultationEndDialogComponent {
  readonly data = inject<TeleconsultationEndDialogData>(MAT_DIALOG_DATA);
  readonly dialogRef = inject(MatDialogRef<TeleconsultationEndDialogComponent, TeleconsultationEndDialogResult>);

  readonly markCompleted = signal<boolean>(true);

  confirm(): void {
    this.dialogRef.close({
      confirmed: true,
      markCompleted: this.markCompleted(),
    });
  }

  cancel(): void {
    this.dialogRef.close({
      confirmed: false,
      markCompleted: false,
    });
  }
}
