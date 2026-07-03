import fs from 'fs';
import path from 'path';
import type { PollingPlace, ContestResult, Election } from '../src/types';

const hamiltonRaw = `Election	Labor	Liberal	Greens	PHON	Other	Total
2013 Federal	695	460	318		150	1623
2015 State	975	804	548		144	2471
2016 Federal	1053	619	492		189	2353
2017 Local	834	343	575		594	2346
2019 State	1060	505	481		288	2334
2019 Federal	904	494	503		184	2085
2021 Local	630	250	520		261	1661
2022 Federal	743	319	640	60	123	1885
2023 State	888	330	426		171	1815
2024 Local	569	286	646		450	1951`;

const jesmondRaw = `Election	Labor	Liberal	Greens	PHON	Other	Total
2013 Federal	537	293	159		116	1105
2015 State	1041	395	301		126	1863
2016 Federal	1158	397	260		253	2068
2017 Local	668	158	260		405	1491
2019 State	963	242	209		127	1541
2019 Federal	850	251	296		166	1563
2021 Local	564	184	201		205	1154
2022 Federal	681	238	395	76	142	1532
2023 State	896	169	268	85	109	1527
2024 Local	522		388		362	1272`;

const boothsPath = path.resolve(import.meta.dirname || '.', '../src/data/booths.json');
const electionsPath = path.resolve(import.meta.dirname || '.', '../src/data/elections.json');

let booths: PollingPlace[] = JSON.parse(fs.readFileSync(boothsPath, 'utf-8'));
let elections: Election[] = JSON.parse(fs.readFileSync(electionsPath, 'utf-8'));

// --- Cleanup misplaced results from previous run ---
const hamiltonSouth = booths.find(b => b.id === "2");
if (hamiltonSouth) {
  hamiltonSouth.results = hamiltonSouth.results.filter(r => r.electionId === "2025-federal");
  console.log("Cleaned up Hamilton South Community Hall (ID 2) results.");
}

const jesmondNorth = booths.find(b => b.id === "34");
if (jesmondNorth) {
  jesmondNorth.results = jesmondNorth.results.filter(r => r.electionId === "2025-federal");
  console.log("Cleaned up Jesmond North (ID 34) results.");
}

// Remove any accidentally created booth named "Hamilton"
booths = booths.filter(b => b.name !== "Hamilton");

// Define the required Newcastle metadata (using merged IDs for federal/state)
const newcastleElectionMetadata: Record<string, Omit<Election, 'id'>> = {
  "2013-federal": {
    name: "2013 Federal Election",
    date: "2013-09-07",
    type: "federal",
    division: "Newcastle, Shortland"
  },
  "2015-state": {
    name: "2015 State Election",
    date: "2015-03-28",
    type: "state",
    division: "Charlestown, Newcastle"
  },
  "2016-federal": {
    name: "2016 Federal Election",
    date: "2016-07-02",
    type: "federal",
    division: "Newcastle, Shortland"
  },
  "2017-local-newcastle": {
    name: "2017 Newcastle Local Election",
    date: "2017-09-09",
    type: "local",
    division: "Newcastle"
  },
  "2019-state": {
    name: "2019 State Election",
    date: "2019-03-23",
    type: "state",
    division: "Charlestown, Newcastle"
  },
  "2019-federal": {
    name: "2019 Federal Election",
    date: "2019-05-18",
    type: "federal",
    division: "Newcastle, Shortland"
  },
  "2021-local-newcastle": {
    name: "2021 Newcastle Local Election",
    date: "2021-12-04",
    type: "local",
    division: "Newcastle"
  },
  "2022-federal": {
    name: "2022 Federal Election",
    date: "2022-05-21",
    type: "federal",
    division: "Newcastle, Shortland"
  },
  "2023-state": {
    name: "2023 State Election",
    date: "2023-03-25",
    type: "state",
    division: "Charlestown, Newcastle"
  },
  "2024-local-newcastle": {
    name: "2024 Newcastle Local Election",
    date: "2024-09-14",
    type: "local",
    division: "Newcastle"
  }
};

// 1. Ensure all Newcastle elections are registered in elections.json
Object.entries(newcastleElectionMetadata).forEach(([id, meta]) => {
  const exists = elections.some(e => e.id === id);
  if (!exists) {
    elections.push({ id, ...meta });
    console.log(`Registered missing election: ${id}`);
  } else {
    // If it exists, make sure division includes Newcastle
    const existing = elections.find(e => e.id === id)!;
    const divSet = new Set([
      ...existing.division.split(',').map(d => d.trim()),
      ...meta.division.split(',').map(d => d.trim())
    ]);
    existing.division = Array.from(divSet).sort().join(', ');
  }
});

// Save updated elections
fs.writeFileSync(electionsPath, JSON.stringify(elections, null, 2), 'utf-8');

