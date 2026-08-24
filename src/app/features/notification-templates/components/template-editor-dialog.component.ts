import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  inject,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  CHANNEL_LABELS,
  EVENT_TYPE_LABELS,
  NotificationChannel,
  NotificationEventType,
  NotificationTemplate,
  TemplateVariableMetadata,
} from '../models/notification-template.models';
import { NotificationTemplatesService } from '../services/notification-templates.service';
import { TemplatePreviewCardComponent } from './template-preview-card.component';

export interface TemplateEditorDialogData {
  template?: NotificationTemplate;
  defaultChannel?: NotificationChannel;
  defaultEventType?: NotificationEventType;
}

@Component({
  selector: 'app-template-editor-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatChipsModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    TemplatePreviewCardComponent,
  ],
  templateUrl: './template-editor-dialog.component.html',
  styleUrl: './template-editor-dialog.component.scss',
})
export class TemplateEditorDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(NotificationTemplatesService);
  private readonly dialogRef = inject(MatDialogRef<TemplateEditorDialogComponent>);
  readonly data = inject<TemplateEditorDialogData>(MAT_DIALOG_DATA, { optional: true });

  @ViewChild('bodyTextarea') bodyTextarea?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('subjectInput') subjectInput?: ElementRef<HTMLInputElement>;

  readonly form: FormGroup;
  readonly isEditMode = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly variables = signal<TemplateVariableMetadata[]>([]);
  readonly activeField = signal<'subject' | 'body'>('body');

  readonly channelOptions: { value: NotificationChannel; label: string }[] = [
    { value: 'WHATSAPP', label: CHANNEL_LABELS.WHATSAPP },
    { value: 'EMAIL', label: CHANNEL_LABELS.EMAIL },
    { value: 'SMS', label: CHANNEL_LABELS.SMS },
  ];

  readonly eventTypeOptions: { value: NotificationEventType; label: string }[] = [
    { value: 'APPOINTMENT_CONFIRMATION', label: EVENT_TYPE_LABELS.APPOINTMENT_CONFIRMATION },
    { value: 'APPOINTMENT_REMINDER_24H', label: EVENT_TYPE_LABELS.APPOINTMENT_REMINDER_24H },
    { value: 'APPOINTMENT_REMINDER_2H', label: EVENT_TYPE_LABELS.APPOINTMENT_REMINDER_2H },
    { value: 'APPOINTMENT_RESCHEDULED', label: EVENT_TYPE_LABELS.APPOINTMENT_RESCHEDULED },
    { value: 'APPOINTMENT_CANCELLED', label: EVENT_TYPE_LABELS.APPOINTMENT_CANCELLED },
  ];

  constructor() {
    const tpl = this.data?.template;
    this.isEditMode.set(!!tpl);

    this.form = this.fb.group({
      channel: [
        { value: tpl?.channel || this.data?.defaultChannel || 'WHATSAPP', disabled: !!tpl },
        Validators.required,
      ],
      eventType: [
        { value: tpl?.eventType || this.data?.defaultEventType || 'APPOINTMENT_CONFIRMATION', disabled: !!tpl },
        Validators.required,
      ],
      name: [tpl?.name || '', [Validators.required, Validators.maxLength(150)]],
      subject: [tpl?.subject || '', [Validators.maxLength(255)]],
      body: [tpl?.body || '', [Validators.required]],
      isActive: [tpl?.isActive !== undefined ? tpl.isActive : true],
    });

    this.updateSubjectValidation(this.form.get('channel')?.value);
    this.form.get('channel')?.valueChanges.subscribe((ch) => this.updateSubjectValidation(ch));
  }

  ngOnInit(): void {
    this.loadVariables();
  }

  private updateSubjectValidation(channel: NotificationChannel) {
    const subjectCtrl = this.form.get('subject');
    if (channel === 'EMAIL') {
      subjectCtrl?.setValidators([Validators.required, Validators.maxLength(255)]);
    } else {
      subjectCtrl?.setValidators([Validators.maxLength(255)]);
    }
    subjectCtrl?.updateValueAndValidity();
  }

  private loadVariables() {
    this.service.getVariables().subscribe({
      next: (vars) => this.variables.set(vars),
      error: () => {
        // Fallback default variables
        this.variables.set([
          { key: 'patientName', label: 'Nombre del Paciente', description: 'Nombre completo del paciente', exampleValue: 'Ana Sofía Rodríguez', category: 'patient' },
          { key: 'therapistName', label: 'Nombre del Terapeuta', description: 'Profesional de atención', exampleValue: 'Dr. Carlos Mendoza', category: 'therapist' },
          { key: 'appointmentDate', label: 'Fecha de la Cita', description: 'Fecha programada', exampleValue: '25 de Agosto de 2026', category: 'appointment' },
          { key: 'appointmentTime', label: 'Hora de la Cita', description: 'Hora fijada', exampleValue: '10:00 AM', category: 'appointment' },
          { key: 'organizationName', label: 'Organización / Clínica', description: 'Nombre del centro', exampleValue: 'PsiqueOS Clínica Central', category: 'organization' },
          { key: 'locationOrLink', label: 'Lugar / Enlace', description: 'Consultorio o enlace de videoconsulta', exampleValue: 'Av. Las Palmas 340 / meet.psiqueos.com', category: 'appointment' },
          { key: 'rescheduleLink', label: 'Enlace para Reagendar', description: 'URL de autoservicio', exampleValue: 'https://citas.psiqueos.com/reagendar/xyz', category: 'general' },
          { key: 'cancellationReason', label: 'Motivo de Cancelación', description: 'Justificación médica u operativa', exampleValue: 'Fuerza mayor', category: 'general' },
        ]);
      },
    });
  }

  insertVariable(varKey: string) {
    const placeholder = `{{${varKey}}}`;
    const target = this.activeField();

    if (target === 'subject' && this.form.get('channel')?.value === 'EMAIL') {
      const current = this.form.get('subject')?.value || '';
      const input = this.subjectInput?.nativeElement;
      if (input && input.selectionStart !== null && input.selectionEnd !== null) {
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const updated = current.substring(0, start) + placeholder + current.substring(end);
        this.form.get('subject')?.setValue(updated);
        setTimeout(() => {
          input.focus();
          input.setSelectionRange(start + placeholder.length, start + placeholder.length);
        });
      } else {
        this.form.get('subject')?.setValue(`${current} ${placeholder}`);
      }
    } else {
      const current = this.form.get('body')?.value || '';
      const textarea = this.bodyTextarea?.nativeElement;
      if (textarea && textarea.selectionStart !== null && textarea.selectionEnd !== null) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const updated = current.substring(0, start) + placeholder + current.substring(end);
        this.form.get('body')?.setValue(updated);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
        });
      } else {
        this.form.get('body')?.setValue(current ? `${current} ${placeholder}` : placeholder);
      }
    }
  }

  onSave() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);

    const rawValues = this.form.getRawValue();

    if (this.isEditMode() && this.data?.template?.id) {
      this.service
        .update(this.data.template.id, {
          name: rawValues.name,
          subject: rawValues.channel === 'EMAIL' ? rawValues.subject : undefined,
          body: rawValues.body,
          isActive: rawValues.isActive,
        })
        .subscribe({
          next: (updated) => {
            this.isSaving.set(false);
            this.dialogRef.close(updated);
          },
          error: (err) => {
            this.isSaving.set(false);
            this.errorMessage.set(err?.error?.message || 'Error al actualizar la plantilla.');
          },
        });
    } else {
      this.service
        .create({
          channel: rawValues.channel,
          eventType: rawValues.eventType,
          name: rawValues.name,
          subject: rawValues.channel === 'EMAIL' ? rawValues.subject : undefined,
          body: rawValues.body,
          isActive: rawValues.isActive,
        })
        .subscribe({
          next: (created) => {
            this.isSaving.set(false);
            this.dialogRef.close(created);
          },
          error: (err) => {
            this.isSaving.set(false);
            this.errorMessage.set(
              err?.error?.message || 'Error al crear la plantilla. Verifique que no exista duplicado.',
            );
          },
        });
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}
