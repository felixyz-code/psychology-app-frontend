import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { TENANT_HTTP_MODE } from '../../../core/tenant-context/tenant-http-context';
import {
  Appointment,
  AvailabilityQuery,
  AvailabilityResponse,
  CreateAppointmentRequest,
  CreateScheduleBlockRequest,
  QueryScheduleBlocksParams,
  PublicTeleconsultationRoom,
  RescheduleAppointmentRequest,
  ScheduleBlock,
  TeleconsultationRoom,
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

  rescheduleAppointment(
    id: string,
    payload: RescheduleAppointmentRequest,
  ): Observable<Appointment> {
    return this.http.post<Appointment>(`${this.apiUrl}/appointments/${id}/reschedule`, payload);
  }

  getAvailability(query: AvailabilityQuery): Observable<AvailabilityResponse> {
    let params = new HttpParams()
      .set('therapistId', query.therapistId)
      .set('date', query.date);

    if (query.durationMinutes) {
      params = params.set('durationMinutes', query.durationMinutes.toString());
    }
    if (query.startHour !== undefined) {
      params = params.set('startHour', query.startHour.toString());
    }
    if (query.endHour !== undefined) {
      params = params.set('endHour', query.endHour.toString());
    }

    return this.http.get<AvailabilityResponse>(`${this.apiUrl}/appointments/availability`, {
      params,
    });
  }

  getScheduleBlocks(queryParams?: QueryScheduleBlocksParams): Observable<ScheduleBlock[]> {
    let params = new HttpParams();
    if (queryParams?.therapistId) {
      params = params.set('therapistId', queryParams.therapistId);
    }
    if (queryParams?.startDate) {
      params = params.set('startDate', queryParams.startDate);
    }
    if (queryParams?.endDate) {
      params = params.set('endDate', queryParams.endDate);
    }

    return this.http.get<ScheduleBlock[]>(`${this.apiUrl}/schedule-blocks`, { params });
  }

  createScheduleBlock(payload: CreateScheduleBlockRequest): Observable<ScheduleBlock> {
    return this.http.post<ScheduleBlock>(`${this.apiUrl}/schedule-blocks`, payload);
  }

  deleteScheduleBlock(id: string): Observable<ScheduleBlock> {
    return this.http.delete<ScheduleBlock>(`${this.apiUrl}/schedule-blocks/${id}`);
  }

  // ─── Teleconsultation ──────────────────────────────────────────────────────

  createTeleconsultationRoom(appointmentId: string): Observable<TeleconsultationRoom> {
    return this.http.post<TeleconsultationRoom>(
      `${this.apiUrl}/appointments/${appointmentId}/teleconsultation-room`,
      {},
    );
  }

  getTeleconsultationRoom(appointmentId: string): Observable<TeleconsultationRoom> {
    return this.http.get<TeleconsultationRoom>(
      `${this.apiUrl}/appointments/${appointmentId}/teleconsultation-room`,
    );
  }

  activateTeleconsultationRoom(appointmentId: string): Observable<TeleconsultationRoom> {
    return this.http.post<TeleconsultationRoom>(
      `${this.apiUrl}/appointments/${appointmentId}/teleconsultation-room/activate`,
      {},
    );
  }

  terminateTeleconsultationRoom(appointmentId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/appointments/${appointmentId}/teleconsultation-room`,
    );
  }

  getPublicTeleconsultationRoom(
    roomCode: string,
    token: string,
  ): Observable<PublicTeleconsultationRoom> {
    const params = new HttpParams().set('token', token);
    const context = new HttpContext().set(TENANT_HTTP_MODE, 'PUBLIC');
    return this.http.get<PublicTeleconsultationRoom>(
      `${this.apiUrl}/teleconsultation/access/${roomCode}`,
      { params, context },
    );
  }
}

