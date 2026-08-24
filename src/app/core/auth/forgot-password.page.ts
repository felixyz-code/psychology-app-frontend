import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from './auth.service';
import { AuthBrandPanelComponent } from './components/auth-brand-panel.component';
import { LanguageSwitcherComponent } from '../i18n/components/language-switcher.component';
import { TranslatePipe } from '../i18n/translate.pipe';
import { I18nService } from '../i18n/i18n.service';

@Component({
  selector: 'app-forgot-password-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    RouterLink,
    AuthBrandPanelComponent,
    LanguageSwitcherComponent,
    TranslatePipe,
  ],
  templateUrl: './forgot-password.page.html',
  styleUrl: './forgot-password.page.scss',
})
export class ForgotPasswordPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  readonly i18n = inject(I18nService);

  readonly isLoading = signal(false);
  readonly isSubmitted = signal(false);
  readonly errorMessage = signal('');
  readonly submittedEmail = signal('');
  readonly loginRoute = '/login';

  readonly forgotPasswordForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  submit(): void {
    if (this.isLoading()) {
      return;
    }

    if (this.forgotPasswordForm.invalid) {
      this.forgotPasswordForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const email = this.forgotPasswordForm.controls.email.value.trim();

    this.authService
      .forgotPassword(email)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: () => {
          this.submittedEmail.set(email);
          this.isSubmitted.set(true);
        },
        error: () => {
          this.errorMessage.set(
            'No fue posible procesar la solicitud en este momento. Intenta nuevamente más tarde.',
          );
        },
      });
  }

  reset(): void {
    this.isSubmitted.set(false);
    this.errorMessage.set('');
    this.forgotPasswordForm.reset();
  }

  hasEmailError(errorCode: 'required' | 'email'): boolean {
    const control = this.forgotPasswordForm.controls.email;
    return control.touched && control.hasError(errorCode);
  }
}
