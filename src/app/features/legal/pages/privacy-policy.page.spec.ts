import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PrivacyPolicyPage } from './privacy-policy.page';
import { I18nService } from '../../../core/i18n/i18n.service';

describe('PrivacyPolicyPage', () => {
  let component: PrivacyPolicyPage;
  let fixture: ComponentFixture<PrivacyPolicyPage>;
  let i18nService: I18nService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrivacyPolicyPage],
      providers: [provideRouter([]), I18nService],
    }).compileComponents();

    fixture = TestBed.createComponent(PrivacyPolicyPage);
    component = fixture.componentInstance;
    i18nService = TestBed.inject(I18nService);
    fixture.detectChanges();
  });

  it('should create the privacy policy page component', () => {
    expect(component).toBeTruthy();
  });

  it('should render the main legal title and LFPDPPP badge', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.legal-card__title')).toBeTruthy();
    expect(compiled.textContent).toContain('LFPDPPP & INAI');
  });

  it('should render all 7 privacy sections', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const sections = compiled.querySelectorAll('.legal-section');
    expect(sections.length).toBe(7);
  });

  it('should trigger printDocument safely without error', () => {
    expect(() => component.printDocument()).not.toThrow();
  });
});
