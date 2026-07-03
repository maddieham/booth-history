import fs from 'fs';
import path from 'path';
import type { PollingPlace, ContestResult, Election } from '../src/types';

const rawData = `Adamstown Snr Ctzn Cntr	175	125	10	72	410	17	809	15	824	Check Count Complete
Callaghan Cllg - Waratah Tech	78	57	3	21	208	12	379	4	383	Check Count Complete
Carrington Public	358	210	20	94	823	32	1,537	34	1,571	Check Count Complete
Fern Bay Hall	122	515	2	74	972	50	1,735	46	1,781	Check Count Complete
Goodlife Church Wickham	182	108	7	36	306	12	651	12	663	Check Count Complete
Hamilton Nth Public	118	104	7	38	284	13	564	10	574	Check Count Complete
Hamilton Public	426	330	37	102	888	32	1,815	58	1,873	Check Count Complete
Hamilton Sth Comm. Hall	62	35	5	55	258	9	424	26	450	Check Count Complete
Hamilton Sth Public	236	458	8	69	710	35	1,516	37	1,553	Check Count Complete
Islington Public	437	148	24	84	616	33	1,342	32	1,374	Check Count Complete
Lambton High	19	15	2	10	52	6	104	6	110	Check Count Complete
Mayfield Church of Christ	153	83	6	59	389	29	719	20	739	Check Count Complete
Mayfield E Public	273	163	31	81	682	24	1,254	34	1,288	Check Count Complete
Mayfield Presbyterian	260	194	24	146	604	32	1,260	35	1,295	Check Count Complete
Merewether Hghts Public	178	379	3	71	486	17	1,134	27	1,161	Check Count Complete
Merewether Uniting	151	203	3	57	340	18	772	22	794	Check Count Complete
New Lambton Sth Public	30	11	1	7	41	1	91	2	93	Check Count Complete
Newcastle E Public	371	256	24	78	473	30	1,232	16	1,248	Check Count Complete
Newcastle TAFE	96	38	6	23	145	10	318	10	328	Check Count Complete
St Andrews Mayfield	183	154	13	64	536	28	978	39	1,017	Check Count Complete
St Augustine's Anglican	159	289	1	48	386	26	909	19	928	Check Count Complete
St Columba's Adamstown	30	23	1	6	65	0	125	2	127	Check Count Complete
St Johns Cooks Hill	375	311	19	74	590	28	1,397	42	1,439	Check Count Complete
St Thereses New Lambton	14	19	0	3	38	1	75	2	77	Check Count Complete
Stockton Public	191	276	13	108	994	31	1,613	45	1,658	Check Count Complete
The Junction Public	373	538	8	120	788	56	1,883	55	1,938	Check Count Complete
Warabrook Comm. Cntr	90	164	7	59	446	25	791	24	815	Check Count Complete
Waratah Public	68	54	7	22	191	5	347	12	359	Check Count Complete
WEA Hunter Laman St Campus	202	177	12	63	390	15	859	11	870	Check Count Complete`;

const boothsPath = path.resolve(import.meta.dirname || '.', '../src/data/booths.json');
const booths: PollingPlace[] = JSON.parse(fs.readFileSync(boothsPath, 'utf-8'));

// Target election details
const electionId = "2023-state";
const contestName = "Legislative Assembly";
const division = "Newcastle";

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
  if (parts.length < 8) return;

  const rawName = parts[0].trim();
  const mackenzieGrn = parseNumber(parts[1]); // MACKENZIE (GRN)
  const triebseesLib = parseNumber(parts[2]); // TRIEBSEES (LIB)
  const lekaSa = parseNumber(parts[3]); // LEKA (SA)
  const claydonLcp = parseNumber(parts[4]); // CLAYDON (LCP)
  const crakanthorpAlp = parseNumber(parts[5]); // CRAKANTHORP (ALP)
  const taylorSap = parseNumber(parts[6]); // TAYLOR (SAP)
  const totalFormal = parseNumber(parts[7]);

  if (totalFormal === 0) return;

  // Standardize party mapping:
  // GRN: MACKENZIE
  // ALP: CRAKANTHORP
  // LNP: TRIEBSEES
  // OTH: LEKA + CLAYDON + TAYLOR
  const grnVotes = mackenzieGrn;
  const alpVotes = crakanthorpAlp;
  const lnpVotes = triebseesLib;
  const othVotes = lekaSa + claydonLcp + taylorSap;

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
      suburb: rawName.replace(/ Public| High| TAFE| Snr Ctzn Cntr| Comm. Cntr| Hall| Uniting| Anglican| Baptist| Church of Christ| Presbyterian| Pensioners| Ordinary| East| North| South| West/g, "").trim(),
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
