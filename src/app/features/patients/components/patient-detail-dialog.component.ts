import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';

import { ActionCardComponent } from '../../../shared/components/action-card/action-card.component';
import { ClinicalTimelineComponent, ClinicalTimelineItem } from '../../../shared/components/clinical-timeline/clinical-timeline.component';
import { DataTableEmptyStateComponent } from '../../../shared/components/data-table-empty-state/data-table-empty-state.component';
import { DataTableToolbarComponent } from '../../../shared/components/data-table-toolbar/data-table-toolbar.component';
import { MetricCardComponent, MetricCardVariant } from '../../../shared/components/metric-card/metric-card.component';
import { SectionCardComponent } from '../../../shared/components/section-card/section-card.component';
import { StatusBadgeComponent, StatusBadgeVariant } from '../../../shared/components/status-badge/status-badge.component';
import { DataTableResult, DataTableState } from '../../../shared/models/data-table.models';
import { formatFilteredResultsLabel, getSafePageIndex, matchesSearchTerm, paginateItems } from '../../../shared/utils/data-table';
import { AppointmentDeleteDialogComponent } from '../../appointments/components/appointment-delete-dialog.component';
import { AppointmentDetailDialogComponent } from '../../appointments/components/appointment-detail-dialog.component';
import { AppointmentFormDialogComponent } from '../../appointments/components/appointment-form-dialog.component';
import { Appointment, AppointmentStatus } from '../../appointments/models/appointment.models';
import { AppointmentsService } from '../../appointments/services/appointments.service';
import { CaseFileFormDialogComponent } from '../../case-files/components/case-file-form-dialog.component';
import {
  CaseFile,
  CaseFileWorkspaceResponse,
  ClinicalTimelineEvent,
} from '../../case-files/models/case-file.models';
import { CaseFilesService } from '../../case-files/services/case-files.service';
import { DocumentsListComponent } from '../../documents/components/documents-list.component';
import { DocumentPreviewDialogComponent } from '../../documents/components/document-preview-dialog.component';
import { Document } from '../../documents/models/document.models';
import { SessionNoteDeleteDialogComponent } from '../../session-notes/components/session-note-delete-dialog.component';
import { SessionNoteDetailDialogComponent } from '../../session-notes/components/session-note-detail-dialog.component';
import { SessionNoteFormDialogComponent } from '../../session-notes/components/session-note-form-dialog.component';
import { SessionNote } from '../../session-notes/models/session-note.models';
import { Patient } from '../models/patient.models';
import { PatientFormDialogComponent } from './patient-form-dialog.component';

interface PatientDetailDialogData {
  patient: Patient;
  caseFileId?: string | null;
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
    MatTooltipModule,
    ActionCardComponent,
    ClinicalTimelineComponent,
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
  private readonly dialog = inject(MatDialog);
  private readonly dialogRef = inject(
    MatDialogRef<PatientDetailDialogComponent, { action: 'close' } | { action: 'edit'; patient: Patient }>
  );

  readonly workspaceContent = viewChild<ElementRef<HTMLElement>>('workspaceContent');
  readonly documentsSection = viewChild<ElementRef<HTMLElement>>('documentsSection');
  readonly patient = signal(this.data.patient);
  readonly caseFileId = signal(this.data.caseFileId?.trim() ?? '');

  readonly appointments = signal<Appointment[]>([]);
  readonly isAppointmentsLoading = signal(false);
  readonly appointmentsErrorMessage = signal('');
  readonly appointmentsSuccessMessage = signal('');
  readonly cancellingAppointmentId = signal<string | null>(null);

  readonly caseFile = signal<CaseFile | null>(null);
  readonly isCaseFileLoading = signal(true);
  readonly caseFileErrorMessage = signal('');

  readonly documents = signal<Document[]>([]);
  readonly isDocumentsLoading = signal(false);
  readonly documentsErrorMessage = signal('');

