import { Organisation, OrgStatus, RawOrganisation } from '../models/organisation.model';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Maps every observed spelling/casing in the fixture to a canonical status.
 * "actve" is a real typo present in the data (id 42's second row) — it is
 * treated as "active" rather than "unknown" because it is a spelling
 * mistake, not a genuinely different status. Anything else unrecognised,
 * missing, or blank becomes "unknown" and is shown as such (see FR4/A11y
 * decision in DECISIONS.md) rather than silently defaulting to "active".
 */
const STATUS_MAP: Record<string, OrgStatus> = {
  active: 'active',
  actve: 'active',
  inactive: 'inactive',
  suspended: 'suspended',
};

function normalizeStatus(raw: string | null | undefined): OrgStatus {
  if (!raw) return 'unknown';
  const key = raw.trim().toLowerCase();
  return STATUS_MAP[key] ?? 'unknown';
}

function normalizeName(raw: string | null | undefined): { name: string; hasName: boolean } {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) {
    return { name: '', hasName: false };
  }
  return { name: trimmed, hasName: true };
}

function normalizeMemberCount(raw: number | string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const n = typeof raw === 'string' ? Number(raw.trim()) : raw;
  if (!Number.isFinite(n)) return null;
  if (n < 0) return null; // -1 in the fixture is treated as "not recorded", not "minus one member"
  return Math.trunc(n);
}

function normalizeEmail(raw: string | null | undefined): { email: string | null; valid: boolean } {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return { email: null, valid: false };
  return { email: trimmed, valid: EMAIL_RE.test(trimmed) };
}

function normalizeDate(raw: string | number | null | undefined): Date | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const d = typeof raw === 'number' ? new Date(raw) : new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Converts one raw fixture row into the strict shape the UI relies on.
 * `seenIds` lets the caller flag duplicate ids (e.g. the two id:42 rows)
 * without this function needing to know about the rest of the list.
 */
export function normalizeOrganisation(
  raw: RawOrganisation,
  seenIds: Set<number>
): Organisation {
  const { name, hasName } = normalizeName(raw.name);
  const { email, valid } = normalizeEmail(raw.owner?.email);
  const isDuplicateId = seenIds.has(raw.id);
  seenIds.add(raw.id);

  return {
    id: raw.id,
    name,
    hasName,
    status: normalizeStatus(raw.status),
    rawStatus: raw.status ?? null,
    memberCount: normalizeMemberCount(raw.memberCount),
    ownerEmail: email,
    isOwnerEmailValid: valid,
    createdAt: normalizeDate(raw.createdAt),
    isDuplicateId,
  };
}
