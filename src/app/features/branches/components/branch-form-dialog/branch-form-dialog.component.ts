import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { Branch, CreateBranchDto, UpdateBranchDto } from '../../../../core/models/branch.models';
import { BranchesService } from '../../../../core/services/branches.service';

export interface BranchFormDialogData {
  mode: 'create' | 'edit';
  branch?: Branch;
}

export const COMMON_TIMEZONES = [
  'America/Mexico_City',
  'America/Bogota',
  'America/Lima',
  'America/Santiago',
  'America/Argentina/Buenos_Aires',
  'America/Caracas',
  'America/Montevideo',
  'America/Guatemala',
  'America/Costa_Rica',
  'America/Panama',
  'America/Madrid',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'UTC',
];

@Component({
  selector: 'app-branch-form-dialog',
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
    MatSlideToggleModule,
  ],
  templateUrl: './branch-form-dialog.component.html',
  styleUrl: './branch-form-dialog.component.scss',
})
export class BranchFormDialogComponent {
  readonly data = inject<BranchFormDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<BranchFormDialogComponent>);
  private readonly branchesService = inject(BranchesService);

  readonly isEdit = this.data.mode === 'edit';
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');
  readonly planLimitReached = signal(false);
  readonly timezones = COMMON_TIMEZONES;

  readonly form = new FormGroup({
    name: new FormControl<string>(this.data.branch?.name ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120)],
    }),
    code: new FormControl<string>(this.data.branch?.code ?? '', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.maxLength(30),
        Validators.pattern(/^[A-Za-z0-9_-]+$/),
      ],
    }),
    address: new FormControl<string>(this.data.branch?.address ?? '', {
      nonNullable: true,
      validators: [Validators.maxLength(255)],
    }),
    phone: new FormControl<string>(this.data.branch?.phone ?? '', {
      nonNullable: true,
      validators: [Validators.maxLength(30)],
    }),
    timezone: new FormControl<string>(this.data.branch?.timezone ?? 'America/Mexico_City', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(50)],
    }),
    isActive: new FormControl<boolean>(this.data.branch?.isActive ?? true, {
      nonNullable: true,
    }),
  });

  onCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const uppercased = input.value.toUpperCase();
    this.form.controls.code.setValue(uppercased, { emitEvent: false });
  }

  getTitle(): string {
    return this.isEdit ? 'Editar sede' : 'Nueva sede';
  }

  getSubtitle(): string {
    return this.isEdit
      ? 'Actualiza los datos y ubicación de la sede.'
      : 'Registra una nueva sede para tu organización.';
  }

  getSubmitLabel(): string {
    return this.isEdit ? 'Guardar cambios' : 'Crear sede';
  }

  cancel(): void {
    this.dialogRef.close();
  }

  submit(): void {
    if (this.form.invalid || this.isSaving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');
    this.planLimitReached.set(false);

    const values = this.form.getRawValue();

    if (this.isEdit && this.data.branch) {
      const payload: UpdateBranchDto = {
        name: values.name.trim(),
        code: values.code.trim().toUpperCase(),
        address: values.address.trim() || undefined,
        phone: values.phone.trim() || undefined,
        timezone: values.timezone,
        isActive: values.isActive,
      };

      this.branchesService.update(this.data.branch.id, payload).subscribe({
        next: (updated) => {
          this.isSaving.set(false);
          this.dialogRef.close(updated);
        },
        error: (err: unknown) => this.handleError(err),
      });
    } else {
      const payload: CreateBranchDto = {
        name: values.name.trim(),
        code: values.code.trim().toUpperCase(),
        address: values.address.trim() || undefined,
        phone: values.phone.trim() || undefined,
        timezone: values.timezone,
        isActive: values.isActive,
      };

      this.branchesService.create(payload).subscribe({
        next: (created) => {
          this.isSaving.set(false);
          this.dialogRef.close(created);
        },
        error: (err: unknown) => this.handleError(err),
      });
    }
  }

  private handleError(error: unknown): void {
    this.isSaving.set(false);

    if (error instanceof HttpErrorResponse) {
      const code = error.error?.code || '';
      const message = error.error?.message || '';

      if (error.status === 409 || code === 'BRANCH_CODE_EXISTS') {
        this.form.controls.code.setErrors({ codeExists: true });
        this.errorMessage.set('El código de sede ya existe en la organización.');
        return;
      }

      if (error.status === 403 && (code === 'PLAN_LIMIT_EXCEEDED' || message.includes('plan'))) {
        this.planLimitReached.set(true);
        this.errorMessage.set(
          'Has alcanzado el límite de sedes permitido por el plan contratado. Actualiza tu suscripción para agregar más sedes.',
        );
        return;
      }

      this.errorMessage.set(message || 'Ocurrió un error al guardar la sede.');
      return;
    }

    this.errorMessage.set('Error inesperado al conectar con el servidor.');
  }
}
