import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ButtonSpinnerDirective } from './button-spinner.directive';

@Component({
  template: `
    <button [appButtonSpinner]="isLoading()" [loadingText]="customText()">
      Guardar
    </button>
  `,
  imports: [ButtonSpinnerDirective],
  standalone: true,
})
class TestHostComponent {
  readonly isLoading = signal(false);
  readonly customText = signal<string | null>(null);
}

describe('ButtonSpinnerDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let hostComponent: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render normal state when loading is false', () => {
    const buttonEl = fixture.debugElement.query(By.css('button')).nativeElement as HTMLButtonElement;
    expect(buttonEl.disabled).toBe(false);
    expect(buttonEl.getAttribute('aria-busy')).toBe('false');
    expect(buttonEl.querySelector('.app-button-spinner__spinner')).toBeFalsy();
  });

  it('should disable button and render spinner when loading is true', () => {
    hostComponent.isLoading.set(true);
    fixture.detectChanges();

    const buttonEl = fixture.debugElement.query(By.css('button')).nativeElement as HTMLButtonElement;
    expect(buttonEl.disabled).toBe(true);
    expect(buttonEl.getAttribute('aria-busy')).toBe('true');
    expect(buttonEl.querySelector('.app-button-spinner__spinner')).toBeTruthy();
  });

  it('should restore button state when loading reverts to false', () => {
    hostComponent.isLoading.set(true);
    fixture.detectChanges();

    hostComponent.isLoading.set(false);
    fixture.detectChanges();

    const buttonEl = fixture.debugElement.query(By.css('button')).nativeElement as HTMLButtonElement;
    expect(buttonEl.disabled).toBe(false);
    expect(buttonEl.getAttribute('aria-busy')).toBe('false');
    expect(buttonEl.querySelector('.app-button-spinner__spinner')).toBeFalsy();
  });

  it('should prevent click event propagation while loading', () => {
    hostComponent.isLoading.set(true);
    fixture.detectChanges();

    const buttonEl = fixture.debugElement.query(By.css('button')).nativeElement as HTMLButtonElement;
    let clicked = false;
    buttonEl.addEventListener('click', () => {
      clicked = true;
    });

    const event = new MouseEvent('click', { cancelable: true, bubbles: true });
    buttonEl.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });
});
