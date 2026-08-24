import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { LandingPageComponent } from './landing-page.component';
import { ThemeService } from '../../core/theme/theme.service';

describe('LandingPageComponent', () => {
  let component: LandingPageComponent;
  let fixture: ComponentFixture<LandingPageComponent>;
  let themeService: ThemeService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingPageComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(LandingPageComponent);
    component = fixture.componentInstance;
    themeService = TestBed.inject(ThemeService);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create the landing page component successfully', () => {
    expect(component).toBeTruthy();
  });

  it('initializes with default signal values', () => {
    expect(component.billingCycle()).toBe('monthly');
    expect(component.selectedPreviewTab()).toBe('soap');
    expect(component.mobileMenuOpen()).toBe(false);
    expect(component.expandedFaqIndices()).toEqual([0]);
    expect(component.activeFeatureCategory()).toBe('all');
  });

  it('toggles billing cycle between monthly and annual', () => {
    expect(component.billingCycle()).toBe('monthly');

    component.toggleBillingCycle();
    expect(component.billingCycle()).toBe('annual');

    component.setBillingCycle('monthly');
    expect(component.billingCycle()).toBe('monthly');

    component.setBillingCycle('annual');
    expect(component.billingCycle()).toBe('annual');
  });

  it('switches preview workspace tabs', () => {
    component.setPreviewTab('teleconsultation');
    expect(component.selectedPreviewTab()).toBe('teleconsultation');

    component.setPreviewTab('psychometrics');
    expect(component.selectedPreviewTab()).toBe('psychometrics');

    component.setPreviewTab('paef');
    expect(component.selectedPreviewTab()).toBe('paef');

    component.setPreviewTab('soap');
    expect(component.selectedPreviewTab()).toBe('soap');
  });

  it('toggles and closes mobile navigation menu', () => {
    expect(component.mobileMenuOpen()).toBe(false);

    component.toggleMobileMenu();
    expect(component.mobileMenuOpen()).toBe(true);

    component.closeMobileMenu();
    expect(component.mobileMenuOpen()).toBe(false);
  });

  it('toggles FAQ item expansion correctly', () => {
    expect(component.isFaqExpanded(0)).toBe(true);
    expect(component.isFaqExpanded(1)).toBe(false);

    // Open item 1
    component.toggleFaq(1);
    expect(component.isFaqExpanded(1)).toBe(true);
    expect(component.isFaqExpanded(0)).toBe(true);

    // Close item 0
    component.toggleFaq(0);
    expect(component.isFaqExpanded(0)).toBe(false);
    expect(component.isFaqExpanded(1)).toBe(true);
  });

  it('filters clinical features by category', () => {
    expect(component.filteredFeatures().length).toBe(component.clinicalFeatures.length);

    component.setFeatureCategory('clinical');
    expect(component.filteredFeatures().every((f) => f.category === 'clinical')).toBe(true);
    expect(component.filteredFeatures().length).toBeGreaterThan(0);

    component.setFeatureCategory('telehealth');
    expect(component.filteredFeatures().every((f) => f.category === 'telehealth')).toBe(true);

    component.setFeatureCategory('all');
    expect(component.filteredFeatures().length).toBe(component.clinicalFeatures.length);
  });

  it('toggles dark theme using ThemeService', () => {
    const isDark = component.isDarkTheme();
    component.toggleTheme();
    expect(component.isDarkTheme()).toBe(!isDark);
  });

  it('renders hero headline, trust badges, pricing plans and FAQ sections', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    const headline = compiled.querySelector('.landing-hero__headline');
    expect(headline?.textContent).toContain('El Sistema Operativo Integral para');

    const trustBadges = compiled.querySelectorAll('.landing-trust-bar__item');
    expect(trustBadges.length).toBe(4);

    const pricingCards = compiled.querySelectorAll('.landing-pricing-card');
    expect(pricingCards.length).toBe(3);

    const faqItems = compiled.querySelectorAll('.faq-item');
    expect(faqItems.length).toBe(component.faqs.length);
  });

  it('invokes scrollIntoView when scrollToSection is called', () => {
    const mockElement = { scrollIntoView: vi.fn() };
    vi.spyOn(document, 'getElementById').mockReturnValue(mockElement as any);

    component.scrollToSection('caracteristicas');

    expect(document.getElementById).toHaveBeenCalledWith('caracteristicas');
    expect(mockElement.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });
    expect(component.mobileMenuOpen()).toBe(false);
  });

  it('sets canonical SEO title and meta tags on initialization', () => {
    const titleService = TestBed.inject(Title);
    const metaService = TestBed.inject(Meta);

    expect(titleService.getTitle()).toBe(
      'PsiqueOS | Sistema Operativo Clínico para Profesionales de la Salud Mental',
    );
    expect(metaService.getTag("name='description'")?.content).toContain('NOM-004-SSA3');
    expect(metaService.getTag("property='og:title'")?.content).toBe(
      'PsiqueOS | Sistema Operativo Clínico para Profesionales de la Salud Mental',
    );
    expect(metaService.getTag("property='og:type'")?.content).toBe('website');
  });
});
