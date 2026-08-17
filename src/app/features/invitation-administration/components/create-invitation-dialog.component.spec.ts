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
    component.form.setValue({ email: `${'a'.repeat(244)}@example.com`, role: 'ADMIN' });
    expect(component.form.controls.email.hasError('maxlength')).toBe(true);
  });

  it('keeps whitespace while editing, normalizes on blur, and submits the trimmed email once', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector(
      'input[formControlName="email"]',
    );
    const submitButton: HTMLButtonElement =
      fixture.nativeElement.querySelector('button[type="submit"]');
    input.value = '  ana@example.com  ';
    input.dispatchEvent(new Event('input'));
    component.form.controls.role.setValue('PSYCHOLOGIST');
    fixture.detectChanges();

    expect(component.form.controls.email.value).toBe('  ana@example.com  ');
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(component.form.controls.email.value).toBe('ana@example.com');
    submitButton.click();
    submitButton.click();
    expect(close).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledWith({ email: 'ana@example.com', role: 'PSYCHOLOGIST' });
  });

  it('trims the email during submit when blur did not occur', () => {
    component.form.setValue({ email: '  ana@example.com  ', role: 'PSYCHOLOGIST' });

    component.submit();

    expect(close).toHaveBeenCalledWith({ email: 'ana@example.com', role: 'PSYCHOLOGIST' });
  });
});
