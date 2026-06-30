import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs';

import { ActionCardComponent } from '../../../shared/components/action-card/action-card.component';
import { DataTableEmptyStateComponent } from '../../../shared/components/data-table-empty-state/data-table-empty-state.component';
import { DataTableToolbarComponent } from '../../../shared/components/data-table-toolbar/data-table-toolbar.component';
import { MetricCardComponent, MetricCardVariant } from '../../../shared/components/metric-card/metric-card.component';
import { SectionCardComponent } from '../../../shared/components/section-card/section-card.component';
import { StatusBadgeComponent, StatusBadgeVariant } from '../../../shared/components/status-badge/status-badge.component';
import { DataTableResult, DataTableState } from '../../../shared/models/data-table.models';
import { formatFilteredResultsLabel, getSafePageIndex, matchesSearchTerm, paginateItems } from '../../../shared/utils/data-table';
import { AppointmentDeleteDialogComponent } from '../../appointments/components/appointment-delete-dialog.component';
import { AppointmentFormDialogComponent } from '../../appointments/components/appointment-form-dialog.component';
import { Appointment, AppointmentStatus } from '../../appointments/models/appointment.models';
import { AppointmentsService } from '../../appointments/services/appointments.service';
import { CaseFileFormDialogComponent } from '../../case-files/components/case-file-form-dialog.component';
import { CaseFile } from '../../case-files/models/case-file.models';
import { CaseFilesService } from '../../case-files/services/case-files.service';
import { DocumentsListComponent } from '../../documents/components/documents-list.component';
import { SessionNoteDeleteDialogComponent } from '../../session-notes/components/session-note-delete-dialog.component';
import { SessionNoteDetailDialogComponent } from '../../session-notes/components/session-note-detail-dialog.component';
import { SessionNoteFormDialogComponent } from '../../session-notes/components/session-note-form-dialog.component';
import { SessionNote } from '../../session-notes/models/session-note.models';
import { SessionNotesService } from '../../session-notes/services/session-notes.service';
import { Patient } from '../models/patient.models';
import { PatientFormDialogComponent } from './patient-form-dialog.component';

interface PatientDetailDialogData {
  patient: Patient;
}

