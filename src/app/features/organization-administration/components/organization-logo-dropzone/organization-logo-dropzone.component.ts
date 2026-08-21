import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { OrganizationLogoStore } from '../../../../core/organization-logo/organization-logo.store';
import { PresentOrganizationLogoResponse } from '../../models/organization-logo.models';

const MAX_LOGO_BYTES = 2_097_152;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg'];

@Component({
  selector: 'app-organization-logo-dropzone',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './organization-logo-dropzone.component.html',
  styleUrl: './organization-logo-dropzone.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationLogoDropzoneComponent {
  readonly logoStore = inject(OrganizationLogoStore);
  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  readonly canManage = input<boolean>(true);
  readonly organizationName = input<string>('la organización');

  readonly removeRequested = output<void>();

  readonly isDragOver = signal<boolean>(false);
  readonly localPreviewUrl = signal<string | null>(null);
  readonly localFileError = signal<string>('');

  readonly presentLogo = computed(() => {
    const logo = this.logoStore.logo();
    return logo?.rowState === 'PRESENT' ? logo : null;
  });

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.canManage() || this.logoStore.mutationState() !== 'IDLE') return;
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
    if (!this.canManage() || this.logoStore.mutationState() !== 'IDLE') return;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  triggerFileInput(): void {
    if (!this.canManage() || this.logoStore.mutationState() !== 'IDLE') return;
    this.fileInput()?.nativeElement.click();
  }

  clearSelection(): void {
    this.localPreviewUrl.set(null);
    this.localFileError.set('');
    this.logoStore.selectFile(null);
    const input = this.fileInput()?.nativeElement;
    if (input) input.value = '';
  }

  upload(): void {
    if (!this.canManage() || this.logoStore.mutationState() !== 'IDLE') return;
    this.logoStore.uploadSelected();
    this.localPreviewUrl.set(null);
  }

  requestRemove(): void {
    this.removeRequested.emit();
  }

  logoTypeLabel(logo: PresentOrganizationLogoResponse): string {
    return logo.mimeType === 'image/png' ? 'PNG' : 'JPEG';
  }

  logoSizeLabel(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
  }

  private handleFile(file: File): void {
    this.localFileError.set('');
    this.localPreviewUrl.set(null);

    if (file.size > MAX_LOGO_BYTES) {
      this.localFileError.set('El archivo supera el máximo permitido de 2 MiB.');
      this.logoStore.selectFile(null);
      return;
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      this.localFileError.set('Formato no soportado. Selecciona un archivo PNG o JPEG.');
      this.logoStore.selectFile(null);
      return;
    }

    this.logoStore.selectFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      this.localPreviewUrl.set(reader.result as string);
    };
    reader.readAsDataURL(file);
  }
}
