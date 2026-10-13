/* Canonical trial-page enhancement layer. Preserves source text and adds patient-level visuals. */
(function(){
function esc(s){return String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function pct(s){const m=String(s||'').match(/(?:absolute (?:benefit|difference)|difference)\s*(?:≈|=|of|:)?\s*([+-]?\d+(?:\.\d+)?)\s*(?:percentage points|%)/i);return m?Math.abs(Number(m[1])):null}
function nnt(s,k){const re=new RegExp(k+'\\s*(?:≈|=|:)\\s*(\\d+(?:\\.\\d+)?)','i'),m=String(s||'').match(re);return m?Number(m[1]):null}
function makeDots(v){let h='';const n=Math.max(0,Math.min(100,Math.round(v||0)));for(let i=0;i<100;i++)h+='<span class="ae-patient '+(i<n?'on':'')+'"></span>';return h}
function enhance(){
 const body=document.body;if(!body||document.querySelector('.ae-template-root'))return;
 const oldMain=document.querySelector('main'); const title=(document.querySelector('h1')||{}).textContent?.trim()||document.title.split('—')[0].trim();
 const h1=document.querySelector('h1'); const firstP=document.querySelector('body>p,main>p');
 const question=firstP?.textContent?.replace(/^Clinical question:\s*/i,'').trim()||'';
 const text=body.innerText||'';
 const benefit=pct(text),NNT=nnt(text,'NNT'),NNH=nnt(text,'NNH');
 const root=document.createElement('main');root.className='ae-template-root';
 root.innerHTML='<a class="ae-back" href="/">← Back to The Absolute Effect</a><section class="ae-hero"><div class="ae-eyebrow">Oncology evidence atlas</div><h1>'+esc(title)+'</h1><p class="ae-question">'+esc(question)+'</p></section>';
 const glance=document.createElement('section');glance.className='ae-grid';
 const bodyParas=[...document.querySelectorAll('p')].slice(0,3).map(x=>x.textContent);
 let design=(bodyParas.find(x=>/Design:/i.test(x))||'').replace(/^Design:\s*/i,'');
 const n=(design.match(/(?:;|\b)([\d,]+)\s+(?:men|women|patients|participants|subjects)/i)||[])[1]||'—';
 glance.innerHTML='<div class="ae-stat"><div class="ae-label">Population</div><div class="ae-value">'+esc(n)+'</div></div><div class="ae-stat"><div class="ae-label">Evidence</div><div class="ae-value">Randomized comparative evidence</div></div><div class="ae-stat"><div class="ae-label">Primary metric</div><div class="ae-value">'+(benefit!==null?benefit+' percentage-point absolute difference':'See endpoint results')+'</div></div><div class="ae-stat"><div class="ae-label">Patient measure</div><div class="ae-value">'+(NNT?'NNT '+NNT:(NNH?'NNH '+NNH:'Not quantifiable'))+'</div></div>';
 const currency=document.createElement('aside');currency.className='ae-card ae-clinical-currency';currency.setAttribute('role','note');currency.innerHTML='<div class="ae-eyebrow">Clinical currency</div><p>This page summarizes evidence from a specific trial or study. Before applying it to current care, check subsequent follow-up, newer practice-changing studies and current disease-specific guidelines. Keep this context separate from the original randomized results.</p>';root.appendChild(currency);
 root.appendChild(glance);
 if(benefit!==null||NNT!==null||NNH!==null){
   const sec=document.createElement('section');sec.className='ae-card';
   sec.innerHTML='<div class="ae-eyebrow">Absolute effect · patient view</div><h2>What changes for 100 patients?</h2>';
   if(benefit!==null)sec.innerHTML+='<div class="ae-metric"><div class="ae-label">Absolute effect</div><div class="ae-number">'+benefit+' percentage points</div><div class="ae-patients">'+makeDots(benefit)+'</div><p class="ae-note">'+benefit+' of 100 patients represent the observed absolute difference at the stated endpoint/time horizon.</p></div>';
   if(NNT!==null)sec.innerHTML+='<div class="ae-metric" style="margin-top:14px"><div class="ae-label">NNT</div><div class="ae-number">'+NNT+'</div><p>Approximately 1 additional patient benefits for every '+NNT+' patients treated, at the endpoint/time horizon reported on this page.</p><div class="ae-nnt">'+Array.from({length:Math.min(NNT,100)},(_,i)=>'<span'+(i===0?'':'')+'></span>').join('')+'</div></div>';
   if(NNH!==null)sec.innerHTML+='<div class="ae-metric" style="margin-top:14px"><div class="ae-label">NNH</div><div class="ae-number">'+NNH+'</div><p>Approximately 1 additional harm occurs for every '+NNH+' patients treated, at the endpoint/time horizon reported on this page.</p></div>';
   root.appendChild(sec);
 }
 // New rule: if neither NNT nor NNH is defensibly quantifiable, visualize a reported endpoint instead.
 if(NNT===null&&NNH===null&&!document.querySelector('[data-outcome-visual]')){
   const visualText=(oldMain||body).innerText||text;
   const median=visualText.match(/(?:median\\s+(?:overall\\s+survival|OS|progression[- ]free survival|PFS|disease[- ]free survival|DFS))[^.\\n]{0,180}?([0-9]+(?:\\.[0-9]+)?)\\s*(?:months?\\s*)?(?:vs\\.?|versus)\\s*([0-9]+(?:\\.[0-9]+)?)\\s*(months?|mos?)/i);
   const rates=visualText.match(/((?:overall survival|OS|progression-free survival|PFS|disease-free survival|DFS|objective response rate|pCR))[^.\n]{0,100}?([0-9]+(?:\.[0-9]+)?)%\s*(?:vs\.?|versus)\s*([0-9]+(?:\.[0-9]+)?)%/i);
   const hr=visualText.match(/\\bHR\\s*[:=]?\\s*([0-9]+(?:\\.[0-9]+)?)\\s*(?:\\(?\\s*95%\\s*CI\\s*[:=]?\\s*([0-9]+(?:\\.[0-9]+)?)\\s*(?:[-–—,]|to)\\s*([0-9]+(?:\\.[0-9]+)?)\\s*\\)?)?/i);
   if(median){
     const v=document.createElement('section');v.className='ae-card ae-outcome-visual';
     const a=Number(median[1]),b=Number(median[2]),max=Math.max(a,b);
     v.innerHTML='<div class="ae-eyebrow">Reported outcome · visual comparison</div><h2>Median survival</h2><p class="ae-note">Reported medians; this is not a fixed-time absolute risk estimate.</p><div class="ae-outcome-row"><strong>Intervention</strong><div class="ae-outcome-track"><div class="ae-outcome-fill treatment" style="width:'+(a/max*100)+'%"></div></div><b>'+a+' months</b></div><div class="ae-outcome-row"><strong>Comparator</strong><div class="ae-outcome-track"><div class="ae-outcome-fill" style="width:'+(b/max*100)+'%"></div></div><b>'+b+' months</b></div><p class="ae-note">Difference between reported medians: '+Math.abs(a-b).toFixed(1)+' months. Do not derive NNT from median survival.</p>';
     root.appendChild(v);
   } else if(rates){
     const v=document.createElement('section');v.className='ae-card ae-outcome-visual';
     const a=Number(rates[2]),b=Number(rates[3]),max=Math.max(a,b);
     v.innerHTML='<div class="ae-eyebrow">Reported outcome · absolute rates</div><h2>'+esc(rates[1])+'</h2><p class="ae-note">Source-reported percentages; not converted into an NNT.</p><div class="ae-outcome-row"><strong>Intervention</strong><div class="ae-outcome-track"><div class="ae-outcome-fill treatment" style="width:'+(a/max*100)+'%"></div></div><b>'+a+'%</b></div><div class="ae-outcome-row"><strong>Comparator</strong><div class="ae-outcome-track"><div class="ae-outcome-fill" style="width:'+(b/max*100)+'%"></div></div><b>'+b+'%</b></div><p class="ae-note">Absolute difference between reported rates: '+Math.abs(a-b).toFixed(1)+' percentage points. Confirm endpoint and time horizon against the primary source.</p>';
     root.appendChild(v);
   } else if(hr){
     const v=document.createElement('section');v.className='ae-card ae-outcome-visual';
     v.innerHTML='<div class="ae-eyebrow">Reported outcome · relative effect</div><h2>Hazard ratio</h2><p class="ae-number">HR '+hr[1]+'</p><p class="ae-note">'+(hr[2]?'95% CI '+hr[2]+'–'+hr[3]:'Confidence interval not identified in page text')+'</p><p class="ae-note">Relative-effect visualization only; this does not substitute for absolute survival rates or generate an NNT.</p>';
     root.appendChild(v);
   } else {
     const v=document.createElement('section');v.className='ae-card ae-outcome-visual ae-outcome-review';v.setAttribute('role','note');
     v.innerHTML='<div class="ae-eyebrow">Outcome visualization check</div><h2>Manual review required</h2><p class="ae-note">No supported numeric endpoint was detected automatically. Review the primary source and add a source-reported outcome chart, a defensible NNT/NNH pictogram, or a note explaining why no numeric visualization is appropriate.</p>';
     root.appendChild(v);
   }
 }
 const source=oldMain||body;
 const content=document.createElement('section');content.className='ae-card ae-section';
 [...source.children].forEach(el=>{if(el.tagName==='H1')return;if(el.tagName==='SCRIPT')return;content.appendChild(el.cloneNode(true));});
 root.appendChild(content);body.innerHTML='';body.appendChild(root);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance);else enhance();
})();