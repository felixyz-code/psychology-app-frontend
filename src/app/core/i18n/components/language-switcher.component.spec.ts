import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { LanguageSwitcherComponent } from './language-switcher.component';
import { I18nService } from '../i18n.service';

describe('LanguageSwitcherComponent', () => {
  let component: LanguageSwitcherComponent;
  let fixture: ComponentFixture<LanguageSwitcherComponent>;
  let i18nService: I18nService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [LanguageSwitcherComponent],
      providers: [I18nService],
    }).compileComponents();

    i18nService = TestBed.inject(I18nService);
    fixture = TestBed.createComponent(LanguageSwitcherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
  });

  it('creates the component successfully', () => {
    expect(component).toBeTruthy();
  });

  it('renders segmented language buttons by default with correct aria attributes', () => {
    const buttons = fixture.debugElement.queryAll(By.css('.lang-pill__btn'));
    expect(buttons.length).toBe(2);

    const esBtn = buttons[0].nativeElement as HTMLButtonElement;
    const enBtn = buttons[1].nativeElement as HTMLButtonElement;

    expect(esBtn.getAttribute('aria-pressed')).toBe('true');
    expect(enBtn.getAttribute('aria-pressed')).toBe('false');
    expect(esBtn.classList.contains('lang-pill__btn--active')).toBe(true);
  });

  it('switches to English when clicking the EN button in segmented mode', () => {
    const buttons = fixture.debugElement.queryAll(By.css('.lang-pill__btn'));
    const enBtn = buttons[1].nativeElement as HTMLButtonElement;

    enBtn.click();
    fixture.detectChanges();

    expect(i18nService.currentLang()).toBe('en');
    expect(enBtn.getAttribute('aria-pressed')).toBe('true');
    expect(enBtn.classList.contains('lang-pill__btn--active')).toBe(true);
  });

  it('supports compact variant and toggles language on click', () => {
    fixture.componentRef.setInput('variant', 'compact');
    fixture.detectChanges();

    const compactBtn = fixture.debugElement.query(By.css('.lang-compact-btn'))
      .nativeElement as HTMLButtonElement;
    expect(compactBtn).toBeTruthy();

    compactBtn.click();
    fixture.detectChanges();

    expect(i18nService.currentLang()).toBe('en');
  });
});