const mapRowToElectionId = (rowName: string): string => {
  const name = rowName.toLowerCase().trim();
  if (name.includes("2013") && name.includes("federal")) return "2013-federal";
  if (name.includes("2015") && name.includes("state")) return "2015-state";
  if (name.includes("2016") && name.includes("federal")) return "2016-federal";
  if (name.includes("2017") && name.includes("local")) return "2017-local-newcastle";
  if (name.includes("2019") && name.includes("state")) return "2019-state";
  if (name.includes("2019") && name.includes("federal")) return "2019-federal";
  if (name.includes("2021") && name.includes("local")) return "2021-local-newcastle";
  if (name.includes("2022") && name.includes("federal")) return "2022-federal";
  if (name.includes("2023") && name.includes("state")) return "2023-state";
  if (name.includes("2024") && name.includes("local")) return "2024-local-newcastle";
  throw new Error(`Unknown election mapping for: ${rowName}`);
};

const ingestBooth = (targetName: string, rawData: string) => {
  // Try to find the booth using exact match first
  let booth = booths.find(b => b.name.toLowerCase() === targetName.toLowerCase());
  
  // Fallback to partial match, but DO NOT match "Hamilton" to "Hamilton South" or "Hamilton North"
  if (!booth) {
    booth = booths.find(b => {
      const bName = b.name.toLowerCase();
      const tName = targetName.toLowerCase();
      if (bName.includes(tName) || tName.includes(bName)) {
        if (tName === "hamilton" && (bName.includes("north") || bName.includes("south"))) {
          return false;
        }
        return true;
      }
      return false;
    });
  }

  if (!booth) {
    console.log(`Creating new booth: ${targetName}`);
    // Find highest ID to make a unique numeric ID
    const maxId = Math.max(...booths.map(b => parseInt(b.id) || 0));
    booth = {
      id: String(maxId + 1),
      name: targetName,
      suburb: targetName,
      division: "Newcastle",
      lga: "City of Newcastle",
      lat: -32.9272,
      lng: 151.7761,
      results: []
    };
    booths.push(booth);
  } else {
    console.log(`Found matching booth for ${targetName}: ${booth.name} (ID: ${booth.id})`);
  }

  const lines = rawData.trim().split('\n');
  const headers = lines[0].split('\t');

  const laborIdx = headers.findIndex(h => h.toLowerCase() === 'labor');
  const liberalIdx = headers.findIndex(h => h.toLowerCase() === 'liberal');
  const greensIdx = headers.findIndex(h => h.toLowerCase() === 'greens');
  const phonIdx = headers.findIndex(h => h.toLowerCase() === 'phon');
  const otherIdx = headers.findIndex(h => h.toLowerCase() === 'other');
  const totalIdx = headers.findIndex(h => h.toLowerCase() === 'total');

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

    // PHON is ignored and grouped into OTH
    const allOthersVotes = phonVotes + otherVotes;

    const resultsData = [
      { party: "ALP", votes: laborVotes },
      { party: "LNP", votes: liberalVotes },
      { party: "GRN", votes: greensVotes },
      { party: "OTH", votes: allOthersVotes }
    ];

    // Determine contestName
    let contestName = "House of Representatives";
    if (electionId.includes("-state-")) {
      contestName = "Legislative Assembly";
    } else if (electionId.includes("-local-")) {
      contestName = "Ward 2"; // Newcastle Wards
    }

    resultsData.forEach(({ party, votes }) => {
      const percentage = parseFloat(((votes / total) * 100).toFixed(2));

      let resultDivision = booth!.division;
      if (electionId.includes("-state")) {
        resultDivision = booth!.name.toLowerCase().includes("dudley") || booth!.suburb.toLowerCase().includes("dudley") || booth!.division === "Charlestown" ? "Charlestown" : "Newcastle";
      } else if (electionId.includes("-local")) {
        resultDivision = booth!.lga === "Lake Macquarie City Council" ? "Lake Macquarie" : "Newcastle";
      } else if (electionId.includes("-federal")) {
        resultDivision = booth!.division === "Shortland" || booth!.name.toLowerCase().includes("dudley") ? "Shortland" : "Newcastle";
      }

      // Check if result already exists for this election and party
      let result = booth!.results.find(r => r.electionId === electionId && r.party === party);
      if (result) {
        result.votes = votes;
        result.percentage = percentage;
        result.contestName = contestName;
        result.division = resultDivision;
      } else {
        booth!.results.push({
          electionId,
          contestName,
          party,
          votes,
          percentage,
          division: resultDivision
        });
      }
    });
  });
};

// Run ingestion
ingestBooth("Hamilton", hamiltonRaw);
ingestBooth("Jesmond North", jesmondRaw);

// Write back to booths.json
fs.writeFileSync(boothsPath, JSON.stringify(booths, null, 2), 'utf-8');
console.log("Successfully updated booths.json with Hamilton and Jesmond North data.");

