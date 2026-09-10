import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
DATA = ROOT / "data"

html = INDEX.read_text(encoding="utf-8")

entries = []
seen = set()
for path in sorted(DATA.glob("daily-evidence-*.json")):
    try:
        rows = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise SystemExit(f"Could not parse {path}: {exc}")
    for row in rows:
        rid = row.get("id")
        if rid and rid not in seen:
            entries.append(row)
            seen.add(rid)

entries = [x for x in entries if x.get("id") not in {"psmaddition", "rtog-9601"}]

for x in entries:
    if x.get("id") == "swენoteca-stage1-nsgct":
        x["id"] = "swenoteca-stage1-nsgct"
    if x.get("id") == "protect-15y":
        x["discipline"] = "Medical Oncology"
    if x.get("id") == "vesper":
        x.update({
            "interventionRate": 64,
            "controlRate": 56,
            "absoluteBenefit": 8,
            "nnt": "13",
            "relativeEffect": "0.79",
            "ci": "95% CI 0.59–1.05 for overall perioperative OS",
            "benefitText": "At 5 years, overall survival was 64% with dose-dense MVAC vs 56% with gemcitabine-cisplatin in the overall perioperative population, an absolute difference of 8 percentage points. The OS HR was 0.79 (95% CI 0.59–1.05), so the overall OS comparison did not demonstrate a statistically significant difference. In the neoadjuvant subgroup, 5-year OS was 66% vs 57%, HR 0.71. NNT 13 is descriptive and should not be interpreted as proof of superiority because the CI crosses 1."
        })

# Keep special cross-modality trials available under every relevant discipline.
# ProtecT is represented under Medical Oncology in the evidence data, while the
# navigation layer exposes it under all three clinical disciplines.
for x in entries:
    if x.get("id") == "protect-15y":
        x["discipline"] = "Medical Oncology"

if not any(x.get("id") == "arasens" for x in entries):
    entries.append({
        "id": "arasens",
        "site": "Prostate Cancer",
        "discipline": "Medical Oncology",
        "setting": "Metastatic Hormone-Sensitive",
        "treatment": "Darolutamide + ADT + docetaxel vs placebo + ADT + docetaxel",
        "population": "1,306 men with metastatic hormone-sensitive prostate cancer",
        "endpoint": "Overall survival",
        "horizon": "4 years",
        "interventionRate": 62.7,
        "controlRate": 50.4,
        "absoluteBenefit": 12.3,
        "nnt": "9",
        "relativeLabel": "HR",
        "relativeEffect": "0.68",
        "ci": "95% CI 0.57–0.80; P<.001",
        "n": 1306,
        "interventionN": 651,
        "controlN": 654,
        "benefitText": "Four-year overall survival was 62.7% with darolutamide + ADT + docetaxel vs 50.4% with ADT + docetaxel, an absolute improvement of 12.3 percentage points (NNT 9). NNT is based on 4-year overall survival.",
        "harmLabel": "Grade 3–5 adverse events",
        "harmIntervention": 66.1,
        "harmControl": 63.5,
        "harmIncrease": 2.6,
        "nnH": "Not quantifiable from this endpoint; grade 3–5 toxicity was similar between groups and discontinuation due to adverse events was 13.5% vs 10.5%.",
        "trial": "ARASENS",
        "clinicalQuestion": "In metastatic hormone-sensitive prostate cancer, does adding darolutamide to ADT + docetaxel improve survival?",
        "refs": ["Smith MR, et al. N Engl J Med. 2022;386:1132–1142."],
        "urls": ["https://pubmed.ncbi.nlm.nih.gov/35179367/"]
    })

marker = "const trials="
start = html.find(marker)
if start == -1:
    raise SystemExit("Current const trials navigation block not found")
arr_start = start + len(marker)
try:
    old_trials, rel_end = json.JSONDecoder().raw_decode(html[arr_start:])
except Exception as exc:
    raise SystemExit(f"Could not parse const trials navigation block: {exc}")
arr_end = arr_start + rel_end
paths_by_id = {x.get("trial"): x.get("path") for x in old_trials if x.get("trial") and x.get("path")}

navigation = []
for x in entries:
    rid = x.get("id")
    trial = x.get("trial") or x.get("name") or rid
    if not rid or not trial:
        continue
    dedicated = ROOT / "trial-pages" / rid / "index.html"
    path = f"trial-pages/{rid}/" if dedicated.exists() else (paths_by_id.get(trial) or f"__evidence__/{rid}")

    site = x.get("site", "")
    # GBM is a disease/subsite within Neuro-Oncology, never a separate tumour site.
    if site in {"Glioblastoma", "GBM"}:
        site = "Neuro-Oncology"

    raw_discipline = x.get("discipline", "")
    if raw_discipline == "Radiation / Medical Oncology":
        disciplines = ["Medical Oncology", "Radiation Oncology"]
    elif raw_discipline == "Medical / Radiation Oncology":
        disciplines = ["Medical Oncology", "Radiation Oncology"]
    elif raw_discipline == "Radiation / Surgical Oncology":
        disciplines = ["Radiation Oncology", "Surgical Oncology"]
    elif raw_discipline == "Medical / Surgical Oncology":
        disciplines = ["Medical Oncology", "Surgical Oncology"]
    elif raw_discipline == "Medical / Radiation / Surgical Oncology":
        disciplines = ["Medical Oncology", "Radiation Oncology", "Surgical Oncology"]
    else:
        disciplines = [raw_discipline]

    for discipline in disciplines:
        if discipline not in {"Medical Oncology", "Radiation Oncology", "Surgical Oncology"}:
            continue
        navigation.append({
            "id": rid,
            "site": site,
            "discipline": discipline,
            "setting": x.get("setting", ""),
            "trial": trial,
            "question": x.get("clinicalQuestion") or x.get("question") or trial,
            "path": path
        })

# ProtecT is genuinely cross-modality. Keep one underlying evidence record but
# expose it through each discipline filter without creating three evidence cards.
protect = next((x for x in navigation if x["id"] == "protect-15y"), None)
if protect:
    navigation = [x for x in navigation if x["id"] != "protect-15y"]
    for discipline in ["Medical Oncology", "Radiation Oncology", "Surgical Oncology"]:
        p = dict(protect)
        p["discipline"] = discipline
        navigation.append(p)

replacement = "const trials=" + json.dumps(navigation, ensure_ascii=False, separators=(",", ":")) + ";"
html = html[:start] + replacement + html[arr_end:]

# Ensure the displayed clinical question comes from the evidence object for the
# RTOG 9601 entry and cannot be overridden by a stale legacy questionLabels map.
question_fix = '''\n<script id="atlas-question-label-fix">\n(function(){\n  const fix=()=>{\n    if(typeof questionLabels!=="undefined" && typeof trials!=="undefined") {\n      const target=trials.find(t=>t.id==="nrg-rtog-9601");\n      if(target) questionLabels[target.id]=target.question;\n      delete questionLabels["rtog-9601"];\n    }\n  };\n  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",fix); else fix();\n})();\n</script>\n'''
if 'id="atlas-question-label-fix"' not in html:
    html = html.replace("</body>", question_fix + "</body>", 1)

INDEX.write_text(html, encoding="utf-8")
print(f"Atlas navigation rebuilt from {len(entries)} unique evidence records into {len(navigation)} discipline-linked navigation entries.")
