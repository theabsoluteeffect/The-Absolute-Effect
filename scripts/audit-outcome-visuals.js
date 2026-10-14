#!/usr/bin/env node
/**
 * Static QA for The Absolute Effect outcome-visual rule.
 * Run: node scripts/audit-outcome-visuals.js
 * This is a conservative heuristic: "candidate" means a renderer may be able
 * to visualize a reported result, not that the clinical content is verified.
 */
const fs = require('node:fs');
const path = require('node:path');
const root = process.cwd();
const rosterPath = path.join(root, 'data/master-trial-roster.json');
const roster = JSON.parse(fs.readFileSync(rosterPath, 'utf8'));
const trialRoot = path.join(root, 'trial-pages');
const htmlFiles = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full);
    else if (ent.isFile() && ent.name.toLowerCase().endsWith('.html')) htmlFiles.push(full);
  }
}
walk(trialRoot);
// Flat trial-pages/*.html files are legacy duplicate URLs; _redirects sends them
// to canonical directory pages. Audit canonical index pages separately.
const canonicalHtmlFiles = htmlFiles.filter(file => file.endsWith(path.sep + 'index.html'));
const legacyFlatFiles = htmlFiles.filter(file => path.dirname(file) === trialRoot && file.endsWith('.html'));
const redirectText = fs.existsSync(path.join(root, '_redirects')) ? fs.readFileSync(path.join(root, '_redirects'), 'utf8') : '';
const redirectSources = new Set(redirectText.split(String.fromCharCode(10)).map(line => line.trim().split(' ')[0]).filter(Boolean));
const legacyRedirectsMissing = legacyFlatFiles.map(file => '/' + path.relative(root, file).replaceAll(path.sep, '/')).filter(from => !redirectSources.has(from));
function inspect(file) {
  const html = fs.readFileSync(file, 'utf8');
  const visibleText = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/&gt;/gi, '>').replace(/&lt;/gi, '<').replace(/&amp;/gi, '&').replace(/\s+/g, ' ');
  const numericNnt = /data-nnt=["']\s*\d+(?:\.\d+)?\s*["']/.test(html);
  const numericNnh = /data-nnh=["']\s*\d+(?:\.\d+)?\s*["']/.test(html);
  const hasRenderer = /assets\/absolute-effect\.js/.test(html);
  const hasExplicitVisual = /data-outcome-visual|data-outcome-single|data-outcome-static|ae-outcome-chart|ae-hr-track/.test(html);
  const pairedPercent = /\d+(?:\.\d+)?\s*%[^.]{0,80}?(?:vs\.?|versus)[^.]{0,60}?\d+(?:\.\d+)?\s*%/i.test(visibleText);
  const medianPair = /median.{0,180}?\d+(?:\.\d+)?\s*(?:months?|mos? years?|years?)?[^.]{0,50}?(?:vs\.?|versus)[^.]{0,40}?\d+(?:\.\d+)?\s*(?:months?|years?)?/i.test(visibleText);
  const hrWithCI = /\bHR\s*[:=]?\s*\d+(?:\.\d+)?[^.]{0,100}?95\s*%\s*CI\s*[:=]?\s*\d+(?:\.\d+)?\s*(?:[-–—]|to)\s*\d+(?:\.\d+)?/i.test(visibleText);
  const singleRate = /(?:objective response(?: rate)?|\bORR\b|local control|overall survival|\bOS\b|progression[- ]free survival|\bPFS\b|disease[- ]free survival|\bDFS\b|patient preference|relapse(?: rate)?|recurrence(?: rate)?|event-free survival|\bEFS\b|pCR|pathological complete response|survival)[^.]{0,100}?\d+(?:\.\d+)?\s*%/i.test(visibleText);
  const eventCount = /\d+\s+(?:relapses|recurrences|events|responses)\s+(?:among|of)\s+\d+/i.test(visibleText);
  const numericEndpointCandidate = pairedPercent || medianPair || hrWithCI || singleRate || eventCount;
  let status = 'manual_review';
  if (!hasRenderer) status = 'renderer_missing';
  else if (numericNnt || numericNnh) status = 'absolute_effect_markup';
  else if (hasExplicitVisual || numericEndpointCandidate) status = 'outcome_visual_candidate';
  return {
    path: path.relative(root, file).replaceAll(path.sep, '/'),
    hasRenderer, numericNnt, numericNnh, hasExplicitVisual,
    pairedPercent, medianPair, hrWithCI, singleRate, eventCount, status
  };
}
const rosterPages = [];
const missingRosterPages = [];
for (const t of (roster.trials || [])) {
  const raw = t.path || t.source || `trial-pages/${t.id}/`;
  const rel = raw.endsWith('.html') ? raw : path.posix.join(raw.replace(/\/$/, ''), 'index.html');
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) missingRosterPages.push({ id: t.id, trial: t.trial, path: rel });
  else rosterPages.push({ id: t.id, trial: t.trial, ...inspect(full) });
}
const allPages = canonicalHtmlFiles.map(inspect);
const report = {
  generated_at: new Date().toISOString(),
  rule: 'NNT/NNH pictogram when defensible; otherwise visualize a source-reported outcome or flag for manual review. Never infer NNT from median survival.',
  roster_count: (roster.trials || []).length,
  roster_pages_found: rosterPages.length,
  roster_pages_missing: missingRosterPages,
  all_canonical_trial_html_pages: allPages.length,
  legacy_flat_html_routes: legacyFlatFiles.length,
  legacy_redirects_missing: legacyRedirectsMissing,
  counts: {
    roster_absolute_effect_markup: rosterPages.filter(x => x.status === 'absolute_effect_markup').length,
    roster_outcome_visual_candidate: rosterPages.filter(x => x.status === 'outcome_visual_candidate').length,
    roster_manual_review: rosterPages.filter(x => x.status === 'manual_review').length,
    roster_renderer_missing: rosterPages.filter(x => x.status === 'renderer_missing').length,
    all_html_manual_review: allPages.filter(x => x.status === 'manual_review').length,
    all_html_renderer_missing: allPages.filter(x => x.status === 'renderer_missing').length
  },
  roster_pages: rosterPages,
  unrostered_or_duplicate_canonical_html_pages: allPages.filter(p => !rosterPages.some(r => r.path === p.path))
};
const out = path.join(root, 'data/outcome-visual-audit.json');
fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ output: 'data/outcome-visual-audit.json', ...report.counts, roster_pages_found: report.roster_pages_found, roster_pages_missing: missingRosterPages.length, all_trial_html_pages: allPages.length }, null, 2));
if (missingRosterPages.length || report.counts.roster_renderer_missing || legacyRedirectsMissing.length) process.exitCode = 1;
