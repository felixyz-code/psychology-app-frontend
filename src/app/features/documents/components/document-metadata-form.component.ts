import { CommonModule } from '@angular/common';
import { Component, effect, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SectionCardComponent } from '../../../shared/components/section-card/section-card.component';
import { Document, UpdateDocumentRequest } from '../models/document.models';

type DocumentMetadataFormMode = 'edit';
type DocumentFormLayout = 'page' | 'dialog';

@Component({
  selector: 'app-document-metadata-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    PageHeaderComponent,
    SectionCardComponent,
  ],
  templateUrl: './document-metadata-form.component.html',
  styleUrl: './document-metadata-form.component.scss',
})
export class DocumentMetadataFormComponent {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly hasPatchedInitialValue = signal(false);

  readonly layout = input<DocumentFormLayout>('page');
  readonly mode = input<DocumentMetadataFormMode>('edit');
  readonly initialValue = input<Document | null>(null);
  readonly isSaving = input(false);
  readonly errorMessage = input('');

  readonly formSubmitted = output<UpdateDocumentRequest>();
  readonly cancelled = output<void>();

  readonly metadataForm = this.formBuilder.group({
    fileName: ['', [Validators.required, Validators.maxLength(255)]],
  });

  constructor() {
    effect(() => {
      const document = this.initialValue();

      if (!document || this.hasPatchedInitialValue()) {
        return;
      }

      this.metadataForm.patchValue({
        fileName: document.fileName,
      });

      this.hasPatchedInitialValue.set(true);
    });
  }

  submit(): void {
    if (this.isSaving()) {
      return;
    }

    if (!this.hasRealChanges()) {
      return;
    }

    if (this.metadataForm.invalid) {
      this.metadataForm.markAllAsTouched();
      return;
    }

    const rawValue = this.metadataForm.getRawValue();
    const document = this.initialValue();
    const payload: UpdateDocumentRequest = {
      fileName: rawValue.fileName.trim(),
    };

    if (document?.filePath) {
      payload.filePath = document.filePath;
    }

    this.formSubmitted.emit(payload);
  }

  cancel(): void {
    this.cancelled.emit();
  }

  hasRequiredError(controlName: 'fileName'): boolean {
    const control = this.metadataForm.controls[controlName];
    return control.touched && control.hasError('required');
  }

  hasMaxLengthError(controlName: 'fileName'): boolean {
    const control = this.metadataForm.controls[controlName];
    return control.touched && control.hasError('maxlength');
  }

  getTitle(): string {
    return this.mode() === 'edit' ? 'Cambiar nombre' : 'Documento';
  }

  getSubtitle(): string {
    return 'Actualiza el nombre visible del documento.';
  }

  getCardTitle(): string {
    return 'Cambiar nombre';
  }

  getCardSubtitle(): string {
    return 'Actualiza el nombre visible del documento.';
  }

  getSubmitLabel(): string {
    return 'Guardar cambios';
  }

  getSavingLabel(): string {
    return 'Guardando cambios...';
  }

  isDialogLayout(): boolean {
    return this.layout() === 'dialog';
  }

  hasRealChanges(): boolean {
    const document = this.initialValue();
    const currentValue = this.metadataForm.controls.fileName.value.trim();
    const originalValue = document?.fileName.trim() ?? '';

    return currentValue !== originalValue;
  }

  isSubmitDisabled(): boolean {
    return this.metadataForm.invalid || this.isSaving() || !this.hasRealChanges();
  }
}
