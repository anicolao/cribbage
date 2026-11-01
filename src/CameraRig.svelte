<script lang="ts">
 import { T, useTask, useThrelte } from '@threlte/core';
 import { onMount, untrack } from 'svelte';
 import { OrthographicCamera, PerspectiveCamera, Vector3 } from 'three';
 import { cameraClipRange } from './cameraMath';
 import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
 let { fov=45, resetKey=0, preset='table', onChange=()=>{} }:{fov:number;resetKey:number;preset:string;onChange?:(info:{elevation:number;distance:number})=>void}=$props();
 const { size, renderer, invalidate }=useThrelte();
 const perspective=new PerspectiveCamera(45,1,.05,2000);
 const orthographic=new OrthographicCamera(-10,10,7.5,-7.5,.05,2000);
 perspective.position.set(0,20,15); perspective.lookAt(0,0,.1);
 const active=$derived(fov===0?orthographic:perspective);
 let controls:OrbitControls|undefined;
 let previous:PerspectiveCamera|OrthographicCamera=perspective;
 const target=new Vector3(0,0,.1);
 function report(){const cam=controls?.object??previous;const offset=cam.position.clone().sub(controls?.target??target);const distance=offset.length(),range=cameraClipRange(distance);
  if(previous.near!==range.near||previous.far!==range.far){previous.near=range.near;previous.far=range.far;previous.updateProjectionMatrix();}
  onChange({elevation:Math.asin(offset.y/distance)*180/Math.PI,distance});invalidate();}
 function heightAtTarget(){const d=previous.position.distanceTo(controls?.target??target);return previous instanceof PerspectiveCamera?2*d*Math.tan(previous.fov*Math.PI/360)/previous.zoom:(previous.top-previous.bottom)/previous.zoom;}
 function project(height:number,direction:Vector3){
  const aspect=Math.max(.1,size.current.width/Math.max(1,size.current.height));
  const next=untrack(()=>active);
  const aim=controls?.target??target;
  if(next instanceof PerspectiveCamera){next.fov=fov;next.aspect=aspect;next.zoom=1;next.position.copy(aim).addScaledVector(direction,height/(2*Math.tan(fov*Math.PI/360)));}
  else {next.left=-height*aspect/2;next.right=height*aspect/2;next.top=height/2;next.bottom=-height/2;next.zoom=1;next.position.copy(aim).addScaledVector(direction,25);}
  next.lookAt(aim);next.updateProjectionMatrix();next.updateMatrixWorld();previous=next;
  if(controls){controls.object=next;controls.update();}report();
 }
 // Changing the lens preserves the target, orbit direction, and size at the target plane.
 $effect(()=>{fov; $size.width; $size.height;untrack(()=>{const direction=previous.position.clone().sub(controls?.target??target).normalize();project(heightAtTarget(),direction);});});
 $effect(()=>{resetKey;preset;untrack(()=>{const aim=controls?.target??target;aim.set(0,0,.1);const angle=(preset==='top'||preset.endsWith('-top')?89.9:preset==='low'||preset.endsWith('-low')?25:preset.startsWith('portrait')?40:preset==='landscape'?45:53)*Math.PI/180;project(preset.startsWith('portrait')?2*(preset.startsWith('portrait-tablet')?24:19)*Math.tan((fov||45)*Math.PI/360):preset.startsWith('landscape')?2*25*Math.tan((fov||45)*Math.PI/360):Math.max(16.3,22.7/(size.current.width/Math.max(1,size.current.height))),new Vector3(0,Math.sin(angle),Math.cos(angle)));});});
 onMount(()=>{controls=new OrbitControls(untrack(()=>active),renderer.domElement);controls.target.copy(target);controls.enableDamping=true;controls.dampingFactor=.09;controls.minPolarAngle=.001;controls.maxPolarAngle=Math.PI/2-.015;controls.minDistance=2;controls.maxDistance=1000;controls.minZoom=.15;controls.maxZoom=12;controls.screenSpacePanning=true;controls.addEventListener('change',report);controls.update();return()=>{controls?.removeEventListener('change',report);controls?.dispose();};});
 useTask(()=>{controls?.update();},{autoInvalidate:false});
</script>
<T is={active} makeDefault manual />
