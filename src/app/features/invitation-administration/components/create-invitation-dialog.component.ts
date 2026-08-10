import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { InvitationRole } from '../models/invitation.models';

export interface CreateInvitationDialogResult {
  email: string;
  role: InvitationRole;
}
const INVITATION_ROLES: readonly InvitationRole[] = [
  'ADMIN',
  'PSYCHOLOGIST',
  'RECEPTIONIST',
  'BILLING',
  'AUDITOR',
  'READ_ONLY',
];

@Component({
  selector: 'app-create-invitation-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: ` <h2 mat-dialog-title>Crear invitaci&oacute;n</h2>
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <mat-dialog-content class="invitation-dialog__content">
        <mat-form-field appearance="outline">
          <mat-label>Correo electr&oacute;nico</mat-label>
          <input
            matInput
            type="email"
            formControlName="email"
            maxlength="255"
            (input)="normalizeEmail($event)"
          />
          @if (form.controls.email.hasError('required')) {
            <mat-error>El correo es obligatorio.</mat-error>
          } @else if (form.controls.email.hasError('email')) {
            <mat-error>Ingresa un correo v&aacute;lido.</mat-error>
          } @else if (form.controls.email.hasError('maxlength')) {
            <mat-error>El correo no puede exceder 255 caracteres.</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Rol</mat-label>
          <mat-select formControlName="role">
            @for (role of roleOptions; track role) {
              <mat-option [value]="role">{{ roleLabel(role) }}</mat-option>
            }
          </mat-select>
          @if (form.controls.role.hasError('required')) {
            <mat-error>Selecciona un rol.</mat-error>
          }
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="cancel()">Cancelar</button>
        <button
          mat-flat-button
          color="primary"
          type="submit"
          [disabled]="form.invalid || submitted"
        >
          Crear invitaci&oacute;n
        </button>
      </mat-dialog-actions>
    </form>`,
  styles: [
    `
      .invitation-dialog__content {
        display: grid;
        gap: 0.5rem;
        min-width: min(420px, 75vw);
        padding-top: 0.5rem;
      }
      @media (max-width: 560px) {
        .invitation-dialog__content {
          min-width: 0;
        }
      }
    `,
  ],
})
export class CreateInvitationDialogComponent {
  private readonly dialogRef = inject(
    MatDialogRef<CreateInvitationDialogComponent, CreateInvitationDialogResult | undefined>,
  );
  readonly roleOptions = INVITATION_ROLES;
  submitted = false;
  readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(255)],
    }),
    role: new FormControl<InvitationRole | null>(null, Validators.required),
  });
  normalizeEmail(event: Event): void {
    const email = (event.target as HTMLInputElement).value.trim();
    if (email !== this.form.controls.email.value) {
      this.form.controls.email.setValue(email);
    }
  }
  submit(): void {
    const email = this.form.controls.email.value.trim();
    if (email !== this.form.controls.email.value) {
      this.form.controls.email.setValue(email);
    }
    if (this.submitted || this.form.invalid || !this.form.controls.role.value) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitted = true;
    this.dialogRef.close({
      email,
      role: this.form.controls.role.value,
    });
  }
  cancel(): void {
    this.dialogRef.close();
  }
  roleLabel(role: InvitationRole): string {
    return ROLE_LABELS[role];
  }
}
const ROLE_LABELS: Record<InvitationRole, string> = {
  ADMIN: 'Administrador',
  PSYCHOLOGIST: 'Psicólogo',
  RECEPTIONIST: 'Recepcionista',
  BILLING: 'Facturación',
  AUDITOR: 'Auditor',
  READ_ONLY: 'Solo lectura',
};
