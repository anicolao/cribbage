import {test,expect} from 'bun:test';
import {apply,initialState,replay,parseIntent,type Event,type Intent,type State} from '../src/game/engine';
import {deck,handScore,playScore} from '../src/game/cards';
import {botIntent} from '../src/game/bot';
import {shuffle} from '../src/game/random';
function table(seed='cribbage'){
 let state=apply(initialState(),'p0',{type:'create',name:'Alex'});
 for(let i=1;i<4;i++)state=apply(state,`p${i}`,{type:'join',name:`Player ${i}`});
 return apply(state,'p0',{type:'begin',seed});
}
test('seeded dealing is repeatable, unique, round-robin, and input preserving',()=>{
 expect(shuffle(deck,'same')).toEqual(shuffle(deck,'same'));expect(shuffle(deck,'other')).not.toEqual(shuffle(deck,'same'));expect(deck.length).toBe(52);
 const a=table(),b=table();expect(a).toEqual(b);expect(new Set([...a.hands.flat(),...a.stock]).size).toBe(52);expect(a.hands.map(h=>h.length)).toEqual([5,5,5,5]);
});
test('hand and crib scoring cover 29, double runs, nobs, and the stricter crib flush',()=>{
 expect(handScore(['5_of_clubs','5_of_diamonds','5_of_hearts','jack_of_spades'],'5_of_spades')).toBe(29);
 const flush=['ace_of_clubs','3_of_clubs','7_of_clubs','king_of_clubs'];
 expect(handScore(flush,'9_of_hearts')-handScore(flush,'9_of_hearts',true)).toBe(4);
 expect(handScore(['3_of_clubs','3_of_hearts','4_of_clubs','5_of_clubs'],'6_of_spades')).toBe(14);
});
test('pegging scores fifteen, thirty-one, pairs, triples, quads, and unordered runs',()=>{
 expect(playScore(['5_of_clubs'],'10_of_hearts')).toBe(2);
 expect(playScore(['10_of_clubs','10_of_hearts','ace_of_spades'],'10_of_diamonds')).toBe(2);
 expect(playScore(['2_of_clubs'],'2_of_hearts')).toBe(2);
 expect(playScore(['2_of_clubs','2_of_hearts'],'2_of_spades')).toBe(6);
 expect(playScore(['2_of_clubs','2_of_hearts','2_of_diamonds'],'2_of_spades')).toBe(12);
 expect(playScore(['4_of_clubs','2_of_hearts'],'3_of_spades')).toBe(3);
});
test('intents reject computed outcomes and invalid actions without changing state',()=>{
 const state=table(),before=structuredClone(state);
 expect(()=>parseIntent({type:'play',card:deck[0],score:100})).toThrow();
 expect(()=>parseIntent({type:'begin',seed:'x',hands:[]})).toThrow();
 expect(()=>apply(state,'p0',{type:'go'})).toThrow();
 expect(()=>apply(state,'p0',{type:'discard',card:state.stock[0]})).toThrow();
 expect(()=>apply(state,'p1',{type:'begin',seed:'x'})).toThrow();expect(state).toEqual(before);
});
test('all-bot games finish, replay exactly, conserve cards, and rotate the dealer',()=>{
 for(let seed=0;seed<8;seed++){
  const events:Event[]=[];let state=initialState();
  const act=(actor:string,intent:Intent)=>{events.push({version:1,id:`e${events.length}`,actor,sequence:events.length+1,intent});state=apply(state,actor,intent);};
  act('p0',{type:'create',name:'Alex'});for(let i=1;i<4;i++)act(`p${i}`,{type:'join',name:`Friend ${i}`});act('p0',{type:'begin',seed:`match-${seed}`});
  let steps=0;
  while(state.phase!=='finished'&&steps++<2500){
   const seat=state.phase==='discard'?state.discards.findIndex(c=>c===null):state.turn;
   const intent=botIntent(state,seat);expect(intent).not.toBeNull();
   const previous:State=state;act(state.players[seat].id,intent!);
   if(intent!.type==='deal')expect(state.dealer).toBe((previous.dealer+1)%4);
   if(state.phase!=='discard'){
    const cards=[...state.kept.flat(),...state.crib,...state.stock,...(state.cut?[state.cut]:[])];expect(cards.length).toBe(52);expect(new Set(cards).size).toBe(52);
   }
   expect(state.total).toBeLessThanOrEqual(31);
  }
  expect(steps).toBeLessThan(2500);expect(state.winner).not.toBeNull();expect(state.players[state.winner!].score).toBe(121);expect(replay(events)).toEqual(state);
 }
});
test('Go is mandatory only when no card fits, awards last once, and clears the running count',()=>{
 let state=table();state.phase='pegging';state.turn=0;state.hands=[['king_of_clubs'],['queen_of_clubs'],[],[]];state.total=30;state.segment=['10_of_hearts','10_of_spades','10_of_diamonds'];state.last=1;
 state=apply(state,'p0',{type:'go'});expect(state.turn).toBe(1);state=apply(state,'p1',{type:'go'});
 expect(state.players[1].score).toBe(1);expect(state.total).toBe(0);expect(state.turn).toBe(0);expect(state.passed).toEqual([]);
 expect(()=>apply(state,'p0',{type:'go'})).toThrow();
});
test('31 scores two with no additional last-card point; winning ends immediately',()=>{
 let state=table();state.phase='pegging';state.turn=0;state.hands=[['ace_of_clubs'],[],[],[]];state.total=30;state.segment=['10_of_clubs','10_of_hearts','10_of_spades'];state.players[0].score=119;
 state=apply(state,'p0',{type:'play',card:'ace_of_clubs'});expect(state.players[0].score).toBe(121);expect(state.phase).toBe('finished');expect(state.winner).toBe(0);
});
