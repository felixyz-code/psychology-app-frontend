import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ThemeService } from '../../../core/theme/theme.service';
import {
  SandboxStateService,
  SandboxView,
  SandboxPatient,
  SandboxSoapNote,
  SandboxAssessmentItem,
} from '../services/sandbox-state.service';
import { DemoTourGuideComponent } from '../components/demo-tour-guide/demo-tour-guide.component';
import { LanguageSwitcherComponent } from '../../../core/i18n/components/language-switcher.component';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-sandbox-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatTooltipModule,
    DemoTourGuideComponent,
    LanguageSwitcherComponent,
    TranslatePipe,
  ],
  templateUrl: './sandbox.page.html',
  styleUrl: './sandbox.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SandboxPageComponent {
  readonly sandboxState = inject(SandboxStateService);
  private readonly themeService = inject(ThemeService);
  readonly i18n = inject(I18nService);

  readonly isDarkTheme = this.themeService.isDarkTheme;

  // Active view alias
  readonly activeView = this.sandboxState.activeView;
  readonly selectedPatientId = this.sandboxState.selectedPatientId;
  readonly selectedPatient = this.sandboxState.selectedPatient;
  readonly patients = this.sandboxState.patients;
  readonly clinicInfo = this.sandboxState.clinicInfo;
  readonly metrics = this.sandboxState.metrics;
  readonly soapNotes = this.sandboxState.selectedPatientSoapNotes;
  readonly assessments = this.sandboxState.selectedPatientAssessments;
  readonly appointments = this.sandboxState.appointments;
  readonly teleconsultationState = this.sandboxState.teleconsultationState;
  readonly activeNotification = this.sandboxState.activeNotification;

  // Interactive Editable State for SOAP Draft Form
  readonly soapDraft = signal({
    subjective:
      'Paciente reporta mejoría en episodios de ansiedad diurna tras aplicar técnicas de respiración. Manifiesta deseo de continuar trabajando en autoafirmación.',
    objective:
      'Tranquila, buen contacto visual, lenguaje estructurado y fluido. Afecto eutímico con modulación adecuada.',
    assessment:
      'F41.1 Trastorno de Ansiedad Generalizada con respuesta terapéutica favorable a reestructuración cognitiva.',
    plan:
      '1. Registro de 3 situaciones desafiantes en la semana.\n2. Ejercicios de respiración diafragmática 10 min al despertar.\n3. Próxima cita de seguimiento.',
    diagnosticCode: 'F41.1',
    diagnosticDescription: 'Trastorno de Ansiedad Generalizada',
  });

  // Interactive Live Assessment Simulator state (GAD-7)
  readonly activeAssessmentCode = signal<'GAD-7' | 'PHQ-9' | 'MBI-HSS'>('GAD-7');
  readonly simulatedAnswers = signal<number[]>([1, 2, 1, 2, 1, 1, 1]); // default scores sum to 9

  readonly simulatedGad7Total = computed(() => {
    return this.simulatedAnswers().reduce((acc, curr) => acc + curr, 0);
  });

  readonly simulatedGad7Severity = computed(() => {
    const score = this.simulatedGad7Total();
    if (score <= 4) return { label: 'Ansiedad Mínima', color: 'green' };
    if (score <= 9) return { label: 'Ansiedad Leve', color: 'amber' };
    if (score <= 14) return { label: 'Ansiedad Moderada', color: 'amber' };
    return { label: 'Ansiedad Severa', color: 'red' };
  });

  // Teleconsultation in-call live notes draft
  readonly inCallNotesDraft = signal<string>(
    'Sesión en curso: Se aborda la reestructuración de distorsiones cognitivas de tipo catastrofismo laboral. Paciente receptiva y colaboradora.',
  );

  // Navigation Methods
  setView(view: SandboxView): void {
    this.sandboxState.selectView(view);
  }

  selectPatient(patientId: string): void {
    this.sandboxState.selectPatient(patientId);
  }

  onPatientSelectChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    if (target?.value) {
      this.sandboxState.selectPatient(target.value);
    }
  }

  toggleTheme(): void {
    this.themeService.toggleDarkTheme(!this.isDarkTheme());
  }

  // Simulation Handlers
  saveSoapNote(): void {
    this.sandboxState.simulateSave(
      `Nota SOAP de sesión guardada para ${this.selectedPatient().fullName}`,
    );
  }

  lockSoapNote(): void {
    this.sandboxState.simulateSave(
      `Firma digital y bloqueo inmutable NOM-004 aplicado a nota SOAP de ${this.selectedPatient().fullName}`,
    );
  }

  exportClinicalPdf(): void {
    this.sandboxState.simulateSave(
      `Generación de Expediente Clínico Oficial en PDF institucional para ${this.selectedPatient().fullName}`,
    );
  }

  deleteNote(noteId: string): void {
    this.sandboxState.simulateDelete(`Nota SOAP #${noteId}`);
  }

  submitAssessmentSimulation(): void {
    const score = this.simulatedGad7Total();
    const severity = this.simulatedGad7Severity().label;
    this.sandboxState.simulateAssessmentSubmission(
      'Escala de Ansiedad GAD-7',
      score,
      severity,
    );
  }

  updateSimulatedAnswer(index: number, score: number): void {
    this.simulatedAnswers.update((answers) => {
      const copy = [...answers];
      copy[index] = score;
      return copy;
    });
  }

  generateEphemeralPatientLink(): void {
    this.sandboxState.simulateSave(
      'Link efímero cifrado generado y enviado al WhatsApp/Correo del paciente para respuesta autónoma',
    );
  }

  saveInCallNotes(): void {
    this.sandboxState.simulateSave(
      'Notas clínicas en vivo sincronizadas con el expediente del paciente durante la teleconsulta',
    );
  }

  scheduleDemoAppointment(): void {
    this.sandboxState.simulateSave(
      'Cita médica programada con recordatorios automáticos por WhatsApp y Correo electrónico',
    );
  }

  resetAllData(): void {
    this.sandboxState.resetDemoData();
  }

  dismissToast(): void {
    this.sandboxState.dismissNotification();
  }
}
