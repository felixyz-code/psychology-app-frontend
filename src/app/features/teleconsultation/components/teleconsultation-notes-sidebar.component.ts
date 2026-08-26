import {
  Component,
  DestroyRef,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

export type AutosaveStatus = 'idle' | 'saving' | 'saved';

export interface TeleconsultationDraft {
  roomCode: string;
  title: string;
  content: string;
  updatedAt: string;
}

@Component({
  selector: 'app-teleconsultation-notes-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './teleconsultation-notes-sidebar.component.html',
  styleUrl: './teleconsultation-notes-sidebar.component.scss',
})
export class TeleconsultationNotesSidebarComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  readonly roomCode = input.required<string>();
  readonly patientName = input<string>('Paciente');
  readonly appointmentId = input<string | undefined>(undefined);

  readonly closeSidebar = output<void>();

  readonly saveStatus = signal<AutosaveStatus>('idle');
  readonly lastSavedTime = signal<string | null>(null);
  readonly isCopied = signal<boolean>(false);

  readonly notesForm = new FormGroup({
    title: new FormControl<string>(''),
    content: new FormControl<string>(''),
  });

  readonly soapTemplates = [
    { label: 'Motivo', snippet: '\n• [Motivo de consulta]: ' },
    { label: 'Evolución', snippet: '\n• [Evolución subjetiva/objetiva]: ' },
    { label: 'Intervención', snippet: '\n• [Intervención clínica]: ' },
    { label: 'Acuerdos', snippet: '\n• [Tareas y Acuerdos]: ' },
  ];

  ngOnInit(): void {
    this.restoreDraft();
    this.setupAutosave();
  }

  private get storageKey(): string {
    return `teleconsult_draft_${this.roomCode() || 'active'}`;
  }

  private restoreDraft(): void {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed: TeleconsultationDraft = JSON.parse(saved);
        this.notesForm.patchValue(
          {
            title: parsed.title || '',
            content: parsed.content || '',
          },
          { emitEvent: false },
        );
        if (parsed.updatedAt) {
          this.lastSavedTime.set(
            new Intl.DateTimeFormat('es-MX', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            }).format(new Date(parsed.updatedAt)),
          );
        }
      }
    } catch {
      // Gracefully ignore local storage errors
    }
  }

  private setupAutosave(): void {
    this.notesForm.valueChanges
      .pipe(
        debounceTime(600),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.saveDraft();
      });
  }

  saveDraft(): void {
    this.saveStatus.set('saving');
    const { title, content } = this.notesForm.getRawValue();

    try {
      const draft: TeleconsultationDraft = {
        roomCode: this.roomCode(),
        title: title || '',
        content: content || '',
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(this.storageKey, JSON.stringify(draft));

      this.lastSavedTime.set(
        new Intl.DateTimeFormat('es-MX', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }).format(new Date()),
      );
      this.saveStatus.set('saved');
    } catch {
      this.saveStatus.set('idle');
    }
  }

  insertSnippet(snippet: string): void {
    const current = this.notesForm.controls.content.value || '';
    this.notesForm.controls.content.setValue(current + snippet);
    this.saveDraft();
  }

  copyNotes(): void {
    const { title, content } = this.notesForm.getRawValue();
    const fullText = `Consulta con: ${this.patientName()}\n${title ? `Título: ${title}\n` : ''}\n${content || ''}`.trim();

    navigator.clipboard.writeText(fullText).then(() => {
      this.isCopied.set(true);
      setTimeout(() => this.isCopied.set(false), 2000);
    });
  }

  clearNotes(): void {
    this.notesForm.reset({ title: '', content: '' });
    try {
      localStorage.removeItem(this.storageKey);
    } catch {
      // Ignore
    }
    this.saveStatus.set('idle');
    this.lastSavedTime.set(null);
  }

  onClose(): void {
    this.saveDraft();
    this.closeSidebar.emit();
  }
}
