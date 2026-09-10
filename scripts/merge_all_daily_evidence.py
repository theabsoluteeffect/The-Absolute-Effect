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

match = re.search(r"const trials=(\[.*?\]);", html, flags=re.S)
if not match:
    raise SystemExit("Current const trials navigation block not found")

old_trials = json.loads(match.group(1))
paths_by_id = {x.get("trial"): x.get("path") for x in old_trials if x.get("trial") and x.get("path")}

navigation = []
for x in entries:
    rid = x.get("id")
    trial = x.get("trial") or x.get("name") or rid
    if not rid or not trial:
        continue
    dedicated = ROOT / "trial-pages" / rid / "index.html"
    path = f"trial-pages/{rid}/" if dedicated.exists() else (paths_by_id.get(trial) or f"__evidence__/{rid}")
    navigation.append({
        "site": x.get("site", ""),
        "discipline": x.get("discipline", ""),
        "setting": x.get("setting", ""),
        "trial": trial,
        "question": x.get("clinicalQuestion") or x.get("question") or trial,
        "path": path
    })

replacement = "const trials=" + json.dumps(navigation, ensure_ascii=False, separators=(",", ":")) + ";"
html = html[:match.start()] + replacement + html[match.end():]
INDEX.write_text(html, encoding="utf-8")
print(f"Atlas navigation rebuilt from {len(navigation)} unique evidence records.")
