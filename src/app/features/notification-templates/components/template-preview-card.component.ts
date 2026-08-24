import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import {
  CHANNEL_ICONS,
  CHANNEL_LABELS,
  EVENT_TYPE_LABELS,
  NotificationChannel,
  NotificationEventType,
} from '../models/notification-template.models';

@Component({
  selector: 'app-template-preview-card',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
  ],
  templateUrl: './template-preview-card.component.html',
  styleUrl: './template-preview-card.component.scss',
})
export class TemplatePreviewCardComponent {
  readonly channel = input<NotificationChannel>('WHATSAPP');
  readonly eventType = input<NotificationEventType>('APPOINTMENT_CONFIRMATION');
  readonly name = input<string>('Plantilla');
  readonly subject = input<string | null | undefined>('');
  readonly body = input<string>('');
  readonly context = input<Record<string, string>>({});
  readonly organizationName = input<string>('PsiqueOS Clínica Central');
  readonly showChannelSwitcher = input<boolean>(false);

  readonly selectedChannel = signal<NotificationChannel>('WHATSAPP');

  constructor() {
    // Synchronize initial signal with channel input
  }

  readonly currentChannel = computed(() => {
    return this.showChannelSwitcher() ? this.selectedChannel() : this.channel();
  });

  readonly eventTypeLabel = computed(() => {
    return EVENT_TYPE_LABELS[this.eventType()] || this.eventType();
  });

  readonly channelLabel = computed(() => {
    return CHANNEL_LABELS[this.currentChannel()] || this.currentChannel();
  });

  readonly channelIcon = computed(() => {
    return CHANNEL_ICONS[this.currentChannel()] || 'notifications';
  });

  readonly defaultSampleValues: Record<string, string> = {
    patientName: 'Ana Sofía Rodríguez',
    therapistName: 'Dr. Carlos Mendoza',
    appointmentDate: '25 de Agosto de 2026',
    appointmentTime: '10:00 AM',
    organizationName: 'PsiqueOS Clínica Central',
    branchName: 'Sede Providencia',
    locationOrLink: 'Av. Las Palmas 340, Consultorio 4B / https://meet.psiqueos.com/session-xyz',
    rescheduleLink: 'https://citas.psiqueos.com/reagendar/tok_89a3f4',
    cancellationReason: 'Reprogramación por fuerza mayor del profesional',
    organizationPhone: '+52 55 1234 5678',
    organizationEmail: 'contacto@psiqueos.com',
  };

  readonly renderedSubject = computed(() => {
    const raw = this.subject() || '';
    return this.interpolateString(raw);
  });

  readonly renderedBody = computed(() => {
    const raw = this.body() || '';
    return this.interpolateString(raw);
  });

  readonly renderedBodyFormatted = computed(() => {
    const text = this.renderedBody();
    if (this.currentChannel() === 'WHATSAPP') {
      return this.formatWhatsAppMarkdown(text);
    }
    return text.replace(/\n/g, '<br/>');
  });

  selectChannel(ch: NotificationChannel) {
    this.selectedChannel.set(ch);
  }

  private interpolateString(template: string): string {
    if (!template) return '';
    const sample = { ...this.defaultSampleValues, ...this.context() };
    return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
      const trimmed = key.trim();
      return sample[trimmed] !== undefined ? sample[trimmed] : `{{${trimmed}}}`;
    });
  }

  private formatWhatsAppMarkdown(text: string): string {
    if (!text) return '';
    let formatted = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // *bold* -> <strong>bold</strong>
    formatted = formatted.replace(/\*([^\*]+)\*/g, '<strong>$1</strong>');
    // _italic_ -> <em>italic</em>
    formatted = formatted.replace(/_([^_]+)_/g, '<em>$1</em>');
    // ~strikethrough~ -> <del>strikethrough</del>
    formatted = formatted.replace(/~([^~]+)~/g, '<del>$1</del>');
    // line breaks
    formatted = formatted.replace(/\n/g, '<br/>');

    return formatted;
  }
}
