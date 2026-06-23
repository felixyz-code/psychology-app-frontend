import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  Appointment,
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
} from '../models/appointment.models';

@Injectable({ providedIn: 'root' })
export class AppointmentsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getAppointments(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.apiUrl}/appointments`);
  }

  getAppointmentsByPatientId(patientId: string): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.apiUrl}/appointments/patient/${patientId}`);
  }

  getAppointmentById(id: string): Observable<Appointment> {
    return this.http.get<Appointment>(`${this.apiUrl}/appointments/${id}`);
  }

  createAppointment(payload: CreateAppointmentRequest): Observable<Appointment> {
    return this.http.post<Appointment>(`${this.apiUrl}/appointments`, payload);
  }

  updateAppointment(id: string, payload: UpdateAppointmentRequest): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.apiUrl}/appointments/${id}`, payload);
  }

  deleteAppointment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/appointments/${id}`);
  }
}
