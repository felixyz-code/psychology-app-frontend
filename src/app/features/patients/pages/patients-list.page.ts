import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';

import { DataTableEmptyStateComponent } from '../../../shared/components/data-table-empty-state/data-table-empty-state.component';
import { DataTableToolbarComponent } from '../../../shared/components/data-table-toolbar/data-table-toolbar.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { DataTableResult, DataTableState } from '../../../shared/models/data-table.models';
import { formatFilteredResultsLabel, getSafePageIndex, matchesSearchTerm, paginateItems, sortItems } from '../../../shared/utils/data-table';
import { PatientDeleteDialogComponent } from '../components/patient-delete-dialog.component';
import { PatientDetailDialogComponent } from '../components/patient-detail-dialog.component';
import { PatientFormDialogComponent } from '../components/patient-form-dialog.component';
import { Patient } from '../models/patient.models';
import { PatientsService } from '../services/patients.service';

@Component({
  selector: 'app-patients-list-page',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSortModule,
    MatTableModule,
    DataTableEmptyStateComponent,
    DataTableToolbarComponent,
    PageHeaderComponent,
  ],
  templateUrl: './patients-list.page.html',
  styleUrl: './patients-list.page.scss',
})
export class PatientsListPage {
  private readonly dialog = inject(MatDialog);
  private readonly patientsService = inject(PatientsService);

  readonly displayedColumns = ['name', 'phoneNumber', 'email', 'birthDate', 'actions'];
  readonly pageSizeOptions = [10, 20, 50, 100];
  readonly patients = signal<Patient[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
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
    const filteredItems = items.filter((patient) =>
      matchesSearchTerm(patient, state.searchTerm, (item) => this.getPatientSearchValues(item))
    );
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
      hasActiveFilters: Boolean(state.searchTerm.trim()),
    };
  });
  readonly safePageIndex = computed(() => {
    const state = this.tableState();
    const totalFilteredItems = this.patients().filter((patient) =>
      matchesSearchTerm(patient, state.searchTerm, (item) => this.getPatientSearchValues(item))
    ).length;

    return getSafePageIndex(totalFilteredItems, state.pageIndex, state.pageSize);
  });
  readonly patientsCounterLabel = computed(() => {
    const result = this.patientsTableResult();

    return formatFilteredResultsLabel(
      result.totalFilteredItems,
      result.totalItems,
      (count) => this.formatPatientCount(count),
      result.hasActiveFilters
    );
  });

  constructor() {
    this.loadPatients();
  }

  private loadPatients(): void {
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

  updateSearchTerm(searchTerm: string): void {
    this.tableState.update((state) => ({
      ...state,
      searchTerm,
      pageIndex: 0,
    }));
  }

  clearPatientFilters(): void {
    this.tableState.update((state) => ({
      ...state,
      searchTerm: '',
      pageIndex: 0,
    }));
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
        this.loadPatients();
      }
    });
  }

  openPatientDetailDialog(patient: Patient): void {
    const dialogRef = this.dialog.open(PatientDetailDialogComponent, {
      width: '960px',
      maxWidth: '95vw',
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
        this.loadPatients();
      }
    });
  }

  private getPatientSortValue(patient: Patient, sortBy: string): string | number | Date | null | undefined {
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
}
