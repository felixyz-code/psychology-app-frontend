import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TermsOfServicePage } from './terms-of-service.page';
import { I18nService } from '../../../core/i18n/i18n.service';

describe('TermsOfServicePage', () => {
  let component: TermsOfServicePage;
  let fixture: ComponentFixture<TermsOfServicePage>;
  let i18nService: I18nService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TermsOfServicePage],
      providers: [provideRouter([]), I18nService],
    }).compileComponents();

    fixture = TestBed.createComponent(TermsOfServicePage);
    component = fixture.componentInstance;
    i18nService = TestBed.inject(I18nService);
    fixture.detectChanges();
  });

  it('should create the terms of service page component', () => {
    expect(component).toBeTruthy();
  });

  it('should render the main legal title and SLA badge', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.legal-card__title')).toBeTruthy();
    expect(compiled.textContent).toContain('SLA 99.9%');
  });

  it('should render all 6 terms sections', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const sections = compiled.querySelectorAll('.legal-section');
    expect(sections.length).toBe(6);
  });

  it('should trigger printDocument safely without error', () => {
    expect(() => component.printDocument()).not.toThrow();
  });
});
