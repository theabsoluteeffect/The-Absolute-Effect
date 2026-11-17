#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const roster = JSON.parse(fs.readFileSync(path.join(root, 'data/master-trial-roster.json'), 'utf8'));
const trialRoot = path.join(root, 'trial-pages');
const htmlFiles = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) htmlFiles.push(full);
  }
}
walk(trialRoot);

function relative(file) {
  return path.relative(root, file).replaceAll(path.sep, '/');
}
function isRedirectStub(file) {
  const html = fs.readFileSync(file, 'utf8');
  if (html.length > 5000) return false;
  const metaRefresh = /<meta[^>]+http-equiv\s*=\s*["']refresh["']/i.test(html);
  const jsRedirect = /(?:window\.)?location\.(?:replace|assign)\s*\(|window\.location(?:\.href)?\s*=/i.test(html);
  const canonical = html.match(/<link[^>]+rel\s*=\s*["']canonical["'][^>]+href\s*=\s*["']([^"']+)/i);
  let canonicalDiff = false;
  if (canonical) {
    try {
      const target = new URL(canonical[1], 'https://theabsoluteeffect.pages.dev').pathname.replace(/\/+$/, '');
      const current = ('/' + relative(file)).replace(/\/index\.html$/, '').replace(/\/+$/, '');
      canonicalDiff = !!target && target !== current;
    } catch (_) {}
  }
  return metaRefresh || jsRedirect || canonicalDiff;
}

const redirectStubFiles = htmlFiles.filter(file => file.endsWith(path.sep + 'index.html') && isRedirectStub(file));
const canonicalHtmlFiles = htmlFiles.filter(file => file.endsWith(path.sep + 'index.html') && !isRedirectStub(file));
const legacyFlatFiles = htmlFiles.filter(file => path.dirname(file) === trialRoot && file.endsWith('.html'));
const redirectText = fs.existsSync(path.join(root, '_redirects')) ? fs.readFileSync(path.join(root, '_redirects'), 'utf8') : '';
const redirectSources = new Set(redirectText.split(String.fromCharCode(10)).map(line => line.trim().split(' ')[0]).filter(Boolean));
const legacyRedirectsMissing = legacyFlatFiles.map(file => '/' + relative(file)).filter(from => !redirectSources.has(from));

function inspect(file) {
  const html = fs.readFileSync(file, 'utf8');
  const visibleText = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&gt;/gi, '>')
    .replace(/&lt;/gi, '<')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ');
  const numericNnt = /data-nnt=["']\s*\d+(?:\.\d+)?\s*["']/i.test(html);
  const numericNnh = /data-nnh=["']\s*\d+(?:\.\d+)?\s*["']/i.test(html);
  const hasStaticVisual = /class=["'][^"']*(?:chart|chart-row|chart-note|outcome-chart|bar-chart|bar-row|progress-bar|meter|visualization|visualisation)[^"']*["']/i.test(html) || /<(?:svg|canvas)\b/i.test(html);
  const hasRendererScript = /assets\/(?:absolute-effect|trial-page-layout)\.js/i.test(html);
  const hasRenderer = hasRendererScript || hasStaticVisual;
  const hasDatedContext = /current[- ]practice context|current practice|clinical currency|practice context/i.test(visibleText) && /202[4-6]/.test(visibleText);
  const hasPrimarySource = /(?:pubmed\.ncbi\.nlm\.nih\.gov|doi\.org|clinicaltrials\.gov|nejm\.org|thelancet\.com|ascopubs\.org|nature\.com|pmc\.ncbi\.nlm\.nih\.gov)/i.test(html);
  const genericInterpretation = /interpret the absolute difference together with the endpoint|patient-level value of an intervention depends on absolute event risk|historical trials may use older staging/i.test(visibleText);
  const shortPage = html.length < 3500;
  const hasExplicitVisual = /data-absolute-effect|data-outcome-visual|data-outcome-single|data-outcome-static|ae-outcome-chart|ae-hr-track/i.test(html) || hasStaticVisual;
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
    path: relative(file),
    hasRenderer, hasRendererScript, hasStaticVisual, hasDatedContext, hasPrimarySource,
    genericInterpretation, shortPage, numericNnt, numericNnh, hasExplicitVisual,
    pairedPercent, medianPair, hrWithCI, singleRate, eventCount, status
  };
}

const rosterGroups = new Map();
for (const t of (roster.trials || [])) {
  const rawWithFragment = t.path || t.source || t.page_path || ('trial-pages/' + t.id + '/');
  const raw = rawWithFragment.split('#')[0];
  const rel = raw.endsWith('.html') ? raw : path.posix.join(raw.replace(/\/$/, ''), 'index.html');
  if (!rosterGroups.has(rel)) rosterGroups.set(rel, []);
  rosterGroups.get(rel).push(t);
}
const rosterPages = [];
const missingRosterPages = [];
for (const [rel, trials] of rosterGroups) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    missingRosterPages.push({ roster_ids: trials.map(t => t.id), trials: trials.map(t => t.trial), path: rel });
  } else {
    const pageAudit = inspect(full);
    rosterPages.push({
      id: trials[0].id,
      trial: trials[0].trial,
      roster_ids: trials.map(t => t.id),
      trial_names: trials.map(t => t.trial),
      ...pageAudit
    });
  }
}
const allPages = canonicalHtmlFiles.map(inspect);
const report = {
  generated_at: new Date().toISOString(),
  rule: 'NNT/NNH pictogram when defensible; otherwise visualize a source-reported outcome or flag for manual review. Never infer NNT from median survival.',
  roster_count: (roster.trials || []).length,
  roster_unique_canonical_destinations: rosterGroups.size,
  roster_pages_found: rosterPages.length,
  roster_pages_missing: missingRosterPages,
  all_canonical_trial_html_pages: allPages.length,
  redirect_stub_files: redirectStubFiles.map(relative),
  legacy_flat_html_routes: legacyFlatFiles.length,
  legacy_redirects_missing: legacyRedirectsMissing,
  counts: {
    roster_absolute_effect_markup: rosterPages.filter(x => x.status === 'absolute_effect_markup').length,
    roster_outcome_visual_candidate: rosterPages.filter(x => x.status === 'outcome_visual_candidate').length,
    roster_manual_review: rosterPages.filter(x => x.status === 'manual_review').length,
    roster_renderer_missing: rosterPages.filter(x => x.status === 'renderer_missing').length,
    roster_missing_dated_context: rosterPages.filter(x => !x.hasDatedContext).length,
    roster_missing_primary_source: rosterPages.filter(x => !x.hasPrimarySource).length,
    roster_generic_interpretation: rosterPages.filter(x => x.genericInterpretation).length,
    roster_short_pages: rosterPages.filter(x => x.shortPage).length,
    all_html_manual_review: allPages.filter(x => x.status === 'manual_review').length,
    all_html_renderer_missing: allPages.filter(x => x.status === 'renderer_missing').length,
    redirect_stub_count: redirectStubFiles.length
  },
  roster_pages: rosterPages,
  roster_pages_missing_dated_context: rosterPages.filter(x => !x.hasDatedContext).map(x => ({id:x.id,trial:x.trial,roster_ids:x.roster_ids,path:x.path})),
  roster_pages_missing_primary_source: rosterPages.filter(x => !x.hasPrimarySource).map(x => ({id:x.id,trial:x.trial,roster_ids:x.roster_ids,path:x.path})),
  roster_pages_generic_interpretation: rosterPages.filter(x => x.genericInterpretation).map(x => ({id:x.id,trial:x.trial,roster_ids:x.roster_ids,path:x.path})),
  roster_short_pages: rosterPages.filter(x => x.shortPage).map(x => ({id:x.id,trial:x.trial,roster_ids:x.roster_ids,path:x.path})),
  unrostered_or_duplicate_canonical_html_pages: allPages.filter(p => !rosterPages.some(r => r.path === p.path))
};
const out = path.join(root, 'data/outcome-visual-audit.json');
fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({
  output: 'data/outcome-visual-audit.json',
  ...report.counts,
  roster_pages_found: report.roster_pages_found,
  roster_pages_missing: missingRosterPages.length,
  all_trial_html_pages: allPages.length
}, null, 2));
if (missingRosterPages.length || report.counts.roster_renderer_missing || legacyRedirectsMissing.length) process.exitCode = 1;
