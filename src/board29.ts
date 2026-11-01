import {Shape,Path,CurvePath,CubicBezierCurve,Vector2} from 'three';
import type {Point} from './table';
// Curve landmarks follow the supplied four-track board reference. Keep the
// texture bounds outside the cut outline, including its bevel and end caps.
export const BOARD29_LANE_EDGES=[-.8,3.8] as const;
export const BOARD29_LANDSCAPE_SCALE=2.4;
export const BOARD29_LANDSCAPE_X=-8,BOARD29_LANDSCAPE_Z=2.8;
export const BOARD29_WIDTH=8.2,BOARD29_DEPTH=5.9,BOARD29_Z=-.25;
const point=(x:number,y:number)=>new Vector2((x-500)/112,(y-325)/112);
const two=new CurvePath<Vector2>(),nine=new CurvePath<Vector2>();
function curve(path:CurvePath<Vector2>,p:number[][]){path.add(new CubicBezierCurve(...p.map(([x,y])=>point(x,y)) as [Vector2,Vector2,Vector2,Vector2]));}
// The 2 has a rounded shoulder, a flowing diagonal, a continuous heel and
// a gently bowed foot. There are no straight segments or sharp track joins.
curve(two,[[194,153],[283,90],[420,120],[441,210]]);
curve(two,[[441,210],[464,343],[266.5673294162,345.6329913444],[208.7164445505,414.5769912251]]);
// A roomy circular heel, represented by tangent-matched cubic Beziers.
// Its radius exceeds the full lane offset: inner lanes cannot fold back
// on themselves or squeeze adjacent bores together at the bottom turn.
const heel={x:270,y:466,radius:80};
for(let i=0;i<3;i++){
 const a=(-140-i*130/3)*Math.PI/180,b=(-140-(i+1)*130/3)*Math.PI/180,k=4/3*Math.tan((b-a)/4);
 const p=(t:number)=>[heel.x+heel.radius*Math.cos(t),heel.y+heel.radius*Math.sin(t)];
 const start=p(a),end=p(b);
 curve(two,[start,[start[0]-k*heel.radius*Math.sin(a),start[1]+k*heel.radius*Math.cos(a)],[end[0]+k*heel.radius*Math.sin(b),end[1]-k*heel.radius*Math.cos(b)],end]);
}
curve(two,[[270,546],[323,546],[370,515],[498,535]]);
// The 9 flows from the curved lower foot around the outside, over the
// shoulder, and into the rounded bowl and short finishing tail.
curve(nine,[[535,535],[758,550],[845,431],[845,270]]);
curve(nine,[[845,270],[845,125],[729,85],[630,113]]);
curve(nine,[[630,113],[531,141],[509,284],[589,337]]);
curve(nine,[[589,337],[636,368],[701,353],[748,329]]);
const paths=[two,nine],GROUP_GAP=.9,DIGIT_DISTANCE=59+11*GROUP_GAP+1.5;
function parameter(index:number){return (index+Math.floor(index/5)*GROUP_GAP)/DIGIT_DISTANCE;}
function offset(digit:number,t:number,lane:number):Point{
 const p=paths[digit].getPointAt(t),v=paths[digit].getTangentAt(t),d=(lane-1.5)*.155;
 return [p.x-v.y*d,p.y+v.x*d];
}
export function board29Point(score:number,lane:number):Point{
 if(score>=121){const p=nine.getPointAt(1).addScaledVector(nine.getTangentAt(1),.25);return [p.x,p.y];}
 const digit=score<=60?0:1,index=digit?score-61:Math.max(0,score-1),p=offset(digit,parameter(index),lane);
 if(score<=0){const v=two.getTangentAt(0);p[0]+=v.x*(score-1)*.16;p[1]+=v.y*(score-1)*.16;}
 return p;
}
/** Group dividers cross the ribbon; the score is engraved into this line. */
export function board29Divider(score:number):[Point,Point]{
 const digit=score<=60?0:1,index=digit?score-61:score-1;
 const t=score%60===0?1:(parameter(index)+parameter(index+1))/2;
 return [offset(digit,t,BOARD29_LANE_EDGES[0]),offset(digit,t,BOARD29_LANE_EDGES[1])];
}
export const board29Holes=[...Array.from({length:4},(_,lane)=>Array.from({length:122},(_,i)=>({lane,score:i-1,point:board29Point(i-1,lane)}))).flat(),{lane:-1,score:121,point:board29Point(121,0)}];
// Offset the same Beziers used by the holes, rather than drawing an
// unrelated silhouette. The exposed edges keep one consistent wood margin.
const OUTLINE_OFFSET=.52;
function contour(curve:CubicBezierCurve,t:number,distance:number):Point{
 const p=curve.getPoint(t),v=curve.getTangent(t);return [p.x-v.y*distance,p.y+v.x*distance];
}
export function board29Outline(){
 const shape=new Shape(),start=point(99,151);shape.moveTo(start.x,-start.y);
 const c=(...p:number[])=>{const a=point(p[0],p[1]),b=point(p[2],p[3]),d=point(p[4],p[5]);shape.bezierCurveTo(a.x,-a.y,b.x,-b.y,d.x,-d.y);};
 const join=(p:Point,a:number[],b:number[])=>{const u=point(a[0],a[1]),v=point(b[0],b[1]);shape.bezierCurveTo(u.x,-u.y,v.x,-v.y,p[0],-p[1]);};
 const follow=(curve:CubicBezierCurve,from:number,to:number,distance:number)=>{
  const steps=Math.max(12,Math.ceil(Math.abs(to-from)*120));
  for(let i=1;i<=steps;i++){const p=contour(curve,from+(to-from)*i/steps,distance);shape.lineTo(p[0],-p[1]);}
 };
 const left=two.curves as CubicBezierCurve[],right=nine.curves as CubicBezierCurve[];
 // Retain the filled bowl for the printed hand and a generous starting cap.
 join(contour(left[0],0,-OUTLINE_OFFSET),[123,128],[140,117]);
 follow(left[0],0,.82,-OUTLINE_OFFSET);
 join(contour(right[2],.32,OUTLINE_OFFSET),[479,149],[494,164]);
 // Trace the shoulder, outer bowl and lower sweep of the 9 backwards.
 follow(right[2],.32,0,OUTLINE_OFFSET);
 follow(right[1],1,0,OUTLINE_OFFSET);
 follow(right[0],1,0,OUTLINE_OFFSET);
 // Continue across the gap between the digits, then around the bowed foot
 // and the newly rounded heel of the 2, at exactly the same offset.
 join(contour(left.at(-1)!,1,OUTLINE_OFFSET),[518,593],[503,595]);
 follow(left.at(-1)!,1,0,OUTLINE_OFFSET);
 for(let i=left.length-2;i>=2;i--)follow(left[i],1,0,OUTLINE_OFFSET);
 follow(left[1],1,.9,OUTLINE_OFFSET);
 c(214,322,201,222,151,187);c(129,169,111,160,99,151);
 shape.closePath();return shape;
}
export function board29Face(){const s=board29Outline();for(const {point:[x,z]}of board29Holes){const h=new Path();h.absarc(x,-z,.035,0,Math.PI*2,true);s.holes.push(h);}return s;}
export function board29Path(digit:number,lane:number){return Array.from({length:321},(_,i)=>offset(digit,i/320,lane));}
