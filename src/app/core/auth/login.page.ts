import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from './auth.service';
import { LoginRequest } from './auth.models';

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
  ],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
})
export class LoginPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly hidePassword = signal(true);

  readonly loginForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

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
          this.router.navigate(['/patients']);
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
