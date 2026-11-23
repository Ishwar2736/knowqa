/* KnowQA engine: Knowledge Base construction + rule inference + question answering. No NLP, no RAG. */
(function(g){'use strict';
const norm=x=>String(x).trim().replace(/\s+/g,' ').replace(/[.?!]+$/,'');
const k=x=>norm(x).toLowerCase().replace(/^(the|a|an) /,'');
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const num=s=>parseFloat(String(s).replace(/,/g,''));
const now=()=>typeof performance!='undefined'?performance.now():Date.now();
const editDistance=(a,b)=>{if(Math.abs(a.length-b.length)>1)return 2;let i=0,j=0,d=0;
 while(i<a.length&&j<b.length){if(a[i]==b[j]){i++;j++;continue}if(++d>1)return d;
  if(a.length>b.length)i++;else if(b.length>a.length)j++;else{i++;j++}}
 return d+(i<a.length||j<b.length?1:0)};

/* ---------- 1. Document processing -> Knowledge Base (controlled-syntax template matching) ---------- */
function build(text){
 const kb={facts:[],rules:[],rel:{},surf:{},scale:{},disp:{},errors:[],closed:false,keys:new Set(),ents:new Set(),preds:new Set(),cls:{},par:{}};
 kb.sourceText=String(text||'');
 kb.sentences=kb.sourceText.split(/\r?\n|(?<=[.!?])\s+/).map(x=>norm(x)).filter(Boolean);
 const D=x=>{const v=k(x);if(!(v in kb.disp))kb.disp[v]=norm(x).replace(/^(the|a|an) /i,'');return v};
 const T=(s,p,o,n)=>({s:D(s),p:p.toLowerCase().trim(),o:D(o),neg:n?1:0});
 const add=(f,how)=>{const key=[f.s,f.p,f.o,f.neg].join('|');if(kb.keys.has(key))return false;kb.keys.add(key);f.id=kb.facts.length;f.how=how;kb.facts.push(f);return true};
 kb.add=add;
 const lines=String(text).split(/\r?\n/);
 // pass 1: directives (@closed, @relation, @scale)
 lines.forEach((raw,i)=>{const s=raw.trim();if(s[0]!='@')return;
  const [h,...o]=s.slice(1).split('|').map(x=>x.trim());const sp=h.indexOf(' ');
  const name=h.slice(0,sp<0?h.length:sp).toLowerCase(),arg=sp<0?'':h.slice(sp+1).trim().toLowerCase();
  if(name=='closed')kb.closed=true;
  else if(name=='relation'&&arg){const r=kb.rel[arg]=kb.rel[arg]||{tr:0,sy:0,inv:null};kb.surf[arg]=arg;
   for(const x of o){const y=x.toLowerCase();
    if(y=='transitive')r.tr=1;else if(y=='symmetric')r.sy=1;
    else if(y.startsWith('inverse:')){const iv=y.slice(8).trim();r.inv=iv;kb.rel[iv]=kb.rel[iv]||{tr:r.tr,sy:0,inv:arg};kb.surf[iv]=iv}
    else if(y.startsWith('also:'))y.slice(5).split(',').forEach(a=>kb.surf[a.trim()]=arg)}}
  else if(name=='scale'&&arg)o.forEach((grp,j)=>grp.toLowerCase().split(',').forEach(w=>kb.scale[w.trim()]={a:arg,d:j?-1:1}));
  else kb.errors.push(`Line ${i+1}: unknown directive "${s}"`)});
 kb.sl=Object.keys(kb.surf).sort((a,b)=>b.length-a.length);
 // sentence templates -> triples
 const atom=str=>{ str=norm(str).replace(/^(every|all|each) /i,'');let m;
 if(m=str.match(/^([^|]+)\|\s*([^|]+)\|\s*([^|]+)$/)){let r=m[2].trim().toLowerCase().replace(/_/g,' ');
  if(r=='is a')r='is a';
  kb.rel[r]=kb.rel[r]||{tr:0,sy:0,inv:null};kb.surf[r]=r;
  return T(m[1],r,m[3])}
 if(m=str.match(/^([^:]+):\s*(.+)$/)){return T(m[1],'has',m[2])}
 if(m=str.match(/^\d+\.\s*(.+)$/)){return T('engineering design process','has step',m[1])}
 if(m=str.match(/^(?:it|this|they)\s+(.+)$/i)){return T('engineering','description',m[1])}
 if(m=str.match(/^(.+?) (?:focuses|concentrates) on (.+)$/i))return T(m[1],'focuses on',m[2]);
 if(m=str.match(/^(.+?) (?:applies|uses) (.+?) to (.+)$/i))return T(m[1],'applies',m[3]);
 if(m=str.match(/^(.+?) deals with (.+)$/i))return T(m[1],'deals with',m[2]);
 if(m=str.match(/^(.+?) integrates (.+)$/i))return T(m[1],'integrates',m[2]);
 if(m=str.match(/^(.+?) (identifies|defines|requires) (.+)$/i))return T(m[1],m[2].toLowerCase(),m[3]);
  if(m=str.match(/^(.+?) (?:is|are) not (?:a|an) (.+)$/i))return T(m[1],'is a',m[2],1);
  if(m=str.match(/^(.+?) can(not|'t)? (.+)$/i))return T(m[1],'can',m[3],m[2]);
   if(m=str.match(/^(.+?) (?:includes?|contains?) (.+)$/i))return T(m[1],'includes',m[2]);
   if(m=str.match(/^(.+?) (?:uses?|utilizes?) (.+)$/i))return T(m[1],'uses',m[2]);
   if(m=str.match(/^(.+?) (?:helps?|assists?) (.+)$/i))return T(m[1],'helps',m[2]);
   if(m=str.match(/^(.+?) (?:combines?|integrates?) (.+?)(?: (?:with|and) (.+))$/i))return T(m[1],m[2]? 'combines':'integrates',m[3]||m[2]);
   if(m=str.match(/^(.+?) (?:focuses|concentrates) on (.+)$/i))return T(m[1],'focuses on',m[2]);
   if(m=str.match(/^(.+?) deals with (.+)$/i))return T(m[1],'deals with',m[2]);
   if(m=str.match(/^(.+?) applies (.+?) (?:to|for) (.+)$/i))return T(m[1],'applies',m[3]);
   if(m=str.match(/^(.+?) (?:solves?|designs?|builds?|innovates?|maintains?) (.+)$/i))return T(m[1],'solves',m[2]);
   if(m=str.match(/^(.+?) (?:is|are) the (.+?) of (.+)$/i)){
    if(/^(capital|diameter|population|area|headquarters)$/i.test(m[2]))return T(m[3],m[2],m[1]);
    return T(m[1],m[2],m[3])}
  const low=str.toLowerCase();
  for(const sf of kb.sl){const i=low.indexOf(' '+sf+' ');if(i>0)return T(str.slice(0,i),kb.surf[sf],str.slice(i+sf.length+2))}
  if(m=str.match(/^the (.+?) of (.+?) (?:is|are) (.+)$/i))return T(m[2],m[1],m[3]);
  if(m=str.match(/^(.+?) (?:is|are) the (.+?) of (.+)$/i))return T(m[3],m[2],m[1]);
  if(m=str.match(/^(.+?) (?:has|have) (?:a|an|the) (.+?) of (.+)$/i))return T(m[1],m[2],m[3]);
  if(m=str.match(/^(.+?) (?:has|have) (.+)$/i))return T(m[1],'has',m[2]);
  if(m=str.match(/^(.+?) (?:is|are) (?:a|an) (.+)$/i))return T(m[1],'is a',m[2]);
  if(m=str.match(/^(.+?)(?:\s+)(?:bridges?|creates?|improves?|supports?|develops?|uses?|applies?|deals?|integrates?)\s+(.+)$/i))return T(m[1],m[2]?'description':'has',m[2]);
  if(str.length>0)return T('document','contains',str);
  return null};
 lines.forEach((raw,i)=>{const s=raw.trim();if(!s||s[0]=='#'||s[0]=='@')return;
  for(const sent of s.split(/(?<!\d)\.\s+/).filter(Boolean)){let m;
   if(m=sent.match(/^if (.+) then (.+)$/i)){const cs=m[1].split(/ and /i).map(atom),c=atom(m[2]);
    if(c&&cs.every(Boolean))kb.rules.push({conds:cs,c,text:norm(sent),ln:i+1});else kb.errors.push(`Line ${i+1}: cannot parse rule "${norm(sent)}"`)}
   else{const f=atom(sent);if(f)add(f,{t:'stated',ln:i+1});else kb.errors.push(`Line ${i+1}: sentence not in supported syntax: "${norm(sent)}"`)}}});
 infer(kb);
 for(const f of kb.facts){kb.ents.add(f.s);kb.ents.add(f.o);kb.preds.add(f.p);
  if(f.p=='is a'&&!f.neg){const c=f.o;[c,c+'s',c+'es',c.replace(/y$/,'ies')].forEach(x=>{if(!kb.cls[x])kb.cls[x]=c});
   if(!(f.how.r||'').startsWith('transitivity'))(kb.par[f.s]=kb.par[f.s]||[]).push(f.o)}}
 return kb}

/* ---------- 2. Inference: forward chaining to a fixpoint ---------- */
function infer(kb){
 const match=(c,f,b)=>{if(c.p!=f.p||c.neg!=f.neg)return null;const nb={...b};
  for(const [x,y] of [[c.s,f.s],[c.o,f.o]]){if(x[0]=='?'){if(nb[x]===undefined)nb[x]=y;else if(nb[x]!=y)return null}else if(x!=y)return null}return nb};
 const sub=(x,b)=>x[0]=='?'&&b[x]!==undefined?b[x]:x;
 let ch=true,n=0;
 while(ch&&n++<50){ch=false;const F=kb.facts.filter(f=>!f.neg);
  const tr=['is a',...Object.keys(kb.rel).filter(r=>kb.rel[r].tr)];
  for(const p of tr){const E=F.filter(f=>f.p==p);
   for(const a of E)for(const b of E)if(a.o==b.s&&a.s!=b.o&&kb.add({s:a.s,p,o:b.o,neg:0},{t:'rule',r:`transitivity of "${p}"`,pr:[a.id,b.id]}))ch=true}
  for(const f of F){const r=kb.rel[f.p];if(!r)continue;
   if(r.sy&&kb.add({s:f.o,p:f.p,o:f.s,neg:0},{t:'rule',r:`symmetry of "${f.p}"`,pr:[f.id]}))ch=true;
   if(r.inv&&kb.add({s:f.o,p:r.inv,o:f.s,neg:0},{t:'rule',r:`inverse of "${f.p}"`,pr:[f.id]}))ch=true}
  for(const r of kb.rules){let B=[{b:{},pr:[]}];
   for(const c of r.conds){const nB=[];for(const e of B)for(const f of kb.facts){const nb=match(c,f,e.b);if(nb)nB.push({b:nb,pr:[...e.pr,f.id]})}B=nB}
   for(const e of B){const c=r.c,g={s:sub(c.s,e.b),p:c.p,o:sub(c.o,e.b),neg:c.neg};if(g.s[0]=='?'||g.o[0]=='?')continue;
    if(kb.add(g,{t:'rule',r:`rule "${r.text}"`,pr:e.pr}))ch=true}}}}

/* ---------- 3. Search / reasoning helpers ---------- */
const Dp=(kb,x)=>kb.disp[x]||x;
const anc=(kb,x)=>{const out=[],seen=new Set([x]);let fr=[x];while(fr.length){const nx=[];for(const a of fr)for(const b of kb.par[a]||[])if(!seen.has(b)){seen.add(b);out.push(b);nx.push(b)}fr=nx}return out};
const insts=(kb,c)=>kb.facts.filter(f=>f.p=='is a'&&!f.neg&&f.o==c).map(f=>f.s);
const trip=(kb,f)=>`${f.neg?'NOT ':''}(${Dp(kb,f.s)}, ${f.p}, ${Dp(kb,f.o)})`;
const say=(kb,f)=>{const s=Dp(kb,f.s),o=Dp(kb,f.o);
 if(f.p=='is a')return `${s} ${f.neg?'is not':'is'} a ${o}`;if(f.p=='can')return `${s} ${f.neg?'cannot':'can'} ${o}`;
 if(f.p=='has')return `${s} ${f.neg?'does not have':'has'} ${o}`;
 if(['focuses on','concentrates on','deals with','describes','includes','uses','helps','applies','solves','is'].includes(f.p))return `${s} ${f.p} ${o}`;
 if(kb.surf[f.p])return `${s} ${f.neg?'does not ':''}${f.p} ${o}`;
 return `the ${f.p} of ${s} is ${o}`};
const why=(kb,f,d=0)=>{const pad='  '.repeat(d),h=f.how;
 if(h.t=='stated')return [`${pad}${trip(kb,f)}  [stated, line ${h.ln}]`];
 return [`${pad}${trip(kb,f)}  [derived by ${h.r}]`,...(d<6?h.pr.flatMap(i=>why(kb,kb.facts[i],d+1)):[])]};
// lookup with default inheritance: nearest ancestor in the is-a hierarchy that has an answer wins (exceptions override)
function lookup(kb,s,p,o){const m=x=>kb.facts.filter(f=>f.s==x&&f.p==p&&(o==null||f.o==o));
 let r=m(s);if(r.length||p=='is a')return {fs:r,inh:null};
 for(const a of anc(kb,s)){r=m(a);if(r.length)return {fs:r,inh:a}}return {fs:[],inh:null}}

/* ---------- 4. Question processing (rule-based question templates) + answer generation ---------- */
function ask(kb,q0){
 let q=norm(q0).toLowerCase().replace(/[’]/g,"'"),I='unrecognised',m;
 if(/^why /.test(q))q=q.slice(4);
 const R=(text,items,status,proof)=>({text,items:items.map(x=>String(x).toLowerCase()),status,proof:proof||[],interp:I});
 const UNK=(t,st)=>R(t||'Unknown: the knowledge base neither states nor implies the answer.',['unknown'],st||'Unknown');
 const st=(f,inh)=>inh?'Inherited':f.how.t=='stated'?'Stated':'Inferred';
 const prf=(f,inh,s)=>{const L=[];if(inh){const e=kb.facts.find(x=>x.s==s&&x.p=='is a'&&x.o==inh&&!x.neg);
  L.push(`Default inheritance: ${Dp(kb,s)} inherits from its nearest ancestor "${Dp(kb,inh)}" that has an answer`);if(e)L.push(...why(kb,e,1))}return [...L,...why(kb,f,inh?1:0)]};
 const klass=x=>kb.cls[k(x)]||null,isa=(x,c)=>kb.facts.some(f=>f.s==x&&f.p=='is a'&&f.o==c&&!f.neg);
 const bool=(s,p,o)=>{const L=lookup(kb,s,p,o);
  if(L.fs.length){const f=L.fs[0];return R(`${f.neg?'No':'Yes'}: ${say(kb,f)}.`,[f.neg?'no':'yes'],st(f,L.inh),prf(f,L.inh,s))}
  if(kb.closed)return R('No: nothing in the knowledge base supports this (closed-world assumption).',['no'],'Closed-world',[`No fact (${s}, ${p}, ${o}) is stated or derivable.`]);
  return UNK()};
 const attr=(s,p)=>{if(!kb.ents.has(s)||!kb.preds.has(p))return UNK(`Unknown: "${p}" of "${s}" is not in the knowledge base.`);
  const L=lookup(kb,s,p),pos=L.fs.filter(f=>!f.neg);if(!pos.length)return UNK();
  return R(`The ${p} of ${Dp(kb,s)} is ${pos.map(f=>Dp(kb,f.o)).join(', ')}.`,pos.map(f=>f.o),st(pos[0],L.inh),pos.flatMap(f=>prf(f,L.inh,s)))};
 const lst=(label,keys,proof,status)=>R(keys.length?`${label}: ${keys.map(x=>Dp(kb,x)).join(', ')}.`:`No matching entities found for ${label}.`,keys,status||'Inferred',proof);
 const relS=(rel,y,c)=>{if(!kb.ents.has(y))return UNK(`Unknown entity "${y}".`);
  const fs=kb.facts.filter(f=>f.p==rel&&f.o==y&&!f.neg&&(!c||isa(f.s,c)));return lst(`${c?Dp(kb,c)+'s that ':'Things that '}${rel} ${Dp(kb,y)}`,fs.map(f=>f.s),fs.flatMap(f=>why(kb,f)),'Stated/Inferred')};
 const relO=(rel,x)=>{if(!kb.ents.has(x))return UNK(`Unknown entity "${x}".`);
  const fs=kb.facts.filter(f=>f.p==rel&&f.s==x&&!f.neg);return lst(`${Dp(kb,x)} ${rel}`,fs.map(f=>f.o),fs.flatMap(f=>why(kb,f)),'Stated/Inferred')};
 const sup=(c,sc,tag)=>{if(!c)return UNK('Unknown class.');
  const rows=insts(kb,c).map(x=>{const f=lookup(kb,x,sc.a).fs.find(f=>!f.neg&&!isNaN(num(f.o)));return f&&{x,f,v:num(f.o)}}).filter(Boolean);
  if(!rows.length)return UNK();rows.sort((a,b)=>sc.d*(b.v-a.v));const b=rows[0];
  return R(`${Dp(kb,b.x)} (${sc.a}: ${Dp(kb,b.f.o)}).`,[b.x],'Inferred',[`Search: compare ${sc.a} over every ${Dp(kb,c)}; ${sc.d>0?'maximum':'minimum'} wins`,...rows.map(r=>`  ${Dp(kb,r.x)} = ${Dp(kb,r.f.o)}`)])};
 // comparison / superlatives
 if((m=q.match(/^(?:is|are) (.+?) (\w+) than (.+)$/))&&kb.scale[m[2]]){I='numeric comparison';const sc=kb.scale[m[2]],x=k(m[1]),y=k(m[3]);
  const fx=lookup(kb,x,sc.a).fs.find(f=>!isNaN(num(f.o))),fy=lookup(kb,y,sc.a).fs.find(f=>!isNaN(num(f.o)));
  if(!fx||!fy)return UNK();const r=sc.d>0?num(fx.o)>num(fy.o):num(fx.o)<num(fy.o);
  return R(`${r?'Yes':'No'}: ${sc.a} of ${Dp(kb,x)} is ${Dp(kb,fx.o)} and of ${Dp(kb,y)} is ${Dp(kb,fy.o)}.`,[r?'yes':'no'],'Inferred',[...why(kb,fx),...why(kb,fy)])}
 if((m=q.match(/^(?:which|what) (.+?) (?:has|have) the (\w+) (.+)$/))&&kb.scale[m[2]]){I='superlative search';return sup(klass(m[1]),kb.scale[m[2]])}
 if((m=q.match(/^(?:which|what) is the (\w+) (.+)$/))&&kb.scale[m[1]]){I='superlative search';return sup(klass(m[2]),kb.scale[m[1]])}
 // attribute lookup
 if(m=q.match(/^(?:what|who|which|where|when) (?:is|are|was) the (.+?) of (.+)$/)){I='attribute lookup';return attr(k(m[2]),k(m[1]))}
 if(m=q.match(/^(?:what|who) is (.+?)'s (.+)$/)){I='attribute lookup';return attr(k(m[1]),k(m[2]))}
 // yes/no
 if(m=q.match(/^(?:is|are) (.+?) (?:a|an) (.+)$/)){I='yes/no: class membership';return bool(k(m[1]),'is a',k(m[2]))}
 if(m=q.match(/^can (.+?) (.+)$/)){I='yes/no: ability';return bool(k(m[1]),'can',k(m[2]))}
 if(m=q.match(/^(?:does|do) (.+?) have (.+)$/)){I='yes/no: has';return bool(k(m[1]),'has',k(m[2]))}
 // relations declared in the document
 for(const sf of Object.keys(kb.surf).sort((a,b)=>b.length-a.length)){const e=esc(sf),pp=esc(sf.replace(/^is /,'')),rel=kb.surf[sf];
  if(m=q.match(new RegExp(`^(?:what|who|whom) ${e} (.+)$`))){I=`relation search (?, ${rel}, Y)`;return relS(rel,k(m[1]))}
  if((m=q.match(new RegExp(`^(?:which|what) (.+?) ${e} (.+)$`)))&&klass(m[1])){I=`relation search + class filter (?, ${rel}, Y)`;return relS(rel,k(m[2]),klass(m[1]))}
  if(m=q.match(new RegExp(`^(?:what|who|whom|which) (?:does |do |is |are )?(.+?) ${pp}$`))){I=`relation search (X, ${rel}, ?)`;return relO(rel,k(m[1]))}
  if(m=q.match(new RegExp(`^(?:is |are |does |do )?(.+?) ${pp} (.+)$`))){I=`yes/no: relation ${rel}`;return bool(k(m[1]),rel,k(m[2]))}}
 // lists, counts, paths, definitions
 if((m=q.match(/^(?:list|name|show|give me)(?: all| the)? (.+)$/)||q.match(/^(?:what|which|who) (?:are|were) (?:all )?(?:the )?(.+)$/))&&klass(m[1])){I='class enumeration';
  const c=klass(m[1]);return lst(`All ${Dp(kb,c)}s`,insts(kb,c),insts(kb,c).map(x=>kb.facts.find(f=>f.s==x&&f.p=='is a'&&f.o==c)).flatMap(f=>why(kb,f)))}
 if((m=q.match(/^how many (.+?)(?: are there| exist| do you know)?$/))&&klass(m[1])){I='class count';const c=klass(m[1]),n=insts(kb,c).length;
  return R(`There are ${n} ${Dp(kb,c)}(s) in the knowledge base.`,[n],'Inferred',insts(kb,c).map(x=>Dp(kb,x)))}
 if(m=q.match(/^how (?:is|are) (.+?) (?:related|connected) to (.+)$/)){I='graph search (BFS)';const a=k(m[1]),b=k(m[2]);
  if(!kb.ents.has(a)||!kb.ents.has(b))return UNK('Unknown entity.');
  const prev={[a]:null};let fr=[a];while(fr.length&&!(b in prev)){const nx=[];for(const u of fr)for(const f of kb.facts){if(f.neg||f.how.t!='stated')continue;
   const v=f.s==u?f.o:f.o==u?f.s:null;if(v!=null&&!(v in prev)){prev[v]={u,f};nx.push(v)}}fr=nx}
  if(!(b in prev))return UNK('No connection found.');const path=[];for(let c=b;prev[c];c=prev[c].u)path.unshift(prev[c].f);
  return R(`Shortest chain: ${path.map(f=>say(kb,f)).join('; ')}.`,[a,...path.map(f=>f.s==a||path.indexOf(f)?f.o:f.s)],'Inferred',path.map(f=>trip(kb,f)))}
 if(kb.ents.has(k(q))){I='entity lookup';const x=k(q),A=anc(kb,x),own=kb.facts.filter(f=>f.s==x&&f.p!='is a'&&!f.neg);
  return R(`${Dp(kb,x)}${A.length?' is a '+A.map(a=>Dp(kb,a)).join(' -> '):''}${own.length?'. Known facts: '+own.map(f=>say(kb,f)).join('; '):''}.`,A.length?A:[x],'Stated/Inferred',own.flatMap(f=>why(kb,f)))}
 if(m=q.match(/^(?:what|who) (?:is|are) (?:a |an |the )?(.+)$/)){I='definition';let x=k(m[1]);
  if(!kb.ents.has(x)&&x.length>=5){const near=[...kb.ents].filter(e=>e.length>=5&&editDistance(x,e)==1);
   if(near.length==1){x=near[0];I=`definition (matched "${m[1]}" to "${Dp(kb,x)}")`}}
  if(!kb.ents.has(x))return UNK(`Unknown entity "${m[1]}".`);const A=anc(kb,x),own=kb.facts.filter(f=>f.s==x&&f.p!='is a'&&!f.neg);
  return R(`${Dp(kb,x)}${A.length?' is a '+A.map(a=>Dp(kb,a)).join(' → '):''}${own.length?'. Known facts: '+own.map(f=>say(kb,f)).join('; '):''}.`,A.length?A:['unknown'],'Stated/Inferred',own.flatMap(f=>why(kb,f)))}
 const stop=new Set(['what','which','who','where','when','how','is','are','was','were','the','of','a','an','in','on','to','for','from','about','does','do','can','tell','me','give']);
 const words=[...new Set(q.replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w=>w&&!stop.has(w)))];
 if(words.length&&kb.sentences){
  const matches=kb.sentences.map(s=>{const low=s.toLowerCase();
   return {s,score:words.filter(w=>low.includes(w)).length}}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,5);
  if(matches.length){I='document text search';const text=[...new Set(matches.map(x=>x.s))].join(' ');
   return R(text,[matches[0].s.toLowerCase().split(/\s+/).find(w=>words.includes(w))||matches[0].s.toLowerCase()],'Document Search',matches.map(x=>`Match (${x.score}/${words.length}): ${x.s}`))}
 }
 return UNK('Not understood: the question does not match any supported pattern (see the Design tab).','Not understood')}

/* ---------- 5. Evaluation ---------- */
function evaluate(kb,tests){const rows=tests.map(t=>{const t0=now(),r=ask(kb,t.q),ms=now()-t0,got=new Set(r.items),exp=new Set(t.a.map(x=>x.toLowerCase()));
  const tp=[...got].filter(x=>exp.has(x)).length,P=got.size?tp/got.size:(exp.size?0:1),Rc=exp.size?tp/exp.size:1,F=P+Rc?2*P*Rc/(P+Rc):0;
  return {q:t.q,exp:[...exp],got:[...got],exact:tp==got.size&&tp==exp.size,P,R:Rc,F,ms,status:r.status,interp:r.interp,abst:exp.has('unknown')}});
 const a=(f)=>rows.length?rows.reduce((s,r)=>s+f(r),0)/rows.length:0,ab=rows.filter(r=>r.abst);
 return {rows,acc:a(r=>+r.exact),P:a(r=>r.P),R:a(r=>r.R),F:a(r=>r.F),ms:a(r=>r.ms),
  abstAcc:ab.length?ab.filter(r=>r.exact).length/ab.length:null,coverage:rows.filter(r=>!r.got.includes('unknown')).length/(rows.length||1)}}

const API={build,ask,evaluate,csv2cnl:t=>{const L=t.trim().split(/\r?\n/).map(r=>r.split(',').map(x=>x.trim())),h=L[0];
 return L.slice(1).map(r=>[`${r[0]} is a ${h[0]}.`,...r.slice(1).map((v,i)=>v?`The ${h[i+1]} of ${r[0]} is ${v}.`:'')].filter(Boolean).join('\n')).join('\n')}};
if(typeof module!='undefined')module.exports=API;g.KnowQA=API;
})(typeof window!='undefined'?window:globalThis);
