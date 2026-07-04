import fs from 'fs';
import path from 'path';
import type { BoothGroup } from '../src/types';

const boothsPath = path.resolve(import.meta.dirname || '.', '../src/data/booths.json');
const groupsPath = path.resolve(import.meta.dirname || '.', '../src/data/booth-groups.json');

const booths: any[] = JSON.parse(fs.readFileSync(boothsPath, 'utf-8'));

// Load existing groups if they exist
let groups: BoothGroup[] = [];
if (fs.existsSync(groupsPath)) {
  try {
    groups = JSON.parse(fs.readFileSync(groupsPath, 'utf-8'));
  } catch (e) {
    console.error('Failed to parse existing booth-groups.json, starting fresh', e);
  }
}

// Build a Set of all names already covered by existing groups (case-insensitive for robustness)
const coveredNames = new Set<string>();
groups.forEach(g => {
  if (Array.isArray(g.rawNames)) {
    g.rawNames.forEach(name => coveredNames.add(name.toLowerCase()));
  }
});

// Helper to generate a slug
const generateSlug = (name: string): string => {
  return name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

let addedCount = 0;

booths.forEach(booth => {
  const displayName = booth.name;
  const boothNameLower = displayName.toLowerCase();

  // If this booth is already covered by any group, skip creating a new group
  if (coveredNames.has(boothNameLower)) {
    return;
  }
  
  let slug = generateSlug(displayName);
  
  // Ensure unique slugs
  let count = 1;
  const baseSlug = slug;
  while (groups.some(g => g.slug === slug)) {
    slug = `${baseSlug}-${count}`;
    count++;
  }

  const rawNames = [displayName];

  // Register newly covered names
  rawNames.forEach(name => coveredNames.add(name.toLowerCase()));

  groups.push({
    slug,
    displayName,
    rawNames
  });
  console.log(`  + New Group Added: "${displayName}" (Slug: ${slug})`);
  addedCount++;
});

// Save the new config file
fs.writeFileSync(groupsPath, JSON.stringify(groups, null, 2), 'utf-8');
console.log(`Generated/updated booth-groups.json. Total groups: ${groups.length} (Added ${addedCount} new groups).`);

