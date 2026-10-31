import {test,expect} from 'bun:test';
import {createHash} from 'node:crypto';
import legacy from './fixtures/v1-hand.json';
import {apply,initialState,replay,VERSION,needsDiscard,discardActor,isCribCount,countOwner,type State,type Intent,type Event} from '../src/game/engine';
import {botIntent} from '../src/game/bot';
import {deck,handScore} from '../src/game/cards';
import {shuffle} from '../src/game/random';
import {tablePlayers} from '../src/game/layout';
function gather(count:number,version:1|2|3=VERSION){let s=apply(initialState(version),'p0',{type:'create',name:'Alex'});for(let i=1;i<count;i++)s=apply(s,`p${i}`,{type:'join',name:`Friend ${i}`});return s;}
const begin=(count:number,seed='small-table')=>apply(gather(count),'p0',{type:'begin',seed});

test('only the host may choose to begin with two, three or four seated players',()=>{
 expect(()=>apply(gather(1),'p0',{type:'begin',seed:'x'})).toThrow();
 for(const count of [2,3,4]){
  const s=gather(count);expect(()=>apply(s,'p1',{type:'begin',seed:'x'})).toThrow();
  const playing=apply(s,'p0',{type:'begin',seed:'x'});expect(playing.phase).toBe('discard');
  expect(()=>apply(playing,'late',{type:'join',name:'Late'})).toThrow();
 }
 expect(()=>apply(gather(2,1),'p0',{type:'begin',seed:'legacy'})).toThrow();
});
test('two players receive six cards each, alternate dealing, and discard two individual choices each',()=>{
 let s=begin(2);const shuffled=shuffle(deck,`${s.seed}:deal:0`);
 expect(s.hands.slice(0,2).map(h=>h.length)).toEqual([6,6]);expect(s.hands.slice(2)).toEqual([[],[]]);
 for(let i=0;i<12;i++)expect(s.hands[(s.dealer+1+i)%2][Math.floor(i/2)]).toBe(shuffled[i]);
 const first=s.hands[0][0];s=apply(s,'p0',{type:'discard',card:first});
 expect(s.phase).toBe('discard');expect(s.hands[0]).toHaveLength(5);expect(s.crib).toEqual([first]);expect(needsDiscard(s,0)).toBe(true);expect(s.kept[0]).toEqual([]);
 s=apply(s,'p0',{type:'discard',card:s.hands[0][0]});expect(s.kept[0]).toHaveLength(4);expect(needsDiscard(s,0)).toBe(false);
 expect(()=>apply(s,'p0',{type:'discard',card:s.hands[0][0]})).toThrow();
 for(let i=0;i<2;i++)s=apply(s,'p1',{type:'discard',card:s.hands[1][0]});
 s=apply(s,'p0',{type:'accept-crib'});expect(s.phase).toBe('cut');expect(s.crib).toHaveLength(4);expect(s.turn).toBe((s.dealer+1)%2);
 s=apply(s,`p${s.turn}`,{type:'cut'});expect(s.cut).toBe(shuffled[12]);
});
test('three players receive five each and a concealed sixteenth card is dealt directly to the crib',()=>{
 let s=begin(3);const shuffled=shuffle(deck,`${s.seed}:deal:0`),automatic=shuffled[15];
 expect(s.hands.slice(0,3).map(h=>h.length)).toEqual([5,5,5]);expect(s.crib).toEqual([automatic]);expect(s.stock[0]).toBe(shuffled[16]);
 for(let i=0;i<3;i++)s=apply(s,`p${i}`,{type:'discard',card:s.hands[i][0]});
 s=apply(s,'p0',{type:'accept-crib'});expect(s.phase).toBe('cut');expect(s.crib[0]).toBe(automatic);expect(s.crib).toHaveLength(4);
 expect(new Set([...s.kept.flat(),...s.crib,...s.stock]).size).toBe(52);
 s=apply(s,`p${s.turn}`,{type:'cut'});expect(s.cut).toBe(shuffled[16]);
});
for(const count of [2,3])for(let seed=0;seed<4;seed++)test(`${count}-player seeded match ${seed}: full replay, counting order, conservation, dealer rotation and immediate win`,()=>{
 let s=initialState();const events:Event[]=[];
 const act=(actor:string,intent:Intent)=>{events.push({version:VERSION,id:`action-${events.length}`,sequence:events.length+1,actor,intent});s=apply(s,actor,intent);};
 act('p0',{type:'create',name:'Alex'});for(let i=1;i<count;i++)act(`p${i}`,{type:'join',name:`Friend ${i}`});act('p0',{type:'begin',seed:`${count}-match-${seed}`});
 let steps=0,counts:number[]=[],round=s.round;
 while(s.phase!=='finished'&&steps++<2500){
  const seat=s.phase==='discard'?discardActor(s):s.turn,intent=botIntent(s,seat)!;expect(intent).not.toBeNull();const before=s;
  if(s.phase==='count'){expect(s.hands.flat()).toEqual([]);expect(s.plays).toHaveLength(count*4);expect(seat).toBe(countOwner(s));counts.push(seat);}
  act(`p${seat}`,intent);
  if(intent.type==='deal'){
   expect(s.dealer).toBe((before.dealer+1)%count);expect(counts).toEqual([...Array.from({length:count},(_,i)=>(before.dealer+1+i)%count),before.dealer]);counts=[];expect(s.round).toBe(++round);
  }
  if(s.phase!=='discard'){const cards=[...s.kept.flat(),...s.crib,...s.stock,...(s.cut?[s.cut]:[])];expect(cards).toHaveLength(52);expect(new Set(cards).size).toBe(52);}
  expect(s.turn).toBeLessThan(count);expect(s.total).toBeLessThanOrEqual(31);
  if(intent.type==='count'&&isCribCount(before))expect(s.players[seat].score).toBe(Math.min(121,before.players[seat].score+handScore(before.crib,before.cut!,true)));
 }
 expect(steps).toBeLessThan(2500);expect(s.winner).not.toBeNull();expect(s.players[s.winner!].score).toBe(121);expect(replay(events)).toEqual(s);
});
test('bots cannot use another hand or the concealed crib to choose a discard',()=>{
 for(const n of [2,3]){const s=begin(n),before=botIntent(s,0),hidden=structuredClone(s);hidden.hands[1]=[...deck].reverse().slice(0,n===2?6:5);hidden.crib=['ace_of_spades'];expect(botIntent(hidden,0)).toEqual(before);}
});
test('two-player opponents sit opposite; all perspectives preserve clockwise order without phantom players',()=>{
 for(const n of [2,3,4])for(let own=0;own<n;own++){
  const players=tablePlayers(begin(n),`p${own}`);expect(players.find(p=>p.id===`p${own}`)!.lane).toBe(0);expect(new Set(players.map(p=>p.lane)).size).toBe(n);
  if(n===2)expect(players.find(p=>p.id!==`p${own}`)!.lane).toBe(2);
  else for(let i=1;i<n;i++)expect(players.find(p=>p.id===`p${(own+i)%n}`)!.lane).toBe([0,3,2,1][i]);
 }
});
test('every original v1 action replays to its frozen original outcome; mixed versions are rejected',()=>{
 let s=initialState(1);const events=legacy.events as Event[];
 for(const [i,e] of events.entries()){
  s=apply(s,e.actor,e.intent);const {protocol,pendingDiscards,...original}=s;const normalized={...original,discards:s.discards.map(cards=>cards[0]??null)};
  expect(createHash('sha256').update(JSON.stringify(normalized)).digest('hex')).toBe(legacy.hashes[i]);
 }
 expect(replay(events)).toEqual(s);
 expect(()=>replay([...events,{version:2,id:'mixed',sequence:events.length+1,actor:'p0',intent:{type:'cut'}}])).toThrow('newer version');
});
