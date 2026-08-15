import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { Branch } from '../../../core/models/branch.models';
import { BranchContextService } from '../../../core/services/branch-context.service';
import { TenantContextStore } from '../../../core/tenant-context/tenant-context.store';
import { BranchSwitcherComponent } from './branch-switcher.component';

const mockBranch1: Branch = {
  id: 'branch-1',
  organizationId: 'org-1',
  name: 'Sede Central',
  code: 'CENTRO',
  timezone: 'America/Mexico_City',
  isActive: true,
  createdAt: '2026-08-14T00:00:00Z',
  updatedAt: '2026-08-14T00:00:00Z',
  isPrimary: true,
};

const mockBranch2: Branch = {
  id: 'branch-2',
  organizationId: 'org-1',
  name: 'Sede Poniente',
  code: 'PONIENTE',
  timezone: 'America/Mexico_City',
  isActive: true,
  createdAt: '2026-08-14T00:00:00Z',
  updatedAt: '2026-08-14T00:00:00Z',
  isPrimary: false,
};

describe('BranchSwitcherComponent', () => {
  let component: BranchSwitcherComponent;
  let fixture: ComponentFixture<BranchSwitcherComponent>;

  let availableBranchesSignal: ReturnType<typeof signal<Branch[]>>;
  let currentBranchSignal: ReturnType<typeof signal<Branch | null>>;
  let isLoadingSignal: ReturnType<typeof signal<boolean>>;
  let hasMultipleBranchesSignal: ReturnType<typeof signal<boolean>>;
  let isActiveTenantReadyMock: ReturnType<typeof vi.fn>;
  let loadBranchesMock: ReturnType<typeof vi.fn>;
  let setActiveBranchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    availableBranchesSignal = signal<Branch[]>([mockBranch1, mockBranch2]);
    currentBranchSignal = signal<Branch | null>(mockBranch1);
    isLoadingSignal = signal<boolean>(false);
    hasMultipleBranchesSignal = signal<boolean>(true);
    isActiveTenantReadyMock = vi.fn().mockReturnValue(true);
    loadBranchesMock = vi.fn().mockResolvedValue([mockBranch1, mockBranch2]);
    setActiveBranchMock = vi.fn();

    const branchContextServiceMock = {
      availableBranches: availableBranchesSignal,
      currentBranch: currentBranchSignal,
      isLoading: isLoadingSignal,
      hasMultipleBranches: hasMultipleBranchesSignal,
      loadBranches: loadBranchesMock,
      setActiveBranch: setActiveBranchMock,
    };

    const tenantContextStoreMock = {
      isActiveTenantReady: isActiveTenantReadyMock,
    };

    await TestBed.configureTestingModule({
      imports: [BranchSwitcherComponent],
      providers: [
        { provide: BranchContextService, useValue: branchContextServiceMock },
        { provide: TenantContextStore, useValue: tenantContextStoreMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BranchSwitcherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders correctly and is visible when active tenant is ready with branches', () => {
    expect(component.isVisible()).toBe(true);
    const hostEl: HTMLElement = fixture.nativeElement;
    const trigger = hostEl.querySelector('.branch-menu-trigger');
    expect(trigger).toBeTruthy();
    expect(trigger?.textContent).toContain('Sede Central');
    expect(trigger?.textContent).toContain('Matriz');
  });

  it('switches branch on select', () => {
    component.switchBranch('branch-2');
    expect(setActiveBranchMock).toHaveBeenCalledWith('branch-2');
  });

  it('selects branch and dispatches app:branch-changed event', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    component.selectBranch(mockBranch2);
    expect(setActiveBranchMock).toHaveBeenCalledWith('branch-2');
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'app:branch-changed',
      }),
    );
    dispatchSpy.mockRestore();
  });

  it('renders single branch identity when hasMultipleBranches is false', () => {
    hasMultipleBranchesSignal.set(false);
    availableBranchesSignal.set([mockBranch1]);
    fixture.detectChanges();

    const hostEl: HTMLElement = fixture.nativeElement;
    const trigger = hostEl.querySelector('.branch-menu-trigger');
    const identity = hostEl.querySelector('.branch-identity');

    expect(trigger).toBeNull();
    expect(identity).toBeTruthy();
    expect(identity?.textContent).toContain('Sede Central');
  });

  it('hides component when available branches is empty', () => {
    availableBranchesSignal.set([]);
    fixture.detectChanges();

    expect(component.isVisible()).toBe(false);
  });
});
