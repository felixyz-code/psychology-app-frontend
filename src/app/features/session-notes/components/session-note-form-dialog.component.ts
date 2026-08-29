import { Component, OnInit, OnDestroy, HostListener, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, debounceTime, Subscription } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { ButtonSpinnerDirective } from '../../../shared/directives/button-spinner.directive';
import { SavingIndicatorComponent } from '../../../shared/components/saving-indicator/saving-indicator.component';
import { AuthStore } from '../../../core/auth/auth.store';
import { logError } from '../../../core/logging/app-logger';
import {
  CreateSessionNoteRequest,
  SessionNote,
  UpdateSessionNoteRequest,
} from '../models/session-note.models';
import { SessionNotesService } from '../services/session-notes.service';

export interface ClinicalSnippet {
  id: string;
  name: string;
  category: 'soap' | 'mental_exam' | 'diagnostics' | 'intervention';
  icon: string;
  snippetText: string;
}

export const CLINICAL_SNIPPET_PRESETS: ClinicalSnippet[] = [
  {
    id: 'soap_full',
    name: 'Estructura SOAP (NOM-004)',
    category: 'soap',
    icon: 'format_list_bulleted',
    snippetText:
`S (Subjetivo):
- Motivo de consulta y reporte del paciente: 

O (Objetivo):
- Examen del estado mental: Paciente consciente, orientado en tiempo, espacio y persona. Afecto congruente y reactivo.
- Indicadores psicométricos / Observación conductual: 

A (Análisis / Evaluación):
- Impresión diagnóstica (CIE-10 / DSM-5): 
- Progreso terapéutico y juicio clínico: 

P (Plan de Intervención):
- Estrategias aplicadas y tareas inter-sesión: 
- Próxima cita programada: `,
  },
  {
    id: 'mental_exam',
    name: 'Examen Mental Estructurado',
    category: 'mental_exam',
    icon: 'psychology',
    snippetText:
`EXAMEN DEL ESTADO MENTAL:
- Conciencia y Orientación: Lúcido, orientado en las 3 esferas (tiempo, espacio y persona).
- Apariencia y Actitud: Adecuado aliño y pulcritud, actitud colaboradora y receptiva.
- Afecto y Ánimo: Afecto congruente con el discurso, sin labilidad afectiva evidente.
- Pensamiento: Curso fluido, coherente, sin bloqueos ni ideas delirantes.
- Sensopercepción: Sin evidencia de alteraciones sensoperceptivas (sin alucinaciones ni ilusiones).
- Juicio e Insight: Juicio de realidad conservado, adecuado insight sobre su motivo de consulta.`,
  },
  {
    id: 'diag_anxiety',
    name: 'Sintomatología CIE-10/DSM-5',
    category: 'diagnostics',
    icon: 'health_and_safety',
    snippetText:
`CRITERIOS CLÍNICOS & SINTOMATOLOGÍA:
- Diagnóstico: F41.1 Trastorno de Ansiedad Generalizada / F32.1 Episodio Depresivo Moderado.
- Síntomas observados: Inquietud psicomotriz, fatiga fácil, tensión muscular y alteraciones en patrón de sueño.
- Evolución: Descenso favorable de sintomatología según escala psicométrica inter-sesión.`,
  },
  {
    id: 'intervention_tcc',
    name: 'Técnicas de Intervención TCC',
    category: 'intervention',
    icon: 'auto_awesome',
    snippetText:
`TÉCNICAS Y ESTRATEGIAS APLICADAS:
1. Reestructuración cognitiva: Identificación y debate de pensamientos automáticos disfuncionales.
2. Entrenamiento en respiración diafragmática (técnica 4-4-6) y desactivación fisiológica.
3. Psicoeducación y asignación de autorregistro conductual inter-sesión.`,
  },
];

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
    MatIconModule,
    MatProgressSpinnerModule,
    ButtonSpinnerDirective,
    SavingIndicatorComponent,
  ],
  templateUrl: './session-note-form-dialog.component.html',
  styleUrl: './session-note-form-dialog.component.scss',
})
export class SessionNoteFormDialogComponent implements OnInit, OnDestroy {
  private readonly data = inject<SessionNoteFormDialogData>(MAT_DIALOG_DATA);
  private readonly authStore = inject(AuthStore);
  private readonly formBuilder = inject(FormBuilder);
  private readonly sessionNotesService = inject(SessionNotesService);
  private readonly dialogRef = inject(MatDialogRef<SessionNoteFormDialogComponent, boolean>);

