import { Injectable, computed, signal } from '@angular/core';

export type SandboxView = 'dashboard' | 'soap' | 'psychometrics' | 'teleconsultation' | 'appointments';

export interface SandboxPatient {
  id: string;
  fullName: string;
  initials: string;
  age: number;
  gender: 'Femenino' | 'Masculino' | 'Otro';
  email: string;
  phone: string;
  diagnosisCode: string;
  diagnosisName: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'ACTIVE' | 'ARCHIVED';
  totalSessions: number;
  lastSessionDate: string;
  nextAppointmentDate?: string;
  assignedTherapist: string;
}

export interface SandboxSoapNote {
  id: string;
  patientId: string;
  sessionNumber: number;
  date: string;
  therapistName: string;
  isLocked: boolean;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  diagnosticCode: string;
  diagnosticDescription: string;
  alertFlag?: string;
}

export interface SandboxAssessmentItem {
  id: string;
  code: string;
  title: string;
  category: 'Ansiedad' | 'Depresión' | 'Burnout' | 'Personalidad';
  patientId: string;
  patientName: string;
  administeredAt: string;
  score: number;
  maxScore: number;
  severityLabel: string;
  severityColor: 'green' | 'amber' | 'red';
  percentile: number;
  summary: string;
  recommendations: string[];
}

export interface SandboxAppointment {
  id: string;
  patientId: string;
  patientName: string;
  dateTime: string;
  time: string;
  durationMinutes: number;
  modality: 'TELECONSULTATION' | 'IN_PERSON';
  status: 'CONFIRMED' | 'IN_PROGRESS' | 'PENDING' | 'COMPLETED';
  roomCode?: string;
  therapistName: string;
}

export interface SandboxNotification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  timestamp: number;
}

@Injectable({
  providedIn: 'root',
})
export class SandboxStateService {
  // Current active view
  readonly activeView = signal<SandboxView>('dashboard');

  // Selected patient
  readonly selectedPatientId = signal<string>('pat-001');

  // Notifications toast signal
  readonly activeNotification = signal<SandboxNotification | null>(null);

  // Clinic metadata
  readonly clinicInfo = signal({
    name: 'Clínica Psicológica Integral Mente Sana',
    therapist: 'Dr. Alejandro Garza',
    specialty: 'Psicología Clínica & Terapia Cognitivo-Conductual',
    license: 'Céd. Prof. 8492019-NOM-004',
    plan: 'Clínica Pro Enterprise (Sandbox)',
    branch: 'Sede Principal - CDMX',
  });

  // Mock Patients
  readonly patients = signal<SandboxPatient[]>([
    {
      id: 'pat-001',
      fullName: 'Camila Morales Soto',
      initials: 'CM',
      age: 28,
      gender: 'Femenino',
      email: 'camila.morales@ejemplo.com',
      phone: '+52 55 4912 3840',
      diagnosisCode: 'F41.1',
      diagnosisName: 'Trastorno de Ansiedad Generalizada',
      riskLevel: 'MEDIUM',
      status: 'ACTIVE',
      totalSessions: 6,
      lastSessionDate: '2026-08-20',
      nextAppointmentDate: '2026-08-27 16:00',
      assignedTherapist: 'Dr. Alejandro Garza',
    },
    {
      id: 'pat-002',
      fullName: 'Roberto Carlos Jiménez',
      initials: 'RJ',
      age: 36,
      gender: 'Masculino',
      email: 'roberto.jimenez@ejemplo.com',
      phone: '+52 55 8392 0182',
      diagnosisCode: 'F32.1',
      diagnosisName: 'Episodio Depresivo Moderado',
      riskLevel: 'MEDIUM',
      status: 'ACTIVE',
      totalSessions: 12,
      lastSessionDate: '2026-08-18',
      nextAppointmentDate: '2026-08-25 11:00',
      assignedTherapist: 'Dr. Alejandro Garza',
    },
    {
      id: 'pat-003',
      fullName: 'Elena Vega Morales',
      initials: 'EV',
      age: 42,
      gender: 'Femenino',
      email: 'elena.vega@ejemplo.com',
      phone: '+52 55 1920 3849',
      diagnosisCode: 'Z73.0',
      diagnosisName: 'Síndrome de Agotamiento Laboral (Burnout)',
      riskLevel: 'LOW',
      status: 'ACTIVE',
      totalSessions: 4,
      lastSessionDate: '2026-08-22',
      nextAppointmentDate: '2026-08-29 17:30',
      assignedTherapist: 'Dr. Alejandro Garza',
    },
    {
      id: 'pat-004',
      fullName: 'Sofía Hernández Cruz',
      initials: 'SH',
      age: 19,
      gender: 'Femenino',
      email: 'sofia.hdz@ejemplo.com',
      phone: '+52 55 9301 8274',
      diagnosisCode: 'F40.1',
      diagnosisName: 'Fobia Social y Regulación Afectiva',
      riskLevel: 'LOW',
      status: 'ACTIVE',
      totalSessions: 8,
      lastSessionDate: '2026-08-15',
      nextAppointmentDate: '2026-08-28 10:00',
      assignedTherapist: 'Dr. Alejandro Garza',
    },
  ]);

