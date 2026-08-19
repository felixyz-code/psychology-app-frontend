import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Component } from '@angular/core';
import {
  CLINICAL_COLOR_PALETTE,
  OrganizationColorPickerComponent,
} from './organization-color-picker.component';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, OrganizationColorPickerComponent],
  template: `
    <app-organization-color-picker
      [formControl]="colorControl"
      [label]="'Color de acento'"
    />
  `,
})
class HostComponent {
  colorControl = new FormControl<string | null>(null);
}

describe('OrganizationColorPickerComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let hostComponent: HostComponent;
  let component: OrganizationColorPickerComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    hostComponent = fixture.componentInstance;
    fixture.detectChanges();
    component = fixture.debugElement.children[0].componentInstance;
  });

  it('initializes with null value and clinical presets', () => {
    expect(component.internalValue()).toBeNull();
    expect(component.presets.length).toBe(8);
  });

  it('selects a preset color and updates form control', () => {
    const preset = CLINICAL_COLOR_PALETTE[0];
    component.selectPreset(preset.hex);
    fixture.detectChanges();

    expect(component.internalValue()).toBe(preset.hex);
    expect(hostComponent.colorControl.value).toBe(preset.hex);
    expect(component.isWcagCompliant()).toBe(true);
  });

  it('normalizes hex code input with # prefix', () => {
    component.onHexInput('0D9488');
    fixture.detectChanges();

    expect(component.internalValue()).toBe('#0D9488');
    expect(hostComponent.colorControl.value).toBe('#0D9488');
  });

  it('detects insufficient contrast for non-compliant colors', () => {
    component.onHexInput('#FFFFFF');
    fixture.detectChanges();

    expect(component.isWcagCompliant()).toBe(false);
  });

  it('clears color when clearColor is called', () => {
    component.selectPreset('#2563EB');
    expect(component.internalValue()).toBe('#2563EB');

    component.clearColor();
    expect(component.internalValue()).toBeNull();
    expect(hostComponent.colorControl.value).toBeNull();
  });
});
