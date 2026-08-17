import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  BenefitDebitLog,
  BenefitPool,
  CorporateClient,
  CreateBenefitPoolPayload,
  CreateCorporateClientPayload,
  CreateEmployeeEligibilityPayload,
  CreatePaefAgreementPayload,
  EligibilityCheckResult,
  EmployeeEligibility,
  PaefAgreement,
} from '../models/corporate.models';

@Injectable({ providedIn: 'root' })
export class CorporateService {
  private readonly http = inject(HttpClient);
  private readonly basePath = `${environment.apiUrl}/enterprise/corporate`;

  // --- Corporate Clients ---

  getClients(options?: { includeInactive?: boolean }): Observable<CorporateClient[]> {
    let params = new HttpParams();
    if (options?.includeInactive !== undefined) {
      params = params.set('includeInactive', String(options.includeInactive));
    }
    return this.http.get<CorporateClient[]>(`${this.basePath}/clients`, { params });
  }

  getClient(id: string): Observable<CorporateClient> {
    return this.http.get<CorporateClient>(`${this.basePath}/clients/${encodeURIComponent(id)}`);
  }

  createClient(payload: CreateCorporateClientPayload): Observable<CorporateClient> {
    return this.http.post<CorporateClient>(`${this.basePath}/clients`, payload);
  }

  updateClient(
    id: string,
    payload: Partial<CreateCorporateClientPayload>,
  ): Observable<CorporateClient> {
    return this.http.patch<CorporateClient>(
      `${this.basePath}/clients/${encodeURIComponent(id)}`,
      payload,
    );
  }

  deleteClient(id: string): Observable<CorporateClient> {
    return this.http.delete<CorporateClient>(`${this.basePath}/clients/${encodeURIComponent(id)}`);
  }

  // --- PAEF Agreements ---

  getAgreements(filters?: {
    corporateClientId?: string;
    status?: string;
  }): Observable<PaefAgreement[]> {
    let params = new HttpParams();
    if (filters?.corporateClientId) {
      params = params.set('corporateClientId', filters.corporateClientId);
    }
    if (filters?.status) {
      params = params.set('status', filters.status);
    }
    return this.http.get<PaefAgreement[]>(`${this.basePath}/agreements`, { params });
  }

  getAgreement(id: string): Observable<PaefAgreement> {
    return this.http.get<PaefAgreement>(`${this.basePath}/agreements/${encodeURIComponent(id)}`);
  }

  createAgreement(payload: CreatePaefAgreementPayload): Observable<PaefAgreement> {
    return this.http.post<PaefAgreement>(`${this.basePath}/agreements`, payload);
  }

  updateAgreement(
    id: string,
    payload: Partial<CreatePaefAgreementPayload>,
  ): Observable<PaefAgreement> {
    return this.http.patch<PaefAgreement>(
      `${this.basePath}/agreements/${encodeURIComponent(id)}`,
      payload,
    );
  }

  deleteAgreement(id: string): Observable<PaefAgreement> {
    return this.http.delete<PaefAgreement>(`${this.basePath}/agreements/${encodeURIComponent(id)}`);
  }

  // --- Benefit Pools ---

  getPools(agreementId: string): Observable<BenefitPool[]> {
    return this.http.get<BenefitPool[]>(
      `${this.basePath}/agreements/${encodeURIComponent(agreementId)}/pools`,
    );
  }

  getPool(poolId: string): Observable<BenefitPool> {
    return this.http.get<BenefitPool>(`${this.basePath}/pools/${encodeURIComponent(poolId)}`);
  }

  createPool(agreementId: string, payload: CreateBenefitPoolPayload): Observable<BenefitPool> {
    return this.http.post<BenefitPool>(
      `${this.basePath}/agreements/${encodeURIComponent(agreementId)}/pools`,
      payload,
    );
  }

  updatePool(poolId: string, payload: Partial<CreateBenefitPoolPayload>): Observable<BenefitPool> {
    return this.http.patch<BenefitPool>(
      `${this.basePath}/pools/${encodeURIComponent(poolId)}`,
      payload,
    );
  }

