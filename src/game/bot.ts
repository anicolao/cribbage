import {deck,handScore,playScore,value} from './cards';
import {countOwner,legalCards,needsDiscard,type State,type Intent} from './engine';
/** Reads its own hand and public play only. Tie breaks are deterministic. */
export function botIntent(state:State,seat:number):Intent|null{
 if(needsDiscard(state,seat)){
  const hand=state.hands[seat],known=[...hand,...state.discards[seat]],cuts=deck.filter(card=>!known.includes(card));
  const choices:{card:string;score:number}[]=[];
  for(let i=0;i<hand.length;i++)for(let j=hand.length===6?i+1:hand.length;j<=hand.length-(hand.length===6?1:0);j++){
   const discarded=hand.length===6?[hand[i],hand[j]]:[hand[i]],kept=hand.filter(card=>!discarded.includes(card));
   choices.push({card:hand[i],score:cuts.reduce((sum,cut)=>sum+handScore(kept,cut),0)/cuts.length+(seat===state.dealer?.04:-.04)*discarded.reduce((sum,card)=>sum+value(card),0)});
  }
  choices.sort((a,b)=>b.score-a.score||a.card.localeCompare(b.card));return {type:'discard',card:choices[0].card};
 }
 if(state.phase==='discard'&&state.pendingDiscards.length&&!state.players.some((_,i)=>needsDiscard(state,i)))return {type:'accept-crib'};
 if(state.turn!==seat)return null;
 if(state.phase==='cut')return {type:'cut'};
 if(state.phase==='pegging'){
  const cards=legalCards(state,seat).map(card=>({card,score:playScore(state.segment,card)*100-([5,21].includes(state.total+value(card))?20:0)-value(card)}));
  cards.sort((a,b)=>b.score-a.score||a.card.localeCompare(b.card));return cards.length?{type:'play',card:cards[0].card}:{type:'go'};
 }
 if(state.phase==='count'&&countOwner(state)===seat)return {type:'count'};
 if(state.phase==='between')return {type:'deal'};
 return null;
}
