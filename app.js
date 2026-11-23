const $=s=>document.querySelector(s),H=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
let kb=null,last=null,cur='animals';
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>show(b.dataset.t));
function show(t){document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.t==t));document.querySelectorAll('section').forEach(s=>s.classList.toggle('on',s.id==t))}
for(const [id,s] of Object.entries(SAMPLES))$('#sample').add(new Option(s.title,id));
function pick(id){cur=id;$('#doc').value=SAMPLES[id].text;$('#evjson').value=JSON.stringify(SAMPLES[id].eval,null,1);buildKB()}
$('#sample').onchange=e=>pick(e.target.value);
$('#file').onchange=async e=>{
 const f=e.target.files[0];if(!f)return;
 $('#errs').innerHTML='<p class="mut">Reading '+H(f.name)+'…</p>';
 try{
  let t='';
  const ext=(f.name.match(/\.([^.]+)$/)||['',''])[1].toLowerCase();
  if(ext=='pdf'){
   if(!window.pdfjsLib)throw new Error('The PDF reader library did not load.');
    pdfjsLib.GlobalWorkerOptions.workerSrc='./vendor/pdf.worker.min.js';
   const pdf=await pdfjsLib.getDocument({data:await f.arrayBuffer()}).promise;
   const pages=[];
    for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i),content=await page.getTextContent();
     let line='',lastY=null,pageText=[];
     for(const item of content.items){
      const y=item.transform&&item.transform[5];
      if(lastY!==null&&Math.abs(y-lastY)>2){pageText.push(line.trim());line='';}
      line+=(line?' ':'')+item.str;lastY=y;
     }
     if(line.trim())pageText.push(line.trim());
     pages.push(pageText.join('\n'));
    }
    t=pages.join('\n');
  }else if(ext=='docx'){
   if(!window.mammoth)throw new Error('The DOCX reader library did not load.');
   const result=await mammoth.extractRawText({arrayBuffer:await f.arrayBuffer()});t=result.value;
  }else if(ext=='doc'){
   const data=await f.arrayBuffer(),bytes=new Uint8Array(data);
   t=new TextDecoder('utf-8',{fatal:false}).decode(bytes);
   if(/<html|<body|<p/i.test(t)||/\{\\rtf/i.test(t)){
    t=t.replace(/<[^>]*>/g,' ').replace(/\{\\rtf1[\s\S]*?\}/g,'');
   }else{
    t=t.replace(/[^\x09\x0A\x0D\x20-\x7E]/g,' ').replace(/\s{2,}/g,' ').trim();
   }
   if(!t.trim())throw new Error('This legacy DOC file is binary and could not be extracted by the browser. Save it as DOCX or PDF and upload it again.');
  }else{
   t=await f.text();
   if(ext=='csv')t=KnowQA.csv2cnl(t);
  }
  t=t.replace(/\u00a0/g,' ').replace(/\r/g,'').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
  if(!t)throw new Error('No readable text was found in this file.');
  $('#doc').value=t;$('#evjson').value='[]';buildKB();
 }catch(err){
  $('#errs').innerHTML='<div class="err">Could not read '+H(f.name)+': '+H(err.message||String(err))+'</div>';
 }
};
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
