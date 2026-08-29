import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type SkeletonCardVariant = 'default' | 'metric' | 'compact' | 'flat';

@Component({
  selector: 'app-skeleton-card',
  standalone: true,
  templateUrl: './skeleton-card.component.html',
  styleUrl: './skeleton-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonCardComponent {
  readonly lines = input<number>(3);
  readonly hasHeader = input<boolean>(true);
  readonly hasAvatar = input<boolean>(false);
  readonly hasActions = input<boolean>(false);
  readonly actionCount = input<number>(1);
  readonly variant = input<SkeletonCardVariant>('default');
  readonly customClass = input<string>('');

  getLinesArray(): number[] {
    const count = Math.max(1, this.lines());
    return Array.from({ length: count }, (_, i) => i);
  }

  getActionsArray(): number[] {
    const count = Math.max(1, this.actionCount());
    return Array.from({ length: count }, (_, i) => i);
  }

  getLineWidth(index: number): string {
    const widths = ['100%', '88%', '72%', '94%', '60%'];
    return widths[index % widths.length];
  }
}
