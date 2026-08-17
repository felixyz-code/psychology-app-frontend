import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BillingStatementResponse,
  CorporateBillingStatementQueryParams,
  CorporateReportQueryParams,
  ExecutiveReportResponse,
} from '../models/corporate.models';

@Injectable({ providedIn: 'root' })
export class CorporateReportsService {
  private readonly http = inject(HttpClient);
  private readonly basePath = `${environment.apiUrl}/enterprise/corporate/agreements`;

  /**
   * Fetches aggregated executive report with Zero ePHI Leakage and k-anonymity (k >= 5).
   */
  getExecutiveReport(
    agreementId: string,
    params?: CorporateReportQueryParams,
  ): Observable<ExecutiveReportResponse> {
    let httpParams = new HttpParams();
    if (params?.startDate) {
      httpParams = httpParams.set('startDate', params.startDate);
    }
    if (params?.endDate) {
      httpParams = httpParams.set('endDate', params.endDate);
    }
    if (params?.branchId) {
      httpParams = httpParams.set('branchId', params.branchId);
    }

    return this.http.get<ExecutiveReportResponse>(
      `${this.basePath}/${encodeURIComponent(agreementId)}/reports/executive`,
      { params: httpParams },
    );
  }

  /**
   * Fetches monthly billing reconciliation statement for corporate B2B settlement.
   */
  getBillingStatement(
    agreementId: string,
    params?: CorporateBillingStatementQueryParams,
  ): Observable<BillingStatementResponse> {
    let httpParams = new HttpParams();
    if (params?.startDate) {
      httpParams = httpParams.set('startDate', params.startDate);
    }
    if (params?.endDate) {
      httpParams = httpParams.set('endDate', params.endDate);
    }
    if (params?.branchId) {
      httpParams = httpParams.set('branchId', params.branchId);
    }
    if (params?.unitPrice !== undefined) {
      httpParams = httpParams.set('unitPrice', String(params.unitPrice));
    }

    return this.http.get<BillingStatementResponse>(
      `${this.basePath}/${encodeURIComponent(agreementId)}/reports/billing-statement`,
      { params: httpParams },
    );
  }

  /**
   * Downloads the UTF-8 BOM CSV export directly.
   */
  downloadBillingCsv(
    agreementId: string,
    params?: CorporateBillingStatementQueryParams,
  ): Observable<Blob> {
    let httpParams = new HttpParams();
    if (params?.startDate) {
      httpParams = httpParams.set('startDate', params.startDate);
    }
    if (params?.endDate) {
      httpParams = httpParams.set('endDate', params.endDate);
    }
    if (params?.branchId) {
      httpParams = httpParams.set('branchId', params.branchId);
    }
    if (params?.unitPrice !== undefined) {
      httpParams = httpParams.set('unitPrice', String(params.unitPrice));
    }

    return this.http.get(
      `${this.basePath}/${encodeURIComponent(agreementId)}/reports/export/csv`,
      {
        params: httpParams,
        responseType: 'blob',
      },
    );
  }
}
