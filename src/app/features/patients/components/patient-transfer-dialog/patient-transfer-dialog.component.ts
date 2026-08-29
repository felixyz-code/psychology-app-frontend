import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import {
  Branch,
  BranchProfessionalScheduleItem,
} from '../../../../core/models/branch.models';
import { BranchesService } from '../../../../core/services/branches.service';
import { Patient } from '../../models/patient.models';
import { PatientsService } from '../../services/patients.service';

export interface PatientTransferDialogData {
  patient: Patient;
}

@Component({
  selector: 'app-patient-transfer-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './patient-transfer-dialog.component.html',
  styleUrl: './patient-transfer-dialog.component.scss',
})
export class PatientTransferDialogComponent implements OnInit {
  readonly data = inject<PatientTransferDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject(MatDialogRef<PatientTransferDialogComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly branchesService = inject(BranchesService);
  private readonly patientsService = inject(PatientsService);

  readonly form: FormGroup = this.fb.group({
    targetBranchId: ['', [Validators.required]],
    targetPsychologistId: [''],
    reason: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(500),
      ],
    ],
  });

  readonly isLoadingBranches = signal(true);
  readonly isLoadingProfessionals = signal(false);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');
  readonly branches = signal<Branch[]>([]);
  readonly professionals = signal<BranchProfessionalScheduleItem[]>([]);

  ngOnInit(): void {
    this.loadBranches();
  }

  loadBranches(): void {
    this.isLoadingBranches.set(true);
    this.errorMessage.set('');

    this.branchesService.findAll({ includeInactive: false }).subscribe({
      next: (branches) => {
        // Filter active branches and exclude current patient branch if already set
        const activeBranches = branches.filter((b) => b.isActive);
        this.branches.set(activeBranches);
        this.isLoadingBranches.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar las sedes disponibles.');
        this.isLoadingBranches.set(false);
      },
    });
  }

  onBranchChange(branchId: string): void {
    this.form.get('targetPsychologistId')?.setValue('');
    this.professionals.set([]);

    if (!branchId) {
      return;
    }

    this.isLoadingProfessionals.set(true);
    this.branchesService.getBranchProfessionals(branchId).subscribe({
      next: (professionals) => {
        this.professionals.set(professionals);
        this.isLoadingProfessionals.set(false);
      },
      error: () => {
        this.professionals.set([]);
        this.isLoadingProfessionals.set(false);
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const formValues = this.form.value;
    const payload = {
      targetBranchId: formValues.targetBranchId,
      targetPsychologistId: formValues.targetPsychologistId || undefined,
      reason: formValues.reason.trim(),
    };

    this.patientsService.transferPatient(this.data.patient.id, payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.dialogRef.close(true);
      },
      error: (err: unknown) => {
        this.isSubmitting.set(false);
        if (err instanceof HttpErrorResponse && err.error?.message) {
          this.errorMessage.set(
            Array.isArray(err.error.message)
              ? err.error.message.join('. ')
              : err.error.message,
          );
        } else {
          this.errorMessage.set(
            'Error al transferir el paciente. Por favor intente nuevamente.',
          );
        }
      },
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  getPatientFullName(): string {
    return `${this.data.patient.firstName} ${this.data.patient.lastName}`;
  }
}
