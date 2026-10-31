<script lang="ts">
 import Peg from './Peg.svelte';
 import { T } from '@threlte/core';
 import { onDestroy, untrack } from 'svelte';
 import { Path, CylinderGeometry, MeshBasicMaterial, Object3D, type InstancedMesh, type Material } from 'three';
 import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
 import { roundedShape, slabGeometry } from './geometry';
 import type { MaterialLibrary } from './materials';
 import { board, wood } from './textures';
 import { BOARD_WIDTH, BOARD_DEPTH, boardHoles, trackPoint, seats, ease } from './table';
 let {time,scenario,materials}:{time:number;scenario:string;materials?:MaterialLibrary}=$props();
 const walnut=wood();
 let maple=$state.raw(board());
 $effect(()=>{if(materials){const next=board(materials.maple.color.image as CanvasImageSource),previous=untrack(()=>maple);maple=next;previous.dispose();}});
 const base=new RoundedBoxGeometry(BOARD_WIDTH,.3,BOARD_DEPTH,5,.24);
 const edging=new RoundedBoxGeometry(BOARD_WIDTH-.09,.055,BOARD_DEPTH-.09,4,.2);
 const shape=roundedShape(BOARD_WIDTH-.2,BOARD_DEPTH-.2,.3);
 for(const {point:[x,z]} of boardHoles){const hole=new Path();hole.absarc(x,-z,.047,0,Math.PI*2,true);shape.holes.push(hole);}
 const panel=slabGeometry(shape,BOARD_WIDTH,BOARD_DEPTH,.12);
 const panelMaterials:Material[]=[];
 const holeGeometry=new CylinderGeometry(.047,.047,.012,12),holeMaterial=new MeshBasicMaterial({color:'#100c08'});
 function holes(mesh:InstancedMesh){const dummy=new Object3D();boardHoles.forEach(({point:[x,z]},i)=>{dummy.position.set(x,.427,z);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.instanceMatrix.needsUpdate=true;}
 function pegScore(lane:number,which:number){const seat=seats[lane];if(lane===0&&which===1&&scenario==='peg')return seat.previous+(seat.score+12-seat.previous)*ease(time/1.7);return which?seat.previous:seat.score;}
 onDestroy(()=>[walnut,maple,base,edging,panel,holeGeometry,holeMaterial].forEach(value=>value.dispose()));
</script>
<T.Group position={[0,0,0]}>
 <T.Mesh geometry={base} position.y={.2} castShadow receiveShadow><T.MeshPhysicalMaterial map={materials?.walnut.color??walnut} normalMap={materials?.walnut.normal} normalScale={[.2,.2]} roughnessMap={materials?.walnut.roughness} color="#c18c60" roughness={.7} clearcoat={.35} clearcoatRoughness={.3}/></T.Mesh>
 <T.Mesh geometry={edging} position.y={.34} castShadow><T.MeshStandardMaterial color="#6a4c2b" metalness={.45} roughness={.34}/></T.Mesh>
 <T.Mesh geometry={panel} material={panelMaterials} rotation.x={-Math.PI/2} position.y={.365} castShadow receiveShadow>
  <T.MeshPhysicalMaterial attach="material.0" map={maple} normalMap={materials?.maple.normal} normalScale={[.2,.2]} roughnessMap={materials?.maple.roughness} color="#e5c497" roughness={.9} clearcoat={.12} clearcoatRoughness={.32}/>
  <T.MeshStandardMaterial attach="material.1" color="#4b3320" roughness={.82}/>
  <T.MeshStandardMaterial attach="material.2" color="#4b3320" roughness={.82}/>
 </T.Mesh>
 <T.InstancedMesh args={[holeGeometry,holeMaterial,boardHoles.length]} oncreate={holes}/>
 {#each seats as seat,lane}
  {#each [0,1] as which}
   {@const point=trackPoint(pegScore(lane,which),lane)}
   {@const lift=lane===0&&which===1&&scenario==='peg'?Math.sin(ease(time/1.7)*Math.PI)*.95:0}
   <Peg color={seat.color} position={[point[0],.467+lift,point[1]]}/>
  {/each}
 {/each}
</T.Group>
