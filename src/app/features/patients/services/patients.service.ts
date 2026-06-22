import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  CreatePatientRequest,
  Patient,
  UpdatePatientRequest,
} from '../models/patient.models';

@Injectable({ providedIn: 'root' })
export class PatientsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getPatients(): Observable<Patient[]> {
    return this.http.get<Patient[]>(`${this.apiUrl}/patients`);
  }

  getPatientById(id: string): Observable<Patient> {
    return this.http.get<Patient>(`${this.apiUrl}/patients/${id}`);
  }

  createPatient(payload: CreatePatientRequest): Observable<Patient> {
    return this.http.post<Patient>(`${this.apiUrl}/patients`, payload);
  }

  updatePatient(id: string, payload: UpdatePatientRequest): Observable<Patient> {
    return this.http.patch<Patient>(`${this.apiUrl}/patients/${id}`, payload);
  }

  deletePatient(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/patients/${id}`);
  }
}