  readonly sessionNotes = signal<SessionNote[]>([]);
  readonly isSessionNotesLoading = signal(false);
  readonly sessionNotesErrorMessage = signal('');

  readonly workspaceSummary = signal<CaseFileWorkspaceResponse['summary'] | null>(null);
  readonly backendTimeline = signal<ClinicalTimelineEvent[]>([]);
  readonly isTimelineLoading = signal(false);
  readonly timelineErrorMessage = signal('');

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
    const summary = this.workspaceSummary();
    const lastActivityLabel = summary?.lastActivityAt ? this.formatDateTimeValue(summary.lastActivityAt) : 'Pendiente';
    const lastActivityEvent = this.timelineItems()[0];

    return [
      {
        icon: 'event',
        title: 'Total de citas',
        value: summary ? this.formatMetricCount(summary.appointmentsCount, 'cita', 'citas') : 'Pendiente',
        supportingText: 'Total de citas visibles en el workspace clinico.',
        tone: 'blue' as MetricCardVariant,
        loading: this.isCaseFileLoading(),
      },
      {
        icon: 'notes',
        title: 'Total de notas',
        value: summary ? this.formatMetricCount(summary.sessionNotesCount, 'nota', 'notas') : 'Pendiente',
        supportingText: this.caseFile()
          ? 'Notas de sesion vinculadas al expediente actual.'
          : 'Pendiente hasta que exista un expediente clinico.',
        tone: 'green' as MetricCardVariant,
        loading: this.isCaseFileLoading(),
      },
      {
        icon: 'description',
        title: 'Total de documentos',
        value: summary ? this.formatMetricCount(summary.documentsCount, 'documento', 'documentos') : 'Pendiente',
        supportingText: this.caseFile()
          ? 'Documentos asociados al expediente actual.'
          : 'Pendiente hasta que exista un expediente clinico.',
        tone: 'amber' as MetricCardVariant,
        loading: this.isCaseFileLoading(),
      },
      {
        icon: 'timeline',
        title: 'Ultima actividad',
        value: lastActivityLabel,
        supportingText: lastActivityEvent?.title ?? 'Todavia no hay actividad clinica visible.',
        tone: 'violet' as MetricCardVariant,
        loading: this.isTimelineLoading(),
      },
    ];
  });

  readonly workspaceFooterText = computed(() => {
    return this.formatDateTimeValue(this.caseFile()?.updatedAt, 'Pendiente');
  });

  readonly timelineItems = computed<ClinicalTimelineItem[]>(() => {
    return this.backendTimeline()
      .map((event) => this.mapTimelineEvent(event))
      .filter((event): event is ClinicalTimelineItem => event !== null);
  });

  constructor() {
    this.loadWorkspace();
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
        this.loadWorkspace();
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
        this.loadWorkspace();
      }
    });
  }

  openCaseFileActionDialog(): void {
    if (this.caseFile()) {
      this.openEditCaseFileDialog();
      return;
    }

    this.openCreateCaseFileDialog();
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
        this.refreshWorkspaceFromCaseFileContext();
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
        this.loadWorkspace();
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
          this.loadWorkspace();
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
        this.loadWorkspace();
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
        this.loadWorkspace();
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

        if (this.caseFileId()) {
          this.loadWorkspace();
        }
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
        this.loadWorkspace();
      }
    });
  }

  openSessionNoteDetailDialog(sessionNote: SessionNote): void {
    const dialogRef = this.dialog.open(SessionNoteDetailDialogComponent, {
      width: '960px',
      maxWidth: '95vw',
      maxHeight: '85vh',
      height: '85vh',
      autoFocus: false,
      restoreFocus: false,
      panelClass: 'app-detail-dialog-panel',
      data: {
        sessionNote,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.action === 'edit') {
        this.openEditSessionNoteDialog(result.sessionNote);
        return;
      }

      if (result?.action === 'delete') {
        this.openDeleteSessionNoteDialog(result.sessionNote);
      }
    });
  }

  handleTimelineEventSelected(event: ClinicalTimelineItem): void {
    if (!event.sourceType || !event.sourceId) {
      return;
    }

    if (event.sourceType === 'SESSION_NOTE') {
      const sessionNote = this.sessionNotes().find((item) => item.id === event.sourceId);

      if (sessionNote) {
        this.openSessionNoteDetailDialog(sessionNote);
      }

      return;
    }

    if (event.sourceType === 'DOCUMENT') {
      const document = this.documents().find((item) => item.id === event.sourceId);

      if (document) {
        this.dialog.open(DocumentPreviewDialogComponent, {
          autoFocus: false,
          disableClose: false,
          panelClass: 'app-document-preview-panel',
          data: {
            document,
          },
        });
      }

      return;
    }

    if (event.sourceType === 'APPOINTMENT') {
      const appointment = this.appointments().find((item) => item.id === event.sourceId);

      if (!appointment) {
        return;
      }

      const dialogRef = this.dialog.open(AppointmentDetailDialogComponent, {
        width: '760px',
        maxWidth: '95vw',
        autoFocus: false,
        data: {
          appointment,
          patientName: this.getFullName(),
        },
      });

      dialogRef.afterClosed().subscribe((result) => {
        if (result?.action === 'edit') {
          this.openEditAppointmentDialog(result.appointment);
        }
      });
    }
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
        this.loadWorkspace();
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

    return age === 1 ? '1 a\u00f1o' : `${age} a\u00f1os`;
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

  getCaseFileCreatedAtLabel(): string {
    if (this.isCaseFileLoading()) {
      return 'Cargando...';
    }

    return this.formatDateTimeValue(this.caseFile()?.createdAt, 'Pendiente');
  }

  getCaseFileActionLabel(): string {
    return this.caseFile() ? 'Editar expediente' : 'Crear expediente';
  }

  getCaseFileActionIcon(): string {
    return this.caseFile() ? 'folder_open' : 'create_new_folder';
  }

  getNextAppointmentLabel(): string {
    return this.formatDateTimeValue(this.workspaceSummary()?.nextAppointmentAt, 'Pendiente');
  }

  getLastAppointmentLabel(): string {
    return this.formatDateTimeValue(this.workspaceSummary()?.lastAppointmentAt, 'Pendiente');
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

  refreshWorkspaceData(): void {
    this.loadWorkspace();
  }

  private refreshWorkspaceFromCaseFileContext(): void {
    const currentCaseFileId = this.caseFileId().trim();

    if (!currentCaseFileId) {
      return;
    }

    this.loadWorkspaceByCaseFileId(currentCaseFileId);
  }

  private loadWorkspace(): void {
    const currentCaseFileId = this.caseFileId();

    if (currentCaseFileId) {
      this.loadWorkspaceByCaseFileId(currentCaseFileId);
      return;
    }

    this.loadCaseFileByPatient();
  }

  private loadWorkspaceByCaseFileId(caseFileId: string): void {
    this.isCaseFileLoading.set(true);
    this.isTimelineLoading.set(true);
    this.isAppointmentsLoading.set(true);
    this.isSessionNotesLoading.set(true);
    this.isDocumentsLoading.set(true);
    this.caseFileErrorMessage.set('');
    this.timelineErrorMessage.set('');
    this.appointmentsErrorMessage.set('');
    this.sessionNotesErrorMessage.set('');
    this.documentsErrorMessage.set('');

    this.caseFilesService.getWorkspace(caseFileId).subscribe({
      next: (workspace) => {
        this.applyWorkspace(workspace);
      },
      error: () => {
        this.resetWorkspaceData();
        this.caseFileErrorMessage.set('No fue posible cargar el Clinical Workspace.');
        this.isCaseFileLoading.set(false);
        this.isTimelineLoading.set(false);
      },
    });
  }

  private loadCaseFileByPatient(): void {
    this.isCaseFileLoading.set(true);
    this.caseFileErrorMessage.set('');
    this.workspaceSummary.set(null);
    this.backendTimeline.set([]);
    this.isTimelineLoading.set(false);
    this.timelineErrorMessage.set('');
    this.resetAppointmentsState();
    this.resetSessionNotesState();
    this.resetDocumentsState();

    this.caseFilesService.getCaseFileByPatientId(this.patient().id).subscribe({
      next: (caseFile) => {
        this.caseFileId.set(caseFile.id);
        this.loadWorkspaceByCaseFileId(caseFile.id);
      },
      error: (error: HttpErrorResponse) => {
        this.caseFileId.set('');
        this.caseFile.set(null);
        this.isCaseFileLoading.set(false);

        if (error.status === 404) {
          return;
        }

        this.caseFileErrorMessage.set('No fue posible cargar el expediente clinico.');
      },
    });
  }

  private applyWorkspace(workspace: CaseFileWorkspaceResponse): void {
    this.caseFileId.set(workspace.caseFile.id);
    this.caseFile.set(workspace.caseFile);
    this.patient.set({
      ...this.patient(),
      ...workspace.patient,
    });
    this.workspaceSummary.set(workspace.summary);
    this.appointments.set(workspace.appointments);
    this.sessionNotes.set(workspace.sessionNotes);
    this.documents.set(workspace.documents);
    this.backendTimeline.set(workspace.timeline);

    this.isAppointmentsLoading.set(false);
    this.isSessionNotesLoading.set(false);
    this.isDocumentsLoading.set(false);
    this.isCaseFileLoading.set(false);
    this.isTimelineLoading.set(false);

    this.appointmentsErrorMessage.set('');
    this.sessionNotesErrorMessage.set('');
    this.documentsErrorMessage.set('');
    this.timelineErrorMessage.set('');
  }

  private resetWorkspaceData(): void {
    this.caseFile.set(null);
    this.workspaceSummary.set(null);
    this.backendTimeline.set([]);
    this.resetAppointmentsState();
    this.resetSessionNotesState();
    this.resetDocumentsState();
  }

  private resetAppointmentsState(): void {
    this.appointments.set([]);
    this.isAppointmentsLoading.set(false);
    this.appointmentsErrorMessage.set('');
  }

  private resetSessionNotesState(): void {
    this.sessionNotes.set([]);
    this.isSessionNotesLoading.set(false);
    this.sessionNotesErrorMessage.set('');
    this.clearSessionNotesFilters();
  }

  private resetDocumentsState(): void {
    this.documents.set([]);
    this.isDocumentsLoading.set(false);
    this.documentsErrorMessage.set('');
  }

  private restoreWorkspaceScroll(scrollTop: number): void {
    queueMicrotask(() => {
      const contentElement = this.workspaceContent()?.nativeElement;

      if (contentElement) {
        contentElement.scrollTop = scrollTop;
      }
    });
  }

  private mapTimelineEvent(event: ClinicalTimelineEvent): ClinicalTimelineItem | null {
    const config: Record<
      ClinicalTimelineEvent['type'],
      { icon: string; title: string }
    > = {
      CASE_FILE_CREATED: { icon: 'folder_open', title: 'Expediente creado' },
      APPOINTMENT_COMPLETED: { icon: 'event', title: 'Cita completada' },
      SESSION_NOTE_CREATED: { icon: 'notes', title: 'Nota de sesion registrada' },
      DOCUMENT_UPLOADED: { icon: 'description', title: 'Documento agregado' },
    };

    const eventConfig = config[event.type];

    if (!eventConfig) {
      return null;
    }

    return {
      id: event.id,
      icon: eventConfig.icon,
      title: eventConfig.title,
      timestamp: event.occurredAt,
      description: event.description?.trim() || event.title?.trim() || null,
      sourceType: event.sourceType,
      sourceId: event.sourceId,
    };
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

  private formatMetricCount(count: number, singular: string, plural: string): string {
    return `${count} ${count === 1 ? singular : plural}`;
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