  // Mock SOAP Notes
  readonly soapNotes = signal<SandboxSoapNote[]>([
    {
      id: 'soap-001',
      patientId: 'pat-001',
      sessionNumber: 6,
      date: '2026-08-20',
      therapistName: 'Dr. Alejandro Garza',
      isLocked: true,
      subjective:
        'Paciente femenina de 28 años acude puntual a su 6ª sesión. Refiere disminución progresiva en episodios de hiperventilación matutina durante la última semana tras aplicar técnica de respiración diafragmática 4-7-8. Manifiesta inquietud anticipatoria relacionada con su próxima evaluación de desempeño laboral.',
      objective:
        'Presentación aseada y adecuada a la situación. Orientada en tiempo, espacio y persona. Discurso fluido, coherente, de velocidad moderada. Tono afectivo congruente con contenido ansioso leve. Puntuación GAD-7 de control aplicada hoy: 9 puntos (Leve, descendiendo de 14 puntos basal).',
      assessment:
        'F41.1 Trastorno de Ansiedad Generalizada en remisión parcial. Se evidencia excelente respuesta a la reestructuración cognitiva de pensamientos catastrofistas y adherencia al registro diario de distorsiones.',
      plan:
        '1. Consolidar el autoregistro de pensamientos automáticos en situaciones de presión laboral.\n2. Continuar desensibilización sistemática imaginaria.\n3. Próxima sesión programada para el 27 de agosto de 2026 a las 16:00 hrs.',
      diagnosticCode: 'F41.1',
      diagnosticDescription: 'Trastorno de Ansiedad Generalizada',
    },
    {
      id: 'soap-002',
      patientId: 'pat-001',
      sessionNumber: 5,
      date: '2026-08-13',
      therapistName: 'Dr. Alejandro Garza',
      isLocked: true,
      subjective:
        'Reporta sensación de opresión torácica ocasional ante cargas extraordinarias de trabajo. Cumplió con 4 de 7 registros de pensamientos automáticos.',
      objective:
        'Lenguaje congruente. Ligera inquietud motora en extremidades inferiores durante los primeros 10 minutos de la sesión.',
      assessment:
        'Ansiedad moderada con somatización secundaria.',
      plan:
        'Entrenamiento en relajación muscular progresiva de Jacobson y reestructuración de distorsión de sobregeneralización.',
      diagnosticCode: 'F41.1',
      diagnosticDescription: 'Trastorno de Ansiedad Generalizada',
    },
    {
      id: 'soap-003',
      patientId: 'pat-002',
      sessionNumber: 12,
      date: '2026-08-18',
      therapistName: 'Dr. Alejandro Garza',
      isLocked: true,
      subjective:
        'Paciente masculino de 36 años refiere mejoría en patrón de sueño (6.5 horas continuas). Ha retomado caminatas matutinas de 20 minutos 3 veces por semana.',
      objective:
        'Afecto modulado, contacto visual sostenido. Reactividad emocional preservada. Escala PHQ-9: 8 puntos (Leve, Item 9 de ideación = 0).',
      assessment:
        'F32.1 Episodio Depresivo Moderado con respuesta clínica favorable a la activación conductual.',
      plan:
        'Incrementar metas de activación conductual hacia interacción social con red de apoyo. Próxima cita el 25 de agosto a las 11:00 hrs.',
      diagnosticCode: 'F32.1',
      diagnosticDescription: 'Episodio Depresivo Moderado',
    },
  ]);

