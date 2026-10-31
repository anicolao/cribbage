import {test,expect} from 'bun:test';
import {createHash} from 'node:crypto';
import legacy from './fixtures/v2-hands.json';
import {apply,initialState,replay,cribComplete,discardActor,parseIntent,legalCards,type State,type Event} from '../src/game/engine';
import {botIntent} from '../src/game/bot';
import {TableClock,countdownAction,automaticChoice,automaticIntent,intentForAction,type ClockStorage} from '../src/game/countdowns';
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
for(const n of [2,3,4])test(`${n} players: global three-second grace survives reconnect, undo cancels it, refill restarts it, and only acceptance permits cutting`,()=>{
 let s=full(table(n));const store=storage(),clock=new TableClock(store,'table'),first=clock.observe(s,10000,true);
 expect(s.phase).toBe('discard');expect(first.crib?.deadline).toBe(13000);expect(()=>apply(s,`p${s.turn}`,{type:'cut'})).toThrow();
 expect(new TableClock(store,'table').observe(s,12000,true).crib?.deadline).toBe(13000);
 for(let seat=0;seat<n;seat++)expect(countdownAction(s,`p${seat}`,first,12000)?.remaining).toBe(1);
 expect(automaticChoice(s,'p0',first,12999)).toBeUndefined();expect(automaticChoice(s,'p0',first,13000)?.intent).toEqual({type:'accept-crib'});
 expect(automaticChoice(s,'p1',first,13000)).toBeUndefined();expect(automaticChoice(s,'p1',first,14000)?.actor).toBe('p1');
 const card=s.discards[0].at(-1)!;s=apply(s,'p0',{type:'undo-discard',card});const partial=clock.observe(s,12500,true);expect(partial.crib).toBeUndefined();expect(countdownAction(s,'p0',partial,999999)?.remaining).toBeUndefined();
 s=apply(s,'p0',{type:'discard',card});const fresh=clock.observe(s,20000,true);expect(fresh.crib?.deadline).toBe(23000);
 s=apply(s,'p0',{type:'accept-crib'});expect(s.phase).toBe('cut');expect(s.pendingDiscards).toEqual([]);expect(()=>apply(s,'p0',{type:'undo-discard',card})).toThrow();expect(countdownAction(s,'p0',clock.observe(s,21000,true),21000)).toBeUndefined();
});
test('Go begins after animation settles and auto-plays once; another human client does not override personal timing',()=>{
 let s=table();s.phase='pegging';s.turn=1;s.hands=[['king_of_clubs'],['queen_of_clubs'],[],[]];s.total=30;s.last=0;s.segment=['10_of_hearts','10_of_spades','10_of_diamonds'];
 const clock=new TableClock(storage(),'go');expect(clock.observe(s,0,false).go).toBeUndefined();const windows=clock.observe(s,1000,true);expect(windows.go?.deadline).toBe(4000);
 expect(countdownAction(s,'p1',windows,1000)?.remaining).toBe(3);expect(automaticChoice(s,'p1',windows,3999)).toBeUndefined();expect(automaticChoice(s,'p1',windows,4000)?.intent).toEqual({type:'go'});
 expect(automaticChoice(s,'p0',windows,4000)).toBeUndefined();expect(automaticChoice(s,'p0',windows,999999)).toBeUndefined();
 // Historical host auto-go intents remain valid for immutable replay.
 const fallback={actor:'p0',intent:{type:'auto-go' as const,player:'p1'}};
 expect(()=>apply(s,'p1',fallback.intent)).toThrow();expect(apply(s,'p0',fallback.intent)).toEqual(apply(s,'p1',{type:'go'}));
 const after=apply(s,'p1',{type:'go'});expect(automaticChoice(after,'p1',windows,5000)).toBeUndefined();expect(clock.observe(after,5000,false).go).toBeUndefined();
 s.total=0;expect(()=>apply(s,'p0',fallback.intent)).toThrow();
});
test('new actions reject computed deadlines and outcomes',()=>{for(const intent of [{type:'accept-crib',deadline:5000},{type:'go',auto:true},{type:'undo-discard',card:'ace_of_clubs',score:2},{type:'auto-go',player:'p1',total:0}])expect(()=>parseIntent(intent)).toThrow();});
test('frozen v2 hands replay byte-for-byte and can continue using their original protocol',()=>{
 for(const fixture of legacy){let s=initialState(2);for(const [i,e] of (fixture.events as Event[]).entries()){s=apply(s,e.actor,e.intent);const {pendingDiscards,...original}=s;expect(createHash('sha256').update(JSON.stringify(original)).digest('hex')).toBe(fixture.hashes[i]);}expect(replay(fixture.events as Event[])).toEqual(s);expect(apply(s,'p0',botIntent(s,0)!).protocol).toBe(2);}
});
test('lab exposes untimed partial undo, full-crib countdown, reversed card flight, and three-second automatic Go through the shared action model',()=>{
 for(const id of ['undo-first','undo-ready','crib-ready','go']){
  const e=animationExamples.find(e=>e.id===id)!;expect(e).toBeDefined();const t=buildTimeline(e,e.viewer),at=timelineAt(t,.5);
  expect(at.action?.kind).toBe(id==='go'?'go':'undo');expect(at.action?.remaining).toBe(id==='undo-first'?undefined:3);
  if(id.startsWith('undo')){expect(t.plans[0].plan.kind).toBe('undo');const flight=t.plans[0].plan.cards.find(c=>c.segments.some(s=>s.lift===2));expect(flight).toBeDefined();}
 }
});

