import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;
  let mockSnackBar: {
    open: ReturnType<typeof vi.fn>;
    dismiss: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockSnackBar = {
      open: vi.fn(),
      dismiss: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        ToastService,
        { provide: MatSnackBar, useValue: mockSnackBar },
      ],
    });

    service = TestBed.inject(ToastService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call open with success config', () => {
    service.success('Paciente guardado');
    expect(mockSnackBar.open).toHaveBeenCalledWith(
      'Paciente guardado',
      'OK',
      expect.objectContaining({
        duration: 3500,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['app-toast', 'app-toast--success'],
      }),
    );
  });

  it('should call open with error config', () => {
    service.error('Error al guardar');
    expect(mockSnackBar.open).toHaveBeenCalledWith(
      'Error al guardar',
      'Cerrar',
      expect.objectContaining({
        duration: 5500,
        panelClass: ['app-toast', 'app-toast--error', 'app-toast--assertive'],
      }),
    );
  });

  it('should call open with warning config', () => {
    service.warning('Cupo casi lleno');
    expect(mockSnackBar.open).toHaveBeenCalledWith(
      'Cupo casi lleno',
      'Entendido',
      expect.objectContaining({
        duration: 4500,
        panelClass: ['app-toast', 'app-toast--warning'],
      }),
    );
  });

  it('should call open with info config', () => {
    service.info('Copia completada');
    expect(mockSnackBar.open).toHaveBeenCalledWith(
      'Copia completada',
      'OK',
      expect.objectContaining({
        duration: 3000,
        panelClass: ['app-toast', 'app-toast--info'],
      }),
    );
  });

  it('should call dismiss on snackbar', () => {
    service.dismiss();
    expect(mockSnackBar.dismiss).toHaveBeenCalled();
  });
});
