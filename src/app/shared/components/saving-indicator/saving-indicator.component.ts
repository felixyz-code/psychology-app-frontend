import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export type SavingStatus = 'idle' | 'saving' | 'saved' | 'error';

@Component({
  selector: 'app-saving-indicator',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './saving-indicator.component.html',
  styleUrl: './saving-indicator.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SavingIndicatorComponent {
  readonly status = input<SavingStatus>('idle');
  readonly savingText = input<string>('Guardando cambios...');
  readonly savedText = input<string>('Guardado exitosamente');
  readonly errorText = input<string>('Error al guardar');
  readonly customClass = input<string>('');

  readonly isVisible = computed(() => this.status() !== 'idle');

  readonly currentText = computed(() => {
    switch (this.status()) {
      case 'saving':
        return this.savingText();
      case 'saved':
        return this.savedText();
      case 'error':
        return this.errorText();
      default:
        return '';
    }
  });

  readonly currentIcon = computed(() => {
    switch (this.status()) {
      case 'saving':
        return 'sync';
      case 'saved':
        return 'check_circle';
      case 'error':
        return 'error_outline';
      default:
        return '';
    }
  });
}
