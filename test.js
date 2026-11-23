// Run: node test.js   (verifies the evaluation sets headlessly)
const {build,evaluate,ask}=require('./engine.js'),S=require('./samples.js');let bad=0;
for(const [n,s] of Object.entries(S)){const kb=build(s.text),r=evaluate(kb,s.eval);
 console.log(`${n}: facts=${kb.facts.length} rules=${kb.rules.length} errors=${kb.errors.length} acc=${(r.acc*100).toFixed(0)}% F1=${r.F.toFixed(2)}`);
 kb.errors.forEach(e=>console.log('  ERR',e));
 r.rows.filter(x=>!x.exact).forEach(x=>{bad++;console.log('  FAIL',x.q,'exp',x.exp,'got',x.got,x.interp)})}
const typo=ask(build('Artificial intelligence is a technology.'),'What is artificial inteeligence?');
if(!typo.interp.includes('matched')||!typo.items.includes('technology')){
 bad++;console.log('  FAIL typo correction: expected definition lookup to match artificial intelligence');
}
process.exit(bad?1:0);
