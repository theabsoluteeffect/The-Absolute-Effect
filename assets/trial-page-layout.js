(() => {
 const main=document.querySelector("main"); if(!main||!location.pathname.includes("/trial-pages/"))return;
 const css=":root{--ae-ink:#18221f;--ae-muted:#66736d;--ae-paper:#f4f6f3;--ae-line:#e1e7e1;--ae-green:#315d49;--ae-soft:#edf3ee}body{background:var(--ae-paper)!important;color:var(--ae-ink)!important;font:16px/1.65 system-ui,sans-serif!important}main{width:calc(100% - 36px)!important;max-width:1040px!important;margin:0 auto!important;padding:30px 0 72px!important}main>p:first-child{font-size:13px;color:var(--ae-muted);margin:0 0 18px}main a{color:#176080;text-underline-offset:3px;overflow-wrap:anywhere}.hero,.card{background:#fff!important;border:1px solid var(--ae-line)!important;border-radius:18px!important;padding:clamp(20px,3.2vw,34px)!important;margin:16px 0!important;box-shadow:0 3px 14px rgba(20,40,28,.035)}.hero{border-top:4px solid var(--ae-green)!important}.eyebrow{color:var(--ae-muted)!important;font-size:12px!important;font-weight:750!important;letter-spacing:.085em!important;text-transform:uppercase!important;line-height:1.5!important}h1{font-size:clamp(30px,5vw,46px)!important;line-height:1.12!important;letter-spacing:-.035em!important;margin:10px 0 16px!important;color:var(--ae-ink)!important}h2{font-size:clamp(20px,2.5vw,25px)!important;line-height:1.25!important;letter-spacing:-.02em!important;margin:0 0 18px!important;color:var(--ae-ink)!important}h3{font-size:16px!important;margin:20px 0 10px!important}.ae-question{font-size:18px;line-height:1.55;max-width:900px}.ae-summary{font-size:16px;line-height:1.65;margin-top:16px}.ae-design{background:#f8faf8;border:1px solid var(--ae-line);border-radius:12px;padding:16px 18px}.ae-design p{margin:8px 0 0}.ae-outcome{margin:18px 0}.ae-outcome-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;font-weight:650}.ae-track{height:16px;background:#edf1ed;border-radius:99px;overflow:hidden;margin-top:8px}.ae-fill{height:100%;background:var(--ae-green);border-radius:99px}.ae-fill.control{background:#9aa9a0}.ae-hr{background:var(--ae-soft);border:1px solid #dce8de;border-radius:12px;padding:15px 17px;margin-top:16px}.ae-note{border-left:4px solid #82998a;background:#f1f6f1;border-radius:4px;padding:15px 18px}.card p{margin:10px 0}.card .note{border-left:4px solid #82998a;background:#f1f6f1;border-radius:4px;padding:15px 18px}.barrow{display:none!important}@media(max-width:650px){main{width:calc(100% - 20px)!important;padding:18px 0 48px!important}.hero,.card{padding:18px!important}.ae-outcome-head{font-size:14px}}";
 const style=document.createElement("style");style.textContent=css;document.head.appendChild(style);
 const slug=location.pathname.split("/").filter(Boolean).pop();
 fetch("../../data/master-trial-roster.json").then(r=>r.ok?r.json():null).then(roster=>{
  const entry=roster&&roster.trials&&roster.trials.find(t=>(t.path||"").replace(/\/+$/,"").split("/").pop()===slug);
  if(!entry)return;const hero=main.querySelector(".hero");if(!hero)return;
  const eyebrow=hero.querySelector(".eyebrow"),old=eyebrow?eyebrow.textContent.trim():"",pieces=old.split(" · ");
  const designText=pieces.length>2?pieces.slice(1,-1).join(" · "):(pieces.length===2?pieces[1]:"");
  if(eyebrow)eyebrow.textContent=[entry.site,entry.setting,entry.discipline].filter(Boolean).join("  /  ");
  const h1=hero.querySelector("h1");if(h1)h1.textContent=entry.trial||h1.textContent;
  document.title=(entry.trial||document.title)+" | The Absolute Effect";
  const ps=[...hero.querySelectorAll("p")],question=ps.find(p=>/clinical question:/i.test(p.textContent)),summary=ps.find(p=>p!==question);
  if(question)question.classList.add("ae-question");
  const summaryText=String(entry.setting_detail||"").trim()||(summary?summary.textContent.trim():"");
  if(summary){summary.textContent=summaryText;summary.classList.add("ae-summary");}
  const sections=[...main.querySelectorAll("section.card")],design=sections.find(s=>/design, population and treatment/i.test((s.querySelector("h2")||{}).textContent||""));
  if(design){const p=design.querySelector("p");if(p&&designText){p.textContent=designText;p.className="ae-design";}}
  const efficacy=sections.find(s=>/key efficacy outcome/i.test((s.querySelector("h2")||{}).textContent||""));
  if(efficacy){
   const tox=[...efficacy.querySelectorAll("p")].map(p=>p.textContent.trim()).filter(Boolean).join(" ");efficacy.querySelectorAll(".barrow,p").forEach(el=>el.remove());
   const h2=efficacy.querySelector("h2");
   const outcomeRegex=/((?:(?:median|\d{1,2}-year|\d{1,2}-month)\s+)?(?:PFS|OS|DFS|EFS|ORR|pCR|response rate|no dose modification)[^.;]{0,50}?)([0-9]+(?:\.[0-9]+)?)\s*(%|months?|mo)?\s*(?:vs\.?|versus)\s*([0-9]+(?:\.[0-9]+)?)\s*(%|months?|mo)?/gi;
   let outcomes=[...summaryText.matchAll(outcomeRegex)];
   if(!outcomes.length){const fallback=summaryText.match(/([^.;]{0,75}?)([0-9]+(?:\.[0-9]+)?)\s*(%|months?|mo)?\s*(?:vs\.?|versus)\s*([0-9]+(?:\.[0-9]+)?)\s*(%|months?|mo)?/i);if(fallback)outcomes=[fallback];}
   if(outcomes.length){outcomes.forEach((match,index)=>{const context=(match[1]||"Reported outcome").replace(/[·:]\s*$/,"").trim()||"Reported outcome",a=Number(match[2]),b=Number(match[4]),unit=match[3]||match[5]||"",suffix=/month|mo/i.test(unit)?" months":unit,max=Math.max(a,b)||1;
    const box=document.createElement("div");box.className="ae-design";box.dataset.outcomeStatic="true";const label=document.createElement("b");label.textContent=context;const note=document.createElement("p");note.textContent="Reported values. Bar lengths are scaled to the larger value; they are not Kaplan–Meier probabilities unless the endpoint is a fixed-time rate.";box.append(label,note);h2.after(box);
    [["Experimental arm",a,false],["Comparator arm",b,true]].forEach(row=>{const wrap=document.createElement("div");wrap.className="ae-outcome";const head=document.createElement("div");head.className="ae-outcome-head";const l=document.createElement("span");l.textContent=row[0];const v=document.createElement("strong");v.textContent=row[1]+suffix;head.append(l,v);const track=document.createElement("div");track.className="ae-track";const fill=document.createElement("div");fill.className="ae-fill"+(row[2]?" control":"");fill.style.width=(row[1]/max*100).toFixed(1)+"%";track.append(fill);wrap.append(head,track);box.after(wrap);});
   });}else{const note=document.createElement("div");note.className="ae-note";note.textContent=summaryText||"No directly comparable numerical endpoint was available for a quantitative display.";h2.after(note);}
   if(slug==="unicorn"){
    const rows=[["pMMR · BOT",0],["pMMR · BOT + BAL",36],["dMMR · BOT",36],["dMMR · BOT + BAL",100]];
    const chart=document.createElement("div");chart.className="ae-design";chart.dataset.outcomeStatic="true";chart.style.marginTop="18px";
    const title=document.createElement("b");title.textContent="Major pathological response by cohort";
    const note=document.createElement("p");note.textContent="Source-reported pMR rates. These are sequential, non-randomized cohorts; comparisons are descriptive and do not establish a causal treatment effect.";
    chart.append(title,note);
    rows.forEach(row=>{const wrap=document.createElement("div");wrap.className="ae-outcome";const head=document.createElement("div");head.className="ae-outcome-head";const label=document.createElement("span");label.textContent=row[0];const value=document.createElement("strong");value.textContent=row[1]+"%";head.append(label,value);const track=document.createElement("div");track.className="ae-track";const fill=document.createElement("div");fill.className="ae-fill";fill.style.width=row[1]+"%";track.append(fill);wrap.append(head,track);chart.append(wrap);});
    h2.after(chart);
   }
   const hr=summaryText.match(/\bHR\s*([0-9.]+)\s*\(?(?:95%\s*CI\s*)?([0-9.]+)\s*[–-]\s*([0-9.]+)/i);
   if(hr){const box=document.createElement("div");box.className="ae-hr";box.textContent="Hazard ratio "+hr[1]+" (95% CI "+hr[2]+"–"+hr[3]+"). "+(Number(hr[1])<1?"Point estimate favours the experimental arm.":"Point estimate does not favour the experimental arm.");efficacy.append(box);}
   const nnt=summaryText.match(/\bNNT\s*([0-9]+)/i);if(nnt){const box=document.createElement("div");box.className="ae-note";box.textContent="Reported NNT: "+nnt[1]+". Interpret only for the specific endpoint and time horizon reported in the source.";efficacy.append(box);}
   const safety=sections.find(s=>/safety and absolute effect/i.test((s.querySelector("h2")||{}).textContent||""));if(safety&&tox){const p=document.createElement("p");p.textContent=tox;safety.insertBefore(p,safety.querySelector("p"));}
  }
  const source=sections.find(s=>/primary source/i.test((s.querySelector("h2")||{}).textContent||""));
  if(source){
   source.querySelectorAll("p").forEach(p=>{if(/^\s*(?:DOI|PMID)\s*:/i.test(p.textContent))p.remove();});
   const primary=String(entry.primary||"").trim();
   const primaryUrl=/^10\./.test(primary)?"https://doi.org/"+primary:(/^https?:\/\//i.test(primary)?primary:"");
   if(primaryUrl){
    let a=[...source.querySelectorAll("a")].find(x=>/doi\.org|primary publication|open primary/i.test((x.getAttribute("href")||"")+" "+x.textContent));
    if(!a){const p=document.createElement("p");a=document.createElement("a");p.append(a);source.append(p);}
    a.href=primaryUrl;a.textContent=/^10\./.test(primary)?"Primary publication · DOI: "+primary:"Primary publication";a.target="_blank";a.rel="noopener noreferrer";
   }
   source.querySelectorAll("a").forEach(a=>{let href=a.getAttribute("href")||"",txt=a.textContent.trim();if(/^10\./.test(href))href="https://doi.org/"+href;if(!/^https?:\/\//i.test(href)&&/^https?:\/\//i.test(txt))href=txt;if(/^https?:\/\//i.test(href)){a.href=href;a.target="_blank";a.rel="noopener noreferrer";}else{a.removeAttribute("href");a.textContent=txt+" (link not verified)";}});
  }
 }).catch(()=>{});
})();