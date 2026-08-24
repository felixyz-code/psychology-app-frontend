import {
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';

import { AppointmentsService } from '../../appointments/services/appointments.service';
import { PublicTeleconsultationRoom } from '../../appointments/models/appointment.models';

@Component({
  selector: 'app-teleconsultation-room-view',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './teleconsultation-room-view.page.html',
  styleUrl: './teleconsultation-room-view.page.scss',
})
export class TeleconsultationRoomViewPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly appointmentsService = inject(AppointmentsService);
  private readonly subscriptions = new Subscription();

  readonly roomCode = signal<string>('');
  readonly token = signal<string>('');
  readonly room = signal<PublicTeleconsultationRoom | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  // Call Controls State
  readonly isMicOn = signal<boolean>(true);
  readonly isCameraOn = signal<boolean>(true);
  readonly isScreenSharing = signal<boolean>(false);
  readonly isCallActive = signal<boolean>(false);
  readonly callEnded = signal<boolean>(false);

  readonly statusLabel = computed(() => {
    const status = this.room()?.status;
    if (!status) return '';
    switch (status) {
      case 'PENDING':
        return 'Esperando al profesional';
      case 'ACTIVE':
        return 'Sesión en Vivo';
      case 'EXPIRED':
        return 'Sesión Expirada';
      case 'TERMINATED':
        return 'Sesión Finalizada';
      default:
        return status;
    }
  });

  readonly statusClass = computed(() => {
    const status = this.room()?.status;
    if (!status) return '';
    return `status--${status.toLowerCase()}`;
  });

  readonly isRoomActive = computed(() => this.room()?.status === 'ACTIVE');
  readonly isRoomPending = computed(() => this.room()?.status === 'PENDING');
  readonly isRoomExpired = computed(() => this.room()?.status === 'EXPIRED');
  readonly isRoomTerminated = computed(() => this.room()?.status === 'TERMINATED');

  readonly scheduledDateDisplay = computed(() => {
    const r = this.room();
    if (!r?.scheduledAt) return '';
    return new Intl.DateTimeFormat('es-MX', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(r.scheduledAt));
  });

  readonly expiresAtDisplay = computed(() => {
    const r = this.room();
    if (!r?.expiresAt) return '';
    return new Intl.DateTimeFormat('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(r.expiresAt));
  });

  ngOnInit(): void {
    const paramCode = this.route.snapshot.paramMap.get('roomCode') || '';
    const queryCode = this.route.snapshot.queryParamMap.get('room') || '';
    const tokenVal = this.route.snapshot.queryParamMap.get('token') || '';

    const effectiveCode = paramCode || queryCode;

    this.roomCode.set(effectiveCode);
    this.token.set(tokenVal);

    if (!effectiveCode || !tokenVal) {
      this.error.set(
        'Enlace de acceso incompleto. Asegúrate de ingresar con el enlace proporcionado para tu cita.',
      );
      this.isLoading.set(false);
      return;
    }

    this.loadRoom();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadRoom(): void {
    this.isLoading.set(true);
    this.error.set(null);

    const sub = this.appointmentsService
      .getPublicTeleconsultationRoom(this.roomCode(), this.token())
      .subscribe({
        next: (data) => {
          this.room.set(data);
          this.isLoading.set(false);
          if (data.status === 'ACTIVE') {
            this.isCallActive.set(true);
          }
        },
        error: (err) => {
          this.isLoading.set(false);
          if (err.status === 404) {
            this.error.set('No se encontró ninguna sala con este código.');
          } else if (err.status === 401 || err.status === 403) {
            this.error.set('El token de acceso es inválido o ha expirado.');
          } else {
            this.error.set(
              'No fue posible conectar con el servidor de teleconsulta. Intenta nuevamente.',
            );
          }
        },
      });

    this.subscriptions.add(sub);
  }

  toggleMic(): void {
    this.isMicOn.update((v) => !v);
  }

  toggleCamera(): void {
    this.isCameraOn.update((v) => !v);
  }

  toggleScreenShare(): void {
    this.isScreenSharing.update((v) => !v);
  }

  endCall(): void {
    this.isCallActive.set(false);
    this.callEnded.set(true);
  }

  rejoinCall(): void {
    this.callEnded.set(false);
    this.loadRoom();
  }
}
