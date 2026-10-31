import {initialState,apply,type State,type Intent} from '../game/engine';
import {botIntent} from '../game/bot';
import {planMotion,interactionLevel,type Plan} from './motion';
import {buildFrame} from './frame';
export type Step={before:State;after:State;intent:Intent;actor:string};
export type Example={id:string;name:string;hint:string;steps:Step[];viewer:string;interaction?:'hover'|'press'};
function catalogue(){
 const examples:Example[]=[],seen=new Set<string>(),round:Step[]=[];
 let state=initialState();
 const ids=['you','rowan','jules','ada'],names=['You','Rowan','Jules','Ada'];
 function add(id:string,name:string,hint:string,step:Step,interaction?:Example['interaction']){
  if(seen.has(id))return;seen.add(id);examples.push({id,name,hint,steps:[step],viewer:step.actor,interaction});
 }
 function act(actor:string,intent:Intent){const before=state;state=apply(state,actor,intent);return {before,after:state,actor,intent};}
 ids.forEach((id,i)=>{const s=act(id,{type:i?'join':'create',name:names[i]});add(`join-${id}`,i?`${names[i]} takes a seat`:'You take a seat','The actual player-entry transition: nameplate and pegs arrive at the table.',s);round.push(s);});
 const dealt=act('you',{type:'begin',seed:'cribbage-animation-review-v1'});round.push(dealt);add('deal','Deal twenty cards','Five cards per player, dealt clockwise. Only your cards turn face up.',dealt);
 let safety=0;
 while(state.phase!=='finished'&&safety++<2000){
  const seat=state.phase==='discard'?state.discards.findIndex(c=>c===null):state.turn;
  const intent=botIntent(state,seat);if(!intent)throw new Error('Animation fixture has no legal next action.');
  const s=act(ids[seat],intent),name=names[seat];
  if(s.before.round===0)round.push(s);
  if(intent.type==='discard')add(`discard-${ids[seat]}`,seat?`${name} chooses the crib`:'You choose the crib','The card flips face down, flies clear of the board and lands on top of the crib. The remaining fan settles.',s);
  if(intent.type==='cut'){
   add('cut','Cut and turn the starter','The starter rises, turns and settles on top of the deck.',s);
   if(!seen.has('ready')){examples.unshift({id:'ready',name:'Ready table',hint:'The same table, materials, lighting and native-resolution renderer used by the real game.',steps:[{...s,before:s.after}],viewer:'you'});seen.add('ready');}
  }
  if(intent.type==='play')add(`play-${ids[seat]}`,seat?`${name} plays a card`:'You play a card','The actual card leaves its fan, turns if concealed, and lands to the right and above the previous play.',s);
  if(intent.type==='go'&&s.after.phase==='pegging')add('go','Go / next count','The turn and running count crossfade using the same presentation clock as the cards.',s);
  if(s.after.players.some((p,i)=>p.score!==s.before.players[i].score))add('peg','Score and leapfrog a peg','The rear physical peg lifts and lands in the new hole; the nameplate score changes when it lands.',s);
  if(s.before.phase!=='count'&&s.after.phase==='count')add('count-start','Finish pegging and begin counting','The last card lands in the pegging stack before the first hand spreads for counting.',s);
  if(intent.type==='count')add(s.before.countIndex===4?'crib-close':`count-${ids[seat]}`,s.before.countIndex===4?'Finish the crib':`Count ${name}’s hand`,'The scoring peg moves while the counted hand closes and the next hand spreads.',s);
  if(s.after.phase==='count'&&s.after.countIndex===4)add('crib','Reveal and count the crib','Every crib card turns face up and spreads beside the board.',s);
  if(intent.type==='deal')add('next-hand','Collect, shuffle and deal again','Played cards and crib return to the deck, the deck cuts together, and the new hand is dealt clockwise.',s);
  if(s.after.phase==='finished')add('win','Winning peg and nameplate','The winning peg lands at 121 and the winner’s nameplate lifts in celebration.',s);
 }
 const ready=examples.find(e=>e.id==='ready')!.steps[0];
 const hovering={...ready,actor:ids[ready.after.turn]};
 examples.splice(1,0,{id:'hover',name:'Hover / keyboard focus',hint:'The real card lifts and warms under the pointer or keyboard focus. No DOM drawing covers the card.',steps:[hovering],viewer:hovering.actor,interaction:'hover'},{id:'press',name:'Press a card',hint:'The real card depresses under the pointer before its committed play begins.',steps:[hovering],viewer:hovering.actor,interaction:'press'});
 examples.push({id:'whole-hand',name:'Complete hand, all four players',hint:'An uninterrupted replay of the same legal intents, from gathering to the next deal.',steps:round,viewer:'you'});
 return examples;
}
export const animationExamples=catalogue();
export type Timeline={plans:{plan:Plan;state:State;start:number}[];duration:number;example:Example;viewer:string};
export function buildTimeline(example:Example,viewer:string):Timeline{
 let previous=buildFrame(example.steps[0].before,viewer),duration=0;
 const plans=example.steps.map(step=>{const plan=planMotion(step.before,step.after,viewer,previous),start=duration;previous=plan.target;duration+=Math.max(plan.duration,example.interaction?1.8:0)+.15;return {plan,state:step.after,start};});
 return {plans,viewer,duration:example.id==='ready'?0:duration,example};
}
export function timelineAt(timeline:Timeline,time:number){
 const entry=timeline.plans.findLast(p=>p.start<=time)??timeline.plans[0];
 const local=Math.max(0,time-entry.start);
 const hand=entry.plan.target.cards.find(c=>c.zone==='hand'&&c.owner===timeline.viewer);
 const interaction=timeline.example.interaction?{card:hand?.id??'',hover:local<1.25?interactionLevel(0,1,local-.25):interactionLevel(1,0,local-1.25),press:timeline.example.interaction==='press'?(local<.95?interactionLevel(0,1,local-.6):interactionLevel(1,0,local-.95)):0}:undefined;
 return {...entry,time:local,interaction};
}
