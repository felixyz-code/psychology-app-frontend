import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface OrganizationLogoRemoveConfirmDialogData {
  readonly displayName: string;
}

@Component({
  selector: 'app-organization-logo-remove-confirm-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
  templateUrl: './organization-logo-remove-confirm-dialog.component.html',
  styleUrl: './organization-logo-remove-confirm-dialog.component.scss',
})
export class OrganizationLogoRemoveConfirmDialogComponent {
  readonly data = inject<OrganizationLogoRemoveConfirmDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(
    MatDialogRef<OrganizationLogoRemoveConfirmDialogComponent, boolean>,
  );

  cancel(): void {
    this.dialogRef.close(false);
  }

  confirm(): void {
    this.dialogRef.close(true);
  }
}
