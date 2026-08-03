import { Component, effect, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import { AuthService } from '../auth/auth.service';
import { TenantContextStore } from './tenant-context.store';

@Component({
  selector: 'app-organization-selection-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './organization-selection.page.html',
  styleUrl: './organization-selection.page.scss',
})
export class OrganizationSelectionPage {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  readonly tenantContextStore = inject(TenantContextStore);

  readonly organizationControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');

  constructor() {
    effect(() => {
      const preferredOrganizationId = this.tenantContextStore.preferredOrganizationId();
      if (
        this.tenantContextStore.state() === 'AMBIGUOUS_SELECTION' &&
        preferredOrganizationId &&
        !this.organizationControl.value
      ) {
        this.organizationControl.setValue(preferredOrganizationId);
      }
    });
  }

  selectOrganization(): void {
    if (this.isSubmitting()) {
      return;
    }

    if (this.organizationControl.invalid) {
      this.organizationControl.markAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.tenantContextStore
      .selectOrganization(this.organizationControl.getRawValue())
      .then(() => {
        if (
          this.tenantContextStore.isActiveTenantReady() ||
          this.tenantContextStore.isAdminSuspendedContext()
        ) {
          void this.router.navigate(['/dashboard'], { replaceUrl: true });
          return;
        }

        this.errorMessage.set('No fue posible activar la organizacion seleccionada.');
      })
      .catch(() => {
        this.errorMessage.set('No fue posible activar la organizacion seleccionada.');
      })
      .finally(() => this.isSubmitting.set(false));
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}