  // Mock Psychometric Assessments
  readonly assessments = signal<SandboxAssessmentItem[]>([
    {
      id: 'ass-001',
      code: 'GAD-7',
      title: 'Escala de Ansiedad Generalizada (GAD-7)',
      category: 'Ansiedad',
      patientId: 'pat-001',
      patientName: 'Camila Morales Soto',
      administeredAt: '2026-08-20',
      score: 9,
      maxScore: 21,
      severityLabel: 'Ansiedad Leve',
      severityColor: 'amber',
      percentile: 62,
      summary:
        'La puntuación actual de 9 refleja una reducción significativa respecto al corte inicial de 14 (Moderada-Severa), lo que evidencia evolución positiva bajo protocolo TCC.',
      recommendations: [
        'Mantener autoregistro conductual intersesiones',
        'Reforzar higiene de sueño y técnicas de desactivación fisiológica',
        'Reevaluar mediante GAD-7 en 4 semanas',
      ],
    },
    {
      id: 'ass-002',
      code: 'PHQ-9',
      title: 'Cuestionario de Salud del Paciente (PHQ-9)',
      category: 'Depresión',
      patientId: 'pat-002',
      patientName: 'Roberto Carlos Jiménez',
      administeredAt: '2026-08-18',
      score: 8,
      maxScore: 27,
      severityLabel: 'Sintomatología Depresiva Leve',
      severityColor: 'amber',
      percentile: 55,
      summary:
        'Puntuación total de 8 puntos. Reactividad afectiva normalizada. Item 9 (pensamientos de muerte o autolesión) en 0 absoluto.',
      recommendations: [
        'Continuar con programa de activación conductual',
        'Fomentar reforzadores positivos en actividades cotidianas',
      ],
    },
    {
      id: 'ass-003',
      code: 'MBI-HSS',
      title: 'Inventario de Burnout de Maslach (MBI)',
      category: 'Burnout',
      patientId: 'pat-003',
      patientName: 'Elena Vega Morales',
      administeredAt: '2026-08-22',
      score: 31,
      maxScore: 54,
      severityLabel: 'Agotamiento Emocional Moderado',
      severityColor: 'amber',
      percentile: 70,
      summary:
        'Subescala de Agotamiento Emocional: 31 pts (Moderado-Alto). Despersonalización: 7 pts (Bajo). Realización Personal: 38 pts (Preservada).',
      recommendations: [
        'Establecer límites horarios en comunicación laboral',
        'Pausas activas y micro-descansos programados',
      ],
    },
  ]);

  // Mock Appointments
  readonly appointments = signal<SandboxAppointment[]>([
    {
      id: 'apt-001',
      patientId: 'pat-001',
      patientName: 'Camila Morales Soto',
      dateTime: '2026-08-24 16:00',
      time: '16:00 - 16:50',
      durationMinutes: 50,
      modality: 'TELECONSULTATION',
      status: 'CONFIRMED',
      roomCode: 'psq-cm-9382',
      therapistName: 'Dr. Alejandro Garza',
    },
    {
      id: 'apt-002',
      patientId: 'pat-002',
      patientName: 'Roberto Carlos Jiménez',
      dateTime: '2026-08-25 11:00',
      time: '11:00 - 11:50',
      durationMinutes: 50,
      modality: 'IN_PERSON',
      status: 'CONFIRMED',
      therapistName: 'Dr. Alejandro Garza',
    },
    {
      id: 'apt-003',
      patientId: 'pat-003',
      patientName: 'Elena Vega Morales',
      dateTime: '2026-08-26 17:30',
      time: '17:30 - 18:20',
      durationMinutes: 50,
      modality: 'TELECONSULTATION',
      status: 'CONFIRMED',
      roomCode: 'psq-ev-1029',
      therapistName: 'Dr. Alejandro Garza',
    },
    {
      id: 'apt-004',
      patientId: 'pat-004',
      patientName: 'Sofía Hernández Cruz',
      dateTime: '2026-08-28 10:00',
      time: '10:00 - 10:50',
      durationMinutes: 50,
      modality: 'IN_PERSON',
      status: 'CONFIRMED',
      therapistName: 'Dr. Alejandro Garza',
    },
  ]);

