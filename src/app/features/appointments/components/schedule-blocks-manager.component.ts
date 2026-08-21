import { CommonModule, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';

import { localDateTimeValueToIso, toDateTimeLocalValue } from '../utils/appointment-datetime';
import { ScheduleBlock } from '../models/appointment.models';
import { AppointmentsService } from '../services/appointments.service';

@Component({
  selector: 'app-schedule-blocks-manager',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './schedule-blocks-manager.component.html',
  styleUrl: './schedule-blocks-manager.component.scss',
})
export class ScheduleBlocksManagerComponent {
  private readonly appointmentsService = inject(AppointmentsService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<ScheduleBlocksManagerComponent, boolean>);

  readonly displayedColumns = ['title', 'startTime', 'endTime', 'reason', 'actions'];
  readonly blocks = signal<ScheduleBlock[]>([]);
  readonly isLoading = signal(true);
  readonly isCreating = signal(false);
  readonly deletingBlockId = signal<string | null>(null);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly showCreateForm = signal(false);

  readonly blockForm = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(150)]],
    reason: [''],
    startTime: [toDateTimeLocalValue(new Date()), [Validators.required]],
    endTime: [
      toDateTimeLocalValue(new Date(Date.now() + 2 * 60 * 60 * 1000)),
      [Validators.required],
    ],
  });

  constructor() {
    this.loadBlocks();
  }

  loadBlocks(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.appointmentsService
      .getScheduleBlocks()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (blocks) => {
          this.blocks.set(blocks);
        },
        error: () => {
          this.errorMessage.set('No fue posible cargar los bloqueos de horario.');
        },
      });
  }

  toggleCreateForm(): void {
    this.showCreateForm.update((value) => !value);
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  createBlock(): void {
    if (this.blockForm.invalid || this.isCreating()) {
      this.blockForm.markAllAsTouched();
      return;
    }

    const { title, reason, startTime, endTime } = this.blockForm.getRawValue();
    const startIso = localDateTimeValueToIso(startTime);
    const endIso = localDateTimeValueToIso(endTime);

    if (new Date(startIso).getTime() >= new Date(endIso).getTime()) {
      this.errorMessage.set('La hora de inicio debe ser anterior a la hora de fin.');
      return;
    }

    this.isCreating.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.appointmentsService
      .createScheduleBlock({
        title: title.trim(),
        reason: reason?.trim() || undefined,
        startTime: startIso,
        endTime: endIso,
      })
      .pipe(finalize(() => this.isCreating.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set('Bloqueo de horario creado correctamente.');
          this.blockForm.reset({
            title: '',
            reason: '',
            startTime: toDateTimeLocalValue(new Date()),
            endTime: toDateTimeLocalValue(new Date(Date.now() + 2 * 60 * 60 * 1000)),
          });
          this.showCreateForm.set(false);
          this.loadBlocks();
        },
        error: (error: HttpErrorResponse) => {
          if (error.error?.message) {
            this.errorMessage.set(error.error.message);
          } else if (error.status === 400) {
            this.errorMessage.set('El bloqueo se traslapa con una cita o bloqueo existente.');
          } else {
            this.errorMessage.set('No fue posible crear el bloqueo de horario.');
          }
        },
      });
  }

  deleteBlock(block: ScheduleBlock): void {
    if (this.deletingBlockId()) {
      return;
    }

    this.deletingBlockId.set(block.id);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.appointmentsService
      .deleteScheduleBlock(block.id)
      .pipe(finalize(() => this.deletingBlockId.set(null)))
      .subscribe({
        next: () => {
          this.successMessage.set('Bloqueo eliminado correctamente.');
          this.loadBlocks();
        },
        error: () => {
          this.errorMessage.set('No fue posible eliminar el bloqueo de horario.');
        },
      });
  }

  close(): void {
    this.dialogRef.close(true);
  }
}
