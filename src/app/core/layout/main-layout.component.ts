import { Component, effect, signal } from '@angular/core';
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
  private scrollPosition = 0;

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

  constructor() {
    effect((onCleanup) => {
      const isMobileSidebarOpen = this.isSidebarOpen() && this.isMobileViewport();

      if (!isMobileSidebarOpen) {
        this.unlockBodyScroll();
        return;
      }

      this.lockBodyScroll();
      onCleanup(() => this.unlockBodyScroll());
    });
  }

  private isMobileViewport(): boolean {
    return globalThis.matchMedia?.('(max-width: 960px)').matches ?? false;
  }

  private lockBodyScroll(): void {
    const body = globalThis.document?.body;

    if (!body || body.dataset['sidebarScrollLocked'] === 'true') {
      return;
    }

    this.scrollPosition = globalThis.scrollY ?? 0;
    body.dataset['sidebarScrollLocked'] = 'true';
    body.style.position = 'fixed';
    body.style.top = `-${this.scrollPosition}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
  }

  private unlockBodyScroll(): void {
    const body = globalThis.document?.body;

    if (!body || body.dataset['sidebarScrollLocked'] !== 'true') {
      return;
    }

    body.style.position = '';
    body.style.top = '';
    body.style.left = '';
    body.style.right = '';
    body.style.width = '';
    body.style.overflow = '';
    delete body.dataset['sidebarScrollLocked'];
    globalThis.scrollTo({ top: this.scrollPosition, behavior: 'auto' });
  }
}
