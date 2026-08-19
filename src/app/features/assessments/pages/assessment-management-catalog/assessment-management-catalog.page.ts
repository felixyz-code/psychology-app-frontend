import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { catchError, finalize, of } from 'rxjs';

import {
  Instrument,
  InstrumentVersion,
} from '../../../../core/models/instrument.models';
import { InstrumentsHttpService } from '../../../../core/services/instruments-http.service';

export type FilterCategory =
  | 'ALL'
  | 'SYSTEM'
  | 'CUSTOM'
  | 'ENABLED'
  | 'DISABLED';

@Component({
  selector: 'app-assessment-management-catalog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './assessment-management-catalog.page.html',
  styleUrl: './assessment-management-catalog.page.scss',
})
export class AssessmentManagementCatalogPage implements OnInit {
  private readonly instrumentsService = inject(InstrumentsHttpService);
  private readonly router = inject(Router);

  readonly isLoading = signal(true);
  readonly isToggling = signal<Record<string, boolean>>({});
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly instruments = signal<Instrument[]>([]);

  readonly selectedCategory = signal<FilterCategory>('ALL');
  readonly searchQuery = signal('');
  readonly searchControl = new FormControl<string>('', { nonNullable: true });

  readonly filteredInstruments = computed(() => {
    const list = this.instruments();
    const category = this.selectedCategory();
    const query = this.searchQuery().trim().toLowerCase();

    return list.filter((inst) => {
      // Category filter
      if (category === 'SYSTEM' && !inst.isSystem) return false;
      if (category === 'CUSTOM' && inst.isSystem) return false;
      if (category === 'ENABLED' && inst.isEnabled === false) return false;
      if (category === 'DISABLED' && inst.isEnabled !== false) return false;

      // Search query
      if (query) {
        const matchCode = inst.code.toLowerCase().includes(query);
        const matchName = inst.name.toLowerCase().includes(query);
        const matchDesc =
          inst.description?.toLowerCase().includes(query) ?? false;
        if (!matchCode && !matchName && !matchDesc) {
          return false;
        }
      }

      return true;
    });
  });

  readonly displayedColumns = [
    'instrument',
    'type',
    'version',
    'administrations',
    'visibility',
    'actions',
  ];

  constructor() {
    this.searchControl.valueChanges.subscribe((val) => {
      this.searchQuery.set(val || '');
    });
  }

  ngOnInit(): void {
    this.loadCatalog();
  }

  loadCatalog(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.instrumentsService
      .getManagementCatalog()
      .pipe(
        finalize(() => this.isLoading.set(false)),
        catchError((err) => {
          this.errorMessage.set(
            err?.error?.message ||
              'Error al cargar el catálogo de instrumentos psicométricos.',
          );
          return of([]);
        }),
      )
      .subscribe((data) => {
        this.instruments.set(data);
      });
  }

  setCategory(cat: FilterCategory): void {
    this.selectedCategory.set(cat);
  }

  toggleVisibility(instrument: Instrument, event: { checked: boolean }): void {
    const newStatus = event.checked;
    this.isToggling.update((prev) => ({ ...prev, [instrument.id]: true }));

    // Optimistic update
    this.instruments.update((list) =>
      list.map((item) =>
        item.id === instrument.id ? { ...item, isEnabled: newStatus } : item,
      ),
    );

    this.instrumentsService
      .toggleVisibility(instrument.id, newStatus)
      .pipe(
        finalize(() => {
          this.isToggling.update((prev) => {
            const next = { ...prev };
            delete next[instrument.id];
            return next;
          });
        }),
      )
      .subscribe({
        next: () => {
          this.successMessage.set(
            `Visibilidad de "${instrument.code}" ${newStatus ? 'activada' : 'desactivada'} para la clínica.`,
          );
          setTimeout(() => this.successMessage.set(''), 3000);
        },
        error: (err) => {
          // Revert on error
          this.instruments.update((list) =>
            list.map((item) =>
              item.id === instrument.id
                ? { ...item, isEnabled: !newStatus }
                : item,
            ),
          );
          this.errorMessage.set(
            err?.error?.message || 'No fue posible actualizar la visibilidad.',
          );
        },
      });
  }

  createNewInstrument(): void {
    this.router.navigate(['/management/assessments/new']);
  }

  editDraft(instrument: Instrument): void {
    const draft = instrument.draftVersion || instrument.latestVersion;
    if (draft) {
      this.router.navigate(
        ['/management/assessments', instrument.id, 'builder'],
        {
          queryParams: { versionId: draft.id },
        },
      );
    } else {
      this.createNewVersion(instrument);
    }
  }

  createNewVersion(instrument: Instrument): void {
    this.isLoading.set(true);
    this.instrumentsService
      .createVersion(instrument.id)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (newVer) => {
          this.router.navigate(
            ['/management/assessments', instrument.id, 'builder'],
            {
              queryParams: { versionId: newVer.id },
            },
          );
        },
        error: (err) => {
          this.errorMessage.set(
            err?.error?.message || 'Error al crear una nueva versión borrador.',
          );
        },
      });
  }

  publishVersion(instrument: Instrument, version: InstrumentVersion): void {
    this.isLoading.set(true);
    this.instrumentsService
      .publishVersion(instrument.id, version.id)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set(
            `Versión v${version.versionNumber} publicada exitosamente.`,
          );
          this.loadCatalog();
        },
        error: (err) => {
          this.errorMessage.set(
            err?.error?.message || 'Error al publicar la versión.',
          );
        },
      });
  }

  deprecateVersion(instrument: Instrument, version: InstrumentVersion): void {
    this.isLoading.set(true);
    this.instrumentsService
      .deprecateVersion(instrument.id, version.id)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set(
            `Versión v${version.versionNumber} marcada como deprecada.`,
          );
          this.loadCatalog();
        },
        error: (err) => {
          this.errorMessage.set(
            err?.error?.message || 'Error al deprecar la versión.',
          );
        },
      });
  }

  openSimulator(instrument: Instrument): void {
    const targetVer = instrument.publishedVersion || instrument.latestVersion;
    this.router.navigate(
      ['/management/assessments', instrument.id, 'builder'],
      {
        queryParams: { versionId: targetVer?.id, tab: 'simulator' },
      },
    );
  }
}
