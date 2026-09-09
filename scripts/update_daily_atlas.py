import json
import re
from pathlib import Path
from html import escape

ROOT = Path(__file__).resolve().parents[1]
index_path = ROOT / "index.html"
data_path = ROOT / "data"
index = index_path.read_text(encoding="utf-8")
daily_files = sorted(data_path.glob("daily-evidence-*.json"))
latest_daily = json.loads(daily_files[-1].read_text(encoding="utf-8")) if daily_files else []

archive_path = data_path / "trial-archive.json"
previous_path = data_path / "previous-trial-of-the-day.json"
current_path = data_path / "trial-of-the-day.json"
archive = json.loads(archive_path.read_text(encoding="utf-8")) if archive_path.exists() else []
previous = json.loads(previous_path.read_text(encoding="utf-8")) if previous_path.exists() else {}
current = json.loads(current_path.read_text(encoding="utf-8")) if current_path.exists() else {}

if previous.get("id") and previous.get("id") != current.get("id") and not any(x.get("id") == previous.get("id") for x in archive):
    archive.append(previous)
    archive_path.write_text(json.dumps(archive, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    latest_daily.append({
        "id": previous["id"],
        "site": previous.get("site", ""),
        "discipline": previous.get("discipline", "Medical Oncology"),
        "setting": previous.get("setting", ""),
        "treatment": previous.get("title", previous.get("trial", "")),
        "population": previous.get("population", ""),
        "endpoint": "Trial of the Day summary",
        "horizon": "Publication analysis",
        "interventionRate": 0,
        "controlRate": 0,
        "absoluteBenefit": 0,
        "nnt": "See archived Trial of the Day analysis",
        "relativeLabel": "See publication",
        "relativeEffect": "",
        "ci": "",
        "n": 0,
        "interventionN": 0,
        "controlN": 0,
        "benefitText": previous.get("summary", "") + " Critical review: " + previous.get("criticalReview", ""),
        "harmLabel": "Trial-specific toxicity",
        "harmIntervention": 0,
        "harmControl": 0,
        "harmIncrease": 0,
        "nnH": "See archived Trial of the Day analysis",
        "trial": previous.get("trial", ""),
        "clinicalQuestion": previous.get("summary", ""),
        "refs": [previous.get("url", "")],
        "urls": [previous.get("url", "")],
    })

new_entries = []
for entry in latest_daily:
    trial_id = entry.get("id", "")
    if not trial_id:
        continue
    if f'"id":"{trial_id}"' in index or f'id:"{trial_id}"' in index:
        continue
    new_entries.append(entry)

if new_entries:
    marker = "\n]\n\nfunction getSettings"
    if marker not in index:
        raise SystemExit("defaultEvidence closing marker not found")
    additions = "".join(",\n" + json.dumps(entry, ensure_ascii=False, indent=2) for entry in new_entries)
    index = index.replace(marker, additions + "\n]\n\nfunction getSettings", 1)

# Keep the original filter repair for future integrations.
old_filter_block = '''function renderFilters(){
 const ev=getEvidence();
 const siteEl=document.getElementById("siteFilter"), dEl=document.getElementById("disciplineFilter"), gEl=document.getElementById("settingFilter");
 const site=siteEl.value||"All", oldD=dEl.value||"All", oldG=gEl.value||"All";
 fillSelect("siteFilter",["All",...unique("site")]);
 const siteEv=ev.filter(x=>site==="All"||x.site===site);
 const disciplines=["All",...unique("discipline",siteEv)];
 fillSelect("disciplineFilter",disciplines);
 const d=disciplines.includes(oldD)?oldD:"All"; dEl.value=d;
 const dEv=siteEv.filter(x=>d==="All"||x.discipline===d);
 const settings=["All",...unique("setting",dEv)];
 fillSelect("settingFilter",settings);
 gEl.value=settings.includes(oldG)?oldG:"All";
 ["siteFilter","disciplineFilter","settingFilter"].forEach(id=>document.getElementById(id).onchange=()=>{
   if(id!=="settingFilter") renderFilters();
   renderQuestionFilter();renderEntry();
 });
 renderQuestionFilter();
}'''
new_filter_block = '''function renderFilters(preserve=true){
 const ev=getEvidence();
 const siteEl=document.getElementById("siteFilter"), dEl=document.getElementById("disciplineFilter"), gEl=document.getElementById("settingFilter");
 const site=preserve && siteEl.value ? siteEl.value : "All";
 const oldD=preserve && dEl.value ? dEl.value : "All";
 const oldG=preserve && gEl.value ? gEl.value : "All";
 const sites=["All",...unique("site",ev)];
 fillSelect("siteFilter",sites);
 const selectedSite=sites.includes(site)?site:"All";
 siteEl.value=selectedSite;
 const siteEv=ev.filter(x=>selectedSite==="All"||x.site===selectedSite);
 const disciplines=["All",...unique("discipline",siteEv)];
 fillSelect("disciplineFilter",disciplines);
 const selectedD=disciplines.includes(oldD)?oldD:"All";
 dEl.value=selectedD;
 const dEv=siteEv.filter(x=>selectedD==="All"||x.discipline===selectedD);
 const settings=["All",...unique("setting",dEv)];
 fillSelect("settingFilter",settings);
 const selectedG=settings.includes(oldG)?oldG:"All";
 gEl.value=selectedG;
 siteEl.onchange=()=>{ renderFilters(false); renderQuestionFilter(); renderEntry(); };
 dEl.onchange=()=>{ renderFilters(true); renderQuestionFilter(); renderEntry(); };
 gEl.onchange=()=>{ renderQuestionFilter(); renderEntry(); };
 renderQuestionFilter();
}'''
if old_filter_block in index:
    index = index.replace(old_filter_block, new_filter_block, 1)

# Definitive selector implementation. This is appended on every daily integration so
# later evidence updates cannot reintroduce the old self-resetting selector behaviour.
filter_override = '''
<style id="atlas-filter-fix-style">
#siteFilter,#disciplineFilter,#settingFilter,#questionFilter{cursor:pointer;pointer-events:auto;opacity:1}
</style>
<script id="atlas-filter-fix">
(function(){
 function boot(){
   const siteEl=document.getElementById("siteFilter");
   const dEl=document.getElementById("disciplineFilter");
   const gEl=document.getElementById("settingFilter");
   const qEl=document.getElementById("questionFilter");
   const qWrap=document.getElementById("questionWrap");
   if(!siteEl||!dEl||!gEl) return;
   const ev=typeof getEvidence==="function" ? getEvidence() : [];
   const vals=(key,arr)=>["All",...Array.from(new Set(arr.map(x=>x[key]).filter(Boolean))).sort()];
   const fill=(el,items,selected)=>{
     el.innerHTML=items.map(v=>`<option value="${String(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\\"/g,"&quot;")}">${String(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</option>`).join("");
     el.value=items.includes(selected)?selected:"All";
   };
   function refresh(resetDownstream){
     const site=siteEl.value||"All";
     const siteEv=ev.filter(x=>site==="All"||x.site===site);
     const dWanted=resetDownstream?"All":(dEl.value||"All");
     const ds=vals("discipline",siteEv);
     fill(dEl,ds,ds.includes(dWanted)?dWanted:"All");
     const d=dEl.value;
     const dEv=siteEv.filter(x=>d==="All"||x.discipline===d);
     const gWanted=resetDownstream?"All":(gEl.value||"All");
     const gs=vals("setting",dEv);
     fill(gEl,gs,gs.includes(gWanted)?gWanted:"All");
     const g=gEl.value;
     const qEv=dEv.filter(x=>g==="All"||x.setting===g);
     if(qEl){
       const questions=Array.from(new Set(qEv.map(x=>x.clinicalQuestion||x.questionLabels||x.trial).filter(Boolean))).sort();
       if(questions.length){
         qWrap.style.display="block";
         const oldQ=resetDownstream?"All":(qEl.value||"All");
         fill(qEl,["All",...questions],questions.includes(oldQ)?oldQ:"All");
       }else{
         qWrap.style.display="none";
         qEl.innerHTML="<option value=\"All\">All</option>";
         qEl.value="All";
       }
     }
     if(typeof renderEntry==="function") renderEntry();
   }
   siteEl.onchange=function(){ refresh(true); };
   dEl.onchange=function(){ refresh(true); };
   gEl.onchange=function(){ refresh(true); };
   if(qEl) qEl.onchange=function(){ if(typeof renderEntry==="function") renderEntry(); };
   fill(siteEl,vals("site",ev),siteEl.value||"All");
   refresh(false);
 }
 if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot); else boot();
})();
</script>
'''
# Remove any earlier copy of the definitive override, then add exactly one before body end.
while 'id="atlas-filter-fix"' in index:
    s=index.find('<style id="atlas-filter-fix-style">')
    e=index.find('</script>', index.find('<script id="atlas-filter-fix">'))
    if s<0 or e<0: break
    e += len('</script>')
    index=index[:s]+index[e:]
index = index.replace("</body>", filter_override + "</body>", 1)

start = "<!-- TRIAL_OF_THE_DAY_START -->"
end = "<!-- TRIAL_OF_THE_DAY_END -->"
if start not in index or end not in index:
    legacy = re.search(r'<section class="trial-day">.*?</section>', index, re.S)
    if legacy:
        legacy_html = legacy.group(0)
        index = index[:legacy.start()] + start + legacy_html + end + index[legacy.end():]
    else:
        raise SystemExit("Trial of the Day markers not found")

def trial_html(t):
    return f'''<!-- TRIAL_OF_THE_DAY_START -->
<section id="trial-of-the-day" class="trial-day">
<div class="trial-day-card">
<div class="trial-day-label">Trial of the Day · {escape(t.get('date',''))}</div>
<h2 class="trial-day-title">{escape(t.get('trial',''))}: {escape(t.get('title',''))}</h2>
<div class="trial-day-meta">{escape(t.get('journal',''))} · {escape(t.get('setting',''))} · {escape(t.get('population',''))}</div>
<div class="trial-day-grid">
<div><p><strong>What did it show?</strong> {escape(t.get('summary',''))}</p></div>
<div><div class="trial-day-review"><strong>Critical clinical review</strong>{escape(t.get('criticalReview',''))}</div><a class="trial-day-link" href="{escape(t.get('url',''))}" target="_blank" rel="noopener">Read the primary publication →</a></div>
</div>
</div>
</section>
<!-- TRIAL_OF_THE_DAY_END -->'''

a = index.index(start)
b = index.index(end) + len(end)
index = index[:a] + trial_html(current) + index[b:]
index_path.write_text(index, encoding="utf-8")
previous_path.write_text(json.dumps(current, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Integrated {len(new_entries)} new evidence records")
