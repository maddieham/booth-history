import fs from 'fs';
import path from 'path';
import type { PollingPlace } from '../src/types';

const boothsPath = path.resolve(import.meta.dirname || '.', '../src/data/booths.json');
const booths: PollingPlace[] = JSON.parse(fs.readFileSync(boothsPath, 'utf-8'));

let count = 0;
booths.forEach(booth => {
  booth.results.forEach(res => {
    if ('isElected' in res) {
      delete (res as any).isElected;
      count++;
    }
  });
});

fs.writeFileSync(boothsPath, JSON.stringify(booths, null, 2), 'utf-8');
console.log(`Successfully removed isElected field from ${count} ContestResult entries in booths.json.`);
