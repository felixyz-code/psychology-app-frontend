import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
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
import { MatTabsModule } from '@angular/material/tabs';

import {
  BenefitDebitLog,
  CorporateClient,
  EligibilityCheckResult,
  PaefAgreement,
} from '../../../core/models/corporate.models';
import { CorporateService } from '../../../core/services/corporate.service';
import { BranchContextService } from '../../../core/services/branch-context.service';

@Component({
  selector: 'app-corporate-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MatTabsModule,
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
  templateUrl: './corporate-dashboard.page.html',
  styleUrls: ['./corporate-dashboard.page.scss'],
})
export class CorporateDashboardPage implements OnInit {
  private readonly corporateService = inject(CorporateService);
  private readonly branchService = inject(BranchContextService);
  private readonly fb = inject(FormBuilder);

  readonly agreements = signal<PaefAgreement[]>([]);
  readonly clients = signal<CorporateClient[]>([]);
  readonly debitLogs = signal<BenefitDebitLog[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // Live checker state
  readonly isChecking = signal<boolean>(false);
  readonly checkResult = signal<EligibilityCheckResult | null>(null);
  readonly checkError = signal<string | null>(null);

  // Client modal/form state
  readonly showClientModal = signal<boolean>(false);
  readonly isSavingClient = signal<boolean>(false);

  // Agreement modal/form state
  readonly showAgreementModal = signal<boolean>(false);
  readonly isSavingAgreement = signal<boolean>(false);

  clientForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    commercialName: [''],
    taxId: [''],
    contactEmail: ['', [Validators.email]],
    contactPhone: [''],
    domainWhitelist: [''],
    notes: [''],
  });

  agreementForm: FormGroup = this.fb.group({
    corporateClientId: ['', Validators.required],
    code: ['', [Validators.required, Validators.maxLength(50)]],
    title: ['', [Validators.required, Validators.maxLength(150)]],
    description: [''],
    isMultiBranch: [true],
    defaultMaxSessionsPerEmployee: [5, [Validators.required, Validators.min(1)]],
    validFrom: [new Date().toISOString().substring(0, 10), Validators.required],
    validUntil: [
      new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
      Validators.required,
    ],
  });

  checkForm: FormGroup = this.fb.group({
    agreementId: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    employeeNumber: [''],
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.corporateService.getAgreements().subscribe({
      next: (agreements) => {
        this.agreements.set(agreements);
        this.loadClients();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set('Error al cargar convenios corporativos');
      },
    });
  }

  private loadClients(): void {
    this.corporateService.getClients().subscribe({
      next: (clients) => {
        this.clients.set(clients);
        this.loadLogs();
      },
      error: () => this.isLoading.set(false),
    });
  }

  private loadLogs(): void {
    this.corporateService.getDebitLogs().subscribe({
      next: (logs) => {
        this.debitLogs.set(logs);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  openNewClientModal(): void {
    this.clientForm.reset({ domainWhitelist: '' });
    this.showClientModal.set(true);
  }

  closeClientModal(): void {
    this.showClientModal.set(false);
  }

  saveClient(): void {
    if (this.clientForm.invalid) return;

    this.isSavingClient.set(true);
    const formVal = this.clientForm.value;

    const domains = formVal.domainWhitelist
      ? String(formVal.domainWhitelist)
          .split(',')
          .map((d) => d.trim())
          .filter((d) => d.length > 0)
      : [];

    this.corporateService
      .createClient({
        name: formVal.name,
        commercialName: formVal.commercialName || undefined,
        taxId: formVal.taxId || undefined,
        contactEmail: formVal.contactEmail || undefined,
        contactPhone: formVal.contactPhone || undefined,
        domainWhitelist: domains,
        notes: formVal.notes || undefined,
      })
      .subscribe({
        next: (newClient) => {
          this.clients.update((prev) => [newClient, ...prev]);
          this.isSavingClient.set(false);
          this.closeClientModal();
        },
        error: (err) => {
          this.isSavingClient.set(false);
          alert(err?.error?.message || 'Error al guardar cliente');
        },
      });
  }

  openNewAgreementModal(): void {
    this.agreementForm.reset({
      corporateClientId: this.clients()[0]?.id || '',
      isMultiBranch: true,
      defaultMaxSessionsPerEmployee: 5,
      validFrom: new Date().toISOString().substring(0, 10),
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
    });
    this.showAgreementModal.set(true);
  }

  closeAgreementModal(): void {
    this.showAgreementModal.set(false);
  }

  saveAgreement(): void {
    if (this.agreementForm.invalid) return;

    this.isSavingAgreement.set(true);
    const formVal = this.agreementForm.value;

    this.corporateService
      .createAgreement({
        corporateClientId: formVal.corporateClientId,
        code: formVal.code,
        title: formVal.title,
        description: formVal.description || undefined,
        isMultiBranch: formVal.isMultiBranch,
        defaultMaxSessionsPerEmployee: formVal.defaultMaxSessionsPerEmployee,
        validFrom: new Date(formVal.validFrom).toISOString(),
        validUntil: new Date(formVal.validUntil).toISOString(),
      })
      .subscribe({
        next: (newAgr) => {
          this.agreements.update((prev) => [newAgr, ...prev]);
          this.isSavingAgreement.set(false);
          this.closeAgreementModal();
        },
        error: (err) => {
          this.isSavingAgreement.set(false);
          alert(err?.error?.message || 'Error al crear convenio');
        },
      });
  }

  runEligibilityCheck(): void {
    if (this.checkForm.invalid) return;

    this.isChecking.set(true);
    this.checkResult.set(null);
    this.checkError.set(null);

    const val = this.checkForm.value;
    const branchId = this.branchService.currentBranchId() || undefined;

    this.corporateService
      .checkEligibility({
        agreementId: val.agreementId,
        email: val.email,
        employeeNumber: val.employeeNumber || undefined,
        branchId,
      })
      .subscribe({
        next: (res) => {
          this.checkResult.set(res);
          this.isChecking.set(false);
        },
        error: (err) => {
          this.checkError.set(err?.error?.message || 'Error durante la verificación');
          this.isChecking.set(false);
        },
      });
  }

  getAgreementTotalSessions(agr: PaefAgreement): number {
    return agr.benefitPools?.reduce((acc, p) => acc + p.totalSessions, 0) || 0;
  }

  getAgreementConsumedSessions(agr: PaefAgreement): number {
    return (
      agr.benefitPools?.reduce((acc, p) => acc + p.consumedSessions + p.reservedSessions, 0) || 0
    );
  }

  getAgreementUtilization(agr: PaefAgreement): number {
    const total = this.getAgreementTotalSessions(agr);
    if (total === 0) return 0;
    const used = this.getAgreementConsumedSessions(agr);
    return Math.min(100, Math.round((used / total) * 100));
  }
}
