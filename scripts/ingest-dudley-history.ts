import fs from 'fs';
import path from 'path';
import type { PollingPlace, ContestResult, Election } from '../src/types';

// Raw data provided by the user
const rawData = `Election	Labor	Liberal	Greens	PHON	Other	Total
2013 Federal	560	512	167		81	1320
2015 State	571	422	214		119	1326
2016 Federal	535	556	227		34	1352
2019 State	587	434	195		52	1268
2019 Federal	460	442	192		106	1200
2021 Local	319	224	158		274	975
2022 Federal	417	266	208	45	107	1043
2023 State	543	244	201		63	1051
2024 Local	365	253	282		170	1070
2025 Federal	424	243	204	38	112	1021`;

const boothsPath = path.resolve(import.meta.dirname || '.', '../src/data/booths.json');
const electionsPath = path.resolve(import.meta.dirname || '.', '../src/data/elections.json');

const booths: PollingPlace[] = JSON.parse(fs.readFileSync(boothsPath, 'utf-8'));
const elections: Election[] = JSON.parse(fs.readFileSync(electionsPath, 'utf-8'));

// Define metadata for all election records we want to ensure exist in elections.json
const electionMetadata: Record<string, Omit<Election, 'id'>> = {
  "2013-federal-shortland": {
    name: "2013 Federal Election",
    date: "2013-09-07",
    type: "federal",
    division: "Shortland"
  },
  "2015-state-charlestown": {
    name: "2015 State Election (Charlestown)",
    date: "2015-03-28",
    type: "state",
    division: "Charlestown"
  },
  "2016-federal-shortland": {
    name: "2016 Federal Election",
    date: "2016-07-02",
    type: "federal",
    division: "Shortland"
  },
  "2019-state-charlestown": {
    name: "2019 State Election (Charlestown)",
    date: "2019-03-23",
    type: "state",
    division: "Charlestown"
  },
  "2019-federal-shortland": {
    name: "2019 Federal Election",
    date: "2019-05-18",
    type: "federal",
    division: "Shortland"
  },
  "2021-lake-macquarie-local": {
    name: "2021 Lake Macquarie Local Election",
    date: "2021-12-04",
    type: "local",
    division: "Lake Macquarie"
  },
  "2022-federal-shortland": {
    name: "2022 Federal Election",
    date: "2022-05-21",
    type: "federal",
    division: "Shortland"
  },
  "2023-state-charlestown": {
    name: "2023 State Election (Charlestown)",
    date: "2023-03-25",
    type: "state",
    division: "Charlestown"
  },
  "2024-lake-macquarie-local": {
    name: "2024 Lake Macquarie Local Election",
    date: "2024-09-14",
    type: "local",
    division: "Lake Macquarie"
  },
  "2025-federal-shortland": {
    name: "2025 Federal Election (Shortland)",
    date: "2025-05-17",
    type: "federal",
    division: "Shortland"
  }
};

// Map input line label to target election ID
const mapRowToElectionId = (rowName: string): string => {
  const name = rowName.toLowerCase().trim();
  if (name.includes("2013") && name.includes("federal")) return "2013-federal-shortland";
  if (name.includes("2015") && name.includes("state")) return "2015-state-charlestown";
  if (name.includes("2016") && name.includes("federal")) return "2016-federal-shortland";
  if (name.includes("2019") && name.includes("state")) return "2019-state-charlestown";
  if (name.includes("2019") && name.includes("federal")) return "2019-federal-shortland";
  if (name.includes("2021") && name.includes("local")) return "2021-lake-macquarie-local";
  if (name.includes("2022") && name.includes("federal")) return "2022-federal-shortland";
  if (name.includes("2023") && name.includes("state")) return "2023-state-charlestown";
  if (name.includes("2024") && name.includes("local")) return "2024-lake-macquarie-local";
  if (name.includes("2025") && name.includes("federal")) return "2025-federal-shortland";
  throw new Error(`Unknown election mapping for: ${rowName}`);
};

