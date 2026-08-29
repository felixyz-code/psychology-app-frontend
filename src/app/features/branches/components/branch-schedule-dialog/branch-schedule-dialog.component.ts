import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';

import {
  Branch,
  BranchProfessionalScheduleItem,
  ScheduleSlot,
} from '../../../../core/models/branch.models';
import { BranchesService } from '../../../../core/services/branches.service';
import { ToastService } from '../../../../core/services/toast.service';
import { MembershipsService } from '../../../membership-administration/services/memberships.service';
import { TenantContextStore } from '../../../../core/tenant-context/tenant-context.store';

export interface BranchScheduleDialogData {
  branch: Branch;
}

export interface StaffOption {
  userId: string;
  name: string;
  email: string;
  slots: ScheduleSlot[];
}

export const DAYS_OF_WEEK = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

export function timeRangeValidator(control: AbstractControl): ValidationErrors | null {
  const startTime = control.get('startTime')?.value;
  const endTime = control.get('endTime')?.value;

  if (!startTime || !endTime) {
    return null;
  }

  return startTime < endTime ? null : { invalidTimeRange: true };
}

@Component({
  selector: 'app-branch-schedule-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatTooltipModule,
  ],
  templateUrl: './branch-schedule-dialog.component.html',
  styleUrl: './branch-schedule-dialog.component.scss',
})
export class BranchScheduleDialogComponent implements OnInit {
  readonly data = inject<BranchScheduleDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<BranchScheduleDialogComponent>);
  private readonly branchesService = inject(BranchesService);
  private readonly membershipsService = inject(MembershipsService);
  private readonly tenantContextStore = inject(TenantContextStore);
  private readonly toastService = inject(ToastService, { optional: true });
  private readonly fb = inject(FormBuilder);

  readonly daysOfWeek = DAYS_OF_WEEK;
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly professionals = signal<BranchProfessionalScheduleItem[]>([]);
  readonly selectedProfessionalId = signal<string | null>(null);
  readonly unassignedStaff = signal<{ userId: string; name: string; displayName: string; email: string }[]>([]);

  // Selected New Staff to Assign
  selectedNewStaffId: string | null = null;

  // New Therapist Control for tests/compat
  readonly newTherapistControl = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  // Schedules Form Array & ScheduleForm Group
  readonly slotsFormArray = this.fb.array<FormGroup>([]);
  readonly schedulesFormArray = this.slotsFormArray;
  readonly scheduleForm = this.fb.group({
    slots: this.slotsFormArray,
  });

  // Canonical Signals & Computeds
  readonly assignedStaff = computed<StaffOption[]>(() => {
    return this.professionals().map((p) => ({
      userId: p.userId,
      name: p.user?.displayName || p.user?.name || p.user?.email || 'Terapeuta',
      email: p.user?.email || '',
      slots: p.schedules || [],
    }));
  });

  readonly selectedUserId = computed<string | null>(() => this.selectedProfessionalId());

  readonly selectedStaff = computed<StaffOption | null>(() => {
    const id = this.selectedProfessionalId();
    if (!id) return null;
    return this.assignedStaff().find((s) => s.userId === id) ?? null;
  });

  readonly selectedProfessional = computed(() => {
    const id = this.selectedProfessionalId();
    if (!id) return null;
    return this.professionals().find((p) => p.userId === id) ?? null;
  });

  ngOnInit(): void {
    void this.loadData();
  }

  async loadData(keepMessages = false): Promise<void> {
    this.isLoading.set(true);
    if (!keepMessages) {
      this.errorMessage.set('');
      this.successMessage.set('');
    }

    const orgId = this.tenantContextStore.selectedOrganizationId();
    if (!orgId) {
      this.errorMessage.set('Organización no identificada.');
      this.isLoading.set(false);
      return;
    }

    try {
      const [profs, members] = await Promise.all([
        firstValueFrom(this.branchesService.getBranchProfessionals(this.data.branch.id)),
        firstValueFrom(this.membershipsService.list(orgId)),
      ]);

      this.professionals.set(profs);

      // Filter unassigned therapists/psychologists (clinical roles only, excluding reception/administrative roles)
      const CLINICAL_ROLES = new Set(['PSYCHOLOGIST', 'OWNER', 'ADMIN']);
      const assignedIds = new Set(profs.map((p) => p.userId));
      const unassigned = members
        .filter(
          (m) =>
            !assignedIds.has(m.userId) &&
            (m.status === 'ACTIVE' || !m.status) &&
            CLINICAL_ROLES.has(m.role),
        )
        .map((m) => ({
          userId: m.userId,
          name: m.displayName || m.email,
          displayName: m.displayName || m.email,
          email: m.email,
          role: m.role,
        }));
      this.unassignedStaff.set(unassigned);

      // Auto-select first professional if none selected
      if (profs.length > 0 && !this.selectedProfessionalId()) {
        this.selectProfessional(profs[0].userId, !keepMessages);
      } else if (this.selectedProfessionalId()) {
        this.selectProfessional(this.selectedProfessionalId()!, !keepMessages);
      }
    } catch (err: unknown) {
      this.errorMessage.set('No fue posible cargar los terapeutas y horarios de la sede.');
    } finally {
      this.isLoading.set(false);
    }
  }

  onSelectStaff(userId: string): void {
    this.selectProfessional(userId);
  }

  selectProfessional(userId: string, clearMessages = true): void {
    this.selectedProfessionalId.set(userId);
    if (clearMessages) {
      this.errorMessage.set('');
      this.successMessage.set('');
    }

    const prof = this.professionals().find((p) => p.userId === userId);
    this.slotsFormArray.clear();

    if (prof && prof.schedules && prof.schedules.length > 0) {
      for (const slot of prof.schedules) {
        this.addSlot(slot);
      }
    }
  }

  createSlotGroup(slot?: ScheduleSlot): FormGroup {
    return this.fb.group(
      {
        dayOfWeek: new FormControl<number>(slot?.dayOfWeek ?? 1, {
          nonNullable: true,
          validators: [Validators.required, Validators.min(0), Validators.max(6)],
        }),
        startTime: new FormControl<string>(slot?.startTime ?? '09:00', {
          nonNullable: true,
          validators: [
            Validators.required,
            Validators.pattern(/^([01]\d|2[0-3]):[0-5]\d$/),
          ],
        }),
        endTime: new FormControl<string>(slot?.endTime ?? '14:00', {
          nonNullable: true,
          validators: [
            Validators.required,
            Validators.pattern(/^([01]\d|2[0-3]):[0-5]\d$/),
          ],
        }),
        durationSlotMinutes: new FormControl<number>(slot?.durationSlotMinutes ?? 60, {
          nonNullable: true,
          validators: [Validators.required, Validators.min(15), Validators.max(240)],
        }),
        isActive: new FormControl<boolean>(slot?.isActive ?? true, {
          nonNullable: true,
        }),
      },
      { validators: [timeRangeValidator] },
    );
  }

  addSlot(slot?: ScheduleSlot): void {
    this.slotsFormArray.push(this.createSlotGroup(slot));
  }

  addSlotToForm(slot?: ScheduleSlot): void {
    this.addSlot(slot);
  }

  removeSlot(index: number): void {
    this.slotsFormArray.removeAt(index);
  }

  getDayName(dayOfWeek: number): string {
    const day = this.daysOfWeek.find((d) => d.value === dayOfWeek);
    return day ? day.label : `Día ${dayOfWeek}`;
  }

  async onSaveSchedule(): Promise<void> {
    await this.saveSchedules();
  }

  async saveSchedules(): Promise<void> {
    const prof = this.selectedProfessional();
    if (!prof) return;

    if (this.scheduleForm.invalid) {
      this.scheduleForm.markAllAsTouched();
      const msg = 'Por favor corrige las franjas horarias marcadas en rojo (la hora de inicio debe ser anterior a la de fin).';
      this.errorMessage.set(msg);
      this.toastService?.error(msg);
      return;
    }

    const rawValues = this.slotsFormArray.getRawValue() as ScheduleSlot[];

    // Validate startTime < endTime
    for (let i = 0; i < rawValues.length; i++) {
      const slot = rawValues[i];
      if (slot.startTime >= slot.endTime) {
        const msg = `La hora de inicio (${slot.startTime}) debe ser anterior a la hora de fin (${slot.endTime}) en la franja #${i + 1}.`;
        this.errorMessage.set(msg);
        this.toastService?.error(msg);
        return;
      }
    }

    this.isSaving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      await firstValueFrom(
        this.branchesService.updateProfessionalSchedule(this.data.branch.id, prof.userId, {
          schedules: rawValues,
        }),
      );

      const successMsg = `Horarios semanales guardados para ${prof.user?.displayName || prof.user?.email || 'el terapeuta'}.`;
      this.successMessage.set(successMsg);
      this.toastService?.success(successMsg);
      await this.loadData(true);
    } catch (err: unknown) {
      const msg = err instanceof HttpErrorResponse ? err.error?.message : null;
      const errorMsg = msg || 'Ocurrió un error al guardar los horarios.';
      this.errorMessage.set(errorMsg);
      this.toastService?.error(errorMsg);
    } finally {
      this.isSaving.set(false);
    }
  }

  async onAssignStaff(): Promise<void> {
    const userId = this.selectedNewStaffId || this.newTherapistControl.value;
    if (!userId) return;

    this.isSaving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      await firstValueFrom(
        this.branchesService.assignProfessional(this.data.branch.id, {
          userId,
          isPrimary: false,
          schedules: [
            {
              dayOfWeek: 1,
              startTime: '09:00',
              endTime: '14:00',
              durationSlotMinutes: 60,
              isActive: true,
            },
          ],
        }),
      );

      this.selectedNewStaffId = null;
      this.newTherapistControl.reset();
      const msg = 'Terapeuta asignado exitosamente a la sede.';
      this.successMessage.set(msg);
      this.toastService?.success(msg);
      this.selectedProfessionalId.set(userId);
      await this.loadData();
    } catch (err: unknown) {
      const msg = err instanceof HttpErrorResponse ? err.error?.message : null;
      const errorMsg = msg || 'Error al asignar el terapeuta a la sede.';
      this.errorMessage.set(errorMsg);
      this.toastService?.error(errorMsg);
    } finally {
      this.isSaving.set(false);
    }
  }

  async assignTherapist(): Promise<void> {
    await this.onAssignStaff();
  }

  async onUnassignStaff(userId: string): Promise<void> {
    const prof = this.professionals().find((p) => p.userId === userId);
    if (!prof) return;
    await this.removeTherapist(prof);
  }

  async removeTherapist(prof: BranchProfessionalScheduleItem): Promise<void> {
    const name = prof.user?.displayName || prof.user?.email || 'el profesional';
    if (!confirm(`¿Estás seguro de desasignar a ${name} de esta sede? Se removerán sus franjas presenciales.`)) {
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      await firstValueFrom(
        this.branchesService.removeProfessional(this.data.branch.id, prof.userId),
      );

      const msg = `Terapeuta desasignado de ${this.data.branch.name}.`;
      this.successMessage.set(msg);
      this.toastService?.info(msg);
      if (this.selectedProfessionalId() === prof.userId) {
        this.selectedProfessionalId.set(null);
      }
      await this.loadData();
    } catch (err: unknown) {
      const msg = 'Error al desasignar el terapeuta.';
      this.errorMessage.set(msg);
      this.toastService?.error(msg);
    } finally {
      this.isSaving.set(false);
    }
  }

  close(): void {
    this.dialogRef.close(true);
  }
}
