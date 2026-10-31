import {deck,handScore,playScore,value} from './cards';
import {countOwner,legalCards,type State,type Intent} from './engine';
/** Reads its own hand and public play only. Tie breaks are deterministic. */
export function botIntent(state:State,seat:number):Intent|null{
 if(state.phase==='discard'&&state.discards[seat]===null){
  const hand=state.hands[seat],cuts=deck.filter(card=>!hand.includes(card));
  const choices=hand.map(card=>({card,score:cuts.reduce((sum,cut)=>sum+handScore(hand.filter(c=>c!==card),cut),0)/cuts.length+(seat===state.dealer?.04:-.04)*value(card)}));
  choices.sort((a,b)=>b.score-a.score||a.card.localeCompare(b.card));return {type:'discard',card:choices[0].card};
 }
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
