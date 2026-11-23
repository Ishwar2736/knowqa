const $=s=>document.querySelector(s),H=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
let kb=null,last=null,cur='animals';
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>show(b.dataset.t));
function show(t){document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.t==t));document.querySelectorAll('section').forEach(s=>s.classList.toggle('on',s.id==t))}
for(const [id,s] of Object.entries(SAMPLES))$('#sample').add(new Option(s.title,id));
function pick(id){cur=id;$('#doc').value=SAMPLES[id].text;$('#evjson').value=JSON.stringify(SAMPLES[id].eval,null,1);buildKB()}
$('#sample').onchange=e=>pick(e.target.value);
$('#file').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{let t=r.result;if(/\.csv$/i.test(f.name))t=KnowQA.csv2cnl(t);$('#doc').value=t;$('#evjson').value='[]';buildKB()};r.onerror=()=>{$('#errs').innerHTML='<div class="err">Could not read this file. Try a UTF-8 encoded .txt, .md, or .csv file.</div>'};r.readAsText(f)};
$('#build').onclick=buildKB;
function buildKB(){kb=KnowQA.build($('#doc').value);renderKB();renderChips();$('#out').innerHTML=''}
function renderKB(){const st=[['Facts',kb.facts.length],['Stated',kb.facts.filter(f=>f.how.t=='stated').length],['Inferred',kb.facts.filter(f=>f.how.t!='stated').length],['Rules',kb.rules.length],['Entities',kb.ents.size],['Relations',kb.preds.size]];
 $('#stats').innerHTML=st.map(([a,b])=>`<div class="stat"><b>${b}</b>${a}</div>`).join('');
 $('#errs').innerHTML=kb.errors.length?`<h3>Parse warnings (${kb.errors.length})</h3><p class="mut">TXT/MD files are read as text, but only the controlled syntax in “Design &amp; Syntax” becomes knowledge. Write one supported fact or rule per line; ordinary prose is not interpreted.</p>`+kb.errors.map(e=>`<div class="err">${H(e)}</div>`).join(''):kb.facts.length?'<p class="mut">All lines parsed successfully.</p>':'<p class="err">No facts were found. Add facts in the controlled syntax in “Design &amp; Syntax” (for example: <code>Bird can fly.</code>).</p>';
 $('#rules').innerHTML=(kb.closed?'<p><span class="badge">closed-world</span></p>':'<p><span class="badge">open-world</span></p>')+
  Object.entries(kb.rel).map(([r,o])=>`<p><code>${H(r)}</code> ${o.tr?'transitive ':''}${o.sy?'symmetric ':''}${o.inv?'inverse: '+H(o.inv):''}</p>`).join('')+
  Object.entries(kb.scale).map(([w,o])=>`<p><code>${H(w)}</code> → ${o.d>0?'max':'min'} of <i>${H(o.a)}</i></p>`).join('')+
  kb.rules.map(r=>`<p>⚙ ${H(r.text)} <span class="mut">(line ${r.ln})</span></p>`).join('');
 filt()}
function filt(){const f=$('#flt').value.toLowerCase(),D=x=>kb.disp[x]||x;
 $('#ftab').innerHTML='<tr><th>#</th><th>Subject</th><th>Relation</th><th>Object</th><th>Source</th></tr>'+kb.facts.filter(x=>!f||(D(x.s)+x.p+D(x.o)).toLowerCase().includes(f)).map(x=>
  `<tr><td>${x.id+1}</td><td>${H(D(x.s))}</td><td>${x.neg?'<b class="no">NOT</b> ':''}${H(x.p)}</td><td>${H(D(x.o))}</td><td><span class="badge">${x.how.t=='stated'?'line '+x.how.ln:'inferred'}</span></td></tr>`).join('')}
$('#flt').oninput=filt;
function renderChips(){$('#chips').innerHTML=(SAMPLES[cur]?SAMPLES[cur].eval:[]).slice(0,10).map(t=>`<span class="chip">${H(t.q)}</span>`).join('');
 document.querySelectorAll('.chip').forEach(c=>c.onclick=()=>{$('#q').value=c.textContent;ask()})}
function ask(){const q=$('#q').value.trim();if(!q||!kb)return;const r=KnowQA.ask(kb,q);
 const cls=r.items[0]=='yes'?'yes':r.items[0]=='no'?'no':r.items[0]=='unknown'?'unk':'';
 $('#out').insertAdjacentHTML('afterbegin',`<div class="card"><div class="mut">Q: ${H(q)}</div><div class="ans ${cls}">${H(r.text)}</div>
 <span class="badge">${H(r.status)}</span> <span class="mut">interpreted as: ${H(r.interp)}</span>
 ${r.proof.length?`<details open><summary>Reasoning / proof</summary><pre>${H(r.proof.join('\n'))}</pre></details>`:''}</div>`)}
$('#go').onclick=ask;$('#q').onkeydown=e=>{if(e.key=='Enter')ask()};
$('#run').onclick=()=>{let t;try{t=JSON.parse($('#evjson').value)}catch(e){$('#evout').innerHTML='<div class="card err">Invalid JSON: '+H(e.message)+'</div>';return}
 if(!kb)buildKB();last=KnowQA.evaluate(kb,t);const p=x=>(x*100).toFixed(1)+'%',r=last;
 $('#evout').innerHTML=`<div class="card"><div class="row">${[['Accuracy (exact)',p(r.acc)],['Precision',p(r.P)],['Recall',p(r.R)],['F1',p(r.F)],['Coverage',p(r.coverage)],['Abstention acc.',r.abstAcc==null?'n/a':p(r.abstAcc)],['Avg time',r.ms.toFixed(2)+' ms']].map(([a,b])=>`<div class="stat"><b>${b}</b>${a}</div>`).join('')}</div>
 <div class="bar" style="margin-top:12px"><i style="width:${r.acc*100}%"></i></div></div><div class="card"><div class="scroll" style="max-height:none"><table><tr><th>Question</th><th>Expected</th><th>Got</th><th>Type</th><th>Result</th></tr>${r.rows.map(x=>
 `<tr><td>${H(x.q)}</td><td>${H(x.exp.join(', '))}</td><td>${H(x.got.join(', '))}</td><td class="mut">${H(x.interp)}</td><td class="${x.exact?'yes':'no'}">${x.exact?'✔ pass':'✘ fail (F1 '+x.F.toFixed(2)+')'}</td></tr>`).join('')}</table></div></div>`};
$('#dl').onclick=()=>{if(!last)return;const c='question,expected,got,exact,precision,recall,f1,ms\n'+last.rows.map(x=>[x.q,x.exp.join('|'),x.got.join('|'),x.exact,x.P.toFixed(3),x.R.toFixed(3),x.F.toFixed(3),x.ms.toFixed(3)].map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([c],{type:'text/csv'}));a.download='evaluation_results.csv';a.click()};
pick('animals');
