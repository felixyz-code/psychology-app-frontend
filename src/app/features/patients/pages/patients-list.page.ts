import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';

import { BranchContextService } from '../../../core/services/branch-context.service';
import { DataTableEmptyStateComponent } from '../../../shared/components/data-table-empty-state/data-table-empty-state.component';
import { DataTableToolbarComponent } from '../../../shared/components/data-table-toolbar/data-table-toolbar.component';
import {
  MetricCardComponent,
  MetricCardVariant,
} from '../../../shared/components/metric-card/metric-card.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SectionCardComponent } from '../../../shared/components/section-card/section-card.component';
import { DataTableResult, DataTableState } from '../../../shared/models/data-table.models';
import {
  formatFilteredResultsLabel,
  getSafePageIndex,
  matchesSearchTerm,
  paginateItems,
  sortItems,
} from '../../../shared/utils/data-table';
import { PatientDeleteDialogComponent } from '../components/patient-delete-dialog.component';
import { PatientDetailDialogComponent } from '../components/patient-detail-dialog.component';
import { PatientFormDialogComponent } from '../components/patient-form-dialog.component';
import { PatientTransferDialogComponent } from '../components/patient-transfer-dialog/patient-transfer-dialog.component';
import { Patient } from '../models/patient.models';
import { PatientsService } from '../services/patients.service';
import { CaseFilesService } from '../../case-files/services/case-files.service';
import { ClinicalDocumentPreviewDialogComponent } from '../../case-files/components/clinical-document-preview-dialog.component';

import { SkeletonTableComponent } from '../../../shared/components/skeleton';
import { ToastService } from '../../../core/services/toast.service';

export type PatientClinicalFilterStatus = 'ALL' | 'ACTIVE' | 'PAUSED' | 'DISCHARGED';