  // Teleconsultation Virtual Room Mock State
  readonly teleconsultationState = signal({
    roomCode: 'psq-cm-9382',
    patientName: 'Camila Morales Soto',
    isConnected: true,
    isCameraOn: true,
    isMicOn: true,
    isScreenSharing: false,
    durationSeconds: 1420, // 23 min 40 sec
    connectionQuality: 'HD Cifrada E2E (1080p · 60fps)',
    encryptionStandard: 'AES-256 WebRTC Cifrado de Punto a Punto',
  });

  // Selected Patient Computed
  readonly selectedPatient = computed(() => {
    const id = this.selectedPatientId();
    return this.patients().find((p) => p.id === id) || this.patients()[0];
  });

  // Filtered SOAP Notes for selected patient
  readonly selectedPatientSoapNotes = computed(() => {
    const patientId = this.selectedPatientId();
    return this.soapNotes().filter((n) => n.patientId === patientId);
  });

  // Filtered Assessments for selected patient
  readonly selectedPatientAssessments = computed(() => {
    const patientId = this.selectedPatientId();
    return this.assessments().filter((a) => a.patientId === patientId);
  });

  // Metrics Computed
  readonly metrics = computed(() => {
    return {
      activePatientsCount: this.patients().length,
      monthlySessionsCount: 48,
      completedAssessmentsCount: this.assessments().length,
      adherenceRatePercentage: 96,
      upcomingAppointmentsToday: 1,
    };
  });

  // Actions
  selectView(view: SandboxView): void {
    this.activeView.set(view);
  }

  selectPatient(patientId: string): void {
    this.selectedPatientId.set(patientId);
  }

  simulateSave(actionDescription: string): void {
    this.triggerToast(
      `Acción simulada: "${actionDescription}". En tu cuenta real de PsiqueOS se guardará de forma inmutable y con trazabilidad NOM-004.`,
      'success',
    );
  }

  simulateDelete(itemDescription: string): void {
    this.triggerToast(
      `Acción simulada: Eliminación de "${itemDescription}". Los datos de prueba no fueron borrados para que continúes explorando.`,
      'info',
    );
  }

  simulateAssessmentSubmission(instrumentTitle: string, score: number, severity: string): void {
    this.triggerToast(
      `Evaluación "${instrumentTitle}" calculada con éxito (Puntaje: ${score} · ${severity}). Baremación instantánea ejecutada.`,
      'success',
    );
  }

  toggleTeleconsultationMic(): void {
    this.teleconsultationState.update((curr) => ({ ...curr, isMicOn: !curr.isMicOn }));
  }

  toggleTeleconsultationCamera(): void {
    this.teleconsultationState.update((curr) => ({ ...curr, isCameraOn: !curr.isCameraOn }));
  }

  toggleTeleconsultationScreenShare(): void {
    this.teleconsultationState.update((curr) => ({
      ...curr,
      isScreenSharing: !curr.isScreenSharing,
    }));
    this.triggerToast(
      'Compartir pantalla simulado en sala virtual cifrada de teleconsulta.',
      'info',
    );
  }

  resetDemoData(): void {
    this.selectedPatientId.set('pat-001');
    this.activeView.set('dashboard');
    this.triggerToast(
      'El Sandbox interactivo ha sido restablecido a su estado inicial de demostración.',
      'info',
    );
  }

  dismissNotification(): void {
    this.activeNotification.set(null);
  }

  private triggerToast(message: string, type: 'info' | 'success' | 'warning'): void {
    const notification: SandboxNotification = {
      id: `toast-${Date.now()}`,
      message,
      type,
      timestamp: Date.now(),
    };
    this.activeNotification.set(notification);

    // Auto-dismiss after 6.5 seconds
    setTimeout(() => {
      if (this.activeNotification()?.id === notification.id) {
        this.activeNotification.set(null);
      }
    }, 6500);
  }
}
