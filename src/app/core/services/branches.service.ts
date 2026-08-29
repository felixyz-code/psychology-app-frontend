import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AssignProfessionalBranchDto,
  AssignUserBranchDto,
  Branch,
  BranchProfessionalScheduleItem,
  CreateBranchDto,
  UpdateBranchDto,
  UpdateProfessionalScheduleDto,
  UserBranchAccess,
} from '../models/branch.models';

@Injectable({ providedIn: 'root' })
export class BranchesService {
  private readonly http = inject(HttpClient);
  private readonly basePath = `${environment.apiUrl}/enterprise/branches`;

  create(dto: CreateBranchDto): Observable<Branch> {
    return this.http.post<Branch>(this.basePath, dto);
  }

  findAll(options?: { includeInactive?: boolean }): Observable<Branch[]> {
    let params = new HttpParams();
    if (options?.includeInactive !== undefined) {
      params = params.set('includeInactive', String(options.includeInactive));
    }
    return this.http.get<Branch[]>(this.basePath, { params });
  }

  getMyBranches(): Observable<UserBranchAccess[]> {
    return this.http.get<UserBranchAccess[]>(`${this.basePath}/me/accesses`);
  }

  findOne(id: string): Observable<Branch> {
    return this.http.get<Branch>(`${this.basePath}/${encodeURIComponent(id)}`);
  }

  update(id: string, dto: UpdateBranchDto): Observable<Branch> {
    return this.http.patch<Branch>(`${this.basePath}/${encodeURIComponent(id)}`, dto);
  }

  remove(id: string): Observable<{ success: boolean; message?: string }> {
    return this.http.delete<{ success: boolean; message?: string }>(
      `${this.basePath}/${encodeURIComponent(id)}`,
    );
  }

  assignUser(branchId: string, dto: AssignUserBranchDto): Observable<UserBranchAccess> {
    return this.http.post<UserBranchAccess>(
      `${this.basePath}/${encodeURIComponent(branchId)}/users`,
      dto,
    );
  }

  removeUserAccess(
    branchId: string,
    userId: string,
  ): Observable<{ success: boolean; message?: string }> {
    return this.http.delete<{ success: boolean; message?: string }>(
      `${this.basePath}/${encodeURIComponent(branchId)}/users/${encodeURIComponent(userId)}`,
    );
  }

  getBranchUsers(branchId: string): Observable<UserBranchAccess[]> {
    return this.http.get<UserBranchAccess[]>(
      `${this.basePath}/${encodeURIComponent(branchId)}/users`,
    );
  }

  getBranchProfessionals(branchId: string): Observable<BranchProfessionalScheduleItem[]> {
    return this.http.get<BranchProfessionalScheduleItem[]>(
      `${this.basePath}/${encodeURIComponent(branchId)}/professionals`,
    );
  }

  assignProfessional(
    branchId: string,
    dto: AssignProfessionalBranchDto,
  ): Observable<BranchProfessionalScheduleItem> {
    return this.http.post<BranchProfessionalScheduleItem>(
      `${this.basePath}/${encodeURIComponent(branchId)}/professionals`,
      dto,
    );
  }

  updateProfessionalSchedule(
    branchId: string,
    userId: string,
    dto: UpdateProfessionalScheduleDto,
  ): Observable<{ success: boolean; count: number }> {
    return this.http.put<{ success: boolean; count: number }>(
      `${this.basePath}/${encodeURIComponent(branchId)}/professionals/${encodeURIComponent(userId)}/schedule`,
      dto,
    );
  }

  removeProfessional(
    branchId: string,
    userId: string,
  ): Observable<{ success: boolean; message?: string }> {
    return this.http.delete<{ success: boolean; message?: string }>(
      `${this.basePath}/${encodeURIComponent(branchId)}/professionals/${encodeURIComponent(userId)}`,
    );
  }
}
