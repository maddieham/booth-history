/**
 * Data Ingestion Script - By-elections
 * 
 * Target Sources:
 * - AEC (Federal By-elections) or NSWEC (State/Local By-elections) VTR data.
 * 
 * Expected Structure:
 * - Same as the parent election type (Federal, State, or Local).
 * 
 * Logic & Filter Scope:
 * - Identify parent election type (e.g. state by-election compares to previous state election).
 * - Apply the `parentType` property in the `Election` metadata (e.g. `parentType: "state"` or `parentType: "federal"`).
 * - Process votes, match polling places, compute percentages.
 * - Append results to the booth history with `type: "by-election"` tag so it displays correct boundary change warnings and calculates swings.
 */

import fs from 'fs';
import path from 'path';

console.log('=== Ingestion Script: By-elections Data ===');
console.log('1. Read By-election source files...');
console.log('2. Tag with type "by-election" and set parentType...');
console.log('3. Compute Greens first preferences & compare against parent election results...');
console.log('4. Merge into master collection...');

const stubMessage = 'INGESTION STUB: Run this script with by-election files and specify --parent-type.';
console.log(stubMessage);
