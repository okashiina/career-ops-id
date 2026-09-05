#!/usr/bin/env node
/**
 * careerjet-scan.mjs — Pull Indonesia/SEA AI roles from the Careerjet API
 * into data/pipeline.md. Careerjet operates careerjet.co.id, so this reaches
 * LOCAL Indonesian listings the ATS scanner (scan.mjs) can't.
 *
 * SETUP (one time):
 *   1. Register as a partner (free): https://www.careerjet.com/partners/
 *      You get a 20-char "affid" (affiliate id). That's the API key.
 *   2. Put it in .env or pass inline:
 *        $env:CAREERJET_AFFID="your20charaffid"   # PowerShell
 *        CAREERJET_AFFID=your20charaffid           # bash / .env
 *
 * USAGE:
 *   node careerjet-scan.mjs              # scan default AI keywords, Indonesia
 *   node careerjet-scan.mjs --dry-run    # preview, don't write pipeline
 *   node careerjet-scan.mjs --location "Jakarta"
 *
 * Docs: https://www.careerjet.com/partners/api/
 * Note: API is HTTP (not HTTPS) and requires user_ip + user_agent + url params.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';

const AFFID = process.env.CAREERJET_AFFID;
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const locFlag = args.indexOf('--location');
const LOCATION = locFlag !== -1 ? args[locFlag + 1] : 'Indonesia';
const PIPELINE = 'data/pipeline.md';

if (!AFFID) {
  console.error('✗ Missing CAREERJET_AFFID. Register free at https://www.careerjet.com/partners/');
  console.error('  then: $env:CAREERJET_AFFID="..."  (PowerShell)  or add it to .env');
  process.exit(1);
}

// Keywords tuned to the candidate's AI/agent target. Edit freely.
const KEYWORDS = [
  'AI Engineer',
  'Machine Learning',
  'LLM',
  'AI Agent',
  'Data Scientist',
  'AI intern',
];

const BASE = 'http://public.api.careerjet.net/search';

async function searchOne(keywords) {
  const params = new URLSearchParams({
    locale_code: 'id_ID',          // Indonesian locale
    keywords,
    location: LOCATION,
    sort: 'date',
    pagesize: '50',
    affid: AFFID,
    user_ip: '203.0.113.1',         // required by API; placeholder is fine for server-side
    user_agent: 'career-ops/1.0',
    url: 'https://github.com/santifer/career-ops',
  });
  const r = await fetch(`${BASE}?${params}`, { headers: { 'user-agent': 'career-ops/1.0' } });
  if (!r.ok) { console.error(`  ✗ "${keywords}": HTTP ${r.status}`); return []; }
  const d = await r.json();
  if (d.type !== 'JOBS') { console.error(`  ✗ "${keywords}": ${d.type} — ${d.error || ''}`); return []; }
  return d.jobs || [];
}

function loadSeen() {
  if (!existsSync(PIPELINE)) return new Set();
  const t = readFileSync(PIPELINE, 'utf-8');
  return new Set([...t.matchAll(/\((https?:\/\/\S+?)\)|\] (https?:\/\/\S+)/g)].map(m => m[1] || m[2]));
}

const seen = loadSeen();
const fresh = [];
const seenKeys = new Set();

console.log(`Careerjet scan — location="${LOCATION}", ${KEYWORDS.length} keyword sets\n`);
for (const kw of KEYWORDS) {
  const jobs = await searchOne(kw);
  console.log(`  • "${kw}": ${jobs.length} hits`);
  for (const j of jobs) {
    const url = j.url;
    if (!url || seen.has(url)) continue;
    const key = `${(j.company || '').toLowerCase()}::${(j.title || '').toLowerCase()}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    fresh.push({ title: (j.title || '').trim(), company: (j.company || 'Unknown').trim(), location: j.locations || LOCATION, url });
  }
}

console.log(`\n${fresh.length} new local roles found.`);
for (const f of fresh) console.log(`  + ${f.company} | ${f.title} | ${f.location}`);

if (!dryRun && fresh.length) {
  let pipe = readFileSync(PIPELINE, 'utf-8');
  const marker = '## Pendientes';
  const idx = pipe.indexOf(marker);
  const block = '\n' + fresh.map(f => `- [ ] ${f.url} | ${f.company} | ${f.title}`).join('\n') + '\n';
  pipe = idx === -1 ? pipe + `\n${marker}\n${block}` : pipe.slice(0, idx + marker.length) + block + pipe.slice(idx + marker.length);
  writeFileSync(PIPELINE, pipe, 'utf-8');
  console.log(`\nWritten to ${PIPELINE}. Run /career-ops pipeline to evaluate.`);
} else if (dryRun) {
  console.log('\n(dry run — nothing written)');
}
