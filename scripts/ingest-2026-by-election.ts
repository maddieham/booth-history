import fs from 'fs';
import path from 'path';
import type { PollingPlace, ContestResult, Election } from '../src/types';

const rawData = `Adamstown Snr Ctzn Cntr	50	791	360	131	217	45	1,594	60	1,654	Check Count Complete
Beresfield Public	34	1,132	162	95	233	60	1,716	77	1,793	Check Count Complete
Callaghan Cllg - Jesmond Snr	52	496	340	57	314	46	1,305	38	1,343	Check Count Complete
Callaghan Cllg - Wallsend	39	715	215	109	256	41	1,375	51	1,426	Check Count Complete
Callaghan Cllg - Waratah Tech	19	165	130	11	80	6	411	16	427	Check Count Complete
Carrington Public	43	639	475	72	232	26	1,487	29	1,516	Check Count Complete
Elermore Vale Public	37	819	257	96	273	45	1,527	60	1,587	Check Count Complete
Fletcher Comm. Cntr	30	626	153	154	278	47	1,288	37	1,325	Check Count Complete
Glendore Public	20	639	150	89	199	35	1,132	42	1,174	Check Count Complete
Hamilton Nth Public	19	279	144	20	87	9	558	7	565	Check Count Complete
Hamilton Public	85	663	538	137	272	19	1,714	36	1,750	Check Count Complete
Hamilton Sth Comm. Hall	12	178	117	29	89	18	443	20	463	Check Count Complete
Hamilton Sth Public	41	824	347	124	241	29	1,606	33	1,639	Check Count Complete
ICC Newcastle	10	184	117	21	76	26	434	14	448	Check Count Complete
Islington Public	67	492	628	72	187	35	1,481	28	1,509	Check Count Complete
Jesmond Nhood Cntr	22	279	167	36	153	14	671	33	704	Check Count Complete
Kotara High	27	673	245	114	217	16	1,292	37	1,329	Check Count Complete
Kotara Sth Public	31	592	226	77	144	23	1,093	19	1,112	Check Count Complete
Lambton High	39	678	190	43	221	29	1,200	31	1,231	Check Count Complete
Lambton Public	33	750	308	59	247	31	1,428	32	1,460	Check Count Complete
Maryland Public	40	851	164	94	297	42	1,488	48	1,536	Check Count Complete
Mayfield Baptist	22	177	162	28	98	12	499	11	510	Check Count Complete
Mayfield Church of Christ	51	590	334	86	224	19	1,304	39	1,343	Check Count Complete
Mayfield E Public	70	651	509	77	311	28	1,646	48	1,694	Check Count Complete
Mayfield Presbyterian	72	557	360	58	211	17	1,275	50	1,325	Check Count Complete
Merewether Hghts Public	15	597	217	113	178	15	1,135	20	1,155	Check Count Complete
Merewether Uniting	21	410	190	89	131	18	859	22	881	Check Count Complete
Minmi Hall	11	393	55	41	77	25	602	32	634	Check Count Complete
New Lambton Comm Cntr	35	762	302	113	250	37	1,499	37	1,536	Check Count Complete
New Lambton Sth Public	41	737	279	115	180	26	1,378	37	1,415	Check Count Complete
Newcastle City Hall	83	638	454	112	222	16	1,525	26	1,551	Check Count Complete
Newcastle City Scout Hall	39	321	308	58	133	20	879	20	899	Check Count Complete
Newcastle E Public	73	480	328	81	150	13	1,125	14	1,139	Check Count Complete
Newcastle TAFE	24	115	175	11	56	5	386	8	394	Check Count Complete
Our Lady of Victories Shortland	27	454	168	42	140	27	858	30	888	Check Count Complete
Shortland Public	45	671	199	84	226	32	1,257	44	1,301	Check Count Complete
St Augustine's Anglican	34	663	227	103	131	24	1,182	25	1,207	Check Count Complete
St Columba's Adamstown	25	525	258	92	159	27	1,086	22	1,108	Check Count Complete
St Johns Cooks Hill	59	589	450	94	187	20	1,399	16	1,415	Check Count Complete
St Lukes Wallsend	35	848	327	128	275	99	1,712	59	1,771	Check Count Complete
St Patricks Wallsend	16	294	103	36	117	20	586	17	603	Check Count Complete
St Thereses New Lambton	30	769	283	122	254	24	1,482	41	1,523	Check Count Complete
Stockton Public	42	841	203	112	265	33	1,496	40	1,536	Check Count Complete
Tarro Hall	10	334	42	34	74	10	504	20	524	Check Count Complete
The Junction Public	54	978	474	221	290	24	2,041	60	2,101	Check Count Complete
Wallsend Sth Public	37	622	209	73	216	19	1,176	31	1,207	Check Count Complete
Warabrook Comm. Cntr	12	333	144	58	158	25	730	21	751	Check Count Complete
Waratah Public	75	806	492	88	262	31	1,754	48	1,802	Check Count Complete`;

