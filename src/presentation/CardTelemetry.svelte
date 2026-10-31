<script lang="ts">
 import {useTask,useThrelte} from '@threlte/core';
 import {Vector3} from 'three';
 import {legalCards,needsDiscard,type State} from '../game/engine';
 import {cardName} from '../game/cards';
 import {cardTarget} from './cardTarget';
 import {cardId,type Frame,type CardControl} from './frame';
 let {game,viewer,frame,blocked,onControls}:{game:State;viewer:string;frame:Frame;blocked:boolean;onControls:(controls:CardControl[])=>void}=$props();
 const {camera,size}=useThrelte();let last='';
 useTask(()=>{
  const seat=game.players.findIndex(p=>p.id===viewer);
  const controls=frame.cards.filter(card=>card.owner===viewer&&card.zone==='hand'&&card.id===cardId(game,card.card)&&game.hands[seat]?.includes(card.card)).map((card,index,hand)=>{
   // Passive projected coordinates for DOM inspection and pointer E2E tests;
   // the actual mesh and Threlte's raycaster own every pointer event.
   const p=cardTarget(card,index===hand.length-1);
   const projected=new Vector3(...p).project(camera.current);
   const enabled=!blocked&&seat>=0&&(needsDiscard(game,seat)||game.phase==='pegging'&&game.turn===seat&&legalCards(game,seat).includes(card.card));
   return {id:card.id,card:card.card,label:`${game.phase==='discard'?'Crib':'Play'} ${cardName(card.card)}`,enabled,x:(projected.x+1)*size.current.width/2,y:(1-projected.y)*size.current.height/2};
  });
  const value=JSON.stringify(controls);if(value!==last){last=value;onControls(controls);}
 },{autoInvalidate:false});
</script>
