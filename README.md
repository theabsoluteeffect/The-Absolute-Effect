# The Absolute Effect — v2 prototype

## Customizable architecture
- All visible branding/about text can be edited from **Customize**.
- Changes are stored locally in the browser for this prototype.
- Evidence is stored as structured JSON and can be exported/imported.
- The database is maintained as a structured evidence atlas; future entries should follow the evidence-atlas operating rules below.
- New trials can be added later using `evidence_schema.json`.

## Evidence-atlas operating rules
- Build every tumour subsite from fundamentals upward: stage I where applicable → stage II → stage III/locoregional → metastatic disease.
- Within each stage, establish the role of each major modality first, then the trials that established the standard, then refinement/escalation/de-escalation and newer therapies.
- Preserve the clinical decision-tree hierarchy: tumour site → discipline → setting → clinical question/trial.
- Discipline and setting filters are dependent.
- The Clinical Question dropdown must display the clinical question followed by the trial/study name in brackets.
- Avoid duplication and verify endpoint, time horizon, relative/absolute calculations and source before integration.
- Each study should include clinical question, population, intervention vs comparator, key endpoint, OS, DFS/PFS, recurrence outcomes where relevant, relative effect, absolute effect, follow-up, toxicity, QoL, one-line interpretation and primary source.

### NNT / NNH rules
- NNT and NNH are endpoint-specific, not generic study-level numbers.
- Every study must explicitly state which endpoint and time point were used for NNT and NNH.
- NNT should preferentially use absolute event rates at the same prespecified or clinically meaningful landmark.
- Do not derive misleading NNT/NNH from median survival when fixed-time event rates are available or when the calculation is not clinically defensible.
- NNH must not automatically mean grade ≥3 toxicity. Use the trial's prespecified, clinically central or most important toxicity endpoint when an absolute excess can be quantified reliably.
- If NNH cannot be reliably quantified, state **NNH: not quantifiable** and describe the important toxicity in text, including severity, frequency and treatment burden.
- Other important toxicities must still be reported even when they are not used to calculate NNH.
- For non-inferiority/equivalence trials, explicitly state NON-INFERIOR or EQUIVALENT and give the prespecified margin. Do not describe a numerical difference as a superiority benefit unless superiority was demonstrated.

## Trial of the Day
- A separate front-of-page section highlights one newly published or presented study with interesting clinically relevant data from major oncology journals/meetings, including but not limited to NEJM, JAMA/JAMA Oncology, Lancet/Lancet Oncology, Nature Medicine, JCO, Annals of Oncology and major ASCO/ESMO/ASTRO/ESTRO meetings.
- Trial of the Day must include a 3–5 line critical clinical review from an oncologist's perspective, explicitly weighing absolute benefit against absolute harm, treatment burden, long-term toxicity and, where appropriate, financial toxicity.
- The critical review should not simply repeat the authors' discussion and should distinguish surrogate improvements such as pCR from patient-centred outcomes such as EFS or OS.
- When a Trial of the Day is replaced on the following day, the previous day's trial must automatically be promoted into the permanent evidence/trial archive so it is not lost.

## Roadmap
- Balance subsites over the month rather than forcing exact daily equality.
- Keep FASTRACK II in the RCC roadmap; do not use InPACT as a substitute.
- Continue long-term evidence coverage and identify gaps rather than creating a catalogue of only famous trials.

## Important
Before public deployment, each entry should undergo source verification, endpoint/time-horizon checking, calculation review and toxicity/QoL review.

<!-- Cloudflare Pages deployment check: 2026-09-06 -->
