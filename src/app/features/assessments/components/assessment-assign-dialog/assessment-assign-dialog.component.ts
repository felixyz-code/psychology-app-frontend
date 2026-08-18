import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import { Branch } from '../../../../core/models/branch.models';
import { Instrument, InstrumentVersionStatus } from '../../../../core/models/instrument.models';
import {
  AssessmentAdministration,
  AssignAssessmentRequest,
} from '../../../../core/models/assessment.models';
import { AssessmentsHttpService } from '../../../../core/services/assessments-http.service';
import { BranchesService } from '../../../../core/services/branches.service';
import { InstrumentsHttpService } from '../../../../core/services/instruments-http.service';

export interface AssessmentAssignDialogData {
  patientId: string;
  patientName: string;
  branchId?: string | null;
  caseFileId?: string | null;
}

@Component({
  selector: 'app-assessment-assign-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './assessment-assign-dialog.component.html',
  styleUrl: './assessment-assign-dialog.component.scss',
})
export class AssessmentAssignDialogComponent implements OnInit {
  readonly data = inject<AssessmentAssignDialogData>(MAT_DIALOG_DATA);
  private readonly formBuilder = inject(FormBuilder);
  private readonly assessmentsService = inject(AssessmentsHttpService);
  private readonly instrumentsService = inject(InstrumentsHttpService);
  private readonly branchesService = inject(BranchesService);
  private readonly dialogRef = inject(
    MatDialogRef<AssessmentAssignDialogComponent, AssessmentAdministration | null>,
  );

  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');
  readonly instruments = signal<Instrument[]>([]);
  readonly branches = signal<Branch[]>([]);

  readonly assignForm = this.formBuilder.nonNullable.group({
    instrumentId: ['', Validators.required],
    instrumentVersionId: ['', Validators.required],
    branchId: [this.data.branchId ?? ''],
    expiresInDays: [7, [Validators.required, Validators.min(1), Validators.max(90)]],
    isRemoteSelfAdministered: [true],
  });

  readonly selectedInstrument = computed(() => {
    const instrumentId = this.assignForm.controls.instrumentId.value;
    return this.instruments().find((i) => i.id === instrumentId) ?? null;
  });

  readonly availableVersions = computed(() => {
    const instrument = this.selectedInstrument();
    if (!instrument || !instrument.versions) {
      return [];
    }
    return instrument.versions.filter((v) => v.status === InstrumentVersionStatus.PUBLISHED);
  });

  ngOnInit(): void {
    this.assignForm.controls.instrumentId.valueChanges.subscribe((instrumentId) => {
      this.updateSelectedVersion(instrumentId);
    });

    this.loadCatalogData();
  }

  private updateSelectedVersion(instrumentId: string): void {
    const instrument = this.instruments().find((i) => i.id === instrumentId);
    if (instrument && instrument.versions) {
      const publishedVersions = instrument.versions.filter(
        (v) => v.status === InstrumentVersionStatus.PUBLISHED,
      );
      if (publishedVersions.length > 0) {
        // Sort by versionNumber descending and select the latest
        const latest = [...publishedVersions].sort((a, b) => b.versionNumber - a.versionNumber)[0];
        this.assignForm.controls.instrumentVersionId.setValue(latest.id);
        return;
      }
    }
    this.assignForm.controls.instrumentVersionId.setValue('');
  }

  loadCatalogData(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    forkJoin({
      instruments: this.instrumentsService.getInstruments().pipe(catchError(() => of([]))),
      branches: this.branchesService.findAll().pipe(catchError(() => of([]))),
    })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: ({ instruments, branches }) => {
          this.instruments.set(instruments);
          this.branches.set(branches);

          if (instruments.length > 0) {
            this.assignForm.controls.instrumentId.setValue(instruments[0].id);
            this.updateSelectedVersion(instruments[0].id);
          }
        },
        error: () => {
          this.errorMessage.set('No fue posible cargar el catálogo de instrumentos.');
        },
      });
  }

  submit(): void {
    if (this.assignForm.invalid || this.isSaving()) {
      this.assignForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');

    const formVal = this.assignForm.getRawValue();
    const expiresInDays = formVal.expiresInDays;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const payload: AssignAssessmentRequest = {
      patientId: this.data.patientId,
      instrumentVersionId: formVal.instrumentVersionId,
      branchId: formVal.branchId ? formVal.branchId : undefined,
      caseFileId: this.data.caseFileId ? this.data.caseFileId : undefined,
      expiresAt: expiresAt.toISOString(),
      isRemoteSelfAdministered: formVal.isRemoteSelfAdministered,
    };

    this.assessmentsService
      .assignAssessment(payload)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: (created) => {
          this.dialogRef.close(created);
        },
        error: (err) => {
          const msg =
            err?.error?.message || 'Ocurrió un error al asignar la evaluación psicométrica.';
          this.errorMessage.set(msg);
        },
      });
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
