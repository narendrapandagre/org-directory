import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { RawOrganisation } from '../models/organisation.model';

export const PAGE_SIZE = 25;
export const FAILURE_RATE = 0.15;
export const MIN_DELAY_MS = 400;
export const MAX_DELAY_MS = 900;

export interface RawPage {
  items: RawOrganisation[];
  total: number;
  offset: number;
  limit: number;
}

/**
 * Stands in for the real backend described in the brief:
 * - max 25 records per request
 * - 400-900ms artificial latency
 * - ~15% random failure on the list endpoint
 *
 * This is the ONLY place that knows about pagination and flakiness.
 * Everything above it (OrganisationService) treats it as "the API".
 */
@Injectable({ providedIn: 'root' })
export class MockApiService {
  private cache$: Promise<RawOrganisation[]> | null = null;

  constructor(private http: HttpClient) {}

  async getPage(offset: number, limit: number = PAGE_SIZE): Promise<RawPage> {
    const all = await this.loadFixture();
    await this.simulateLatency();
    this.maybeFail();

    const items = all.slice(offset, offset + limit);
    return { items, total: all.length, offset, limit };
  }

  async createOrganisation(payload: RawOrganisation): Promise<RawOrganisation> {
    await this.simulateLatency();
    this.maybeFail();
    return payload;
  }

  private loadFixture(): Promise<RawOrganisation[]> {
    if (!this.cache$) {
      this.cache$ = firstValueFrom(
        this.http.get<RawOrganisation[]>('assets/data/organisations.json')
      );
    }
    return this.cache$;
  }

  private simulateLatency(): Promise<void> {
    const ms = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private maybeFail(): void {
    if (Math.random() < FAILURE_RATE) {
      throw new Error('Simulated API failure (random ~15% failure rate)');
    }
  }
}
