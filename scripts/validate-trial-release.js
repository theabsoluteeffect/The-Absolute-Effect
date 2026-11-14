#!/usr/bin/env node
/**
 * Release gate for the newest uploaded oncology-trial batch.
 * Checks identity, source-link integrity, metadata, duplicated sections,
 * numeric chart defects and consistency of displayed absolute-effect claims.
 * It deliberately does not claim to validate clinical truth; primary-source
 * review remains a separate editorial requirement.
 */
const fs = require('node:fs');
const path = require('node:path');
const root = process.cwd();
const roster = JSON.parse(fs.readFileSync(path.join(root, 'data/master-trial-roster.json'), 'utf8'));
const trials = roster.trials || [];
const dates = [...new Set(trials.map(t => t.batch_date).filter(Boolean))].sort();
const latestDate = dates.at(-1);
const batch = trials.filter(t => t.batch_date === latestDate);
const errors = [];
const norm = s => String(s || '').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const fail = (id, issue) => errors.push({ id, issue });
if (!latestDate) fail('roster', 'No batch_date found on roster entries');
if (batch.length !== 30) fail('roster', `Latest batch ${latestDate} has ${batch.length} entries; expected exactly 30`);
if (new Set(trials.map(t => t.id)).size !== trials.length) fail('roster', 'Duplicate trial IDs');
if (new Set(batch.map(t => t.path)).size !== batch.length) fail('roster', 'Duplicate paths in latest batch');
const announced = roster.audit?.new_trials_added_today || [];
const expected = batch.map(t => t.trial).sort();
if (JSON.stringify([...announced].sort()) !== JSON.stringify(expected)) {
  fail('roster', 'new_trials_added_today does not exactly match the latest 30 uploaded trial names');
}
for (const t of batch) {
  const raw = (t.path || '').split('#')[0];
  const file = path.join(root, raw.endsWith('.html') ? raw : path.posix.join(raw.replace(/\/$/, ''), 'index.html'));
  if (!fs.existsSync(file)) { fail(t.id, 'Missing canonical HTML page: ' + path.relative(root, file)); continue; }
  const html = fs.readFileSync(file, 'utf8');
  const title = norm((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [,''])[1]).replace(/\s*\|\s*The Absolute Effect$/i,'');
  const h1 = norm((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [,''])[1]);
  if (title !== t.trial) fail(t.id, `HTML title mismatch: "${title}"`);
  if (h1 !== t.trial) fail(t.id, `H1 mismatch: "${h1}"`);
  if (/NaN|undefined%|Infinity%/i.test(html)) fail(t.id, 'Non-finite chart value in HTML');
  if (/href=["'](?:10\.|doi:)/i.test(html)) fail(t.id, 'Malformed bare DOI hyperlink');
  if (/DOI:\s*;|PMID\s*NCT|DOI:\s*NCT|PMID\s*10\./i.test(html)) fail(t.id, 'DOI/PMID/registry metadata appears misassigned');
  const primarySection = (html.match(/<section[^>]*>[\s\S]*?<h2[^>]*>\s*Primary source\s*<\/h2>[\s\S]*?<\/section>/i) || [,''])[1];
  if (!primarySection) fail(t.id, 'Primary source section missing');
  else {
    const hrefs = [...primarySection.matchAll(/href=["']([^"']+)["']/gi)].map(m => m[1]);
    const doi = String(t.primary || '').trim();
    if (/^10\./.test(doi) && !hrefs.includes('https://doi.org/' + doi) && !hrefs.includes('https://www.doi.org/' + doi)) {
      fail(t.id, 'Primary DOI link does not match roster primary: ' + doi);
    }
    if (!hrefs.some(h => /^https?:\/\//i.test(h))) fail(t.id, 'No absolute external primary-source link');
  }
  const heads = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map(m => norm(m[1]).toLowerCase());
  const dup = heads.find((h, i) => heads.indexOf(h) !== i);
  if (dup) fail(t.id, 'Duplicate section heading: ' + dup);
  const detailNnt = String(t.setting_detail || '').match(/\bNNT\s*(?:of\s*)?(\d+(?:\.\d+)?)/i);
  if (detailNnt) {
    const pageNnts = [...html.matchAll(/\bNNT\s*(?:of\s*)?(\d+(?:\.\d+)?)/gi)].map(m => m[1]);
    if (pageNnts.some(n => Number(n) !== Number(detailNnt[1]))) fail(t.id, `NNT mismatch: roster ${detailNnt[1]}, page ${pageNnts.join(', ')}`);
  }
  if (!html.includes('assets/trial-page-layout.js')) fail(t.id, 'Shared trial-page renderer missing');
}
const report = { generated_at: new Date().toISOString(), latest_batch_date: latestDate, latest_batch_count: batch.length, errors };
fs.mkdirSync(path.join(root, 'data'), { recursive: true });
fs.writeFileSync(path.join(root, 'data/trial-release-validation.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ latest_batch_date: latestDate, latest_batch_count: batch.length, error_count: errors.length, errors }, null, 2));
if (errors.length) process.exitCode = 1;
