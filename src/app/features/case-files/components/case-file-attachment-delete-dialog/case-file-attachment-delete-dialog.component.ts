import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { CaseFileAttachment } from '../../models/case-file-attachment.models';
import { CaseFileAttachmentsService } from '../../services/case-file-attachments.service';

export interface CaseFileAttachmentDeleteDialogData {
  attachment: CaseFileAttachment;
}

@Component({
  selector: 'app-case-file-attachment-delete-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './case-file-attachment-delete-dialog.component.html',
  styleUrl: './case-file-attachment-delete-dialog.component.scss',
})
export class CaseFileAttachmentDeleteDialogComponent {
  private readonly data = inject<CaseFileAttachmentDeleteDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<CaseFileAttachmentDeleteDialogComponent>);
  private readonly attachmentsService = inject(CaseFileAttachmentsService);

  readonly attachment = this.data.attachment;
  readonly isDeleting = signal(false);
  readonly errorMessage = signal('');

  close(result: boolean = false): void {
    this.dialogRef.close(result);
  }

  confirm(): void {
    if (this.isDeleting()) {
      return;
    }

    this.isDeleting.set(true);
    this.errorMessage.set('');

    this.attachmentsService
      .delete(this.attachment.caseFileId, this.attachment.id)
      .subscribe({
        next: () => {
          this.close(true);
        },
        error: () => {
          this.errorMessage.set(
            'Ocurrió un error al intentar eliminar el archivo adjunto. Inténtalo de nuevo.',
          );
          this.isDeleting.set(false);
        },
      });
  }
}
