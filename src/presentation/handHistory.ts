import {countOwner,isCribCount,cribCards,type State,type Intent} from '../game/engine';
import {handScore,type Card} from '../game/cards';
export type CountedHand={owner:string;name:string;seat:number;kind:'hand'|'crib';cards:Card[];points:number;pegging:number;heels:number;revision:number};
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
  // A count becomes public when its cards are revealed on the table, before
  // the separate Peg intent awards it. The crib remains concealed until its turn.
  if(after.phase==='count'&&after.cut){
   const seat=countOwner(after),player=after.players[seat],crib=isCribCount(after),kind=crib?'crib':'hand',cards=crib?cribCards(after):after.kept[seat];
   if(!this.pending){
    this.pending={id:`${this.start}:${after.round}`,game:this.match,round:after.round+1,starter:after.cut,hands:[],revision:after.revision};
    this.rounds.push(this.pending);
   }
   if(!this.pending.hands.some(hand=>hand.owner===player.id&&hand.kind===kind))this.pending.hands.push({owner:player.id,name:player.name,seat,kind,cards:[...cards],points:handScore(cards,after.cut,crib),pegging:crib?0:this.pegging[seat]??0,heels:crib?0:this.heels[seat]??0,revision:after.revision});
  }
 }
}
