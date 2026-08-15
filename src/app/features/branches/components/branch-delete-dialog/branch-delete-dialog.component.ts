import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { Branch } from '../../../../core/models/branch.models';
import { BranchesService } from '../../../../core/services/branches.service';

export interface BranchDeleteDialogData {
  branch: Branch;
}

@Component({
  selector: 'app-branch-delete-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './branch-delete-dialog.component.html',
  styleUrl: './branch-delete-dialog.component.scss',
})
export class BranchDeleteDialogComponent {
  readonly data = inject<BranchDeleteDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<BranchDeleteDialogComponent>);
  private readonly branchesService = inject(BranchesService);

  readonly isDeleting = signal(false);
  readonly errorMessage = signal('');
  readonly isOnlyBranchError = signal(false);

  cancel(): void {
    this.dialogRef.close();
  }

  confirmDelete(): void {
    if (this.isDeleting()) return;

    this.isDeleting.set(true);
    this.errorMessage.set('');
    this.isOnlyBranchError.set(false);

    this.branchesService.remove(this.data.branch.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.dialogRef.close(true);
      },
      error: (err: unknown) => {
        this.isDeleting.set(false);
        if (err instanceof HttpErrorResponse) {
          const code = err.error?.code;
          const msg = err.error?.message;
          if (
            err.status === 403 &&
            (code === 'CANNOT_DELETE_ONLY_BRANCH' || (msg && msg.includes('only active branch')))
          ) {
            this.isOnlyBranchError.set(true);
            this.errorMessage.set(
              'No es posible eliminar la única sede activa de la organización. Toda organización debe mantener al menos una sede operativa.',
            );
            return;
          }
          this.errorMessage.set(msg || 'No fue posible eliminar la sede seleccionada.');
          return;
        }
        this.errorMessage.set('Error inesperado al conectar con el servidor.');
      },
    });
  }
}
