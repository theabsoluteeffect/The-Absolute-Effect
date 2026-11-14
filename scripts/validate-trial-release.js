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
async function main() {
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

const canonicalName = s => norm(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const extractDoi = s => { const m = String(s || '').match(/10\.\d{4,9}\/[^s<>")]+/i); return m ? m[0].replace(/[.,;]+$/, '').toLowerCase() : ''; };
const identifiers = x => [...new Set([x.registry_id, x.registry, x.pmid, ...(x.aliases || [])].map(v => String(v || '').trim().replace(/^PMID\s*/i, '').toUpperCase()).filter(v => /^(?:NCT\d{8}|CHICTR\d{10,}|JRCTS\d{9,}|ISRCTN\d{8}|\d{7,8})$/.test(v)))];
const allNames = trials.map(t => canonicalName(t.trial)).filter(Boolean);
if (new Set(allNames).size !== allNames.length) fail('roster', 'Duplicate normalized trial names in master roster');
const allDois = trials.map(t => extractDoi(t.primary)).filter(Boolean);
if (new Set(allDois).size !== allDois.length) fail('roster', 'Duplicate primary DOI in master roster');
const priorTrials = trials.filter(t => t.batch_date !== latestDate);
for (const t of batch) {
  const doi = extractDoi(t.primary);
  const ids = identifiers(t);
  for (const old of priorTrials) {
    if (canonicalName(old.trial) === canonicalName(t.trial)) fail(t.id, 'Duplicate trial name in prior master roster: ' + old.trial);
    if (doi && doi === extractDoi(old.primary)) fail(t.id, 'Duplicate primary DOI in prior master roster: ' + doi);
    const oldIds = identifiers(old);
    for (const id of ids) if (oldIds.includes(id)) fail(t.id, 'Duplicate PMID/registry identifier in prior master roster: ' + id);
  }
}
const dataDir = path.join(root, 'data');
const oldDailyFiles = fs.readdirSync(dataDir).filter(f => /^daily-evidence-.*\\.json$/i.test(f) && !f.includes('recovery'));
for (const fileName of oldDailyFiles) {
  let rows = [];
  try { const parsed = JSON.parse(fs.readFileSync(path.join(dataDir, fileName), 'utf8')); rows = Array.isArray(parsed) ? parsed : [parsed]; }
  catch (error) { fail(fileName, 'Could not parse daily-evidence JSON: ' + String(error)); continue; }
  for (const row of rows) {
    for (const t of batch) {
      if (row.duplicate_of === t.id) continue;
      const rowName = canonicalName(row.trial || row.title);
      if (rowName && rowName === canonicalName(t.trial)) fail(t.id, 'Duplicate trial reference in ' + fileName + ': ' + (row.trial || row.title));
      const rowDoi = extractDoi(row.primary) || extractDoi(row.doi) || extractDoi(row.url);
      if (rowDoi && rowDoi === extractDoi(t.primary)) fail(t.id, 'Duplicate DOI in ' + fileName + ': ' + rowDoi);
      const rowIds = identifiers(row);
      for (const id of identifiers(t)) if (rowIds.includes(id)) fail(t.id, 'Duplicate PMID/registry identifier in ' + fileName + ': ' + id);
      if (row.path && t.path && String(row.path).replace(/\\/$/, '') === String(t.path).replace(/\\/$/, '')) fail(t.id, 'Duplicate canonical path in ' + fileName);
    }
  }
}
try {
  const archive = JSON.parse(fs.readFileSync(path.join(dataDir, 'trial-archive.json'), 'utf8'));
  for (const row of (Array.isArray(archive) ? archive : [archive])) {
    for (const t of batch) {
      if (row.duplicate_of === t.id) continue;
      const rowName = canonicalName(row.trial || row.title || row.name);
      if (rowName && rowName === canonicalName(t.trial)) fail(t.id, 'Duplicate trial reference in trial-archive.json');
      const rowDoi = extractDoi(row.primary) || extractDoi(row.doi) || extractDoi(row.url);
      if (rowDoi && rowDoi === extractDoi(t.primary)) fail(t.id, 'Duplicate DOI in trial-archive.json: ' + rowDoi);
      const rowIds = identifiers(row);
      for (const id of identifiers(t)) if (rowIds.includes(id)) fail(t.id, 'Duplicate PMID/registry identifier in trial-archive.json: ' + id);
    }
  }
} catch (error) { fail('archive', 'Could not parse trial-archive.json: ' + String(error)); }

const canonicalTitle = s => norm(s).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
for (const t of batch) {
  const doi = String(t.primary || '').trim();
  if (!doi.startsWith('10.') || !doi.includes('/')) { fail(t.id, 'Missing or malformed primary DOI'); continue; }
  if (!t.primary_title) { fail(t.id, 'Primary publication title missing from roster'); continue; }
  try {
    let response = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      response = await fetch('https://api.crossref.org/works/' + encodeURIComponent(doi), { headers: { 'User-Agent': 'TheAbsoluteEffectReleaseQA/1.0 (https://theabsoluteeffect.pages.dev)' } });
      if (response.status !== 429 || attempt === 3) break;
      await new Promise(resolve => setTimeout(resolve, 2500 * (attempt + 1)));
    }
    if (!response || !response.ok) { fail(t.id, 'Crossref could not resolve primary DOI: HTTP ' + (response?.status || 'network error')); continue; }
    const payload = await response.json();
    const resolvedTitle = payload?.message?.title?.[0] || '';
    if (!resolvedTitle) fail(t.id, 'Crossref returned no publication title for primary DOI');
    else if (canonicalTitle(resolvedTitle) !== canonicalTitle(t.primary_title)) {
      fail(t.id, 'Primary DOI/title mismatch: Crossref="' + resolvedTitle + '" roster="' + t.primary_title + '"');
    }
    await new Promise(resolve => setTimeout(resolve, 1200));
  } catch (error) {
    fail(t.id, 'Primary DOI verification request failed: ' + String(error));
  }
}
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
  if (/width\s*:\s*(?:NaN|undefined|Infinity)/i.test(html)) fail(t.id, 'Non-finite chart width in HTML');
  if (/href=["'](?:10\.|doi:)/i.test(html)) fail(t.id, 'Malformed bare DOI hyperlink');
  if (/DOI:\s*;|PMID\s*NCT|DOI:\s*NCT|PMID\s*10\./i.test(html)) fail(t.id, 'DOI/PMID/registry metadata appears misassigned');
  const primarySection = (html.match(/<section[^>]*>[\s\S]*?<h2[^>]*>\s*Primary source\s*<\/h2>[\s\S]*?<\/section>/i) || [''])[0];
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
  const requiredHeadings = ['design, population and treatment', 'key efficacy outcome', 'safety and absolute effect', 'interpretation and limitations', 'primary source'];
  for (const heading of requiredHeadings) if (!heads.includes(heading)) fail(t.id, 'Required section missing: ' + heading);
  const visibleText = norm(html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' '));
  if (!(/current[- ]practice context|current practice|clinical currency/i.test(visibleText) && /202[4-6]/.test(visibleText))) fail(t.id, 'Dated current-practice review status missing');
  if (html.length < 3500) fail(t.id, 'Trial page is too short to contain the required evidence summary');
  const detailNnt = String(t.setting_detail || '').match(/\bNNT\s*(?:of\s*)?(\d+(?:\.\d+)?)/i);
  if (detailNnt) {
    const pageNnts = [...html.matchAll(/\bNNT\s*(?:of\s*)?(\d+(?:\.\d+)?)/gi)].map(m => m[1]);
    if (pageNnts.some(n => Number(n) !== Number(detailNnt[1]))) fail(t.id, `NNT mismatch: roster ${detailNnt[1]}, page ${pageNnts.join(', ')}`);
  }
  const absolute = t.absolute_effect;
  const pageNntClaims = [...html.matchAll(/\bNNT\s*(?:of\s*)?(\d+(?:\.\d+)?)/gi)];
  const pageNnhClaims = [...html.matchAll(/\bNNH\s*(?:of\s*)?(\d+(?:\.\d+)?)/gi)];
  if ((pageNntClaims.length || pageNnhClaims.length) && !absolute) fail(t.id, 'Numeric NNT/NNH claim exists without structured absolute_effect metadata');
  if (t.descriptive_outcome && /data-absolute-effect/i.test(html)) fail(t.id, 'Non-comparative descriptive outcome must not be rendered as an absolute treatment-effect pictogram');
  if (t.descriptive_outcome && !/no NNT (?:is )?calculated/i.test(html)) fail(t.id, 'Non-comparative descriptive outcome must explicitly state why NNT is not calculated');
  const aeMarkup = (html.match(/<div\b[^>]*data-absolute-effect[^>]*>/i) || [''])[0];
  if (detailNnt && !absolute) fail(t.id, 'NNT claim lacks structured absolute_effect metadata');
  if (absolute) {
    if (!aeMarkup) fail(t.id, 'Structured absolute_effect exists but pictogram markup is missing');
    const attr = name => { const m = aeMarkup.match(new RegExp('data-' + name + '="([^"]*)"', 'i')); return m ? m[1] : ''; };
    if (absolute.benefit_percentage_points !== undefined) {
      const benefit = Number(attr('benefit'));
      const expectedBenefit = Number(absolute.benefit_percentage_points);
      if (!Number.isFinite(benefit) || Math.abs(benefit - expectedBenefit) > 0.11) fail(t.id, `Absolute benefit mismatch: expected ${expectedBenefit}, page ${attr('benefit')}`);
    } else if (attr('benefit') !== '') fail(t.id, 'Page shows a benefit percentage without a structured source-grounded benefit endpoint');
    if (absolute.nnt !== undefined) { if (Number(attr('nnt')) !== Number(absolute.nnt)) fail(t.id, `NNT markup mismatch: expected ${absolute.nnt}, page ${attr('nnt')}`); }
    else if (attr('nnt') !== '') fail(t.id, 'Page displays an NNT without a defensible structured NNT value');
    if (absolute.nnt_not_calculated_reason && !/no NNT (?:is )?calculated/i.test(html)) fail(t.id, 'NNT not-calculated rationale is missing from page');
    const expectedHarm = absolute.harm_percentage_points;
    if (expectedHarm !== undefined) {
      const harm = Number(attr('harm'));
      if (!Number.isFinite(harm) || Math.abs(harm - Number(expectedHarm)) > 0.11) fail(t.id, `Absolute harm mismatch: expected ${expectedHarm}, page ${attr('harm')}`);
    } else if (attr('harm') !== '') fail(t.id, 'Page shows a harm percentage without a structured source-grounded harm endpoint');
    if (absolute.nnh !== undefined) { if (Number(attr('nnh')) !== Number(absolute.nnh)) fail(t.id, `NNH markup mismatch: expected ${absolute.nnh}, page ${attr('nnh')}`); }
    else if (attr('nnh') !== '') fail(t.id, 'Page displays an NNH without a defensible structured NNH value');
    if (absolute.nnt !== undefined && pageNntClaims.some(m => Number(m[1]) !== Number(absolute.nnt))) fail(t.id, 'NNT text does not match structured NNT value');
    if (absolute.nnh !== undefined && pageNnhClaims.some(m => Number(m[1]) !== Number(absolute.nnh))) fail(t.id, 'NNH text does not match structured NNH value');
  }
  if (!html.includes('assets/trial-page-layout.js')) fail(t.id, 'Shared trial-page renderer missing');
}
const report = { generated_at: new Date().toISOString(), latest_batch_date: latestDate, latest_batch_count: batch.length, errors };
fs.mkdirSync(path.join(root, 'data'), { recursive: true });
fs.writeFileSync(path.join(root, 'data/trial-release-validation.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ latest_batch_date: latestDate, latest_batch_count: batch.length, error_count: errors.length, errors }, null, 2));
if (errors.length) process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
