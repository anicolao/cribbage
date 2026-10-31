import { expect, test } from 'bun:test';
import { CARD_DEPTH, STACK_STEP, BOARD_WIDTH, BOARD_DEPTH, seats } from '../src/table';
import { cardPose, playedCard, CARD_WIDTH, CARD_HEIGHT, BOARD_ROTATION, DECK_LAYERS, DECK_POSITION, STARTER_POSITION, CRIB_POSITION, displayedScore, PEGGING_DURATION } from '../src/sceneLayout';

type Point=[number,number];
function rectangle(x:number,z:number,width:number,height:number,angle:number):Point[]{
 return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([xx,zz])=>{
  const a=xx*width/2,b=zz*height/2;
  return [x+Math.cos(angle)*a+Math.sin(angle)*b,z-Math.sin(angle)*a+Math.cos(angle)*b];
 });
}
function overlaps(a:Point[],b:Point[]){
 for(const polygon of [a,b])for(let i=0;i<polygon.length;i++){
  const p=polygon[i],q=polygon[(i+1)%polygon.length],axis:Point=[q[1]-p[1],p[0]-q[0]];
  const project=(points:Point[])=>points.map(v=>v[0]*axis[0]+v[1]*axis[1]);
  const aa=project(a),bb=project(b);
  if(Math.max(...aa)<Math.min(...bb)||Math.max(...bb)<Math.min(...aa))return false;
 }
 return true;
}

test('the cut card sits on the deck above every concealed layer',()=>{
 const top=DECK_POSITION[1]+(DECK_LAYERS-1)*STACK_STEP+CARD_DEPTH;
 expect(STARTER_POSITION[1]-top).toBeGreaterThan(.005);
 expect(Math.abs(STARTER_POSITION[0]-DECK_POSITION[0])).toBeLessThan(.05);
 expect(Math.abs(STARTER_POSITION[2]-DECK_POSITION[2])).toBeLessThan(.05);
});

test('ready hands are private; counting starts from all sixteen played cards, never a hand',()=>{
 for(let lane=0;lane<4;lane++)for(let index=0;index<4;index++){
  expect(cardPose('tableau',0,lane,index).faceUp).toBe(lane===0);
  const complete=cardPose('pegging-complete',0,lane,index);
  expect(complete.location).toBe('played');expect(complete.faceUp).toBe(true);
  for(const owner of seats){
   const count=cardPose(`count-${owner.id}`,0,lane,index);
   expect(count.position).toEqual(playedCard(index,lane).position);
   expect(count.faceUp).toBe(true);expect(count.location).not.toBe('hand');
  }
 }
});

test('played and counting cards clear the board and both side piles throughout motion',()=>{
 const obstacles=[rectangle(0,0,BOARD_WIDTH+.1,BOARD_DEPTH+.1,BOARD_ROTATION),rectangle(DECK_POSITION[0],DECK_POSITION[2],CARD_WIDTH+.15,CARD_HEIGHT+.15,0),rectangle(CRIB_POSITION[0],CRIB_POSITION[2],CARD_WIDTH+.25,CARD_HEIGHT+.15,0)];
 const scenarios=['play','pegging','pegging-complete',...seats.map(s=>`play-${s.id}`),...seats.map(s=>`count-${s.id}`)];
 for(const scenario of scenarios)for(let time=0;time<=(scenario==='pegging'?PEGGING_DURATION:1.5);time+=.025)for(let lane=0;lane<4;lane++)for(let index=0;index<4;index++){
  const pose=cardPose(scenario,time,lane,index),seat=seats[lane],c=Math.cos(seat.rotation),s=Math.sin(seat.rotation);
  const x=seat.x+c*pose.position[0]+s*pose.position[2],z=seat.z-s*pose.position[0]+c*pose.position[2];
  for(const obstacle of obstacles)expect(overlaps(rectangle(x,z,CARD_WIDTH,CARD_HEIGHT,pose.rotation+seat.rotation),obstacle)).toBe(false);
 }
});

test('pegging reveals each seat in turn and ends with all sixteen cards in their owner areas',()=>{
 for(let lane=0;lane<4;lane++)for(let index=0;index<4;index++){
  const initial=cardPose('pegging',0,lane,index);
  expect(initial.location).toBe('hand');expect(initial.faceUp).toBe(lane===0);
  const final=cardPose('pegging',PEGGING_DURATION,lane,index);
  expect(final.location).toBe('played');expect(final.faceUp).toBe(true);
  final.position.forEach((value,axis)=>expect(value).toBeCloseTo(playedCard(index,lane).position[axis],8));
 }
 expect(cardPose('pegging',.9,1,3).faceUp).toBe(true);
 expect(cardPose('pegging',.9,2,3).faceUp).toBe(false);
 expect(cardPose('pegging',.9,1,2).faceUp).toBe(false);
});

test('counting cards stay separated in height until their spread no longer overlaps',()=>{
 for(const [lane,seat] of seats.entries())for(let time=0;time<=1.5;time+=.01){
  const poses=Array.from({length:4},(_,i)=>cardPose(`count-${seat.id}`,time,lane,i));
  for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){
   const a=poses[i],b=poses[j];
   if(overlaps(rectangle(a.position[0],a.position[2],CARD_WIDTH,CARD_HEIGHT,a.rotation),rectangle(b.position[0],b.position[2],CARD_WIDTH,CARD_HEIGHT,b.rotation))){
    expect(Math.abs(a.position[1]-b.position[1])).toBeGreaterThan(CARD_DEPTH+.001);
   }
  }
 }
});

test('each new pegging card lands to the right and on top at every seat',()=>{
 for(let lane=0;lane<4;lane++)for(let index=2;index>=0;index--){
  const older=cardPose('pegging',PEGGING_DURATION,lane,index+1);
  const newer=cardPose('pegging',PEGGING_DURATION,lane,index);
  expect(newer.position[0]).toBeGreaterThan(older.position[0]);
  expect(newer.position[1]-older.position[1]).toBeGreaterThan(CARD_DEPTH+.001);
  expect(newer.position[0]-older.position[0]).toBeLessThan(CARD_WIDTH);
 }
});


test('a played card lands outside the remaining private fan',()=>{
 const played=cardPose('play',1.3,0,3);
 for(let index=0;index<3;index++){
  const held=cardPose('play',1.3,0,index);
  expect(overlaps(rectangle(played.position[0],played.position[2],CARD_WIDTH,CARD_HEIGHT,played.rotation),rectangle(held.position[0],held.position[2],CARD_WIDTH,CARD_HEIGHT,held.rotation))).toBe(false);
 }
});


test('the cut/deck is left of the board and the crib is right, without overlap',()=>{
 const board=rectangle(0,0,BOARD_WIDTH,BOARD_DEPTH,BOARD_ROTATION);
 expect(DECK_POSITION[0]).toBeLessThan(0);expect(CRIB_POSITION[0]).toBeGreaterThan(0);
 for(const pile of [DECK_POSITION,CRIB_POSITION])expect(overlaps(rectangle(pile[0],pile[2],CARD_WIDTH+.25,CARD_HEIGHT+.15,0),board)).toBe(false);
});

test('the player-area score updates when the scoring peg lands',()=>{
 expect(displayedScore(0,'peg',1.6)).toBe(42);expect(displayedScore(0,'peg',1.8)).toBe(54);
 for(let lane=1;lane<4;lane++)expect(displayedScore(lane,'peg',1.8)).toBe(seats[lane].score);
});
