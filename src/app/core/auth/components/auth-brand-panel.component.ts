import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-auth-brand-panel',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './auth-brand-panel.component.html',
  styleUrl: './auth-brand-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthBrandPanelComponent {
  readonly features = [
    {
      icon: 'description',
      title: 'Expediente Clínico NOM-004-SSA3',
      description:
        'Notas de evolución SOAP, historia clínica estructurada y consentimientos informados con trazabilidad normativa.',
    },
    {
      icon: 'videocam',
      title: 'Teleconsulta Cifrada E2E',
      description:
        'Salas virtuales seguras con tokens efímeros, sin descargas y listas para videoconsultas de alta fidelidad.',
    },
    {
      icon: 'psychology',
      title: 'Batería Psicométrica Integrada',
      description:
        'Aplicación remota de reactivos estandarizados, corrección baremada automática y reportes longitudinales.',
    },
  ];

  readonly badges = [
    { icon: 'lock', label: 'Cifrado AES-256 / TLS 1.3' },
    { icon: 'verified_user', label: 'NOM-004 / NOM-024' },
    { icon: 'shield', label: 'Multi-Tenant Aislado' },
    { icon: 'cloud_done', label: '99.9% Alta Disponibilidad' },
  ];
}
