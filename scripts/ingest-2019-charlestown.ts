import fs from 'fs';
import path from 'path';
import type { PollingPlace, ContestResult, Election } from '../src/types';

const rawData = `Adamstown Snr Ctzn Cntr	187	85	38	204	514	26	540	Check Count Complete
Cardiff Hghts Baptist	95	52	20	133	300	17	317	Check Count Complete
Cardiff Sth Public	61	38	14	163	276	10	286	Check Count Complete
Charlestown E Public	401	144	55	744	1,344	52	1,396	Check Count Complete
Charlestown Public	584	257	84	980	1,905	75	1,980	Check Count Complete
Charlestown Sth Public	430	130	78	755	1,393	55	1,448	Check Count Complete
Dudley Pensioners Hall	434	195	52	587	1,268	39	1,307	Check Count Complete
Eleebana Public	1,333	247	134	1,104	2,818	125	2,943	Check Count Complete
Floraville Public	123	40	28	183	374	16	390	Check Count Complete
Garden Suburb Public	453	159	101	630	1,343	37	1,380	Check Count Complete
Hillsborough Public	396	118	53	770	1,337	43	1,380	Check Count Complete
Hunter Sports High	173	86	59	613	931	68	999	Check Count Complete
Kahibah Public	593	236	73	761	1,663	56	1,719	Check Count Complete
Kotara High	726	253	81	963	2,023	55	2,078	Check Count Complete
Kotara Sth Public	592	224	78	905	1,799	58	1,857	Check Count Complete
Mt Hutton Public	636	175	147	1,136	2,094	100	2,194	Check Count Complete
New Lambton Sth Public	221	120	46	354	741	35	776	Check Count Complete
New Lambton Uniting -Grinsell St	228	115	36	368	747	25	772	Check Count Complete
Redhead Public	598	196	57	896	1,747	60	1,807	Check Count Complete
St Columba's Adamstown	693	335	86	888	2,002	82	2,084	Check Count Complete
Sydney Town Hall	1	2	2	9	14	0	14	Check Count Complete
Warners Bay High	795	180	105	1,071	2,151	96	2,247	Check Count Complete
Warners Bay Public	351	110	43	476	980	49	1,029	Check Count Complete
Whitebridge High	311	106	44	490	951	38	989	Check Count Complete
Windale Comm. Cntr	293	117	104	1,260	1,774	114	1,888	Check Count Complete`;

const boothsPath = path.resolve(import.meta.dirname || '.', '../src/data/booths.json');
const booths: PollingPlace[] = JSON.parse(fs.readFileSync(boothsPath, 'utf-8'));

// Target election details
const electionId = "2019-state";
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
  if (parts.length < 6) return;

  const rawName = parts[0].trim();
  const lnpVotes = parseNumber(parts[1]); // BARRIE (LIB)
  const grnVotes = parseNumber(parts[2]); // DOYLE (GRN)
  const othVotes = parseNumber(parts[3]); // TURNER (AJP)
  const alpVotes = parseNumber(parts[4]); // HARRISON (LAB)
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
      rawName.toLowerCase().includes("windale") ||
      rawName.toLowerCase().includes("redhead")
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
    const percentage = parseFloat(((votes / totalFormal) * 1051 ? (votes / totalFormal) * 100 : 0).toFixed(2)); // safe check
    const pct = parseFloat(((votes / totalFormal) * 100).toFixed(2));

    // Filter out previous result for this election/party to avoid duplication
    booth!.results = booth!.results.filter(r => !(r.electionId === electionId && r.party === party));

    booth!.results.push({
      electionId,
      contestName,
      party,
      votes,
      percentage: pct,
      division
    });
  });
});

fs.writeFileSync(boothsPath, JSON.stringify(booths, null, 2), 'utf-8');
console.log(`Successfully completed ingestion. Matched: ${matchedCount}, Created: ${createdCount}`);
