import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthStore } from '../../../core/auth/auth.store';
import { CreateSessionNoteRequest } from '../models/session-note.models';
import { SessionNotesService } from '../services/session-notes.service';

interface SessionNoteFormDialogData {
  mode: 'create';
  caseFileId: string;
}

@Component({
  selector: 'app-session-note-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './session-note-form-dialog.component.html',
  styleUrl: './session-note-form-dialog.component.scss',
})
export class SessionNoteFormDialogComponent {
  private readonly data = inject<SessionNoteFormDialogData>(MAT_DIALOG_DATA);
  private readonly authStore = inject(AuthStore);
  private readonly formBuilder = inject(FormBuilder);
  private readonly sessionNotesService = inject(SessionNotesService);
  private readonly dialogRef = inject(MatDialogRef<SessionNoteFormDialogComponent, boolean>);

  readonly isSaving = signal(false);
  readonly errorMessage = signal('');

  readonly sessionNoteForm = this.formBuilder.nonNullable.group({
    title: [''],
    content: ['', [Validators.required]],
    sessionDate: [this.getCurrentDateTimeLocal(), [Validators.required]],
  });

  submit(): void {
    if (this.sessionNoteForm.invalid) {
      this.sessionNoteForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');

    const rawValue = this.sessionNoteForm.getRawValue();
    const currentUserId = this.authStore.user()?.id;
    const payload: CreateSessionNoteRequest = {
      caseFileId: this.data.caseFileId,
      ...(currentUserId ? { authorId: currentUserId } : {}),
      title: this.normalizeOptional(rawValue.title),
      content: rawValue.content.trim(),
      sessionDate: new Date(rawValue.sessionDate).toISOString(),
    };

    this.sessionNotesService
      .createSessionNote(payload)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.dialogRef.close(true);
        },
        error: (error) => {
          console.error('POST /session-notes failed', {
            status: error?.status,
            body: error?.error,
            payload,
          });
          this.errorMessage.set('No fue posible crear la nota de sesion.');
        },
      });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  hasRequiredError(controlName: 'content' | 'sessionDate'): boolean {
    const control = this.sessionNoteForm.controls[controlName];
    return control.touched && control.hasError('required');
  }

  private normalizeOptional(value: string): string | null {
    const normalized = value.trim();
    return normalized ? normalized : null;
  }

  private getCurrentDateTimeLocal(): string {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const localDate = new Date(now.getTime() - offset * 60_000);

    return localDate.toISOString().slice(0, 16);
  }
}
