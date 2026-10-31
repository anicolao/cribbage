import { describe, expect, test } from 'bun:test';
import { boardHoles, holePoint, trackPoint, seats, starter, cribCards, countHand, BOARD_WIDTH, BOARD_DEPTH, SKUNK_LINE_Z, laneOffset, TOP_TURN_Z, BOTTOM_TURN_Z } from '../src/table';

describe('four individual cribbage tracks', () => {
 test('each track has 24 groups of five, two starts, and a single shared finish', () => {
  expect(boardHoles).toHaveLength(489);
  for (let lane = 0; lane < 4; lane++) {
   const holes = boardHoles.filter(h => h.lane === lane);
   expect(holes.filter(h => h.score >= 1 && h.score <= 120)).toHaveLength(120);
   expect(holes.map(h => h.score)).toEqual(Array.from({length:122},(_,i)=>i-1));
   for(let group=0;group<24;group++) expect(holes.filter(h=>h.score>=group*5+1&&h.score<=group*5+5)).toHaveLength(5);
  }
  const finish=boardHoles.filter(h=>h.score===121);
  expect(finish).toHaveLength(1);
  for(let lane=0;lane<4;lane++)expect(holePoint(121,lane)).toEqual(finish[0].point);
 });
 test('all holes are distinct, inside the board, and spaced to accept pegs', () => {
  for (let i = 0; i < boardHoles.length; i++) {
   const [x,z] = boardHoles[i].point;
   expect(Math.abs(x)).toBeLessThan(BOARD_WIDTH/2-.15);
   expect(Math.abs(z)).toBeLessThan(BOARD_DEPTH/2-.15);
   for (let j = i+1; j < boardHoles.length; j++) {
    const [xx,zz]=boardHoles[j].point;
    expect(Math.hypot(x-xx,z-zz)).toBeGreaterThan(.13);
   }
  }
 });
 test('the outer inverted U returns into a final central leg after exactly two turns', () => {
  for (let lane=0;lane<4;lane++) {
   for (let score=1;score<35;score++) {
    expect(holePoint(score,lane)[0]).toBeLessThan(-1);
    expect(holePoint(score+1,lane)[1]).toBeLessThan(holePoint(score,lane)[1]);
   }
   for (let score=36;score<=45;score++) expect(holePoint(score,lane)[1]).toBeLessThanOrEqual(TOP_TURN_Z+.00001);
   for (let score=46;score<80;score++) {
    expect(holePoint(score,lane)[0]).toBeGreaterThan(1);
    expect(holePoint(score+1,lane)[1]).toBeGreaterThan(holePoint(score,lane)[1]);
   }
   for (let score=81;score<=85;score++) expect(holePoint(score,lane)[1]).toBeGreaterThanOrEqual(BOTTOM_TURN_Z-.00001);
   for (let score=86;score<120;score++) {
    expect(holePoint(score,lane)[0]).toBeCloseTo(laneOffset(lane));
    expect(holePoint(score+1,lane)[1]).toBeLessThan(holePoint(score,lane)[1]);
   }
   expect(holePoint(90,lane)[1]).toBeCloseTo(SKUNK_LINE_Z);
   expect(holePoint(91,lane)[1]).toBeLessThan(SKUNK_LINE_Z);
   expect(holePoint(121,lane)[0]).toBe(0);
   expect(holePoint(121,lane)[1]).toBeLessThan(holePoint(120,lane)[1]);
   expect(trackPoint(121,lane)).toEqual(holePoint(121,lane));
   expect(holePoint(121,lane)).not.toEqual(holePoint(0,lane));
  }
 });
});
test('prepared hands, crib, and starter use distinct cards', () => {
 const cards=[...seats.flatMap(s=>s.cards),...cribCards,starter];
 expect(cards).toHaveLength(21);expect(new Set(cards).size).toBe(21);
});
test('counting includes fifteen combinations, pairs, runs, flushes, and nobs', () => {
 expect(countHand(['5_of_clubs','5_of_diamonds','5_of_hearts','jack_of_spades'],'5_of_spades')).toBe(29);
 expect(countHand(['2_of_clubs','3_of_clubs','4_of_clubs','5_of_clubs'],'6_of_clubs')).toBe(14);
 expect(countHand(seats[0].cards)).toBe(9);
 expect(countHand(seats[1].cards)).toBe(10);
});
