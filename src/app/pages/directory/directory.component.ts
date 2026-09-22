import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { CreateOrganisationFormComponent } from './create-organisation-form/create-organisation-form.component';
import { OrganisationStore } from '../../services/organisation.store';
import { Organisation, OrgStatus, SortField } from '../../models/organisation.model';

const SEARCH_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-directory',
  standalone: true,
  imports: [TranslatePipe, StatusBadgeComponent, CreateOrganisationFormComponent, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './directory.component.html',
  styleUrl: './directory.component.css',
})
export class DirectoryComponent implements OnInit {
  private store = inject(OrganisationStore);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  readonly rows = this.store.filteredSorted;
  readonly phase = this.store.phase;
  readonly loadedCount = this.store.loadedCount;
  readonly totalCount = this.store.totalCount;
  readonly failedPages = this.store.failedPages;
  readonly query = this.store.query;

  readonly showCreateForm = signal(false);
  readonly successMessage = signal<string | null>(null);

  readonly statusOptions: (OrgStatus | 'all')[] = ['all', 'active', 'inactive', 'suspended', 'unknown'];

  private searchDebounceHandle: ReturnType<typeof setTimeout> | null = null;
  readonly searchInputValue = signal('');

  readonly resultSummary = computed(() => this.rows().length);

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const search = params.get('q') ?? '';
    const status = (params.get('status') as OrgStatus | 'all' | null) ?? 'all';
    const sortField = (params.get('sort') as SortField | null) ?? 'name';
    const sortDirection = (params.get('dir') as 'asc' | 'desc' | null) ?? 'asc';

    this.searchInputValue.set(search);
    this.store.query.set({ search, status, sortField, sortDirection });

    void this.store.loadAll();
  }

  onSearchInput(value: string): void {
    this.searchInputValue.set(value);
    if (this.searchDebounceHandle) clearTimeout(this.searchDebounceHandle);
    this.searchDebounceHandle = setTimeout(() => {
      this.store.query.update((q) => ({ ...q, search: value }));
      this.syncUrl();
    }, SEARCH_DEBOUNCE_MS);
  }

  onStatusChange(status: OrgStatus | 'all'): void {
    this.store.query.update((q) => ({ ...q, status }));
    this.syncUrl();
  }

  onSort(field: SortField): void {
    this.store.query.update((q) => {
      const direction = q.sortField === field && q.sortDirection === 'asc' ? 'desc' : 'asc';
      return { ...q, sortField: field, sortDirection: direction };
    });
    this.syncUrl();
  }

  sortIndicator(field: SortField): '' | '▲' | '▼' {
    const q = this.query();
    if (q.sortField !== field) return '';
    return q.sortDirection === 'asc' ? '▲' : '▼';
  }

  onRetry(): void {
    void this.store.retryFailedPages();
  }

  onCreated(org: Organisation): void {
    this.showCreateForm.set(false);
    this.successMessage.set(org.name);
    setTimeout(() => this.successMessage.set(null), 4000);
  }

  private syncUrl(): void {
    const q = this.query();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        q: q.search || null,
        status: q.status !== 'all' ? q.status : null,
        sort: q.sortField !== 'name' ? q.sortField : null,
        dir: q.sortDirection !== 'asc' ? q.sortDirection : null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
