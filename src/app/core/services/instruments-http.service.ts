import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateInstrumentRequest,
  CreateInstrumentVersionRequest,
  Instrument,
  InstrumentVersion,
} from '../models/instrument.models';

@Injectable({ providedIn: 'root' })
export class InstrumentsHttpService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Get filtered active and published catalog for clinical assignment
   */
  getInstruments(): Observable<Instrument[]> {
    return this.http.get<Instrument[]>(`${this.apiUrl}/instruments/catalog`);
  }

  /**
   * Get filtered active and published catalog for clinical assignment
   */
  getClinicalCatalog(): Observable<Instrument[]> {
    return this.http.get<Instrument[]>(`${this.apiUrl}/instruments/catalog`);
  }

  /**
   * Get complete administrative catalog for tenant management
   */
  getManagementCatalog(): Observable<Instrument[]> {
    return this.http.get<Instrument[]>(
      `${this.apiUrl}/instruments/management/instruments`,
    );
  }

  /**
   * Get single instrument details with full version history
   */
  getInstrumentById(id: string): Observable<Instrument> {
    return this.http.get<Instrument>(`${this.apiUrl}/instruments/${id}`);
  }

  /**
   * Create custom tenant instrument
   */
  createInstrument(dto: CreateInstrumentRequest): Observable<Instrument> {
    return this.http.post<Instrument>(
      `${this.apiUrl}/instruments/management/instruments`,
      dto,
    );
  }

  /**
   * Toggle visibility (enable / disable) of an instrument for tenant
   */
  toggleVisibility(
    instrumentId: string,
    isEnabled: boolean,
  ): Observable<{ isEnabled: boolean }> {
    return this.http.patch<{ isEnabled: boolean }>(
      `${this.apiUrl}/instruments/management/instruments/${instrumentId}/visibility`,
      { isEnabled },
    );
  }

  /**
   * Create a new draft version (vN+1)
   */
  createVersion(
    instrumentId: string,
    dto?: Partial<CreateInstrumentVersionRequest>,
  ): Observable<InstrumentVersion> {
    return this.http.post<InstrumentVersion>(
      `${this.apiUrl}/instruments/management/instruments/${instrumentId}/versions`,
      dto ?? {},
    );
  }

  /**
   * Update an existing draft version definition & scoring spec
   */
  updateDraftVersion(
    instrumentId: string,
    versionId: string,
    dto: CreateInstrumentVersionRequest,
  ): Observable<InstrumentVersion> {
    return this.http.put<InstrumentVersion>(
      `${this.apiUrl}/instruments/management/instruments/${instrumentId}/versions/${versionId}`,
      dto,
    );
  }

  /**
   * Publish a draft version for clinical assignment
   */
  publishVersion(
    instrumentId: string,
    versionId: string,
  ): Observable<InstrumentVersion> {
    return this.http.post<InstrumentVersion>(
      `${this.apiUrl}/instruments/management/instruments/${instrumentId}/versions/${versionId}/publish`,
      {},
    );
  }

  /**
   * Deprecate an instrument version
   */
  deprecateVersion(
    instrumentId: string,
    versionId: string,
  ): Observable<InstrumentVersion> {
    return this.http.post<InstrumentVersion>(
      `${this.apiUrl}/instruments/management/instruments/${instrumentId}/versions/${versionId}/deprecate`,
      {},
    );
  }

  /**
   * Get version details by UUID
   */
  getVersionDetails(versionId: string): Observable<InstrumentVersion> {
    return this.http.get<InstrumentVersion>(
      `${this.apiUrl}/instruments/versions/${versionId}`,
    );
  }
}
