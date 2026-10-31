import {test,expect} from 'bun:test';
import fixture from '../src/presentation/fixtures/paired-aces.json' with {type:'json'};
import {initialState,apply,replay,type Event,type Intent} from '../src/game/engine';
import {replayTable} from '../src/presentation/replay';
import {buildFrame} from '../src/presentation/frame';
import {planMotion,sampleMotion} from '../src/presentation/motion';
import {animationExamples} from '../src/presentation/catalog';
const events:Event[]=fixture.map((e,i)=>({...e,intent:e.intent as Intent,id:`choice-${i}`,sequence:i+1,version:3}));
test('reported consecutive aces: pair and last card move one peg from 22 to 35, keeping the other at 32; reload preserves both',()=>{
 const before=replay(events.slice(0,-1)),{game:after,pegOrigins}=replayTable(events);
 expect(after).toEqual(replay(events));expect(before.players[0].score).toBe(32);expect(after.players[0].score).toBe(35);
 // Legacy outcome stays intact; physical pegs group awards by player intent.
 expect(after.players[0].previous).toBe(34);expect(pegOrigins.you).toBe(32);
 for(const viewer of after.players.map(p=>p.id)){
  const plan=planMotion(before,after,viewer),moving=plan.pegs.filter(p=>p.item.owner==='you'&&p.segments.length);
  expect(moving).toHaveLength(1);expect(moving[0].item.score).toBe(35);expect(plan.from.pegs.find(p=>p.id===moving[0].item.id)?.score).toBe(22);
  expect(plan.target.pegs.filter(p=>p.owner==='you').map(p=>p.score).sort()).toEqual([32,35]);
  expect(buildFrame(after,viewer,undefined,pegOrigins).pegs.filter(p=>p.owner==='you').map(p=>p.score).sort()).toEqual([32,35]);
  expect(plan.target.status.secondary).toBe('You · 3 points');
  expect(plan.awards.map(a=>({points:a.item.points,label:a.item.label,cards:a.item.cards}))).toEqual([
   {points:2,label:'Pair',cards:['3:ace_of_hearts','3:ace_of_clubs']},
   {points:1,label:'Last card',cards:['3:ace_of_clubs']}
  ]);
  expect(sampleMotion(plan,.79).awards.every(a=>a.scale===0)).toBe(true);
  expect(sampleMotion(plan,1.2).awards.map(a=>[a.points,a.scale])).toEqual([[2,1],[1,1]]);
  expect(sampleMotion(plan,plan.duration).awards).toEqual([]);
  expect(sampleMotion(plan,plan.duration).plates.find(p=>p.id==='you')?.score).toBe(35);
 }
});
test('physical peg history survives every scoring intent, reconnect without changing canonical replay',()=>{
 let before=initialState(),frame=buildFrame(before,'you');
 for(const e of events){
  const after=apply(before,e.actor,e.intent),plan=planMotion(before,after,'you',frame);frame=sampleMotion(plan,plan.duration);
  const restored=replayTable(events.slice(0,e.sequence)),fresh=buildFrame(restored.game,'you',undefined,restored.pegOrigins);
  for(const p of after.players){
   expect(plan.pegs.filter(x=>x.item.owner===p.id&&x.segments.length).length).toBeLessThanOrEqual(before.players.some(x=>x.id===p.id)?1:2);
   expect(frame.pegs.filter(x=>x.owner===p.id).map(x=>x.score).sort()).toEqual(fresh.pegs.filter(x=>x.owner===p.id).map(x=>x.score).sort());
  }
  before=after;
 }
 expect(replayTable(events.slice(0,3)).pegOrigins).toEqual({'you':-1,'bot-rowan':-1});
});
test('lab contains legal standalone pair and combined-award examples',()=>{
 for(const id of ['pair','pair-last']){const e=animationExamples.find(e=>e.id===id)!;expect(e).toBeDefined();for(const s of e.steps)expect(apply(s.before,s.actor,s.intent)).toEqual(s.after);}
});
