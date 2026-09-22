import { Injectable, computed, inject, signal } from '@angular/core';
import { MockApiService, PAGE_SIZE } from './mock-api.service';
import { SlidingWindowRateLimiter } from './rate-limiter';
import { normalizeOrganisation } from './organisation-normalizer';
import { Organisation, OrganisationQuery, RawOrganisation } from '../models/organisation.model';

const MAX_REQUESTS_PER_MINUTE = 5;
const RETRY_LIMIT = 3;

export type LoadPhase = 'idle' | 'loading' | 'partial-error' | 'error' | 'done';

/**
 * Owns the full lifecycle of the organisation list:
 *  - fetches every page from MockApiService, paced by a rate limiter
 *    (Conflict 1: ops gets one continuous, unpaginated view; the API's
 *    5 req/min * 25-per-page limit is respected behind the scenes)
 *  - retries individual page failures (the API's ~15% failure rate)
 *    a few times before giving up on that page
 *  - normalises every raw row through organisation-normalizer
 *  - exposes everything as signals so components stay template-only
 */
@Injectable({ providedIn: 'root' })
export class OrganisationStore {
  private api = inject(MockApiService);
  private limiter = new SlidingWindowRateLimiter(MAX_REQUESTS_PER_MINUTE, 60_000);

  private readonly _all = signal<Organisation[]>([]);
  private readonly _phase = signal<LoadPhase>('idle');
  private readonly _loadedCount = signal(0);
  private readonly _totalCount = signal<number | null>(null);
  private readonly _failedPages = signal(0);

  readonly all = this._all.asReadonly();
  readonly phase = this._phase.asReadonly();
  readonly loadedCount = this._loadedCount.asReadonly();
  readonly totalCount = this._totalCount.asReadonly();
  readonly failedPages = this._failedPages.asReadonly();

  readonly query = signal<OrganisationQuery>({
    search: '',
    status: 'all',
    sortField: 'name',
    sortDirection: 'asc',
  });

  readonly filteredSorted = computed(() => {
    const { search, status, sortField, sortDirection } = this.query();
    const needle = search.trim().toLowerCase();

    let rows = this._all();
    if (needle) {
      rows = rows.filter((o) => o.name.toLowerCase().includes(needle));
    }
    if (status !== 'all') {
      rows = rows.filter((o) => o.status === status);
    }

    const dir = sortDirection === 'asc' ? 1 : -1;
    rows = [...rows].sort((a, b) => {
      if (sortField === 'name') {
        // Unnamed rows always sort last, regardless of direction.
        if (!a.hasName && !b.hasName) return 0;
        if (!a.hasName) return 1;
        if (!b.hasName) return -1;
        return dir * a.name.localeCompare(b.name);
      }
      const at = a.createdAt ? a.createdAt.getTime() : -Infinity;
      const bt = b.createdAt ? b.createdAt.getTime() : -Infinity;
      return dir * (at - bt);
    });
    return rows;
  });

  async loadAll(): Promise<void> {
    this._all.set([]);
    this._loadedCount.set(0);
    this._totalCount.set(null);
    this._failedPages.set(0);
    this._phase.set('loading');

    const seenIds = new Set<number>();
    let offset = 0;
    let total = Infinity;
    let anyFailure = false;
    const pageFetches: Promise<void>[] = [];

    // Fetch the first page synchronously to learn the real total.
    const first = await this.fetchPageWithRetry(0);
    if (!first) {
      this._phase.set('error');
      return;
    }
    total = first.total;
    this._totalCount.set(total);
    this.appendRaw(first.items, seenIds);
    offset = PAGE_SIZE;

    const offsets: number[] = [];
    while (offset < total) {
      offsets.push(offset);
      offset += PAGE_SIZE;
    }

    for (const off of offsets) {
      pageFetches.push(
        this.fetchPageWithRetry(off).then((page) => {
          if (page) {
            this.appendRaw(page.items, seenIds);
          } else {
            anyFailure = true;
            this._failedPages.update((n) => n + 1);
          }
        })
      );
    }

    await Promise.all(pageFetches);
    this._phase.set(anyFailure ? 'partial-error' : 'done');
  }

  async retryFailedPages(): Promise<void> {
    // Simplest correct behaviour for a take-home: a full reload re-derives
    // exactly which pages are missing, without tracking failed offsets
    // separately. Documented trade-off in DECISIONS.md.
    await this.loadAll();
  }

  private appendRaw(items: RawOrganisation[], seenIds: Set<number>) {
    const normalized = items.map((raw) => normalizeOrganisation(raw, seenIds));
    this._all.update((current) => [...current, ...normalized]);
    this._loadedCount.update((n) => n + items.length);
  }

  private async fetchPageWithRetry(offset: number) {
    for (let attempt = 1; attempt <= RETRY_LIMIT; attempt++) {
      try {
        return await this.limiter.run(() => this.api.getPage(offset));
      } catch {
        if (attempt === RETRY_LIMIT) return null;
        await new Promise((r) => setTimeout(r, 300 * attempt));
      }
    }
    return null;
  }

  addLocal(org: Organisation): void {
    this._all.update((current) => [org, ...current]);
    this._loadedCount.update((n) => n + 1);
    this._totalCount.update((n) => (n === null ? 1 : n + 1));
  }

  isNameTaken(name: string, excludeId?: number): boolean {
    const needle = name.trim().toLowerCase();
    return this._all().some(
      (o) => o.id !== excludeId && o.hasName && o.name.toLowerCase() === needle
    );
  }
}
