import fs from 'fs';
import path from 'path';
import type { PollingPlace, ContestResult, Election } from '../src/types';

const rawData = `Adamstown Snr Ctzn Cntr	311	157	40	144	652	26	678	Check Count Complete
All Saints New Lambton	660	319	54	182	1,215	38	1,253	Check Count Complete
Cardiff Hghts Baptist	51	28	8	19	106	2	108	Check Count Complete
Cardiff Public	329	126	44	90	589	36	625	Check Count Complete
Cardiff Sth Public	838	263	80	151	1,332	74	1,406	Check Count Complete
Charlestown E Public	790	310	63	235	1,398	37	1,435	Check Count Complete
Charlestown Public	820	319	68	245	1,452	50	1,502	Check Count Complete
Charlestown Sth Public	797	262	73	163	1,295	49	1,344	Check Count Complete
Dudley Pensioners Hall	543	244	63	201	1,051	27	1,078	Check Count Complete
Eleebana Public	1,221	791	102	246	2,360	91	2,451	Check Count Complete
Floraville Public	264	104	24	42	434	13	447	Check Count Complete
Garden Suburb Public	653	295	68	136	1,152	27	1,179	Check Count Complete
Hillsborough Public	689	267	49	106	1,111	38	1,149	Check Count Complete
Hunter Sports High	527	148	62	110	847	43	890	Check Count Complete
Kahibah Public	768	357	66	251	1,442	49	1,491	Check Count Complete
Kotara High	816	448	78	228	1,570	44	1,614	Check Count Complete
Kotara Sth Public	838	333	64	248	1,483	42	1,525	Check Count Complete
Lakelands Hall	100	36	10	17	163	8	171	Check Count Complete
Merewether Hghts Public	52	43	9	17	121	3	124	Check Count Complete
Merewether Uniting	64	40	9	28	141	5	146	Check Count Complete
Mt Hutton Public	1,169	357	117	177	1,820	70	1,890	Check Count Complete
New Lambton Sth Public	701	293	60	236	1,290	34	1,324	Check Count Complete
St Columba's Adamstown	619	360	47	246	1,272	44	1,316	Check Count Complete
St Thereses New Lambton	471	258	49	164	942	39	981	Check Count Complete
The Junction Public	59	35	7	34	135	4	139	Check Count Complete
Warners Bay High	858	438	60	162	1,518	56	1,574	Check Count Complete
Warners Bay Public	516	233	70	95	914	27	941	Check Count Complete
Whitebridge High	480	211	55	122	868	21	889	Check Count Complete
Windale Public	915	130	66	117	1,228	67	1,295	Check Count Complete`;

const boothsPath = path.resolve(import.meta.dirname || '.', '../src/data/booths.json');
const booths: PollingPlace[] = JSON.parse(fs.readFileSync(boothsPath, 'utf-8'));

// Target election details
const electionId = "2023-state";
const contestName = "Legislative Assembly";
const division = "Charlestown";

// Helper to normalize names for smart matching
const normalizeName = (name: string): string => {
  return name.toLowerCase()
    .replace(/\bsth\b/g, "south")
    .replace(/\bnth\b/g, "north")
    .replace(/school|public|high|primary|snr|ctzn|cntr|comm|nhood|hall|uniting|anglican|baptist|church|of|christ|presbyterian|tafe|city|scout|pensioners/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
};

const parseNumber = (val: string): number => {
  return parseInt(val.replace(/,/g, '')) || 0;
};

// Process each row
const lines = rawData.trim().split('\n');
let matchedCount = 0;
let createdCount = 0;

lines.forEach(line => {
  const parts = line.split('\t');
  if (parts.length < 5) return;

  const rawName = parts[0].trim();
  const alpVotes = parseNumber(parts[1]); // Harrison (ALP)
  const lnpVotes = parseNumber(parts[2]); // Antcliff (LIB)
  const othVotes = parseNumber(parts[3]); // Rolfe (SAP)
  const grnVotes = parseNumber(parts[4]); // Watkinson (GRN)
  const totalFormal = parseNumber(parts[5]);

  if (totalFormal === 0) return;

  const resultsData = [
    { party: "GRN", votes: grnVotes },
    { party: "ALP", votes: alpVotes },
    { party: "LNP", votes: lnpVotes },
    { party: "OTH", votes: othVotes }
  ];

  // Try to find matching booth
  const normRawName = normalizeName(rawName);
  let booth = booths.find(b => b.name.toLowerCase() === rawName.toLowerCase());
  
  if (!booth) {
    booth = booths.find(b => {
      const normBName = normalizeName(b.name);
      return normBName === normRawName && normRawName !== "";
    });
  }

  if (!booth) {
    // Try includes fallback but avoid matching generic names incorrectly
    booth = booths.find(b => {
      const normBName = normalizeName(b.name);
      if (normBName.includes(normRawName) || normRawName.includes(normBName)) {
        if (normRawName === "hamilton" && (normBName.includes("north") || normBName.includes("south"))) {
          return false;
        }
        return true;
      }
      return false;
    });
  }

  if (booth) {
    matchedCount++;
  } else {
    createdCount++;
    // Detect LGA region based on suburb name
    const lga = (
      rawName.toLowerCase().includes("charlestown") ||
      rawName.toLowerCase().includes("dudley") ||
      rawName.toLowerCase().includes("cardiff") ||
      rawName.toLowerCase().includes("eleebana") ||
      rawName.toLowerCase().includes("floraville") ||
      rawName.toLowerCase().includes("garden suburb") ||
      rawName.toLowerCase().includes("hillsborough") ||
      rawName.toLowerCase().includes("kahibah") ||
      rawName.toLowerCase().includes("lakelands") ||
      rawName.toLowerCase().includes("hutton") ||
      rawName.toLowerCase().includes("warners bay") ||
      rawName.toLowerCase().includes("whitebridge") ||
      rawName.toLowerCase().includes("windale")
    ) ? "Lake Macquarie City Council" : "City of Newcastle";

    const currentDivision = lga === "Lake Macquarie City Council" ? "Shortland" : "Newcastle";

    const maxId = Math.max(...booths.map(b => parseInt(b.id) || 0));
    booth = {
      id: String(maxId + 1),
      name: rawName,
      suburb: rawName.replace(/ Public| High| TAFE| Snr Ctzn Cntr| Comm. Cntr| Hall| Uniting| Anglican| Baptist| Church of Christ| Presbyterian| Pensioners/g, "").trim(),
      division: currentDivision,
      lga: lga,
      lat: -32.9272,
      lng: 151.7761,
      results: []
    };
    booths.push(booth);
    console.log(`Created new booth: ${rawName} (ID: ${booth.id}, LGA: ${lga})`);
  }

  // Update or insert the ContestResult objects
  resultsData.forEach(({ party, votes }) => {
    const percentage = parseFloat(((votes / totalFormal) * 100).toFixed(2));

    // Filter out previous result for this election/party to avoid duplication
    booth!.results = booth!.results.filter(r => !(r.electionId === electionId && r.party === party));

    booth!.results.push({
      electionId,
      contestName,
      party,
      votes,
      percentage,
      division
    });
  });
});

fs.writeFileSync(boothsPath, JSON.stringify(booths, null, 2), 'utf-8');
console.log(`Successfully completed ingestion. Matched: ${matchedCount}, Created: ${createdCount}`);
