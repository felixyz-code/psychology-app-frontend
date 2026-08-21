import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UserProfileStore } from '../../../../core/user-profile/user-profile.store';

@Component({
  selector: 'app-digital-signature-pad',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './digital-signature-pad.component.html',
  styleUrl: './digital-signature-pad.component.scss',
})
export class DigitalSignaturePadComponent implements AfterViewInit {
  readonly store = inject(UserProfileStore);

  @ViewChild('signatureCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  readonly isDrawing = signal<boolean>(false);
  readonly hasCanvasStrokes = signal<boolean>(false);
  readonly uploadError = signal<string | null>(null);

  private ctx: CanvasRenderingContext2D | null = null;
  private lastX = 0;
  private lastY = 0;

  ngAfterViewInit(): void {
    this.initCanvas();
  }

  initCanvas(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    this.ctx = canvas.getContext('2d');
    if (!this.ctx) return;

    // Set high-DPI scaling
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = (rect.width || 480) * dpr;
    canvas.height = (rect.height || 200) * dpr;
    this.ctx.scale(dpr, dpr);

    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.lineWidth = 2.4;
    this.ctx.strokeStyle = '#1e293b';
  }

  onPointerDown(event: PointerEvent): void {
    if (!this.ctx || !this.canvasRef?.nativeElement) return;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.lastX = event.clientX - rect.left;
    this.lastY = event.clientY - rect.top;
    this.isDrawing.set(true);

    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.isDrawing() || !this.ctx || !this.canvasRef?.nativeElement) return;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const currentX = event.clientX - rect.left;
    const currentY = event.clientY - rect.top;

    const midX = (this.lastX + currentX) / 2;
    const midY = (this.lastY + currentY) / 2;

    this.ctx.quadraticCurveTo(this.lastX, this.lastY, midX, midY);
    this.ctx.stroke();

    this.lastX = currentX;
    this.lastY = currentY;
    this.hasCanvasStrokes.set(true);
  }

  onPointerUp(): void {
    this.isDrawing.set(false);
  }

  onPointerCancel(): void {
    this.isDrawing.set(false);
  }

  clearCanvas(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (canvas && this.ctx) {
      const dpr = window.devicePixelRatio || 1;
      this.ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    }
    this.hasCanvasStrokes.set(false);
    this.uploadError.set(null);
  }

  saveCanvasSignature(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas || !this.hasCanvasStrokes()) return;

    canvas.toBlob((blob) => {
      if (!blob) {
        this.uploadError.set('No se pudo generar la imagen de la firma.');
        return;
      }
      const file = new File([blob], 'signature.png', { type: 'image/png' });
      this.store.uploadSignature(file, () => {
        this.clearCanvas();
      });
    }, 'image/png');
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    if (file.size > 1024 * 1024) {
      this.uploadError.set('El archivo no debe exceder 1 MiB.');
      input.value = '';
      return;
    }

    this.uploadError.set(null);
    this.store.uploadSignature(file, () => {
      input.value = '';
    });
  }

  removeSignature(): void {
    this.store.removeSignature(() => {
      this.clearCanvas();
    });
  }
}
