import {cribComplete,legalCards,type State,type Intent,type PendingDiscard} from './engine';
export const CHOICE_WINDOW_MS=5000;
export const HOST_FALLBACK_MS=1000;
export type Windows={discards:PendingDiscard[];crib?:{revision:number;deadline:number};go?:{seat:number;revision:number;deadline:number}};
export type CountdownAction={kind:'undo'|'go';remaining?:number;fraction?:number;card?:string;disabled?:boolean};
export interface ClockStorage{getItem(key:string):string|null;setItem(key:string,value:string):void;}
/** Presentation deadlines are local and persistent, never part of the intent log. */
export class TableClock{
 private deadlines:Record<string,number>={};
 constructor(private storage:ClockStorage,private key:string){try{const saved=JSON.parse(storage.getItem(key)??'{}');for(const [id,value]of Object.entries(saved))if(typeof value==='number'&&Number.isFinite(value))this.deadlines[id]=value;}catch{}}
 observe(state:State,now:number,goReady:boolean):Windows{
  const active=new Set<string>();let changed=false;
  const deadline=(key:string)=>{active.add(key);if(this.deadlines[key]===undefined){this.deadlines[key]=now+CHOICE_WINDOW_MS;changed=true;}return this.deadlines[key];};
  const discards=state.pendingDiscards;
  const crib=state.protocol===3&&cribComplete(state)?{revision:state.revision,deadline:deadline(`crib:${state.round}:${state.revision}`)}:undefined;
  let go:Windows['go'];
  if(state.phase==='pegging'&&legalCards(state,state.turn).length===0){
   const key=`go:${state.round}:${state.revision}:${state.turn}`;
   if(goReady||this.deadlines[key]!==undefined)go={seat:state.turn,revision:state.revision,deadline:deadline(key)};
  }
  for(const key of Object.keys(this.deadlines))if(!active.has(key)){delete this.deadlines[key];changed=true;}
  if(changed)try{this.storage.setItem(this.key,JSON.stringify(this.deadlines));}catch{}
  return {discards,crib,go};
 }
}
export function countdownAction(state:State,viewer:string,windows:Windows,now:number,disabled=false):CountdownAction|undefined{
 const seat=state.players.findIndex(p=>p.id===viewer);
 const pending=windows.discards.filter(p=>p.seat===seat).sort((a,b)=>b.revision-a.revision)[0];
 if(pending&&(!windows.crib||windows.crib.deadline>now))return {kind:'undo',remaining:windows.crib?Math.ceil((windows.crib.deadline-now)/1000):undefined,fraction:windows.crib?Math.max(0,(windows.crib.deadline-now)/CHOICE_WINDOW_MS):undefined,card:pending.card,disabled};
 if(windows.go?.seat===seat)return {kind:'go',remaining:Math.max(0,Math.ceil((windows.go.deadline-now)/1000)),fraction:Math.max(0,(windows.go.deadline-now)/CHOICE_WINDOW_MS),disabled};
}
export function automaticChoice(state:State,viewer:string,windows:Windows,now:number):{key:string;actor:string;intent:Intent}|undefined{
 const seat=state.players.findIndex(p=>p.id===viewer),host=viewer===state.host;
 if(windows.crib&&seat>=0&&now>=windows.crib.deadline+(host?0:HOST_FALLBACK_MS))return {key:`crib:${windows.crib.revision}`,actor:viewer,intent:{type:'accept-crib'}};
 const go=windows.go;if(!go)return;
 const player=state.players[go.seat],owns=go.seat===seat;
 if(now>=go.deadline&&(owns||host&&player.bot))return {key:`go:${go.revision}`,actor:player.id,intent:{type:'go'}};
 if(host&&state.protocol===3&&now>=go.deadline+HOST_FALLBACK_MS)return {key:`go:${go.revision}`,actor:viewer,intent:{type:'auto-go',player:player.id}};
}
