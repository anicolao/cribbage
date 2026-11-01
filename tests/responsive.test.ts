import {expect,test} from 'bun:test';
import {Group,Mesh,PerspectiveCamera,Raycaster,Vector2,Vector3} from 'three';
import {tableLayout} from '../src/presentation/responsive';
import {phoneFrame,phonePlan} from '../src/presentation/phone';
import {animationExamples,buildTimeline} from '../src/presentation/catalog';
import {buildFrame} from '../src/presentation/frame';
import {sampleMotion,interactionPose} from '../src/presentation/motion';
import {cardTarget} from '../src/presentation/cardTarget';
import {initialState,apply} from '../src/game/engine';
import {roundedShape,slabGeometry} from '../src/geometry';
import {CARD_WIDTH,CARD_HEIGHT} from '../src/sceneLayout';
import {CARD_DEPTH} from '../src/table';

test('table dimensions select the reviewed layouts at the CSS-pixel boundaries',()=>{
 for(const [w,h,layout] of [[390,844,'phone-portrait'],[599,900,'phone-portrait'],[600,900,'ipad-portrait'],[820,1180,'ipad-portrait'],[844,390,'phone-landscape'],[1180,599,'phone-landscape'],[1180,600,'table'],[1180,820,'table']] as const)expect(tableLayout(w,h)).toBe(layout);
});

test('responsive motion keeps card identity, privacy, intent outcomes and exact final poses in every perspective',()=>{
 for(const e of animationExamples)for(const viewer of e.steps.at(-1)?.after.players.map(p=>p.id)??[e.viewer]){
  const timeline=buildTimeline(e,viewer);
  for(const {plan} of timeline.plans)for(const orientation of ['portrait','landscape'] as const){
   // Plans carry their associated target state in the catalogue's steps.
   const game=e.steps.find(s=>s.after.revision===plan.target.revision)?.after??e.steps.at(-1)?.after;
   if(!game)continue;
   const before=JSON.stringify(game),mapped=phonePlan(plan,game,viewer,orientation);
   expect(JSON.stringify(game)).toBe(before);
   expect(mapped.target.cards.map(c=>[c.id,c.owner,c.zone,c.flip])).toEqual(plan.target.cards.map(c=>[c.id,c.owner,c.zone,c.flip]));
   expect(sampleMotion(mapped,mapped.duration)).toEqual(mapped.target);
   expect(mapped.target.plates.map(p=>p.score)).toEqual(plan.target.plates.map(p=>p.score));
   for(const t of [0,mapped.duration/2,mapped.duration])for(const card of sampleMotion(mapped,t).cards)expect([...card.position,card.rotation,card.scale].every(Number.isFinite)).toBe(true);
  }
 }
});

test('projected mobile card targets hit their actual meshes in every held-card decision',()=>{
 const geometry=slabGeometry(roundedShape(CARD_WIDTH,CARD_HEIGHT,.09),CARD_WIDTH,CARD_HEIGHT,CARD_DEPTH);
 for(const count of [2,3,4]){
  let game=apply(initialState(),'p0',{type:'create',name:'Alex'});
  for(let i=1;i<count;i++)game=apply(game,`p${i}`,{type:'join',name:`Player ${i}`});
  game=apply(game,'p0',{type:'begin',seed:'mobile-card-targets'});
  for(const viewer of game.players.map(p=>p.id))for(const orientation of ['portrait','landscape'] as const){
   const frame=phoneFrame(buildFrame(game,viewer),game,viewer,orientation),held=frame.cards.filter(c=>c.zone==='hand'&&c.owner===viewer);
   expect(frame.cards.filter(c=>c.zone==='hand'&&c.owner!==viewer).every(c=>c.flip===Math.PI)).toBe(true);
   if(orientation==='landscape')expect(held.every(c=>c.position[0]>0&&c.position[2]>0)).toBe(true);
   for(let index=0;index<held.length;index++)for(const hover of [0,1]){
    const cards=held.map((c,i)=>interactionPose(c,i===index?hover:0,0)),root=new Group();
    const meshes=cards.map(c=>{const group=new Group();group.position.set(...c.position);group.rotation.y=c.rotation;group.scale.setScalar(c.scale);const mesh=new Mesh(geometry);mesh.rotation.x=-Math.PI/2;mesh.userData.id=c.id;group.add(mesh);root.add(group);return mesh;});root.updateMatrixWorld(true);
    const fov=orientation==='portrait'?60:45,distance=orientation==='portrait'?19:25,angle=(orientation==='portrait'?40:45)*Math.PI/180;
    const camera=new PerspectiveCamera(fov,orientation==='portrait'?390/844:844/390,.05,100);camera.position.set(0,distance*Math.sin(angle),.1+distance*Math.cos(angle));camera.lookAt(0,0,.1);camera.updateMatrixWorld();
    const p=new Vector3(...cardTarget(cards[index],index===cards.length-1,0)).project(camera),ray=new Raycaster();ray.setFromCamera(new Vector2(p.x,p.y),camera);
    expect(Math.abs(p.x)).toBeLessThan(1);expect(Math.abs(p.y)).toBeLessThan(1);
    expect({count,viewer,orientation,index,hover,hit:ray.intersectObjects(meshes,false)[0]?.object.userData.id}).toEqual({count,viewer,orientation,index,hover,hit:cards[index].id});
   }
  }
 }
 geometry.dispose();
});
