<script lang="ts">
 import {T} from '@threlte/core';
 import {onDestroy,untrack} from 'svelte';
 import {CanvasTexture,SRGBColorSpace,ExtrudeGeometry,CylinderGeometry,MeshBasicMaterial,Object3D,type InstancedMesh,type Material,type Texture} from 'three';
 import {BOARD29_LANE_EDGES,board29Outline,board29Face,board29Holes,board29Path,board29Point,board29Divider,BOARD29_WIDTH as W,BOARD29_DEPTH as D} from './board29';
 import {slabGeometry} from './geometry';
 import {wood} from './textures';
 import type {MaterialLibrary} from './materials';
 let {materials,cards}:{materials?:MaterialLibrary;cards:Record<string,Texture>}=$props();
 const fallback=wood(true),base=new ExtrudeGeometry(board29Outline(),{depth:.25,bevelEnabled:true,bevelThickness:.045,bevelSize:.045,bevelSegments:3,curveSegments:24});
 const face=slabGeometry(board29Face(),W,D,.07),faceMaterials:Material[]=[];
 const holeGeometry=new CylinderGeometry(.035,.035,.009,12),holeMaterial=new MeshBasicMaterial({color:'#181007'});
 let ink=$state.raw<Texture>();
 $effect(()=>{
  const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=Math.round(2048*D/W);const g=canvas.getContext('2d')!,X=(x:number)=>(x/W+.5)*canvas.width,Y=(z:number)=>(z/D+.5)*canvas.height;
  g.drawImage((materials?.maple.color.image??fallback.image) as CanvasImageSource,0,0,canvas.width,canvas.height);
  const grain=document.createElement('canvas');grain.width=canvas.width;grain.height=canvas.height;grain.getContext('2d')!.drawImage(canvas,0,0);
  const print=(id:string,x:number,z:number,angle:number,w=1.12)=>{const image=cards[id]?.image;if(!image)return;g.save();g.translate(X(x),Y(z));g.rotate(angle);const width=w/W*canvas.width,height=w*1.45/D*canvas.height;g.globalAlpha=.87;g.drawImage(image as CanvasImageSource,-width/2,-height/2,width,height);g.restore();};
  ['5_of_hearts','5_of_clubs','jack_of_diamonds','5_of_spades'].forEach((id,i)=>print(id,-1.55+i*.31,.05-i*.12,(i-2)*.13));print('5_of_diamonds',1.55,.15,.015,1.35);
  const drawPath=(points:[number,number][])=>{g.beginPath();points.forEach(([x,z],i)=>i?g.lineTo(X(x),Y(z)):g.moveTo(X(x),Y(z)));};
  for(let digit=0;digit<2;digit++){
   drawPath(board29Path(digit,1.5));g.strokeStyle=g.createPattern(grain,'no-repeat')!;g.lineWidth=.99/W*canvas.width;g.stroke();
   for(const lane of BOARD29_LANE_EDGES){drawPath(board29Path(digit,lane));g.strokeStyle='#3b291c';g.lineWidth=3;g.stroke();}
  }
  for(let score=5;score<=120;score+=5){
   const [a,b]=board29Divider(score),ax=X(a[0]),ay=Y(a[1]),bx=X(b[0]),by=Y(b[1]);
   const length=Math.hypot(bx-ax,by-ay);let angle=Math.atan2(by-ay,bx-ax);
   if(angle>Math.PI/2)angle-=Math.PI;if(angle< -Math.PI/2)angle+=Math.PI;
   g.save();g.translate((ax+bx)/2,(ay+by)/2);g.rotate(angle);
   g.font='bold 43px Georgia';g.textAlign='center';g.textBaseline='middle';
   const gap=g.measureText(String(score)).width/2+9;
   g.strokeStyle=score===90?'#913b27':'#49301f';g.lineWidth=score===90?5:3;
   g.beginPath();g.moveTo(-length/2,0);g.lineTo(-gap,0);g.moveTo(gap,0);g.lineTo(length/2,0);g.stroke();
   g.fillStyle='#762e22';g.fillText(String(score),0,1);g.restore();
  }
  const finish=board29Point(121,0);g.fillStyle='#5c2c1c';g.font='bold 30px Georgia';g.textAlign='center';g.fillText('121',X(finish[0]+.16),Y(finish[1]+.18));
  const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;texture.anisotropy=16;const previous=untrack(()=>ink);ink=texture;previous?.dispose();
 });
 function holes(mesh:InstancedMesh){const dummy=new Object3D();board29Holes.forEach(({point:[x,z]},i)=>{dummy.position.set(x,.407,z);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.instanceMatrix.needsUpdate=true;}
 onDestroy(()=>[fallback,base,face,holeGeometry,holeMaterial,ink].forEach(v=>v?.dispose()));
</script>
<T.Mesh geometry={base} rotation.x={-Math.PI/2} position.y={.13} castShadow receiveShadow><T.MeshPhysicalMaterial map={materials?.walnut.color??fallback} normalMap={materials?.walnut.normal} normalScale={[.15,.15]} color="#ae7f50" roughness={.68} clearcoat={.24}/></T.Mesh>
<T.Mesh geometry={face} rotation.x={-Math.PI/2} position.y={.39} material={faceMaterials} castShadow receiveShadow>
 <T.MeshPhysicalMaterial attach="material.0" map={ink} normalMap={materials?.maple.normal} normalScale={[.12,.12]} roughnessMap={materials?.maple.roughness} color="#ecd0a4" roughness={.82} clearcoat={.18} clearcoatRoughness={.35}/>
 <T.MeshStandardMaterial attach="material.1" color="#6e4628" roughness={.8}/><T.MeshStandardMaterial attach="material.2" color="#9f7046" roughness={.75}/>
</T.Mesh>
<T.InstancedMesh args={[holeGeometry,holeMaterial,board29Holes.length]} oncreate={holes}/>
