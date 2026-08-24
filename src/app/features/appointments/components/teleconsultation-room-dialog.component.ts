import {
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';

import { AppointmentsService } from '../services/appointments.service';
import { TeleconsultationRoom, TeleconsultationRoomStatus } from '../models/appointment.models';

export interface TeleconsultationRoomDialogData {
  appointmentId: string;
  existingRoom?: TeleconsultationRoom;
}

@Component({
  selector: 'app-teleconsultation-room-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './teleconsultation-room-dialog.component.html',
  styleUrl: './teleconsultation-room-dialog.component.scss',
})
export class TeleconsultationRoomDialogComponent implements OnInit, OnDestroy {
  private readonly data = inject<TeleconsultationRoomDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<TeleconsultationRoomDialogComponent>);
  private readonly appointmentsService = inject(AppointmentsService);
  private readonly subscriptions = new Subscription();

  readonly room = signal<TeleconsultationRoom | null>(null);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly copiedField = signal<string | null>(null);

  readonly statusLabel = computed(() => {
    const status = this.room()?.status;
    if (!status) return '';
    const labels: Record<TeleconsultationRoomStatus, string> = {
      PENDING: 'Pendiente',
      ACTIVE: 'Activa',
      EXPIRED: 'Expirada',
      TERMINATED: 'Terminada',
    };
    return labels[status];
  });

  readonly statusClass = computed(() => {
    const status = this.room()?.status;
    if (!status) return '';
    const classes: Record<TeleconsultationRoomStatus, string> = {
      PENDING: 'status--pending',
      ACTIVE: 'status--active',
      EXPIRED: 'status--expired',
      TERMINATED: 'status--terminated',
    };
    return classes[status];
  });

  readonly canActivate = computed(() => {
    const status = this.room()?.status;
    return status === 'PENDING' || status === 'EXPIRED';
  });

  readonly canTerminate = computed(() => {
    const status = this.room()?.status;
    return status === 'PENDING' || status === 'ACTIVE';
  });

  readonly patientAccessUrl = computed(() => {
    const r = this.room();
    if (!r) return '';
    const base = window.location.origin;
    return `${base}/teleconsulta?room=${r.roomCode}&token=${r.patientToken}`;
  });

  readonly expiresAtDisplay = computed(() => {
    const r = this.room();
    if (!r) return '';
    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(r.expiresAt));
  });

  readonly appointmentId = this.data.appointmentId;

  ngOnInit(): void {
    if (this.data.existingRoom) {
      this.room.set(this.data.existingRoom);
    } else {
      this.loadOrCreateRoom();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private loadOrCreateRoom(): void {
    this.isLoading.set(true);
    this.error.set(null);

    const sub = this.appointmentsService.getTeleconsultationRoom(this.appointmentId).subscribe({
      next: (room) => {
        this.room.set(room);
        this.isLoading.set(false);
      },
      error: (err) => {
        if (err.status === 404) {
          this.createRoom();
        } else {
          this.error.set('Error al cargar la sala. Intenta de nuevo.');
          this.isLoading.set(false);
        }
      },
    });
    this.subscriptions.add(sub);
  }

  private createRoom(): void {
    const sub = this.appointmentsService.createTeleconsultationRoom(this.appointmentId).subscribe({
      next: (room) => {
        this.room.set(room);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Error al crear la sala de teleconsulta. Intenta de nuevo.');
        this.isLoading.set(false);
      },
    });
    this.subscriptions.add(sub);
  }

  activateRoom(): void {
    this.isLoading.set(true);
    this.error.set(null);
    const sub = this.appointmentsService
      .activateTeleconsultationRoom(this.appointmentId)
      .subscribe({
        next: (room) => {
          this.room.set(room);
          this.isLoading.set(false);
        },
        error: () => {
          this.error.set('Error al activar la sala. Intenta de nuevo.');
          this.isLoading.set(false);
        },
      });
    this.subscriptions.add(sub);
  }

  terminateRoom(): void {
    this.isLoading.set(true);
    this.error.set(null);
    const sub = this.appointmentsService
      .terminateTeleconsultationRoom(this.appointmentId)
      .subscribe({
        next: () => {
          const current = this.room();
          if (current) {
            this.room.set({ ...current, status: 'TERMINATED' });
          }
          this.isLoading.set(false);
        },
        error: () => {
          this.error.set('Error al terminar la sala. Intenta de nuevo.');
          this.isLoading.set(false);
        },
      });
    this.subscriptions.add(sub);
  }

  copyToClipboard(value: string, field: string): void {
    navigator.clipboard.writeText(value).then(() => {
      this.copiedField.set(field);
      setTimeout(() => this.copiedField.set(null), 2000);
    });
  }

  close(): void {
    this.dialogRef.close(this.room());
  }
}
