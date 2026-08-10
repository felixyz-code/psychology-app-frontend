import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CreateInvitationDialogComponent } from './create-invitation-dialog.component';

describe('CreateInvitationDialogComponent', () => {
  let fixture: ComponentFixture<CreateInvitationDialogComponent>;
  let component: CreateInvitationDialogComponent;
  const close = vi.fn();
  beforeEach(async () => {
    close.mockClear();
    await TestBed.configureTestingModule({
      imports: [CreateInvitationDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: { close } },
        { provide: MAT_DIALOG_DATA, useValue: null },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CreateInvitationDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('requires a valid email and role and never offers OWNER', () => {
    component.submit();
    expect(close).not.toHaveBeenCalled();
    expect(component.roleOptions).not.toContain('OWNER');
    component.form.setValue({ email: 'invalid', role: 'ADMIN' });
    expect(component.form.invalid).toBe(true);
  });

  it('trims valid input and prevents double submission', () => {
    component.form.setValue({ email: ' ana@example.com ', role: 'PSYCHOLOGIST' });
    component.submit();
    component.submit();
    expect(close).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledWith({ email: 'ana@example.com', role: 'PSYCHOLOGIST' });
  });
});