// 1. Ensure all elections are registered
Object.entries(electionMetadata).forEach(([id, meta]) => {
  const exists = elections.some(e => e.id === id);
  if (!exists) {
    elections.push({ id, ...meta });
    console.log(`Added missing election: ${id}`);
  }
});

// Write elections back
fs.writeFileSync(electionsPath, JSON.stringify(elections, null, 2), 'utf-8');

// 2. Parse Dudley booth data
const lines = rawData.trim().split('\n');
const headers = lines[0].split('\t');

// Identify columns
const laborIdx = headers.findIndex(h => h.toLowerCase() === 'labor');
const liberalIdx = headers.findIndex(h => h.toLowerCase() === 'liberal');
const greensIdx = headers.findIndex(h => h.toLowerCase() === 'greens');
const phonIdx = headers.findIndex(h => h.toLowerCase() === 'phon');
const otherIdx = headers.findIndex(h => h.toLowerCase() === 'other');
const totalIdx = headers.findIndex(h => h.toLowerCase() === 'total');

// Try to find Dudley booth
const targetBoothName = "Dudley";
let booth = booths.find(b => b.name.toLowerCase() === targetBoothName.toLowerCase());
if (!booth) {
  booth = booths.find(b =>
    b.name.toLowerCase().includes(targetBoothName.toLowerCase()) ||
    targetBoothName.toLowerCase().includes(b.name.toLowerCase())
  );
}

if (!booth) {
  // If not found, create new Dudley booth
  console.log(`Dudley booth not found. Creating a new one...`);
  booth = {
    id: String(booths.length + 1),
    name: "Dudley",
    suburb: "Dudley",
    division: "Shortland",
    lga: "Lake Macquarie City Council",
    lat: -33.0039,
    lng: 151.6508,
    results: []
  };
  booths.push(booth);
}

// Ingest/update each row
lines.slice(1).forEach(line => {
  const parts = line.split('\t');
  if (parts.length < headers.length) return;

  const electionRaw = parts[0].trim();
  const electionId = mapRowToElectionId(electionRaw);

  const total = parseInt(parts[totalIdx]) || 0;
  if (total === 0) return;

  const laborVotes = parseInt(parts[laborIdx]) || 0;
  const liberalVotes = parseInt(parts[liberalIdx]) || 0;
  const greensVotes = parseInt(parts[greensIdx]) || 0;
  const phonVotes = parseInt(parts[phonIdx]) || 0;
  const otherVotes = parseInt(parts[otherIdx]) || 0;

  // PHON is ignored (meaning it is grouped into OTH along with Other)
  const allOthersVotes = phonVotes + otherVotes;

  const resultsData = [
    { party: "ALP", votes: laborVotes },
    { party: "LNP", votes: liberalVotes }, // Standardizing Liberal to LNP
    { party: "GRN", votes: greensVotes },
    { party: "OTH", votes: allOthersVotes }
  ];

  // Determine contestName
  let contestName = "House of Representatives";
  if (electionId.includes("-state-")) {
    contestName = "Legislative Assembly";
  } else if (electionId.includes("-local")) {
    contestName = "East Ward";
  }

  // Find which party won the most votes to set isElected
  let maxVotes = -1;
  let winningParty = "";
  resultsData.forEach(r => {
    if (r.votes > maxVotes) {
      maxVotes = r.votes;
      winningParty = r.party;
    }
  });

  resultsData.forEach(({ party, votes }) => {
    const percentage = parseFloat(((votes / total) * 100).toFixed(2));
    const isElected = party === winningParty;

    // Check if result already exists for this election and party
    let result = booth!.results.find(r => r.electionId === electionId && r.party === party);
    if (result) {
      // Update existing result
      result.votes = votes;
      result.percentage = percentage;
      result.isElected = isElected;
    } else {
      // Push new ContestResult
      booth!.results.push({
        electionId,
        contestName,
        party,
        votes,
        percentage,
        isElected
      });
    }
  });
});

// Save modified booths back to booths.json
fs.writeFileSync(boothsPath, JSON.stringify(booths, null, 2), 'utf-8');
console.log(`Successfully completed ingestion for Dudley booth. Saved modifications to booths.json and elections.json.`);
