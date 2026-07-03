import fs from 'fs';
import path from 'path';
import type { PollingPlace, Election } from '../src/types';

const boothsPath = path.resolve(import.meta.dirname || '.', '../src/data/booths.json');
const electionsPath = path.resolve(import.meta.dirname || '.', '../src/data/elections.json');
const outputPath = path.resolve(import.meta.dirname || '.', '../src/data/election-summaries.json');

const booths: PollingPlace[] = JSON.parse(fs.readFileSync(boothsPath, 'utf-8'));
const elections: Election[] = JSON.parse(fs.readFileSync(electionsPath, 'utf-8'));

const electionsMap = new Map<string, Election>();
elections.forEach(e => electionsMap.set(e.id, e));

// ── Types ────────────────────────────────────────────────────────────────────

export type ElectionSummary = {
  /** Unique key: "<electionId>||<contestName>||<division>" */
  id: string;
  electionId: string;
  electionName: string;
  electionType: string;
  electionDate: string;
  electionYear: number;
  contestName: string;
  division: string;

  grnVotes: number;
  grnPct: number;
  alpVotes: number;
  alpPct: number;
  lnpVotes: number;
  lnpPct: number;
  othVotes: number;
  othPct: number;
  totalVotes: number;

  boothCount: number;

  /** Swing in GRN percentage vs the previous comparable election contest (null if no prior data) */
  grnSwing: number | null;
};

// ── Aggregate ────────────────────────────────────────────────────────────────

// Map keyed by "<electionId>||<contestName>||<division>"
const summaryMap = new Map<string, {
  electionId: string;
  contestName: string;
  division: string;
  grn: number; alp: number; lnp: number; oth: number; total: number;
  boothIds: Set<string>;
}>();

booths.forEach(booth => {
  booth.results.forEach(r => {
    // Skip placeholder results (votes === 0 means no real count was ingested)
    if (r.votes === 0) return;
    const election = electionsMap.get(r.electionId);
    if (!election) return;

    const division = r.division || election.division;
    const key = `${r.electionId}||${r.contestName}||${division}`;

    if (!summaryMap.has(key)) {
      summaryMap.set(key, {
        electionId: r.electionId,
        contestName: r.contestName,
        division,
        grn: 0, alp: 0, lnp: 0, oth: 0, total: 0,
        boothIds: new Set(),
      });
    }

    const s = summaryMap.get(key)!;
    s.boothIds.add(booth.id);

    switch (r.party) {
      case 'GRN': s.grn += r.votes; break;
      case 'ALP': s.alp += r.votes; break;
      case 'LNP': s.lnp += r.votes; break;
      case 'OTH': s.oth += r.votes; break;
    }
    s.total += r.votes;
  });
});

// ── Build summary objects ────────────────────────────────────────────────────

const rawSummaries: Omit<ElectionSummary, 'grnSwing'>[] = [];

summaryMap.forEach((s, key) => {
  const election = electionsMap.get(s.electionId)!;
  const total = s.total;
  if (total === 0) return;

  rawSummaries.push({
    id: key,
    electionId: s.electionId,
    electionName: election.name,
    electionType: election.type,
    electionDate: election.date,
    electionYear: new Date(election.date).getFullYear(),
    contestName: s.contestName,
    division: s.division,

    grnVotes: s.grn,
    grnPct: parseFloat(((s.grn / total) * 100).toFixed(2)),
    alpVotes: s.alp,
    alpPct: parseFloat(((s.alp / total) * 100).toFixed(2)),
    lnpVotes: s.lnp,
    lnpPct: parseFloat(((s.lnp / total) * 100).toFixed(2)),
    othVotes: s.oth,
    othPct: parseFloat(((s.oth / total) * 100).toFixed(2)),
    totalVotes: total,
    boothCount: s.boothIds.size,
  });
});

// ── Calculate swings ─────────────────────────────────────────────────────────
// Group summaries by contestName+division, then sort by date to find previous comparable election

const summaries: ElectionSummary[] = rawSummaries.map(summary => {
  const election = electionsMap.get(summary.electionId)!;

  // The "level" we compare against: by-elections compare to their parentType
  const compareLevel = election.type === 'by-election'
    ? (election.parentType ?? 'state')
    : election.type;

  // Find all comparable summaries: same contestName+division, same level
  const comparables = rawSummaries
    .filter(s => {
      if (s.contestName !== summary.contestName) return false;
      if (s.division !== summary.division) return false;
      if (s.electionId === summary.electionId) return false;

      const el = electionsMap.get(s.electionId)!;
      const level = el.type === 'by-election'
        ? (el.parentType ?? 'state')
        : el.type;
      return level === compareLevel;
    })
    .sort((a, b) => a.electionDate.localeCompare(b.electionDate));

  // Find the one just before this election
  const prevComparable = comparables
    .filter(s => s.electionDate < summary.electionDate)
    .pop();

  const grnSwing = prevComparable != null
    ? parseFloat((summary.grnPct - prevComparable.grnPct).toFixed(2))
    : null;

  return { ...summary, grnSwing };
});

// ── Sort by date desc, then Greens % desc ────────────────────────────────────
summaries.sort((a, b) => {
  const dateDiff = b.electionDate.localeCompare(a.electionDate);
  if (dateDiff !== 0) return dateDiff;
  return b.grnPct - a.grnPct;
});

// ── Write output ─────────────────────────────────────────────────────────────
fs.writeFileSync(outputPath, JSON.stringify(summaries, null, 2), 'utf-8');
console.log(`✅  Wrote ${summaries.length} election contest summaries to ${outputPath}`);
