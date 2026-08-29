import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SavingIndicatorComponent } from './saving-indicator.component';

describe('SavingIndicatorComponent', () => {
  let component: SavingIndicatorComponent;
  let fixture: ComponentFixture<SavingIndicatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SavingIndicatorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SavingIndicatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be invisible when status is idle', () => {
    expect(component.isVisible()).toBe(false);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.app-saving-indicator')).toBeFalsy();
  });

  it('should display saving state and spinner icon', () => {
    fixture.componentRef.setInput('status', 'saving');
    fixture.detectChanges();

    expect(component.isVisible()).toBe(true);
    const compiled = fixture.nativeElement as HTMLElement;
    const indicator = compiled.querySelector('.app-saving-indicator');
    expect(indicator).toBeTruthy();
    expect(indicator?.classList.contains('app-saving-indicator--saving')).toBe(true);
    expect(compiled.querySelector('.app-saving-indicator__text')?.textContent).toContain('Guardando cambios...');
    expect(compiled.querySelector('.app-saving-indicator__icon--spinning')).toBeTruthy();
  });

  it('should display saved state with success message', () => {
    fixture.componentRef.setInput('status', 'saved');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.app-saving-indicator--saved')).toBeTruthy();
    expect(compiled.querySelector('.app-saving-indicator__text')?.textContent).toContain('Guardado exitosamente');
  });

  it('should display error state with custom message', () => {
    fixture.componentRef.setInput('status', 'error');
    fixture.componentRef.setInput('errorText', 'Fallo de red al sincronizar');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.app-saving-indicator--error')).toBeTruthy();
    expect(compiled.querySelector('.app-saving-indicator__text')?.textContent).toContain('Fallo de red al sincronizar');
  });
});
