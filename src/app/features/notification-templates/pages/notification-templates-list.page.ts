import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MetricCardComponent } from '../../../shared/components/metric-card/metric-card.component';
import { TemplateEditorDialogComponent } from '../components/template-editor-dialog.component';
import { TemplatePreviewCardComponent } from '../components/template-preview-card.component';
import {
  CHANNEL_ICONS,
  CHANNEL_LABELS,
  EVENT_TYPE_LABELS,
  NotificationChannel,
  NotificationEventType,
  NotificationTemplate,
} from '../models/notification-template.models';
import { NotificationTemplatesService } from '../services/notification-templates.service';

@Component({
  selector: 'app-notification-templates-list-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatChipsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatTableModule,
    MatTooltipModule,
    MetricCardComponent,
    TemplatePreviewCardComponent,
  ],
  templateUrl: './notification-templates-list.page.html',
  styleUrl: './notification-templates-list.page.scss',
})
export class NotificationTemplatesListPage implements OnInit {
  private readonly service = inject(NotificationTemplatesService);
  private readonly dialog = inject(MatDialog);

  readonly templates = signal<NotificationTemplate[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly isSeeding = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly selectedChannelFilter = signal<NotificationChannel | 'ALL'>('ALL');
  readonly selectedEventTypeFilter = signal<NotificationEventType | 'ALL'>('ALL');
  readonly searchQuery = signal<string>('');

  readonly selectedTemplateForPreview = signal<NotificationTemplate | null>(null);

  readonly displayedColumns: string[] = [
    'channel',
    'eventType',
    'name',
    'variables',
    'status',
    'actions',
  ];

  readonly channelOptions: { value: NotificationChannel | 'ALL'; label: string; icon: string }[] = [
    { value: 'ALL', label: 'Todos los Canales', icon: 'all_inclusive' },
    { value: 'WHATSAPP', label: CHANNEL_LABELS.WHATSAPP, icon: CHANNEL_ICONS.WHATSAPP },
    { value: 'EMAIL', label: CHANNEL_LABELS.EMAIL, icon: CHANNEL_ICONS.EMAIL },
    { value: 'SMS', label: CHANNEL_LABELS.SMS, icon: CHANNEL_ICONS.SMS },
  ];

  readonly eventTypeOptions: { value: NotificationEventType | 'ALL'; label: string }[] = [
    { value: 'ALL', label: 'Todos los Eventos' },
    { value: 'APPOINTMENT_CONFIRMATION', label: EVENT_TYPE_LABELS.APPOINTMENT_CONFIRMATION },
    { value: 'APPOINTMENT_REMINDER_24H', label: EVENT_TYPE_LABELS.APPOINTMENT_REMINDER_24H },
    { value: 'APPOINTMENT_REMINDER_2H', label: EVENT_TYPE_LABELS.APPOINTMENT_REMINDER_2H },
    { value: 'APPOINTMENT_RESCHEDULED', label: EVENT_TYPE_LABELS.APPOINTMENT_RESCHEDULED },
    { value: 'APPOINTMENT_CANCELLED', label: EVENT_TYPE_LABELS.APPOINTMENT_CANCELLED },
  ];

  // Computed metrics
  readonly totalTemplatesCount = computed(() => this.templates().length);
  readonly whatsappCount = computed(
    () => this.templates().filter((t) => t.channel === 'WHATSAPP').length,
  );
  readonly emailCount = computed(
    () => this.templates().filter((t) => t.channel === 'EMAIL').length,
  );
  readonly smsCount = computed(
    () => this.templates().filter((t) => t.channel === 'SMS').length,
  );

  // Filtered list
  readonly filteredTemplates = computed(() => {
    const channel = this.selectedChannelFilter();
    const eventType = this.selectedEventTypeFilter();
    const query = this.searchQuery().toLowerCase().trim();

    return this.templates().filter((t) => {
      const matchChannel = channel === 'ALL' || t.channel === channel;
      const matchEvent = eventType === 'ALL' || t.eventType === eventType;
      const matchQuery =
        !query ||
        t.name.toLowerCase().includes(query) ||
        (t.subject && t.subject.toLowerCase().includes(query)) ||
        t.body.toLowerCase().includes(query);

      return matchChannel && matchEvent && matchQuery;
    });
  });

  ngOnInit(): void {
    this.loadTemplates();
  }

  loadTemplates() {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.service.findAll().subscribe({
      next: (list) => {
        this.templates.set(list);
        this.isLoading.set(false);
        this.syncSelectedPreview();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message || 'Error al cargar las plantillas.');
      },
    });
  }

