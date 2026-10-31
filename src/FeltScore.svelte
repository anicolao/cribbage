<script lang="ts">
 import {T} from '@threlte/core';
 import {CanvasTexture,SRGBColorSpace,type Texture} from 'three';
 import type {Position} from './table';
 let {score,position,opacity=1}:{score:number;position:Position;opacity?:number}=$props();
 let ink=$state.raw<Texture>();
 $effect(()=>{
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;
  const g=canvas.getContext('2d')!;g.fillStyle='#e9dfc0';g.font='bold 86px Georgia';g.textAlign='center';g.textBaseline='middle';g.fillText(String(score),128,67);
  // Let the baize show through fine, deterministic gaps in the printed ink.
  g.globalCompositeOperation='destination-out';g.fillStyle='#00000018';
  for(let y=0;y<128;y+=3)for(let x=(y%2)*2;x<256;x+=4)g.fillRect(x,y,1,1);
  const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;texture.anisotropy=8;ink=texture;return()=>texture.dispose();
 });
</script>
<T.Mesh {position} rotation.x={-Math.PI/2} receiveShadow>
 <T.PlaneGeometry args={[1.35,.65]}/>
 <T.MeshStandardMaterial map={ink} transparent opacity={.9*opacity} roughness={1} metalness={0} depthWrite={false} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1}/>
</T.Mesh>
