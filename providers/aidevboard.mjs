// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

// AI Dev Jobs (aidevboard.com) provider — AI/ML-specific job aggregator.
// No API key required. Best source for remote/Asia early-career AI roles,
// which the elite-lab ATS scanners miss entirely.
//
// Unlike a single-company ATS, this is an aggregator: instead of one slug it
// takes one or more query strings (portals.yml `queries:` or `query:`), each a
// raw querystring against /api/v1/jobs. Results are merged and deduped by URL.
// scan.mjs's title_filter / location_filter still apply on top.
//
// Auto-detects from careers_url containing `aidevboard.com`.
//
// API docs: https://aidevboard.com/openapi.yaml
// Read endpoints share a monthly anonymous quota; keep query count modest.

const API_BASE = 'https://aidevboard.com/api/v1/jobs';
const TIMEOUT_MS = 20_000;
const PER_PAGE = 100;

function isAidevboard(entry) {
  return /aidevboard\.com/i.test(entry.careers_url || '');
}

// Resolve the list of querystrings to run. Supports:
//   queries: ["location=Asia&workplace=remote", "location=Indonesia"]
//   query:   "location=Asia&workplace=remote"
// Falls back to a sensible Asia/remote default if neither is set.
function resolveQueries(entry) {
  if (Array.isArray(entry.queries) && entry.queries.length) return entry.queries;
  if (typeof entry.query === 'string' && entry.query.trim()) return [entry.query.trim()];
  return ['location=Asia&workplace=remote'];
}

/** @type {Provider} */
export default {
  id: 'aidevboard',

  detect(entry) {
    return isAidevboard(entry) ? { url: API_BASE } : null;
  },

  async fetch(entry, ctx) {
    const queries = resolveQueries(entry);
    const seen = new Set();
    const out = [];

    for (const q of queries) {
      const sep = q.includes('per_page') ? '' : `&per_page=${PER_PAGE}`;
      const url = `${API_BASE}?${q}${sep}`;
      let json;
      try {
        json = await ctx.fetchJson(url, { timeoutMs: TIMEOUT_MS });
      } catch (e) {
        // Don't let one bad query kill the whole company — surface via scan errors
        // only if every query fails (rethrow after the loop if out is empty).
        if (queries.length === 1) throw e;
        continue;
      }
      const jobs = Array.isArray(json) ? json : (json?.jobs || json?.data || []);
      for (const j of jobs) {
        const jobUrl = j.apply_url || j.url || '';
        if (!jobUrl || seen.has(jobUrl)) continue;
        seen.add(jobUrl);
        out.push({
          title: j.title || '',
          url: jobUrl,
          company: j.company_name || j.company?.name || entry.name,
          location: j.location || '',
        });
      }
    }

    return out;
  },
};
