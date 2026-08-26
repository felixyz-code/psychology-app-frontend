import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PlatformMetricsResponse } from '../models/superadmin.models';
import { SuperadminTenantsService } from '../services/superadmin-tenants.service';

@Component({
  selector: 'app-platform-metrics-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './platform-metrics.page.html',
  styleUrl: './platform-metrics.page.scss',
})
export class PlatformMetricsPage implements OnInit {
  private readonly superadminService = inject(SuperadminTenantsService);

  readonly metrics = signal<PlatformMetricsResponse | null>(null);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    this.loadMetrics();
  }

  loadMetrics(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.superadminService.getPlatformMetrics().subscribe({
      next: (data) => {
        this.metrics.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(
          'Error al cargar la telemetría de plataforma: ' + (err?.error?.message || 'Error de conexión'),
        );
        this.isLoading.set(false);
      },
    });
  }

  formatUptime(seconds: number): string {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const parts: string[] = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0 || d > 0) parts.push(`${h}h`);
    if (m > 0 || h > 0 || d > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);

    return parts.join(' ');
  }
}