@Component({
  selector: 'app-patient-detail-dialog',
  standalone: true,
  imports: [
    DatePipe,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    ActionCardComponent,
    DataTableEmptyStateComponent,
    DataTableToolbarComponent,
    DocumentsListComponent,
    MetricCardComponent,
    SectionCardComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './patient-detail-dialog.component.html',
  styleUrl: './patient-detail-dialog.component.scss',
})
export class PatientDetailDialogComponent {
  private static readonly DATE_TIME_FORMATTER = new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  private readonly data = inject<PatientDetailDialogData>(MAT_DIALOG_DATA);
  private readonly appointmentsService = inject(AppointmentsService);
  private readonly caseFilesService = inject(CaseFilesService);
  private readonly sessionNotesService = inject(SessionNotesService);
  private readonly dialog = inject(MatDialog);
  private readonly dialogRef = inject(
    MatDialogRef<PatientDetailDialogComponent, { action: 'close' } | { action: 'edit'; patient: Patient }>
  );

  readonly workspaceContent = viewChild<ElementRef<HTMLElement>>('workspaceContent');
  readonly documentsSection = viewChild<ElementRef<HTMLElement>>('documentsSection');
  readonly patient = signal(this.data.patient);
  readonly appointments = signal<Appointment[]>([]);
  readonly isAppointmentsLoading = signal(true);
  readonly appointmentsErrorMessage = signal('');
  readonly appointmentsSuccessMessage = signal('');
  readonly cancellingAppointmentId = signal<string | null>(null);
  readonly caseFile = signal<CaseFile | null>(null);
  readonly isCaseFileLoading = signal(true);
  readonly caseFileErrorMessage = signal('');
  readonly sessionNotes = signal<SessionNote[]>([]);
  readonly isSessionNotesLoading = signal(false);
  readonly sessionNotesErrorMessage = signal('');
  readonly sessionNotesPageSizeOptions = [5, 10, 20];
  readonly sessionNotesTableState = signal<DataTableState>({
    searchTerm: '',
    pageIndex: 0,
    pageSize: 5,
    sortBy: undefined,
    sortDirection: '',
  });
  readonly sessionNotesTableResult = computed<DataTableResult<SessionNote>>(() => {
    const state = this.sessionNotesTableState();
    const items = this.sessionNotes();
    const filteredItems = items.filter((sessionNote) =>
      matchesSearchTerm(sessionNote, state.searchTerm, (item) => this.getSessionNoteSearchValues(item))
    );

    return {
      items,
      filteredItems,
      pagedItems: paginateItems(filteredItems, {
        pageIndex: this.safeSessionNotesPageIndex(),
        pageSize: state.pageSize,
      }),
      totalItems: items.length,
      totalFilteredItems: filteredItems.length,
      hasActiveFilters: Boolean(state.searchTerm.trim()),
    };
  });
  readonly safeSessionNotesPageIndex = computed(() => {
    const state = this.sessionNotesTableState();
    const totalFilteredItems = this.sessionNotes().filter((sessionNote) =>
      matchesSearchTerm(sessionNote, state.searchTerm, (item) => this.getSessionNoteSearchValues(item))
    ).length;

    return getSafePageIndex(totalFilteredItems, state.pageIndex, state.pageSize);
  });
  readonly sessionNotesCounterLabel = computed(() => {
    const result = this.sessionNotesTableResult();

    return formatFilteredResultsLabel(
      result.totalFilteredItems,
      result.totalItems,
      (count) => this.formatSessionNoteCount(count),
      result.hasActiveFilters
    );
  });
  readonly clinicalSummaryCards = computed(() => {
    const currentCaseFile = this.caseFile();
    const loading = this.isCaseFileLoading();

    return [
      {
        icon: 'update',
        title: 'Ultima actualizacion',
        value: this.formatDateTimeValue(currentCaseFile?.updatedAt),
        supportingText: currentCaseFile
          ? 'Ultimo movimiento registrado en el expediente.'
          : 'Sin actualizaciones clinicas disponibles.',
        tone: 'blue' as MetricCardVariant,
        loading,
      },
      {
        icon: 'folder_shared',
        title: 'Alta del expediente',
        value: this.formatDateTimeValue(currentCaseFile?.createdAt, 'Pendiente'),
        supportingText: currentCaseFile
          ? 'Fecha de apertura del expediente clinico.'
          : 'El expediente aun no ha sido creado.',
        tone: 'green' as MetricCardVariant,
        loading,
      },
      {
        icon: 'health_and_safety',
        title: 'Estado del expediente',
        value: this.getCaseFileStatusLabel(),
        supportingText: this.getCaseFileStatusSupportingText(),
        tone: 'amber' as MetricCardVariant,
        loading,
      },
      {
        icon: 'assignment_turned_in',
        title: 'Informacion base',
        value: this.getFoundationStatusValue(),
        supportingText: this.getFoundationStatusSupportingText(),
        tone: 'violet' as MetricCardVariant,
        loading,
      },
    ];
  });

  constructor() {
    this.loadAppointments();
    this.loadCaseFile();
  }

  close(): void {
    this.dialogRef.close({ action: 'close' });
  }

  openCreateCaseFileDialog(): void {
    const dialogRef = this.dialog.open(CaseFileFormDialogComponent, {
      width: '720px',
      maxWidth: '95vw',
      autoFocus: false,
      data: {
        mode: 'create',
        patientId: this.patient().id,
      },
    });

    dialogRef.afterClosed().subscribe((created) => {
      if (created) {
        this.loadCaseFile();
      }
    });
  }

  openEditCaseFileDialog(): void {
    const currentCaseFile = this.caseFile();

    if (!currentCaseFile) {
      return;
    }

    const dialogRef = this.dialog.open(CaseFileFormDialogComponent, {
      width: '720px',
      maxWidth: '95vw',
      autoFocus: false,
      data: {
        mode: 'edit',
        patientId: this.patient().id,
        caseFile: currentCaseFile,
      },
    });

    dialogRef.afterClosed().subscribe((updated) => {
      if (updated) {
        this.loadCaseFile();
      }
    });
  }

  openCreateAppointmentDialog(): void {
    this.appointmentsSuccessMessage.set('');

    const dialogRef = this.dialog.open(AppointmentFormDialogComponent, {
      width: '720px',
      maxWidth: '95vw',
      autoFocus: false,
      data: {
        mode: 'create',
        patientId: this.patient().id,
      },
    });

    dialogRef.afterClosed().subscribe((created) => {
      if (created) {
        this.loadAppointments();
      }
    });
  }

  openEditAppointmentDialog(appointment: Appointment): void {
    this.appointmentsSuccessMessage.set('');

    const dialogRef = this.dialog.open(AppointmentFormDialogComponent, {
      width: '720px',
      maxWidth: '95vw',
      autoFocus: false,
      data: {
        mode: 'edit',
        patientId: this.patient().id,
        appointment,
      },
    });

    dialogRef.afterClosed().subscribe((updated) => {
      if (updated) {
        this.loadAppointments();
      }
    });
  }

  cancelAppointment(appointment: Appointment): void {
    if (this.cancellingAppointmentId()) {
      return;
    }

    this.appointmentsErrorMessage.set('');
    this.appointmentsSuccessMessage.set('');
    this.cancellingAppointmentId.set(appointment.id);

    this.appointmentsService
      .updateAppointment(appointment.id, {
        status: 'CANCELLED',
      })
      .pipe(finalize(() => this.cancellingAppointmentId.set(null)))
      .subscribe({
        next: () => {
          this.appointmentsSuccessMessage.set('La cita fue cancelada correctamente.');
          this.loadAppointments();
        },
        error: (error: HttpErrorResponse) => {
          this.appointmentsErrorMessage.set(this.getAppointmentActionErrorMessage(error, 'cancelar'));
        },
      });
  }

  openDeleteAppointmentDialog(appointment: Appointment): void {
    this.appointmentsSuccessMessage.set('');

    const dialogRef = this.dialog.open(AppointmentDeleteDialogComponent, {
      width: '520px',
      maxWidth: '95vw',
      autoFocus: false,
      data: {
        appointment,
      },
    });

    dialogRef.afterClosed().subscribe((deleted) => {
      if (deleted) {
        this.loadAppointments();
      }
    });
  }

  openCreateSessionNoteDialog(): void {
    const currentCaseFile = this.caseFile();

    if (!currentCaseFile) {
      return;
    }

    const dialogRef = this.dialog.open(SessionNoteFormDialogComponent, {
      width: '720px',
      maxWidth: '95vw',
      autoFocus: false,
      data: {
        mode: 'create',
        caseFileId: currentCaseFile.id,
      },
    });

    dialogRef.afterClosed().subscribe((created) => {
      if (created) {
        this.loadSessionNotes(currentCaseFile.id);
      }
    });
  }

  openEditPatientDialog(): void {
    const scrollTop = this.workspaceContent()?.nativeElement.scrollTop ?? 0;
    const dialogRef = this.dialog.open(PatientFormDialogComponent, {
      width: '720px',
      maxWidth: '95vw',
      autoFocus: false,
      restoreFocus: false,
      data: {
        mode: 'edit',
        patient: this.patient(),
      },
    });

    dialogRef.afterClosed().subscribe((updated) => {
      this.restoreWorkspaceScroll(scrollTop);

      if (updated && typeof updated !== 'boolean') {
        this.patient.update((currentPatient) => ({
          ...currentPatient,
          ...updated,
        }));
      }
    });
  }

  openEditSessionNoteDialog(sessionNote: SessionNote): void {
    const currentCaseFile = this.caseFile();

    if (!currentCaseFile) {
      return;
    }

    const dialogRef = this.dialog.open(SessionNoteFormDialogComponent, {
      width: '720px',
      maxWidth: '95vw',
      autoFocus: false,
      data: {
        mode: 'edit',
        caseFileId: currentCaseFile.id,
        sessionNote,
      },
    });

    dialogRef.afterClosed().subscribe((updated) => {
      if (updated) {
        this.loadSessionNotes(currentCaseFile.id);
      }
    });
  }

  openSessionNoteDetailDialog(sessionNote: SessionNote): void {
    const dialogRef = this.dialog.open(SessionNoteDetailDialogComponent, {
      width: '720px',
      maxWidth: '95vw',
      autoFocus: false,
      data: {
        sessionNote,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.action === 'edit') {
        this.openEditSessionNoteDialog(result.sessionNote);
      }
    });
  }

  openDeleteSessionNoteDialog(sessionNote: SessionNote): void {
    const currentCaseFile = this.caseFile();

    if (!currentCaseFile) {
      return;
    }

    const dialogRef = this.dialog.open(SessionNoteDeleteDialogComponent, {
      width: '520px',
      maxWidth: '95vw',
      autoFocus: false,
      data: {
        sessionNote,
      },
    });

    dialogRef.afterClosed().subscribe((deleted) => {
      if (deleted) {
        this.loadSessionNotes(currentCaseFile.id);
      }
    });
  }

  getFullName(): string {
    const patient = this.patient();
    return `${patient.firstName} ${patient.lastName}`;
  }

  getPatientInitials(): string {
    const patient = this.patient();
    return `${patient.firstName.charAt(0)}${patient.lastName.charAt(0)}`.trim().toUpperCase();
  }

  getPatientAge(): string {
    const patient = this.patient();

    if (!patient.birthDate) {
      return 'Pendiente';
    }

    const birthDate = new Date(patient.birthDate);

    if (Number.isNaN(birthDate.getTime())) {
      return 'Pendiente';
    }

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();

    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
      age -= 1;
    }

    if (age < 0) {
      return 'Pendiente';
    }

    return age === 1 ? '1 año' : `${age} años`;
  }

  getDisplayValue(value?: string | null): string {
    return value?.trim() || '-';
  }

  getAppointmentStatusLabel(status: AppointmentStatus): string {
    const labels: Record<AppointmentStatus, string> = {
      SCHEDULED: 'Programada',
      COMPLETED: 'Completada',
      CANCELLED: 'Cancelada',
      NO_SHOW: 'No asistio',
    };

    return labels[status];
  }

  getAppointmentStatusClass(status: AppointmentStatus): StatusBadgeVariant {
    const classes: Record<AppointmentStatus, StatusBadgeVariant> = {
      SCHEDULED: 'primary',
      COMPLETED: 'success',
      CANCELLED: 'danger',
      NO_SHOW: 'warning',
    };

    return classes[status];
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

  getCaseFileStatusLabel(): string {
    if (this.isCaseFileLoading()) {
      return 'Cargando';
    }

    const currentCaseFile = this.caseFile();

    if (!currentCaseFile) {
      return 'Pendiente';
    }

    return this.hasFoundationInformation(currentCaseFile) ? 'Base completa' : 'Informacion pendiente';
  }

  getCaseFileStatusVariant(): StatusBadgeVariant {
    if (this.isCaseFileLoading()) {
      return 'neutral';
    }

    const currentCaseFile = this.caseFile();

    if (!currentCaseFile) {
      return 'warning';
    }

    return this.hasFoundationInformation(currentCaseFile) ? 'success' : 'warning';
  }

  getCaseFileStatusSupportingText(): string {
    const currentCaseFile = this.caseFile();

    if (!currentCaseFile) {
      return 'Sin expediente clinico disponible todavia.';
    }

    return this.hasFoundationInformation(currentCaseFile)
      ? 'Diagnostico y plan de tratamiento visibles.'
      : 'Aun falta completar la informacion base.';
  }

  getFoundationStatusValue(): string {
    const currentCaseFile = this.caseFile();

    if (!currentCaseFile) {
      return 'Pendiente';
    }

    return this.hasFoundationInformation(currentCaseFile) ? 'Completa' : 'Pendiente';
  }

  getFoundationStatusSupportingText(): string {
    const currentCaseFile = this.caseFile();

    if (!currentCaseFile) {
      return 'Falta crear el expediente clinico.';
    }

    const hasDiagnosis = this.hasText(currentCaseFile.diagnosis);
    const hasTreatmentPlan = this.hasText(currentCaseFile.treatmentPlan);

    if (hasDiagnosis && hasTreatmentPlan) {
      return 'Informacion base disponible en el contrato actual.';
    }

    if (!hasDiagnosis && !hasTreatmentPlan) {
      return 'Falta diagnostico y plan de tratamiento.';
    }

    return hasDiagnosis ? 'Falta plan de tratamiento.' : 'Falta diagnostico.';
  }

  getCaseFileCreatedAtLabel(): string {
    if (this.isCaseFileLoading()) {
      return 'Cargando...';
    }

    return this.formatDateTimeValue(this.caseFile()?.createdAt, 'Pendiente');
  }

  scrollToDocuments(): void {
    this.documentsSection()?.nativeElement.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  getSessionNoteTitle(sessionNote: SessionNote): string {
    return sessionNote.title?.trim() || 'Sesion sin titulo';
  }

  updateSessionNotesSearchTerm(searchTerm: string): void {
    this.sessionNotesTableState.update((state) => ({
      ...state,
      searchTerm,
      pageIndex: 0,
    }));
  }

  clearSessionNotesFilters(): void {
    this.sessionNotesTableState.update((state) => ({
      ...state,
      searchTerm: '',
      pageIndex: 0,
    }));
  }

  handleSessionNotesPageChange(event: PageEvent): void {
    this.sessionNotesTableState.update((state) => ({
      ...state,
      pageIndex: event.pageIndex,
      pageSize: event.pageSize,
    }));
  }

  private loadCaseFile(): void {
    this.isCaseFileLoading.set(true);
    this.caseFileErrorMessage.set('');
    this.resetSessionNotesState();

    this.caseFilesService.getCaseFileByPatientId(this.patient().id).subscribe({
      next: (caseFile) => {
        this.caseFile.set(caseFile);
        this.isCaseFileLoading.set(false);
        this.loadSessionNotes(caseFile.id);
      },
      error: (error: HttpErrorResponse) => {
        this.caseFile.set(null);
        this.isCaseFileLoading.set(false);
        this.resetSessionNotesState();

        if (error.status === 404) {
          return;
        }

        this.caseFileErrorMessage.set('No fue posible cargar el expediente clinico.');
      },
    });
  }

  private loadAppointments(): void {
    this.isAppointmentsLoading.set(true);
    this.appointmentsErrorMessage.set('');
    this.appointments.set([]);

    this.appointmentsService.getAppointmentsByPatientId(this.patient().id).subscribe({
      next: (appointments) => {
        this.appointments.set(appointments);
        this.isAppointmentsLoading.set(false);
      },
      error: () => {
        this.appointments.set([]);
        this.isAppointmentsLoading.set(false);
        this.appointmentsErrorMessage.set('No fue posible cargar las citas.');
      },
    });
  }

  private loadSessionNotes(caseFileId: string): void {
    this.isSessionNotesLoading.set(true);
    this.sessionNotesErrorMessage.set('');
    this.sessionNotes.set([]);

    this.sessionNotesService.getSessionNotesByCaseFileId(caseFileId).subscribe({
      next: (sessionNotes) => {
        this.sessionNotes.set(sessionNotes);
        this.isSessionNotesLoading.set(false);
      },
      error: () => {
        this.sessionNotes.set([]);
        this.isSessionNotesLoading.set(false);
        this.sessionNotesErrorMessage.set('No fue posible cargar las notas de sesion.');
      },
    });
  }

  private resetSessionNotesState(): void {
    this.sessionNotes.set([]);
    this.isSessionNotesLoading.set(false);
    this.sessionNotesErrorMessage.set('');
    this.clearSessionNotesFilters();
  }

  private restoreWorkspaceScroll(scrollTop: number): void {
    queueMicrotask(() => {
      const contentElement = this.workspaceContent()?.nativeElement;

      if (contentElement) {
        contentElement.scrollTop = scrollTop;
      }
    });
  }

  private getAppointmentActionErrorMessage(error: HttpErrorResponse, action: 'cancelar'): string {
    if (error.status === 401 || error.status === 403) {
      return `No tienes permisos para ${action} esta cita.`;
    }

    if (error.status === 404) {
      return 'La cita ya no esta disponible.';
    }

    return `No fue posible ${action} la cita.`;
  }

  private getSessionNoteSearchValues(sessionNote: SessionNote): Array<string | null | undefined> {
    return [sessionNote.title, this.getSessionNoteTitle(sessionNote), sessionNote.content, sessionNote.sessionDate];
  }

  private formatSessionNoteCount(count: number): string {
    return count === 1 ? '1 nota' : `${count} notas`;
  }

  private formatDateTimeValue(value?: string | null, fallback = 'Pendiente'): string {
    if (!value) {
      return fallback;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return fallback;
    }

    return PatientDetailDialogComponent.DATE_TIME_FORMATTER.format(date).replace(',', '');
  }

  private hasFoundationInformation(caseFile: CaseFile): boolean {
    return this.hasText(caseFile.diagnosis) && this.hasText(caseFile.treatmentPlan);
  }

  private hasText(value?: string | null): boolean {
    return Boolean(value?.trim());
  }
}
