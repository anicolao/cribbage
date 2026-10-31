import {rank,value} from '../game/cards';
import type {State} from '../game/engine';
import {tablePlayers} from '../game/layout';
import {cardId,pose,type AwardVisual} from './frame';
/** Explain public pegging awards from the transition, without adding outcomes to the log. */
export function peggingAwards(before:State,after:State,viewer:string):AwardVisual[]{
 if(before.phase!=='pegging')return [];
 const awards:{owner:string;points:number;label:string;cards:string[]}[]=[];
 const played=after.plays.length>before.plays.length?after.plays.at(-1):undefined;
 if(played){
  const cards=[...before.segment,played.card],owner=after.players[played.seat].id,total=cards.reduce((n,c)=>n+value(c),0);
  if(total===15||total===31)awards.push({owner,points:2,label:total===15?'Fifteen':'Thirty-one',cards});
  let pairs=1;for(let i=cards.length-2;i>=0&&rank(cards[i])===rank(played.card);i--)pairs++;
  if(pairs>1)awards.push({owner,points:pairs*(pairs-1),label:pairs===2?'Pair':pairs===3?'Three of a kind':'Four of a kind',cards:cards.slice(-pairs)});
  for(let n=cards.length;n>=3;n--){const tail=cards.slice(-n),sorted=tail.map(rank).sort((a,b)=>a-b);if(sorted.every((r,i)=>i===0||r===sorted[i-1]+1)){awards.push({owner,points:n,label:'Run',cards:tail});break;}}
 }
 if(awards.length>1){const combined={...awards[0],points:awards.reduce((n,a)=>n+a.points,0),label:awards.map(a=>a.label).join(' + '),cards:[...new Set(awards.flatMap(a=>a.cards))]};awards.splice(0,awards.length,combined);}
 for(const [i,p] of after.players.entries()){
  const cardPoints=awards.filter(a=>a.owner===p.id).reduce((n,a)=>n+a.points,0);
  if(p.score-before.players[i].score>cardPoints){const last=after.plays.findLast(p=>p.seat===i);if(last)awards.push({owner:p.id,points:1,label:'Last card',cards:[last.card]});}
 }
 return awards.map((a,index)=>{
  const seat=tablePlayers(after,viewer).find(p=>p.id===a.owner)!,own=awards.filter(b=>b.owner===a.owner),order=awards.slice(0,index).filter(b=>b.owner===a.owner).length;
  return {...a,...pose([seat.x+(after.phase==='count'?Math.sign(seat.x)*(order+1)*1.45:(order-(own.length-1)/2)*1.45),.004,seat.z+(seat.z>0?-1.95:1.95)]),id:`${after.round}:pegging:${after.revision}:${index}`,cards:a.cards.map(c=>cardId(after,c))};
 });
}
