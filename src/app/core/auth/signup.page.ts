import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { TenantContextState } from '../tenant-context/tenant-context.models';
import { TenantContextStore } from '../tenant-context/tenant-context.store';
import { FreelancerBootstrapRequest } from './auth.models';
import { AuthService, BootstrapSessionConflictError } from './auth.service';
import { AuthStore } from './auth.store';
import { NgClass } from '@angular/common';
import { AuthBrandPanelComponent } from './components/auth-brand-panel.component';

const trimmedRequired: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  typeof control.value === 'string' && control.value.trim().length > 0
    ? null
    : { trimmedRequired: true };

const asciiOnly: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  typeof control.value !== 'string' || /^[\x00-\x7F]*$/.test(control.value)
    ? null
    : { asciiOnly: true };

const passwordsMatch: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  control.get('password')?.value === control.get('confirmPassword')?.value
    ? null
    : { passwordMismatch: true };

export function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

export function utf8MaxBytes(maxBytes: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (typeof control.value !== 'string' || utf8ByteLength(control.value) <= maxBytes) {
      return null;
    }

    return { utf8MaxBytes: { maxBytes, actualBytes: utf8ByteLength(control.value) } };
  };
}

@Component({
  selector: 'app-signup-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    NgClass,
    AuthBrandPanelComponent,
  ],
  templateUrl: './signup.page.html',
  styleUrl: './signup.page.scss',
})
export class SignupPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly authStore = inject(AuthStore);
  private readonly tenantContextStore = inject(TenantContextStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly loginRoute = '/login';
  readonly isSubmitting = signal(false);
  readonly isRecoveringContext = signal(false);
  readonly submissionLocked = signal(false);
  readonly accountCreated = signal(false);
  readonly canRetryContext = signal(false);
  readonly errorMessage = signal('');
  readonly hidePassword = signal(true);
  readonly hideConfirmPassword = signal(true);

  readonly signupForm = this.formBuilder.nonNullable.group(
    {
      name: ['', [trimmedRequired, Validators.maxLength(150)]],
      email: ['', [trimmedRequired, Validators.email, Validators.maxLength(255), asciiOnly]],
      organizationName: ['', [trimmedRequired, Validators.maxLength(255)]],
      password: ['', [Validators.required, Validators.minLength(12), utf8MaxBytes(72)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  readonly passwordValue = toSignal(this.signupForm.controls.password.valueChanges, {
    initialValue: '',
  });

  readonly hasMinLength = computed(() => (this.passwordValue()?.length ?? 0) >= 12);
  readonly hasUppercase = computed(() => /[A-Z]/.test(this.passwordValue() ?? ''));
  readonly hasLowercase = computed(() => /[a-z]/.test(this.passwordValue() ?? ''));
  readonly hasNumberOrSymbol = computed(() => /[0-9\W_]/.test(this.passwordValue() ?? ''));

  readonly passwordScore = computed(() => {
    let score = 0;
    if (this.hasMinLength()) score += 1;
    if (this.hasUppercase()) score += 1;
    if (this.hasLowercase()) score += 1;
    if (this.hasNumberOrSymbol()) score += 1;
    return score;
  });

  readonly passwordStrengthLabel = computed(() => {
    const val = this.passwordValue() ?? '';
    if (!val) return 'Sin ingresar';
    const score = this.passwordScore();
    if (score <= 1) return 'Débil';
    if (score === 2) return 'Regular';
    if (score === 3) return 'Buena';
    return 'Excelente';
  });

  readonly passwordStrengthClass = computed(() => {
    const val = this.passwordValue() ?? '';
    if (!val) return 'strength--none';
    const score = this.passwordScore();
    if (score <= 1) return 'strength--weak';
    if (score === 2) return 'strength--fair';
    if (score === 3) return 'strength--good';
    return 'strength--strong';
  });

  submit(): void {
    if (this.submissionLocked()) {
      return;
    }

    this.trimIdentityFields();

    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      return;
    }

    if (this.authStore.isAuthenticated()) {
      this.submissionLocked.set(true);
      this.errorMessage.set(
        'Ya existe una sesión activa en esta pestaña. Inicia sesión o continúa desde tu espacio de trabajo.',
      );
      return;
    }

    this.submissionLocked.set(true);
    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const { confirmPassword: _confirmPassword, ...request } = this.signupForm.getRawValue();

    this.authService
      .freelancerBootstrap(request satisfies FreelancerBootstrapRequest)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.accountCreated.set(true);
          this.canRetryContext.set(true);
          this.routeFromCanonicalState();
        },
        error: (error: unknown) => {
          this.isSubmitting.set(false);
          this.handleBootstrapError(error);
        },
      });
  }

  async retryContext(): Promise<void> {
    if (!this.accountCreated() || !this.canRetryContext() || this.isRecoveringContext()) {
      return;
    }

    this.isRecoveringContext.set(true);
    this.errorMessage.set('');

    try {
      await this.tenantContextStore.refreshContext();
      if (!this.destroyRef.destroyed) {
        this.routeFromCanonicalState();
      }
    } finally {
      if (!this.destroyRef.destroyed) {
        this.isRecoveringContext.set(false);
      }
    }
  }

  trimField(field: 'name' | 'email' | 'organizationName'): void {
    const control = this.signupForm.controls[field];
    control.setValue(control.value.trim());
  }

  togglePasswordVisibility(): void {
    this.hidePassword.update((value) => !value);
  }

  toggleConfirmPasswordVisibility(): void {
    this.hideConfirmPassword.update((value) => !value);
  }

  hasControlError(
    field: 'name' | 'email' | 'organizationName' | 'password' | 'confirmPassword',
    errorCode: string,
  ): boolean {
    const control = this.signupForm.controls[field];
    return control.touched && control.hasError(errorCode);
  }

  hasPasswordMismatch(): boolean {
    return (
      this.signupForm.controls.confirmPassword.touched &&
      this.signupForm.hasError('passwordMismatch')
    );
  }

  private trimIdentityFields(): void {
    this.trimField('name');
    this.trimField('email');
    this.trimField('organizationName');
  }

  private routeFromCanonicalState(): void {
    const state = this.tenantContextStore.state();

    if (state === 'ACTIVE_TENANT_READY') {
      void this.router.navigate(['/dashboard']);
      return;
    }

    if (state === 'AMBIGUOUS_SELECTION') {
      void this.router.navigate(['/organization-selection']);
      return;
    }

    this.errorMessage.set(contextRecoveryMessage(state));
  }

  private handleBootstrapError(error: unknown): void {
    if (error instanceof BootstrapSessionConflictError) {
      if (!error.mutationCommitted) {
        this.accountCreated.set(false);
        this.canRetryContext.set(false);
        this.errorMessage.set(
          'Ya existe una sesión activa en esta pestaña. Inicia sesión o continúa desde tu espacio de trabajo.',
        );
        return;
      }

      this.accountCreated.set(true);
      this.canRetryContext.set(false);
      this.errorMessage.set(
        'La cuenta fue creada, pero otra sesión inició mientras preparábamos tu espacio de trabajo. Cierra la sesión actual e inicia sesión con la nueva cuenta para continuar.',
      );
      return;
    }

    const status = error instanceof HttpErrorResponse ? error.status : 0;

    if (status === 400) {
      this.accountCreated.set(false);
      this.canRetryContext.set(false);
      this.submissionLocked.set(false);
      this.errorMessage.set('Revisa los datos ingresados e intenta nuevamente.');
      return;
    }

    if (status === 404) {
      this.accountCreated.set(false);
      this.canRetryContext.set(false);
      this.errorMessage.set('El registro no está disponible en este momento.');
      return;
    }

    if (status === 409) {
      this.accountCreated.set(false);
      this.canRetryContext.set(false);
      this.errorMessage.set(
        'No fue posible completar el registro. Si ya tienes una cuenta, intenta iniciar sesión.',
      );
      return;
    }

    if (status === 429) {
      this.accountCreated.set(false);
      this.canRetryContext.set(false);
      this.errorMessage.set('Se realizaron demasiados intentos. Intenta de nuevo más tarde.');
      return;
    }

    if (status === 0) {
      this.accountCreated.set(false);
      this.canRetryContext.set(false);
      this.errorMessage.set(
        'No pudimos confirmar si el registro terminó correctamente. Intenta iniciar sesión antes de volver a registrarte.',
      );
      return;
    }

    this.accountCreated.set(false);
    this.canRetryContext.set(false);
    this.errorMessage.set(
      'No fue posible completar el registro. Intenta iniciar sesión antes de volver a intentarlo.',
    );
  }
}

function contextRecoveryMessage(state: TenantContextState): string {
  if (state === 'NO_ACTIVE_TENANT') {
    return 'Tu cuenta fue creada, pero todavía no hay un espacio de trabajo activo disponible. Intenta continuar nuevamente o vuelve a iniciar sesión.';
  }

  if (state === 'FORBIDDEN') {
    return 'Tu cuenta fue creada, pero no pudimos verificar el acceso a tu espacio de trabajo. Vuelve a iniciar sesión para continuar.';
  }

  if (state === 'ADMIN_SUSPENDED_CONTEXT') {
    return 'Tu cuenta fue creada, pero el espacio de trabajo no está disponible para uso operativo. Vuelve a iniciar sesión para continuar.';
  }

  return 'Tu cuenta fue creada, pero no pudimos preparar tu espacio de trabajo. Intenta continuar nuevamente o vuelve a iniciar sesión.';
}
