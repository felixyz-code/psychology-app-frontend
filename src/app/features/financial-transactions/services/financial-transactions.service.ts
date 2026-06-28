import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  CreateFinancialTransactionDto,
  FindFinancialTransactionsQueryDto,
  FinancialTransactionResponse,
  FinancialTransactionSummaryDto,
  UpdateFinancialTransactionDto,
} from '../models/financial-transaction.models';

@Injectable({ providedIn: 'root' })
export class FinancialTransactionsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly basePath = `${this.apiUrl}/financial-transactions`;

  create(payload: CreateFinancialTransactionDto): Observable<FinancialTransactionResponse> {
    return this.http.post<FinancialTransactionResponse>(this.basePath, payload);
  }

  findAll(query?: FindFinancialTransactionsQueryDto): Observable<FinancialTransactionResponse[]> {
    return this.http.get<FinancialTransactionResponse[]>(this.basePath, {
      params: this.buildQueryParams(query),
    });
  }

  findSummary(query?: FindFinancialTransactionsQueryDto): Observable<FinancialTransactionSummaryDto> {
    return this.http.get<FinancialTransactionSummaryDto>(`${this.basePath}/summary`, {
      params: this.buildQueryParams(query),
    });
  }

  findOne(id: string): Observable<FinancialTransactionResponse> {
    return this.http.get<FinancialTransactionResponse>(`${this.basePath}/${id}`);
  }

  update(id: string, payload: UpdateFinancialTransactionDto): Observable<FinancialTransactionResponse> {
    return this.http.patch<FinancialTransactionResponse>(`${this.basePath}/${id}`, payload);
  }

  remove(id: string): Observable<FinancialTransactionResponse> {
    return this.http.delete<FinancialTransactionResponse>(`${this.basePath}/${id}`);
  }

  private buildQueryParams(query?: FindFinancialTransactionsQueryDto): HttpParams | undefined {
    if (!query) {
      return undefined;
    }

    let params = new HttpParams();

    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value);
      }
    }

    return params;
  }
}
