import { Component, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatToolbarModule } from '@angular/material/toolbar';

import { AuthService } from '../auth/auth.service';
import { AuthStore } from '../auth/auth.store';
import { ThemeService } from '../theme/theme.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatMenuModule, MatSlideToggleModule, MatToolbarModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly themeService = inject(ThemeService);

  readonly authStore = inject(AuthStore);
  readonly isSidebarCollapsed = input(false);
  readonly isSidebarOpen = input(false);
  readonly menuToggle = output<void>();
  readonly isDarkTheme = this.themeService.isDarkTheme;

  getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      ADMIN: 'Administrador',
      PSYCHOLOGIST: 'Psicologo',
    };

    return labels[role] ?? role;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  toggleTheme(enabled?: boolean): void {
    this.themeService.toggleDarkTheme(enabled ?? !this.isDarkTheme());
  }
}
