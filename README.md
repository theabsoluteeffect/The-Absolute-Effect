# The Absolute Effect — v2 prototype

## Customizable architecture
- All visible branding/about text can be edited from **Customize**.
- Changes are stored locally in the browser for this prototype.
- Evidence is stored as structured JSON and can be exported/imported.
- The database is maintained as a structured evidence atlas; future entries should follow the evidence-atlas operating rules above.
- New trials can be added later using `evidence_schema.json`.

## Evidence-atlas operating rules
- Continue building **Breast Cancer only** until the breast-cancer evidence roadmap is exhausted; do not switch tumour sites unless explicitly requested.
- Preserve the agreed **clinical decision-tree hierarchy**: tumour site → discipline → setting → clinical question/trial.
- Discipline and setting filters are **dependent**: Medical Oncology must show only Medical Oncology settings; Radiation Oncology must show only Radiation Oncology settings, and incompatible settings must never appear after a discipline is selected.
- The **Clinical Question** dropdown must display the clinical question followed by the trial/study name in brackets, e.g. "Clinical question (Trial name)"; it must never fall back to showing only the trial name when a question is available.
- For future breast-cancer roadmap additions, use the approved roadmap automatically and **do not ask for approval again for each future trial** unless the user explicitly changes this rule.
- Each study should be added with the full Absolute Effect evidence structure: clinical question, population, intervention vs comparator, key endpoint, OS, DFS/PFS, local/distant recurrence where relevant, relative effect, absolute effect, NNT/NNH when defensible, follow-up, important toxicity and quality-of-life outcomes, one-line clinical interpretation, and primary publication/source link.
- Avoid duplication of studies already present in the atlas.
- Integrate efficacy and toxicity/QoL in the same clinical comparison rather than presenting benefit alone.
- Before modifying the website, verify the entry's endpoint, time horizon, relative/absolute calculations, and source. Preserve existing entries and hierarchy when adding new studies.

## Important
The displayed KEYNOTE-054 values are sourced from the published 3-year analysis:
63.7% vs 44.1% RFS; HR 0.56 (95% CI 0.47–0.68).

The harm example uses the original trial's treatment-related grade 3–5 adverse-event rates:
14.7% vs 3.4%.

Before public deployment, each entry should undergo source verification, endpoint/time-horizon checking, and calculation review.
