import {initialState,apply,needsDiscard,cribComplete,legalCards,discardActor,isCribCount,type State,type Intent} from '../game/engine';
import {botIntent} from '../game/bot';
import {planMotion,interactionLevel,type Plan} from './motion';
import {countdownAction,type Windows} from '../game/countdowns';
import {buildFrame} from './frame';
export type Step={before:State;after:State;intent:Intent;actor:string;delay?:number};
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
  const seat=state.phase==='discard'?discardActor(state):state.turn;
  const intent=botIntent(state,seat);if(!intent)throw new Error('Animation fixture has no legal next action.');
  const s=act(ids[seat],intent),name=names[seat];
  if(s.before.round===0)round.push(s);
  if(intent.type==='discard')add(`discard-${ids[seat]}`,seat?`${name} chooses the crib`:'You choose the crib','The card flips face down, flies clear of the board and lands on top of the crib. The remaining fan settles.',s);
  if(intent.type==='accept-crib')add('crib-ready','Crib ready · five seconds to undo','Every player can undo a contribution while this countdown runs. The starter waits until it ends.',{...s,delay:5});
  if(intent.type==='cut'){
   add('cut','Cut and turn the starter','The starter rises, turns and settles on top of the deck.',s);
   if(!seen.has('ready')){examples.unshift({id:'ready',name:'Ready table',hint:'The same table, materials, lighting and native-resolution renderer used by the real game.',steps:[{...s,before:s.after}],viewer:'you'});seen.add('ready');}
  }
  if(intent.type==='play')add(`play-${ids[seat]}`,seat?`${name} plays a card`:'You play a card','The actual card leaves its fan, turns if concealed, and lands to the right and above the previous play.',s);
  if(intent.type==='go'&&s.after.phase==='pegging')add('go','Go · play automatically after five seconds','Tap Go immediately, or let the five-second countdown play it for you.',{...s,delay:5});
  if(s.after.players.some((p,i)=>p.score!==s.before.players[i].score))add('peg','Score and leapfrog a peg','The rear physical peg lifts and lands in the new hole; the nameplate score changes when it lands.',s);
  if(s.before.phase!=='count'&&s.after.phase==='count')add('count-start','Finish pegging and begin counting','The last card lands in the pegging stack before the first hand spreads for counting.',s);
  if(intent.type==='count')add(isCribCount(s.before)?'crib-close':`count-${ids[seat]}`,isCribCount(s.before)?'Finish the crib':`Count ${name}’s hand`,'The scoring peg moves while the counted hand closes and the next hand spreads.',s);
  if(s.after.phase==='count'&&isCribCount(s.after))add('crib','Reveal and count the crib','Every crib card turns face up and spreads beside the board.',s);
  if(intent.type==='deal')add('next-hand','Collect, shuffle and deal again','Played cards and crib return to the deck, the deck cuts together, and the new hand is dealt clockwise.',s);
  if(s.after.phase==='finished')add('win','Winning peg and nameplate','The winning peg lands at 121 and the winner’s nameplate lifts in celebration.',s);
 }
 const ready=examples.find(e=>e.id==='ready')!.steps[0];
 const hovering={...ready,actor:ids[ready.after.turn]};
 examples.splice(1,0,{id:'hover',name:'Hover / keyboard focus',hint:'The real card lifts and warms under the pointer or keyboard focus. No DOM drawing covers the card.',steps:[hovering],viewer:hovering.actor,interaction:'hover'},{id:'press',name:'Press a card',hint:'The real card depresses under the pointer before its committed play begins.',steps:[hovering],viewer:hovering.actor,interaction:'press'});
 examples.push({id:'whole-hand',name:'Complete hand, all four players',hint:'An uninterrupted replay of the same legal intents, from gathering to the next deal.',steps:round,viewer:'you'});
 for(const count of [2,3]){
  let small=initialState();const steps:Step[]=[];
  const actSmall=(actor:string,intent:Intent)=>{const before=small;small=apply(small,actor,intent);const step={before,after:small,actor,intent};steps.push(step);return step;};
  for(let i=0;i<count;i++)actSmall(ids[i],{type:i?'join':'create',name:names[i]});
  const deal=actSmall('you',{type:'begin',seed:`cribbage-${count}-review-v2`});
  add(`deal-${count}`,count===2?'Two players · six cards each':'Three players · a card for the crib',count===2?'Six cards are dealt to each player. Choose two, one at a time, for the crib.':'Five cards each; one extra concealed card is dealt directly to the crib.',deal);
  let discarded=0;
  while(small.phase!=='between'){
   const seat=small.phase==='discard'?discardActor(small):small.turn;
   const step=actSmall(ids[seat],botIntent(small,seat)!);
   if(count===2&&step.intent.type==='discard'&&seat===0&&small.discards[0].length===1){const before=small,after=apply(before,'you',{type:'undo-discard',card:step.intent.card});add('undo-first','Undo the first of two crib cards','Undo stays available without a countdown until the whole crib is ready.',{before,after,actor:'you',intent:{type:'undo-discard',card:step.intent.card},delay:2});}
   if(count===2&&step.intent.type==='accept-crib'){const before=step.before,card=before.discards[0].at(-1)!;add('undo-ready','Undo while the crib is ready','Returning a card cancels the countdown. Completing the crib again starts a fresh five seconds.',{before,after:apply(before,'you',{type:'undo-discard',card}),actor:'you',intent:{type:'undo-discard',card},delay:2});}
   if(count===2&&step.intent.type==='discard'&&seat===0){discarded++;add(`two-discard-${discarded}`,`Two players · ${discarded===1?'first':'second'} crib card`,discarded===1?'The first card lands in the crib; five cards remain and you choose one more.':'The second card lands on top; the remaining four settle into their fan.',step);}
   if(step.after.phase==='count'&&isCribCount(step.after))add(`crib-${count}`,`${count===2?'Two':'Three'} players · reveal the crib`,'After every hand has been counted, the dealer’s four-card crib turns and spreads.',step);
  }
  actSmall(ids[small.turn],{type:'deal'});
  examples.push({id:`whole-hand-${count}`,name:`${count===2?'Two':'Three'} players · complete hand`,hint:'A complete legal hand, including gathering, discards, pegging, counting and the next deal.',steps,viewer:'you'});
 }
 return examples;
}
export const animationExamples=catalogue();
export type Timeline={plans:{plan:Plan;before:State;state:State;start:number;hold:number}[];duration:number;example:Example;viewer:string};
export function buildTimeline(example:Example,viewer:string):Timeline{
 let previous=buildFrame(example.steps[0].before,viewer),duration=0,fullAt=cribComplete(example.steps[0].before)?0:-1;
 const plans=example.steps.map(step=>{
  let hold=step.delay??(step.intent.type==='go'?5:0);
  if(step.intent.type==='accept-crib')hold=Math.max(hold,fullAt+5-duration);
  const start=duration+hold,plan=planMotion(step.before,step.after,viewer,previous);previous=plan.target;
  if(cribComplete(step.after)&&!cribComplete(step.before))fullAt=start;
  if(!cribComplete(step.after))fullAt=-1;
  duration=start+Math.max(plan.duration,example.interaction?1.8:0)+.15;
  return {plan,before:step.before,state:step.after,start,hold};
 });
 return {plans,viewer,duration:example.id==='ready'?0:duration,example};
}
export function timelineAt(timeline:Timeline,time:number){
 const future=timeline.plans.find(p=>p.start>time&&p.start-p.hold<=time);
 const entry=future??timeline.plans.findLast(p=>p.start<=time)??timeline.plans[0];
 const local=Math.max(0,time-entry.start),state=future?entry.before:entry.state;
 const hand=entry.plan.target.cards.find(c=>c.zone==='hand'&&c.owner===timeline.viewer);
 const interaction=timeline.example.interaction?{card:hand?.id??'',hover:local<1.25?interactionLevel(0,1,local-.25):interactionLevel(1,0,local-1.25),press:timeline.example.interaction==='press'?(local<.95?interactionLevel(0,1,local-.6):interactionLevel(1,0,local-.95)):0}:undefined;
 const windows:Windows={discards:state.pendingDiscards};
 if(cribComplete(state)){
  const filled=timeline.plans.findLast(p=>p.start<=time&&cribComplete(p.state)&&!cribComplete(p.before));
  windows.crib={revision:state.revision,deadline:((filled?.start??0)+5)*1000};
 }
 if(state.phase==='pegging'&&legalCards(state,state.turn).length===0){
  const passing=timeline.plans.find(p=>p.before.revision===state.revision&&(p.plan.kind==='go'));
  if(passing)windows.go={seat:state.turn,revision:state.revision,deadline:passing.start*1000};
 }
 return {...entry,state,time:local,interaction,action:countdownAction(state,timeline.viewer,windows,time*1000)};
}
