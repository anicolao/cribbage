import {seats,fanCard,type Position} from '../table';
import {playedCard} from '../sceneLayout';
import type {State} from './engine';
export function tablePlayers(game:State,viewer:string){
 const own=Math.max(0,game.players.findIndex(p=>p.id===viewer));
 return game.players.map((player,index)=>{
  const count=game.players.length,relative=(index-own+count)%count,lane=count===2?relative*2:[0,3,2,1][relative],place=seats[lane];
  return {...player,index,lane,x:place.x,z:place.z,rotation:place.rotation,color:seats[index].color,cards:game.hands[index]};
 });
}
export function heldPose(index:number,count:number){return fanCard(index-(count-4)/2);}
export function publicPose(order:number,lane:number,counting=false){
 if(counting)return {position:[(order-1.5)*1.48,.025,-.5] as Position,rotation:0};
 return playedCard(3-order,lane);
}
