import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTooltipModule } from '@angular/material/tooltip';
import { catchError, finalize, of } from 'rxjs';

import {
  CreateInstrumentRequest,
  CreateInstrumentVersionRequest,
  Instrument,
  InstrumentVersion,
  InstrumentVersionStatus,
} from '../../../../core/models/instrument.models';
import {
  AlertSeverity,
  AlertTriggerCondition,
  AssessmentResponseMap,
  ClinicalSeverity,
  InstrumentDefinition,
  InstrumentItem,
  ItemOption,
  ItemType,
  ScoringSpec,
  StrataDefinition,
} from '../../../../core/models/scoring.types';
import { ClientScoringEngineService } from '../../../../core/services/client-scoring-engine.service';
import { InstrumentsHttpService } from '../../../../core/services/instruments-http.service';

@Component({
  selector: 'app-custom-instrument-builder',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatStepperModule,
    MatTooltipModule,
  ],
  templateUrl: './custom-instrument-builder.component.html',
  styleUrl: './custom-instrument-builder.component.scss',
})
export class CustomInstrumentBuilderComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly instrumentsService = inject(InstrumentsHttpService);
  private readonly scoringEngine = inject(ClientScoringEngineService);

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly isPublishing = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly instrumentId = signal<string | null>(null);
  readonly versionId = signal<string | null>(null);
  readonly existingInstrument = signal<Instrument | null>(null);
  readonly existingVersion = signal<InstrumentVersion | null>(null);

  readonly isEditMode = computed(() => !!this.instrumentId());
  readonly isStock = computed(() => {
    const inst = this.existingInstrument();
    return inst ? inst.isSystem || !inst.organizationId : false;
  });
  readonly isLocked = computed(() => {
    const ver = this.existingVersion();
    return ver ? ver.status === InstrumentVersionStatus.PUBLISHED || ver.isLocked : false;
  });

  // Step 1: Metadata Form
  readonly metadataForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(50)]],
    name: ['', [Validators.required, Validators.maxLength(150)]],
    description: [''],
    targetPopulation: ['Población adulta general (>= 18 años)'],
    estimatedTimeMinutes: [5, [Validators.required, Validators.min(1), Validators.max(180)]],
    administrationMode: ['SELF_ADMINISTERED' as 'SELF_ADMINISTERED' | 'CLINICIAN_ADMINISTERED'],
    generalInstructions: [
      'Durante las últimas 2 semanas, ¿con qué frecuencia le han molestado los siguientes problemas?',
      Validators.required,
    ],
  });

  // Step 2: Items Form
  readonly itemsForm = this.fb.group({
    items: this.fb.array<FormGroup>([]),
  });

  // Step 3: Scoring & Strata Form
  readonly scoringForm = this.fb.nonNullable.group({
    scoringType: ['SUM' as 'SUM' | 'SUBSCALES' | 'WEIGHTED_COMPOSITE', Validators.required],
    minScore: [0],
    maxScore: [27],
    strata: this.fb.array<FormGroup>([]),
  });

  // Step 4: Clinical Alerts Form
  readonly alertsForm = this.fb.group({
    clinicalAlerts: this.fb.array<FormGroup>([]),
  });

  // Step 5: Simulator Responses (Live reactivity)
  readonly simulatorResponses = signal<AssessmentResponseMap>({});

  get itemsArray(): FormArray<FormGroup> {
    return this.itemsForm.get('items') as FormArray<FormGroup>;
  }

  get strataArray(): FormArray<FormGroup> {
    return this.scoringForm.get('strata') as FormArray<FormGroup>;
  }

  get alertsArray(): FormArray<FormGroup> {
    return this.alertsForm.get('clinicalAlerts') as FormArray<FormGroup>;
  }

  readonly liveDefinition = computed<InstrumentDefinition>(() => {
    const meta = this.metadataForm.getRawValue();
    const itemsRaw = this.itemsArray.getRawValue();

    const items: InstrumentItem[] = itemsRaw.map((it: any, index: number) => ({
      code: it.code || `Q${index + 1}`,
      sequenceNumber: index + 1,
      prompt: it.prompt || `Reactivo ${index + 1}`,
      itemType: it.itemType || 'LIKERT',
      required: it.required ?? true,
      reverseScored: it.reverseScored ?? false,
      dimensionCode: it.dimensionCode || undefined,
      options: it.options || [],
    }));

    return {
      schemaVersion: '1.0',
      metadata: {
        title: meta.name || 'Sin título',
        acronym: meta.code || 'CODE',
        language: 'es-MX',
        estimatedTimeMinutes: meta.estimatedTimeMinutes,
        administrationMode: meta.administrationMode,
      },
      instructions: {
        generalInstructions: meta.generalInstructions,
        responseScaleFormat: 'LIKERT',
      },
      items,
    };
  });

  readonly liveScoringSpec = computed<ScoringSpec>(() => {
    const sc = this.scoringForm.getRawValue();
    const strataRaw = this.strataArray.getRawValue();
    const alertsRaw = this.alertsArray.getRawValue();

    const strata: StrataDefinition[] = strataRaw.map((st: any) => ({
      code: st.code || 'STRATA',
      min: Number(st.min) || 0,
      max: Number(st.max) || 0,
      severity: st.severity || 'NONE',
      title: st.title || 'Estrato',
      description: st.description || '',
    }));

    return {
      schemaVersion: '1.0',
      scoringType: sc.scoringType,
      minScore: sc.minScore,
      maxScore: sc.maxScore,
      strata,
      clinicalAlerts: alertsRaw.map((al: any) => ({
        itemCode: al.itemCode,
        triggerCondition: al.triggerCondition || 'WEIGHT_GREATER_THAN_OR_EQUAL',
        thresholdValue: Number(al.thresholdValue) || 1,
        alertType: al.alertType || 'CRITICAL_RISK',
        severity: al.severity || 'CRITICAL',
        message: al.message || 'Alerta clínica crítica detectada.',
      })),
    };
  });

  readonly liveScoringResult = computed(() => {
    return this.scoringEngine.calculate(
      this.liveDefinition(),
      this.liveScoringSpec(),
      this.simulatorResponses(),
    );
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const versionParam = this.route.snapshot.queryParamMap.get('versionId');

    if (idParam) {
      this.instrumentId.set(idParam);
      if (versionParam) {
        this.versionId.set(versionParam);
      }
      this.loadExistingInstrument(idParam, versionParam);
    } else {
      // Initialize with default template (e.g. 4 Likert items & standard 4 strata)
      this.initializeDefaultTemplate();
    }
  }

  loadExistingInstrument(instrumentId: string, versionId?: string | null): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.instrumentsService
      .getInstrumentById(instrumentId)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        catchError((err) => {
          this.errorMessage.set(err?.error?.message || 'Error al cargar el instrumento.');
          return of(null);
        }),
      )
      .subscribe((inst) => {
        if (!inst) return;
        this.existingInstrument.set(inst);

        let ver: InstrumentVersion | undefined;
        if (versionId && inst.versions) {
          ver = inst.versions.find((v) => v.id === versionId);
        } else if (inst.versions && inst.versions.length > 0) {
          ver = inst.versions.find((v) => v.status === InstrumentVersionStatus.DRAFT) || inst.versions[0];
        }

        if (ver) {
          this.existingVersion.set(ver);
          this.versionId.set(ver.id);
          this.populateFromVersion(inst, ver);
        } else {
          this.metadataForm.patchValue({
            code: inst.code,
            name: inst.name,
            description: inst.description || '',
            targetPopulation: inst.targetPopulation || '',
          });
          this.initializeDefaultTemplate();
        }
      });
  }

  private populateFromVersion(inst: Instrument, ver: InstrumentVersion): void {
    this.metadataForm.patchValue({
      code: inst.code,
      name: inst.name,
      description: inst.description || '',
      targetPopulation: inst.targetPopulation || '',
      estimatedTimeMinutes: ver.definitionJson?.metadata?.estimatedTimeMinutes ?? 5,
      administrationMode: ver.definitionJson?.metadata?.administrationMode ?? 'SELF_ADMINISTERED',
      generalInstructions: ver.definitionJson?.instructions?.generalInstructions ?? '',
    });

    this.itemsArray.clear();
    if (ver.definitionJson?.items) {
      ver.definitionJson.items.forEach((item) => {
        this.itemsArray.push(this.createItemFormGroup(item));
      });
    }

    if (ver.scoringSpecJson) {
      this.scoringForm.patchValue({
        scoringType: ver.scoringSpecJson.scoringType ?? 'SUM',
        minScore: ver.scoringSpecJson.minScore ?? 0,
        maxScore: ver.scoringSpecJson.maxScore ?? 27,
      });

      this.strataArray.clear();
      if (ver.scoringSpecJson.strata) {
        ver.scoringSpecJson.strata.forEach((st) => {
          this.strataArray.push(this.createStratumFormGroup(st));
        });
      }

      this.alertsArray.clear();
      if (ver.scoringSpecJson.clinicalAlerts) {
        ver.scoringSpecJson.clinicalAlerts.forEach((al) => {
          this.alertsArray.push(this.createAlertFormGroup(al));
        });
      }
    }
  }

  private initializeDefaultTemplate(): void {
    this.itemsArray.clear();
    this.strataArray.clear();
    this.alertsArray.clear();

    // Add 4 sample Likert items
    for (let i = 1; i <= 4; i++) {
      const itemGroup = this.createItemFormGroup({
        code: `Q${i}`,
        sequenceNumber: i,
        prompt: `Reactivo psicométrico de ejemplo #${i}`,
        itemType: 'LIKERT',
        required: true,
        options: this.getDefault4PointLikertOptions(),
      });
      this.itemsArray.push(itemGroup);
    }

    // Default Strata
    this.addDefaultStrata();

    // Default alert for item 4
    this.alertsArray.push(
      this.createAlertFormGroup({
        itemCode: 'Q4',
        triggerCondition: 'WEIGHT_GREATER_THAN_OR_EQUAL',
        thresholdValue: 2,
        alertType: 'CRITICAL_RISK',
        severity: 'CRITICAL',
        message: 'Alerta clínica detectada en reactivo crítico 4.',
      }),
    );
  }

  createItemFormGroup(item?: Partial<InstrumentItem>): FormGroup {
    const optionsArray = this.fb.array<FormGroup>([]);
    const options = item?.options ?? this.getDefault4PointLikertOptions();

    options.forEach((opt) => {
      optionsArray.push(
        this.fb.group({
          label: [opt.label, Validators.required],
          value: [opt.value, Validators.required],
          weight: [opt.weight, Validators.required],
        }),
      );
    });

    return this.fb.group({
      code: [item?.code || `Q${this.itemsArray.length + 1}`, Validators.required],
      prompt: [item?.prompt || '', Validators.required],
      itemType: [item?.itemType || 'LIKERT', Validators.required],
      required: [item?.required ?? true],
      reverseScored: [item?.reverseScored ?? false],
      dimensionCode: [item?.dimensionCode || ''],
      options: optionsArray,
    });
  }

  getItemOptionsArray(itemIndex: number): FormArray<FormGroup> {
    return this.itemsArray.at(itemIndex).get('options') as FormArray<FormGroup>;
  }

  addItem(): void {
    const nextSeq = this.itemsArray.length + 1;
    const itemGroup = this.createItemFormGroup({
      code: `Q${nextSeq}`,
      sequenceNumber: nextSeq,
      prompt: '',
      itemType: 'LIKERT',
      required: true,
      options: this.getDefault4PointLikertOptions(),
    });
    this.itemsArray.push(itemGroup);
  }

  removeItem(index: number): void {
    this.itemsArray.removeAt(index);
  }

  apply4PointLikert(itemIndex: number): void {
    const optionsArray = this.getItemOptionsArray(itemIndex);
    optionsArray.clear();
    this.getDefault4PointLikertOptions().forEach((opt) => {
      optionsArray.push(
        this.fb.group({
          label: [opt.label, Validators.required],
          value: [opt.value, Validators.required],
          weight: [opt.weight, Validators.required],
        }),
      );
    });
  }

  apply5PointLikert(itemIndex: number): void {
    const optionsArray = this.getItemOptionsArray(itemIndex);
    optionsArray.clear();
    this.getDefault5PointLikertOptions().forEach((opt) => {
      optionsArray.push(
        this.fb.group({
          label: [opt.label, Validators.required],
          value: [opt.value, Validators.required],
          weight: [opt.weight, Validators.required],
        }),
      );
    });
  }

  private getDefault4PointLikertOptions(): ItemOption[] {
    return [
      { value: '0', label: 'Nunca', weight: 0 },
      { value: '1', label: 'Varios días', weight: 1 },
      { value: '2', label: 'Más de la mitad de los días', weight: 2 },
      { value: '3', label: 'Casi todos los días', weight: 3 },
    ];
  }

  private getDefault5PointLikertOptions(): ItemOption[] {
    return [
      { value: '1', label: 'Totalmente en desacuerdo', weight: 1 },
      { value: '2', label: 'En desacuerdo', weight: 2 },
      { value: '3', label: 'Neutral', weight: 3 },
      { value: '4', label: 'De acuerdo', weight: 4 },
      { value: '5', label: 'Totalmente de acuerdo', weight: 5 },
    ];
  }

  createStratumFormGroup(st?: Partial<StrataDefinition>): FormGroup {
    return this.fb.group({
      code: [st?.code || 'STRATA', Validators.required],
      min: [st?.min ?? 0, Validators.required],
      max: [st?.max ?? 10, Validators.required],
      severity: [st?.severity || 'NONE', Validators.required],
      title: [st?.title || 'Estrato', Validators.required],
      description: [st?.description || ''],
    });
  }

  addStratum(): void {
    this.strataArray.push(this.createStratumFormGroup());
  }

  removeStratum(index: number): void {
    this.strataArray.removeAt(index);
  }

  addDefaultStrata(): void {
    this.strataArray.clear();
    const defaults: StrataDefinition[] = [
      { code: 'MINIMAL', min: 0, max: 4, severity: 'NONE', title: 'Mínimo o Nulo', description: 'Sin síntomas significativos.' },
      { code: 'MILD', min: 5, max: 9, severity: 'MILD', title: 'Leve', description: 'Sintomatología leve detectada.' },
      { code: 'MODERATE', min: 10, max: 14, severity: 'MODERATE', title: 'Moderado', description: 'Sintomatología moderada.' },
      { code: 'SEVERE', min: 15, max: 27, severity: 'SEVERE', title: 'Grave', description: 'Sintomatología severa que requiere intervención clínica.' },
    ];
    defaults.forEach((st) => this.strataArray.push(this.createStratumFormGroup(st)));
  }

  createAlertFormGroup(al?: any): FormGroup {
    return this.fb.group({
      itemCode: [al?.itemCode || 'Q1', Validators.required],
      triggerCondition: [al?.triggerCondition || 'WEIGHT_GREATER_THAN_OR_EQUAL', Validators.required],
      thresholdValue: [al?.thresholdValue ?? 1, Validators.required],
      alertType: [al?.alertType || 'CRITICAL_RISK', Validators.required],
      severity: [al?.severity || 'CRITICAL', Validators.required],
      message: [al?.message || 'Alerta clínica crítica detectada.', Validators.required],
    });
  }

  addAlert(): void {
    this.alertsArray.push(this.createAlertFormGroup());
  }

  removeAlert(index: number): void {
    this.alertsArray.removeAt(index);
  }

  // Simulator helper
  setSimulatorResponse(itemCode: string, value: string): void {
    this.simulatorResponses.update((prev) => ({
      ...prev,
      [itemCode]: value,
    }));
  }

  saveDraft(): void {
    if (this.metadataForm.invalid) {
      this.metadataForm.markAllAsTouched();
      this.errorMessage.set('Por favor complete los metadatos obligatorios en el Paso 1.');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const meta = this.metadataForm.getRawValue();
    const definitionJson = this.liveDefinition();
    const scoringSpecJson = this.liveScoringSpec();

    if (this.isEditMode() && this.instrumentId()) {
      const instId = this.instrumentId()!;
      const verId = this.versionId();

      if (verId && !this.isLocked()) {
        this.instrumentsService
          .updateDraftVersion(instId, verId, { definitionJson, scoringSpecJson })
          .pipe(finalize(() => this.isSaving.set(false)))
          .subscribe({
            next: () => {
              this.successMessage.set('Borrador actualizado exitosamente.');
            },
            error: (err) => {
              this.errorMessage.set(err?.error?.message || 'Error al actualizar el borrador.');
            },
          });
      } else {
        // Create new draft version (vN+1)
        this.instrumentsService
          .createVersion(instId, { definitionJson, scoringSpecJson })
          .pipe(finalize(() => this.isSaving.set(false)))
          .subscribe({
            next: (newVer) => {
              this.versionId.set(newVer.id);
              this.existingVersion.set(newVer);
              this.successMessage.set(`Nueva versión borrador v${newVer.versionNumber} creada exitosamente.`);
            },
            error: (err) => {
              this.errorMessage.set(err?.error?.message || 'Error al crear la nueva versión.');
            },
          });
      }
    } else {
      // Create new instrument with initial draft
      const req: CreateInstrumentRequest = {
        code: meta.code,
        name: meta.name,
        description: meta.description,
        targetPopulation: meta.targetPopulation,
        initialDraft: { definitionJson, scoringSpecJson },
      };

      this.instrumentsService
        .createInstrument(req)
        .pipe(finalize(() => this.isSaving.set(false)))
        .subscribe({
          next: (created) => {
            this.instrumentId.set(created.id);
            this.existingInstrument.set(created);
            if (created.versions && created.versions.length > 0) {
              this.versionId.set(created.versions[0].id);
              this.existingVersion.set(created.versions[0]);
            }
            this.successMessage.set('Instrumento psicométrico guardado como borrador.');
          },
          error: (err) => {
            this.errorMessage.set(err?.error?.message || 'Error al crear el instrumento.');
          },
        });
    }
  }

  publish(): void {
    if (this.liveDefinition().items.length === 0) {
      this.errorMessage.set('Debe agregar al menos 1 reactivo antes de publicar.');
      return;
    }

    this.isPublishing.set(true);
    this.errorMessage.set('');

    const saveAndPublish = (instId: string, verId: string) => {
      this.instrumentsService
        .publishVersion(instId, verId)
        .pipe(finalize(() => this.isPublishing.set(false)))
        .subscribe({
          next: () => {
            this.successMessage.set('¡Instrumento publicado con éxito para uso clínico!');
            setTimeout(() => {
              this.router.navigate(['/management/assessments']);
            }, 1500);
          },
          error: (err) => {
            this.errorMessage.set(err?.error?.message || 'Error al publicar el instrumento.');
          },
        });
    };

    if (this.isEditMode() && this.instrumentId() && this.versionId()) {
      const instId = this.instrumentId()!;
      const verId = this.versionId()!;

      this.instrumentsService
        .updateDraftVersion(instId, verId, {
          definitionJson: this.liveDefinition(),
          scoringSpecJson: this.liveScoringSpec(),
        })
        .subscribe({
          next: () => saveAndPublish(instId, verId),
          error: (err) => {
            this.isPublishing.set(false);
            this.errorMessage.set(err?.error?.message || 'Error al guardar los cambios previos a la publicación.');
          },
        });
    } else {
      const meta = this.metadataForm.getRawValue();
      const req: CreateInstrumentRequest = {
        code: meta.code,
        name: meta.name,
        description: meta.description,
        targetPopulation: meta.targetPopulation,
        initialDraft: {
          definitionJson: this.liveDefinition(),
          scoringSpecJson: this.liveScoringSpec(),
        },
      };

      this.instrumentsService.createInstrument(req).subscribe({
        next: (created) => {
          const verId = created.versions?.[0]?.id;
          if (verId) {
            saveAndPublish(created.id, verId);
          } else {
            this.isPublishing.set(false);
            this.router.navigate(['/management/assessments']);
          }
        },
        error: (err) => {
          this.isPublishing.set(false);
          this.errorMessage.set(err?.error?.message || 'Error al crear el instrumento.');
        },
      });
    }
  }
}
