#!/usr/bin/env node
/**
 * glints-scan.mjs — Scan Glints (Indonesia) for AI INTERNSHIPS.
 *
 * Glints has no public API and blocks plain fetch, but its job-explore pages are
 * Next.js SSR — the listings sit in the __NEXT_DATA__ JSON. We fetch the explore
 * page per keyword with browser headers, parse that JSON, and keep INTERNSHIP
 * rows whose title looks AI-relevant. Reaches LOCAL Indonesian roles that the
 * ATS scanner (scan.mjs) and AI Dev Jobs cannot.
 *
 * Usage: node glints-scan.mjs [--all] [--since 30] [--write]
 * Listings whose entire disclosed salary range is below IDR 2M/month are
 * excluded. Undisclosed or malformed salary remains for human review.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';

const H = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://glints.com/id/en/explore',
};
const KEYWORDS = ['magang AI', 'AI intern', 'machine learning intern', 'data scientist intern', 'AI engineer', 'LLM', 'prompt engineer', 'AI automation'];
const AI_RE = /\b(ai|a\.i|artificial intelligence|machine learning|ml\b|llm|gen ?ai|generative|nlp|data scien|deep learning|prompt|automation|chatbot|computer vision)\b/i;
const CRYPTO_RE = /crypto|blockchain|web3|bitcoin|token|binance|nft/i;
const allMode = process.argv.includes('--all');
const sinceFlag = process.argv.indexOf('--since');
const sinceDays = sinceFlag !== -1 ? Number(process.argv[sinceFlag + 1]) : 30;
if (!Number.isInteger(sinceDays) || sinceDays < 1 || sinceDays > 90) {
  console.error('✗ --since must be an integer from 1 to 90');
  process.exit(1);
}
const cutoffMs = Date.now() - sinceDays * 24 * 60 * 60 * 1000;
const MIN_IDR = 2_000_000;
const PIPELINE = 'data/pipeline.md';

const kebab = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

function collect(node, out, seen) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const x of node) collect(x, out, seen); return; }
  if (node.title && (node.id || node.Id) && (node.CompanyId || node.company || node.companyId)) {
    const id = node.id || node.Id;
    if (!seen.has(id)) {
      seen.add(id);
      const co = node.Company?.name || node.company?.name || node.companyName || 'Unknown';
      const salary = node.salaries?.[0];
      const minSalary = Number(salary?.minAmount) || 0;
      const maxSalary = Number(salary?.maxAmount) || 0;
      const sal = salary ? `IDR ${minSalary.toLocaleString()}-${maxSalary.toLocaleString()}` : '(undisclosed)';
      const remote = node.isRemote ? 'Remote' : (node.City?.name || node.CityName || '');
      const postedAt = Date.parse(node.createdAt || node.updatedAt || '');
      out.push({ id, title: node.title.trim(), co, type: node.type || '', sal, minSalary, maxSalary, remote, postedAt });
    }
  }
  for (const k of Object.keys(node)) collect(node[k], out, seen);
}

async function search(kw) {
  const u = `https://glints.com/id/en/opportunities/jobs/explore?keyword=${encodeURIComponent(kw)}&country=ID&lowestLocationLevel=1`;
  for (let a = 0; a < 3; a++) {
    const r = await fetch(u, { headers: H });
    if (r.ok) {
      const h = await r.text();
      const i = h.indexOf('__NEXT_DATA__'); if (i === -1) return [];
      const start = h.indexOf('>', i) + 1, end = h.indexOf('</script>', start);
      try { const j = JSON.parse(h.slice(start, end)); const out = []; collect(j, out, new Set()); return out; } catch { return []; }
    }
    await new Promise(x => setTimeout(x, 1200 * (a + 1)));
  }
  return [];
}

const seenIds = new Set();
const rows = [];
let filteredLowPay = 0;
let filteredOld = 0;
for (const kw of KEYWORDS) {
  const found = await search(kw);
  let kept = 0;
  for (const o of found) {
    if (seenIds.has(o.id)) continue;
    if (!allMode && o.type !== 'INTERNSHIP') continue;
    if (!AI_RE.test(o.title)) continue;
    if (CRYPTO_RE.test(o.title) || CRYPTO_RE.test(o.co)) continue;
    if (Number.isFinite(o.postedAt) && o.postedAt < cutoffMs) { filteredOld++; continue; }
    const disclosedHigh = Math.max(o.minSalary, o.maxSalary);
    if (disclosedHigh > 0 && disclosedHigh < MIN_IDR) { filteredLowPay++; continue; }
    seenIds.add(o.id);
    o.url = `https://glints.com/id/en/opportunities/jobs/${kebab(o.title)}/${o.id}`;
    rows.push(o); kept++;
  }
  console.log(`  • "${kw}": ${found.length} hits, +${kept} kept`);
}

// dedup vs pipeline
let existing = new Set();
if (existsSync(PIPELINE)) { const t = readFileSync(PIPELINE, 'utf-8'); for (const m of t.matchAll(/(https?:\/\/glints\.com\/\S+)/g)) existing.add(m[1]); }
const fresh = rows.filter(r => ![...existing].some(e => e.includes(r.id)));

console.log(`\n${fresh.length} AI ${allMode ? 'roles' : 'INTERNSHIPS'} on Glints (non-crypto, last ${sinceDays}d):`);
console.log(`Filtered: ${filteredLowPay} below IDR 2M disclosed ceiling, ${filteredOld} older than cutoff.\n`);
for (const r of fresh) console.log(`  + ${r.title} @ ${r.co} | ${r.remote || '?'} | ${r.sal} [${r.type}]\n    ${r.url}`);

if (process.argv.includes('--write') && fresh.length) {
  let pipe = readFileSync(PIPELINE, 'utf-8');
  const marker = '## Pendientes'; const idx = pipe.indexOf(marker);
  const block = '\n' + fresh.map(r => `- [ ] ${r.url} | ${r.co} | ${r.title}`).join('\n') + '\n';
  pipe = idx === -1 ? pipe + `\n${marker}\n${block}` : pipe.slice(0, idx + marker.length) + block + pipe.slice(idx + marker.length);
  writeFileSync(PIPELINE, pipe, 'utf-8');
  console.log('\nWritten to pipeline.');
}
