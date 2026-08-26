import { Injectable, inject } from '@angular/core';
import {
  MatSnackBar,
  MatSnackBarConfig,
  MatSnackBarRef,
  TextOnlySnackBar,
} from '@angular/material/snack-bar';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  duration?: number;
  action?: string;
  horizontalPosition?: 'start' | 'center' | 'end' | 'left' | 'right';
  verticalPosition?: 'top' | 'bottom';
  data?: unknown;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private readonly snackBar = inject(MatSnackBar);

  private readonly DEFAULT_DURATIONS: Record<ToastType, number> = {
    success: 3500,
    info: 3000,
    warning: 4500,
    error: 5500,
  };

  /**
   * Shows a success toast notification
   */
  success(
    message: string,
    action: string = 'OK',
    options?: ToastOptions,
  ): MatSnackBarRef<TextOnlySnackBar> {
    return this.show(message, 'success', action, options);
  }

  /**
   * Shows an error toast notification
   */
  error(
    message: string,
    action: string = 'Cerrar',
    options?: ToastOptions,
  ): MatSnackBarRef<TextOnlySnackBar> {
    return this.show(message, 'error', action, options);
  }

  /**
   * Shows a warning toast notification
   */
  warning(
    message: string,
    action: string = 'Entendido',
    options?: ToastOptions,
  ): MatSnackBarRef<TextOnlySnackBar> {
    return this.show(message, 'warning', action, options);
  }

  /**
   * Shows an informational toast notification
   */
  info(
    message: string,
    action: string = 'OK',
    options?: ToastOptions,
  ): MatSnackBarRef<TextOnlySnackBar> {
    return this.show(message, 'info', action, options);
  }

  /**
   * Generic show method
   */
  show(
    message: string,
    type: ToastType = 'info',
    action: string = 'OK',
    options?: ToastOptions,
  ): MatSnackBarRef<TextOnlySnackBar> {
    const config: MatSnackBarConfig = {
      duration: options?.duration ?? this.DEFAULT_DURATIONS[type],
      horizontalPosition: options?.horizontalPosition ?? 'end',
      verticalPosition: options?.verticalPosition ?? 'top',
      panelClass: [
        'app-toast',
        `app-toast--${type}`,
        ...(type === 'error' ? ['app-toast--assertive'] : []),
      ],
      data: options?.data,
    };

    return this.snackBar.open(message, action, config);
  }

  /**
   * Closes any currently visible toast
   */
  dismiss(): void {
    this.snackBar.dismiss();
  }
}
