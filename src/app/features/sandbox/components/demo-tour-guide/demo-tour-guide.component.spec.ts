import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DemoTourGuideComponent } from './demo-tour-guide.component';
import { SandboxStateService } from '../../services/sandbox-state.service';

describe('DemoTourGuideComponent', () => {
  let component: DemoTourGuideComponent;
  let fixture: ComponentFixture<DemoTourGuideComponent>;
  let sandboxState: SandboxStateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DemoTourGuideComponent],
      providers: [provideRouter([]), SandboxStateService],
    }).compileComponents();

    fixture = TestBed.createComponent(DemoTourGuideComponent);
    component = fixture.componentInstance;
    sandboxState = TestBed.inject(SandboxStateService);
    fixture.detectChanges();
  });

  it('should create the tour guide component with 5 steps initialized at step 0', () => {
    expect(component).toBeTruthy();
    expect(component.steps.length).toBe(5);
    expect(component.currentStepIndex()).toBe(0);
    expect(component.isFirstStep()).toBe(true);
    expect(component.isLastStep()).toBe(false);
  });

  it('should advance steps and update sandbox active view when nextStep is called', () => {
    component.nextStep();
    expect(component.currentStepIndex()).toBe(1);
    expect(sandboxState.activeView()).toBe('soap');

    component.nextStep();
    expect(component.currentStepIndex()).toBe(2);
    expect(sandboxState.activeView()).toBe('psychometrics');
  });

  it('should navigate backwards when prevStep is called', () => {
    component.goToStep(3);
    expect(component.currentStepIndex()).toBe(3);
    expect(sandboxState.activeView()).toBe('teleconsultation');

    component.prevStep();
    expect(component.currentStepIndex()).toBe(2);
    expect(sandboxState.activeView()).toBe('psychometrics');
  });

  it('should minimize and maximize the tour card', () => {
    expect(component.isMinimized()).toBe(false);
    component.toggleMinimize();
    expect(component.isMinimized()).toBe(true);
    component.toggleMinimize();
    expect(component.isMinimized()).toBe(false);
  });

  it('should finish tour on the last step and emit tourCompleted', () => {
    let completedEmitted = false;
    component.tourCompleted.subscribe(() => {
      completedEmitted = true;
    });

    component.goToStep(4);
    expect(component.isLastStep()).toBe(true);

    component.nextStep();
    expect(completedEmitted).toBe(true);
    expect(component.isMinimized()).toBe(true);
  });

  it('should restart tour back to step 0 and view dashboard', () => {
    component.goToStep(3);
    component.restartTour();
    expect(component.currentStepIndex()).toBe(0);
    expect(component.isMinimized()).toBe(false);
    expect(sandboxState.activeView()).toBe('dashboard');
  });
});
