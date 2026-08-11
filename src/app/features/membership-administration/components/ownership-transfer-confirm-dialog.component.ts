import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { MembershipListItem } from '../models/membership.models';

export interface OwnershipTransferConfirmDialogData {
  target: MembershipListItem;
  organizationName: string;
}

@Component({
  selector: 'app-ownership-transfer-confirm-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Transferir propiedad</h2>
    <mat-dialog-content>
      <div class="ownership-transfer-dialog__identity">
        <strong>{{ data.target.displayName }}</strong>
        <span>{{ data.target.email }}</span>
      </div>
      <p class="ownership-transfer-dialog__organization">
        Organización afectada: <strong>{{ data.organizationName }}</strong>
      </p>
      <ul class="ownership-transfer-dialog__impact">
        <li>{{ data.target.displayName }} pasará a ser Propietario.</li>
        <li>Tu membresía dejará de ser Propietario y pasará a ser Administrador.</li>
        <li>Los permisos se actualizarán inmediatamente.</li>
        <li>Perderás las acciones exclusivas del Propietario.</li>
      </ul>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="cancel()">Cancelar</button>
      <button mat-flat-button color="primary" type="button" (click)="confirm()">
        Transferir propiedad
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .ownership-transfer-dialog__identity,
      .ownership-transfer-dialog__impact {
        display: grid;
        gap: 0.4rem;
      }

      .ownership-transfer-dialog__identity {
        margin-bottom: 1rem;
      }

      .ownership-transfer-dialog__identity span,
      .ownership-transfer-dialog__organization {
        color: var(--app-color-text-secondary);
      }

      .ownership-transfer-dialog__impact {
        margin: 1.25rem 0 0;
        padding-left: 1.25rem;
        line-height: 1.5;
      }

      @media (max-width: 600px) {
        :host {
          display: block;
          max-width: 100%;
        }

        mat-dialog-actions {
          flex-wrap: wrap;
        }

        mat-dialog-actions button {
          flex: 1 1 auto;
        }
      }
    `,
  ],
})
export class OwnershipTransferConfirmDialogComponent {
  readonly data = inject<OwnershipTransferConfirmDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(
    MatDialogRef<OwnershipTransferConfirmDialogComponent, boolean | undefined>,
  );

  confirm(): void {
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
