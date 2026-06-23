import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthStore } from '../../../core/auth/auth.store';
import {
  CreateSessionNoteRequest,
  SessionNote,
  UpdateSessionNoteRequest,
} from '../models/session-note.models';
import { SessionNotesService } from '../services/session-notes.service';

interface SessionNoteFormDialogData {
  mode: 'create' | 'edit';
  caseFileId: string;
  sessionNote?: SessionNote;
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
  readonly mode = this.data.mode;

  readonly sessionNoteForm = this.formBuilder.nonNullable.group({
    title: [''],
    content: ['', [Validators.required]],
    sessionDate: [this.getCurrentDateTimeLocal(), [Validators.required]],
  });

  constructor() {
    if (this.mode === 'edit' && this.data.sessionNote) {
      this.sessionNoteForm.patchValue({
        title: this.data.sessionNote.title ?? '',
        content: this.data.sessionNote.content,
        sessionDate: this.toDateTimeLocalValue(this.data.sessionNote.sessionDate),
      });
    }
  }

  submit(): void {
    if (this.sessionNoteForm.invalid) {
      this.sessionNoteForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');

    const rawValue = this.sessionNoteForm.getRawValue();
    const basePayload: UpdateSessionNoteRequest = {
      title: this.normalizeOptional(rawValue.title),
      content: rawValue.content.trim(),
      sessionDate: new Date(rawValue.sessionDate).toISOString(),
    };

    if (this.mode === 'edit' && this.data.sessionNote) {
      this.sessionNotesService
        .updateSessionNote(this.data.sessionNote.id, basePayload)
        .pipe(finalize(() => this.isSaving.set(false)))
        .subscribe({
          next: () => {
            this.dialogRef.close(true);
          },
          error: (error) => {
            console.error('PATCH /session-notes/:id failed', {
              status: error?.status,
              body: error?.error,
              sessionNoteId: this.data.sessionNote?.id,
              payload: basePayload,
            });
            this.errorMessage.set('No fue posible guardar los cambios.');
          },
        });

      return;
    }

    const currentUserId = this.authStore.user()?.id;
    const payload: CreateSessionNoteRequest = {
      caseFileId: this.data.caseFileId,
      ...(currentUserId ? { authorId: currentUserId } : {}),
      ...basePayload,
      content: basePayload.content ?? '',
      sessionDate: basePayload.sessionDate ?? '',
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

  getTitle(): string {
    return this.mode === 'edit' ? 'Editar nota de sesion' : 'Nueva nota de sesion';
  }

  getSubmitLabel(): string {
    return this.mode === 'edit' ? 'Guardar cambios' : 'Guardar nota';
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

  private toDateTimeLocalValue(value: string): string {
    const date = new Date(value);
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60_000);

    return localDate.toISOString().slice(0, 16);
  }
}
