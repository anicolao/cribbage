import type {Plan} from '../presentation/motion';
export type SoundKind='card'|'flip'|'peg'|'shuffle'|'seat'|'win';
export type SoundCue={id:string;at:number;kind:SoundKind;gain:number};
/** Cue times follow the same sampled tracks as the picture, including retiming. */
export function soundCues(plan:Plan):SoundCue[]{
 const unit=1/(plan.rate??1),cues:SoundCue[]=[],add=(kind:SoundKind,at:number,gain=1)=>cues.push({id:`${plan.target.revision}:${kind}:${cues.length}`,at,kind,gain});
 if(plan.kind==='join')add('seat',Math.min(.3*unit,plan.duration*.5),.45);
 else if(plan.kind==='deal'||plan.kind==='next-hand'){
  if(plan.kind==='next-hand')add('shuffle',Math.min(.35*unit,plan.duration*.08),.45);
  const entries=plan.cards.filter(c=>c.item.zone==='hand'&&c.appear!==undefined).map(c=>c.appear!).sort((a,b)=>a-b);
  for(let i=0;i<entries.length;i+=Math.max(2,Math.ceil(entries.length/6)))add('card',entries[i],.3);
 }else{
  const flights=plan.cards.filter(c=>c.segments.length&&c.segments.some(s=>s.lift>=.5));
  if(flights.length){const end=Math.max(...flights.flatMap(c=>c.segments.map(s=>s.start+s.duration)));add(plan.kind==='cut'?'flip':'card',end,.6);}
  else if(['count','crib'].includes(plan.kind))add('card',plan.duration*.3,.3);
 }
 for(const peg of plan.pegs){const old=plan.from.pegs.find(p=>p.id===peg.item.id),last=peg.segments.at(-1);if(old&&last&&old.score!==peg.item.score)add('peg',last.start+last.duration,.7);}
 if(plan.kind==='win')add('win',Math.min(plan.duration,.65*unit),.45);
 return cues.sort((a,b)=>a.at-b.at);
}
