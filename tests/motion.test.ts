import {test,expect} from 'bun:test';
import {animationExamples,buildTimeline,timelineAt} from '../src/presentation/catalog';
import {apply} from '../src/game/engine';
import {buildFrame} from '../src/presentation/frame';
import {planMotion,sampleMotion,interactionPose,interactionLevel} from '../src/presentation/motion';

test('review catalogue covers each live transition and uses legal game intents',()=>{
 for(const id of ['deal','cut','peg','go','count-start','crib','next-hand','win','hover','press','whole-hand',...['you','rowan','jules','ada'].flatMap(p=>[`join-${p}`,`discard-${p}`,`play-${p}`,`count-${p}`])])expect(animationExamples.some(e=>e.id===id)).toBe(true);
 for(const e of animationExamples.filter(e=>!['ready','hover','press'].includes(e.id)))for(const s of e.steps)expect(apply(s.before,s.actor,s.intent)).toEqual(s.after);
});
test('all four perspectives end at the exact shared layout with unique physical cards',()=>{
 for(const e of animationExamples)for(const viewer of ['you','rowan','jules','ada']){
  const timeline=buildTimeline(e,viewer);
  for(const {plan} of timeline.plans){
   expect(sampleMotion(plan,plan.duration)).toEqual(plan.target);
   const ids=plan.target.cards.map(c=>c.id);expect(new Set(ids).size).toBe(ids.length);
   for(const c of plan.target.cards.filter(c=>c.zone==='hand'))expect(c.flip).toBe(c.owner===viewer?0:Math.PI);
  }
 }
});
test('dealing is staggered and flies from the deck rather than appearing at the destination',()=>{
 const e=animationExamples.find(e=>e.id==='deal')!,s=e.steps[0],p=planMotion(s.before,s.after,e.viewer);
 const cards=p.cards.filter(c=>c.item.zone==='hand');expect(cards).toHaveLength(20);
 expect(new Set(cards.map(c=>c.appear)).size).toBe(20);
 const c=cards[0],mid=sampleMotion(p,c.appear!+.525).cards.find(x=>x.id===c.item.id)!;
 expect(mid.position[1]).toBeGreaterThan(1);expect(mid.position).not.toEqual(c.item.position);
});
test('scoring leapfrogs the rear peg and updates the nameplate only on landing',()=>{
 const e=animationExamples.find(e=>e.id==='peg')!,s=e.steps[0],p=planMotion(s.before,s.after,e.viewer);
 const changed=s.after.players.find((x,i)=>x.score!==s.before.players[i].score)!;
 const moving=p.pegs.find(t=>t.item.owner===changed.id&&t.segments.length)!;
 expect(p.from.pegs.find(x=>x.id===moving.item.id)!.score).toBe(s.before.players.find(x=>x.id===changed.id)!.previous);
 const segment=moving.segments[0];
 expect(sampleMotion(p,segment.start+.1).plates.find(x=>x.id===changed.id)!.score).toBe(s.before.players.find(x=>x.id===changed.id)!.score);
 expect(sampleMotion(p,p.duration).plates.find(x=>x.id===changed.id)!.score).toBe(changed.score);
});
test('next hand collects old physical cards before dealing new cards; hover and press share sampled motion',()=>{
 const e=animationExamples.find(e=>e.id==='next-hand')!,s=e.steps[0],p=planMotion(s.before,s.after,e.viewer);
 expect(p.cards.some(t=>t.remove)).toBe(true);
 expect(p.cards.filter(t=>t.item.zone==='hand').every(t=>t.appear!>=1.85)).toBe(true);
 const hover=buildTimeline(animationExamples.find(e=>e.id==='press')!,'rowan');
 const t=timelineAt(hover,.8);expect(t.interaction!.hover).toBe(1);expect(t.interaction!.press).toBe(1);
 const card=buildFrame(t.state,'rowan').cards.find(c=>c.id===t.interaction!.card)!;
 expect(interactionPose(card,1,1).position[1]-card.position[1]).toBeCloseTo(.2);
 expect(interactionLevel(0,1,.08)).toBe(.5);
});