@Component({
  selector: 'app-patients-list-page',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSortModule,
    MatTableModule,
    MatTooltipModule,
    DataTableEmptyStateComponent,
    DataTableToolbarComponent,
    MetricCardComponent,
    PageHeaderComponent,
    SectionCardComponent,
    SkeletonTableComponent,
  ],
  templateUrl: './patients-list.page.html',
  styleUrl: './patients-list.page.scss',
})
export class PatientsListPage implements OnDestroy {
  private static readonly SUMMARY_DATE_FORMATTER = new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });

  private readonly dialog = inject(MatDialog);
  private readonly patientsService = inject(PatientsService);
  private readonly caseFilesService = inject(CaseFilesService);
  private readonly toastService = inject(ToastService);
  private readonly branchContextService = inject(BranchContextService, { optional: true });
  private branchSubscription?: Subscription;

  readonly displayedColumns = ['name', 'phoneNumber', 'email', 'birthDate', 'actions'];
  readonly pageSizeOptions = [10, 20, 50, 100];
  readonly summarySkeletonItems = Array.from({ length: 4 });
  readonly tableSkeletonRows = Array.from({ length: 6 });
  readonly patients = signal<Patient[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly clinicalStatusFilter = signal<PatientClinicalFilterStatus>('ALL');
  readonly therapistFilter = signal<string>('ALL');
  readonly tableState = signal<DataTableState>({
    searchTerm: '',
    pageIndex: 0,
    pageSize: 10,
    sortBy: undefined,
    sortDirection: '',
  });
  readonly patientsTableResult = computed<DataTableResult<Patient>>(() => {
    const state = this.tableState();
    const items = this.patients();
    const therapist = this.therapistFilter();
    const filteredItems = items.filter((patient) => {
      const matchesSearch = matchesSearchTerm(patient, state.searchTerm, (item) =>
        this.getPatientSearchValues(item),
      );
      if (!matchesSearch) return false;
      if (therapist !== 'ALL' && patient.psychologistId !== therapist) {
        return false;
      }
      return true;
    });
    const sortedItems = sortItems(filteredItems, {
      sortBy: state.sortBy,
      sortDirection: state.sortDirection,
      getSortValue: (patient, sortBy) => this.getPatientSortValue(patient, sortBy),
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
      hasActiveFilters: Boolean(
        state.searchTerm.trim() || this.clinicalStatusFilter() !== 'ALL' || this.therapistFilter() !== 'ALL',
      ),
    };
  });
  readonly safePageIndex = computed(() => {
    const state = this.tableState();
    const therapist = this.therapistFilter();
    const totalFilteredItems = this.patients().filter((patient) => {
      const matchesSearch = matchesSearchTerm(patient, state.searchTerm, (item) =>
        this.getPatientSearchValues(item),
      );
      if (!matchesSearch) return false;
      if (therapist !== 'ALL' && patient.psychologistId !== therapist) {
        return false;
      }
      return true;
    }).length;

    return getSafePageIndex(totalFilteredItems, state.pageIndex, state.pageSize);
  });
  readonly patientsCounterLabel = computed(() => {
    const result = this.patientsTableResult();

    return formatFilteredResultsLabel(
      result.totalFilteredItems,
      result.totalItems,
      (count) => this.formatPatientCount(count),
      result.hasActiveFilters,
    );
  });
  readonly summaryMetrics = computed(() => {
    const patients = this.patients();
    const currentMonth = new Date();
    const currentMonthIndex = currentMonth.getMonth();
    const currentYear = currentMonth.getFullYear();
    const recentPatients = patients.filter((patient) => {
      const createdAt = this.parseIsoDate(patient.createdAt);

      return createdAt
        ? createdAt.getMonth() === currentMonthIndex && createdAt.getFullYear() === currentYear
        : false;
    }).length;
    const patientsWithContact = patients.filter((patient) =>
      this.hasContactInformation(patient),
    ).length;
    const latestPatient = patients.reduce<Patient | null>((latest, patient) => {
      const patientDate = this.parseIsoDate(patient.createdAt);
      const latestDate = latest ? this.parseIsoDate(latest.createdAt) : null;

      if (!patientDate) {
        return latest;
      }

      if (!latestDate || patientDate > latestDate) {
        return patient;
      }

      return latest;
    }, null);

    return [
      {
        id: 'registered',
        icon: 'groups',
        label: 'Pacientes registrados',
        value: `${patients.length}`,
        supportingText: 'Base total visible en el listado actual.',
        variant: 'blue' as MetricCardVariant,
      },
      {
        id: 'recent',
        icon: 'person_add',
        label: 'Nuevos del mes',
        value: `${recentPatients}`,
        supportingText: 'Altas registradas durante el mes en curso.',
        variant: 'green' as MetricCardVariant,
      },
      {
        id: 'contact',
        icon: 'contact_phone',
        label: 'Con contacto registrado',
        value: `${patientsWithContact}`,
        supportingText: 'Pacientes con telefono o correo disponible.',
        variant: 'amber' as MetricCardVariant,
      },
      {
        id: 'latest',
        icon: 'history',
        label: 'Ultimo registro',
        value: latestPatient ? this.getFullName(latestPatient) : 'Sin registros',
        supportingText: latestPatient
          ? `Alta del ${this.formatCreatedAt(latestPatient.createdAt)}`
          : 'Aun no hay pacientes creados.',
        variant: 'violet' as MetricCardVariant,
      },
    ];
  });

  constructor() {
    this.loadPatients();
    if (this.branchContextService) {
      this.branchSubscription = this.branchContextService.branchChanges.subscribe(() => {
        this.loadPatients();
      });
    }
  }

  loadPatients(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.patientsService.getPatients().subscribe({
      next: (patients) => {
        this.patients.set(patients);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('No fue posible cargar los pacientes.');
        this.isLoading.set(false);
      },
    });
  }

  getFullName(patient: Patient): string {
    return `${patient.firstName} ${patient.lastName}`;
  }

  getDisplayValue(value?: string | null): string {
    return value?.trim() || '-';
  }

  formatBirthDate(value?: string | null): string {
    if (!value) {
      return '-';
    }

    const dateOnly = value.slice(0, 10);
    const [year, month, day] = dateOnly.split('-');

    if (!year || !month || !day) {
      return '-';
    }

    return `${day}/${month}/${year}`;
  }

  formatCreatedAt(value: string): string {
    const date = this.parseIsoDate(value);

    if (!date) {
      return '-';
    }

    return PatientsListPage.SUMMARY_DATE_FORMATTER.format(date);
  }

  updateSearchTerm(searchTerm: string): void {
    this.tableState.update((state) => ({
      ...state,
      searchTerm,
      pageIndex: 0,
    }));
  }

  setClinicalStatusFilter(status: PatientClinicalFilterStatus): void {
    this.clinicalStatusFilter.set(status);
    this.tableState.update((state) => ({
      ...state,
      pageIndex: 0,
    }));
  }

  setTherapistFilter(therapistId: string): void {
    this.therapistFilter.set(therapistId);
    this.tableState.update((state) => ({
      ...state,
      pageIndex: 0,
    }));
  }

  clearPatientFilters(): void {
    this.clinicalStatusFilter.set('ALL');
    this.therapistFilter.set('ALL');
    this.tableState.update((state) => ({
      ...state,
      searchTerm: '',
      pageIndex: 0,
    }));
  }

  exportPatientSummary(patient: Patient, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    this.caseFilesService.getCaseFileByPatientId(patient.id).subscribe({
      next: (caseFile) => {
        this.caseFilesService.getClinicalPdfData(caseFile.id).subscribe({
          next: (payload) => {
            this.dialog.open(ClinicalDocumentPreviewDialogComponent, {
              data: {
                payload,
                initialDocumentType: 'CASE_FILE_SUMMARY',
                caseFileId: caseFile.id,
              },
              width: '90vw',
              maxWidth: '960px',
              maxHeight: '94vh',
              panelClass: 'app-clinical-preview-dialog-panel',
              autoFocus: false,
              restoreFocus: true,
            });
          },
          error: () => {
            this.openPatientDetailDialog(patient);
          },
        });
      },
      error: () => {
        this.openPatientDetailDialog(patient);
      },
    });
  }

  handlePatientsPageChange(event: PageEvent): void {
    this.tableState.update((state) => ({
      ...state,
      pageIndex: event.pageIndex,
      pageSize: event.pageSize,
    }));
  }

  handlePatientsSortChange({ active, direction }: Sort): void {
    this.tableState.update((state) => ({
      ...state,
      sortBy: direction ? active : undefined,
      sortDirection: direction,
      pageIndex: 0,
    }));
  }

  getPatientsSortActive(): string {
    return this.tableState().sortBy ?? '';
  }

  getPatientsSortDirection(): 'asc' | 'desc' | '' {
    return this.tableState().sortDirection ?? '';
  }

  openCreatePatientDialog(): void {
    const dialogRef = this.dialog.open(PatientFormDialogComponent, {
      width: '720px',
      maxWidth: '95vw',
      autoFocus: false,
      disableClose: this.isLoading(),
      data: {
        mode: 'create',
      },
    });

    dialogRef.afterClosed().subscribe((created) => {
      if (created) {
        this.toastService.success('Paciente registrado exitosamente.');
        this.loadPatients();
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
        this.toastService.success('Paciente actualizado exitosamente.');
        this.loadPatients();
      }
    });
  }

  openPatientDetailDialog(patient: Patient): void {
    const dialogRef = this.dialog.open(PatientDetailDialogComponent, {
      width: 'min(1100px, 95vw)',
      maxWidth: '95vw',
      panelClass: 'patient-detail-dialog-panel',
      autoFocus: false,
      data: {
        patient,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.action === 'edit' && result.patient) {
        this.openEditPatientDialog(result.patient);
      }
    });
  }

  openTransferPatientDialog(patient: Patient): void {
    const dialogRef = this.dialog.open(PatientTransferDialogComponent, {
      width: '540px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      autoFocus: false,
      disableClose: this.isLoading(),
      data: {
        patient,
      },
    });

    dialogRef.afterClosed().subscribe((transferred) => {
      if (transferred) {
        this.toastService.success('Paciente transferido de sede exitosamente.');
        this.loadPatients();
      }
    });
  }

  openDeletePatientDialog(patient: Patient): void {
    const dialogRef = this.dialog.open(PatientDeleteDialogComponent, {
      width: '520px',
      maxWidth: '95vw',
      autoFocus: false,
      disableClose: this.isLoading(),
      data: {
        patient,
      },
    });

    dialogRef.afterClosed().subscribe((deleted) => {
      if (deleted) {
        this.toastService.success('Paciente eliminado exitosamente.');
        this.loadPatients();
      }
    });
  }

  stopRowClick(event: Event): void {
    event.stopPropagation();
  }

  private getPatientSortValue(
    patient: Patient,
    sortBy: string,
  ): string | number | Date | null | undefined {
    const sortValues: Record<string, string | number | Date | null | undefined> = {
      name: this.getFullName(patient),
      phoneNumber: patient.phoneNumber,
      email: patient.email,
      birthDate: patient.birthDate,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt,
    };

    return sortValues[sortBy];
  }

  private getPatientSearchValues(patient: Patient): Array<string | null | undefined> {
    return [
      patient.firstName,
      patient.lastName,
      this.getFullName(patient),
      patient.phoneNumber,
      patient.email,
    ];
  }

  private formatPatientCount(count: number): string {
    return count === 1 ? '1 paciente' : `${count} pacientes`;
  }

  private hasContactInformation(patient: Patient): boolean {
    return Boolean(patient.phoneNumber?.trim() || patient.email?.trim());
  }

  private parseIsoDate(value?: string | null): Date | null {
    if (!value) {
      return null;
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  ngOnDestroy(): void {
    this.branchSubscription?.unsubscribe();
  }
}
