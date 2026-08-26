import {
  Directive,
  ElementRef,
  HostBinding,
  HostListener,
  Input,
  OnChanges,
  Renderer2,
  SimpleChanges,
  inject,
} from '@angular/core';

@Directive({
  selector: 'button[appButtonSpinner], button[appLoading], a[appButtonSpinner], a[appLoading]',
  standalone: true,
})
export class ButtonSpinnerDirective implements OnChanges {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);

  @Input('appButtonSpinner') loadingPrimary: boolean | null | undefined = false;
  @Input('appLoading') loadingSecondary: boolean | null | undefined = false;
  @Input() loadingText: string | null = null;
  @Input() spinnerPosition: 'leading' | 'trailing' | 'replace' = 'leading';

  private spinnerEl: HTMLElement | null = null;
  private textEl: HTMLElement | null = null;
  private originalContent: string | null = null;
  private originalWidth: string | null = null;
  private wasDisabledInitially = false;

  get isLoading(): boolean {
    return Boolean(this.loadingPrimary || this.loadingSecondary);
  }

  @HostBinding('attr.aria-busy')
  get ariaBusy(): boolean {
    return this.isLoading;
  }

  @HostBinding('class.app-button-spinner--active')
  get activeClass(): boolean {
    return this.isLoading;
  }

  @HostListener('click', ['$event'])
  handleClick(event: Event): void {
    if (this.isLoading) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['loadingPrimary'] || changes['loadingSecondary'] || changes['loadingText']) {
      this.updateState();
    }
  }

  private updateState(): void {
    const el = this.elementRef.nativeElement;

    if (this.isLoading) {
      // Save minimum width so the button doesn't shrink / jump on state change
      if (!this.originalWidth && el.offsetWidth > 0) {
        this.originalWidth = `${el.offsetWidth}px`;
        this.renderer.setStyle(el, 'min-width', this.originalWidth);
      }

      if (el instanceof HTMLButtonElement) {
        this.wasDisabledInitially = el.disabled;
        this.renderer.setProperty(el, 'disabled', true);
      }
      this.renderer.setAttribute(el, 'aria-disabled', 'true');

      if (!this.spinnerEl) {
        this.spinnerEl = this.renderer.createElement('span');
        this.renderer.addClass(this.spinnerEl, 'app-button-spinner__spinner');
        this.renderer.setAttribute(this.spinnerEl, 'aria-hidden', 'true');

        if (this.spinnerPosition === 'trailing') {
          this.renderer.appendChild(el, this.spinnerEl);
        } else {
          this.renderer.insertBefore(el, this.spinnerEl, el.firstChild);
        }
      }

      if (this.loadingText) {
        if (!this.textEl) {
          this.textEl = this.renderer.createElement('span');
          this.renderer.addClass(this.textEl, 'app-button-spinner__text');
          this.renderer.appendChild(el, this.textEl);
        }
        this.renderer.setProperty(this.textEl, 'textContent', this.loadingText);
      }
    } else {
      // Restore state
      if (this.originalWidth) {
        this.renderer.removeStyle(el, 'min-width');
        this.originalWidth = null;
      }

      if (el instanceof HTMLButtonElement) {
        this.renderer.setProperty(el, 'disabled', this.wasDisabledInitially);
      }
      this.renderer.removeAttribute(el, 'aria-disabled');

      if (this.spinnerEl) {
        this.renderer.removeChild(el, this.spinnerEl);
        this.spinnerEl = null;
      }

      if (this.textEl) {
        this.renderer.removeChild(el, this.textEl);
        this.textEl = null;
      }
    }
  }
}
