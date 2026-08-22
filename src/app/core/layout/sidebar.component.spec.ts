import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TenantContextStore } from '../tenant-context/tenant-context.store';
import { SidebarComponent } from './sidebar.component';

describe('SidebarComponent tenant lifecycle navigation', () => {
  let fixture: ComponentFixture<SidebarComponent>;
  let synchronizationPending: WritableSignal<boolean>;
  let activeTenantReady: WritableSignal<boolean>;
  let capabilities: WritableSignal<string[]>;

  beforeEach(async () => {
    synchronizationPending = signal(false);
    activeTenantReady = signal(true);
    capabilities = signal([
      'finance.read',
      'organization.read',
      'membership.read',
      'invitation.read',
    ]);

    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        provideRouter([]),
        {
          provide: TenantContextStore,
          useValue: {
            isActiveTenantReady: activeTenantReady,
            isCanonicalContextSynchronizationPending: synchronizationPending,
            hasCapability: (capability: string) => capabilities().includes(capability),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('removes operational links but preserves organization administration while reconciling', async () => {
    expect(fixture.nativeElement.textContent).toContain('Dashboard');
    expect(fixture.nativeElement.textContent).toContain('Organización');

    synchronizationPending.set(true);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).not.toContain('Dashboard');
    expect(fixture.nativeElement.textContent).not.toContain('Pacientes');
    expect(fixture.nativeElement.textContent).toContain('Organización');
  });

  it('shows membership administration when membership.read is projected', () => {
    expect(fixture.nativeElement.textContent).toContain('Miembros');
  });

  it('shows invitation administration only for an active tenant with invitation.read', async () => {
    expect(fixture.nativeElement.textContent).toContain('Invitaciones');

    capabilities.set(['organization.read', 'membership.read']);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).not.toContain('Invitaciones');

    capabilities.set(['organization.read', 'membership.read', 'invitation.read']);
    activeTenantReady.set(false);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).not.toContain('Invitaciones');
  });

  it('reacts to the current tenant finance.read capability', async () => {
    expect(fixture.nativeElement.textContent).toContain('Finanzas');

    capabilities.update((current) => current.filter((capability) => capability !== 'finance.read'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Finanzas');

    capabilities.update((current) => [...current, 'finance.read']);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Finanzas');
  });

  it('renders Plantillas link when notification_template.read is granted', async () => {
    capabilities.update((current) => [...current, 'notification_template.read']);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Plantillas');
  });
});
