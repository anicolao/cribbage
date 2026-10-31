import {test,expect} from 'bun:test';
import {Group,Mesh,PerspectiveCamera,Raycaster,Vector2,Vector3} from 'three';
import {cardTarget} from '../src/presentation/cardTarget';
import {pose,rotate,type CardVisual} from '../src/presentation/frame';
import {heldPose} from '../src/game/layout';
import {interactionPose} from '../src/presentation/motion';
import {roundedShape,slabGeometry} from '../src/geometry';
import {CARD_WIDTH,CARD_HEIGHT} from '../src/sceneLayout';
import {CARD_DEPTH} from '../src/table';
test('native card targets hit the intended solid mesh before hover and after hover and press in four-, five- and six-card fans',()=>{
 const geometry=slabGeometry(roundedShape(CARD_WIDTH,CARD_HEIGHT,.09),CARD_WIDTH,CARD_HEIGHT,CARD_DEPTH),camera=new PerspectiveCamera(45,1180/820,.1,100);camera.position.set(0,20,15);camera.lookAt(0,0,.1);camera.updateMatrixWorld();
 for(const held of [4,5,6])for(let index=0;index<held;index++)for(const hover of [0,.5,1])for(const press of new Set([0,hover])){
  const root=new Group();root.rotation.y=.055;
  const cards:CardVisual[]=Array.from({length:held},(_,i)=>{const f=heldPose(i,held);return interactionPose({...pose([-6.2+f.position[0],f.position[1],5.05+f.position[2]],f.rotation),id:String(i),card:String(i),owner:'you',zone:'hand',order:i},i===index?hover:0,i===index?press:0);});
  const meshes=cards.map(c=>{const g=new Group();g.position.set(...c.position);g.rotation.y=c.rotation;const m=new Mesh(geometry);m.rotation.x=-Math.PI/2;m.userData.id=c.id;g.add(m);root.add(g);return m;});root.updateMatrixWorld(true);
  const point=new Vector3(...cardTarget(cards[index],index===held-1)).project(camera),ray=new Raycaster();ray.setFromCamera(new Vector2(point.x,point.y),camera);
  expect({held,index,hover,press,hit:ray.intersectObjects(meshes,false)[0]?.object.userData.id}).toEqual({held,index,hover,press,hit:String(index)});
 }
 geometry.dispose();
});
