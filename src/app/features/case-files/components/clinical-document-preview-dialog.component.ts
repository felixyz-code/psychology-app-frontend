import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { ClinicalPdfEngineService } from '../../../core/services/clinical-pdf-engine.service';
import {
  ClinicalDocumentPreviewDialogData,
  ClinicalDocumentType,
} from '../models/clinical-pdf.models';

@Component({
  selector: 'app-clinical-document-preview-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTabsModule,
    MatTooltipModule,
  ],
  templateUrl: './clinical-document-preview-dialog.component.html',
  styleUrl: './clinical-document-preview-dialog.component.scss',
})
export class ClinicalDocumentPreviewDialogComponent {
  readonly data: ClinicalDocumentPreviewDialogData = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ClinicalDocumentPreviewDialogComponent>);
  private readonly pdfEngine = inject(ClinicalPdfEngineService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly selectedDocType = signal<ClinicalDocumentType>(
    this.data.initialDocumentType || this.data.payload.documentType || 'NOM_004_EVOLUTION_NOTE',
  );

  readonly customIndications = signal<string>(
    this.data.payload.caseFile.treatmentPlan ||
      '1. Continuar con ejercicios de respiración diafragmática 10 minutos al día.\n2. Registro de autorregistro de pensamientos automáticos inter-sesión.\n3. Acudir a su próxima sesión programada.',
  );

  readonly generatedHtml = computed(() =>
    this.pdfEngine.generateHtml(
      this.data.payload,
      this.selectedDocType(),
      this.customIndications(),
    ),
  );

  readonly sanitizedHtml = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(this.generatedHtml()),
  );

  readonly safeIframeHtml = this.sanitizedHtml;

  readonly documentTypes: Array<{
    type: ClinicalDocumentType;
    label: string;
    icon: string;
  }> = [
    {
      type: 'NOM_004_EVOLUTION_NOTE',
      label: 'Nota NOM-004',
      icon: 'description',
    },
    {
      type: 'THERAPEUTIC_PRESCRIPTION',
      label: 'Receta / Indicaciones',
      icon: 'receipt_long',
    },
    {
      type: 'INFORMED_CONSENT',
      label: 'Consentimiento',
      icon: 'verified_user',
    },
    {
      type: 'CASE_FILE_SUMMARY',
      label: 'Resumen Expediente',
      icon: 'folder_shared',
    },
  ];

  selectDocType(type: ClinicalDocumentType): void {
    this.selectedDocType.set(type);
  }

  print(): void {
    this.pdfEngine.printDocument(this.generatedHtml());
  }

  download(): void {
    const html = this.generatedHtml();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const patientName = this.data.payload.patient.fullName.replace(/\s+/g, '_');
    link.href = url;
    link.download = `${this.selectedDocType()}_${patientName}.html`;
    link.click();
    URL.revokeObjectURL(url);
  }

  close(): void {
    this.dialogRef.close();
  }
}
