import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { AssignableMembershipRole, MembershipListItem } from '../models/membership.models';

export interface MembershipRoleDialogData {
  membership: MembershipListItem;
}

export interface MembershipRoleDialogResult {
  role: AssignableMembershipRole;
  expectedUpdatedAt: string;
}

const ASSIGNABLE_ROLES: readonly AssignableMembershipRole[] = [
  'ADMIN',
  'PSYCHOLOGIST',
  'RECEPTIONIST',
  'BILLING',
  'AUDITOR',
  'READ_ONLY',
];

@Component({
  selector: 'app-membership-role-dialog',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>Cambiar rol</h2>
    <mat-dialog-content>
      <p class="membership-dialog__identity">
        <strong>{{ data.membership.displayName }}</strong>
        <span>{{ data.membership.email }}</span>
      </p>
      <mat-form-field appearance="outline" class="membership-dialog__field">
        <mat-label>Nuevo rol</mat-label>
        <mat-select [(ngModel)]="role">
          @for (option of roleOptions; track option) {
            <mat-option [value]="option">{{ roleLabel(option) }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <p class="membership-dialog__hint">
        Se usará la versión observada al abrir este diálogo. Si el miembro cambió, tendrás que
        revisarlo y confirmarlo de nuevo.
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="cancel()">Cancelar</button>
      <button mat-flat-button color="primary" type="button" (click)="confirm()">Guardar rol</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .membership-dialog__identity {
        display: grid;
        gap: 0.2rem;
        margin: 0 0 1rem;
      }
      .membership-dialog__identity span,
      .membership-dialog__hint {
        color: var(--app-color-text-secondary);
      }
      .membership-dialog__field {
        width: 100%;
        min-width: 280px;
      }
      .membership-dialog__hint {
        font-size: 0.86rem;
        line-height: 1.45;
      }
    `,
  ],
})
export class MembershipRoleDialogComponent {
  readonly data = inject<MembershipRoleDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(
    MatDialogRef<MembershipRoleDialogComponent, MembershipRoleDialogResult | undefined>,
  );

  readonly roleOptions = ASSIGNABLE_ROLES;
  role: AssignableMembershipRole =
    this.data.membership.role === 'OWNER' ? 'ADMIN' : this.data.membership.role;

  roleLabel(role: AssignableMembershipRole): string {
    return roleLabels[role];
  }

  confirm(): void {
    this.dialogRef.close({
      role: this.role,
      expectedUpdatedAt: this.data.membership.updatedAt,
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}

const roleLabels: Record<AssignableMembershipRole, string> = {
  ADMIN: 'Administrador',
  PSYCHOLOGIST: 'Psicólogo',
  RECEPTIONIST: 'Recepcionista',
  BILLING: 'Facturación',
  AUDITOR: 'Auditor',
  READ_ONLY: 'Solo lectura',
};
