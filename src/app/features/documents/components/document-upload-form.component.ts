import { CommonModule } from '@angular/common';
import { Component, effect, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SectionCardComponent } from '../../../shared/components/section-card/section-card.component';
import { UploadDocumentRequest } from '../models/document.models';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'];
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

export interface DocumentCaseFileOption {
  value: string;
  label: string;
}

type DocumentFormLayout = 'page' | 'dialog';

@Component({
  selector: 'app-document-upload-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    PageHeaderComponent,
    SectionCardComponent,
  ],
  templateUrl: './document-upload-form.component.html',
  styleUrl: './document-upload-form.component.scss',
})
export class DocumentUploadFormComponent {
  private readonly formBuilder = inject(NonNullableFormBuilder);

  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  readonly layout = input<DocumentFormLayout>('page');
  readonly isSaving = input(false);
  readonly errorMessage = input('');
  readonly isCaseFilesLoading = input(false);
  readonly caseFilesLoadErrorMessage = input('');
  readonly caseFileOptions = input<DocumentCaseFileOption[]>([]);
  readonly fixedCaseFileId = input('');

  readonly formSubmitted = output<UploadDocumentRequest>();
  readonly cancelled = output<void>();

  readonly selectedFile = signal<File | null>(null);
  readonly fileErrorMessage = signal('');

  readonly uploadForm = this.formBuilder.group({
    caseFileId: ['', [Validators.required, Validators.maxLength(64)]],
  });

  constructor() {
    effect(() => {
      const fixedCaseFileId = this.fixedCaseFileId().trim();
      const control = this.uploadForm.controls.caseFileId;

      if (fixedCaseFileId) {
        control.setValue(fixedCaseFileId, { emitEvent: false });
        control.setValidators([Validators.maxLength(64)]);
      } else {
        control.setValidators([Validators.required, Validators.maxLength(64)]);
      }

      control.updateValueAndValidity({ emitEvent: false });
    });
  }

  openFilePicker(): void {
    this.fileInput()?.nativeElement.click();
  }

  replaceFile(): void {
    this.resetNativeFileInput();
    this.openFilePicker();
  }

  removeFile(): void {
    this.selectedFile.set(null);
    this.fileErrorMessage.set('');
    this.resetNativeFileInput();
  }

  handleFileSelection(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    const validationError = this.validateFile(file);

    if (validationError) {
      this.selectedFile.set(null);
      this.fileErrorMessage.set(validationError);
      return;
    }

    this.selectedFile.set(file);
    this.fileErrorMessage.set('');
  }

  submit(): void {
    if (this.isSaving()) {
      return;
    }

    if (this.uploadForm.invalid) {
      this.uploadForm.markAllAsTouched();
    }

    const file = this.selectedFile();
    const validationError = this.validateFile(file);

    if (validationError) {
      this.fileErrorMessage.set(validationError);
    }

    if (this.uploadForm.invalid || validationError || !file) {
      return;
    }

    const rawValue = this.uploadForm.getRawValue();
    this.formSubmitted.emit({
      caseFileId: rawValue.caseFileId.trim(),
      file,
    });
  }

  cancel(): void {
    this.cancelled.emit();
  }

  hasRequiredError(controlName: 'caseFileId'): boolean {
    if (this.isCaseFileSelectionHidden()) {
      return false;
    }

    const control = this.uploadForm.controls[controlName];
    return control.touched && control.hasError('required');
  }

  hasMaxLengthError(controlName: 'caseFileId'): boolean {
    const control = this.uploadForm.controls[controlName];
    return control.touched && control.hasError('maxlength');
  }

  getFileName(): string {
    return this.selectedFile()?.name ?? 'Ningun archivo seleccionado';
  }

  getFileSizeLabel(): string {
    const file = this.selectedFile();

    if (!file) {
      return 'Maximo 10 MB. Formatos permitidos: PDF, JPG, JPEG y PNG.';
    }

    return this.formatFileSize(file.size);
  }

  getSelectedFileIcon(): string {
    const file = this.selectedFile();
    const extension = file?.name.split('.').pop()?.toLowerCase() ?? '';

    if (extension === 'pdf') {
      return 'picture_as_pdf';
    }

    if (['jpg', 'jpeg', 'png'].includes(extension)) {
      return 'image';
    }

    return 'description';
  }

  getSavingLabel(): string {
    return 'Subiendo documento...';
  }

  isDialogLayout(): boolean {
    return this.layout() === 'dialog';
  }

  hasSelectedFile(): boolean {
    return !!this.selectedFile();
  }

  hasFileValidationError(): boolean {
    return !!this.fileErrorMessage();
  }

  hasValidCaseFileSelection(): boolean {
    return !!this.uploadForm.controls.caseFileId.value.trim() && this.uploadForm.controls.caseFileId.valid;
  }

  isSubmitDisabled(): boolean {
    const isCaseFileFixed = this.isCaseFileSelectionHidden();

    return (
      this.isSaving() ||
      (!isCaseFileFixed && this.isCaseFilesLoading()) ||
      (!isCaseFileFixed && !this.caseFileOptions().length) ||
      !this.hasSelectedFile() ||
      !this.hasValidCaseFileSelection() ||
      this.uploadForm.invalid ||
      this.hasFileValidationError()
    );
  }

  isCaseFileSelectionHidden(): boolean {
    return !!this.fixedCaseFileId().trim();
  }

  private validateFile(file: File | null): string {
    if (!file) {
      return 'Selecciona un archivo para subir.';
    }

    if (file.size > MAX_FILE_SIZE) {
      return 'El archivo no puede ser mayor a 10 MB.';
    }

    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return 'Solo se permiten archivos PDF, JPG, JPEG o PNG.';
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return 'El tipo de archivo no esta permitido.';
    }

    return '';
  }

  private formatFileSize(sizeInBytes: number): string {
    if (sizeInBytes < 1024 * 1024) {
      return `${(sizeInBytes / 1024).toFixed(1)} KB`;
    }

    return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  private resetNativeFileInput(): void {
    const input = this.fileInput()?.nativeElement;

    if (input) {
      input.value = '';
    }
  }
}
