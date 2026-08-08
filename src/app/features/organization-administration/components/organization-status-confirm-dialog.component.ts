import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { OrganizationStatus } from '../models/organization.models';

export interface OrganizationStatusConfirmDialogData {
  displayName: string;
  targetStatus: OrganizationStatus;
}

@Component({
  selector: 'app-organization-status-confirm-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
  templateUrl: './organization-status-confirm-dialog.component.html',
  styleUrl: './organization-status-confirm-dialog.component.scss',
})
export class OrganizationStatusConfirmDialogComponent {
  readonly data = inject<OrganizationStatusConfirmDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(
    MatDialogRef<OrganizationStatusConfirmDialogComponent, boolean>,
  );

  readonly isSuspension = this.data.targetStatus === 'SUSPENDED';

  cancel(): void {
    this.dialogRef.close(false);
  }

  confirm(): void {
    this.dialogRef.close(true);
  }
}
