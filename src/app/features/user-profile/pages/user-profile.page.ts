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

import { UserProfileStore } from '../../../core/user-profile/user-profile.store';
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
    DigitalSignaturePadComponent,
  ],
  templateUrl: './user-profile.page.html',
  styleUrl: './user-profile.page.scss',
})
export class UserProfilePage implements OnInit {
  readonly store = inject(UserProfileStore);
  private readonly fb = inject(FormBuilder);

  readonly separatorKeysCodes = [ENTER, COMMA] as const;
  readonly specialties = signal<string[]>([]);
  readonly successMessage = signal<string | null>(null);
  readonly avatarError = signal<string | null>(null);

  readonly profileForm: FormGroup = this.fb.group({
    professionalName: ['', [Validators.required, Validators.maxLength(150)]],
    licenseNumber: ['', [Validators.maxLength(100)]],
    phone: ['', [Validators.maxLength(30)]],
    bio: ['', [Validators.maxLength(2000)]],
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
  }

  ngOnInit(): void {
    this.store.loadProfile();
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

  private showSuccess(msg: string): void {
    this.successMessage.set(msg);
    setTimeout(() => this.successMessage.set(null), 5000);
  }
}
