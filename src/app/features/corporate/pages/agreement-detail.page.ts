import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';

import {
  BenefitPool,
  EmployeeEligibility,
  PaefAgreement,
} from '../../../core/models/corporate.models';
import { CorporateService } from '../../../core/services/corporate.service';

@Component({
  selector: 'app-agreement-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './agreement-detail.page.html',
  styleUrls: ['./agreement-detail.page.scss'],
})
export class AgreementDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly corporateService = inject(CorporateService);
  private readonly fb = inject(FormBuilder);

  readonly agreementId = signal<string>('');
  readonly agreement = signal<PaefAgreement | null>(null);
  readonly pools = signal<BenefitPool[]>([]);
  readonly employees = signal<EmployeeEligibility[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);

  // Pool modal state
  readonly showPoolModal = signal<boolean>(false);
  readonly isSavingPool = signal<boolean>(false);

  // Employee modal state
  readonly showEmployeeModal = signal<boolean>(false);
  readonly isSavingEmployee = signal<boolean>(false);

  // Batch upload modal state
  readonly showBatchModal = signal<boolean>(false);
  readonly isUploadingBatch = signal<boolean>(false);
  readonly batchText = signal<string>('');
  readonly batchResult = signal<{
    importedCount: number;
    skippedCount: number;
    errors: string[];
  } | null>(null);

  poolForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    totalSessions: [100, [Validators.required, Validators.min(1)]],
    validFrom: [new Date().toISOString().substring(0, 10), Validators.required],
    validUntil: [
      new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
      Validators.required,
    ],
  });

  employeeForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    firstName: [''],
    lastName: [''],
    employeeNumber: [''],
    department: [''],
    maxSessionsAllowed: [5, [Validators.required, Validators.min(1)]],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.agreementId.set(id);
      this.loadAgreement(id);
    } else {
      this.errorMessage.set('ID de convenio no válido');
      this.isLoading.set(false);
    }
  }

  loadAgreement(id: string): void {
    this.isLoading.set(true);
    this.corporateService.getAgreement(id).subscribe({
      next: (agr) => {
        this.agreement.set(agr);
        this.loadPools(id);
      },
      error: () => {
        this.errorMessage.set('No se pudo cargar el convenio');
        this.isLoading.set(false);
      },
    });
  }

  loadPools(id: string): void {
    this.corporateService.getPools(id).subscribe({
      next: (pools) => {
        this.pools.set(pools);
        this.loadEmployees(id);
      },
      error: () => this.isLoading.set(false),
    });
  }

  loadEmployees(id: string): void {
    this.corporateService.getEligibility(id).subscribe({
      next: (employees) => {
        this.employees.set(employees);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  openNewPoolModal(): void {
    this.poolForm.reset({
      name: '',
      totalSessions: 100,
      validFrom: new Date().toISOString().substring(0, 10),
      validUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
    });
    this.showPoolModal.set(true);
  }

  closePoolModal(): void {
    this.showPoolModal.set(false);
  }

  savePool(): void {
    if (this.poolForm.invalid) return;

    this.isSavingPool.set(true);
    const formVal = this.poolForm.value;

    this.corporateService
      .createPool(this.agreementId(), {
        name: formVal.name,
        totalSessions: formVal.totalSessions,
        validFrom: new Date(formVal.validFrom).toISOString(),
        validUntil: new Date(formVal.validUntil).toISOString(),
      })
      .subscribe({
        next: (newPool) => {
          this.pools.update((prev) => [newPool, ...prev]);
          this.isSavingPool.set(false);
          this.closePoolModal();
        },
        error: (err) => {
          this.isSavingPool.set(false);
          alert(err?.error?.message || 'Error al crear bolsa');
        },
      });
  }

  openNewEmployeeModal(): void {
    this.employeeForm.reset({
      maxSessionsAllowed: this.agreement()?.defaultMaxSessionsPerEmployee || 5,
    });
    this.showEmployeeModal.set(true);
  }

  closeEmployeeModal(): void {
    this.showEmployeeModal.set(false);
  }

  saveEmployee(): void {
    if (this.employeeForm.invalid) return;

    this.isSavingEmployee.set(true);
    const formVal = this.employeeForm.value;

    this.corporateService
      .createEligibility(this.agreementId(), {
        email: formVal.email,
        firstName: formVal.firstName || undefined,
        lastName: formVal.lastName || undefined,
        employeeNumber: formVal.employeeNumber || undefined,
        department: formVal.department || undefined,
        maxSessionsAllowed: formVal.maxSessionsAllowed,
      })
      .subscribe({
        next: (newEmp) => {
          this.employees.update((prev) => [newEmp, ...prev]);
          this.isSavingEmployee.set(false);
          this.closeEmployeeModal();
        },
        error: (err) => {
          this.isSavingEmployee.set(false);
          alert(err?.error?.message || 'Error al registrar colaborador');
        },
      });
  }

  openBatchModal(): void {
    this.batchText.set('');
    this.batchResult.set(null);
    this.showBatchModal.set(true);
  }

  closeBatchModal(): void {
    this.showBatchModal.set(false);
  }

  onBatchTextChange(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.batchText.set(target.value);
  }

  uploadBatch(): void {
    const raw = this.batchText().trim();
    if (!raw) return;

    this.isUploadingBatch.set(true);
    const lines = raw.split('\n').filter((l) => l.trim().length > 0);
    const parsed: any[] = [];

    for (const line of lines) {
      // Expect CSV: email,firstName,lastName,employeeNumber,department
      const parts = line.split(',').map((p) => p.trim());
      if (parts[0] && parts[0].includes('@')) {
        parsed.push({
          email: parts[0],
          firstName: parts[1] || undefined,
          lastName: parts[2] || undefined,
          employeeNumber: parts[3] || undefined,
          department: parts[4] || undefined,
          maxSessionsAllowed: this.agreement()?.defaultMaxSessionsPerEmployee || 5,
        });
      }
    }

    if (parsed.length === 0) {
      alert('No se encontraron correos válidos en las líneas ingresadas');
      this.isUploadingBatch.set(false);
      return;
    }

    this.corporateService.batchEligibility(this.agreementId(), parsed).subscribe({
      next: (res) => {
        this.batchResult.set(res);
        this.isUploadingBatch.set(false);
        this.loadEmployees(this.agreementId());
      },
      error: (err) => {
        this.isUploadingBatch.set(false);
        alert(err?.error?.message || 'Error en carga masiva');
      },
    });
  }
}
