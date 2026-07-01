import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { CaseFile } from '../models/case-file.models';
import { CaseFilesService } from '../services/case-files.service';

interface CaseFileFormDialogData {
  mode: 'create' | 'edit';
  patientId: string;
  caseFile?: CaseFile;
}

@Component({
  selector: 'app-case-file-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './case-file-form-dialog.component.html',
  styleUrl: './case-file-form-dialog.component.scss',
})
export class CaseFileFormDialogComponent {
  private readonly data = inject<CaseFileFormDialogData>(MAT_DIALOG_DATA);
  private readonly formBuilder = inject(FormBuilder);
  private readonly caseFilesService = inject(CaseFilesService);
  private readonly dialogRef = inject(MatDialogRef<CaseFileFormDialogComponent, boolean>);

  readonly isSaving = signal(false);
  readonly errorMessage = signal('');
  readonly mode = this.data.mode;

  readonly caseFileForm = this.formBuilder.nonNullable.group({
    diagnosis: [''],
    treatmentPlan: [''],
  });

  constructor() {
    if (this.mode === 'edit' && this.data.caseFile) {
      this.caseFileForm.patchValue({
        diagnosis: this.data.caseFile.diagnosis ?? '',
        treatmentPlan: this.data.caseFile.treatmentPlan ?? '',
      });
    }
  }

  submit(): void {
    if (this.isSaving()) {
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');

    const rawValue = this.caseFileForm.getRawValue();
    const payload = {
      diagnosis: this.normalizeOptional(rawValue.diagnosis),
      treatmentPlan: this.normalizeOptional(rawValue.treatmentPlan),
    };

    if (this.mode === 'edit' && this.data.caseFile) {
      this.caseFilesService
        .updateCaseFile(this.data.caseFile.id, payload)
        .pipe(finalize(() => this.isSaving.set(false)))
        .subscribe({
          next: () => {
            this.dialogRef.close(true);
          },
          error: () => {
            this.errorMessage.set('No fue posible actualizar el expediente.');
          },
        });

      return;
    }

    this.caseFilesService
      .createCaseFile({
        patientId: this.data.patientId,
        ...payload,
      })
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.dialogRef.close(true);
        },
        error: () => {
          this.errorMessage.set('No fue posible crear el expediente.');
        },
      });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  getTitle(): string {
    return this.mode === 'edit' ? 'Editar expediente' : 'Nuevo expediente';
  }

  getSubtitle(): string {
    return this.mode === 'edit'
      ? 'Actualiza la información clínica del paciente.'
      : 'Registra la información básica del expediente clínico.';
  }

  getSubmitLabel(): string {
    return this.mode === 'edit' ? 'Guardar cambios' : 'Crear expediente';
  }

  private normalizeOptional(value: string): string | null {
    const normalized = value.trim();
    return normalized ? normalized : null;
  }
}
