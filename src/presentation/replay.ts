import {replay,type Event} from '../game/engine';
/** Physical pegs show one combined award per intent; canonical replay remains unchanged. */
export function replayTable(events:readonly Event[]){
 const pegOrigins:Record<string,number>={};
 const game=replay(events,(before,after,event)=>{
  for(const p of after.players){const old=before.players.find(o=>o.id===p.id);if(!old||event.intent.type==='begin')pegOrigins[p.id]=-1;else if(p.score!==old.score)pegOrigins[p.id]=old.score;}
 });
 return {game,pegOrigins};
}
