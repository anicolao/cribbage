export const ranks=['ace','2','3','4','5','6','7','8','9','10','jack','queen','king'] as const;
export const suits=['clubs','diamonds','hearts','spades'] as const;
export const deck=suits.flatMap(suit=>ranks.map(rank=>`${rank}_of_${suit}`));
export type Card=string;
export const rank=(card:Card)=>ranks.indexOf(card.split('_')[0] as typeof ranks[number])+1;
export const value=(card:Card)=>Math.min(10,rank(card));
export const suit=(card:Card)=>card.split('_')[2];
export const cardName=(card:Card)=>card.replaceAll('_',' ').replace(/^\w/,c=>c.toUpperCase());
export function handScore(hand:Card[],cut:Card,crib=false){
 const cards=[...hand,cut];let points=0;
 for(let mask=1;mask<32;mask++){
  const subset=cards.filter((_,i)=>mask&(1<<i));
  if(subset.reduce((n,c)=>n+value(c),0)===15)points+=2;
 }
 for(let i=0;i<5;i++)for(let j=i+1;j<5;j++)if(rank(cards[i])===rank(cards[j]))points+=2;
 for(let length=5;length>=3;length--){
  let runs=0;
  for(let mask=1;mask<32;mask++){
   const sorted=cards.filter((_,i)=>mask&(1<<i)).map(rank).sort((a,b)=>a-b);
   if(sorted.length===length&&sorted.every((r,i)=>i===0||r===sorted[i-1]+1))runs++;
  }
  if(runs){points+=runs*length;break;}
 }
 if(hand.every(c=>suit(c)===suit(hand[0]))){if(suit(cut)===suit(hand[0]))points+=5;else if(!crib)points+=4;}
 if(hand.some(c=>rank(c)===11&&suit(c)===suit(cut)))points++;
 return points;
}
export function playScore(segment:Card[],card:Card){
 const cards=[...segment,card],total=cards.reduce((n,c)=>n+value(c),0);
 let points=total===15||total===31?2:0,pairs=1;
 for(let i=cards.length-2;i>=0&&rank(cards[i])===rank(card);i--)pairs++;
 points+=pairs*(pairs-1);
 for(let length=cards.length;length>=3;length--){
  const sorted=cards.slice(-length).map(rank).sort((a,b)=>a-b);
  if(sorted.every((r,i)=>i===0||r===sorted[i-1]+1)){points+=length;break;}
 }
 return points;
}
