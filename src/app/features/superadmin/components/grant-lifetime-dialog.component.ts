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

export interface GrantLifetimeDialogData {
  tenant: AdminTenantItem;
}

@Component({
  selector: 'app-grant-lifetime-dialog',
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
        <mat-icon class="icon-gold">verified</mat-icon>
        Otorgar Membresía Vitalicia (Patrocinador Aliado)
      </h2>

      <mat-dialog-content>
        <div class="info-alert">
          <mat-icon>info</mat-icon>
          <span
            >Esta acción exenta a la organización de cobros periódicos y bloqueos
            por expiración (<strong>isExempt: true</strong>), asignando el estatus
            <strong>LIFETIME_SPONSOR</strong>.</span
          >
        </div>

        <p class="tenant-subtitle">
          Organización: <strong>{{ data.tenant.displayName }}</strong> ({{ data.tenant.slug }})
        </p>

        <form [formGroup]="form" class="dialog-form">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Convenio / Asociación / Motivo de Cortesía</mat-label>
            <textarea
              matInput
              rows="3"
              formControlName="sponsorNotes"
              placeholder="Ej. Convenio de Colaboración con Red Psicológica AC — Sin límite de tiempo"
            ></textarea>
            <mat-hint>Registro de auditoría y referencia institucional.</mat-hint>
          </mat-form-field>

          <div class="quotas-title">Cuotas Personalizadas (Opcionales)</div>

          <div class="grid-3">
            <mat-form-field appearance="outline">
              <mat-label>Límite Terapeutas</mat-label>
              <input matInput type="number" formControlName="customTherapistsLimit" placeholder="-1 = Ilimitado" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Límite Pacientes</mat-label>
              <input matInput type="number" formControlName="customPatientsLimit" placeholder="-1 = Ilimitado" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Límite Sedes</mat-label>
              <input matInput type="number" formControlName="customBranchesLimit" placeholder="-1 = Ilimitado" />
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
          class="btn-lifetime"
          type="button"
          (click)="submit()"
          [disabled]="isLoading() || form.invalid"
        >
          @if (isLoading()) {
            <mat-spinner diameter="18"></mat-spinner>
          } @else {
            <span>Confirmar Acceso Vitalicio</span>
          }
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .dialog-container {
        padding: 8px;
        min-width: 440px;
        max-width: 540px;
      }
      .dialog-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        margin-bottom: 4px;
      }
      .icon-gold {
        color: #d97706;
      }
      .info-alert {
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
        margin-bottom: 14px;
        font-size: 0.95rem;
      }
      .dialog-form {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .quotas-title {
        font-size: 0.875rem;
        font-weight: 600;
        color: #334155;
        margin-top: 4px;
      }
      .grid-3 {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
      }
      .full-width {
        width: 100%;
      }
      .btn-lifetime {
        background: linear-gradient(135deg, #059669, #0d9488);
        color: white;
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
export class GrantLifetimeDialogComponent {
  readonly data = inject<GrantLifetimeDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<GrantLifetimeDialogComponent>);
  private readonly superadminService = inject(SuperadminTenantsService);
  private readonly fb = inject(FormBuilder);

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form: FormGroup = this.fb.group({
    sponsorNotes: [
      this.data.tenant.subscription?.sponsorNotes || '',
      [Validators.maxLength(1000)],
    ],
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
      sponsorNotes: val.sponsorNotes?.trim() || undefined,
      customTherapistsLimit:
        val.customTherapistsLimit !== null && val.customTherapistsLimit !== ''
          ? Number(val.customTherapistsLimit)
          : undefined,
      customPatientsLimit:
        val.customPatientsLimit !== null && val.customPatientsLimit !== ''
          ? Number(val.customPatientsLimit)
          : undefined,
      customBranchesLimit:
        val.customBranchesLimit !== null && val.customBranchesLimit !== ''
          ? Number(val.customBranchesLimit)
          : undefined,
    };

    this.superadminService.grantLifetime(this.data.tenant.id, payload).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.dialogRef.close(true);
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err.error?.message || 'Error al otorgar la membresía vitalicia.',
        );
      },
    });
  }
}
