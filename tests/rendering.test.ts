import { expect, test } from 'bun:test';
import { Mesh, MeshBasicMaterial, Path, Raycaster, Vector3 } from 'three';
import { roundedShape, slabGeometry } from '../src/geometry';
import { cameraClipRange } from '../src/cameraMath';
import { CARD_DEPTH, STACK_STEP, fanCard, boardHoles, BOARD_WIDTH, BOARD_DEPTH } from '../src/table';

test('a textured slab has one top surface, one underside, and distinct edge material', () => {
 const geometry=slabGeometry(roundedShape(1.38,2,.09),1.38,2,CARD_DEPTH);
 const materials=Array.from({length:3},()=>new MeshBasicMaterial());
 const mesh=new Mesh(geometry,materials);mesh.updateMatrixWorld();
 const hits=new Raycaster(new Vector3(.13,.21,1),new Vector3(0,0,-1)).intersectObject(mesh);
 expect(hits).toHaveLength(1);
 expect(hits[0].point.z).toBeCloseTo(CARD_DEPTH);
 expect(hits[0].face?.materialIndex).toBe(0);
 const underside=new Raycaster(new Vector3(.13,.21,-1),new Vector3(0,0,1)).intersectObject(mesh);
 expect(underside).toHaveLength(1);
 expect(underside[0].point.z).toBeCloseTo(0);
 expect(underside[0].face?.materialIndex).toBe(1);
 expect(geometry.groups.reduce((sum,g)=>sum+g.count,0)).toBe(geometry.getAttribute('position').count);
 expect([...new Set(geometry.groups.map(g=>g.materialIndex))].sort()).toEqual([0,1,2]);
 geometry.dispose();materials.forEach(m=>m.dispose());
});

test('the consolidated board cap leaves scoring and shared finish holes open', () => {
 const shape=roundedShape(BOARD_WIDTH-.2,BOARD_DEPTH-.2,.3);
 for(const {point:[x,z]} of boardHoles){const path=new Path();path.absarc(x,-z,.047,0,Math.PI*2,true);shape.holes.push(path);}
 const geometry=slabGeometry(shape,BOARD_WIDTH,BOARD_DEPTH,.12),materials=Array.from({length:3},()=>new MeshBasicMaterial()),mesh=new Mesh(geometry,materials);
 mesh.updateMatrixWorld();
 for(const {point:[x,z]} of boardHoles.filter(h=>[1,35,45,80,85,90,120,121].includes(h.score))){
  expect(new Raycaster(new Vector3(x,-z,1),new Vector3(0,0,-1)).intersectObject(mesh)).toHaveLength(0);
 }
 geometry.dispose();materials.forEach(m=>m.dispose());
});

test('fan and deck layers have physical clearance instead of touching or interpenetrating', () => {
 for(let i=0;i<3;i++)expect(fanCard(i+1).position[1]-fanCard(i).position[1]-CARD_DEPTH).toBeGreaterThan(.005);
 expect(STACK_STEP-CARD_DEPTH).toBeGreaterThan(.001);
});

test('camera depth precision stays below card clearance at close, normal, and telephoto distances', () => {
 for(const distance of [2,12,20,25,600,950]){
  const {near,far}=cameraClipRange(distance);
  expect(near).toBeGreaterThan(0);expect(near).toBeLessThan(distance);expect(far).toBeGreaterThan(distance+24);
  // Approximate quantisation at the target plane for a 24-bit perspective depth buffer.
  const depthStep=distance**2*(1/near-1/far)/(2**24-1);
  expect(depthStep).toBeLessThan(.0001);
 }
});
