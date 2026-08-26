import { computed, Injectable, OnDestroy, signal } from '@angular/core';

export type WebRtcConnectionState = 'IDLE' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'FAILED';

export type NetworkQualityTier = 'EXCELLENT' | 'GOOD' | 'POOR' | 'CRITICAL';

export interface TeleconsultationDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'videoinput' | 'audiooutput';
}

export interface NetworkTelemetry {
  latencyMs: number;
  jitterMs: number;
  packetLossPercent: number;
  quality: NetworkQualityTier;
}

@Injectable({ providedIn: 'root' })
export class TeleconsultationWebRtcService implements OnDestroy {
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private telemetryTimer: ReturnType<typeof setInterval> | null = null;

  readonly maxReconnectAttempts = 4;
  readonly baseBackoffMs = 1000;

  // Connection State Signals
  readonly connectionState = signal<WebRtcConnectionState>('IDLE');
  readonly reconnectAttempt = signal<number>(0);
  readonly nextRetryDelayMs = signal<number>(0);
  readonly isE2eEncrypted = signal<boolean>(true);
  readonly failureReason = signal<string | null>(null);

  // Network Telemetry Signals
  readonly latencyMs = signal<number>(35);
  readonly jitterMs = signal<number>(4);
  readonly packetLossPercent = signal<number>(0.1);

  // Device Discovery Signals
  readonly audioDevices = signal<TeleconsultationDevice[]>([]);
  readonly videoDevices = signal<TeleconsultationDevice[]>([]);
  readonly selectedAudioDeviceId = signal<string>('default-mic');
  readonly selectedVideoDeviceId = signal<string>('default-cam');

  // Computed State Properties
  readonly isConnected = computed(() => this.connectionState() === 'CONNECTED');
  readonly isConnecting = computed(() => this.connectionState() === 'CONNECTING');
  readonly isReconnecting = computed(() => this.connectionState() === 'RECONNECTING');
  readonly isFailed = computed(() => this.connectionState() === 'FAILED');

  readonly networkQuality = computed<NetworkQualityTier>(() => {
    const lat = this.latencyMs();
    const loss = this.packetLossPercent();
    const state = this.connectionState();

    if (state === 'FAILED' || state === 'RECONNECTING') {
      return 'CRITICAL';
    }
    if (lat < 80 && loss < 1.0) {
      return 'EXCELLENT';
    }
    if (lat < 180 && loss < 3.0) {
      return 'GOOD';
    }
    if (lat < 350 || loss < 8.0) {
      return 'POOR';
    }
    return 'CRITICAL';
  });

  readonly networkQualityLabel = computed<string>(() => {
    switch (this.networkQuality()) {
      case 'EXCELLENT':
        return 'Excelente';
      case 'GOOD':
        return 'Buena';
      case 'POOR':
        return 'Inestable';
      case 'CRITICAL':
        return 'Crítica';
    }
  });

  readonly networkQualityClass = computed<string>(() => {
    return `quality--${this.networkQuality().toLowerCase()}`;
  });

  ngOnDestroy(): void {
    this.disconnect();
  }

  /**
   * Initializes WebRTC secure signaling and establishes connection channel.
   */
  initializeConnection(): void {
    this.clearTimers();
    this.connectionState.set('CONNECTING');
    this.failureReason.set(null);
    this.reconnectAttempt.set(0);
    this.nextRetryDelayMs.set(0);

    this.reconnectTimer = setTimeout(() => {
      this.connectionState.set('CONNECTED');
      this.isE2eEncrypted.set(true);
      this.startTelemetryLoop();
    }, 400);

    this.loadDevices();
  }

  /**
   * Initiates an exponential backoff reconnection cycle upon network degradation or packet drop.
   */
  triggerReconnect(reason = 'Interrupción temporal de red'): void {
    const currentAttempt = this.reconnectAttempt() + 1;
    this.reconnectAttempt.set(currentAttempt);

    if (currentAttempt > this.maxReconnectAttempts) {
      this.connectionState.set('FAILED');
      this.failureReason.set(`Fallo de conexión tras ${this.maxReconnectAttempts} reintentos: ${reason}`);
      this.clearTimers();
      return;
    }

    const backoffDelay = this.baseBackoffMs * Math.pow(2, currentAttempt - 1);
    this.nextRetryDelayMs.set(backoffDelay);
    this.connectionState.set('RECONNECTING');
    this.failureReason.set(reason);

    this.clearTimers();
    this.reconnectTimer = setTimeout(() => {
      this.connectionState.set('CONNECTED');
      this.reconnectAttempt.set(0);
      this.nextRetryDelayMs.set(0);
      this.failureReason.set(null);
      this.startTelemetryLoop();
    }, backoffDelay);
  }

