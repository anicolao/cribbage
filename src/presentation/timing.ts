import type {Plan} from './motion';
/** Retiming changes motion only: holds and automatic-turn deadlines keep real seconds. */
export function retimePlan(plan:Plan,rate:number):Plan{
 if(rate===1)return plan;
 const tracks=<T extends {segments:{start:number;duration:number}[];appear?:number}>(items:T[])=>items.map(item=>({...item,...(item.appear===undefined?{}:{appear:item.appear/rate}),segments:item.segments.map(s=>({...s,start:s.start/rate,duration:s.duration/rate}))}));
 return {...plan,rate:(plan.rate??1)*rate,duration:plan.duration/rate,cards:tracks(plan.cards),plates:tracks(plan.plates),pegs:tracks(plan.pegs),counts:tracks(plan.counts),awards:tracks(plan.awards)};
}
/** Keep the same pose when a player changes speed during a flight. */
export function retimedStart(start:number,now:number,oldRate:number,newRate:number){return now-(now-start)*oldRate/newRate;}
