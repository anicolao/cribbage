import {replay,type Event,type State,type Intent} from '../game/engine';
/** Physical pegs show one combined award per intent; canonical replay remains unchanged. */
export function nextPegOrigins(origins:Record<string,number>,before:State,after:State,intent:Intent){
 const next={...origins};
 for(const p of after.players){const old=before.players.find(o=>o.id===p.id);if(!old||intent.type==='begin')next[p.id]=-1;else if(p.score!==old.score)next[p.id]=old.score;}
 return next;
}
export function replayTable(events:readonly Event[]){
 let pegOrigins:Record<string,number>={};
 const game=replay(events,(before,after,event)=>{pegOrigins=nextPegOrigins(pegOrigins,before,after,event.intent);});
 return {game,pegOrigins};
}