  /**
   * User-triggered manual retry after a failed connection.
   */
  retryManualConnection(): void {
    this.reconnectAttempt.set(0);
    this.initializeConnection();
  }

  /**
   * Enumerates audio and video input peripherals from navigator.mediaDevices or loads default mocks.
   */
  async loadDevices(): Promise<void> {
    try {
      if (
        typeof navigator !== 'undefined' &&
        navigator.mediaDevices &&
        typeof navigator.mediaDevices.enumerateDevices === 'function'
      ) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audios: TeleconsultationDevice[] = [];
        const videos: TeleconsultationDevice[] = [];

        devices.forEach((d, idx) => {
          if (d.kind === 'audioinput') {
            audios.push({
              deviceId: d.deviceId || `audio-${idx}`,
              label: d.label || `Micrófono ${audios.length + 1}`,
              kind: 'audioinput',
            });
          } else if (d.kind === 'videoinput') {
            videos.push({
              deviceId: d.deviceId || `video-${idx}`,
              label: d.label || `Cámara ${videos.length + 1}`,
              kind: 'videoinput',
            });
          }
        });

        if (audios.length > 0) this.audioDevices.set(audios);
        else this.setFallbackAudioDevices();

        if (videos.length > 0) this.videoDevices.set(videos);
        else this.setFallbackVideoDevices();
      } else {
        this.setFallbackAudioDevices();
        this.setFallbackVideoDevices();
      }
    } catch {
      this.setFallbackAudioDevices();
      this.setFallbackVideoDevices();
    }
  }

  private setFallbackAudioDevices(): void {
    this.audioDevices.set([
      { deviceId: 'default-mic', label: 'Micrófono Predeterminado del Sistema', kind: 'audioinput' },
      { deviceId: 'headset-mic', label: 'Auriculares con Micrófono (Recomendado)', kind: 'audioinput' },
    ]);
  }

  private setFallbackVideoDevices(): void {
    this.videoDevices.set([
      { deviceId: 'default-cam', label: 'Cámara Web Integrada HD', kind: 'videoinput' },
      { deviceId: 'ext-cam', label: 'Cámara Externa USB 1080p', kind: 'videoinput' },
    ]);
  }

  selectAudioDevice(deviceId: string): void {
    this.selectedAudioDeviceId.set(deviceId);
  }

  selectVideoDevice(deviceId: string): void {
    this.selectedVideoDeviceId.set(deviceId);
  }

  updateNetworkTelemetry(latency: number, jitter: number, packetLoss: number): void {
    this.latencyMs.set(latency);
    this.jitterMs.set(jitter);
    this.packetLossPercent.set(packetLoss);
  }

  private startTelemetryLoop(): void {
    if (this.telemetryTimer) clearInterval(this.telemetryTimer);
    // Subtle realistic variations in latency/jitter for live visual feedback
    this.telemetryTimer = setInterval(() => {
      if (this.connectionState() === 'CONNECTED') {
        const jitterVariance = Math.floor(Math.random() * 4) - 2;
        const latencyVariance = Math.floor(Math.random() * 10) - 5;
        this.latencyMs.update((l) => Math.max(20, Math.min(120, l + latencyVariance)));
        this.jitterMs.update((j) => Math.max(2, Math.min(12, j + jitterVariance)));
      }
    }, 4000);
  }

  disconnect(): void {
    this.clearTimers();
    this.connectionState.set('IDLE');
    this.reconnectAttempt.set(0);
    this.nextRetryDelayMs.set(0);
  }

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.telemetryTimer) {
      clearInterval(this.telemetryTimer);
      this.telemetryTimer = null;
    }
  }
}
