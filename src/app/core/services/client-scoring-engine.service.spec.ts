import { TestBed } from '@angular/core/testing';
import { ClientScoringEngineService } from './client-scoring-engine.service';
import { InstrumentDefinition, ScoringSpec } from '../models/scoring.types';

describe('ClientScoringEngineService', () => {
  let service: ClientScoringEngineService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ClientScoringEngineService],
    });
    service = TestBed.inject(ClientScoringEngineService);
  });

  it('should calculate raw score, normalized score and match strata in live simulator', () => {
    const definition: InstrumentDefinition = {
      schemaVersion: '1.0',
      metadata: { title: 'Test Scale', acronym: 'TS', language: 'es-MX' },
      items: [
        {
          code: 'Q1',
          sequenceNumber: 1,
          prompt: 'Item 1',
          itemType: 'LIKERT',
          required: true,
          options: [
            { value: '0', label: 'Nunca', weight: 0 },
            { value: '1', label: 'A veces', weight: 1 },
            { value: '2', label: 'Siempre', weight: 2 },
          ],
        },
        {
          code: 'Q2',
          sequenceNumber: 2,
          prompt: 'Item 2',
          itemType: 'LIKERT',
          required: true,
          options: [
            { value: '0', label: 'Nunca', weight: 0 },
            { value: '1', label: 'A veces', weight: 1 },
            { value: '2', label: 'Siempre', weight: 2 },
          ],
        },
      ],
    };

    const spec: ScoringSpec = {
      schemaVersion: '1.0',
      scoringType: 'SUM',
      minScore: 0,
      maxScore: 4,
      strata: [
        { code: 'LOW', min: 0, max: 2, severity: 'NONE', title: 'Bajo', description: 'Nivel bajo' },
        { code: 'HIGH', min: 3, max: 4, severity: 'SEVERE', title: 'Alto', description: 'Nivel alto' },
      ],
      clinicalAlerts: [
        {
          itemCode: 'Q2',
          triggerCondition: 'WEIGHT_GREATER_THAN_OR_EQUAL',
          thresholdValue: 2,
          alertType: 'CRITICAL_FLAG',
          severity: 'CRITICAL',
          message: 'Alerta crítica en reactivo 2',
        },
      ],
    };

    const responses = { Q1: '1', Q2: '2' };
    const result = service.calculate(definition, spec, responses);

    expect(result.rawScore).toBe(3);
    expect(result.normalizedScore).toBe(75);
    expect(result.strataCode).toBe('HIGH');
    expect(result.strataSeverity).toBe('SEVERE');
    expect(result.isComplete).toBe(true);
    expect(result.flags).toHaveLength(1);
    expect(result.flags[0].message).toBe('Alerta crítica en reactivo 2');
  });
});
