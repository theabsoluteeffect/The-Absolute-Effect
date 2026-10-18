/* Shared Absolute Effect component. Every dot = one patient. Benefit and harm are shown separately. */
(function(){
  const css='.ae-effect{font-family:system-ui,sans-serif;background:#fff;border:1px solid #e3e3df;border-radius:16px;padding:22px;margin:18px 0}.ae-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.ae-panel{border:1px solid #ddd;border-radius:12px;padding:16px}.ae-label,.ae-kicker{font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#666}.ae-number{font-size:30px;font-weight:850;margin:5px 0}.ae-view-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:18px}.ae-view-panel{border:1px solid #e3e3df;border-radius:12px;padding:16px}.ae-view-panel h3{margin:0 0 4px}.ae-dots{display:grid;grid-template-columns:repeat(20,1fr);gap:4px;margin-top:10px}.ae-dot{display:block;aspect-ratio:1;border-radius:50%;background:#ddd}.ae-dot.benefit{background:#171717!important}.ae-dot.harm{background:#777!important}.ae-nnt-dots{display:grid;grid-template-columns:repeat(10,1fr);gap:5px;max-width:260px;margin-top:10px}.ae-nnt-dot{display:block;aspect-ratio:1;border-radius:50%;background:#ddd}.ae-nnt-dot.benefit{background:#171717}.ae-nnt-dot.harm{background:#777}.ae-nnt-caption{font-size:13px;color:#666;margin-top:7px}.ae-note{color:#666;font-size:13px}.ae-outcome-chart{border:1px solid #e3e3df;border-radius:14px;padding:20px;background:#fff;margin:18px 0}.ae-outcome-chart h3{margin:0 0 5px;font-size:18px}.ae-outcome-subtitle{color:#666;font-size:13px;margin:0 0 18px}.ae-outcome-row{display:grid;grid-template-columns:minmax(130px,1fr) 3fr 58px;gap:12px;align-items:center;margin:14px 0}.ae-outcome-label{font-size:14px;font-weight:650}.ae-outcome-track{height:22px;border-radius:5px;background:#eee;overflow:hidden}.ae-outcome-fill{height:100%;border-radius:5px;background:#555}.ae-outcome-fill.treatment{background:#171717}.ae-outcome-value{font-size:17px;font-weight:800;text-align:right;font-variant-numeric:tabular-nums}.ae-outcome-difference{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}.ae-outcome-stat{border-radius:10px;background:#f4f4f1;padding:12px 15px;flex:1;min-width:125px}.ae-outcome-stat strong{display:block;font-size:20px}.ae-outcome-stat span{font-size:12px;color:#666}.ae-outcome-footnote{font-size:12px;color:#666;margin:14px 0 0}.ae-hr-track{height:28px;background:linear-gradient(to right,#ecece8,#ecece8);border-radius:7px;position:relative;margin:22px 0 8px;overflow:hidden}.ae-hr-null{position:absolute;top:0;bottom:0;width:2px;background:#777;z-index:2}.ae-hr-ci{position:absolute;top:10px;height:8px;background:#888;border-radius:8px}.ae-hr-point{position:absolute;top:5px;width:18px;height:18px;border:3px solid #171717;background:#fff;border-radius:50%;transform:translateX(-50%);z-index:3}.ae-hr-axis{display:flex;justify-content:space-between;gap:8px;font-size:11px;color:#666}@media(max-width:700px){.ae-grid,.ae-view-grid{grid-template-columns:1fr}.ae-dots{grid-template-columns:repeat(10,1fr)}.ae-outcome-row{grid-template-columns:1fr 54px;gap:6px}.ae-outcome-label{grid-column:1/-1}.ae-outcome-track{grid-column:1}.ae-outcome-value{grid-column:2;grid-row:2}}';
  const s=document.createElement('style');s.textContent=css;document.head.appendChild(s);
  function finite(v){const raw=String(v??'').replace(/,/g,'');const n=Number(raw);if(Number.isFinite(n))return Math.abs(n);const m=raw.match(/[-+]?\d+(?:\.\d+)?/);return m?Math.abs(Number(m[0])):null}
  function dots(value,type,count=100){const n=Math.min(count,Math.round(finite(value)||0));let dots='';for(let i=0;i<count;i++){const active=i<n;const cls=active?(type==='benefit'?'ae-dot benefit':'ae-dot harm'):'ae-dot';dots+='<span class="'+cls+'"></span>';}return dots} function nntDots(value,type){const raw=String(value||'');const m=raw.match(/\d+(?:\.\d+)?/);if(!m)return '';const n=Math.round(Number(m[0]));if(!Number.isFinite(n)||n<2||n>100)return '';let out='';for(let i=0;i<n;i++){out+='<span class="ae-nnt-dot '+(i===0?(type==='benefit'?'benefit':'harm'):'')+'"></span>';}return out}
  function endpointFrom(value, pageText, kind){
    const raw=String(value||'');
    const colon=raw.match(/^([^:]{3,100}):/);
    if(colon)return colon[1].trim();
    const label=kind==='NNT'?'NNT':'NNH';
    const re=new RegExp('(?:'+label+'\\s*(?:≈|=|:)\\s*\\d+(?:\\.\\d+)?(?:\\s*)|'+label+'\\s+of\\s+\\d+(?:\\.\\d+)?(?:\\s*))[.\\-–—,;: ]{0,80}(?:for|based on|from)?\\s*([^.;]{3,100})','i');
    const m=String(pageText||'').match(re);
    if(m&&m[1])return m[1].replace(/^(one additional|an additional)\\s+/i,'').trim();
    return '';
  }
  function render(el){
    const hasNnt=/^\s*\d+(?:\.\d+)?\s*$/.test(String(el.dataset.nnt||''));
    const hasNnh=/^\s*\d+(?:\.\d+)?\s*$/.test(String(el.dataset.nnh||''));
    if(!hasNnt&&!hasNnh){if(!el.textContent.trim()&&el.children.length===0)el.hidden=true;return;}
    const pageText=(el.parentElement?.textContent||'')+' '+(el.closest('main')?.textContent||'');
    const b=finite(el.dataset.benefit),h=finite(el.dataset.harm),harmRaw=Number(el.dataset.harm),harmPositive=Number.isFinite(harmRaw)&&harmRaw>0,nnt=el.dataset.nnt||'Not applicable',nnh=el.dataset.nnh||'Not applicable';
    const nntEndpoint=el.dataset.nntEndpoint||endpointFrom(el.dataset.benefit,pageText,'NNT')||'';
    const nnhEndpoint=el.dataset.nnhEndpoint||endpointFrom(el.dataset.harm,pageText,'NNH')||'';
    el.className='ae-effect';
    const nntLabel=/^\d+(?:\.\d+)?$/g.test(String(nnt).trim())?'NNT: '+nnt+(nntEndpoint?' (based on '+nntEndpoint+')':''):'NNT: '+nnt;
    const nnhLabel=/^\d+(?:\.\d+)?$/g.test(String(nnh).trim())?'NNH: '+nnh+(nnhEndpoint?' (based on '+nnhEndpoint+')':''):'NNH: '+nnh;
    el.innerHTML='<div class="ae-kicker">ABSOLUTE EFFECT</div><div class="ae-grid">'+(hasNnt?'<div class="ae-panel"><div class="ae-label">Absolute benefit</div><div class="ae-number">'+(b===null?'Not quantifiable':b+' percentage points')+'</div><div>'+nntLabel+'</div></div>':'')+(hasNnh?'<div class="ae-panel"><div class="ae-label">Additional harm</div><div class="ae-number">'+(!harmPositive?'Not quantifiable':h+' percentage points')+'</div><div>'+nnhLabel+'</div></div>':'')+'</div><div class="ae-view-grid">'+(hasNnt?'<div class="ae-view-panel"><h3>Benefit — 100 patients</h3><p class="ae-note">'+(b===null?'Not quantifiable':b+' of 100 patients experience the displayed absolute benefit')+'</p><div class="ae-dots">'+dots(b,'benefit')+'</div></div>':'')+(hasNnh?'<div class="ae-view-panel"><h3>Additional harm — 100 patients</h3><p class="ae-note">'+(!harmPositive?'Not quantifiable from the selected endpoint':h+' of 100 patients experience the displayed additional harm')+'</p><div class="ae-dots">'+dots(harmPositive?h:null,'harm')+'</div></div>':'')+'</div><div class="ae-view-grid">'+(hasNnt?'<div class="ae-view-panel"><h3>NNT pictogram</h3><p class="ae-nnt-caption">1 highlighted patient = 1 additional benefit among '+nnt+' treated</p><div class="ae-nnt-dots">'+nntDots(nnt,'benefit')+'</div></div>':'')+(hasNnh?'<div class="ae-view-panel"><h3>NNH pictogram</h3><p class="ae-nnt-caption">1 highlighted patient = 1 additional harm among '+nnh+' treated</p><div class="ae-nnt-dots">'+nntDots(nnh,'harm')+'</div></div>':'')+'</div><p class="ae-note">Only quantified NNT/NNH endpoints are displayed.</p>'}
  function renderOutcome(el){
    const treatment=Number(el.dataset.treatment),control=Number(el.dataset.control);
    if(!Number.isFinite(treatment)||!Number.isFinite(control)||treatment<=0||control<=0)return;
    const max=Math.max(treatment,control),unit=el.dataset.unit||'',label=el.dataset.outcomeLabel||'Outcome',horizon=el.dataset.horizon||'',treatmentLabel=el.dataset.treatmentLabel||'Treatment',controlLabel=el.dataset.controlLabel||'Control',direction=el.dataset.direction||'higher';
    const diff=Math.abs(treatment-control),better=(direction==='lower'?(treatment<control):(treatment>control));
    el.className='ae-outcome-chart';
    el.innerHTML='<h3>'+label+'</h3><p class="ae-outcome-subtitle">'+(horizon?horizon+' · ':'')+'Reported group-level outcome</p>'+
      '<div class="ae-outcome-row"><div class="ae-outcome-label">'+treatmentLabel+'</div><div class="ae-outcome-track"><div class="ae-outcome-fill treatment" style="width:'+(treatment/max*100)+'%"></div></div><div class="ae-outcome-value">'+treatment+'</div></div>'+
      '<div class="ae-outcome-row"><div class="ae-outcome-label">'+controlLabel+'</div><div class="ae-outcome-track"><div class="ae-outcome-fill" style="width:'+(control/max*100)+'%"></div></div><div class="ae-outcome-value">'+control+'</div></div>'+
      '<div class="ae-outcome-difference"><div class="ae-outcome-stat"><strong>'+(treatment>control?'+':'−')+diff.toFixed(1)+' '+unit+'</strong><span>Absolute difference between reported values</span></div><div class="ae-outcome-stat"><strong>'+(el.dataset.hr?'HR '+el.dataset.hr:'Not supplied')+'</strong><span>'+(el.dataset.ci?'95% CI '+el.dataset.ci:'Relative effect')+'</span></div></div>'+
      '<p class="ae-outcome-footnote">Bars share a zero baseline and are scaled to the larger reported value. '+(better?'Higher':'Lower')+' values are not automatically equivalent to a patient-level absolute risk reduction. This comparison of reported outcomes does not itself yield an NNT.</p>';
  }
  function renderSingleOutcome(el){
    const value=Number(el.dataset.value);
    if(!Number.isFinite(value)||value<0||value>100)return;
    const label=String(el.dataset.outcomeLabel||'Reported outcome').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    const group=String(el.dataset.groupLabel||'Study population').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    const horizon=String(el.dataset.horizon||'Reported endpoint').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    const n=Math.round(value),dots=Array.from({length:100},(_,i)=>'<span style="display:block;aspect-ratio:1;border-radius:50%;background:'+(i<n?'#171717':'#deded8')+'"></span>').join('');
    el.className='ae-outcome-chart ae-single-outcome';
    el.innerHTML='<h3>'+label+'</h3><p class="ae-outcome-subtitle">'+horizon+' · single-arm / single-group result</p><div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><strong style="font-size:30px">'+value+'%</strong><span>'+group+'</span></div><div style="display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:5px;max-width:380px;margin-top:14px" role="img" aria-label="'+value+' of 100 represented patients">'+dots+'</div><p class="ae-outcome-footnote">Each dot represents one patient out of 100. This is a reported single-group rate, not a comparative treatment effect; no NNT is inferred.</p>';
  }
  function renderAutoOutcome(){
    if(document.querySelector('[data-outcome-visual], [data-outcome-single], [data-outcome-static]'))return;
    const host=document.querySelector('[data-absolute-effect]')||document.querySelector('main')||document.body;
    if(!host)return;
    const text=(document.querySelector('main')||document.body).innerText||'';
    const nnt=host.dataset?.nnt||'',nnh=host.dataset?.nnh||'';
    const quantifiedNnt=/^\s*\d+(?:\.\d+)?\s*$/.test(nnt),quantifiedNnh=/^\s*\d+(?:\.\d+)?\s*$/.test(nnh);
    if(quantifiedNnt||quantifiedNnh)return;
    // Prefer explicitly stated median survival comparisons; never infer fixed-time risks from medians.
    const med=text.match(/(?:median\s+(?:overall\s+survival|OS|progression[- ]free survival|PFS|disease[- ]free survival|DFS))[^.\n]{0,180}?([0-9]+(?:\.[0-9]+)?)\s*(?:months?\s*)?(?:vs\.?|versus)\s*([0-9]+(?:\.[0-9]+)?)\s*(months?|mos?)/i);
    if(med){
      const before=text.slice(Math.max(0,med.index-40),med.index+80);
      const label=(before.match(/median\s+([^:;,.]{2,65})/i)||[])[1]||'Median survival';
      const el=document.createElement('div');el.dataset.outcomeVisual='';el.dataset.outcomeLabel=label.trim();el.dataset.treatment=med[1];el.dataset.control=med[2];el.dataset.unit='months';el.dataset.horizon='Reported median outcome';el.dataset.treatmentLabel='Intervention';el.dataset.controlLabel='Comparator';el.dataset.direction='higher';
      host.insertAdjacentElement('afterend',el);renderOutcome(el);return;
    }
    // If a named endpoint has paired reported percentages, visualize those rates directly.
    const rates=text.match(/((?:[0-9]+[- ]year\s+)?(?:overall survival|OS|progression[- ]free survival|PFS|disease[- ]free survival|DFS|objective response(?: rate)?|overall response rate|objective response|patient preference|survival|pathological complete response|pathologic complete response|pCR|locoregional failure|grade\s*[≥>=]?\s*[0-4]\s+toxicity|late toxicity|treatment-related mortality|relapse(?: rate)?|local control))[^.\n]{0,120}?([0-9]+(?:\.[0-9]+)?)%[^.\n]{0,50}?(?:vs\.?|versus)[^.\n]{0,50}?([0-9]+(?:\.[0-9]+)?)%/i);
    if(rates){
      const el=document.createElement('div');el.dataset.outcomeVisual='';el.dataset.outcomeLabel=rates[1];el.dataset.treatment=rates[2];el.dataset.control=rates[3];el.dataset.unit='%';el.dataset.horizon='Reported endpoint rate';el.dataset.treatmentLabel='Intervention';el.dataset.controlLabel='Comparator';el.dataset.direction='higher';
      host.insertAdjacentElement('afterend',el);renderOutcome(el);return;
    }
    // If a trial has a reported hazard ratio and confidence interval, display an effect-size plot.
    const hr=text.match(/\bHR\s*[:=]?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:\(?\s*95%\s*CI\s*[:=]?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:[-–—,]|to)\s*([0-9]+(?:\.[0-9]+)?)\s*\)?)?/i);
    if(hr){
      const value=Number(hr[1]),lo=hr[2]?Number(hr[2]):null,hi=hr[3]?Number(hr[3]):null;
      const el=document.createElement('section');el.className='ae-outcome-chart';el.innerHTML='<h3>Reported relative treatment effect</h3><p class="ae-outcome-subtitle">Hazard ratio · effect-size view</p>';
      const axisMin=0.25,axisMax=2,scale=x=>Math.max(0,Math.min(100,(x-axisMin)/(axisMax-axisMin)*100));
      const left=lo!==null?scale(lo):scale(value),right=hi!==null?scale(hi):scale(value);
      el.innerHTML+='<div class="ae-hr-track"><div class="ae-hr-null" style="left:'+scale(1)+'%"></div><div class="ae-hr-ci" style="left:'+left+'%;width:'+Math.max(1,right-left)+'%"></div><div class="ae-hr-point" style="left:'+scale(value)+'%"></div></div><div class="ae-hr-axis"><span>0.25</span><span>HR 1.0 = no difference</span><span>2.0</span></div><div class="ae-outcome-difference"><div class="ae-outcome-stat"><strong>HR '+hr[1]+'</strong><span>'+(lo!==null?'95% CI '+hr[2]+'–'+hr[3]:'Confidence interval not found in page text')+'</span></div></div><p class="ae-outcome-footnote">This visual summarizes the reported relative effect only. It does not substitute for absolute survival rates or generate an NNT.</p>';
      host.insertAdjacentElement('afterend',el);return;
    }
    // Single-arm or cohort studies still deserve a source-reported visual; never invent a control group.
    const singleRate=text.match(/((?:[0-9]+[- ]year\s+)?(?:objective response rate|overall response rate|objective response|ORR|local control|survival|overall survival|OS|progression[- ]free survival|PFS|disease[- ]free survival|DFS|pathological complete response|pathologic complete response|pCR|patient preference|relapse rate|relapse|recurrence rate|recurrence|event-free survival|EFS))[^.\n]{0,100}?([0-9]+(?:\.[0-9]+)?)%/i);
    if(singleRate){
      const value=Number(singleRate[2]);
      if(value>=0&&value<=100){
        const el=document.createElement('div');el.dataset.outcomeVisual='';el.dataset.outcomeLabel=singleRate[1];el.dataset.value=String(value);el.dataset.groupLabel='Reported study group';el.dataset.horizon='Source-reported percentage';
        host.insertAdjacentElement('afterend',el);renderSingleOutcome(el);return;
      }
    }
    const eventCount=text.match(/(\d+)\s+(?:relapses|recurrences|events|responses)\s+(?:among|of)\s+(\d+)\s+(?:eligible\s+)?(?:patients|participants)?/i);
    if(eventCount&&Number(eventCount[2])>0){
      const value=Number((Number(eventCount[1])/Number(eventCount[2])*100).toFixed(1));
      const el=document.createElement('div');el.dataset.outcomeVisual='';el.dataset.outcomeLabel='Reported event proportion';el.dataset.value=String(value);el.dataset.groupLabel=eventCount[1]+' of '+eventCount[2]+' reported events';el.dataset.horizon='Source-reported count; percentage calculated from numerator / denominator';
      host.insertAdjacentElement('afterend',el);renderSingleOutcome(el);return;
    }
    // Do not let an abstract-only page silently appear complete when no supported endpoint was detected.
    const review=document.createElement('section');review.className='ae-outcome-chart ae-outcome-review';review.dataset.outcomeReview='manual';review.setAttribute('role','note');
    review.innerHTML='<h3>Outcome visual needs manual verification</h3><p class="ae-outcome-subtitle">No supported numeric endpoint was detected automatically. Review the primary source and add a source-reported outcome chart, a defensible NNT/NNH pictogram, or a note explaining why no numeric visualization is appropriate.</p>';
    host.insertAdjacentElement('afterend',review);
  }

  function addStudyDesignBadge(){
    const main=document.querySelector('main')||document.body;
    if(main.querySelector('[data-study-design-badge]'))return;
    const intro=(main.innerText||'').slice(0,2200);
    const explicitRetrospective=/(?:retrospective\\s+(?:study|cohort|analysis|comparison|series|review|database|observational\\s+study|registry(?:-based)?\\s+(?:study|analysis))|retrospectively\\s+(?:reviewed|analysed|analyzed|collected|evaluated|identified)|retrospective,\\s+(?:non-randomized|nonrandomized|single-centre|single-center|multicentre|multicenter))/i.test(intro);
    if(!explicitRetrospective)return;
    const badge=document.createElement('p');
    badge.dataset.studyDesignBadge='retrospective';
    badge.setAttribute('role','note');
    badge.textContent='Study design: Retrospective';
    badge.style.cssText='display:inline-block;margin:10px 0 0;padding:5px 10px;border:1px solid #d6c7a1;border-radius:6px;background:#fff8e7;color:#6b4d13;font-size:13px;font-weight:750;';
    const h1=main.querySelector('h1');
    if(h1)h1.insertAdjacentElement('afterend',badge);else main.insertBefore(badge,main.firstChild);
  }

  function init(){addStudyDesignBadge();document.querySelectorAll('[data-absolute-effect]').forEach(el=>render(el));document.querySelectorAll('[data-outcome-visual]').forEach(el=>renderOutcome(el));document.querySelectorAll('[data-outcome-single]').forEach(el=>renderSingleOutcome(el));renderAutoOutcome();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  window.AbsoluteEffect={render:render,renderOutcome:renderOutcome,init:init};
})();