import {
  Component,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule, MatChipInputEvent } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { AuthService } from '../../../core/auth/auth.service';
import { UserSessionItem } from '../../../core/auth/auth.models';
import { UserProfileStore } from '../../../core/user-profile/user-profile.store';
import {
  COMMON_TIMEZONES,
  REMINDER_OPTIONS,
  SUPPORTED_LOCALES,
  TIMEZONE_OPTIONS,
  TimezoneOption,
  UserDateFormat,
  UserTimeFormat,
} from '../../../core/user-profile/user-profile.models';
import { DigitalSignaturePadComponent } from '../components/digital-signature-pad/digital-signature-pad.component';

@Component({
  selector: 'app-user-profile-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatTooltipModule,
    MatTabsModule,
    MatSelectModule,
    MatSlideToggleModule,
    DigitalSignaturePadComponent,
  ],
  templateUrl: './user-profile.page.html',
  styleUrl: './user-profile.page.scss',
})
export class UserProfilePage implements OnInit {
  readonly store = inject(UserProfileStore);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly separatorKeysCodes = [ENTER, COMMA] as const;
  readonly specialties = signal<string[]>([]);
  readonly successMessage = signal<string | null>(null);
  readonly avatarError = signal<string | null>(null);
  readonly detectedTimeZone = signal<string | null>(null);

  readonly sessions = signal<UserSessionItem[]>([]);
  readonly isLoadingSessions = signal(false);
  readonly isRevokingSessions = signal(false);

  timezonesList: TimezoneOption[] = [...TIMEZONE_OPTIONS];
  readonly localesList = SUPPORTED_LOCALES;
  readonly reminderOptions = REMINDER_OPTIONS;

  readonly profileForm: FormGroup = this.fb.group({
    professionalName: ['', [Validators.required, Validators.maxLength(150)]],
    licenseNumber: ['', [Validators.maxLength(100)]],
    phone: ['', [Validators.maxLength(30)]],
    bio: ['', [Validators.maxLength(2000)]],
  });

  readonly localizationForm: FormGroup = this.fb.group({
    timeZone: ['America/Mexico_City', [Validators.required]],
    timeFormat: ['TWELVE_HOUR' as UserTimeFormat, [Validators.required]],
    dateFormat: ['DD_MM_YYYY' as UserDateFormat, [Validators.required]],
    locale: ['es-MX', [Validators.required]],
    weekStartsOn: [1, [Validators.required]],
  });

  readonly notificationsForm: FormGroup = this.fb.group({
    emailNotifications: [true],
    inAppNotifications: [true],
    appointmentReminders: [true],
    reminderAdvanceMinutes: [60, [Validators.required]],
    sessionDigest: [true],
  });

  readonly userInitials = computed(() => {
    const profile = this.store.profile();
    if (!profile?.professionalName) return 'U';
    return profile.professionalName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  });

  constructor() {
    effect(() => {
      const p = this.store.profile();
      if (p) {
        this.profileForm.patchValue({
          professionalName: p.professionalName || '',
          licenseNumber: p.licenseNumber || '',
          phone: p.phone || '',
          bio: p.bio || '',
        });
        this.specialties.set([...(p.specialties || [])]);
      }
    });

    effect(() => {
      const prefs = this.store.preferences();
      if (prefs) {
        if (prefs.timeZone && !this.timezonesList.some((tz) => tz.id === prefs.timeZone)) {
          this.timezonesList = [
            { id: prefs.timeZone, label: `${prefs.timeZone} (Personalizada)` },
            ...this.timezonesList,
          ];
        }
        this.localizationForm.patchValue({
          timeZone: prefs.timeZone || 'America/Mexico_City',
          timeFormat: prefs.timeFormat || 'TWELVE_HOUR',
          dateFormat: prefs.dateFormat || 'DD_MM_YYYY',
          locale: prefs.locale || 'es-MX',
          weekStartsOn: prefs.weekStartsOn ?? 1,
        });

        this.notificationsForm.patchValue({
          emailNotifications: prefs.emailNotifications ?? true,
          inAppNotifications: prefs.inAppNotifications ?? true,
          appointmentReminders: prefs.appointmentReminders ?? true,
          reminderAdvanceMinutes: prefs.reminderAdvanceMinutes ?? 60,
          sessionDigest: prefs.sessionDigest ?? true,
        });
      }
    });
  }

  ngOnInit(): void {
    this.store.loadProfile();
    this.loadSessions();
  }

  loadSessions(): void {
    this.isLoadingSessions.set(true);
    this.authService.listSessions().subscribe({
      next: (data) => {
        this.sessions.set(data);
        this.isLoadingSessions.set(false);
      },
      error: () => {
        this.isLoadingSessions.set(false);
      },
    });
  }

