/**
 * Shape as it actually arrives from the API/fixture. Deliberately loose —
 * every field is allowed to be missing, null, or the wrong type, because
 * that is what the fixture does.
 */
export interface RawOrganisation {
  id: number;
  name?: string | null;
  status?: string | null;
  memberCount?: number | string | null;
  owner?: { email?: string | null } | null;
  createdAt?: string | number | null;
}

export type OrgStatus = 'active' | 'inactive' | 'suspended' | 'unknown';

/**
 * Shape the UI is allowed to rely on. Every field is always present and
 * always the right type — normalisation happens once, at the boundary,
 * in OrganisationService. Nothing downstream re-checks for null/NaN.
 */
export interface Organisation {
  id: number;
  /** Trimmed display name; falls back to a placeholder key when blank/null. */
  name: string;
  hasName: boolean;
  status: OrgStatus;
  /** Original raw status string, kept only for debugging/QA, never shown. */
  rawStatus: string | null;
  memberCount: number | null;
  ownerEmail: string | null;
  isOwnerEmailValid: boolean;
  createdAt: Date | null;
  /** True when the id also appears on another row in the same page load. */
  isDuplicateId: boolean;
}

export interface OrganisationListResult {
  items: Organisation[];
  total: number;
}

export type SortField = 'name' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface OrganisationQuery {
  search: string;
  status: OrgStatus | 'all';
  sortField: SortField;
  sortDirection: SortDirection;
}
