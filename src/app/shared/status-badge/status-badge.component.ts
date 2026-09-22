import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TranslatePipe } from '../pipes/translate.pipe';
import { OrgStatus } from '../../models/organisation.model';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="badge" [class]="'badge--' + status">
      <span class="dot" aria-hidden="true"></span>
      <span class="label">{{ 'status.' + status | t }}</span>
    </span>
  `,
  styles: [`
    .badge {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-1) var(--space-3);
      border-radius: var(--radius-pill);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      line-height: 1;
      white-space: nowrap;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex: 0 0 auto;
    }
    .badge--active {
      background: var(--color-success-50);
      color: var(--color-success-600);
    }
    .badge--active .dot { background: var(--color-success-600); }

    .badge--inactive {
      background: var(--color-neutral-50);
      color: var(--color-neutral-600);
    }
    .badge--inactive .dot { background: var(--color-neutral-600); }

    .badge--suspended {
      background: var(--color-danger-50);
      color: var(--color-danger-600);
    }
    .badge--suspended .dot { background: var(--color-danger-600); }

    .badge--unknown {
      background: var(--color-warning-50);
      color: var(--color-warning-600);
    }
    .badge--unknown .dot { background: var(--color-warning-600); }
  `],
})
export class StatusBadgeComponent {
  @Input({ required: true }) status!: OrgStatus;
}
