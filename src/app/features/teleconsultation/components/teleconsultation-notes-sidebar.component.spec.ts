import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TeleconsultationNotesSidebarComponent } from './teleconsultation-notes-sidebar.component';

describe('TeleconsultationNotesSidebarComponent', () => {
  let component: TeleconsultationNotesSidebarComponent;
  let fixture: ComponentFixture<TeleconsultationNotesSidebarComponent>;

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();

    TestBed.configureTestingModule({
      imports: [TeleconsultationNotesSidebarComponent],
    });

    fixture = TestBed.createComponent(TeleconsultationNotesSidebarComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('roomCode', 'room-123-abc');
    fixture.componentRef.setInput('patientName', 'Ana Martínez');
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
    expect(component.saveStatus()).toBe('idle');
  });

  it('performs 600ms debounced autosave when form value changes', () => {
    component.notesForm.patchValue({
      title: 'Sesión Inicial',
      content: 'El paciente refiere síntomas de ansiedad.',
    });

    expect(component.saveStatus()).toBe('idle');

    // Advance by 600ms to trigger debounce
    vi.advanceTimersByTime(600);

    expect(component.saveStatus()).toBe('saved');
    expect(component.lastSavedTime()).toBeTruthy();

    const stored = localStorage.getItem('teleconsult_draft_room-123-abc');
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.title).toBe('Sesión Inicial');
    expect(parsed.content).toContain('ansiedad');
  });

  it('restores draft from localStorage on init if present', () => {
    localStorage.setItem(
      'teleconsult_draft_saved-room-456',
      JSON.stringify({
        roomCode: 'saved-room-456',
        title: 'Borrador Guardado Previamente',
        content: 'Contenido previo',
        updatedAt: new Date().toISOString(),
      }),
    );

    const newFixture = TestBed.createComponent(TeleconsultationNotesSidebarComponent);
    const newComponent = newFixture.componentInstance;
    newFixture.componentRef.setInput('roomCode', 'saved-room-456');
    newFixture.detectChanges();

    expect(newComponent.notesForm.controls.title.value).toBe('Borrador Guardado Previamente');
    expect(newComponent.notesForm.controls.content.value).toBe('Contenido previo');
    expect(newComponent.lastSavedTime()).toBeTruthy();
  });

  it('inserts SOAP snippets into the textarea', () => {
    component.insertSnippet('\n• [Motivo de consulta]: ');
    expect(component.notesForm.controls.content.value).toContain('[Motivo de consulta]');
  });

  it('clears notes and removes from localStorage', () => {
    component.notesForm.patchValue({
      title: 'Nota a borrar',
      content: 'Contenido a borrar',
    });
    component.saveDraft();
    expect(localStorage.getItem('teleconsult_draft_room-123-abc')).toBeTruthy();

    component.clearNotes();
    expect(component.notesForm.controls.title.value).toBe('');
    expect(component.notesForm.controls.content.value).toBe('');
    expect(localStorage.getItem('teleconsult_draft_room-123-abc')).toBeNull();
  });

  it('emits closeSidebar and saves draft on onClose', () => {
    const emitSpy = vi.fn();
    component.closeSidebar.subscribe(emitSpy);

    component.notesForm.patchValue({ title: 'Nota rápida' });
    component.onClose();

    expect(emitSpy).toHaveBeenCalled();
    expect(localStorage.getItem('teleconsult_draft_room-123-abc')).toBeTruthy();
  });
});
