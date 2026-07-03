import fs from 'fs';
import path from 'path';
import type { PollingPlace, Election } from '../src/types';

const boothsPath = path.resolve(import.meta.dirname || '.', '../src/data/booths.json');
const electionsPath = path.resolve(import.meta.dirname || '.', '../src/data/elections.json');

const booths: PollingPlace[] = JSON.parse(fs.readFileSync(boothsPath, 'utf-8'));
const elections: Election[] = JSON.parse(fs.readFileSync(electionsPath, 'utf-8'));

const electionsMap = new Map<string, Election>();
elections.forEach(e => electionsMap.set(e.id, e));

let updatedCount = 0;

booths.forEach(booth => {
  booth.results.forEach(res => {
    // If it already has a division, we can keep it or update it
    const election = electionsMap.get(res.electionId);
    if (!election) return;

    let targetDivision = "";

    if (election.type === "federal") {
      // Hamilton, Jesmond, Newcastle booths are in Newcastle
      // Dudley, Windale, Belmont booths are in Shortland
      if (booth.division === "Shortland" || booth.lga === "Lake Macquarie City Council" || booth.name.toLowerCase().includes("dudley") || booth.suburb.toLowerCase().includes("dudley")) {
        targetDivision = "Shortland";
      } else {
        targetDivision = "Newcastle";
      }
    } else if (election.type === "state") {
      // Hamilton, Jesmond are Newcastle state electorate
      // Dudley, Cardiff, Charlestown are Charlestown state electorate
      if (booth.division === "Shortland" || booth.lga === "Lake Macquarie City Council" || booth.name.toLowerCase().includes("dudley") || booth.suburb.toLowerCase().includes("dudley") || booth.division === "Charlestown") {
        targetDivision = "Charlestown";
      } else {
        targetDivision = "Newcastle";
      }
    } else if (election.type === "local") {
      if (booth.lga === "Lake Macquarie City Council") {
        targetDivision = "Lake Macquarie";
      } else {
        targetDivision = "Newcastle";
      }
    }

    if (targetDivision) {
      res.division = targetDivision;
      updatedCount++;
    }
  });
});

fs.writeFileSync(boothsPath, JSON.stringify(booths, null, 2), 'utf-8');
console.log(`Successfully added division field to ${updatedCount} ContestResult entries in booths.json.`);
