import { inject, Injectable, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { AuthStore } from '../../../core/auth/auth.store';
import { CaseFile } from '../../case-files/models/case-file.models';
import { CaseFilesService } from '../../case-files/services/case-files.service';
import { Patient } from '../../patients/models/patient.models';
import { PatientsService } from '../../patients/services/patients.service';
import { UploadDocumentRequest } from '../models/document.models';
import { DocumentsService } from './documents.service';

@Injectable()
export class DocumentUploadFlowStore {
  private readonly authStore = inject(AuthStore);
  private readonly caseFilesService = inject(CaseFilesService);
  private readonly documentsService = inject(DocumentsService);
  private readonly patientsService = inject(PatientsService);

  readonly isSaving = signal(false);
  readonly errorMessage = signal('');
  readonly isCaseFilesLoading = signal(true);
  readonly caseFilesLoadErrorMessage = signal('');
  readonly caseFileOptions = signal<{ value: string; label: string }[]>([]);
  readonly uploadedById = signal(this.authStore.user()?.id ?? '');
  readonly fixedCaseFileId = signal('');

  configureFixedCaseFile(caseFileId: string): void {
    this.fixedCaseFileId.set(caseFileId);
    this.isCaseFilesLoading.set(false);
    this.caseFilesLoadErrorMessage.set('');
    this.caseFileOptions.set([]);
  }

  loadCaseFileOptions(): void {
    this.fixedCaseFileId.set('');
    this.isCaseFilesLoading.set(true);
    this.caseFilesLoadErrorMessage.set('');

    forkJoin({
      caseFiles: this.caseFilesService.getCaseFiles(),
      patients: this.patientsService.getPatients(),
    })
      .pipe(finalize(() => this.isCaseFilesLoading.set(false)))
      .subscribe({
        next: ({ caseFiles, patients }) => {
          this.caseFileOptions.set(this.buildCaseFileOptions(caseFiles, patients));
        },
        error: () => {
          this.caseFileOptions.set([]);
          this.caseFilesLoadErrorMessage.set('No fue posible cargar los expedientes disponibles.');
        },
      });
  }

  submit(payload: UploadDocumentRequest, onSuccess: () => void): void {
    if (this.isSaving()) {
      return;
    }

    const uploadedById = this.uploadedById().trim();

    if (!uploadedById) {
      this.errorMessage.set('No fue posible identificar al usuario autenticado.');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');

    this.documentsService
      .upload(payload.caseFileId, uploadedById, payload.file)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          onSuccess();
        },
        error: () => {
          this.errorMessage.set('No fue posible subir el documento.');
        },
      });
  }

  private buildCaseFileOptions(caseFiles: CaseFile[], patients: Patient[]): { value: string; label: string }[] {
    const patientsById = new Map(patients.map((patient) => [patient.id, patient]));

    return [...caseFiles]
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map((caseFile) => {
        const patient = patientsById.get(caseFile.patientId);
        const patientName = patient ? `${patient.firstName} ${patient.lastName}`.trim() : 'Paciente sin nombre disponible';
        const createdAtLabel = new Date(caseFile.createdAt).toLocaleDateString('es-MX');

        return {
          value: caseFile.id,
          label: `${patientName} - Expediente ${caseFile.id.slice(0, 8)} - ${createdAtLabel}`,
        };
      });
  }
}
