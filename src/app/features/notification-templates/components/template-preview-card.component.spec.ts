import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TemplatePreviewCardComponent } from './template-preview-card.component';

describe('TemplatePreviewCardComponent', () => {
  let component: TemplatePreviewCardComponent;
  let fixture: ComponentFixture<TemplatePreviewCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TemplatePreviewCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TemplatePreviewCardComponent);
    component = fixture.componentInstance;
  });

  it('renders WhatsApp mockup with formatted bold and line breaks by default', () => {
    fixture.componentRef.setInput('channel', 'WHATSAPP');
    fixture.componentRef.setInput('eventType', 'APPOINTMENT_CONFIRMATION');
    fixture.componentRef.setInput(
      'body',
      'Hola *{{patientName}}*, tu cita es el *{{appointmentDate}}*',
    );
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.mockup-whatsapp')).toBeTruthy();
    expect(compiled.querySelector('.mockup-whatsapp__text')?.innerHTML).toContain('<strong>Ana Sofía Rodríguez</strong>');
    expect(compiled.querySelector('.mockup-whatsapp__text')?.innerHTML).toContain('<strong>25 de Agosto de 2026</strong>');
  });

  it('renders SMS mockup when channel is SMS', () => {
    fixture.componentRef.setInput('channel', 'SMS');
    fixture.componentRef.setInput('body', 'Recordatorio para {{patientName}}');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.mockup-sms')).toBeTruthy();
    expect(compiled.querySelector('.mockup-sms__text')?.textContent).toContain('Recordatorio para Ana Sofía Rodríguez');
  });

  it('renders Email mockup with subject and document layout when channel is EMAIL', () => {
    fixture.componentRef.setInput('channel', 'EMAIL');
    fixture.componentRef.setInput('subject', 'Cita en {{organizationName}}');
    fixture.componentRef.setInput('body', 'Estimado/a {{patientName}}, te esperamos.');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.mockup-email')).toBeTruthy();
    expect(compiled.querySelector('.mockup-email__val--bold')?.textContent).toContain('Cita en PsiqueOS Clínica Central');
    expect(compiled.querySelector('.mockup-email__body')?.innerHTML).toContain('Estimado/a Ana Sofía Rodríguez, te esperamos.');
  });

  it('allows switching channel when showChannelSwitcher is true', () => {
    fixture.componentRef.setInput('showChannelSwitcher', true);
    fixture.componentRef.setInput('channel', 'EMAIL');
    fixture.detectChanges();

    component.selectChannel('WHATSAPP');
    fixture.detectChanges();

    expect(component.currentChannel()).toBe('WHATSAPP');
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.mockup-whatsapp')).toBeTruthy();
  });
});
