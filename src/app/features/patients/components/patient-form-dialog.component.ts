import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthStore } from '../../../core/auth/auth.store';
import { CreatePatientRequest, Patient, UpdatePatientRequest } from '../models/patient.models';
import { PatientsService } from '../services/patients.service';

interface PatientDialogData {
  mode: 'create' | 'edit';
  patient?: Patient;
}

@Component({
  selector: 'app-patient-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './patient-form-dialog.component.html',
  styleUrl: './patient-form-dialog.component.scss',
})
export class PatientFormDialogComponent {
  private readonly data = inject<PatientDialogData>(MAT_DIALOG_DATA);
  private readonly authStore = inject(AuthStore);
  private readonly formBuilder = inject(FormBuilder);
  private readonly patientsService = inject(PatientsService);
  private readonly dialogRef = inject(MatDialogRef<PatientFormDialogComponent, boolean>);

  readonly isSaving = signal(false);
  readonly errorMessage = signal('');
  readonly mode = this.data.mode;

  readonly patientForm = this.formBuilder.nonNullable.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    phoneNumber: [''],
    email: ['', [Validators.email]],
    birthDate: [''],
  });

  constructor() {
    if (this.mode === 'edit' && this.data.patient) {
      this.patientForm.patchValue({
        firstName: this.data.patient.firstName,
        lastName: this.data.patient.lastName,
        phoneNumber: this.data.patient.phoneNumber ?? '',
        email: this.data.patient.email ?? '',
        birthDate: this.toDateInputValue(this.data.patient.birthDate),
      });
    }
  }

  submit(): void {
    if (this.isSaving()) {
      return;
    }

    if (this.patientForm.invalid) {
      this.patientForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');

    const rawValue = this.patientForm.getRawValue();
    const basePayload = {
      firstName: rawValue.firstName.trim(),
      lastName: rawValue.lastName.trim(),
      phoneNumber: this.normalizeOptional(rawValue.phoneNumber),
      email: this.normalizeOptional(rawValue.email),
      birthDate: this.normalizeDate(rawValue.birthDate),
    };

    if (this.mode === 'edit' && this.data.patient) {
      const payload: UpdatePatientRequest = basePayload;

      this.patientsService
        .updatePatient(this.data.patient.id, payload)
        .pipe(finalize(() => this.isSaving.set(false)))
        .subscribe({
          next: () => {
            this.dialogRef.close(true);
          },
          error: (error) => {
            console.error('PATCH /patients/:id failed', {
              status: error?.status,
              body: error?.error,
              patientId: this.data.patient?.id,
              payload,
            });
            this.errorMessage.set('No fue posible guardar los cambios.');
          },
        });

      return;
    }

    const currentUserId = this.authStore.user()?.id;
    const payload: CreatePatientRequest = {
      ...(currentUserId ? { psychologistId: currentUserId } : {}),
      ...basePayload,
    };

    this.patientsService
      .createPatient(payload)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.dialogRef.close(true);
        },
        error: (error) => {
          console.error('POST /patients failed', {
            status: error?.status,
            body: error?.error,
            payload,
          });
          this.errorMessage.set('No fue posible crear el paciente.');
        },
      });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  hasRequiredError(controlName: 'firstName' | 'lastName'): boolean {
    const control = this.patientForm.controls[controlName];
    return control.touched && control.hasError('required');
  }

  hasEmailError(): boolean {
    const control = this.patientForm.controls.email;
    return control.touched && control.hasError('email');
  }

  getTitle(): string {
    return this.mode === 'edit' ? 'Editar paciente' : 'Nuevo paciente';
  }

  getSubtitle(): string {
    return this.mode === 'edit'
      ? 'Actualiza la información del paciente.'
      : 'Registra la información básica del paciente.';
  }

  getSubmitLabel(): string {
    return this.mode === 'edit' ? 'Guardar cambios' : 'Guardar paciente';
  }

  private normalizeOptional(value: string): string | null {
    const normalized = value.trim();
    return normalized ? normalized : null;
  }

  private toDateInputValue(value?: string | null): string {
    if (!value) {
      return '';
    }

    return value.slice(0, 10);
  }

  private normalizeDate(value: string): string | null {
    const normalized = value.trim();
    return normalized ? normalized : null;
  }
}
