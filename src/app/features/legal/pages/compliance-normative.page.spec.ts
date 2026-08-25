import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ComplianceNormativePage } from './compliance-normative.page';
import { I18nService } from '../../../core/i18n/i18n.service';

describe('ComplianceNormativePage', () => {
  let component: ComplianceNormativePage;
  let fixture: ComponentFixture<ComplianceNormativePage>;
  let i18nService: I18nService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComplianceNormativePage],
      providers: [provideRouter([]), I18nService],
    }).compileComponents();

    fixture = TestBed.createComponent(ComplianceNormativePage);
    component = fixture.componentInstance;
    i18nService = TestBed.inject(I18nService);
    fixture.detectChanges();
  });

  it('should create the compliance normative page component', () => {
    expect(component).toBeTruthy();
  });

  it('should render the compliance title and normative badges', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.legal-card__title')).toBeTruthy();
    expect(compiled.textContent).toContain('NOM-004-SSA3-2012');
    expect(compiled.textContent).toContain('NOM-024-SSA3-2012');
  });

  it('should render all 5 compliance sections', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const sections = compiled.querySelectorAll('.legal-section');
    expect(sections.length).toBe(5);
  });

  it('should trigger printDocument safely without error', () => {
    expect(() => component.printDocument()).not.toThrow();
  });
});
