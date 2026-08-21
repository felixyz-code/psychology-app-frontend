import { CommonModule, DatePipe } from '@angular/common';
import {
  Component,
  ElementRef,
  inject,
  input,
  OnInit,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { DataTableEmptyStateComponent } from '../../../../shared/components/data-table-empty-state/data-table-empty-state.component';
import { SectionCardComponent } from '../../../../shared/components/section-card/section-card.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import {
  AttachmentCategory,
  CaseFileAttachment,
} from '../../models/case-file-attachment.models';
import { CaseFileAttachmentsService } from '../../services/case-file-attachments.service';
import { CaseFileAttachmentDeleteDialogComponent } from '../case-file-attachment-delete-dialog/case-file-attachment-delete-dialog.component';
import { CaseFileAttachmentPreviewDialogComponent } from '../case-file-attachment-preview-dialog/case-file-attachment-preview-dialog.component';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx'];

export interface CategoryOption {
  value: AttachmentCategory;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-case-file-attachments',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
    DataTableEmptyStateComponent,
    SectionCardComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './case-file-attachments.component.html',
  styleUrl: './case-file-attachments.component.scss',
})
export class CaseFileAttachmentsComponent implements OnInit {
  private readonly attachmentsService = inject(CaseFileAttachmentsService);
  private readonly dialog = inject(MatDialog);

  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  readonly caseFileId = input.required<string>();
  readonly title = input('Archivos adjuntos del expediente');
  readonly subtitle = input(
    'Gestiona estudios previos, reportes escolares, identificaciones y documentos complementarios vinculados al expediente.',
  );

  readonly attachmentChanged = output<void>();

  readonly attachments = signal<CaseFileAttachment[]>([]);
  readonly isLoading = signal(false);
  readonly isUploading = signal(false);
  readonly isDragging = signal(false);
  readonly errorMessage = signal('');
  readonly uploadSuccessMessage = signal('');
  readonly fileValidationError = signal('');

  readonly selectedFile = signal<File | null>(null);
  readonly selectedCategory = signal<AttachmentCategory>('OTRO');
  readonly notes = signal<string>('');

  readonly displayedColumns = ['category', 'fileName', 'size', 'createdAt', 'actions'];

  readonly categoryOptions: CategoryOption[] = [
    {
      value: 'ESTUDIO_PREVIO',
      label: 'Estudio previo / Gabinete',
      icon: 'science',
    },
    {
      value: 'REPORTE_ESCOLAR',
      label: 'Reporte escolar / Laboral',
      icon: 'school',
    },
    {
      value: 'IDENTIFICACION',
      label: 'Identificación / Legal',
      icon: 'badge',
    },
    {
      value: 'OTRO',
      label: 'Otro anexo clínico',
      icon: 'attach_file',
    },
  ];

  ngOnInit(): void {
    if (this.caseFileId()) {
      this.loadAttachments();
    }
  }

  loadAttachments(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.attachmentsService.getAttachments(this.caseFileId()).subscribe({
      next: (data) => {
        this.attachments.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar los archivos adjuntos del expediente.');
        this.isLoading.set(false);
      },
    });
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.handleFile(event.dataTransfer.files[0]);
    }
  }

  onFileChange(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    if (inputElement.files && inputElement.files.length > 0) {
      this.handleFile(inputElement.files[0]);
    }
  }

  triggerFileInput(): void {
    this.fileInput()?.nativeElement.click();
  }

  handleFile(file: File): void {
    this.fileValidationError.set('');
    this.uploadSuccessMessage.set('');

    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      this.fileValidationError.set(
        'Formato no permitido. Se aceptan archivos PDF, JPG, PNG, WEBP, DOC y DOCX.',
      );
      this.selectedFile.set(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      this.fileValidationError.set('El archivo excede el tamaño máximo permitido de 10 MB.');
      this.selectedFile.set(null);
      return;
    }

    this.selectedFile.set(file);
  }

  clearSelectedFile(): void {
    this.selectedFile.set(null);
    this.fileValidationError.set('');
    if (this.fileInput()?.nativeElement) {
      this.fileInput()!.nativeElement.value = '';
    }
  }

  uploadAttachment(): void {
    const file = this.selectedFile();
    if (!file) {
      this.fileValidationError.set('Selecciona un archivo para subir.');
      return;
    }

    this.isUploading.set(true);
    this.errorMessage.set('');
    this.fileValidationError.set('');

    this.attachmentsService
      .upload({
        caseFileId: this.caseFileId(),
        category: this.selectedCategory(),
        notes: this.notes().trim() || undefined,
        file,
      })
      .subscribe({
        next: (created) => {
          this.isUploading.set(false);
          this.uploadSuccessMessage.set(`Archivo "${created.originalName}" subido exitosamente.`);
          this.clearSelectedFile();
          this.notes.set('');
          this.selectedCategory.set('OTRO');
          this.loadAttachments();
          this.attachmentChanged.emit();
        },
        error: (err) => {
          this.isUploading.set(false);
          const errorMsg =
            err?.error?.message ||
            'Error al subir el archivo adjunto. Verifica el formato y peso del archivo.';
          this.fileValidationError.set(errorMsg);
        },
      });
  }

  download(attachment: CaseFileAttachment): void {
    this.attachmentsService
      .download(this.caseFileId(), attachment.id)
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = attachment.originalName;
          link.click();
          URL.revokeObjectURL(url);
        },
        error: () => {
          this.errorMessage.set('No se pudo descargar el archivo.');
        },
      });
  }

  preview(attachment: CaseFileAttachment): void {
    this.dialog.open(CaseFileAttachmentPreviewDialogComponent, {
      data: { attachment },
      width: '90vw',
      maxWidth: '950px',
      maxHeight: '90vh',
    });
  }

  openDeleteDialog(attachment: CaseFileAttachment): void {
    const dialogRef = this.dialog.open(CaseFileAttachmentDeleteDialogComponent, {
      data: { attachment },
      width: '480px',
    });

    dialogRef.afterClosed().subscribe((deleted) => {
      if (deleted) {
        this.loadAttachments();
        this.attachmentChanged.emit();
      }
    });
  }

  canPreview(attachment: CaseFileAttachment): boolean {
    const mime = attachment.mimeType.toLowerCase();
    return mime === 'application/pdf' || mime.startsWith('image/');
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  getCategoryLabel(category: AttachmentCategory): string {
    const match = this.categoryOptions.find((c) => c.value === category);
    return match ? match.label : 'Otro anexo';
  }

  getCategoryIcon(category: AttachmentCategory): string {
    const match = this.categoryOptions.find((c) => c.value === category);
    return match ? match.icon : 'attach_file';
  }

  getCategoryVariant(category: AttachmentCategory): 'primary' | 'success' | 'warning' | 'neutral' {
    switch (category) {
      case 'ESTUDIO_PREVIO':
        return 'primary';
      case 'REPORTE_ESCOLAR':
        return 'warning';
      case 'IDENTIFICACION':
        return 'success';
      default:
        return 'neutral';
    }
  }
}
