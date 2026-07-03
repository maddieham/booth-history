import fs from 'fs';
import path from 'path';
import type { PollingPlace, Election } from '../src/types';

const boothsPath = path.resolve(import.meta.dirname || '.', '../src/data/booths.json');
const electionsPath = path.resolve(import.meta.dirname || '.', '../src/data/elections.json');

const booths: PollingPlace[] = JSON.parse(fs.readFileSync(boothsPath, 'utf-8'));
const elections: Election[] = JSON.parse(fs.readFileSync(electionsPath, 'utf-8'));

// Mapping of old election IDs to new merged election IDs for federal and state elections
const idMapping: Record<string, string> = {
  // Federal
  "2025-federal-shortland": "2025-federal",
  "2022-federal-shortland": "2022-federal",
  "2022-federal-newcastle": "2022-federal",
  "2019-federal-shortland": "2019-federal",
  "2019-federal-newcastle": "2019-federal",
  "2016-federal-shortland": "2016-federal",
  "2016-federal-newcastle": "2016-federal",
  "2013-federal-shortland": "2013-federal",
  "2013-federal-newcastle": "2013-neutral" ? "2013-federal" : "2013-federal", // safe check

  // State
  "2023-state-charlestown": "2023-state",
  "2023-state-newcastle": "2023-state",
  "2019-state-charlestown": "2019-state",
  "2019-state-newcastle": "2019-state",
  "2015-state-charlestown": "2015-state",
  "2015-state-newcastle": "2015-state"
};

// 1. Merge elections in elections.json
const mergedElectionsMap = new Map<string, Election>();

elections.forEach(el => {
  const targetId = idMapping[el.id] || el.id;
  
  if (mergedElectionsMap.has(targetId)) {
    const existing = mergedElectionsMap.get(targetId)!;
    // Combine divisions
    const divSet = new Set([
      ...existing.division.split(',').map(d => d.trim()),
      ...el.division.split(',').map(d => d.trim())
    ]);
    existing.division = Array.from(divSet).sort().join(', ');
  } else {
    // Clone
    mergedElectionsMap.set(targetId, {
      ...el,
      id: targetId,
      name: el.name.replace(/ \(Shortland\)|\(Charlestown\)|\(Newcastle\)/g, '').trim()
    });
  }
});

const newElections = Array.from(mergedElectionsMap.values());
fs.writeFileSync(electionsPath, JSON.stringify(newElections, null, 2), 'utf-8');
console.log("Successfully merged elections.json. Remaining unique elections:", newElections.length);

// 2. Update all booths in booths.json
let updatedResultsCount = 0;
booths.forEach(booth => {
  booth.results.forEach(res => {
    if (idMapping[res.electionId]) {
      res.electionId = idMapping[res.electionId];
      updatedResultsCount++;
    }
  });
});

fs.writeFileSync(boothsPath, JSON.stringify(booths, null, 2), 'utf-8');
console.log(`Successfully updated ${updatedResultsCount} result entries in booths.json.`);
