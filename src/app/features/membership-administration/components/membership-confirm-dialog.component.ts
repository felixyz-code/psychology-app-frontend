import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { MembershipListItem } from '../models/membership.models';

export type MembershipConfirmationAction = 'SUSPEND' | 'REACTIVATE' | 'REMOVE' | 'LEAVE';

export interface MembershipConfirmDialogData {
  action: MembershipConfirmationAction;
  membership: MembershipListItem;
}

@Component({
  selector: 'app-membership-confirm-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{ title }}</h2>
    <mat-dialog-content>
      <p>
        {{ description }}
      </p>
      @if (data.action === 'REMOVE' || data.action === 'LEAVE') {
        <p class="membership-dialog__warning">
          Esta acción revocará el acceso a la organización y no debe hacerse sin revisar el
          contexto.
        </p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="cancel()">Cancelar</button>
      <button
        mat-flat-button
        type="button"
        [color]="data.action === 'REMOVE' || data.action === 'LEAVE' ? 'warn' : 'primary'"
        (click)="confirm()"
      >
        Confirmar
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .membership-dialog__warning {
        color: var(--app-color-danger-text);
        line-height: 1.45;
      }
    `,
  ],
})
export class MembershipConfirmDialogComponent {
  readonly data = inject<MembershipConfirmDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<MembershipConfirmDialogComponent, boolean>);

  get title(): string {
    return confirmationCopy[this.data.action].title;
  }

  get description(): string {
    return confirmationCopy[this.data.action].description(this.data.membership.displayName);
  }

  confirm(): void {
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}

const confirmationCopy: Record<
  MembershipConfirmationAction,
  { title: string; description: (name: string) => string }
> = {
  SUSPEND: {
    title: 'Suspender miembro',
    description: (name) => `Se suspenderá el acceso de ${name} a la organización.`,
  },
  REACTIVATE: {
    title: 'Reactivar miembro',
    description: (name) => `Se reactivará el acceso de ${name} a la organización.`,
  },
  REMOVE: {
    title: 'Revocar membresía',
    description: (name) => `Se revocará la membresía de ${name}.`,
  },
  LEAVE: {
    title: 'Salir de la organización',
    description: () =>
      'Se revocará tu membresía actual y tendrás que seleccionar otra organización para continuar.',
  },
};
