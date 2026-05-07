// Bundle src/engine/banks/*.json into src/engine/banks/bundled.js.
// Usage: `node tools/build-banks.js` (write) or `--check` (CI staleness).

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const banksDir = join(here, '..', 'src', 'engine', 'banks');
const outFile = join(banksDir, 'bundled.js');

const SCHEMA_VERSION = 1;

function loadBanks() {
  const files = readdirSync(banksDir)
    .filter((f) => f.endsWith('.json'))
    .sort();
  const banks = {};
  for (const f of files) {
    const raw = readFileSync(join(banksDir, f), 'utf8');
    let bank;
    try {
      bank = JSON.parse(raw);
    } catch (err) {
      throw new Error(`bank file ${f} is not valid JSON: ${err.message}`);
    }
    if (bank.schemaVersion !== SCHEMA_VERSION) {
      throw new Error(
        `bank file ${f} has schemaVersion ${bank.schemaVersion}, ` +
          `generator supports ${SCHEMA_VERSION}`,
      );
    }
    if (!bank.name) throw new Error(`bank file ${f} is missing 'name'`);
    if (banks[bank.name]) {
      throw new Error(`duplicate bank name '${bank.name}' (in ${f})`);
    }
    banks[bank.name] = bank;
  }
  return banks;
}

function render(banks) {
  const header =
    '// Auto-generated from src/engine/banks/*.json by tools/build-banks.js.\n' +
    '// Do not edit by hand. Re-run the generator when banks change.\n' +
    '\n' +
    'export const bundled = ';
  return header + JSON.stringify(banks, null, 2) + ';\n';
}

const banks = loadBanks();
const rendered = render(banks);

if (process.argv.includes('--check')) {
  let existing = '';
  try {
    existing = readFileSync(outFile, 'utf8');
  } catch {
    /* missing file: treated as stale */
  }
  if (existing !== rendered) {
    process.stderr.write(
      'bundled.js is out of date with src/engine/banks/*.json. ' +
        'Re-run `node tools/build-banks.js`.\n',
    );
    process.exit(1);
  }
  process.stdout.write(`bundled.js up to date (${Object.keys(banks).length} banks)\n`);
} else {
  writeFileSync(outFile, rendered);
  process.stdout.write(
    `wrote ${outFile} (${Object.keys(banks).length} banks: ${Object.keys(banks).join(', ')})\n`,
  );
}
