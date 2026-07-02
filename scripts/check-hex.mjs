#!/usr/bin/env node
/**
 * Hardcoded-hex ratchet.
 *
 * AGENTS.md Decision 2 makes the MUI theme the single source of truth for colour and
 * says "CI blocks new violations". There is a large existing backlog of hardcoded hex
 * in src/app and src/components, so we cannot fail on the whole set at once. Instead we
 * ratchet: the build fails if the total count RISES above the committed baseline, and
 * prints a nudge to lower the baseline whenever it drops. New code therefore cannot add
 * hex, and every cleanup can tighten the baseline.
 *
 * Counts raw hex colour literals (e.g. #22FFAA) AND Tailwind arbitrary-value hex
 * (e.g. text-[#fb923c]) in .ts/.tsx under src/app and src/components. globals.css is
 * out of scope (documented brand source; it is not a .ts/.tsx file anyway).
 *
 * No dependencies — Node built-ins only, so it runs in CI without an install step.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIRS = ['src/app', 'src/components'];
const BASELINE = 1327; // ratchet — only ever lower this, never raise it.
const HEX = /#[0-9a-fA-F]{3,8}\b/g;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

let total = 0;
const perFile = [];
for (const rel of DIRS) {
  const abs = join(ROOT, rel);
  for (const file of walk(abs)) {
    const matches = readFileSync(file, 'utf8').match(HEX);
    if (matches?.length) {
      total += matches.length;
      perFile.push([matches.length, file.slice(ROOT.length + 1)]);
    }
  }
}

if (total > BASELINE) {
  perFile.sort((a, b) => b[0] - a[0]);
  console.error(`✖ Hardcoded hex increased: ${total} found, baseline is ${BASELINE}.`);
  console.error('  New hardcoded hex colours are not allowed — use t.* tokens from @/theme/colors.');
  console.error('  Worst files:');
  for (const [n, f] of perFile.slice(0, 10)) console.error(`    ${String(n).padStart(4)}  ${f}`);
  process.exit(1);
}

if (total < BASELINE) {
  console.log(`✓ Hardcoded hex at ${total} (below baseline ${BASELINE}).`);
  console.log(`  Nice — lower BASELINE in scripts/check-hex.mjs to ${total} to lock in the win.`);
} else {
  console.log(`✓ Hardcoded hex at baseline (${total}). No new violations.`);
}