test('companion Go waits 600ms after animation settles, with no human countdown or extra host fallback',()=>{
 const s=table();s.players[1].bot=true;s.phase='pegging';s.turn=1;s.hands=[['king_of_clubs'],['queen_of_clubs'],[],[]];s.total=30;s.last=0;s.segment=['10_of_hearts','10_of_spades','10_of_diamonds'];
 const clock=new TableClock(storage(),'bot-go');expect(clock.observe(s,0,false).go).toBeUndefined();
 const windows=clock.observe(s,1000,true);expect(windows.go?.deadline).toBe(1600);
 expect(countdownAction(s,'p1',windows,1000)?.fraction).toBe(1);
 expect(automaticChoice(s,'p0',windows,1599)).toBeUndefined();
 const choice=automaticChoice(s,'p0',windows,1600)!;expect(choice.actor).toBe('p1');expect(choice.intent).toEqual({type:'go'});
 const after=apply(s,choice.actor,choice.intent);expect(automaticChoice(after,'p0',windows,1600)).toBeUndefined();
});

for(const n of [2,3,4])test(`${n} players: cut, hand/crib counting and next deal are immediate options and auto-submit once after three settled seconds`,()=>{
 const story=animationExamples.find(e=>e.id===(n===4?'whole-hand':`whole-hand-${n}`))!;
 for(const type of ['cut','count','deal'] as const)for(const step of story.steps.filter(s=>s.intent.type===type)){
  const state=step.before,store=storage(),clock=new TableClock(store,'automatic'),actor=state.players[state.turn].id;
  expect(clock.observe(state,0,false).turn).toBeUndefined();
  const windows=clock.observe(state,1000,true);expect(windows.turn?.deadline).toBe(4000);
  const action=countdownAction(state,actor,windows,1000)!;expect(action.kind).toBe(type);expect(action.remaining).toBe(3);expect(action.disabled).toBe(false);
  expect(intentForAction(action)).toEqual(step.intent);expect(apply(state,actor,intentForAction(action)!)).toEqual(step.after);
  expect(new TableClock(store,'automatic').observe(state,3000,false).turn?.deadline).toBe(4000);
  expect(countdownAction(state,actor,windows,3000)?.remaining).toBe(1);
  expect(automaticChoice(state,actor,windows,3999)).toBeUndefined();expect(automaticChoice(state,actor,windows,4000)?.intent).toEqual(step.intent);
  const other=state.players.find(p=>p.id!==actor)!;expect(automaticChoice(state,other.id,windows,10000)).toBeUndefined();
  expect(automaticChoice(step.after,actor,windows,4000)).toBeUndefined();expect(clock.observe(step.after,4000,false).turn).toBeUndefined();
 }
});
for(const id of ['forced-fit','last-card'])test(`${id}: only the single legal card can auto-play, and a manual play clears the stored countdown`,()=>{
 const step=animationExamples.find(e=>e.id===id)!.steps[0],state=step.before,actor=state.players[state.turn].id;
 const cards=legalCards(state,state.turn);expect(cards).toHaveLength(1);if(id==='forced-fit')expect(state.hands[state.turn].length).toBeGreaterThan(1);else expect(state.hands[state.turn]).toHaveLength(1);
 const store=storage(),clock=new TableClock(store,'forced');expect(clock.observe(state,0,false).turn).toBeUndefined();
 const windows=clock.observe(state,1000,true),action=countdownAction(state,actor,windows,1000)!;
 expect(action.kind).toBe('play');expect(action.card).toBe(cards[0]);expect(action.remaining).toBe(3);expect(intentForAction(action)).toEqual({type:'play',card:cards[0]});
 expect(new TableClock(store,'forced').observe(state,3000,true).turn?.deadline).toBe(4000);
 expect(automaticChoice(state,actor,windows,3999)).toBeUndefined();const choice=automaticChoice(state,actor,windows,4000)!;expect(choice.intent).toEqual({type:'play',card:cards[0]});
 const after=apply(state,actor,intentForAction(action)!);expect(after).toEqual(step.after);expect(automaticChoice(after,actor,windows,5000)).toBeUndefined();clock.observe(after,5000,false);expect(store.getItem('forced')).toBe('{}');
});
test('starting/restarting a match and choosing among multiple legal cards never become automatic',()=>{
 const story=animationExamples.find(e=>e.id==='whole-hand')!,begin=story.steps.find(s=>s.intent.type==='begin')!,choice=story.steps.find(s=>s.before.phase==='pegging'&&legalCards(s.before,s.before.turn).length>1)!;
 for(const state of [begin.before,choice.before,animationExamples.find(e=>e.id==='win')!.steps[0].after]){
  expect(automaticIntent(state)).toBeUndefined();const clock=new TableClock(storage(),'choice');const windows=clock.observe(state,0,true);expect(windows.turn).toBeUndefined();expect(windows.go).toBeUndefined();expect(automaticChoice(state,state.host,windows,999999)).toBeUndefined();
 }
});
test('all companion progress, including forced cards, keeps the 600ms delay and host-controlled ordinary intent',()=>{
 let state=apply(initialState(),'host',{type:'create',name:'You'});state=apply(state,'host',{type:'invite-bot',id:'bot-rowan',name:'Rowan'});state=apply(state,'host',{type:'begin',seed:'automatic-companion-review'});
 const seen=new Set<string>();let safety=0;
 while(seen.size<5&&state.phase!=='finished'&&safety++<1500){
  const auto=automaticIntent(state);
  if(auto&&state.players[state.turn].bot){
   const clock=new TableClock(storage(),'companion'),windows=clock.observe(state,1000,true);expect((windows.go??windows.turn)?.deadline).toBe(1600);
   expect(automaticChoice(state,state.host,windows,1599)).toBeUndefined();const choice=automaticChoice(state,state.host,windows,1600)!;expect(choice.actor).toBe('bot-rowan');expect(choice.intent).toEqual(auto);seen.add(auto.type);
  }
  const seat=state.phase==='discard'?discardActor(state):state.turn;state=apply(state,state.players[seat].id,botIntent(state,seat)!);
 }
 expect([...seen].sort()).toEqual(['count','cut','deal','go','play']);
});
test('lab exposes all automatic progress and both kinds of forced card through the shared countdown',()=>{
 for(const [id,kind] of [['auto-cut','cut'],['auto-count','count'],['auto-deal','deal'],['forced-fit','play'],['last-card','play']] as const){
  const e=animationExamples.find(e=>e.id===id)!;expect(e).toBeDefined();const timeline=buildTimeline(e,e.viewer),pending=timelineAt(timeline,.5);expect(pending.action?.kind).toBe(kind);expect(pending.action?.remaining).toBe(3);expect(timelineAt(timeline,2.5).action?.remaining).toBe(1);expect(timelineAt(timeline,3.01).state.revision).toBe(e.steps[0].after.revision);
 }
});
