import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';

import { AssessmentManagementCatalogPage } from './assessment-management-catalog.page';
import { InstrumentsHttpService } from '../../../../core/services/instruments-http.service';
import { Instrument, InstrumentVersionStatus } from '../../../../core/models/instrument.models';

describe('AssessmentManagementCatalogPage', () => {
  let component: AssessmentManagementCatalogPage;
  let fixture: ComponentFixture<AssessmentManagementCatalogPage>;
  let router: Router;

  const mockInstruments: Instrument[] = [
    {
      id: 'inst-1',
      code: 'PHQ-9',
      name: 'Cuestionario de Salud del Paciente (PHQ-9)',
      isSystem: true,
      isEnabled: true,
      createdAt: '2026-08-18T00:00:00Z',
      updatedAt: '2026-08-18T00:00:00Z',
      publishedVersion: {
        id: 'ver-1',
        instrumentId: 'inst-1',
        versionNumber: 1,
        status: InstrumentVersionStatus.PUBLISHED,
        createdAt: '2026-08-18T00:00:00Z',
      },
    },
    {
      id: 'inst-2',
      code: 'BAI-CUSTOM',
      name: 'Inventario de Ansiedad Custom',
      isSystem: false,
      isEnabled: false,
      createdAt: '2026-08-18T00:00:00Z',
      updatedAt: '2026-08-18T00:00:00Z',
      draftVersion: {
        id: 'ver-2',
        instrumentId: 'inst-2',
        versionNumber: 1,
        status: InstrumentVersionStatus.DRAFT,
        createdAt: '2026-08-18T00:00:00Z',
      },
    },
  ];

  const mockInstrumentsService = {
    getManagementCatalog: vi.fn().mockReturnValue(of(mockInstruments)),
    toggleVisibility: vi.fn().mockReturnValue(of({ isEnabled: false })),
    createVersion: vi.fn().mockReturnValue(of({ id: 'ver-new', versionNumber: 2 })),
    publishVersion: vi.fn().mockReturnValue(of({ id: 'ver-2', status: InstrumentVersionStatus.PUBLISHED })),
    deprecateVersion: vi.fn().mockReturnValue(of({ id: 'ver-1', status: InstrumentVersionStatus.DEPRECATED })),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssessmentManagementCatalogPage],
      providers: [
        provideRouter([]),
        { provide: InstrumentsHttpService, useValue: mockInstrumentsService },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockImplementation(async () => true);

    fixture = TestBed.createComponent(AssessmentManagementCatalogPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load management instruments on init', () => {
    expect(component).toBeTruthy();
    expect(component.instruments()).toHaveLength(2);
    expect(component.filteredInstruments()).toHaveLength(2);
  });

  it('should filter instruments by category chips', () => {
    component.setCategory('SYSTEM');
    expect(component.filteredInstruments()).toHaveLength(1);
    expect(component.filteredInstruments()[0].code).toBe('PHQ-9');

    component.setCategory('CUSTOM');
    expect(component.filteredInstruments()).toHaveLength(1);
    expect(component.filteredInstruments()[0].code).toBe('BAI-CUSTOM');

    component.setCategory('ENABLED');
    expect(component.filteredInstruments()).toHaveLength(1);

    component.setCategory('DISABLED');
    expect(component.filteredInstruments()).toHaveLength(1);
  });

  it('should filter instruments by search query', () => {
    component.searchControl.setValue('ansiedad');
    expect(component.filteredInstruments()).toHaveLength(1);
    expect(component.filteredInstruments()[0].code).toBe('BAI-CUSTOM');
  });

  it('should toggle instrument visibility via service', () => {
    const inst = mockInstruments[0];
    component.toggleVisibility(inst, { checked: false });

    expect(mockInstrumentsService.toggleVisibility).toHaveBeenCalledWith('inst-1', false);
  });

  it('should navigate to builder for new instrument', () => {
    component.createNewInstrument();
    expect(router.navigate).toHaveBeenCalledWith(['/management/assessments/new']);
  });
});
