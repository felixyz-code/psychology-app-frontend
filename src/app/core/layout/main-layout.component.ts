import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { NavbarComponent } from './navbar.component';
import { SidebarComponent } from './sidebar.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, SidebarComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent {
  readonly isSidebarOpen = signal(false);
  readonly isSidebarCollapsed = signal(false);

  toggleSidebar(): void {
    if (this.isMobileViewport()) {
      this.isSidebarOpen.update((isOpen) => !isOpen);
      return;
    }

    this.isSidebarCollapsed.update((isCollapsed) => !isCollapsed);
  }

  closeSidebar(): void {
    this.isSidebarOpen.set(false);
  }

  private isMobileViewport(): boolean {
    return globalThis.matchMedia?.('(max-width: 960px)').matches ?? false;
  }
}
