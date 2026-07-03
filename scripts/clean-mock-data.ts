import fs from 'fs';
import path from 'path';
import type { PollingPlace, Election } from '../src/types';

const boothsPath = path.resolve(import.meta.dirname || '.', '../src/data/booths.json');
const electionsPath = path.resolve(import.meta.dirname || '.', '../src/data/elections.json');

// 1. Clean booths-mock.json
const booths: PollingPlace[] = JSON.parse(fs.readFileSync(boothsPath, 'utf-8'));
const filteredBooths = booths
  .map(booth => {
    // Keep only 2025-federal results
    const results2025 = booth.results.filter(r => r.electionId === '2025-federal');
    return { ...booth, results: results2025 };
  })
  // Only keep booths that actually have 2025-federal results
  .filter(booth => booth.results.length > 0);

fs.writeFileSync(boothsPath, JSON.stringify(filteredBooths, null, 2), 'utf-8');
console.log(`Cleaned booths-mock.json. Kept ${filteredBooths.length} booths.`);

// 2. Clean elections-mock.json
const elections: Election[] = JSON.parse(fs.readFileSync(electionsPath, 'utf-8'));
const filteredElections = elections.filter(e => e.id === '2025-federal');

fs.writeFileSync(electionsPath, JSON.stringify(filteredElections, null, 2), 'utf-8');
console.log(`Cleaned elections-mock.json. Kept ${filteredElections.length} elections.`);
