import {countOwner,isCribCount,cribCards,type State,type Intent} from '../game/engine';
import {handScore,type Card} from '../game/cards';
export type CountedHand={owner:string;name:string;seat:number;kind:'hand'|'crib';cards:Card[];points:number;pegging:number;heels:number};
export type HistoryRound={id:string;game:number;round:number;starter:Card;hands:CountedHand[];revision:number};
/** Reconstruct public scoring history in the existing replay pass. Nothing is persisted. */
export class HandHistory{
 readonly rounds:HistoryRound[]=[];
 private match=0;
 private start=0;
 private pending:HistoryRound|undefined;
 private pegging:number[]=[];
 private heels:number[]=[];
 observe(before:State,after:State,intent:Intent){
  if(intent.type==='begin'){this.match++;this.start=after.revision;this.pending=undefined;this.pegging=[];this.heels=[];}
  if(intent.type==='deal'){this.pending=undefined;this.pegging=[];this.heels=[];}
  if(intent.type==='cut'||before.phase==='pegging'){
   const points=intent.type==='cut'?this.heels:this.pegging;
   after.players.forEach((player,i)=>points[i]=(points[i]??0)+Math.max(0,player.score-(before.players[i]?.score??0)));
  }
  if(intent.type==='count'&&before.cut){
   const seat=countOwner(before),player=before.players[seat],crib=isCribCount(before),cards=crib?cribCards(before):before.kept[seat];
   this.pending??={id:`${this.start}:${before.round}`,game:this.match,round:before.round+1,starter:before.cut,hands:[],revision:0};
   this.pending.hands.push({owner:player.id,name:player.name,seat,kind:crib?'crib':'hand',cards:[...cards],points:handScore(cards,before.cut,crib),pegging:crib?0:this.pegging[seat]??0,heels:crib?0:this.heels[seat]??0});
  }
  if((after.phase==='between'||after.phase==='finished')&&this.pending&&!this.pending.revision){
   this.pending.revision=after.revision;this.rounds.push(this.pending);
  }
 }
}
