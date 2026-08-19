import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import {
  ControlValueAccessor,
  FormsModule,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import {
  contrastRatio,
  isSafeOrganizationBrandColor,
} from '../../../../core/organization-configuration/organization-brand-color';

export interface ClinicalColorPreset {
  label: string;
  hex: string;
  description: string;
}

export const CLINICAL_COLOR_PALETTE: readonly ClinicalColorPreset[] = [
  { label: 'Azul Clínico', hex: '#2563EB', description: 'Tono azul médico profesional' },
  { label: 'Verde Azulado', hex: '#0D9488', description: 'Tono clínico calmante' },
  { label: 'Índigo Pizarra', hex: '#4F46E5', description: 'Tono sobrio institucional' },
  { label: 'Esmeralda', hex: '#059669', description: 'Tono salud y bienestar' },
  { label: 'Violeta', hex: '#7C3AED', description: 'Tono creativo y terapéutico' },
  { label: 'Coral Clínico', hex: '#E11D48', description: 'Tono cálido y distintivo' },
  { label: 'Azul Océano', hex: '#0284C7', description: 'Tono sereno y confiable' },
  { label: 'Pizarra Carbón', hex: '#334155', description: 'Tono neutro corporativo' },
] as const;

@Component({
  selector: 'app-organization-color-picker',
  standalone: true,
  imports: [
    FormsModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  templateUrl: './organization-color-picker.component.html',
  styleUrl: './organization-color-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => OrganizationColorPickerComponent),
      multi: true,
    },
  ],
})
export class OrganizationColorPickerComponent implements ControlValueAccessor {
  readonly label = input<string>('Color');
  readonly hint = input<string>('Selecciona un tono clínico o ingresa un código hexadecimal.');
  readonly defaultFallback = input<string>('#2563EB');
  readonly disabled = input<boolean>(false);

  readonly presets = CLINICAL_COLOR_PALETTE;
  readonly internalValue = signal<string | null>(null);
  readonly isDisabled = signal<boolean>(false);
  readonly touched = signal<boolean>(false);

  readonly effectiveColor = computed(() => {
    const val = this.internalValue();
    return val && /^#[0-9A-Fa-f]{6}$/.test(val) ? val : null;
  });

  readonly lightContrast = computed(() => {
    const color = this.effectiveColor();
    if (!color) return 0;
    return Math.round(contrastRatio(color, '#FFFFFF') * 10) / 10;
  });

  readonly darkContrast = computed(() => {
    const color = this.effectiveColor();
    if (!color) return 0;
    return Math.round(contrastRatio(color, '#121212') * 10) / 10;
  });

  readonly isWcagCompliant = computed(() => {
    const color = this.internalValue();
    return color === null || isSafeOrganizationBrandColor(color);
  });

  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.internalValue.set(value);
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  onHexInput(rawText: string): void {
    let clean = rawText.trim();
    if (clean.length > 0 && !clean.startsWith('#')) {
      clean = `#${clean}`;
    }
    const val = clean.length > 0 ? clean.toUpperCase() : null;
    this.updateValue(val);
  }

  onNativePickerChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.value) {
      this.updateValue(input.value.toUpperCase());
    }
  }

  selectPreset(hex: string): void {
    if (this.isDisabled() || this.disabled()) return;
    this.updateValue(hex.toUpperCase());
  }

  clearColor(): void {
    if (this.isDisabled() || this.disabled()) return;
    this.updateValue(null);
  }

  private updateValue(val: string | null): void {
    this.internalValue.set(val);
    this.markAsTouched();
    this.onChange(val);
  }

  private markAsTouched(): void {
    if (!this.touched()) {
      this.touched.set(true);
      this.onTouched();
    }
  }
}
