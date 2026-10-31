import { CARD_DEPTH, STACK_STEP, seats, fanCard, ease, type Position } from './table';
export const CARD_WIDTH=1.38;
export const CARD_HEIGHT=2;
export const BOARD_ROTATION=Math.PI/2+.08;
export const DECK_LAYERS=14;
export const DECK_POSITION:Position=[-7.35,.02,-.3];
export const STARTER_POSITION:Position=[DECK_POSITION[0]+.035,DECK_POSITION[1]+(DECK_LAYERS-1)*STACK_STEP+CARD_DEPTH+.006,DECK_POSITION[2]+.025];
export const CRIB_POSITION:Position=[7.35,.025,.3];
export const CRIB_OWNER=seats.find(seat=>seat.id==='jules')!;
export const PEGGING_PLAY_INTERVAL=.65;
export const PEGGING_DURATION=15*PEGGING_PLAY_INTERVAL+.8;
export function displayedScore(lane:number,scenario:string,time:number){return seats[lane].score+(lane===0&&scenario==='peg'&&time>=1.7?12:0);}
export type CardPose={position:Position;rotation:number;faceUp:boolean;location:'hand'|'played'|'counting'};
export function inwardSign(lane:number){return (seats[lane].x<0?1:-1)*(lane>=2?-1:1);}
export function playedCard(index:number,lane=0):{position:Position;rotation:number}{
 const order=3-index;
 // Seat-local X always runs left to right, including the opposite seats.
 // Leave room beside the private fan, then raise each successive card.
 const left=inwardSign(lane)>0?2.1:-4.05;
 return {position:[left+order*.65,.025+order*STACK_STEP,-1.1],rotation:0};
}
export function cardPose(scenario:string,time:number,lane:number,index:number):CardPose{
 const fan=fanCard(index),seat=seats[lane];
 const afterPegging=scenario==='pegging-complete'||scenario==='peg'||scenario.startsWith('count-');
 let position:Position=[...fan.position],rotation=fan.rotation,faceUp=lane===0,location:CardPose['location']='hand';
 if(afterPegging){
  const played=playedCard(index,lane);position=[...played.position];rotation=played.rotation;faceUp=true;location='played';
  if(scenario===`count-${seat.id}`){
   const p=ease(time/1.1),drop=ease((p-.88)/.12);
   position=[position[0]+(((3-index)-1.5)*1.48-position[0])*p,position[1]+(.025-position[1])*drop+Math.sin(p*Math.PI)*.25,position[2]+(-.5-position[2])*p];
   location='counting';
  }
 }else if(scenario==='deal'){
  const p=ease((time-(index*4+lane)*.1)/.8),sign=lane>=2?-1:1;
  const from:Position=[(DECK_POSITION[0]-seat.x)*sign,.3,(DECK_POSITION[2]-seat.z)*sign];
  position=[from[0]+(position[0]-from[0])*p,from[1]+(position[1]-from[1])*p+Math.sin(p*Math.PI)*1.3,from[2]+(position[2]-from[2])*p];rotation*=p;
 }else if(scenario==='pegging'||((scenario==='play'&&lane===0||scenario===`play-${seat.id}`)&&index===3)){
  const start=scenario==='pegging'?((3-index)*4+lane)*PEGGING_PLAY_INTERVAL:0;
  if(time>start){
   const p=ease((time-start)/(scenario==='pegging'?.8:1.2)),end=playedCard(index,lane).position;
   position=[position[0]+(end[0]-position[0])*p,position[1]+(end[1]-position[1])*p+Math.sin(p*Math.PI)*.55,position[2]+(end[2]-position[2])*p];rotation*=1-p;faceUp=true;location='played';
  }
 }
 return {position,rotation,faceUp,location};
}
