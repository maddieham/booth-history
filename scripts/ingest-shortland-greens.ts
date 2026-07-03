import fs from 'fs';
import path from 'path';
import type { PollingPlace, ContestResult, Election } from '../src/types';

const data = `Dudley	19.9%	25.2%	20.0%
Charlestown	20.5%	20.9%	20.1%
Whitebridge	17.6%	19.1%	14.4%
Cardiff North	14.6%	18.9%	19.2%
Charlestown East	15.8%	18.7%	16.6%
Kahibah	20.4%	18.2%	18.6%
Garden Suburb	16.8%	18.2%	17.3%
Cardiff	11.3%	15.6%	13.2%
Cardiff South	11.1%	14.5%	16.1%
Charlestown South	15.0%	14.5%	16.9%
Mount Hutton	9.8%	13.8%	13.9%
Speers Point	8.7%	13.6%	13.0%
Belmont West	11.5%	12.5%	14.0%
Hillsborough	12.0%	12.4%	14.2%
Redhead	14.2%	12.1%	14.2%
Gateshead	10.6%	12.0%	13.5%
Warners Bay	11.8%	11.3%	13.6%
Windale	6.8%	11.2%	10.8%
Caves Beach	9.4%	11.0%	11.4%
Belmont Central	9.2%	10.7%	10.9%
Nords Wharf	7.1%	10.7%	12.1%
Belmont North	8.2%	10.4%	10.7%
Swansea Central	7.5%	10.3%	13.0%
Marks Point	7.7%	10.2%	11.1%
Blacksmiths	9.0%	10.0%	10.7%
Belmont	8.5%	9.7%	17.3%
Jewells	8.6%	9.6%	11.4%
Floraville	10.1%	9.4%	12.4%
Warners Bay Central	12.7%	9.0%	11.0%
Warners Bay North	9.8%	8.9%	11.2%
Eleebana	11.8%	8.0%	11.4%
Valentine	11.7%	7.7%	12.5%
Valentine West	12.4%	7.2%	9.3%
Swansea	5.6%	6.9%	10.7%`;

const boothsPath = path.resolve(import.meta.dirname || '.', '../src/data/booths.json');
const electionsPath = path.resolve(import.meta.dirname || '.', '../src/data/elections.json');

const booths: PollingPlace[] = JSON.parse(fs.readFileSync(boothsPath, 'utf-8'));
const elections: Election[] = JSON.parse(fs.readFileSync(electionsPath, 'utf-8'));

// Define the target elections
const targetElections: Election[] = [
  {
    id: "2022-federal-shortland",
    name: "2022 Federal Election",
    date: "2022-05-21",
    type: "federal",
    division: "Shortland"
  },
  {
    id: "2024-lake-macquarie-local",
    name: "2024 Lake Macquarie Local Election",
    date: "2024-09-14",
    type: "local",
    division: "Lake Macquarie"
  },
  {
    id: "2025-federal-shortland",
    name: "2025 Federal Election (Shortland)",
    date: "2025-05-17",
    type: "federal",
    division: "Shortland"
  }
];

// Add elections to elections-mock.json if they don't exist
targetElections.forEach(target => {
  if (!elections.some(e => e.id === target.id)) {
    elections.push(target);
  }
});

// Helper to parse percentage string
const parsePct = (val: string): number => {
  return parseFloat(val.replace('%', '').trim());
};

const lines = data.trim().split('\n');
let matchedCount = 0;
let createdCount = 0;

lines.forEach(line => {
  const parts = line.split('\t');
  if (parts.length < 4) return;

  const rawName = parts[0].trim();
  const fed22Pct = parsePct(parts[1]);
  const local24Pct = parsePct(parts[2]);
  const fed25Pct = parsePct(parts[3]);

  // Try to find existing booth
  let booth = booths.find(b => b.name.toLowerCase() === rawName.toLowerCase());
  if (!booth) {
    booth = booths.find(b =>
      b.name.toLowerCase().includes(rawName.toLowerCase()) ||
      rawName.toLowerCase().includes(b.name.toLowerCase())
    );
  }

  const resultsToApply = [
    { electionId: "2022-federal-shortland", percentage: fed22Pct },
    { electionId: "2024-lake-macquarie-local", percentage: local24Pct },
    { electionId: "2025-federal-shortland", percentage: fed25Pct }
  ];

  if (booth) {
    // Update or insert results
    resultsToApply.forEach(({ electionId, percentage }) => {
      let result = booth!.results.find(r => r.electionId === electionId && r.party === 'GRN');
      if (result) {
        result.percentage = percentage;
      } else {
        booth!.results.push({
          electionId,
          contestName: electionId.includes('local') ? "East Ward" : "House of Representatives",
          party: "GRN",
          votes: 0, // Placeholder
          percentage,
          isElected: false
        });
      }
    });
    matchedCount++;
  } else {
    // Create new booth
    const newId = String(booths.length + 1);
    const newResults: ContestResult[] = resultsToApply.map(({ electionId, percentage }) => ({
      electionId,
      contestName: electionId.includes('local') ? "East Ward" : "House of Representatives",
      party: "GRN",
      votes: 0,
      percentage,
      isElected: false
    }));

    booths.push({
      id: newId,
      name: rawName,
      suburb: rawName, // fallback
      division: "Shortland",
      lga: "Lake Macquarie City Council",
      lat: -33.0039, // Lake Macquarie area coordinates
      lng: 151.6508,
      results: newResults
    });
    createdCount++;
  }
});

console.log(`Matched & Updated: ${matchedCount} booths.`);
console.log(`Created New: ${createdCount} booths.`);

fs.writeFileSync(boothsPath, JSON.stringify(booths, null, 2), 'utf-8');
fs.writeFileSync(electionsPath, JSON.stringify(elections, null, 2), 'utf-8');

console.log('Successfully completed Shortland Greens vote ingestion.');
