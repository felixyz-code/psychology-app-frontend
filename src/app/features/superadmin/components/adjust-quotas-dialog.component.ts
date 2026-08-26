import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AdminTenantItem } from '../models/superadmin.models';
import { SuperadminTenantsService } from '../services/superadmin-tenants.service';

export interface AdjustQuotasDialogData {
  tenant: AdminTenantItem;
}

@Component({
  selector: 'app-adjust-quotas-dialog',
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
  ],
  template: `
    <div class="dialog-container">
      <h2 mat-dialog-title class="dialog-title">
        <mat-icon color="primary">tune</mat-icon>
        Ajustar Cuotas y Límites de Capacidad
      </h2>

      <mat-dialog-content>
        <p class="tenant-subtitle">
          Organización: <strong>{{ data.tenant.displayName }}</strong>
        </p>

        <p class="info-note">
          Ingresa un valor positivo para fijar un límite específico, <code>-1</code> para capacidad ilimitada, o deja el campo vacío para restaurar los valores por defecto del plan comercial.
        </p>

        <form [formGroup]="form" class="dialog-form">
          <div class="quota-row">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Terapeutas / Miembros Activos</mat-label>
              <input matInput type="number" formControlName="customTherapistsLimit" placeholder="Default del Plan o -1" />
              <mat-hint>Uso actual: {{ data.tenant.usage.therapistsCount }}</mat-hint>
            </mat-form-field>
          </div>

          <div class="quota-row">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Pacientes Máximos Registrados</mat-label>
              <input matInput type="number" formControlName="customPatientsLimit" placeholder="Default del Plan o -1" />
              <mat-hint>Uso actual: {{ data.tenant.usage.patientsCount }}</mat-hint>
            </mat-form-field>
          </div>

          <div class="quota-row">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Sucursales / Sedes Clínicas</mat-label>
              <input matInput type="number" formControlName="customBranchesLimit" placeholder="Default del Plan o -1" />
              <mat-hint>Uso actual: {{ data.tenant.usage.branchesCount }}</mat-hint>
            </mat-form-field>
          </div>

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
            <span>Guardar Cuotas</span>
          }
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .dialog-container {
        padding: 8px;
        min-width: 400px;
      }
      .dialog-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        margin-bottom: 4px;
      }
      .tenant-subtitle {
        color: #475569;
        margin-bottom: 8px;
        font-size: 0.95rem;
      }
      .info-note {
        color: #64748b;
        font-size: 0.85rem;
        margin-bottom: 16px;
        line-height: 1.4;
      }
      .dialog-form {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .quota-row {
        width: 100%;
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
export class AdjustQuotasDialogComponent {
  readonly data = inject<AdjustQuotasDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<AdjustQuotasDialogComponent>);
  private readonly superadminService = inject(SuperadminTenantsService);
  private readonly fb = inject(FormBuilder);

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form: FormGroup = this.fb.group({
    customTherapistsLimit: [
      this.data.tenant.subscription?.customTherapistsLimit ?? null,
    ],
    customPatientsLimit: [
      this.data.tenant.subscription?.customPatientsLimit ?? null,
    ],
    customBranchesLimit: [
      this.data.tenant.subscription?.customBranchesLimit ?? null,
    ],
  });

  cancel(): void {
    this.dialogRef.close();
  }

  submit(): void {
    if (this.form.invalid || this.isLoading()) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const val = this.form.value;
    const payload = {
      customTherapistsLimit:
        val.customTherapistsLimit !== null && val.customTherapistsLimit !== ''
          ? Number(val.customTherapistsLimit)
          : null,
      customPatientsLimit:
        val.customPatientsLimit !== null && val.customPatientsLimit !== ''
          ? Number(val.customPatientsLimit)
          : null,
      customBranchesLimit:
        val.customBranchesLimit !== null && val.customBranchesLimit !== ''
          ? Number(val.customBranchesLimit)
          : null,
    };

    this.superadminService.updateQuotas(this.data.tenant.id, payload).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.dialogRef.close(true);
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err.error?.message || 'Error al actualizar las cuotas personalizadas.',
        );
      },
    });
  }
}