  // --- Employee Eligibility ---

  getEligibility(
    agreementId: string,
    options?: { search?: string; department?: string },
  ): Observable<EmployeeEligibility[]> {
    let params = new HttpParams();
    if (options?.search) {
      params = params.set('search', options.search);
    }
    if (options?.department) {
      params = params.set('department', options.department);
    }
    return this.http.get<EmployeeEligibility[]>(
      `${this.basePath}/agreements/${encodeURIComponent(agreementId)}/eligibility`,
      { params },
    );
  }

  createEligibility(
    agreementId: string,
    payload: CreateEmployeeEligibilityPayload,
  ): Observable<EmployeeEligibility> {
    return this.http.post<EmployeeEligibility>(
      `${this.basePath}/agreements/${encodeURIComponent(agreementId)}/eligibility`,
      payload,
    );
  }

  batchEligibility(
    agreementId: string,
    employees: CreateEmployeeEligibilityPayload[],
  ): Observable<{ importedCount: number; skippedCount: number; errors: string[] }> {
    return this.http.post<{ importedCount: number; skippedCount: number; errors: string[] }>(
      `${this.basePath}/agreements/${encodeURIComponent(agreementId)}/eligibility/batch`,
      { employees },
    );
  }

  updateEligibility(
    id: string,
    payload: Partial<CreateEmployeeEligibilityPayload>,
  ): Observable<EmployeeEligibility> {
    return this.http.patch<EmployeeEligibility>(
      `${this.basePath}/eligibility/${encodeURIComponent(id)}`,
      payload,
    );
  }

  revokeEligibility(id: string): Observable<EmployeeEligibility> {
    return this.http.delete<EmployeeEligibility>(
      `${this.basePath}/eligibility/${encodeURIComponent(id)}`,
    );
  }

  checkEligibility(params: {
    agreementId: string;
    email: string;
    employeeNumber?: string;
    branchId?: string;
  }): Observable<EligibilityCheckResult> {
    return this.http.post<EligibilityCheckResult>(`${this.basePath}/eligibility/check`, params);
  }

  // --- Benefit Debit & Logs ---

  reserveSession(payload: {
    agreementId: string;
    poolId: string;
    eligibilityId: string;
    branchId?: string;
    appointmentId?: string;
    patientId?: string;
    sessionQuantity?: number;
    reason?: string;
    metadata?: Record<string, any>;
  }): Observable<any> {
    return this.http.post<any>(`${this.basePath}/debit/reserve`, payload);
  }

  confirmSession(
    debitLogId: string,
    payload?: { reason?: string; metadata?: Record<string, any> },
  ): Observable<BenefitDebitLog> {
    return this.http.post<BenefitDebitLog>(
      `${this.basePath}/debit/${encodeURIComponent(debitLogId)}/confirm`,
      payload || {},
    );
  }

  releaseSession(
    debitLogId: string,
    payload: { reason: string; metadata?: Record<string, any> },
  ): Observable<BenefitDebitLog> {
    return this.http.post<BenefitDebitLog>(
      `${this.basePath}/debit/${encodeURIComponent(debitLogId)}/release`,
      payload,
    );
  }

  getDebitLogs(filters?: {
    agreementId?: string;
    poolId?: string;
    eligibilityId?: string;
    appointmentId?: string;
    status?: string;
  }): Observable<BenefitDebitLog[]> {
    let params = new HttpParams();
    if (filters?.agreementId) params = params.set('agreementId', filters.agreementId);
    if (filters?.poolId) params = params.set('poolId', filters.poolId);
    if (filters?.eligibilityId) params = params.set('eligibilityId', filters.eligibilityId);
    if (filters?.appointmentId) params = params.set('appointmentId', filters.appointmentId);
    if (filters?.status) params = params.set('status', filters.status);

    return this.http.get<BenefitDebitLog[]>(`${this.basePath}/debit/logs`, { params });
  }
}
