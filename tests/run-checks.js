/* Run with Node.js. Standard library only; no installation or server needed. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const base = path.resolve(__dirname, '..'), context = vm.createContext({});
for (const name of ['data/fixed-assets-v1.js', 'core.js']) vm.runInContext(fs.readFileSync(path.join(base, name), 'utf8'), context);
const d = context.Boki2Data['fixed-assets-v1'], c = context.Boki2Core;
let checks = 0;
function check(name, fn) { fn(); checks++; console.log('PASS ' + name); }
const eq = (a,b) => assert.equal(JSON.stringify(a), JSON.stringify(b));
check('24 unique sequential questions; 17 journals / 7 numeric; topic distribution', () => {
  assert.equal(d.questions.length, 24); assert.equal(new Set(d.questions.map(q=>q.id)).size,24);
  eq(d.questions.map(q=>q.id), Array.from({length:24},(_,i)=>`fa-${String(i+1).padStart(3,'0')}`));
  assert.equal(d.questions.filter(q=>q.type==='journal').length,17);
  eq(['acquisition','annual','monthly','openingSale','midSale'].map(t=>d.questions.filter(q=>q.topic===t).length),[6,5,5,3,5]);
});
for (const q of d.questions) check(q.id + ' independent accounting calculations, structure and grading', () => {
  assert.ok(d.lessons.some(l=>l.id===q.lessonId)); assert.ok(q.prompt.length>20 && q.conditions.length>=2);
  assert.ok(q.explanation.steps.length>=2 && q.explanation.pitfalls[0]);
  const f = q.facts; let expected;
  const entry = (side, account) => q.answer[side].find(r=>r.account===account)?.amount || 0;
  if (f.kind==='acquisition') {
    expected = f.price + f.incidentals.reduce((a,b)=>a+b,0);
    if(q.type==='journal') { assert.equal(entry('debit',f.asset),expected); assert.equal(entry('credit',f.payment),expected); }
  } else if(f.kind==='straight-line') {
    expected = f.cost * (1-f.residualRate) * f.months / (12*f.lifeYears);
    assert.ok(Number.isInteger(expected));
    if(q.type==='journal') { assert.equal(entry('debit','減価償却費'),expected); assert.equal(entry('credit',f.asset+'減価償却累計額'),expected); }
    if(q.topic==='monthly') { const match=q.prompt.match(/×([12])年(\d+)月\d+日に取得/); assert.ok(match); const month=Number(match[2]); assert.equal(month>=4 ? 16-month : 4-month, f.months); assert.equal(Number(match[1]),month<4?2:1); }
  } else {
    const dep = f.current ? f.current.cost * (1-f.current.residualRate)*f.current.months/(12*f.current.lifeYears) : 0;
    assert.ok(Number.isInteger(dep)); const acc=f.priorAccumulated+dep, book=f.cost-acc, gain=f.price-book;
    assert.ok(book>=0 && gain!==0);
    expected=book;
    if(q.type==='journal') { assert.equal(entry('debit',f.payment),f.price); assert.equal(entry('debit',f.asset+'減価償却累計額'),acc); assert.equal(entry('credit',f.asset),f.cost); assert.equal(entry('credit','固定資産売却益'),Math.max(0,gain)); assert.equal(entry('debit','固定資産売却損'),Math.max(0,-gain)); }
  }
  if(q.type==='numeric') { assert.equal(q.answer.amount,expected); assert.equal(c.gradeNumeric(String(expected),q.answer).status,'correct'); }
  else {
    for(const side of ['debit','credit']) { assert.equal(new Set(q.answer[side].map(r=>r.account)).size,q.answer[side].length); for(const r of q.answer[side]) { assert.ok(Number.isSafeInteger(r.amount) && r.amount>0); assert.ok(q.accountChoices.includes(r.account) && d.accounts.includes(r.account)); } }
    assert.equal(q.answer.debit.reduce((a,r)=>a+r.amount,0),q.answer.credit.reduce((a,r)=>a+r.amount,0));
    assert.equal(c.gradeJournal(q.answer,q.answer).status,'correct');
  }
});
check('amount syntax including full-width, separators, zero and unsafe values', () => {
  for(const [s,n] of [['120,000',120000],['１２０，０００',120000],[' 5000 ',5000],['0',0]]) assert.equal(c.parseAmount(s),n);
  for(const s of ['', '-1','1.5','1e3','abc','100円','9007199254740992']) assert.equal(c.parseAmount(s),null);
  assert.equal(c.gradeNumeric('',{amount:1}).status,'empty'); assert.equal(c.gradeNumeric('2',{amount:1}).status,'wrong');
});
check('journal order, splits, omissions, extra accounts, reversed sides and invalid rows', () => {
  const ans={debit:[{account:'現金',amount:100},{account:'備品減価償却累計額',amount:50}],credit:[{account:'備品',amount:150}]};
  const good={debit:[{account:'備品減価償却累計額',amount:'50'},{account:'現金',amount:'40'},{account:'現金',amount:'60'},{account:'',amount:''}],credit:ans.credit};
  assert.equal(c.gradeJournal(good,ans).status,'correct');
  for(const bad of [{debit:ans.credit,credit:ans.debit},{debit:[{account:'現金',amount:150}],credit:ans.credit},{debit:[...ans.debit,{account:'土地',amount:1}],credit:ans.credit}]) assert.equal(c.gradeJournal(bad,ans).status,'wrong');
  assert.equal(c.gradeJournal({debit:[],credit:[]},ans).status,'empty');
  assert.equal(c.gradeJournal({debit:ans.debit,credit:[]},ans).status,'invalid');
  for(const amount of ['',0,'-1','abc']) assert.equal(c.gradeJournal({debit:[{account:'現金',amount}],credit:ans.credit},ans).status,'invalid');
});
function adapter(raw=null) { const values={other:'keep'}; if(raw!==null) values[c.KEY]=raw; return {values,getItem:k=>values[k]??null,setItem:(k,v)=>{values[k]=v;},removeItem:k=>{delete values[k];}}; }
check('storage persistence, wrong/revealed/correct transitions and unknown IDs', () => {
  const s=adapter(); let state=c.loadReview(s); assert.equal(state.status,'ok');
  let entries=c.applyOutcome(state.entries,'fa-001','wrong'); entries=c.applyOutcome(entries,'fa-999','revealed');
  assert.equal(c.saveReview(s,entries,state.status),'ok'); eq(c.loadReview(s).entries,entries);
  entries=c.applyOutcome(entries,'fa-001','correct'); assert.ok(!entries['fa-001'] && entries['fa-999']);
  assert.equal(c.resetReview(s),'ok'); assert.equal(s.values.other,'keep'); assert.equal(s.getItem(c.KEY),null);
});
check('corruption, unsupported version, read denial and write failure preserve originals', () => {
  for(const raw of ['{broken','null','[]','{"schemaVersion":1,"unitId":"fixed-assets","entries":{"x":{"reason":"wrong"}}}']) { const s=adapter(raw); const r=c.loadReview(s); assert.equal(r.status,'corrupt'); assert.equal(c.saveReview(s,{'fa-001':{reason:'wrong'}},r.status),'corrupt'); assert.equal(s.getItem(c.KEY),raw); }
  const s=adapter('{"schemaVersion":99}'); const r=c.loadReview(s); assert.equal(r.status,'unsupported-version'); assert.equal(c.saveReview(s,{},r.status),r.status); assert.equal(s.getItem(c.KEY),'{"schemaVersion":99}');
  assert.equal(c.loadReview({getItem(){throw Error();}}).status,'unavailable');
  assert.equal(c.saveReview({setItem(){throw Error();}},{},'ok'),'write-failed');
});
check('local entry scripts and documentation links; no remote app dependencies', () => {
  const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
  for(const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) if(!m[1].startsWith('#')) assert.ok(fs.existsSync(path.resolve(base,m[1])),m[1]);
  assert.ok(!/https?:|type="module"/.test(html));
  for(const name of ['app.js','core.js']) assert.ok(!/\bfetch\s*\(|XMLHttpRequest|innerHTML/.test(fs.readFileSync(path.join(base,name),'utf8')));
});
console.log(`RESULT: ${checks} checks passed; 24 accounting questions independently recalculated.`);
