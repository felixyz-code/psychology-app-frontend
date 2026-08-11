import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { MembershipListItem } from '../models/membership.models';
import {
  OwnershipTransferConfirmDialogComponent,
  OwnershipTransferConfirmDialogData,
} from './ownership-transfer-confirm-dialog.component';

describe('OwnershipTransferConfirmDialogComponent', () => {
  let fixture: ComponentFixture<OwnershipTransferConfirmDialogComponent>;
  let component: OwnershipTransferConfirmDialogComponent;
  let close: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    close = vi.fn();
    const data: OwnershipTransferConfirmDialogData = {
      target: createMembership(),
      organizationName: 'Consultorio Rivera',
    };

    await TestBed.configureTestingModule({
      imports: [OwnershipTransferConfirmDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: { close } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OwnershipTransferConfirmDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows target identity, organization and the full ownership impact', () => {
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Ana Admin');
    expect(text).toContain('ana@example.com');
    expect(text).toContain('Consultorio Rivera');
    expect(text).toContain('pasará a ser Propietario');
    expect(text).toContain('pasará a ser Administrador');
    expect(text).toContain('permisos se actualizarán inmediatamente');
    expect(text).toContain('acciones exclusivas del Propietario');
  });

  it('provides a single strong confirmation and a cancel action in a responsive dialog structure', () => {
    expect(fixture.nativeElement.querySelector('mat-dialog-content')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('mat-dialog-actions')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Transferir propiedad');
    expect(fixture.nativeElement.textContent).toContain('Cancelar');
    expect(fixture.nativeElement.querySelectorAll('button').length).toBe(2);
  });

  it('closes with confirmation or cancellation', () => {
    component.confirm();
    component.cancel();

    expect(close).toHaveBeenNthCalledWith(1, true);
    expect(close).toHaveBeenNthCalledWith(2, false);
  });
});

function createMembership(): MembershipListItem {
  return {
    id: 'membership-target',
    userId: 'user-target',
    displayName: 'Ana Admin',
    email: 'ana@example.com',
    role: 'ADMIN',
    status: 'ACTIVE',
    joinedAt: '2026-01-01T00:00:00.000Z',
    suspendedAt: null,
    revokedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-08-10T12:00:00.000Z',
    allowedActions: [],
  };
}