const boothsPath = path.resolve(import.meta.dirname || '.', '../src/data/booths.json');
const electionsPath = path.resolve(import.meta.dirname || '.', '../src/data/elections.json');

const booths: PollingPlace[] = JSON.parse(fs.readFileSync(boothsPath, 'utf-8'));
const elections: Election[] = JSON.parse(fs.readFileSync(electionsPath, 'utf-8'));

// 1. Ensure the new election is registered
const electionId = "2026-by-election-newcastle";
const electionExists = elections.some(e => e.id === electionId);
if (!electionExists) {
  elections.push({
    id: electionId,
    name: "2026 Newcastle Lord Mayoral By-election",
    date: "2026-04-18",
    type: "by-election",
    parentType: "local",
    division: "Newcastle"
  });
  fs.writeFileSync(electionsPath, JSON.stringify(elections, null, 2), 'utf-8');
  console.log(`Registered new election: ${electionId}`);
}

// Helper to normalize names for smart matching
const normalizeName = (name: string): string => {
  return name.toLowerCase()
    .replace(/\bsth\b/g, "south")
    .replace(/\bnth\b/g, "north")
    .replace(/school|public|high|primary|snr|ctzn|cntr|comm|nhood|hall|uniting|anglican|baptist|church|of|christ|presbyterian|tafe|city|scout/g, "")
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
  const obrien = parseNumber(parts[1]);
  const morris = parseNumber(parts[2]);
  const mccabe = parseNumber(parts[3]);
  const barrie = parseNumber(parts[4]);
  const clausen = parseNumber(parts[5]);
  const caine = parseNumber(parts[6]);
  const totalFormal = parseNumber(parts[7]);

  if (totalFormal === 0) return;

  // Standardize party mapping:
  // GRN: MCCABE
  // ALP: CLAUSEN
  // LNP: BARRIE
  // OTH: O'BRIEN + MORRIS + CAINE
  const grnVotes = mccabe;
  const alpVotes = clausen;
  const lnpVotes = barrie;
  const othVotes = obrien + morris + caine;

  const resultsData = [
    { party: "GRN", votes: grnVotes },
    { party: "ALP", votes: alpVotes },
    { party: "LNP", votes: lnpVotes },
    { party: "OTH", votes: othVotes }
  ];

  // Determine winner
  let maxVotes = -1;
  let winningParty = "";
  resultsData.forEach(r => {
    if (r.votes > maxVotes) {
      maxVotes = r.votes;
      winningParty = r.party;
    }
  });

  // Try to find the booth using normalized names
  const normRawName = normalizeName(rawName);
  let booth = booths.find(b => b.name.toLowerCase() === rawName.toLowerCase());
  
  if (!booth) {
    booth = booths.find(b => {
      const normBName = normalizeName(b.name);
      return normBName === normRawName && normRawName !== "";
    });
  }

  if (!booth) {
    // If still not found, try includes fallback but avoid matching generic names incorrectly
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
    // Create new booth record
    createdCount++;
    const maxId = Math.max(...booths.map(b => parseInt(b.id) || 0));
    booth = {
      id: String(maxId + 1),
      name: rawName,
      suburb: rawName.replace(/ Public| High| TAFE| Snr Ctzn Cntr| Comm. Cntr| Hall| Uniting| Anglican| Baptist| Church of Christ| Presbyterian/g, "").trim(),
      division: "Newcastle",
      lga: "City of Newcastle",
      lat: -32.9272,
      lng: 151.7761,
      results: []
    };
    booths.push(booth);
    console.log(`Created new booth: ${rawName} (ID: ${booth.id})`);
  }

  // Add the ContestResult objects
  const contestName = "Lord Mayoral";
  const division = "Newcastle";

  resultsData.forEach(({ party, votes }) => {
    const percentage = parseFloat(((votes / totalFormal) * 100).toFixed(2));

    // Filter out previous results for this election/party to allow safe reruns
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
