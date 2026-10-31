import {handScore} from '../game/cards';
import {countOwner,needsDiscard,isCribCount,cribCards,type State} from '../game/engine';
import {tablePlayers,heldPose,publicPose} from '../game/layout';
import {seats,trackPoint,type Position,STACK_STEP} from '../table';
import {BOARD_ROTATION,DECK_POSITION,DECK_LAYERS,STARTER_POSITION,CRIB_POSITION} from '../sceneLayout';
export type Pose={position:Position;rotation:number;flip:number;scale:number;glow:number};
export type CardVisual=Pose&{id:string;card:string;owner:string;zone:'deck'|'hand'|'played'|'crib'|'cut';order:number};
export type PlateVisual=Pose&{id:string;name:string;score?:number;color?:string};
export type PegVisual=Pose&{id:string;owner:string;color:string;score:number};
export type CountVisual=Pose&{id:string;owner:string;points:number;kind:'hand'|'crib';cards:string[];awarded:boolean};
export type Status={primary:string;secondary:string;opacity:number};
export function statusFor(game:State,viewer:string):Status{
 const own=game.players.findIndex(p=>p.id===viewer),name=game.players[game.turn]?.name??'';
 const primary=game.phase==='gathering'?'':game.phase==='discard'?(own>=0&&needsDiscard(game,own)?(game.hands[own].length===6?'Choose two for the crib':game.discards[own].length?'Choose one more for the crib':'Choose one for the crib'):'Waiting for the crib'):game.phase==='cut'?`${name} to cut`:game.phase==='pegging'?`${game.total} · ${own===game.turn?'Your turn':name+' to play'}`:game.phase==='count'?`${name}${isCribCount(game)?'’s crib':'’s hand'}`:game.phase==='between'?`${name} to deal`:game.message;
 return {primary,secondary:game.message&&game.message!==primary&&!['discard','count','between'].includes(game.phase)?game.message:'',opacity:1};
}
export type Frame={status:Status;revision:number;cards:CardVisual[];plates:PlateVisual[];pegs:PegVisual[];counts:CountVisual[]};
export const pose=(position:Position,rotation=0,flip=0):Pose=>({position,rotation,flip,scale:1,glow:0});
export function rotate(position:Position,angle:number):Position{return [Math.cos(angle)*position[0]+Math.sin(angle)*position[2],position[1],-Math.sin(angle)*position[0]+Math.cos(angle)*position[2]];}
export function cardId(game:State,card:string){return `${game.round}:${card}`;}
export function pegPosition(score:number,lane:number):Position{const p=trackPoint(score,lane);return rotate([p[0],.467,p[1]],BOARD_ROTATION);}
export function buildFrame(game:State,viewer:string,prior?:Frame):Frame{
 const frame:Frame={status:statusFor(game,viewer),revision:game.revision,cards:[],plates:[],pegs:[],counts:[]};
 for(let i=0;i<DECK_LAYERS;i++)frame.cards.push({...pose([DECK_POSITION[0]+i*.001,DECK_POSITION[1]+i*STACK_STEP,DECK_POSITION[2]]),id:`deck-${i}`,card:'back',owner:'',zone:'deck',order:i});
 for(const seat of tablePlayers(game,viewer)){
  const place=(position:Position)=>{const p=rotate(position,seat.rotation);return [seat.x+p[0],p[1],seat.z+p[2]] as Position;};
  seat.cards.forEach((card,index)=>{const held=heldPose(index,seat.cards.length);frame.cards.push({...pose(place(held.position),seat.rotation+held.rotation,seat.id===viewer?0:Math.PI),id:cardId(game,card),card,owner:seat.id,zone:'hand',order:index});});
  game.plays.filter(play=>play.seat===seat.index).forEach((play,order)=>{const played=publicPose(order,seat.lane,game.phase==='count'&&game.turn===seat.index&&!isCribCount(game));frame.cards.push({...pose(place(played.position),seat.rotation),id:cardId(game,play.card),card:play.card,owner:seat.id,zone:'played',order});});
  const counting=game.phase==='count'&&!isCribCount(game)&&game.turn===seat.index;
  frame.plates.push({...pose([seat.x,.012,seat.z+(seat.lane>=2?-1:1)*(counting?.95:1.7)]),id:seat.id,name:seat.name,score:seat.score,color:seat.color});
  const previous=prior?.pegs.filter(p=>p.owner===seat.id);
  // The rear physical peg leapfrogs the front; peg identity never swaps at a score update.
  const front=previous?.find(p=>p.score===seat.score)??previous?.find(p=>p.score!==seat.previous);
  const frontId=front?.id??`${seat.id}:a`;
  for(const [id,score] of [[frontId,seat.score],[frontId.endsWith(':a')?`${seat.id}:b`:`${seat.id}:a`,seat.previous]] as const){frame.pegs.push({...pose(pegPosition(score,seat.index)),id,owner:seat.id,color:seat.color,score});}
 }
 const crib=cribCards(game),current=crib.map(card=>cardId(game,card));
 const order=[...(prior?.cards.filter(c=>c.zone==='crib'&&current.includes(c.id)).sort((a,b)=>a.order-b.order).map(c=>c.id)??[]),...current.filter(id=>!prior?.cards.some(c=>c.zone==='crib'&&c.id===id))];
 order.forEach((id,i)=>{const card=crib.find(c=>cardId(game,c)===id)!;const counting=game.phase==='count'&&isCribCount(game);frame.cards.push({...pose([CRIB_POSITION[0]+(counting?.15+(i-1.5)*.65:.06*i-.09),CRIB_POSITION[1]+i*STACK_STEP,CRIB_POSITION[2]],0,counting?0:Math.PI),id,card,owner:game.players[game.discards.findIndex(cards=>cards.includes(card))]?.id??'',zone:'crib',order:i});});
 if(game.cut)frame.cards.push({...pose([...STARTER_POSITION],-.02),id:cardId(game,game.cut),card:game.cut,owner:'',zone:'cut',order:0});
 if(game.phase!=='gathering')frame.plates.push({...pose([CRIB_POSITION[0],.012,CRIB_POSITION[2]+1.65]),id:'crib-label',name:`${game.players[game.dealer].name}'s Crib`});
 if(game.cut&&(game.phase==='count'||game.phase==='between')){
  const index=Math.min(game.countIndex,game.players.length),crib=index===game.players.length,owner=crib?game.dealer:(game.dealer+1+index)%game.players.length;
  const seat=tablePlayers(game,viewer).find(p=>p.index===owner)!,cards=crib?game.crib:game.kept[owner];
  const position:Position=crib?[CRIB_POSITION[0]+.15,.004,CRIB_POSITION[2]-1.5]:[seat.x,.004,seat.z+(seat.z>0?-1.95:1.95)];
  frame.counts.push({...pose(position),id:`${game.round}:count:${index}`,owner:seat.id,points:handScore(cards,game.cut,crib),kind:crib?'crib':'hand',cards:cards.map(c=>cardId(game,c)),awarded:game.phase==='between'});
 }else if(game.phase==='finished'&&prior?.counts.length)frame.counts=prior.counts.map(c=>({...c,scale:1,awarded:true}));
 return frame;
}
export type CardControl={id:string;card:string;label:string;enabled:boolean;x:number;y:number};