  revokeSession(sessionId: string): void {
    this.isRevokingSessions.set(true);
    this.authService.revokeSession(sessionId).subscribe({
      next: () => {
        this.isRevokingSessions.set(false);
        this.showSuccess('Sesión remota revocada exitosamente.');
        this.loadSessions();
      },
      error: () => {
        this.isRevokingSessions.set(false);
      },
    });
  }

  revokeOtherSessions(): void {
    this.isRevokingSessions.set(true);
    this.authService.revokeOtherSessions().subscribe({
      next: (res) => {
        this.isRevokingSessions.set(false);
        this.showSuccess(`Se han cerrado ${res.revokedCount} sesiones remotas.`);
        this.loadSessions();
      },
      error: () => {
        this.isRevokingSessions.set(false);
      },
    });
  }

  getDeviceIcon(deviceInfo?: string | null, userAgent?: string | null): string {
    const target = `${deviceInfo || ''} ${userAgent || ''}`.toLowerCase();
    if (target.includes('android') || target.includes('iphone') || target.includes('mobile')) {
      return 'phone_iphone';
    }
    if (target.includes('ipad') || target.includes('tablet')) {
      return 'tablet_mac';
    }
    if (target.includes('mac') || target.includes('laptop')) {
      return 'laptop_mac';
    }
    return 'desktop_windows';
  }

  detectBrowserTimeZone(): void {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) {
        if (!this.timezonesList.some((tz) => tz.id === detected)) {
          this.timezonesList = [
            { id: detected, label: `${detected} (Detectada)` },
            ...this.timezonesList,
          ];
        }
        this.localizationForm.patchValue({ timeZone: detected });
        this.detectedTimeZone.set(detected);
        this.showSuccess(`Zona horaria detectada: ${detected}`);
      }
    } catch {
      // Fallback silently if Intl is not available
    }
  }

  addSpecialty(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (value && !this.specialties().includes(value)) {
      this.specialties.update((current) => [...current, value]);
    }
    event.chipInput!.clear();
  }

  removeSpecialty(specialty: string): void {
    this.specialties.update((current) =>
      current.filter((s) => s !== specialty),
    );
  }

  addSuggestedSpecialty(name: string): void {
    if (!this.specialties().includes(name)) {
      this.specialties.update((current) => [...current, name]);
    }
  }

  onAvatarFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    if (file.size > 2 * 1024 * 1024) {
      this.avatarError.set('La imagen de perfil no debe superar 2 MiB.');
      input.value = '';
      return;
    }

    this.avatarError.set(null);
    this.store.uploadAvatar(file, () => {
      input.value = '';
      this.showSuccess('Foto de perfil actualizada correctamente.');
    });
  }

  removeAvatar(): void {
    this.store.removeAvatar(() => {
      this.showSuccess('Foto de perfil eliminada.');
    });
  }

  submitProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const formVal = this.profileForm.value;
    this.store.updateProfile(
      {
        professionalName: formVal.professionalName,
        licenseNumber: formVal.licenseNumber || null,
        phone: formVal.phone || null,
        specialties: this.specialties(),
        bio: formVal.bio || null,
      },
      () => {
        this.showSuccess('Datos de perfil profesional guardados exitosamente.');
      },
    );
  }

  submitLocalization(): void {
    if (this.localizationForm.invalid) {
      this.localizationForm.markAllAsTouched();
      return;
    }

    const formVal = this.localizationForm.value;
    this.store.updatePreferences(
      {
        timeZone: formVal.timeZone,
        timeFormat: formVal.timeFormat,
        dateFormat: formVal.dateFormat,
        locale: formVal.locale,
        weekStartsOn: Number(formVal.weekStartsOn),
      },
      () => {
        this.showSuccess(
          'Preferencias de localización y zona horaria guardadas con éxito.',
        );
      },
    );
  }

  submitNotifications(): void {
    if (this.notificationsForm.invalid) {
      this.notificationsForm.markAllAsTouched();
      return;
    }

    const formVal = this.notificationsForm.value;
    this.store.updatePreferences(
      {
        emailNotifications: formVal.emailNotifications,
        inAppNotifications: formVal.inAppNotifications,
        appointmentReminders: formVal.appointmentReminders,
        reminderAdvanceMinutes: Number(formVal.reminderAdvanceMinutes),
        sessionDigest: formVal.sessionDigest,
      },
      () => {
        this.showSuccess(
          'Preferencias de notificaciones y recordatorios actualizadas con éxito.',
        );
      },
    );
  }

  private showSuccess(msg: string): void {
    this.successMessage.set(msg);
    setTimeout(() => this.successMessage.set(null), 5000);
  }
}
