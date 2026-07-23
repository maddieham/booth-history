import fs from 'fs';
import path from 'path';
import type { PollingPlace, ContestResult } from '../src/types';

// CSV line parser that handles optional quotes
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function determineBoothType(name: string): "ordinary" | "pre-poll" | "postal" | "absent" | "other-dec" {
  const lower = name.toLowerCase();
  if (lower.includes('pre-poll') || lower.includes('evc') || lower.includes('ppvc')) {
    return 'pre-poll';
  }
  if (lower.includes('postal')) {
    return 'postal';
  }
  if (lower.includes('absent')) {
    return 'absent';
  }
  if (lower.includes('declared institution') || lower.includes('provisional') || lower.includes('other-dec') || lower.includes('facility') || lower.includes('hospital team')) {
    return 'other-dec';
  }
  return 'ordinary';
}

const csvDir = path.resolve(import.meta.dirname || '.', '../aec-csv');
const boothsPath = path.resolve(import.meta.dirname || '.', '../src/data/booths.json');

// Load booths database
if (!fs.existsSync(boothsPath)) {
  console.error(`booths.json not found at ${boothsPath}`);
  process.exit(1);
}
let booths: PollingPlace[] = JSON.parse(fs.readFileSync(boothsPath, 'utf-8'));

// 2013 is intentionally excluded and removed from the active dataset (many of its booths
// belong to pre-redistribution electorates with no later equivalent). To restore it, see
// archive/2013-federal.json and re-add 2013 here - aec-csv/2013.csv is still the raw source.
const targetYears = [2016, 2019, 2022, 2025];

// Clear existing federal election results for the target years to prevent duplicates
booths.forEach(b => {
  b.results = b.results.filter(r => {
    const isFederal = r.electionId.endsWith('-federal');
    if (!isFederal) return true;
    const year = parseInt(r.electionId.split('-')[0]);
    return !targetYears.includes(year);
  });
});

targetYears.forEach(year => {
  const csvFile = path.join(csvDir, `${year}.csv`);
  if (!fs.existsSync(csvFile)) {
    console.warn(`CSV file not found for year ${year}: ${csvFile}`);
    return;
  }

  console.log(`\nProcessing ${year} Federal Election...`);
  const content = fs.readFileSync(csvFile, 'utf-8');
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  
  if (lines.length < 2) {
    console.warn(`File ${csvFile} is empty or has no data rows.`);
    return;
  }

  // Headers are on the second line (index 1)
  const headers = parseCsvLine(lines[1]);
  
  // Find columns
  const divIndex = headers.indexOf('DivisionNm');
  const pollingPlaceIndex = headers.indexOf('PollingPlace');
  const candidateIdIndex = headers.indexOf('CandidateID');
  const partyAbIndex = headers.indexOf('PartyAb');
  const votesIndex = headers.indexOf('OrdinaryVotes');

  if (divIndex === -1 || pollingPlaceIndex === -1 || candidateIdIndex === -1 || partyAbIndex === -1 || votesIndex === -1) {
    console.error(`Missing required columns in ${csvFile}. Headers:`, headers);
    return;
  }

  // Aggregate votes by: PollingPlace -> Party -> Votes
  // Key: PollingPlaceName || DivisionName
  const aggData: Record<string, {
    pollingPlaceName: string;
    division: string;
    grn: number;
    alp: number;
    lnp: number;
    oth: number;
    totalFormal: number;
  }> = {};

  // Parse lines starting from line index 2 (skipping metadata at 0 and headers at 1)
  for (let i = 2; i < lines.length; i++) {
    const row = parseCsvLine(lines[i]);
    if (row.length < headers.length) continue;

    const division = row[divIndex];
    if (division !== 'Newcastle' && division !== 'Shortland') continue;

    const pollingPlace = row[pollingPlaceIndex];
    const candidateId = row[candidateIdIndex];
    const partyAb = row[partyAbIndex];
    const votes = parseInt(row[votesIndex].replace(/,/g, '')) || 0;

    if (candidateId === '999' || partyAb === 'Informal') {
      // Skip informal votes
      continue;
    }

    const key = `${pollingPlace}||${division}`;
    if (!aggData[key]) {
      aggData[key] = {
        pollingPlaceName: pollingPlace,
        division,
        grn: 0,
        alp: 0,
        lnp: 0,
        oth: 0,
        totalFormal: 0
      };
    }

    const data = aggData[key];
    if (partyAb === 'GRN') {
      data.grn += votes;
    } else if (partyAb === 'ALP') {
      data.alp += votes;
    } else if (partyAb === 'LP' || partyAb === 'NP' || partyAb === 'LNP' || partyAb === 'LIB') {
      data.lnp += votes;
    } else {
      data.oth += votes;
    }
    data.totalFormal += votes;
  }

  const electionId = `${year}-federal`;
  let matchedCount = 0;
  let createdCount = 0;

  Object.values(aggData).forEach(data => {
    if (data.totalFormal === 0) return;

    const rawName = data.pollingPlaceName;
    const type = determineBoothType(rawName);
    const division = data.division;

    // Strict exact matching matching the rules of reingest-all.ts
    let booth: PollingPlace | undefined;
    if (type === 'ordinary') {
      booth = booths.find(b => b.name === rawName && (!b.type || b.type === 'ordinary'));
    } else {
      booth = booths.find(b => b.name === rawName && b.division === division && b.type === type);
    }

    const results: ContestResult[] = [
      {
        electionId,
        contestName: "House of Representatives",
        party: "GRN",
        votes: data.grn,
        percentage: parseFloat(((data.grn / data.totalFormal) * 100).toFixed(2)),
        division
      },
      {
        electionId,
        contestName: "House of Representatives",
        party: "ALP",
        votes: data.alp,
        percentage: parseFloat(((data.alp / data.totalFormal) * 100).toFixed(2)),
        division
      },
      {
        electionId,
        contestName: "House of Representatives",
        party: "LNP",
        votes: data.lnp,
        percentage: parseFloat(((data.lnp / data.totalFormal) * 100).toFixed(2)),
        division
      },
      {
        electionId,
        contestName: "House of Representatives",
        party: "OTH",
        votes: data.oth,
        percentage: parseFloat(((data.oth / data.totalFormal) * 100).toFixed(2)),
        division
      }
    ];

    if (booth) {
      // Remove any existing result for this election/contest to be safe
      booth.results = booth.results.filter(
        r => !(r.electionId === electionId && r.contestName === "House of Representatives")
      );
      booth.results.push(...results);
      matchedCount++;
    } else {
      // Create a new booth
      const maxId = booths.length > 0 ? Math.max(...booths.map(b => parseInt(b.id) || 0)) : 0;
      const newBoothId = String(maxId + 1);
      
      const newBooth: PollingPlace = {
        id: newBoothId,
        name: rawName,
        division,
        lga: division === 'Newcastle' ? "City of Newcastle" : "Lake Macquarie City Council",
        lat: -32.9272,
        lng: 151.7761,
        type: type === 'ordinary' ? undefined : type,
        results
      };
      booths.push(newBooth);
      createdCount++;
    }
  });

  console.log(`Matched and updated: ${matchedCount} booths.`);
  console.log(`Created new: ${createdCount} booths.`);
});

// Save booths back to booths.json
fs.writeFileSync(boothsPath, JSON.stringify(booths, null, 2), 'utf-8');
console.log('\nSuccessfully saved federal election data to booths.json.');
