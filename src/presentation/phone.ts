import type {State} from '../game/engine';
import {tablePlayers} from '../game/layout';
import {STARTER_POSITION} from '../sceneLayout';
import {board29Point,BOARD29_Z,BOARD29_LANDSCAPE_Z} from '../board29';
import {pose,rotate,type Frame,type Pose,type CardVisual} from './frame';
import type {Plan} from './motion';
import type {Position} from '../table';
// First phone composition: retain the actual pieces and replay, rearrange their destinations.
const CARD_SCALE=1.18;
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
const mix=(a:Position,b:Position,t:number)=>a.map((v,i)=>lerp(v,b[i],t)) as Position;
export function phonePlan(plan:Plan,game:State,viewer:string,orientation:'portrait'|'landscape'):Plan{
 const landscape=orientation==='landscape';
 const deckAnchor:Position=landscape?[-1.7,STARTER_POSITION[1]*CARD_SCALE,-5.5]:[-3.15,STARTER_POSITION[1]*CARD_SCALE,3.6];
 const players=tablePlayers(game,viewer),own=players.find(p=>p.id===viewer);
 const area=(owner:string)=>{
  const player=players.find(p=>p.id===owner),relative=player?(player.index-(own?.index??0)+players.length)%players.length:0;
  if(landscape){
   // Anchor the viewer at the right thumb; rotate the other seats clockwise.
   const corner=((players.length===2?relative*2:relative)+3)%4;
   const near=corner===0||corner===3,x=(corner<2?-1:1)*(near?4.9:7.2),z=near?1.4:-5.2;
   return {x,z,fanSpacing:players.length===2?.6:.8,playedX:(x<0?-1:1)*(near?1.7:7.2),playedZ:near?2.4:-2.1};
  }
  if(relative===0)return {x:0,z:7.9,fanSpacing:1.18,playedX:0,playedZ:5.5};
  if(players.length===3)return {x:relative===1?-2.8:2.8,z:-7.1,fanSpacing:.8,playedX:relative===1?-2.8:2.8,playedZ:-5.1};
  if(players.length===2)return {x:0,z:-7.5,fanSpacing:.8,playedX:0,playedZ:-4.9};
  const x=relative===1?-3.9:relative===2?0:3.9;return {x,z:-7.5,fanSpacing:.72,playedX:x,playedZ:-4.9};
 };

 function card(c:CardVisual,counting=false,cribCounting=false,handOwner?:string,inCount=false):CardVisual{
  const focus=handOwner?area(handOwner):undefined,deckPosition:Position=deckAnchor;
  if(c.zone==='deck'||c.zone==='cut')return {...c,position:[deckPosition[0]+(c.position[0]-STARTER_POSITION[0])*CARD_SCALE,c.position[1]*CARD_SCALE,deckPosition[2]+(c.position[2]-STARTER_POSITION[2])*CARD_SCALE],rotation:0,scale:c.scale*CARD_SCALE};
  if(c.zone==='crib'){
   const counting=c.flip<Math.PI/2;
   if(landscape){const lifted=focus&&focus.z>0&&focus.x>0;return {...c,position:[counting?(c.order-1.5)*1.4*CARD_SCALE:1.7+(c.order-1.5)*.045,c.position[1]*CARD_SCALE,counting?2.4:-5.5],rotation:0,scale:c.scale*CARD_SCALE};}
   return {...c,position:[counting?2.1+(c.order-1.5)*.53*CARD_SCALE:3.15+(c.order-1.5)*.045,c.position[1]*CARD_SCALE,counting?3.45:3.1],rotation:0,scale:c.scale*CARD_SCALE};
  }
  const a=area(c.owner),player=players.find(p=>p.id===c.owner);
  if(c.zone==='hand'){
   const local=rotate([c.position[0]-(player?.x??0),c.position[1],c.position[2]-(player?.z??0)],-(player?.rotation??0));
   return {...c,position:[a.x+local[0]*a.fanSpacing*(landscape?1.7:1),local[1]*CARD_SCALE,a.z+local[2]*a.fanSpacing-(landscape&&a.z>0?.35:0)],rotation:(c.rotation-(player?.rotation??0))*(landscape?.55:1),scale:c.scale*CARD_SCALE};
  }
  const count=plan.target.cards.filter(p=>p.zone==='played'&&p.owner===c.owner).length,own=a.z>0;
  if(landscape){
   const sign=a.x<0?-1:1;
   const x=counting?(own?sign*5.25+(c.order%2-.5)*1.75:sign*6.3+(c.order-1.5)*1.4*CARD_SCALE):(inCount?a.x:a.playedX)+(c.order-(count-1)/2)*.28*CARD_SCALE;
   const z=counting?(own?-.9+Math.floor(c.order/2)*2.45:-4):inCount?a.z:a.playedZ;
   return {...c,position:[x,c.position[1]*CARD_SCALE,z],rotation:0,scale:c.scale*CARD_SCALE};
  }
  const x=counting?(own?(c.order-(count-1)/2)*1.4*CARD_SCALE:(c.order%2-.5)*1.75):(c.order-(count-1)/2)*.53*CARD_SCALE;
  return {...c,position:[(own&&(counting||cribCounting)?0:a.playedX)+x,c.position[1]*CARD_SCALE,counting?(own?7.1:a.playedZ-2.5+Math.floor(c.order/2)*2.5):own&&cribCounting?7.1:a.playedZ],rotation:0,scale:c.scale*CARD_SCALE};
 }
 function frame(f:Frame):Frame{return {...f,cards:f.cards.map(c=>card(c,f.counts.some(p=>p.kind==='hand'&&p.owner===c.owner),f.counts.some(p=>p.kind==='crib'),f.counts.find(p=>p.kind==='hand')?.owner,f.counts.length>0)),pegs:f.pegs.map(p=>{const q=board29Point(p.score,Math.max(0,game.players.findIndex(player=>player.id===p.owner)));return {...p,position:[q[0],.467,q[1]+(landscape?BOARD29_LANDSCAPE_Z:BOARD29_Z)] as Position,scale:p.scale*.9};}),plates:f.plates.map(p=>{
  if(p.id==='crib-label'){const counting=f.counts.some(c=>c.kind==='crib');if(landscape){const focus=f.counts.find(c=>c.kind==='hand'),a=focus?area(focus.owner):undefined,lifted=a&&a.z>0&&a.x>0;return {...p,position:[1.7,p.position[1],-3.8],scale:counting?0:p.scale*.5};}return {...p,position:[counting?2.1:3.15,p.position[1],counting?5.7:4.65],scale:p.scale*(counting?.55:.63)};}
  const a=area(p.id);if(landscape)return {...p,position:[a.z>0?Math.sign(a.x)*5:a.x,p.position[1],a.z>0?3.2:-8.5],scale:p.scale*(a.z>0?.75:1)};return {...p,position:[a.x,p.position[1],a.z+(a.x===0&&a.z>0?1.75:-1.75)],scale:p.scale*(a.x===0&&a.z>0?1.1:.72)};
 }),counts:f.counts.map(p=>{const a=area(p.owner);if(landscape)return {...p,position:p.kind==='crib'?[5.3,.004,-.8]:[Math.sign(a.x)*(a.z>0?5.25:7.5),.004,a.z>0?-2.55:-1.95],scale:p.scale};return {...p,position:p.kind==='crib'?[2.1,.004,4.95]:[a.z>0?0:a.playedX,.004,a.z>0?8.65:a.playedZ+1.85],scale:p.scale*(a.x===0?1:.7)};}),awards:f.awards.map(p=>{const a=area(p.owner);if(landscape)return {...p,position:[a.playedX,.004,a.z>0?1.15:-3.75],scale:p.scale};return {...p,position:[a.z>0?-2.7:a.playedX,.004,a.playedZ+(a.z>0?0:-1.2)],scale:p.scale*(a.x===0?1:.7)};})};}
 // Landscape uses roomier world-space regions, independent of the portrait composition.
 // The 2.95-scale cards are identical in every hand, pile, and animation endpoint.
 function composed(f:Frame):Frame{
  if(!landscape)return frame(f);
  const scale=CARD_SCALE*2.5,handCount=f.counts.find(c=>c.kind==='hand'),cribCount=f.counts.some(c=>c.kind==='crib');
  const seat=(owner:string)=>{const a=area(owner),sign=Math.sign(a.x);return {sign,near:a.z>0,x:sign*(a.z>0?12:15),z:a.z>0?4.3:-10,playedX:sign*(a.z>0?3.5:13),playedZ:a.z>0?5.2:-2.3};};
  const cards=f.cards.map(c=>{
   const a=seat(c.owner),player=players.find(p=>p.id===c.owner);
   let x=0,z=0,rotation=0;
   if(c.zone==='deck'||c.zone==='cut'){
    x=(cribCount?-15:-3.3)+(c.position[0]-STARTER_POSITION[0])*scale;
    z=(cribCount?-2.3:-11)+(c.position[2]-STARTER_POSITION[2])*scale;
   }else if(c.zone==='crib'){
    x=cribCount?(c.order-1.5)*4.6:3.3+(c.order-1.5)*.12;z=cribCount?-10:-11;
   }else if(c.zone==='hand'){
    const local=rotate([c.position[0]-(player?.x??0),c.position[1],c.position[2]-(player?.z??0)],-(player?.rotation??0));
    const spread=players.length===2?1.75:2.45;
    x=a.x+local[0]*spread;z=a.z+local[2]*spread;
    rotation=(c.rotation-(player?.rotation??0))*.55;
   }else if(handCount?.owner===c.owner){
    x=a.sign*11.5+(c.order%2-.5)*4.6;z=(a.near?-2:-9.5)+Math.floor(c.order/2)*6.5;
   }else{
    x=(f.counts.length?a.x:a.playedX)+(c.order-1.5)*.72;z=f.counts.length?a.z:a.playedZ;
   }
   return {...c,position:[x,c.position[1]*scale,z] as Position,rotation,scale:c.scale*scale};
  });
  return {...f,cards,pegs:f.pegs.map(p=>{const q=board29Point(p.score,Math.max(0,game.players.findIndex(player=>player.id===p.owner)));return {...p,position:[q[0]*1.4,.467*1.4,q[1]*1.4+BOARD29_LANDSCAPE_Z] as Position,scale:p.scale*.9*1.4};}),plates:f.plates.map(p=>{
   if(p.id==='crib-label')return {...p,position:[3.3,p.position[1],-7.2] as Position,scale:cribCount?0:p.scale*.9};
   const a=seat(p.id);return {...p,position:[a.x,p.position[1],a.near?8.8:-14.4] as Position,scale:p.scale*(a.near?1.45:1.8)};
  }),counts:f.counts.map(p=>{const a=seat(p.owner);return {...p,position:p.kind==='crib'?[0,.004,-14.3] as Position:a.near?[a.sign*11.5,.004,-6.3] as Position:[a.sign*9.5,.004,-14.4] as Position};}),awards:f.awards.map(p=>{const a=seat(p.owner);return {...p,position:[a.playedX,.004,a.playedZ-3.7] as Position};})};
 }
 const from=composed(plan.from),target=plan.target===plan.from?from:composed(plan.target);
 function tracks<T extends Pose&{id:string}>(items:{item:T;segments:{from:Pose;to:Pose;start:number;duration:number;lift:number}[]}[],old:T[],next:T[],mappedOld:T[],mappedNext:T[],cards=false){
  return items.map(track=>{
   const a=old.find(p=>p.id===track.item.id),b=next.find(p=>p.id===track.item.id);
   const pegOwner='score' in track.item&&'owner' in track.item?track.item.owner:undefined;
   const sourcePlate=!a&&pegOwner?plan.target.plates.find(p=>p.id===pegOwner):undefined;
   const mappedPlate=sourcePlate?target.plates.find(p=>p.id===sourcePlate.id):undefined;
   const spawn=cards?{...pose([...STARTER_POSITION],0,Math.PI),position:[...STARTER_POSITION] as Position}:sourcePlate??b??a??track.item;
   const ma=mappedOld.find(p=>p.id===track.item.id),mb=mappedNext.find(p=>p.id===track.item.id);
   const mappedSpawn=cards?{...spawn,position:landscape?[-3.3,deckAnchor[1]*2.5,-11] as Position:[...deckAnchor] as Position,scale:CARD_SCALE*(landscape?2.5:1)}:mappedPlate??mb??ma??track.item;
   const start=a??spawn,end=b??spawn,startMapped=ma??mappedSpawn,endMapped=mb??mappedSpawn;
   function remap(p:Pose):Pose{
    const dx=end.position[0]-start.position[0],dz=end.position[2]-start.position[2],length=dx*dx+dz*dz;
    const t=length>1e-8?Math.max(0,Math.min(1,((p.position[0]-start.position[0])*dx+(p.position[2]-start.position[2])*dz)/length)):0;
    const base=mix(start.position,end.position,t),dest=mix(startMapped.position,endMapped.position,t),scale=lerp(startMapped.scale/(start.scale||1),endMapped.scale/(end.scale||1),t);
    return {...p,position:[dest[0]+(p.position[0]-base[0])*scale,dest[1]+p.position[1]-base[1],dest[2]+(p.position[2]-base[2])*scale],rotation:p.rotation+lerp(startMapped.rotation-start.rotation,endMapped.rotation-end.rotation,t),scale:p.scale*scale};
   }
   const segments=track.segments.map(s=>({...s,from:remap(s.from),to:remap(s.to)}));
   if(!segments.length&&ma&&mb&&(ma.position.some((v,i)=>v!==mb.position[i])||ma.scale!==mb.scale||ma.rotation!==mb.rotation))segments.push({from:ma,to:mb,start:0,duration:.8,lift:0});
   return {...track,item:(mb??ma??track.item),segments};
  });
 }
 return {...plan,from,target,cards:tracks(plan.cards,plan.from.cards,plan.target.cards,from.cards,target.cards,true),plates:tracks(plan.plates,plan.from.plates,plan.target.plates,from.plates,target.plates),pegs:tracks(plan.pegs,plan.from.pegs,plan.target.pegs,from.pegs,target.pegs),counts:tracks(plan.counts,plan.from.counts,plan.target.counts,from.counts,target.counts),awards:tracks(plan.awards,plan.from.awards,plan.target.awards,from.awards,target.awards)};
}

export function phoneFrame(frame:Frame,game:State,viewer:string,orientation:'portrait'|'landscape'):Frame{
 return phonePlan({from:frame,target:frame,kind:'ready',duration:0,cards:[],plates:[],pegs:[],counts:[],awards:[]},game,viewer,orientation).target;
}
