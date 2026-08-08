import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TenantContextStore } from '../tenant-context/tenant-context.store';
import { SidebarComponent } from './sidebar.component';

describe('SidebarComponent tenant lifecycle navigation', () => {
  let fixture: ComponentFixture<SidebarComponent>;
  let synchronizationPending: WritableSignal<boolean>;

  beforeEach(async () => {
    synchronizationPending = signal(false);

    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        provideRouter([]),
        {
          provide: TenantContextStore,
          useValue: {
            isActiveTenantReady: () => true,
            isCanonicalContextSynchronizationPending: synchronizationPending,
            hasCapability: (capability: string) => capability === 'organization.read',
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
});
