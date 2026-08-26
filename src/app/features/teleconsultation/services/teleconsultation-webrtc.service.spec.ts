import { TestBed } from '@angular/core/testing';
import {
  TeleconsultationWebRtcService,
} from './teleconsultation-webrtc.service';

describe('TeleconsultationWebRtcService', () => {
  let service: TeleconsultationWebRtcService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [TeleconsultationWebRtcService],
    });
    service = TestBed.inject(TeleconsultationWebRtcService);
  });

  afterEach(() => {
    service.disconnect();
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('initializes with default IDLE connection state', () => {
    expect(service.connectionState()).toBe('IDLE');
    expect(service.isConnected()).toBe(false);
    expect(service.isConnecting()).toBe(false);
    expect(service.isReconnecting()).toBe(false);
    expect(service.isFailed()).toBe(false);
  });

  it('transitions to CONNECTING and then CONNECTED on initializeConnection', () => {
    service.initializeConnection();
    expect(service.connectionState()).toBe('CONNECTING');
    expect(service.isConnecting()).toBe(true);

    vi.advanceTimersByTime(400);

    expect(service.connectionState()).toBe('CONNECTED');
    expect(service.isConnected()).toBe(true);
    expect(service.isE2eEncrypted()).toBe(true);
  });

  it('performs exponential backoff reconnection when triggered', () => {
    service.initializeConnection();
    vi.advanceTimersByTime(400);
    expect(service.isConnected()).toBe(true);

    // Attempt 1: 1000ms delay
    service.triggerReconnect('Microcorte de red detectado');
    expect(service.connectionState()).toBe('RECONNECTING');
    expect(service.reconnectAttempt()).toBe(1);
    expect(service.nextRetryDelayMs()).toBe(1000);
    expect(service.failureReason()).toBe('Microcorte de red detectado');

    vi.advanceTimersByTime(1000);
    expect(service.connectionState()).toBe('CONNECTED');
    expect(service.reconnectAttempt()).toBe(0);

    // Attempt 2: 2000ms delay
    service.triggerReconnect();
    expect(service.nextRetryDelayMs()).toBe(1000);
    service.triggerReconnect();
    expect(service.nextRetryDelayMs()).toBe(2000);
    expect(service.reconnectAttempt()).toBe(2);

    vi.advanceTimersByTime(2000);
    expect(service.connectionState()).toBe('CONNECTED');
  });

  it('transitions to FAILED when maximum reconnection attempts are exceeded', () => {
    service.initializeConnection();
    vi.advanceTimersByTime(400);

    for (let i = 0; i < 4; i++) {
      service.triggerReconnect();
    }
    expect(service.reconnectAttempt()).toBe(4);

    // 5th attempt triggers FAILED
    service.triggerReconnect('Pérdida definitiva de conexión');
    expect(service.connectionState()).toBe('FAILED');
    expect(service.isFailed()).toBe(true);
    expect(service.failureReason()).toContain('Fallo de conexión tras 4 reintentos');
  });

  it('allows manual recovery from FAILED state', () => {
    service.initializeConnection();
    vi.advanceTimersByTime(400);

    for (let i = 0; i < 5; i++) {
      service.triggerReconnect();
    }
    expect(service.isFailed()).toBe(true);

    service.retryManualConnection();
    expect(service.connectionState()).toBe('CONNECTING');
    vi.advanceTimersByTime(400);
    expect(service.isConnected()).toBe(true);
  });

  it('computes network quality tiers correctly based on latency and packet loss', () => {
    service.initializeConnection();
    vi.advanceTimersByTime(400);

    // Excellent
    service.updateNetworkTelemetry(40, 3, 0.2);
    expect(service.networkQuality()).toBe('EXCELLENT');
    expect(service.networkQualityLabel()).toBe('Excelente');
    expect(service.networkQualityClass()).toBe('quality--excellent');

    // Good
    service.updateNetworkTelemetry(120, 10, 1.5);
    expect(service.networkQuality()).toBe('GOOD');
    expect(service.networkQualityLabel()).toBe('Buena');

    // Poor
    service.updateNetworkTelemetry(280, 25, 4.5);
    expect(service.networkQuality()).toBe('POOR');
    expect(service.networkQualityLabel()).toBe('Inestable');

    // Critical
    service.updateNetworkTelemetry(450, 60, 12);
    expect(service.networkQuality()).toBe('CRITICAL');
    expect(service.networkQualityLabel()).toBe('Crítica');
  });

  it('loads and selects audio/video devices correctly', async () => {
    await service.loadDevices();

    expect(service.audioDevices().length).toBeGreaterThan(0);
    expect(service.videoDevices().length).toBeGreaterThan(0);

    const testAudioId = service.audioDevices()[0].deviceId;
    service.selectAudioDevice(testAudioId);
    expect(service.selectedAudioDeviceId()).toBe(testAudioId);

    const testVideoId = service.videoDevices()[0].deviceId;
    service.selectVideoDevice(testVideoId);
    expect(service.selectedVideoDeviceId()).toBe(testVideoId);
  });
});
