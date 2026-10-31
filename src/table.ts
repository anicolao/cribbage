export type Point = [number, number];
export type Position = [number, number, number];
export const CARD_DEPTH = .012;
export const STACK_STEP = .014;
export const FAN_LAYER_STEP = .035;
export const BOARD_WIDTH = 4.2;
export const BOARD_DEPTH = 11.2;
export const TRACK_COLORS = ['#287d90', '#b64c38', '#b88a32', '#795887'];
export const seats = [
  { id: 'you', name: 'You', x: -6.2, z: 5.05, rotation: 0, color: TRACK_COLORS[0], score: 42, previous: 36, cards: ['4_of_spades','6_of_diamonds','9_of_clubs','king_of_hearts'] },
  { id: 'rowan', name: 'Rowan', x: 6.2, z: 5.05, rotation: 0, color: TRACK_COLORS[1], score: 35, previous: 29, cards: ['3_of_hearts','5_of_clubs','jack_of_spades','queen_of_diamonds'] },
  { id: 'jules', name: 'Jules', x: 6.2, z: -5.05, rotation: Math.PI, color: TRACK_COLORS[2], score: 28, previous: 21, cards: ['7_of_clubs','8_of_clubs','10_of_diamonds','jack_of_hearts'] },
  { id: 'ada', name: 'Ada', x: -6.2, z: -5.05, rotation: Math.PI, color: TRACK_COLORS[3], score: 31, previous: 25, cards: ['2_of_clubs','3_of_diamonds','5_of_spades','9_of_diamonds'] }
];
export const cribCards = ['6_of_clubs','7_of_hearts','10_of_clubs','ace_of_spades'];
export const starter = '5_of_hearts';
// A single open paperclip: up the left, over the outer U, down the
// right, around the second turn, then up the middle to the finish.
export const TOP_TURN_Z = -3.2;
export const BOTTOM_TURN_Z = 3.5;
export const FINISH_POINT: Point = [0, -3.5];
export function laneOffset(lane: number) { return (lane - 1.5) * .17; }
function groupedFraction(index: number, count: number) {
  const distance = (i: number) => i + Math.floor(i / 5) * .55;
  return distance(index) / distance(count - 1);
}
export function holePoint(score: number, lane: number): Point {
  const offset = laneOffset(lane), radius = 1.3 - offset;
  if (score <= 0) return [-radius, 4 + (-score) * .32];
  if (score >= 121) return [...FINISH_POINT];
  if (score <= 35) return [-radius, 3.65 + (TOP_TURN_Z - 3.65) * groupedFraction(score - 1, 35)];
  if (score <= 45) {
    const angle = Math.PI + (score - 35) / 10 * Math.PI;
    return [Math.cos(angle) * radius, TOP_TURN_Z + Math.sin(angle) * radius];
  }
  if (score <= 80) return [radius, TOP_TURN_Z + (BOTTOM_TURN_Z - TOP_TURN_Z) * groupedFraction(score - 45, 36)];
  if (score <= 85) {
    const angle = (score - 80) / 5 * Math.PI, innerRadius = .65 - offset;
    return [.65 + Math.cos(angle) * innerRadius, BOTTOM_TURN_Z + Math.sin(angle) * innerRadius];
  }
  return [offset, 3.14 + (-3 - 3.14) * groupedFraction(score - 86, 35)];
}
export const SKUNK_LINE_Z = holePoint(90, 0)[1];
// Sample the continuous centreline for the inlay independently of numbered holes.
export function trackOutline(lane: number): Point[] {
  const d = laneOffset(lane), r = 1.3 - d, inner = .65 - d;
  const points: Point[] = [[-r, 4.4], [-r, TOP_TURN_Z]];
  for (let i=1; i<=80; i++) { const a=Math.PI+i/80*Math.PI; points.push([Math.cos(a)*r,TOP_TURN_Z+Math.sin(a)*r]); }
  points.push([r,BOTTOM_TURN_Z]);
  for (let i=1; i<=60; i++) { const a=i/60*Math.PI; points.push([.65+Math.cos(a)*inner,BOTTOM_TURN_Z+Math.sin(a)*inner]); }
  points.push([d,-3], [...FINISH_POINT]);
  return points;
}
// Interpolate between real holes; never wrap the finish back to the start.
export function trackPoint(score: number, lane: number): Point {
  const a = holePoint(Math.floor(score), lane), b = holePoint(Math.ceil(score), lane), f = score % 1;
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
}
// The final game hole is physically shared: do not drill it four times.
export const boardHoles = [
  ...Array.from({ length: 4 }, (_, lane) =>
    Array.from({ length: 122 }, (_, i) => ({ lane, score: i - 1, point: holePoint(i - 1, lane) }))
  ).flat(),
  { lane: -1, score: 121, point: [...FINISH_POINT] as Point }
];
export const ease = (value: number) => 1 - (1 - Math.max(0, Math.min(1, value))) ** 3;
export function fanCard(index: number): { position: Position; rotation: number } {
  const angle = (index - 1.5) * .145;
  return { position: [Math.sin(angle) * 3.8, .055 + index * FAN_LAYER_STEP, 3.8 * (1 - Math.cos(angle))], rotation: -angle };
}
export function countHand(hand: string[], cut = starter) {
  const all = [...hand, cut].map(id => { const [rank,,suit] = id.split('_'); return { rank: Number(rank) || ({ace:1,jack:11,queen:12,king:13}[rank] ?? 0), suit }; });
  let points = 0;
  for (let mask = 1; mask < 32; mask++) { let sum = 0; for (let i = 0; i < 5; i++) if (mask & (1 << i)) sum += Math.min(10, all[i].rank); if (sum === 15) points += 2; }
  for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) if (all[i].rank === all[j].rank) points += 2;
  for (let length = 5; length >= 3; length--) {
    let runs = 0;
    for (let mask = 1; mask < 32; mask++) { const ranks = all.filter((_,i) => mask & (1 << i)).map(c => c.rank).sort((a,b) => a-b); if (ranks.length === length && ranks.every((rank,i) => i === 0 || rank === ranks[i-1]+1)) runs++; }
    if (runs) { points += runs * length; break; }
  }
  if (all.slice(0,4).every(c => c.suit === all[0].suit)) points += all[4].suit === all[0].suit ? 5 : 4;
  if (all.slice(0,4).some(c => c.rank === 11 && c.suit === all[4].suit)) points++;
  return points;
}
