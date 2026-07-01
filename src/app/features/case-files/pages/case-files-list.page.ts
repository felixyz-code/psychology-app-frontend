import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { catchError, forkJoin, of } from 'rxjs';

import { DataTableEmptyStateComponent } from '../../../shared/components/data-table-empty-state/data-table-empty-state.component';
import { DataTableToolbarComponent } from '../../../shared/components/data-table-toolbar/data-table-toolbar.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SectionCardComponent } from '../../../shared/components/section-card/section-card.component';
import { StatusBadgeComponent, StatusBadgeVariant } from '../../../shared/components/status-badge/status-badge.component';
import { DataTableResult, DataTableState } from '../../../shared/models/data-table.models';
import { formatFilteredResultsLabel, getSafePageIndex, matchesSearchTerm, paginateItems, sortItems } from '../../../shared/utils/data-table';
import { PatientDetailDialogComponent } from '../../patients/components/patient-detail-dialog.component';
import { PatientFormDialogComponent } from '../../patients/components/patient-form-dialog.component';
import { Patient } from '../../patients/models/patient.models';
import { PatientsService } from '../../patients/services/patients.service';
import { CaseFileFormDialogComponent } from '../components/case-file-form-dialog.component';
import { CaseFile } from '../models/case-file.models';
import { CaseFilesService } from '../services/case-files.service';

