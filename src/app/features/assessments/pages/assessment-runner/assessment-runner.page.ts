import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  computed,
  DestroyRef,
  HostListener,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { debounceTime, distinctUntilChanged, firstValueFrom, Subject, switchMap } from 'rxjs';

import {
  AdministrationStatus,
  AssessmentAdministration,
} from '../../../../core/models/assessment.models';
import { InstrumentDefinition, InstrumentItem } from '../../../../core/models/scoring.types';
import { AssessmentsHttpService } from '../../../../core/services/assessments-http.service';

export type SyncStatus = 'SAVED' | 'SAVING' | 'OFFLINE_PENDING' | 'ERROR';

@Component({
  selector: 'app-assessment-runner-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './assessment-runner.page.html',
  styleUrl: './assessment-runner.page.scss',
})
export class AssessmentRunnerPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly assessmentsService = inject(AssessmentsHttpService);
  private readonly destroyRef = inject(DestroyRef);

  readonly accessToken = signal<string>('');
  readonly isLoading = signal<boolean>(true);
  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  readonly formAlertMessage = signal<string>('');
  readonly syncStatus = signal<SyncStatus>('SAVED');
  readonly isCompleted = signal<boolean>(false);

  readonly administration = signal<AssessmentAdministration | null>(null);
  readonly definition = signal<InstrumentDefinition | null>(null);
  readonly responses = signal<Record<string, any>>({});
  readonly missingItemCodes = signal<string[]>([]);

  private readonly responseChange$ = new Subject<void>();

  readonly items = computed<InstrumentItem[]>(() => {
    const def = this.definition();
    if (!def || !def.items) return [];
    return [...def.items].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  });

  readonly totalRequiredItems = computed<number>(() => {
    return this.items().filter((i) => i.required).length;
  });

  readonly answeredRequiredCount = computed<number>(() => {
    const resps = this.responses();
    return this.items().filter(
      (i) =>
        i.required && resps[i.code] !== undefined && resps[i.code] !== null && resps[i.code] !== '',
    ).length;
  });

  readonly progressPercentage = computed<number>(() => {
    const total = this.totalRequiredItems();
    if (total === 0) return 100;
    const answered = this.answeredRequiredCount();
    return Math.min(100, Math.round((answered / total) * 100));
  });

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('accessToken');
    if (!token) {
      this.errorMessage.set('Enlace de evaluación psicométrica no válido.');
      this.isLoading.set(false);
      return;
    }

    this.accessToken.set(token);
    this.setupAutoSavePipeline();
    this.loadAssessment(token);
  }

  @HostListener('window:online')
  onOnline(): void {
    if (this.syncStatus() === 'OFFLINE_PENDING' || this.syncStatus() === 'ERROR') {
      this.triggerAutoSave();
    }
  }

  loadAssessment(token: string): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.assessmentsService.getPublicAssessmentRunner(token).subscribe({
      next: (admin) => {
        this.administration.set(admin);
        const def = (admin.instrumentVersion?.definitionJson as InstrumentDefinition) || null;
        this.definition.set(def);

        if (admin.status === AdministrationStatus.COMPLETED) {
          this.isCompleted.set(true);
          this.isLoading.set(false);
          return;
        }

        // Initialize responses from server + localStorage backup
        const initialResponses: Record<string, any> = {};
        if (admin.responses) {
          for (const r of admin.responses) {
            initialResponses[r.itemCode] = r.responseValue;
          }
        }

        // Check local storage backup if any
        try {
          const cached = localStorage.getItem(`eval_backup_${token}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            Object.assign(initialResponses, parsed);
          }
        } catch {
          // ignore storage error
        }

        this.responses.set(initialResponses);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err.status === 409) {
          this.errorMessage.set('Este enlace de evaluación ha expirado.');
        } else if (err.status === 404) {
          this.errorMessage.set('Evaluación no encontrada. Verifique que el enlace sea correcto.');
        } else {
          this.errorMessage.set(
            'No fue posible cargar la evaluación. Intente nuevamente más tarde.',
          );
        }
      },
    });
  }

  private setupAutoSavePipeline(): void {
    this.responseChange$
      .pipe(
        debounceTime(600),
        distinctUntilChanged(),
        switchMap(() => {
          this.syncStatus.set('SAVING');
          const token = this.accessToken();
          const currentResponses = this.responses();
          return this.assessmentsService.savePublicResponses(token, {
            responses: currentResponses,
          });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.syncStatus.set('SAVED');
        },
        error: () => {
          if (!navigator.onLine) {
            this.syncStatus.set('OFFLINE_PENDING');
          } else {
            this.syncStatus.set('ERROR');
          }
        },
      });
  }

  selectOption(itemCode: string, value: any): void {
    if (this.isCompleted()) return;

    this.formAlertMessage.set('');
    const current = { ...this.responses(), [itemCode]: value };
    this.responses.set(current);

    // Save to local backup immediately
    try {
      localStorage.setItem(`eval_backup_${this.accessToken()}`, JSON.stringify(current));
    } catch {
      // ignore
    }

    // Clear from missing list if previously flagged
    this.missingItemCodes.update((list) => list.filter((c) => c !== itemCode));

    this.triggerAutoSave();
  }

  isOptionSelected(itemCode: string, value: any): boolean {
    return this.responses()[itemCode] === value;
  }

  triggerAutoSave(): void {
    this.responseChange$.next();
  }

  async submitAssessment(): Promise<void> {
    if (this.isSubmitting() || this.isCompleted()) return;

    // Validate completeness on client side
    const missing: string[] = [];
    const resps = this.responses();
    for (const item of this.items()) {
      if (
        item.required &&
        (resps[item.code] === undefined || resps[item.code] === null || resps[item.code] === '')
      ) {
        missing.push(item.code);
      }
    }

    if (missing.length > 0) {
      this.missingItemCodes.set(missing);
      this.formAlertMessage.set(
        'Por favor responde todas las preguntas obligatorias antes de entregar la evaluación.',
      );
      // Scroll to first missing item if scrollIntoView is supported
      const firstMissingElement = document.getElementById(`item-${missing[0]}`);
      if (firstMissingElement && typeof firstMissingElement.scrollIntoView === 'function') {
        firstMissingElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    this.isSubmitting.set(true);
    this.formAlertMessage.set('');

    const token = this.accessToken();
    const currentResponses = this.responses();

    // 1. Force flush current responses snapshot to avoid race conditions with debounced auto-save
    try {
      this.syncStatus.set('SAVING');
      await firstValueFrom(
        this.assessmentsService.savePublicResponses(token, { responses: currentResponses }),
      );
      this.syncStatus.set('SAVED');
    } catch {
      // If auto-save fails, continue to submission with payload
    }

    // 2. Submit completion request passing responses payload for atomic backend persistence & scoring
    this.assessmentsService
      .completePublicAssessment(token, { responses: currentResponses })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.isCompleted.set(true);
          try {
            localStorage.removeItem(`eval_backup_${token}`);
          } catch {
            // ignore
          }
        },
        error: (err: HttpErrorResponse) => {
          this.isSubmitting.set(false);

          if (err.status === 422) {
            // Missing items validation error from backend
            const missingCodes = err.error?.missingItems || err.error?.missingItemCodes;
            if (Array.isArray(missingCodes) && missingCodes.length > 0) {
              this.missingItemCodes.set(missingCodes);
              const firstElem = document.getElementById(`item-${missingCodes[0]}`);
              if (firstElem && typeof firstElem.scrollIntoView === 'function') {
                firstElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }
            this.formAlertMessage.set(
              err?.error?.message ||
                'Por favor responde todas las preguntas obligatorias antes de entregar la evaluación.',
            );
            return;
          }

          if (err.status === 409) {
            this.isCompleted.set(true);
            return;
          }

          // Other errors (do not block the whole page if already loaded)
          this.formAlertMessage.set(
            err?.error?.message ||
              'No fue posible enviar la evaluación. Por favor verifique su conexión e intente nuevamente.',
          );
        },
      });
  }
}
