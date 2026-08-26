import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthBrandPanelComponent } from './auth-brand-panel.component';

describe('AuthBrandPanelComponent', () => {
  let component: AuthBrandPanelComponent;
  let fixture: ComponentFixture<AuthBrandPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthBrandPanelComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthBrandPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the brand panel component', () => {
    expect(component).toBeTruthy();
  });

  it('renders PsiqueOS branding and clinical badges', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.auth-brand-panel__logo-text')?.textContent).toContain('PsiqueOS');
    expect(el.querySelector('.auth-brand-panel__pill')?.textContent).toContain('Software Clínico Especializado');
  });

  it('renders 3 clinical value proposition features', () => {
    const el = fixture.nativeElement as HTMLElement;
    const cards = el.querySelectorAll('.auth-brand-panel__feature-card');
    expect(cards).toHaveLength(3);
    expect(cards[0].textContent).toContain('NOM-004-SSA3');
    expect(cards[1].textContent).toContain('Teleconsulta');
    expect(cards[2].textContent).toContain('Psicométrica');
  });

  it('renders security badges in the footer', () => {
    const el = fixture.nativeElement as HTMLElement;
    const badges = el.querySelectorAll('.auth-brand-panel__badge-item');
    expect(badges.length).toBeGreaterThanOrEqual(4);
    expect(el.textContent).toContain('AES-256');
  });
});
