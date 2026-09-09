/* The Absolute Effect — shared trial visual language. */
(function(){
  function pct(v){ return typeof v==='number' ? (Math.round(v*10)/10)+'%' : '—'; }
  function effectCard(title, benefit, nnt, harm, nnh){
    const b=typeof benefit==='number' ? benefit : null, h=typeof harm==='number' ? harm : null;
    const el=document.createElement('section'); el.className='ae-effect';
    el.innerHTML='<div class="ae-head"><div><div class="ae-kicker">Absolute Effect</div><h2>'+title+'</h2></div></div>'+
      '<div class="ae-grid"><div class="ae-panel ae-benefit"><div class="ae-label">Benefit</div><div class="ae-number">'+(b===null?'Not quantifiable':(Math.abs(b)+' percentage points'))+'</div><div class="ae-copy">'+(nnt&&nnt!=='Not applicable; non-inferiority trial'?'NNT '+nnt:'NNT not appropriately calculable')+'</div></div>'+
      '<div class="ae-panel ae-harm"><div class="ae-label">Harm</div><div class="ae-number">'+(h===null?'Not quantifiable':(Math.abs(h)+' percentage points'))+'</div><div class="ae-copy">'+(nnh&&nnh!=='Not quantifiable from the primary endpoint'?'NNH '+nnh:'NNH not appropriately calculable')+'</div></div></div>'+
      '<div class="ae-100"><div class="ae-label">100-patient view</div><div class="ae-dots">'+Array.from({length:100},(_,i)=>'<span class="ae-dot '+(b!==null&&i<Math.round(Math.abs(b))?'benefit ':'')+(h!==null&&i>=Math.round(Math.abs(b||0))&&i<Math.round(Math.abs(b||0))+Math.round(Math.abs(h))?'harm':'')+'"></span>').join('')+'</div><p>Each dot represents one patient. Benefit and harm are shown separately from the reported endpoint and time horizon.</p></div>';
    return el;
  }
  window.AbsoluteEffect={effectCard:effectCard,pct:pct};
})();
