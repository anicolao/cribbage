<script lang="ts">
 import {useTask,useThrelte} from '@threlte/core';
 import {Vector3} from 'three';
 import {tablePlayers,heldPose,type HitTarget} from './layout';
 import {legalCards,type State} from './engine';
 import {cardName} from './cards';
 import {CARD_WIDTH,CARD_HEIGHT} from '../sceneLayout';
 let {game,viewer,onTargets}:{game:State;viewer:string;onTargets:(targets:HitTarget[])=>void}=$props();
 const {camera}=useThrelte();let last='';
 useTask(()=>{
  const player=tablePlayers(game,viewer).find(p=>p.id===viewer);
  const targets:HitTarget[]=player&&game.phase!=='gathering'?player.cards.map((card,index)=>{
   const pose=heldPose(index,player.cards.length),vertices=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,z])=>{
    let xx=x*CARD_WIDTH/2,zz=z*CARD_HEIGHT/2;
    const cx=Math.cos(pose.rotation)*xx+Math.sin(pose.rotation)*zz+pose.position[0],cz=-Math.sin(pose.rotation)*xx+Math.cos(pose.rotation)*zz+pose.position[2];
    const sx=player.x+Math.cos(player.rotation)*cx+Math.sin(player.rotation)*cz,sz=player.z-Math.sin(player.rotation)*cx+Math.cos(player.rotation)*cz;
    const point=new Vector3(Math.cos(.055)*sx+Math.sin(.055)*sz,pose.position[1]+.02,-Math.sin(.055)*sx+Math.cos(.055)*sz).project(camera.current);
    return `${(point.x+1)*50},${(1-point.y)*50}`;
   });
   const enabled=game.phase==='discard'?game.discards[player.index]===null:game.phase==='pegging'&&game.turn===player.index&&legalCards(game,player.index).includes(card);
   return {id:card,label:`${game.phase==='discard'?'Crib':'Play'} ${cardName(card)}`,card,points:vertices.join(' '),enabled};
  }):[];
  const serialized=JSON.stringify(targets);if(last!==serialized){last=serialized;onTargets(targets);}
 },{autoInvalidate:false});
</script>
