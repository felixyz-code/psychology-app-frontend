import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-skeleton-header',
  standalone: true,
  templateUrl: './skeleton-header.component.html',
  styleUrl: './skeleton-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonHeaderComponent {
  readonly hasSubtitle = input<boolean>(true);
  readonly hasActions = input<boolean>(true);
  readonly actionCount = input<number>(1);
  readonly hasBreadcrumb = input<boolean>(false);
  readonly hasBadge = input<boolean>(false);
  readonly customClass = input<string>('');

  getActionsArray(): number[] {
    const count = Math.max(1, this.actionCount());
    return Array.from({ length: count }, (_, i) => i);
  }
}
