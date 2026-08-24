import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { SandboxStateService, SandboxView } from '../../services/sandbox-state.service';

import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { I18nService } from '../../../../core/i18n/i18n.service';

export interface TourStep {
  stepNumber: number;
  view: SandboxView;
  title: string;
  badge: string;
  description: string;
  highlights: string[];
  ctaLabel?: string;
}

@Component({
  selector: 'app-demo-tour-guide',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatButtonModule, TranslatePipe],
  templateUrl: './demo-tour-guide.component.html',
  styleUrl: './demo-tour-guide.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemoTourGuideComponent {
  private readonly sandboxState = inject(SandboxStateService);
  readonly i18n = inject(I18nService);

  readonly tourCompleted = output<void>();

  readonly isMinimized = signal<boolean>(false);
  readonly currentStepIndex = signal<number>(0);

  readonly steps: TourStep[] = [
    {
      stepNumber: 1,
      view: 'dashboard',
      badge: 'Visión General 360°',
      title: 'Dashboard Clínico & Métricas en Tiempo Real',
      description:
        'Visualiza el pulso de tu consulta: indicadores de adherencia, pacientes activos, citas del día y alertas psicométricas en un solo panel ejecutivo.',
      highlights: [
        'Resumen de actividad diaria y accesos rápidos',
        'Semáforos de riesgo y alertas clínicas prioritarias',
        'Distribución diagnóstica bajo estándares CIE-10',
      ],
    },
    {
      stepNumber: 2,
      view: 'soap',
      badge: 'NOM-004-SSA3 Certificado',
      title: 'Expediente Clínico & Notas de Evolución SOAP',
      description:
        'Registra notas estructuradas con rigor clínico: Subjetivo, Objetivo, Análisis Diagnóstico y Plan Terapéutico con autoguardado e inmutabilidad legal.',
      highlights: [
        'Estructura SOAP estandarizada y firma digital',
        'Historial cronológico inmutable de intervenciones',
        'Cambio rápido de perfil de paciente para explorar casos',
      ],
    },
    {
      stepNumber: 3,
      view: 'psychometrics',
      badge: 'Baremos Automatizados',
      title: 'Batería Psicométrica Integrada',
      description:
        'Aplica instrumentos estandarizados (GAD-7, PHQ-9, MBI Maslach), genera enlaces efímeros para pacientes y visualiza reportes baremados al instante.',
      highlights: [
        'Cálculo automático de percentiles y niveles de severidad',
        'Detección inmediata de banderas rojas clínicas',
        'Seguimiento psicométrico longitudinal intersesión',
      ],
    },
    {
      stepNumber: 4,
      view: 'teleconsultation',
      badge: 'Zero-Download HD',
      title: 'Teleconsulta Cifrada E2E',
      description:
        'Conéctate mediante videoconsulta HD con tokens criptográficos de un solo uso. Tu paciente ingresa desde cualquier navegador sin descargar apps ni registrarse.',
      highlights: [
        'Cifrado de grado médico WebRTC punto a punto',
        'Panel simultáneo de notas clínicas durante la llamada',
        'Controles de cámara, micrófono y compartición de pantalla',
      ],
    },
    {
      stepNumber: 5,
      view: 'appointments',
      badge: 'Cero Ausentismo',
      title: 'Agenda Médica Inteligente & Conversión',
      description:
        'Gestiona citas presenciales y virtuales con sincronización de sucursales y recordatorios multicanal. ¡Estás listo para dar el paso a tu propia clínica!',
      highlights: [
        'Control fluido de modalidades de atención',
        'Trazabilidad de asistencia y cancelaciones',
        'Comienza tu prueba gratuita de 14 días con 1 clic',
      ],
    },
  ];

  readonly currentStep = computed(() => this.steps[this.currentStepIndex()]);
  readonly isFirstStep = computed(() => this.currentStepIndex() === 0);
  readonly isLastStep = computed(() => this.currentStepIndex() === this.steps.length - 1);
  readonly progressPercentage = computed(
    () => ((this.currentStepIndex() + 1) / this.steps.length) * 100,
  );

  nextStep(): void {
    if (this.isLastStep()) {
      this.finishTour();
      return;
    }
    const nextIdx = this.currentStepIndex() + 1;
    this.currentStepIndex.set(nextIdx);
    this.sandboxState.selectView(this.steps[nextIdx].view);
  }

  prevStep(): void {
    if (this.isFirstStep()) {
      return;
    }
    const prevIdx = this.currentStepIndex() - 1;
    this.currentStepIndex.set(prevIdx);
    this.sandboxState.selectView(this.steps[prevIdx].view);
  }

  goToStep(index: number): void {
    if (index >= 0 && index < this.steps.length) {
      this.currentStepIndex.set(index);
      this.sandboxState.selectView(this.steps[index].view);
    }
  }

  toggleMinimize(): void {
    this.isMinimized.update((v) => !v);
  }

  skipTour(): void {
    this.isMinimized.set(true);
    this.tourCompleted.emit();
  }

  finishTour(): void {
    this.isMinimized.set(true);
    this.tourCompleted.emit();
    this.sandboxState.simulateSave(
      'Tour Guiado Completado: Has explorado los 5 módulos principales de PsiqueOS.',
    );
  }

  restartTour(): void {
    this.isMinimized.set(false);
    this.currentStepIndex.set(0);
    this.sandboxState.selectView(this.steps[0].view);
  }
}