  onChannelChange(channel: NotificationChannel | 'ALL') {
    this.selectedChannelFilter.set(channel);
    this.syncSelectedPreview();
  }

  onEventTypeChange(eventType: NotificationEventType | 'ALL') {
    this.selectedEventTypeFilter.set(eventType);
    this.syncSelectedPreview();
  }

  onSearchQueryChange(query: string) {
    this.searchQuery.set(query);
    this.syncSelectedPreview();
  }

  private syncSelectedPreview() {
    const current = this.selectedTemplateForPreview();
    const filtered = this.filteredTemplates();
    if (!current || !filtered.some((t) => t.id === current.id)) {
      this.selectedTemplateForPreview.set(filtered[0] || null);
    }
  }

  openCreateDialog() {
    const dialogRef = this.dialog.open(TemplateEditorDialogComponent, {
      width: '94vw',
      maxWidth: '1100px',
      maxHeight: '90vh',
      disableClose: true,
      data: {
        defaultChannel: this.selectedChannelFilter() !== 'ALL' ? (this.selectedChannelFilter() as NotificationChannel) : 'WHATSAPP',
        defaultEventType: this.selectedEventTypeFilter() !== 'ALL' ? (this.selectedEventTypeFilter() as NotificationEventType) : 'APPOINTMENT_CONFIRMATION',
      },
    });

    dialogRef.afterClosed().subscribe((created) => {
      if (created) {
        this.loadTemplates();
        this.selectedTemplateForPreview.set(created);
      }
    });
  }

  openEditDialog(template: NotificationTemplate) {
    const dialogRef = this.dialog.open(TemplateEditorDialogComponent, {
      width: '94vw',
      maxWidth: '1100px',
      maxHeight: '90vh',
      disableClose: true,
      data: { template },
    });

    dialogRef.afterClosed().subscribe((updated) => {
      if (updated) {
        this.loadTemplates();
        this.selectedTemplateForPreview.set(updated);
      }
    });
  }

  seedDefaults() {
    this.isSeeding.set(true);
    this.service.seedDefaults().subscribe({
      next: () => {
        this.isSeeding.set(false);
        this.loadTemplates();
      },
      error: (err) => {
        this.isSeeding.set(false);
        this.errorMessage.set(err?.error?.message || 'Error al restaurar las plantillas sugeridas.');
      },
    });
  }

  toggleActive(template: NotificationTemplate, event: { checked: boolean }) {
    this.service
      .update(template.id, { isActive: event.checked })
      .subscribe({
        next: (updated) => {
          this.templates.update((list) =>
            list.map((t) => (t.id === updated.id ? updated : t)),
          );
        },
        error: () => {
          this.loadTemplates();
        },
      });
  }

  deleteTemplate(template: NotificationTemplate) {
    if (confirm(`¿Estás seguro de eliminar la plantilla "${template.name}"?`)) {
      this.service.delete(template.id).subscribe({
        next: () => {
          this.templates.update((list) => list.filter((t) => t.id !== template.id));
          if (this.selectedTemplateForPreview()?.id === template.id) {
            this.selectedTemplateForPreview.set(this.templates()[0] || null);
          }
        },
        error: (err) => {
          this.errorMessage.set(err?.error?.message || 'Error al eliminar la plantilla.');
        },
      });
    }
  }

  selectForPreview(template: NotificationTemplate) {
    this.selectedTemplateForPreview.set(template);
  }

  getChannelLabel(channel: NotificationChannel): string {
    return CHANNEL_LABELS[channel] || channel;
  }

  getChannelIcon(channel: NotificationChannel): string {
    return CHANNEL_ICONS[channel] || 'notifications';
  }

  getEventTypeLabel(type: NotificationEventType): string {
    return EVENT_TYPE_LABELS[type] || type;
  }
}
