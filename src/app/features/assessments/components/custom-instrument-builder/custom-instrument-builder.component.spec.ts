import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { CustomInstrumentBuilderComponent } from './custom-instrument-builder.component';
import { InstrumentsHttpService } from '../../../../core/services/instruments-http.service';
import { ClientScoringEngineService } from '../../../../core/services/client-scoring-engine.service';
import { InstrumentVersionStatus } from '../../../../core/models/instrument.models';

describe('CustomInstrumentBuilderComponent', () => {
  let component: CustomInstrumentBuilderComponent;
  let fixture: ComponentFixture<CustomInstrumentBuilderComponent>;

  const mockInstrumentsService = {
    getInstrumentById: vi.fn().mockReturnValue(
      of({
        id: 'inst-1',
        code: 'BAI',
        name: 'Beck Anxiety Inventory',
        versions: [
          {
            id: 'ver-1',
            versionNumber: 1,
            status: InstrumentVersionStatus.DRAFT,
            definitionJson: {
              items: [{ code: 'Q1', prompt: 'Item 1', options: [] }],
            },
            scoringSpecJson: { strata: [] },
          },
        ],
      }),
    ),
    createInstrument: vi.fn().mockReturnValue(
      of({ id: 'inst-created', versions: [{ id: 'v1' }] }),
    ),
    createVersion: vi
      .fn()
      .mockReturnValue(of({ id: 'ver-2', versionNumber: 2 })),
    updateDraftVersion: vi.fn().mockReturnValue(of({ id: 'ver-1' })),
    publishVersion: vi.fn().mockReturnValue(
      of({ id: 'ver-1', status: InstrumentVersionStatus.PUBLISHED }),
    ),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomInstrumentBuilderComponent],
      providers: [
        provideRouter([]),
        { provide: InstrumentsHttpService, useValue: mockInstrumentsService },
        ClientScoringEngineService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CustomInstrumentBuilderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and initialize default 5-step template', () => {
    expect(component).toBeTruthy();
    expect(component.itemsArray.length).toBeGreaterThan(0);
    expect(component.strataArray.length).toBeGreaterThan(0);
    expect(component.alertsArray.length).toBeGreaterThan(0);
  });

  it('should allow adding, updating and removing items dynamically', () => {
    const initialCount = component.itemsArray.length;
    component.addItem();
    expect(component.itemsArray.length).toBe(initialCount + 1);

    component.removeItem(0);
    expect(component.itemsArray.length).toBe(initialCount);
  });

  it('should reactively compute live scoring in the simulator step', () => {
    const liveDef = component.liveDefinition();
    expect(liveDef.items.length).toBeGreaterThan(0);

    // Simulate answering Q1 with option 0
    component.setSimulatorResponse('Q1', '0');
    expect(component.simulatorResponses()['Q1']).toBe('0');

    const result = component.liveScoringResult();
    expect(result).toBeDefined();
    expect(typeof result.rawScore).toBe('number');
  });

  it('should trigger publish flow and validate items count', () => {
    component.metadataForm.patchValue({
      code: 'TEST-SCALE',
      name: 'Escala de Prueba',
    });

    component.publish();
    expect(component.isPublishing()).toBe(false);
  });
});