  readonly isSaving = signal(false);
  readonly errorMessage = signal('');
  readonly autosaveStatus = signal<'idle' | 'saving' | 'saved'>('idle');
  readonly lastAutosavedAt = signal<string | null>(null);
  /** True when a previously unsaved draft was found — user must confirm or discard */
  readonly hasPendingDraft = signal(false);
  /** Human-readable time when the pending draft was last auto-saved */
  readonly pendingDraftSavedAt = signal<string | null>(null);
  readonly snippets = CLINICAL_SNIPPET_PRESETS;
  readonly mode = this.data.mode;

  private autosaveSubscription?: Subscription;
  /** Temporarily holds the raw draft data until the user confirms or discards */
  private pendingDraftData: { title: string; content: string; sessionDate: string } | null = null;
  private readonly draftStorageKey = `psiqueos_session_note_draft_${this.data.caseFileId}_${this.mode}${this.data.sessionNote ? `_${this.data.sessionNote.id}` : ''}`;


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

  ngOnInit(): void {
    // Restore local draft if available (in create mode or if note has draft)
    this.restoreDraftIfAvailable();

    // Setup debounced autosave to localStorage
    this.autosaveSubscription = this.sessionNoteForm.valueChanges
      .pipe(debounceTime(600))
      .subscribe(() => {
        this.saveDraftLocal();
      });
  }

  ngOnDestroy(): void {
    this.autosaveSubscription?.unsubscribe();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardShortcut(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      this.saveDraftLocal();
    }
  }

  insertSnippet(snippet: ClinicalSnippet): void {
    const currentContent = this.sessionNoteForm.controls.content.value.trim();
    if (!currentContent) {
      this.sessionNoteForm.patchValue({ content: snippet.snippetText });
    } else {
      this.sessionNoteForm.patchValue({
        content: `${currentContent}\n\n${snippet.snippetText}`,
      });
    }
    this.sessionNoteForm.controls.content.markAsDirty();
  }

  submit(): void {
    if (this.isSaving()) {
      return;
    }

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
            this.clearDraftLocal();
            this.dialogRef.close(true);
          },
          error: (error) => {
            logError('session-notes.update', error);
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
          this.clearDraftLocal();
          this.dialogRef.close(true);
        },
        error: (error) => {
          logError('session-notes.create', error);
          this.errorMessage.set('No fue posible crear la nota de sesión.');
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
    return this.mode === 'edit' ? 'Editar nota de sesión' : 'Nueva nota de sesión';
  }

  getSubmitLabel(): string {
    return this.mode === 'edit' ? 'Guardar cambios' : 'Guardar nota';
  }

  saveDraftLocal(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    const rawValue = this.sessionNoteForm.getRawValue();
    if (!rawValue.content.trim() && !rawValue.title.trim()) {
      return;
    }

    try {
      this.autosaveStatus.set('saving');
      const draft = {
        title: rawValue.title,
        content: rawValue.content,
        sessionDate: rawValue.sessionDate,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(this.draftStorageKey, JSON.stringify(draft));

      const now = new Date();
      const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      this.lastAutosavedAt.set(timeFormatted);
      this.autosaveStatus.set('saved');
    } catch {
      this.autosaveStatus.set('idle');
    }
  }

  private restoreDraftIfAvailable(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      const saved = localStorage.getItem(this.draftStorageKey);
      if (!saved) return;

      const draft = JSON.parse(saved);
      if (draft && draft.content && this.mode === 'create') {
        // Show confirmation banner instead of silently patching the form
        this.pendingDraftData = {
          title: draft.title || '',
          content: draft.content || '',
          sessionDate: draft.sessionDate || this.getCurrentDateTimeLocal(),
        };
        this.hasPendingDraft.set(true);

        if (draft.savedAt) {
          const date = new Date(draft.savedAt);
          this.pendingDraftSavedAt.set(
            date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
          );
        }
      }
    } catch {
      // Ignore local storage parse errors safely
    }
  }

  /** Restores the pending draft into the form and hides the banner. */
  confirmRestoreDraft(): void {
    if (!this.pendingDraftData) return;
    this.sessionNoteForm.patchValue({
      title: this.pendingDraftData.title,
      content: this.pendingDraftData.content,
      sessionDate: this.pendingDraftData.sessionDate,
    });
    this.autosaveStatus.set('saved');
    this.pendingDraftData = null;
    this.hasPendingDraft.set(false);
  }

  /** Discards the pending draft and removes it from localStorage. */
  discardDraft(): void {
    this.pendingDraftData = null;
    this.hasPendingDraft.set(false);
    this.pendingDraftSavedAt.set(null);
    this.clearDraftLocal();
  }


  private clearDraftLocal(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    try {
      localStorage.removeItem(this.draftStorageKey);
    } catch {
      // Ignore safely
    }
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
