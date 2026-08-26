import { Component, OnInit, inject, signal } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from './auth.service';
import { AuthStore } from './auth.store';
import { LoginRequest } from './auth.models';
import { TenantContextStore } from '../tenant-context/tenant-context.store';
import { AuthBrandPanelComponent } from './components/auth-brand-panel.component';
import { LanguageSwitcherComponent } from '../i18n/components/language-switcher.component';
import { TranslatePipe } from '../i18n/translate.pipe';
import { I18nService } from '../i18n/i18n.service';

@Component({
  selector: 'app-login-page',
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
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
})
export class LoginPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly authStore = inject(AuthStore);
  private readonly tenantContextStore = inject(TenantContextStore);
  private readonly router = inject(Router);
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);
  readonly i18n = inject(I18nService);

  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly hidePassword = signal(true);
  readonly signupRoute = '/signup';
  readonly forgotPasswordRoute = '/forgot-password';

  readonly loginForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.titleService.setTitle('Iniciar Sesión | PsiqueOS');
    this.metaService.updateTag({
      name: 'description',
      content:
        'Accede a tu consultorio clínico en PsiqueOS. Expediente electrónico, teleconsulta y gestión de pacientes con seguridad médica.',
    });
    this.metaService.updateTag({
      property: 'og:title',
      content: 'Iniciar Sesión | PsiqueOS',
    });
    this.metaService.updateTag({
      property: 'og:description',
      content:
        'Accede a tu consultorio clínico en PsiqueOS. Expediente electrónico, teleconsulta y gestión de pacientes con seguridad médica.',
    });
    this.metaService.updateTag({ property: 'og:type', content: 'website' });
  }

  submit(): void {
    if (this.isLoading()) {
      return;
    }

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const credentials: LoginRequest = this.loginForm.getRawValue();

    this.authService
      .login(credentials)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: () => {
          if (this.authStore.isSuperAdmin()) {
            void this.router.navigate(['/admin/tenants']);
            return;
          }
          void this.router.navigate([
            this.tenantContextStore.isActiveTenantReady() ||
            this.tenantContextStore.isAdminSuspendedContext()
              ? '/dashboard'
              : '/organization-selection',
          ]);
        },
        error: () => {
          this.errorMessage.set('Correo o contraseña incorrectos.');
        },
      });
  }

  togglePasswordVisibility(): void {
    this.hidePassword.update((value) => !value);
  }

  hasEmailError(errorCode: 'required' | 'email'): boolean {
    const control = this.loginForm.controls.email;
    return control.touched && control.hasError(errorCode);
  }

  hasPasswordError(errorCode: 'required'): boolean {
    const control = this.loginForm.controls.password;
    return control.touched && control.hasError(errorCode);
  }
}
