import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AdminTenantItem } from '../models/superadmin.models';
import { SuperadminTenantsService } from '../services/superadmin-tenants.service';

export interface FreezeTenantDialogData {
  tenant: AdminTenantItem;
  isCurrentlyFrozen: boolean;
}

@Component({
  selector: 'app-freeze-tenant-dialog',
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
      <h2 mat-dialog-title class="dialog-title" [class.danger-title]="!data.isCurrentlyFrozen">
        <mat-icon [color]="data.isCurrentlyFrozen ? 'primary' : 'warn'">
          {{ data.isCurrentlyFrozen ? 'lock_open' : 'ac_unit' }}
        </mat-icon>
        {{ data.isCurrentlyFrozen ? 'Descongelar y Reactivar Organización' : 'Congelar Organización' }}
      </h2>

      <mat-dialog-content>
        @if (!data.isCurrentlyFrozen) {
          <div class="freeze-warning">
            <mat-icon>warning</mat-icon>
            <span
              >Al congelar esta organización, se suspenderá el acceso operativo de
              todos sus miembros y se colocará su suscripción en estado
              <strong>FROZEN</strong>. Los datos clínicos y expedientes permanecerán
              resguardados de manera segura.</span
            >
          </div>
        } @else {
          <div class="unfreeze-info">
            <mat-icon>check_circle</mat-icon>
            <span
              >Al descongelar, la organización volverá al estado
              <strong>ACTIVE</strong> y se restaurará el acceso operativo para
              sus miembros.</span
            >
          </div>
        }

        <p class="tenant-subtitle">
          Organización: <strong>{{ data.tenant.displayName }}</strong>
        </p>

        <form [formGroup]="form" class="dialog-form">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Motivo de la acción (Auditoría Forense)</mat-label>
            <textarea
              matInput
              rows="3"
              formControlName="reason"
              placeholder="Ej. Solicitud administrativa preventiva / Revisión contractual"
            ></textarea>
          </mat-form-field>

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
          [color]="data.isCurrentlyFrozen ? 'primary' : 'warn'"
          type="button"
          (click)="submit()"
          [disabled]="isLoading()"
        >
          @if (isLoading()) {
            <mat-spinner diameter="18"></mat-spinner>
          } @else {
            <span>{{ data.isCurrentlyFrozen ? 'Confirmar Descongelamiento' : 'Confirmar Congelamiento' }}</span>
          }
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .dialog-container {
        padding: 8px;
        min-width: 420px;
        max-width: 500px;
      }
      .dialog-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        margin-bottom: 4px;
      }
      .danger-title {
        color: #b91c1c;
      }
      .freeze-warning {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        background: #fef2f2;
        color: #991b1b;
        border: 1px solid #fecaca;
        padding: 10px 12px;
        border-radius: 8px;
        margin-bottom: 12px;
        font-size: 0.875rem;
      }
      .unfreeze-info {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        background: #f0fdf4;
        color: #166534;
        border: 1px solid #bbf7d0;
        padding: 10px 12px;
        border-radius: 8px;
        margin-bottom: 12px;
        font-size: 0.875rem;
      }
      .tenant-subtitle {
        color: #475569;
        margin-bottom: 12px;
        font-size: 0.95rem;
      }
      .dialog-form {
        display: flex;
        flex-direction: column;
        gap: 12px;
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
export class FreezeTenantDialogComponent {
  readonly data = inject<FreezeTenantDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<FreezeTenantDialogComponent>);
  private readonly superadminService = inject(SuperadminTenantsService);
  private readonly fb = inject(FormBuilder);

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form: FormGroup = this.fb.group({
    reason: ['', [Validators.maxLength(500)]],
  });

  cancel(): void {
    this.dialogRef.close();
  }

  submit(): void {
    if (this.isLoading()) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const shouldFreeze = !this.data.isCurrentlyFrozen;
    const reason = this.form.value.reason?.trim() || undefined;

    this.superadminService
      .freezeTenant(this.data.tenant.id, { freeze: shouldFreeze, reason })
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.dialogRef.close(true);
        },
        error: (err: any) => {
          this.isLoading.set(false);
          this.errorMessage.set(
            err.error?.message || 'Error al cambiar el estado de la cuenta.',
          );
        },
      });
  }
}
