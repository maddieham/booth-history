import fs from 'fs';
import path from 'path';
import type { PollingPlace, ContestResult, Election } from '../src/types';

const rawData = `All Saints New Lambton	43	6	21	205	7	45	4	331	12	343	Check Count Complete
Beresfield Public	112	45	207	1,049	39	274	29	1,755	82	1,837	Check Count Complete
Callaghan Cllg - Jesmond Snr	268	45	85	896	30	169	34	1,527	54	1,581	Check Count Complete
Callaghan Cllg - Wallsend	165	36	110	1,233	26	161	19	1,750	68	1,818	Check Count Complete
Callaghan Cllg - Waratah Tech	54	5	6	102	7	21	1	196	6	202	Check Count Complete
Cardiff Hghts Baptist	150	25	98	576	21	212	19	1,101	0	1,101	Check Count Complete
Cardiff Nth Public	137	22	87	664	18	163	15	1,106	33	1,139	Check Count Complete
Cardiff Public	36	4	14	96	7	28	5	190	8	198	Check Count Complete
Edgeworth Public	13	7	7	52	2	12	2	95	3	98	Check Count Complete
Elermore Vale Public	192	41	156	1,165	26	227	16	1,823	59	1,882	Check Count Complete
Fletcher Comm. Cntr	67	9	33	581	7	115	9	821	13	834	Check Count Complete
Glendale E Public	104	24	107	724	18	144	14	1,135	46	1,181	Check Count Complete
Glendore Public	93	25	97	979	20	172	14	1,400	48	1,448	Check Count Complete
Islington Public	25	0	4	42	0	9	1	81	2	83	Check Count Complete
Jesmond Nhood Cntr	84	16	35	368	9	59	8	579	6	595	Check Count Complete
Lambton High	203	27	96	860	26	226	22	1,460	51	1,511	Check Count Complete
Lambton Public	144	26	57	748	20	166	23	1,184	22	1,206	Check Count Complete
Maryland Public	100	25	133	1,119	22	141	24	1,564	39	1,603	Check Count Complete
Mayfield Presbyterian	33	2	8	72	3	16	6	140	8	148	Check Count Complete
Minmi Hall	46	10	59	446	8	105	13	687	22	709	Check Count Complete
New Lambton Sth Public	29	4	2	52	3	22	1	113	4	117	Check Count Complete
Our Lady of Victories Shortland	120	28	78	645	9	109	16	1,005	25	1,030	Check Count Complete
Shortland Public	130	27	78	778	14	117	24	1,168	36	1,204	Check Count Complete
St Patricks Wallsend	69	6	44	462	6	53	11	651	16	667	Check Count Complete
St Thereses New Lambton	102	13	32	444	30	161	9	791	26	817	Check Count Complete
Tarro Hall	16	5	30	242	6	47	10	356	12	368	Check Count Complete
Wallsend Public	169	38	91	950	27	159	19	1,453	52	1,505	Check Count Complete
Wallsend Sth Public	236	45	122	1,259	19	327	18	2,026	52	2,078	Check Count Complete
Waratah Public	272	33	79	745	22	192	15	1,358	54	1,412	Check Count Complete
Waratah W Public	116	18	60	516	8	74	15	807	18	825	Check Count Complete`;

const boothsPath = path.resolve(import.meta.dirname || '.', '../src/data/booths.json');
const electionsPath = path.resolve(import.meta.dirname || '.', '../src/data/elections.json');

const booths: PollingPlace[] = JSON.parse(fs.readFileSync(boothsPath, 'utf-8'));
const elections: Election[] = JSON.parse(fs.readFileSync(electionsPath, 'utf-8'));

// Target election details
const electionId = "2023-state";
const contestName = "Legislative Assembly";
const division = "Wallsend";

// Ensure elections.json is updated to contain the "Wallsend" division for 2023-state
const targetElection = elections.find(e => e.id === electionId);
if (targetElection) {
  const divSet = new Set([
    ...targetElection.division.split(',').map(d => d.trim()),
    "Wallsend"
  ]);
  targetElection.division = Array.from(divSet).sort().join(', ');
  fs.writeFileSync(electionsPath, JSON.stringify(elections, null, 2), 'utf-8');
  console.log(`Updated 2023 state election divisions in elections.json: ${targetElection.division}`);
}

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
  if (parts.length < 9) return;

  const rawName = parts[0].trim();
  const watkinsGrn = parseNumber(parts[1]); // WATKINS (GRN)
  const nolanAjp = parseNumber(parts[2]); // NOLAN (AJP)
  const digirolamoOn = parseNumber(parts[3]); // DI GIROLAMO (ON)
  const horneryAlp = parseNumber(parts[4]); // HORNERY (ALP)
  const starrettInd = parseNumber(parts[5]); // STARRETT (IND)
  const pullLib = parseNumber(parts[6]); // PULL (LIB)
  const akersSap = parseNumber(parts[7]); // AKERS (SAP)
  const totalFormal = parseNumber(parts[8]);

  if (totalFormal === 0) return;

  // Standardize party mapping:
  // GRN: WATKINS
  // ALP: HORNERY
  // LNP: PULL
  // OTH: NOLAN + DI GIROLAMO + STARRETT + AKERS
  const grnVotes = watkinsGrn;
  const alpVotes = horneryAlp;
  const lnpVotes = pullLib;
  const othVotes = nolanAjp + digirolamoOn + starrettInd + akersSap;

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
      rawName.toLowerCase().includes("windale") ||
      rawName.toLowerCase().includes("edgeworth") ||
      rawName.toLowerCase().includes("glendale")
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
