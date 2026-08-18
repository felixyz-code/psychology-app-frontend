import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { InvitationListItem } from '../models/invitation.models';

export type InvitationConfirmationAction = 'REVOKE' | 'RESEND';
export interface InvitationConfirmDialogData {
  action: InvitationConfirmationAction;
  invitation: InvitationListItem;
}

@Component({
  selector: 'app-invitation-confirm-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule],
  template: ` <h2 mat-dialog-title>
      {{ data.action === 'REVOKE' ? 'Revocar invitación' : 'Reenviar invitación' }}
    </h2>
    <mat-dialog-content>
      @if (data.action === 'REVOKE') {
        <p>
          Se revocará la invitación pendiente para <strong>{{ data.invitation.email }}</strong
          >.
        </p>
      } @else {
        <p>
          Se reemplazará la invitación de <strong>{{ data.invitation.email }}</strong> por una nueva
          invitación con otra vigencia.
        </p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="close(false)">Cancelar</button>
      <button
        mat-flat-button
        [color]="data.action === 'REVOKE' ? 'warn' : 'primary'"
        type="button"
        (click)="close(true)"
      >
        Confirmar
      </button>
    </mat-dialog-actions>`,
})
export class InvitationConfirmDialogComponent {
  readonly data = inject<InvitationConfirmDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<InvitationConfirmDialogComponent, boolean>);
  close(value: boolean): void {
    this.dialogRef.close(value);
  }
}
