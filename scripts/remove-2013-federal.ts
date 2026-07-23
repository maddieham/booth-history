import fs from 'fs';
import path from 'path';
import type { PollingPlace, Election, BoothGroup } from '../src/types';

const dataDir = path.resolve(import.meta.dirname || '.', '../src/data');
const archiveDir = path.resolve(import.meta.dirname || '.', '../archive');

const electionsPath = path.join(dataDir, 'elections.json');
const boothsPath = path.join(dataDir, 'booths.json');
const boothGroupsPath = path.join(dataDir, 'booth-groups.json');
const summariesPath = path.join(dataDir, 'election-summaries.json');

const TARGET = '2013-federal';

const elections: Election[] = JSON.parse(fs.readFileSync(electionsPath, 'utf-8'));
const booths: PollingPlace[] = JSON.parse(fs.readFileSync(boothsPath, 'utf-8'));
const boothGroups: BoothGroup[] = JSON.parse(fs.readFileSync(boothGroupsPath, 'utf-8'));
const summaries: any[] = JSON.parse(fs.readFileSync(summariesPath, 'utf-8'));

const electionEntry = elections.find(e => e.id === TARGET);
if (!electionEntry) {
  console.error(`Election ${TARGET} not found in elections.json - nothing to do`);
  process.exit(1);
}

// Classify each raw booth record
const pureTargetBoothNames = new Set<string>();
const mixedBoothResults: Record<string, any[]> = {};

for (const b of booths) {
  const targetResults = b.results.filter(r => r.electionId === TARGET);
  const otherResults = b.results.filter(r => r.electionId !== TARGET);
  if (targetResults.length === 0) continue;
  if (otherResults.length === 0) {
    // Entire raw record is 2013-only
    pureTargetBoothNames.add(b.name);
  } else {
    // Mixed - archive the 2013 results, strip them from the live record
    mixedBoothResults[b.id] = targetResults;
    b.results = otherResults;
  }
}

const archivedRawBooths = booths.filter(b => pureTargetBoothNames.has(b.name));
const remainingBooths = booths.filter(b => !pureTargetBoothNames.has(b.name));

// Determine which booth-groups are now fully dead (every rawName was a pure-2013 booth)
const deadGroups: BoothGroup[] = [];
const liveGroups: BoothGroup[] = [];
for (const g of boothGroups) {
  const matchingRawBooths = booths.filter(b => g.rawNames.includes(b.name));
  const allDead = matchingRawBooths.length > 0 && matchingRawBooths.every(b => pureTargetBoothNames.has(b.name));
  if (allDead) {
    deadGroups.push(g);
  } else {
    liveGroups.push(g);
  }
}

const archivedSummaryRows = summaries.filter(s => s.electionId === TARGET);

fs.mkdirSync(archiveDir, { recursive: true });
const archive = {
  _readme:
    "Archive of the 2013 federal election, removed from the active dataset because a large fraction of its booths belong to pre-redistribution electorates that don't match any later election's boundaries. " +
    "This file preserves everything needed to restore it. To restore: (1) manually merge `election` back into src/data/elections.json, `archivedRawBooths` back into src/data/booths.json, `deadBoothGroups` back into src/data/booth-groups.json, and re-add each mixedBoothResults[boothId] entry back into that booth's results array in booths.json, then rerun `npm run generate:summaries`; OR (2) simpler: re-add 2013 to `targetYears` in scripts/ingest-all-federal-aec.ts and rerun it (`npx tsx scripts/ingest-all-federal-aec.ts`) against the untouched raw source aec-csv/2013.csv, which regenerates booths.json from scratch. Either way, you'll also need to re-add the 18 booth-groups.json entries in `deadBoothGroups` since ingestion does not create booth-groups.json entries.",
  election: electionEntry,
  archivedRawBooths,
  deadBoothGroups: deadGroups,
  mixedBoothResults,
  archivedSummaryRows,
};

fs.writeFileSync(path.join(archiveDir, `${TARGET}.json`), JSON.stringify(archive, null, 2) + '\n');
fs.writeFileSync(boothsPath, JSON.stringify(remainingBooths, null, 2) + '\n');
fs.writeFileSync(boothGroupsPath, JSON.stringify(liveGroups, null, 2) + '\n');

console.log(`Archived election entry: ${electionEntry.id}`);
console.log(`Mixed booths with 2013 results stripped: ${Object.keys(mixedBoothResults).length}`);
console.log(`Fully-orphaned raw booth records removed: ${archivedRawBooths.length}`);
console.log(`Dead booth-groups removed: ${deadGroups.length} -> ${deadGroups.map(g => g.slug).join(', ')}`);
console.log(`Archived summary rows: ${archivedSummaryRows.length}`);
console.log(`booths.json: ${booths.length} -> ${remainingBooths.length} records`);
console.log(`booth-groups.json: ${boothGroups.length} -> ${liveGroups.length} groups`);
