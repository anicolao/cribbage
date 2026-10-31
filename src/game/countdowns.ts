import {cribComplete,legalCards,countOwner,isCribCount,type State,type Intent,type PendingDiscard} from './engine';
import {handScore} from './cards';
export const CHOICE_WINDOW_MS=3000;
export const BOT_DELAY_MS=600;
export const HOST_FALLBACK_MS=1000;
type TurnIntent=Extract<Intent,{type:'cut'|'count'|'deal'|'play'}>;
type TurnWindow={seat:number;revision:number;deadline:number;intent:TurnIntent};
export type Windows={discards:PendingDiscard[];crib?:{revision:number;deadline:number};go?:{seat:number;revision:number;deadline:number};turn?:TurnWindow};
export type CountdownAction={kind:'undo'|'go'|'cut'|'count'|'deal'|'play';remaining?:number;fraction?:number;card?:string;points?:number;disabled?:boolean};
export interface ClockStorage{getItem(key:string):string|null;setItem(key:string,value:string):void;}
/** Only mandatory progress and a single legal card can be scheduled. Gathering is a decision. */
export function automaticIntent(state:State):TurnIntent|Extract<Intent,{type:'go'}>|undefined{
 if(state.phase==='cut')return {type:'cut'};
 if(state.phase==='count')return {type:'count'};
 if(state.phase==='between')return {type:'deal'};
 if(state.phase==='pegging'){const cards=legalCards(state,state.turn);if(cards.length===0)return {type:'go'};if(cards.length===1)return {type:'play',card:cards[0]};}
}
function matches(a:Intent|undefined,b:Intent){return a?.type===b.type&&(a.type!=='play'||b.type==='play'&&a.card===b.card);}
/** Presentation deadlines are local and persistent, never part of the intent log. */
export class TableClock{
 private deadlines:Record<string,number>={};
 constructor(private storage:ClockStorage,private key:string){try{const saved=JSON.parse(storage.getItem(key)??'{}');for(const [id,value]of Object.entries(saved))if(typeof value==='number'&&Number.isFinite(value))this.deadlines[id]=value;}catch{}}
 observe(state:State,now:number,ready:boolean):Windows{
  const active=new Set<string>();let changed=false;
  const deadline=(key:string,duration=CHOICE_WINDOW_MS)=>{active.add(key);if(this.deadlines[key]===undefined){this.deadlines[key]=now+duration;changed=true;}return this.deadlines[key];};
  const discards=state.pendingDiscards;
  const crib=state.protocol===3&&cribComplete(state)?{revision:state.revision,deadline:deadline(`crib:${state.round}:${state.revision}`)}:undefined;
  let go:Windows['go'],turn:Windows['turn'];const intent=automaticIntent(state);
  if(intent){
   const key=`${intent.type}:${state.round}:${state.revision}:${state.turn}`;
   if(ready||this.deadlines[key]!==undefined){
    const pending={seat:state.turn,revision:state.revision,deadline:deadline(key,state.players[state.turn].bot?BOT_DELAY_MS:CHOICE_WINDOW_MS)};
    if(intent.type==='go')go=pending;else turn={...pending,intent};
   }
  }
  for(const key of Object.keys(this.deadlines))if(!active.has(key)){delete this.deadlines[key];changed=true;}
  if(changed)try{this.storage.setItem(this.key,JSON.stringify(this.deadlines));}catch{}
  return {discards,crib,go,turn};
 }
}
export function countdownAction(state:State,viewer:string,windows:Windows,now:number,disabled=false):CountdownAction|undefined{
 const seat=state.players.findIndex(p=>p.id===viewer);
 const pending=windows.discards.filter(p=>p.seat===seat).sort((a,b)=>b.revision-a.revision)[0];
 const progress=(deadline:number,duration=CHOICE_WINDOW_MS)=>({remaining:Math.max(0,Math.ceil((deadline-now)/1000)),fraction:Math.max(0,(deadline-now)/duration)});
 if(pending&&(!windows.crib||windows.crib.deadline>now))return {kind:'undo',...(windows.crib?progress(windows.crib.deadline):{remaining:undefined,fraction:undefined}),card:pending.card,disabled};
 const duration=state.players[seat]?.bot?BOT_DELAY_MS:CHOICE_WINDOW_MS;
 if(windows.go?.seat===seat&&windows.go.revision===state.revision&&state.turn===seat&&automaticIntent(state)?.type==='go')return {kind:'go',...progress(windows.go.deadline,duration),disabled};
 const turn=windows.turn;
 if(turn?.seat===seat&&turn.revision===state.revision&&matches(automaticIntent(state),turn.intent))return {kind:turn.intent.type,...progress(turn.deadline,duration),...(turn.intent.type==='play'?{card:turn.intent.card}:{}),...(turn.intent.type==='count'?{points:handScore(isCribCount(state)?state.crib:state.kept[countOwner(state)],state.cut!,isCribCount(state))}:{}),disabled};
}
export function intentForAction(action:CountdownAction|undefined):Intent|undefined{
 if(!action)return;
 if(action.kind==='undo')return action.card?{type:'undo-discard',card:action.card}:undefined;
 if(action.kind==='play')return action.card?{type:'play',card:action.card}:undefined;
 return {type:action.kind};
}
export function automaticChoice(state:State,viewer:string,windows:Windows,now:number):{key:string;actor:string;intent:Intent}|undefined{
 const seat=state.players.findIndex(p=>p.id===viewer),host=viewer===state.host;
 if(windows.crib&&windows.crib.revision===state.revision&&cribComplete(state)&&seat>=0&&now>=windows.crib.deadline+(host?0:HOST_FALLBACK_MS))return {key:`crib:${windows.crib.revision}`,actor:viewer,intent:{type:'accept-crib'}};
 const turn=windows.turn;
 if(turn&&turn.revision===state.revision&&turn.seat===state.turn&&matches(automaticIntent(state),turn.intent)&&now>=turn.deadline&&(seat===turn.seat||host&&state.players[turn.seat].bot))return {key:`${turn.intent.type}:${turn.revision}`,actor:state.players[turn.seat].id,intent:turn.intent};
 const go=windows.go;if(!go||state.phase!=='pegging'||go.revision!==state.revision||go.seat!==state.turn||legalCards(state,state.turn).length)return;
 const player=state.players[go.seat],owns=go.seat===seat;
 if(now>=go.deadline&&(owns||host&&player.bot))return {key:`go:${go.revision}`,actor:player.id,intent:{type:'go'}};
 if(host&&state.protocol===3&&now>=go.deadline+HOST_FALLBACK_MS)return {key:`go:${go.revision}`,actor:viewer,intent:{type:'auto-go',player:player.id}};
}
