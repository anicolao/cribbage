import {test,expect} from 'bun:test';
import {CARD_WIDTH,CARD_HEIGHT,BOARD_ROTATION} from '../src/sceneLayout';
import {CARD_DEPTH,BOARD_WIDTH,BOARD_DEPTH} from '../src/table';
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

test('live card flights clear the solid board from every player perspective',()=>{
 // Test the projected card rectangle and its lowest flipped edge against the
 // actual board footprint, including collection/dealing arcs across the board.
 const width=BOARD_WIDTH,depth=BOARD_DEPTH,angle=BOARD_ROTATION;
 const rectangle=(x:number,z:number,w:number,h:number,r:number)=>[[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>[x+Math.cos(r)*a*w/2+Math.sin(r)*b*h/2,z-Math.sin(r)*a*w/2+Math.cos(r)*b*h/2]);
 const overlap=(a:number[][],b:number[][])=>[a,b].every(poly=>poly.every((p,i)=>{const q=poly[(i+1)%4],axis=[q[1]-p[1],p[0]-q[0]],aa=a.map(v=>v[0]*axis[0]+v[1]*axis[1]),bb=b.map(v=>v[0]*axis[0]+v[1]*axis[1]);return Math.max(...aa)>=Math.min(...bb)&&Math.max(...bb)>=Math.min(...aa);}));
 const board=rectangle(0,0,width,depth,angle);
 const stories=animationExamples.filter(e=>e.id.startsWith('whole-hand'));
 for(const story of stories)for(const viewer of story.steps.at(-1)!.after.players.map(p=>p.id))for(const {plan} of buildTimeline(story,viewer).plans){
  for(let t=0;t<plan.duration;t+=.05)for(const card of sampleMotion(plan,t).cards){
   if(card.scale===0||card.zone==='deck')continue;
   const c=Math.abs(Math.cos(card.flip)),s=Math.abs(Math.sin(card.flip));
   const low=card.position[1]-(s*CARD_WIDTH/2+c*CARD_DEPTH)*card.scale;
   if(low>.49)continue;
   expect(overlap(board,rectangle(card.position[0],card.position[2],(c*CARD_WIDTH+s*CARD_DEPTH)*card.scale,CARD_HEIGHT*card.scale,card.rotation)),`${plan.kind} ${viewer} ${card.id} at ${t.toFixed(2)}`).toBe(false);
  }
 }
});


test('hand points fade in after the revealed cards land, persist through their scoring peg, then yield to the next hand',()=>{
 const example=animationExamples.find(e=>e.id==='whole-hand')!;
 for(const step of example.steps.filter(s=>s.after.phase==='count')){
  const plan=planMotion(step.before,step.after,'you'),label=plan.target.counts[0],track=plan.counts.find(t=>t.item.id===label.id)!;
  if(track.segments.length){
   const landed=Math.max(0,...plan.cards.filter(c=>label.cards.includes(c.item.id)).flatMap(c=>c.segments.map(s=>s.start+s.duration)));
   expect(track.segments[0].start).toBeGreaterThanOrEqual(landed);
   expect(sampleMotion(plan,Math.max(0,landed-.01)).counts.find(c=>c.id===label.id)?.scale??0).toBe(0);
  }
  if(step.before.phase==='count'){
   const old=plan.from.counts[0],pegEnd=Math.max(0,...plan.pegs.flatMap(p=>p.segments.map(s=>s.start+s.duration)));
   if(pegEnd)expect(sampleMotion(plan,pegEnd-.01).counts.find(c=>c.id===old.id)?.scale).toBe(1);
   expect(sampleMotion(plan,plan.duration).counts).toEqual(plan.target.counts);
  }
 }
});
