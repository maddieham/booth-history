import fs from 'fs';
import path from 'path';
import type { PollingPlace, ContestResult, Election } from '../src/types';

const boothsPath = path.resolve(import.meta.dirname || '.', '../src/data/booths.json');
const booths: PollingPlace[] = JSON.parse(fs.readFileSync(boothsPath, 'utf-8'));

const addSpecialResult = (
  name: string,
  type: "pre-poll" | "postal" | "absent" | "other-dec",
  division: string,
  lga: string,
  electionId: string,
  contestName: string,
  grnVotes: number,
  alpVotes: number,
  lnpVotes: number,
  othVotes: number,
  totalFormal: number
) => {
  // Try to find the special booth
  let booth = booths.find(b => b.name === name && b.division === division && b.type === type);

  if (!booth) {
    const maxId = Math.max(...booths.map(b => parseInt(b.id) || 0));
    booth = {
      id: String(maxId + 1),
      name,
      suburb: name.replace(/ Pre-Poll| EVC| Pre-poll| Declared Facility| Declared Institution/g, "").trim(),
      division,
      lga,
      lat: -32.9272,
      lng: 151.7761,
      type,
      results: []
    };
    booths.push(booth);
    console.log(`Created special booth: ${name} (ID: ${booth.id}, Type: ${type})`);
  }

  const resultsData = [
    { party: "GRN", votes: grnVotes },
    { party: "ALP", votes: alpVotes },
    { party: "LNP", votes: lnpVotes },
    { party: "OTH", votes: othVotes }
  ];

  resultsData.forEach(({ party, votes }) => {
    const percentage = parseFloat(((votes / totalFormal) * 100).toFixed(2));

    // Filter out previous results to avoid duplicates
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
};

// ----------------------------------------------------
// 1. 2026 Newcastle Lord Mayoral By-election
// ----------------------------------------------------
const lgaNewcastle = "City of Newcastle";
const el2026 = "2026-by-election-newcastle";
const con2026 = "Lord Mayoral";
const divNewcastle = "Newcastle";

// EVCs
addSpecialResult("Adamstown Pre-Poll", "pre-poll", divNewcastle, lgaNewcastle, el2026, con2026, 1176, 990, 587, 174 + 293 + 122, 7019);
addSpecialResult("Fletcher Pre-Poll", "pre-poll", divNewcastle, lgaNewcastle, el2026, con2026, 293, 570, 238, 51 + 1917 + 69, 3138);
addSpecialResult("Mayfield Pre-Poll", "pre-poll", divNewcastle, lgaNewcastle, el2026, con2026, 1060, 894, 349, 144 + 2747 + 106, 5300);
addSpecialResult("New Lambton Pre-Poll", "pre-poll", divNewcastle, lgaNewcastle, el2026, con2026, 803, 746, 326, 112 + 2910 + 85, 4982);
addSpecialResult("Newcastle Pre-Poll", "pre-poll", divNewcastle, lgaNewcastle, el2026, con2026, 1273, 834, 420, 245 + 3098 + 63, 5933);
addSpecialResult("Wallsend Pre-Poll", "pre-poll", divNewcastle, lgaNewcastle, el2026, con2026, 704, 1151, 423, 144 + 3940 + 162, 6524);

// Decs
addSpecialResult("Declared Institution (Newcastle)", "other-dec", divNewcastle, lgaNewcastle, el2026, con2026, 30, 110, 57, 33 + 155 + 22, 407);
addSpecialResult("Provisional (Newcastle)", "other-dec", divNewcastle, lgaNewcastle, el2026, con2026, 486, 373, 161, 72 + 757 + 44, 1893);
addSpecialResult("Postal (Newcastle)", "postal", divNewcastle, lgaNewcastle, el2026, con2026, 1406, 1769, 848, 242 + 5832 + 260, 10357);


// ----------------------------------------------------
// 2. 2023 State Election (Charlestown)
// ----------------------------------------------------
const lgaLakeMac = "Lake Macquarie City Council";
const el2023State = "2023-state";
const conState = "Legislative Assembly";
const divCharlestown = "Charlestown";

// EVCs
addSpecialResult("Adamstown EVC", "pre-poll", divCharlestown, lgaNewcastle, el2023State, conState, 555, 2189, 1103, 156, 4003);
addSpecialResult("Charlestown EM Office", "pre-poll", divCharlestown, lgaLakeMac, el2023State, conState, 574, 3900, 1575, 219, 6268);
addSpecialResult("Newcastle EVC", "pre-poll", divCharlestown, lgaNewcastle, el2023State, conState, 66, 183, 87, 16, 352);
addSpecialResult("Speers Point EVC", "pre-poll", divCharlestown, lgaLakeMac, el2023State, conState, 110, 967, 543, 63, 1683);
addSpecialResult("TAV", "pre-poll", divCharlestown, lgaLakeMac, el2023State, conState, 1, 7, 4, 0, 12);

// Decs
addSpecialResult("Absent (Charlestown)", "absent", divCharlestown, lgaLakeMac, el2023State, conState, 637, 2175, 1017, 260, 4089);
addSpecialResult("Provisional (Charlestown)", "other-dec", divCharlestown, lgaLakeMac, el2023State, conState, 215, 497, 157, 62, 931);
addSpecialResult("Postal (Charlestown)", "postal", divCharlestown, lgaLakeMac, el2023State, conState, 408, 3595, 1487, 252, 5742);


// ----------------------------------------------------
// 3. 2023 State Election (Wallsend)
// ----------------------------------------------------
const divWallsend = "Wallsend";

// EVCs
addSpecialResult("Fletcher EVC", "pre-poll", divWallsend, lgaNewcastle, el2023State, conState, 151, 2635, 440, 35 + 250 + 27 + 19, 3557);
addSpecialResult("Mayfield EVC", "pre-poll", divWallsend, lgaNewcastle, el2023State, conState, 261, 1034, 234, 47 + 100 + 23 + 29, 1728);
addSpecialResult("Newcastle EVC", "pre-poll", divWallsend, lgaNewcastle, el2023State, conState, 124, 338, 88, 18 + 25 + 13 + 10, 616);
addSpecialResult("TAV", "pre-poll", divWallsend, lgaLakeMac, el2023State, conState, 0, 6, 2, 0, 8);
addSpecialResult("Wallsend EVC", "pre-poll", divWallsend, lgaNewcastle, el2023State, conState, 490, 5093, 1088, 90 + 549 + 82 + 46, 7438);
addSpecialResult("Declared Facility (Wallsend)", "other-dec", divWallsend, lgaNewcastle, el2023State, conState, 3, 45, 9, 0 + 5 + 1 + 2, 65);

// Decs
addSpecialResult("Absent (Wallsend)", "absent", divWallsend, lgaNewcastle, el2023State, conState, 708, 2509, 679, 151 + 276 + 120 + 118, 4561);
addSpecialResult("Provisional (Wallsend)", "other-dec", divWallsend, lgaNewcastle, el2023State, conState, 280, 609, 122, 47 + 75 + 28 + 35, 1196);
addSpecialResult("Postal (Wallsend)", "postal", divWallsend, lgaNewcastle, el2023State, conState, 200, 2788, 600, 83 + 216 + 57 + 42, 3986);


// ----------------------------------------------------
// 4. 2023 State Election (Newcastle)
// ----------------------------------------------------
// EVCs
addSpecialResult("Adamstown EVC", "pre-poll", divNewcastle, lgaNewcastle, el2023State, conState, 503, 1815, 747, 29 + 151 + 94, 3339);
addSpecialResult("Mayfield EVC", "pre-poll", divNewcastle, lgaNewcastle, el2023State, conState, 695, 2908, 1045, 74 + 284 + 86, 5092);
addSpecialResult("Newcastle EVC", "pre-poll", divNewcastle, lgaNewcastle, el2023State, conState, 829, 1966, 1180, 59 + 206 + 74, 4314);
addSpecialResult("Newcastle West EVC", "pre-poll", divNewcastle, lgaNewcastle, el2023State, conState, 480, 1252, 1037, 18 + 91 + 51, 2929);
addSpecialResult("TAV", "pre-poll", divNewcastle, lgaNewcastle, el2023State, conState, 1, 10, 2, 0, 13);

// Decs
addSpecialResult("Absent (Newcastle)", "absent", divNewcastle, lgaNewcastle, el2023State, conState, 790, 1619, 793, 50 + 309 + 124, 3685);
addSpecialResult("Provisional (Newcastle)", "other-dec", divNewcastle, lgaNewcastle, el2023State, conState, 329, 492, 204, 24 + 119 + 54, 1222);
addSpecialResult("Postal (Newcastle)", "postal", divNewcastle, lgaNewcastle, el2023State, conState, 450, 1905, 903, 28 + 138 + 85, 3509);


// ----------------------------------------------------
// 5. 2019 State Election (Charlestown)
// ----------------------------------------------------
const el2019State = "2019-state";

// EVCs
addSpecialResult("Charlestown EM Office", "pre-poll", divCharlestown, lgaLakeMac, el2019State, conState, 491, 3309, 2241, 247, 6288);
addSpecialResult("Newcastle EVC", "pre-poll", divCharlestown, lgaNewcastle, el2019State, conState, 128, 425, 360, 58, 971);
addSpecialResult("Sydney Town Hall Pre-Poll", "pre-poll", divCharlestown, lgaNewcastle, el2019State, conState, 7, 8, 10, 0, 25);
addSpecialResult("Declared Facility (Charlestown)", "other-dec", divCharlestown, lgaLakeMac, el2019State, conState, 2, 40, 25, 1, 68);

// Decs
addSpecialResult("Absent (Charlestown)", "absent", divCharlestown, lgaLakeMac, el2019State, conState, 698, 2104, 1426, 315, 4543);
addSpecialResult("Provisional (Charlestown)", "other-dec", divCharlestown, lgaLakeMac, el2019State, conState, 167, 418, 210, 71, 866);
addSpecialResult("iVote (Charlestown)", "other-dec", divCharlestown, lgaLakeMac, el2019State, conState, 260, 901, 637, 146, 1944);
addSpecialResult("Postal (Charlestown)", "postal", divCharlestown, lgaLakeMac, el2019State, conState, 66, 942, 603, 69, 1680);


fs.writeFileSync(boothsPath, JSON.stringify(booths, null, 2), 'utf-8');
console.log("Successfully ingested early voting and declaration votes.");