@Component({
  selector: 'app-case-files-list-page',
  standalone: true,
  imports: [
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSortModule,
    MatTableModule,
    MatTooltipModule,
    DataTableEmptyStateComponent,
    DataTableToolbarComponent,
    PageHeaderComponent,
    SectionCardComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './case-files-list.page.html',
  styleUrl: './case-files-list.page.scss',
})
export class CaseFilesListPage {
  private readonly caseFilesService = inject(CaseFilesService);
  private readonly patientsService = inject(PatientsService);
  private readonly dialog = inject(MatDialog);

  readonly displayedColumns = ['patient', 'foundationStatus', 'createdAt', 'updatedAt', 'actions'];
  readonly pageSizeOptions = [10, 20, 50, 100];
  readonly caseFiles = signal<CaseFile[]>([]);
  readonly patients = signal<Patient[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly patientLoadWarning = signal('');
  readonly tableState = signal<DataTableState>({
    searchTerm: '',
    pageIndex: 0,
    pageSize: 10,
    sortBy: undefined,
    sortDirection: '',
  });
  readonly patientMap = computed(() => {
    const map = new Map<string, Patient>();

    for (const patient of this.patients()) {
      map.set(patient.id, patient);
    }

    return map;
  });
  readonly completeFoundationCount = computed(
    () => this.caseFiles().filter((caseFile) => this.hasFoundationInformation(caseFile)).length
  );
  readonly pendingFoundationCount = computed(() => this.caseFiles().length - this.completeFoundationCount());
  readonly caseFilesTableResult = computed<DataTableResult<CaseFile>>(() => {
    const state = this.tableState();
    const items = this.caseFiles();
    const filteredItems = items.filter((caseFile) =>
      matchesSearchTerm(caseFile, state.searchTerm, (item) => this.getCaseFileSearchValues(item))
    );
    const sortedItems = sortItems(filteredItems, {
      sortBy: state.sortBy,
      sortDirection: state.sortDirection,
      getSortValue: (caseFile, sortBy) => this.getCaseFileSortValue(caseFile, sortBy),
    });

    return {
      items,
      filteredItems,
      pagedItems: paginateItems(sortedItems, {
        pageIndex: this.safePageIndex(),
        pageSize: state.pageSize,
      }),
      totalItems: items.length,
      totalFilteredItems: filteredItems.length,
      hasActiveFilters: Boolean(state.searchTerm.trim()),
    };
  });
  readonly safePageIndex = computed(() => {
    const state = this.tableState();
    const totalFilteredItems = this.caseFiles().filter((caseFile) =>
      matchesSearchTerm(caseFile, state.searchTerm, (item) => this.getCaseFileSearchValues(item))
    ).length;

    return getSafePageIndex(totalFilteredItems, state.pageIndex, state.pageSize);
  });
  readonly caseFilesCounterLabel = computed(() => {
    const result = this.caseFilesTableResult();

    return formatFilteredResultsLabel(
      result.totalFilteredItems,
      result.totalItems,
      (count) => this.formatCaseFileCount(count),
      result.hasActiveFilters
    );
  });

  constructor() {
    this.loadCaseFiles();
  }

  loadCaseFiles(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.patientLoadWarning.set('');

    forkJoin({
      caseFiles: this.caseFilesService.getCaseFiles(),
      patients: this.patientsService.getPatients().pipe(
        catchError(() => {
          this.patientLoadWarning.set('Los expedientes se cargaron, pero no fue posible resolver los nombres de pacientes.');
          return of([] as Patient[]);
        })
      ),
    }).subscribe({
      next: ({ caseFiles, patients }) => {
        this.caseFiles.set(caseFiles);
        this.patients.set(patients);
        this.isLoading.set(false);
      },
      error: () => {
        this.caseFiles.set([]);
        this.patients.set([]);
        this.errorMessage.set('No fue posible cargar los expedientes clinicos.');
        this.isLoading.set(false);
      },
    });
  }

  updateSearchTerm(searchTerm: string): void {
    this.tableState.update((state) => ({
      ...state,
      searchTerm,
      pageIndex: 0,
    }));
  }

  clearCaseFileFilters(): void {
    this.tableState.update((state) => ({
      ...state,
      searchTerm: '',
      pageIndex: 0,
    }));
  }

  handleCaseFilesPageChange(event: PageEvent): void {
    this.tableState.update((state) => ({
      ...state,
      pageIndex: event.pageIndex,
      pageSize: event.pageSize,
    }));
  }

  handleCaseFilesSortChange({ active, direction }: Sort): void {
    this.tableState.update((state) => ({
      ...state,
      sortBy: direction ? active : undefined,
      sortDirection: direction,
      pageIndex: 0,
    }));
  }

  getCaseFilesSortActive(): string {
    return this.tableState().sortBy ?? '';
  }

  getCaseFilesSortDirection(): 'asc' | 'desc' | '' {
    return this.tableState().sortDirection ?? '';
  }

  openPatientDetailDialog(caseFile: CaseFile): void {
    const patient = this.getPatient(caseFile);

    if (!patient) {
      return;
    }

    const dialogRef = this.dialog.open(PatientDetailDialogComponent, {
      width: '960px',
      maxWidth: '95vw',
      autoFocus: false,
      data: {
        patient,
        caseFileId: caseFile.id,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.action === 'edit' && result.patient) {
        this.openEditPatientDialog(result.patient);
        return;
      }

      this.loadCaseFiles();
    });
  }

  openEditCaseFileDialog(caseFile: CaseFile): void {
    const dialogRef = this.dialog.open(CaseFileFormDialogComponent, {
      width: '720px',
      maxWidth: '95vw',
      autoFocus: false,
      data: {
        mode: 'edit',
        patientId: caseFile.patientId,
        caseFile,
      },
    });

    dialogRef.afterClosed().subscribe((updated) => {
      if (updated) {
        this.loadCaseFiles();
      }
    });
  }

  openEditPatientDialog(patient: Patient): void {
    const dialogRef = this.dialog.open(PatientFormDialogComponent, {
      width: '720px',
      maxWidth: '95vw',
      autoFocus: false,
      disableClose: this.isLoading(),
      data: {
        mode: 'edit',
        patient,
      },
    });

    dialogRef.afterClosed().subscribe((updated) => {
      if (updated) {
        this.loadCaseFiles();
      }
    });
  }

  stopRowClick(event: Event): void {
    event.stopPropagation();
  }

  getPatient(caseFile: CaseFile): Patient | null {
    return this.patientMap().get(caseFile.patientId) ?? null;
  }

  getPatientName(caseFile: CaseFile): string {
    const patient = this.getPatient(caseFile);

    if (!patient) {
      return 'Paciente no disponible';
    }

    return `${patient.firstName} ${patient.lastName}`;
  }

  getPatientSecondaryInfo(caseFile: CaseFile): string {
    const patient = this.getPatient(caseFile);

    if (!patient) {
      return `ID paciente: ${caseFile.patientId}`;
    }

    return patient.email?.trim() || patient.phoneNumber?.trim() || `ID paciente: ${patient.id}`;
  }

  getFoundationStatusLabel(caseFile: CaseFile): string {
    return this.hasFoundationInformation(caseFile) ? 'Base completa' : 'Informacion pendiente';
  }

  getFoundationStatusVariant(caseFile: CaseFile): StatusBadgeVariant {
    return this.hasFoundationInformation(caseFile) ? 'success' : 'warning';
  }

  getMissingInformationLabel(caseFile: CaseFile): string {
    const hasDiagnosis = this.hasText(caseFile.diagnosis);
    const hasTreatmentPlan = this.hasText(caseFile.treatmentPlan);

    if (hasDiagnosis && hasTreatmentPlan) {
      return 'Informacion base disponible';
    }

    if (!hasDiagnosis && !hasTreatmentPlan) {
      return 'Falta diagnostico y plan de tratamiento';
    }

    return hasDiagnosis ? 'Falta plan de tratamiento' : 'Falta diagnostico';
  }

  formatCaseFileCount(count: number): string {
    return count === 1 ? '1 expediente' : `${count} expedientes`;
  }

  private getCaseFileSortValue(caseFile: CaseFile, sortBy: string): string | number | Date | null | undefined {
    const sortValues: Record<string, string | number | Date | null | undefined> = {
      patient: this.getPatientName(caseFile),
      foundationStatus: this.hasFoundationInformation(caseFile) ? 1 : 0,
      createdAt: caseFile.createdAt,
      updatedAt: caseFile.updatedAt,
    };

    return sortValues[sortBy];
  }

  private getCaseFileSearchValues(caseFile: CaseFile): Array<string | null | undefined> {
    const patient = this.getPatient(caseFile);
    const patientName = patient ? `${patient.firstName} ${patient.lastName}` : null;

    return [
      caseFile.id,
      caseFile.patientId,
      caseFile.diagnosis,
      caseFile.treatmentPlan,
      patient?.firstName,
      patient?.lastName,
      patientName,
      patient?.email,
      patient?.phoneNumber,
    ];
  }

  private hasFoundationInformation(caseFile: CaseFile): boolean {
    return this.hasText(caseFile.diagnosis) && this.hasText(caseFile.treatmentPlan);
  }

  private hasText(value?: string | null): boolean {
    return Boolean(value?.trim());
  }
}
