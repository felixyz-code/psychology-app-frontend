import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { AdminTenantItem } from '../models/superadmin.models';
import { SuperadminTenantsService } from '../services/superadmin-tenants.service';

export interface ExtendTrialDialogData {
  tenant: AdminTenantItem;
}

@Component({
  selector: 'app-extend-trial-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  template: `
    <div class="dialog-container">
      <h2 mat-dialog-title class="dialog-title">
        <mat-icon color="primary">more_time</mat-icon>
        Extender Periodo de Prueba
      </h2>

      <mat-dialog-content>
        <p class="tenant-subtitle">
          Organización: <strong>{{ data.tenant.displayName }}</strong>
        </p>

        <form [formGroup]="form" class="dialog-form">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Días adicionales de prueba</mat-label>
            <mat-select formControlName="presetDays" (selectionChange)="onPresetChange($event.value)">
              <mat-option [value]="7">+7 días (1 semana)</mat-option>
              <mat-option [value]="14">+14 días (2 semanas — estándar)</mat-option>
              <mat-option [value]="30">+30 días (1 mes)</mat-option>
              <mat-option [value]="60">+60 días (2 meses)</mat-option>
              <mat-option [value]="'custom'">Personalizado...</mat-option>
            </mat-select>
          </mat-form-field>

          @if (isCustom()) {
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Número exacto de días</mat-label>
              <input matInput type="number" formControlName="customDays" min="1" max="365" />
              <mat-error *ngIf="form.get('customDays')?.hasError('required')">
                El número de días es obligatorio.
              </mat-error>
              <mat-error *ngIf="form.get('customDays')?.hasError('min')">
                Mínimo 1 día.
              </mat-error>
            </mat-form-field>
          }

          @if (errorMessage()) {
            <div class="error-banner">
              <mat-icon>error_outline</mat-icon>
              <span>{{ errorMessage() }}</span>
            </div>
          }
        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="cancel()" [disabled]="isLoading()">
          Cancelar
        </button>
        <button
          mat-flat-button
          color="primary"
          type="button"
          (click)="submit()"
          [disabled]="isLoading() || form.invalid"
        >
          @if (isLoading()) {
            <mat-spinner diameter="18"></mat-spinner>
          } @else {
            <span>Extender Prueba</span>
          }
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .dialog-container {
        padding: 8px;
        min-width: 380px;
      }
      .dialog-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        margin-bottom: 4px;
      }
      .tenant-subtitle {
        color: #64748b;
        margin-bottom: 16px;
        font-size: 0.95rem;
      }
      .dialog-form {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-top: 8px;
      }
      .full-width {
        width: 100%;
      }
      .error-banner {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #fef2f2;
        color: #b91c1c;
        padding: 10px 12px;
        border-radius: 8px;
        font-size: 0.875rem;
      }
    `,
  ],
})
export class ExtendTrialDialogComponent {
  readonly data = inject<ExtendTrialDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ExtendTrialDialogComponent>);
  private readonly superadminService = inject(SuperadminTenantsService);
  private readonly fb = inject(FormBuilder);

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly isCustom = signal(false);

  readonly form: FormGroup = this.fb.group({
    presetDays: [14, [Validators.required]],
    customDays: [14, [Validators.required, Validators.min(1), Validators.max(365)]],
  });

  onPresetChange(value: number | string): void {
    if (value === 'custom') {
      this.isCustom.set(true);
    } else {
      this.isCustom.set(false);
      this.form.patchValue({ customDays: Number(value) });
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }

  submit(): void {
    if (this.form.invalid || this.isLoading()) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const daysToAdd = Number(this.form.value.customDays);

    this.superadminService.extendTrial(this.data.tenant.id, { daysToAdd }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.dialogRef.close(true);
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err.error?.message || 'Ocurrió un error al extender el periodo de prueba.',
        );
      },
    });
  }
}
