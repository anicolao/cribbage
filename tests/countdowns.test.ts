import {test,expect} from 'bun:test';
import {createHash} from 'node:crypto';
import legacy from './fixtures/v2-hands.json';
import {apply,initialState,replay,cribComplete,discardActor,parseIntent,type State,type Event} from '../src/game/engine';
import {botIntent} from '../src/game/bot';
import {TableClock,countdownAction,automaticChoice,type ClockStorage} from '../src/game/countdowns';
import {animationExamples,buildTimeline,timelineAt} from '../src/presentation/catalog';
function table(n=2){let s=apply(initialState(),'p0',{type:'create',name:'Alex'});for(let i=1;i<n;i++)s=apply(s,`p${i}`,{type:'join',name:`Friend ${i}`});return apply(s,'p0',{type:'begin',seed:'undo-review'});}
function full(s:State){while(!cribComplete(s)){const seat=discardActor(s);s=apply(s,`p${seat}`,botIntent(s,seat)!);}return s;}
function storage():ClockStorage{const data=new Map<string,string>();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);}};}
test('partial two-player crib is undoable indefinitely; undo restores original deal order without changing another hand',()=>{
 let s=table();const original=structuredClone(s),card=s.hands[0][2];s=apply(s,'p0',{type:'discard',card});
 const clock=new TableClock(storage(),'test');
 for(const now of [0,5000,60000]){const windows=clock.observe(s,now,true);expect(windows.crib).toBeUndefined();expect(countdownAction(s,'p0',windows,now)).toEqual({kind:'undo',card,disabled:false,remaining:undefined,fraction:undefined});expect(automaticChoice(s,'p0',windows,now)).toBeUndefined();}
 expect(()=>apply(s,'p1',{type:'undo-discard',card})).toThrow();expect(()=>apply(s,'p0',{type:'accept-crib'})).toThrow();
 s=apply(s,'p0',{type:'undo-discard',card});expect(s.hands).toEqual(original.hands);expect(s.crib).toEqual([]);expect(s.pendingDiscards).toEqual([]);expect(s.kept[0]).toEqual([]);
});
for(const n of [2,3,4])test(`${n} players: global five-second grace survives reconnect, undo cancels it, refill restarts it, and only acceptance permits cutting`,()=>{
 let s=full(table(n));const store=storage(),clock=new TableClock(store,'table'),first=clock.observe(s,10000,true);
 expect(s.phase).toBe('discard');expect(first.crib?.deadline).toBe(15000);expect(()=>apply(s,`p${s.turn}`,{type:'cut'})).toThrow();
 expect(new TableClock(store,'table').observe(s,14000,true).crib?.deadline).toBe(15000);
 for(let seat=0;seat<n;seat++)expect(countdownAction(s,`p${seat}`,first,14000)?.remaining).toBe(1);
 expect(automaticChoice(s,'p0',first,14999)).toBeUndefined();expect(automaticChoice(s,'p0',first,15000)?.intent).toEqual({type:'accept-crib'});
 expect(automaticChoice(s,'p1',first,15000)).toBeUndefined();expect(automaticChoice(s,'p1',first,16000)?.actor).toBe('p1');
 const card=s.discards[0].at(-1)!;s=apply(s,'p0',{type:'undo-discard',card});const partial=clock.observe(s,14500,true);expect(partial.crib).toBeUndefined();expect(countdownAction(s,'p0',partial,999999)?.remaining).toBeUndefined();
 s=apply(s,'p0',{type:'discard',card});const fresh=clock.observe(s,20000,true);expect(fresh.crib?.deadline).toBe(25000);
 s=apply(s,'p0',{type:'accept-crib'});expect(s.phase).toBe('cut');expect(s.pendingDiscards).toEqual([]);expect(()=>apply(s,'p0',{type:'undo-discard',card})).toThrow();expect(countdownAction(s,'p0',clock.observe(s,21000,true),21000)).toBeUndefined();
});
test('Go begins after animation settles, can be tapped immediately, auto-plays once, and host can advance a disconnected seat honestly',()=>{
 let s=table();s.phase='pegging';s.turn=1;s.hands=[['king_of_clubs'],['queen_of_clubs'],[],[]];s.total=30;s.last=0;s.segment=['10_of_hearts','10_of_spades','10_of_diamonds'];
 const clock=new TableClock(storage(),'go');expect(clock.observe(s,0,false).go).toBeUndefined();const windows=clock.observe(s,1000,true);expect(windows.go?.deadline).toBe(6000);
 expect(countdownAction(s,'p1',windows,1000)?.remaining).toBe(5);expect(automaticChoice(s,'p1',windows,5999)).toBeUndefined();expect(automaticChoice(s,'p1',windows,6000)?.intent).toEqual({type:'go'});
 expect(automaticChoice(s,'p0',windows,6000)).toBeUndefined();const fallback=automaticChoice(s,'p0',windows,7000)!;expect(fallback.actor).toBe('p0');expect(fallback.intent).toEqual({type:'auto-go',player:'p1'});
 expect(()=>apply(s,'p1',fallback.intent)).toThrow();expect(apply(s,'p0',fallback.intent)).toEqual(apply(s,'p1',{type:'go'}));
 const after=apply(s,'p1',{type:'go'});expect(clock.observe(after,7000,false).go).toBeUndefined();
 s.total=0;expect(()=>apply(s,'p0',fallback.intent)).toThrow();
});
test('new actions reject computed deadlines and outcomes',()=>{for(const intent of [{type:'accept-crib',deadline:5000},{type:'go',auto:true},{type:'undo-discard',card:'ace_of_clubs',score:2},{type:'auto-go',player:'p1',total:0}])expect(()=>parseIntent(intent)).toThrow();});
test('frozen v2 hands replay byte-for-byte and can continue using their original protocol',()=>{
 for(const fixture of legacy){let s=initialState(2);for(const [i,e] of (fixture.events as Event[]).entries()){s=apply(s,e.actor,e.intent);const {pendingDiscards,...original}=s;expect(createHash('sha256').update(JSON.stringify(original)).digest('hex')).toBe(fixture.hashes[i]);}expect(replay(fixture.events as Event[])).toEqual(s);expect(apply(s,'p0',botIntent(s,0)!).protocol).toBe(2);}
});
test('lab exposes untimed partial undo, full-crib countdown, reversed card flight, and five-second automatic Go through the shared action model',()=>{
 for(const id of ['undo-first','undo-ready','crib-ready','go']){
  const e=animationExamples.find(e=>e.id===id)!;expect(e).toBeDefined();const t=buildTimeline(e,e.viewer),at=timelineAt(t,.5);
  expect(at.action?.kind).toBe(id==='go'?'go':'undo');expect(at.action?.remaining).toBe(id==='undo-first'?undefined:5);
  if(id.startsWith('undo')){expect(t.plans[0].plan.kind).toBe('undo');const flight=t.plans[0].plan.cards.find(c=>c.segments.some(s=>s.lift===2));expect(flight).toBeDefined();}
 }
});
