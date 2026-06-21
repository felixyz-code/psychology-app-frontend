import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { AuthStore } from '../../../core/auth/auth.store';

@Component({
  selector: 'app-patients-list-page',
  standalone: true,
  templateUrl: './patients-list.page.html',
  styleUrl: './patients-list.page.scss',
})
export class PatientsListPage {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly authStore = inject(AuthStore);

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
