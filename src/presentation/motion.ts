import {peggingAwards} from './awards';
import {handSize,isCribCount,type State} from '../game/engine';
import {publicPose,tablePlayers} from '../game/layout';
import {DECK_POSITION,STARTER_POSITION} from '../sceneLayout';
import {type Position} from '../table';
import {buildFrame,pose,rotate,type Frame,type Pose,type CardVisual,type PlateVisual,type PegVisual,type CountVisual,type AwardVisual} from './frame';
export const MOTION={join:.8,deal:1.05,dealInterval:.085,discard:1.05,cut:1.05,play:.8,spread:.8,peg:.95,collect:.9,hover:.16,turn:.38};
export type MotionKind='ready'|'join'|'deal'|'discard'|'undo'|'cut'|'play'|'go'|'count'|'crib'|'next-hand'|'win';
type Segment={from:Pose;to:Pose;start:number;duration:number;lift:number};
type Track<T>={item:T;segments:Segment[];remove?:boolean;appear?:number};
export type Plan={from:Frame;target:Frame;kind:MotionKind;duration:number;cards:Track<CardVisual>[];plates:Track<PlateVisual>[];pegs:Track<PegVisual>[];counts:Track<CountVisual>[];awards:Track<AwardVisual>[]};
const smooth=(p:number)=>p<.5?4*p*p*p:1-(-2*p+2)**3/2;
const clamp=(p:number)=>Math.max(0,Math.min(1,p));
const clonePose=(p:Pose):Pose=>({...p,position:[...p.position]});
export function blend(from:Pose,to:Pose,t:number,lift=0):Pose{
 const p=clamp(t),e=smooth(p);
 return {position:from.position.map((v,i)=>v+(to.position[i]-v)*e+(i===1?Math.sin(p*Math.PI)*lift:0)) as Position,rotation:from.rotation+(to.rotation-from.rotation)*e,flip:from.flip+(to.flip-from.flip)*e,scale:from.scale+(to.scale-from.scale)*e,glow:from.glow+(to.glow-from.glow)*e};
}
function different(a:Pose,b:Pose){return a.position.some((n,i)=>Math.abs(n-b.position[i])>1e-7)||Math.abs(a.rotation-b.rotation)>1e-7||Math.abs(a.flip-b.flip)>1e-7||a.scale!==b.scale;}
function kindOf(before:State,after:State):MotionKind{
 if(after.players.length>before.players.length)return 'join';
 if(after.winner!==null&&before.winner===null)return 'win';
 if(after.phase==='discard'&&(before.phase!=='discard'||after.round!==before.round||after.seed!==before.seed))return before.phase==='gathering'?'deal':'next-hand';
 if(after.discards.flat().length>before.discards.flat().length)return 'discard';
 if(after.discards.flat().length<before.discards.flat().length)return 'undo';
 if(after.cut&&!before.cut)return 'cut';
 if(after.plays.length>before.plays.length)return 'play';
 if(after.phase==='count'||before.phase==='count')return isCribCount(after)?'crib':'count';
 if(after.revision!==before.revision)return 'go';return 'ready';
}
export function planMotion(before:State,after:State,viewer:string,from=buildFrame(before,viewer),pegOrigins?:Record<string,number>):Plan{
 const origins=pegOrigins??Object.fromEntries(after.players.map((p,i)=>{
  const old=before.players[i];
  if(!old||p.score<old.score||after.seed!==before.seed)return [p.id,-1];
  return [p.id,p.score!==old.score?old.score:Math.min(...from.pegs.filter(o=>o.owner===p.id).map(o=>o.score),p.previous)];
 }));
 const target=buildFrame(after,viewer,from,origins),kind=kindOf(before,after),collect=kind==='next-hand',deal=kind==='deal'||collect;
 const plan:Plan={from,target,kind,duration:kind==='ready'?0:MOTION.turn,cards:[],plates:[],pegs:[],counts:[],awards:[]};
 const deckPose=pose([STARTER_POSITION[0],STARTER_POSITION[1]+.014,STARTER_POSITION[2]],0,Math.PI);
 const count=after.players.length,dealt=count*handSize(after)+(count===3?1:0);
 const collectionEnd=collect?1.5:0;
 const dealStart=collect?1.85:.15;
 const segment=(a:Pose,b:Pose,start:number,duration:number,lift=0)=>{plan.duration=Math.max(plan.duration,start+duration);return {from:clonePose(a),to:clonePose(b),start,duration,lift};};
 const enteredCounting=before.phase!=='count'&&after.phase==='count';
 for(const card of target.cards){
  const old=from.cards.find(c=>c.id===card.id),segments:Segment[]=[];
  let appear=0;
  if(card.zone==='deck'){
   if(collect){const split=clonePose(card);split.position[0]+=(card.order<7?-1:1)*.5;split.position[1]+=.18;split.rotation+=(card.order<7?-1:1)*.08;segments.push(segment(card,split,collectionEnd,.16,.06),segment(split,card,collectionEnd+.16,.19,.1));}
  }else if(!old){
   if(card.zone==='hand'&&deal){
    const player=after.players.findIndex(p=>p.id===card.owner),turn=(player-after.dealer-1+count)%count,order=card.order*count+turn;
    appear=dealStart+order*MOTION.dealInterval;segments.push(segment(deckPose,card,appear,MOTION.deal,1.65));
   }else if(card.zone==='crib'&&deal){appear=dealStart+(dealt-1)*MOTION.dealInterval;segments.push(segment(deckPose,card,appear,MOTION.deal,1.65));}
   else if(card.zone==='cut'){segments.push(segment(deckPose,card,0,MOTION.cut,1.1));}
   else segments.push(segment({...card,position:[card.position[0],card.position[1]+.8,card.position[2]],scale:0},card,0,.5));
  }else if(old.zone==='hand'&&card.zone==='crib')segments.push(segment(old,card,0,MOTION.discard,2));
  else if(old.zone==='crib'&&card.zone==='hand')segments.push(segment(old,card,0,MOTION.discard,2));
  else if(old.zone==='hand'&&card.zone==='played'){
   if(enteredCounting){
    const seat=tablePlayers(after,viewer).find(s=>s.id===card.owner)!,local=publicPose(card.order,seat.lane),p=rotate(local.position,seat.rotation);
    const landed={...card,...pose([seat.x+p[0],p[1],seat.z+p[2]],seat.rotation)};
    segments.push(segment(old,landed,0,MOTION.play,old.flip===0?.5:1.1));
    if(different(landed,card))segments.push(segment(landed,card,MOTION.play+.12,MOTION.spread,.24));
   }else segments.push(segment(old,card,0,MOTION.play,old.flip===0?.5:1.1));
  }else if(different(old,card)){
   const reveal=card.zone==='crib'&&old.flip!==card.flip;
   segments.push(segment(old,card,enteredCounting?MOTION.play+.12:reveal?card.order*.1:0,reveal?.85:MOTION.spread,reveal?.95:card.zone==='played'?.25:0));
  }
  plan.cards.push({item:card,segments,appear});
 }
 for(const old of from.cards.filter(c=>!target.cards.some(t=>t.id===c.id))){
  const end={...deckPose,scale:1},start=collect?old.order*.025:0;
  plan.cards.push({item:old,segments:[segment(old,end,start,collect?MOTION.collect:.6,2)],remove:true});
 }
 for(const plate of target.plates){
  const old=from.plates.find(p=>p.id===plate.id),segments:Segment[]=[];
  if(!old)segments.push(segment({...plate,position:[plate.position[0],plate.position[1]+.9,plate.position[2]],scale:0},plate,0,MOTION.join,.08));
  else if(different(old,plate))segments.push(segment(old,plate,enteredCounting?MOTION.play+.12:0,MOTION.spread));
  if(kind==='win'&&after.players[after.winner!]?.id===plate.id){
   const lifted={...plate,position:[plate.position[0],plate.position[1]+.13,plate.position[2]] as Position,scale:1.035,glow:1};
   segments.push(segment(plate,lifted,MOTION.peg,.4),segment(lifted,plate,MOTION.peg+.4,.5));
  }
  plan.plates.push({item:plate,segments});
 }
 for(const peg of target.pegs){
  const old=from.pegs.find(p=>p.id===peg.id),segments:Segment[]=[];
  if(!old){const owner=target.plates.find(p=>p.id===peg.owner)!;segments.push(segment({...peg,position:[...owner.position],scale:0},peg,.18,MOTION.join,1.1));}
  else if(different(old,peg))segments.push(segment(old,peg,kind==='play'?MOTION.play*.65:kind==='cut'?.6:0,MOTION.peg,.9));
  plan.pegs.push({item:peg,segments});
 }
 for(const label of target.counts){
  const old=from.counts.find(c=>c.id===label.id),segments:Segment[]=[];
  if(!old){
   const landed=Math.max(0,...plan.cards.filter(c=>label.cards.includes(c.item.id)).flatMap(c=>c.segments.map(s=>s.start+s.duration)));
   segments.push(segment({...label,scale:0},label,landed,.3));
  }
  plan.counts.push({item:label,segments});
 }
 for(const old of from.counts.filter(c=>!target.counts.some(t=>t.id===c.id))){
  const landed=Math.max(0,...plan.pegs.flatMap(p=>p.segments.map(s=>s.start+s.duration)));
  plan.counts.push({item:{...old,awarded:before.phase==='count'},segments:[segment(old,{...old,scale:0},landed,.3)],remove:true});
 }
 const awards=peggingAwards(before,after,viewer);
 for(const [index,award] of awards.entries()){
  const landed=Math.max(0,...plan.cards.filter(c=>award.cards.includes(c.item.id)).flatMap(c=>c.segments.map(s=>s.start+s.duration)));
  const start=landed+index*.2,hidden={...award,scale:0};
  plan.awards.push({item:award,segments:[segment(hidden,award,start,.15),segment(award,award,start+.15,.65),segment(award,hidden,start+.8,.25)],remove:true});
 }
 if(collect)plan.duration=Math.max(plan.duration,dealStart+(dealt-1)*MOTION.dealInterval+MOTION.deal);
 return plan;
}
function sampleTrack<T extends Pose>(track:Track<T>,time:number):T|undefined{
 if(track.remove&&time>=track.segments.at(-1)!.start+track.segments.at(-1)!.duration)return;
 if(track.appear!==undefined&&time<track.appear)return {...track.item,scale:0};
 let result:Pose=track.segments[0]?.from??track.item;
 for(const s of track.segments){if(time<s.start)break;result=blend(s.from,s.to,(time-s.start)/s.duration,s.lift);if(time<s.start+s.duration)break;}
 return {...track.item,...result};
}
export function sampleMotion(plan:Plan,time:number):Frame{
 if(time>=plan.duration)return plan.target;
 const sample=<T extends Pose>(tracks:Track<T>[])=>tracks.map(t=>sampleTrack(t,time)).filter((t):t is T=>!!t);
 const status=time<.12?{...plan.from.status,opacity:1-time/.12}:{...plan.target.status,opacity:Math.min(1,(time-.12)/.18)};
 const frame:Frame={status,revision:plan.target.revision,cards:sample(plan.cards),plates:sample(plan.plates),pegs:sample(plan.pegs),counts:sample(plan.counts),awards:sample(plan.awards)};
 // Update engraved scores when their peg lands, not when it starts flying.
 frame.plates=frame.plates.map(p=>{const old=plan.from.plates.find(o=>o.id===p.id);const peg=plan.pegs.find(t=>t.item.owner===p.id&&t.segments.length);const end=peg?.segments.at(-1);return old&&end&&time<end.start+end.duration?{...p,score:old.score}:p;});
 return frame;
}
export function interactionPose(card:CardVisual,hover:number,pressed:number):CardVisual{
 if(card.zone!=='hand')return card;
 return {...card,position:[card.position[0],card.position[1]+.28*hover-.08*pressed,card.position[2]-.12*hover],glow:hover*.28+pressed*.15};
}

export function interactionLevel(from:number,to:number,seconds:number){return from+(to-from)*smooth(clamp(seconds/MOTION.hover));}
