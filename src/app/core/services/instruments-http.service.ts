import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Instrument, InstrumentVersion } from '../models/instrument.models';

@Injectable({ providedIn: 'root' })
export class InstrumentsHttpService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getInstruments(): Observable<Instrument[]> {
    return this.http.get<Instrument[]>(`${this.apiUrl}/instruments`);
  }

  getInstrumentById(id: string): Observable<Instrument> {
    return this.http.get<Instrument>(`${this.apiUrl}/instruments/${id}`);
  }

  getVersionDetails(versionId: string): Observable<InstrumentVersion> {
    return this.http.get<InstrumentVersion>(`${this.apiUrl}/instruments/versions/${versionId}`);
  }
}
