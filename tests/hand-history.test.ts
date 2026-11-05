import {test,expect} from 'bun:test';
import {apply,initialState,discardActor,countOwner,isCribCount,cribCards,type State,type Event,type Intent,type Protocol} from '../src/game/engine';
import {botIntent} from '../src/game/bot';
import {handScore} from '../src/game/cards';
import {replayTable} from '../src/presentation/replay';
function table(count:number,protocol:Protocol=3){
 let state=initialState(protocol);const events:Event[]=[];
 function act(actor:string,intent:Intent){const before=state;state=apply(state,actor,intent);events.push({version:protocol,id:`event-${events.length+1}`,sequence:events.length+1,actor,intent});return {before,after:state};}
 function next(){const seat=state.phase==='discard'?discardActor(state):state.turn;return act(state.players[seat].id,botIntent(state,seat)!);}
 for(let i=0;i<count;i++)act(`p${i}`,{type:i?'join':'create',name:['Alex','Rowan','Jules','Ada'][i]});
 act('p0',{type:'begin',seed:`history-${protocol}-${count}`});
 return {get state(){return state;},read:()=>state,events,act,next};
}
for(const [count,protocol] of [[2,3],[3,3],[4,3],[2,2],[4,1]] as const)test(`${count} players, protocol ${protocol}: history has counted cards in order, the real starter and crib, and all awarded points`,()=>{
 const t=table(count,protocol);const expected:{owner:string;kind:'hand'|'crib';cards:string[];points:number}[]=[];const start=t.state.players.map(p=>p.score);
 while(t.state.phase!=='between'){
  const before=t.state;if(before.phase==='count'){const seat=countOwner(before),crib=isCribCount(before),cards=crib?cribCards(before):before.kept[seat];expected.push({owner:before.players[seat].id,kind:crib?'crib':'hand',cards:[...cards],points:handScore(cards,before.cut!,crib)});}
  t.next();
  if(t.read().phase!=='between')expect(replayTable(t.events).handHistory).toEqual([]);
 }
 const {handHistory,game}=replayTable(t.events);expect(game).toEqual(t.state);expect(handHistory).toHaveLength(1);
 const round=handHistory[0];expect(round.round).toBe(1);expect(round.game).toBe(1);expect(round.starter).toBe(t.state.cut!);
 expect(round.hands.map(({owner,kind,cards,points})=>({owner,kind,cards,points}))).toEqual(expected);
 expect(round.hands.map(h=>h.owner)).toEqual([...Array.from({length:count},(_,i)=>`p${(t.state.dealer+1+i)%count}`),`p${t.state.dealer}`]);
 t.state.players.forEach((p,i)=>expect(round.hands.filter(h=>h.owner===p.id).reduce((sum,h)=>sum+h.points+h.pegging+h.heels,0)).toBe(p.score-start[i]));
 const snapshot=structuredClone(round);t.next();expect(replayTable(t.events).handHistory[0]).toEqual(snapshot); // the next deal cannot replace the old cards
});
test('a winning partial round exposes only the hands actually counted, and a new game keeps earlier public rounds',()=>{
 const t=table(2);let last:State|undefined;
 while(t.state.phase!=='finished'){last=t.state;t.next();}
 let history=replayTable(t.events).handHistory;
 if(last!.phase==='count'){
  const round=history.at(-1)!;expect(round.revision).toBe(t.state.revision);expect(round.hands).toHaveLength(last!.countIndex+1);
  expect(round.hands.at(-1)!.points).toBe(handScore(isCribCount(last!)?cribCards(last!):last!.kept[countOwner(last!)],last!.cut!,isCribCount(last!)));
 }else expect(history.every(round=>round.round<t.state.round+1)).toBe(true);
 const previous=structuredClone(history);t.act('p0',{type:'begin',seed:'history-rematch'});while(t.read().phase!=='between')t.next();
 history=replayTable(t.events).handHistory;expect(history.slice(0,-1)).toEqual(previous);expect(history.at(-1)!.game).toBe(2);expect(history.at(-1)!.round).toBe(1);expect(new Set(history.map(r=>r.id)).size).toBe(history.length);
});
