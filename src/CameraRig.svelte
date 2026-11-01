<script lang="ts">
 import { T, useTask, useThrelte } from '@threlte/core';
 import { onMount, untrack } from 'svelte';
 import { OrthographicCamera, PerspectiveCamera, Vector3 } from 'three';
 import {get} from 'svelte/store';
 import {cameraReset,cameraViews,rememberCamera,type CameraInfo} from './cameraViews';
 import type {TableLayout} from './presentation/responsive';
 import { cameraClipRange } from './cameraMath';
 import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
 let { fov=45, resetKey=0, preset='table', interactive=false, viewKey, onChange=()=>{} }:{fov:number;resetKey:number;preset:string;interactive?:boolean;viewKey?:TableLayout;onChange?:(info:CameraInfo)=>void}=$props();
 const { size, renderer, invalidate }=useThrelte();
 const perspective=new PerspectiveCamera(45,1,.05,2000);
 const orthographic=new OrthographicCamera(-10,10,7.5,-7.5,.05,2000);
 perspective.position.set(0,20,15); perspective.lookAt(0,0,.1);
 const active=$derived(fov===0?orthographic:perspective);
 let controls:OrbitControls|undefined;
 let applying=false,custom=false,lastKey='',lastFov=untrack(()=>fov);
 let previous:PerspectiveCamera|OrthographicCamera=perspective;
 const target=new Vector3(0,0,.1);
 function report(){const cam=controls?.object??previous;const offset=cam.position.clone().sub(controls?.target??target);const distance=offset.length(),range=cameraClipRange(distance);
  if(previous.near!==range.near||previous.far!==range.far){previous.near=range.near;previous.far=range.far;previous.updateProjectionMatrix();}
  const view={position:cam.position.toArray() as [number,number,number],target:(controls?.target??target).toArray() as [number,number,number]};
  onChange({...view,elevation:Math.asin(offset.y/distance)*180/Math.PI,distance});if(!applying&&interactive&&viewKey){custom=true;rememberCamera(viewKey,view);}invalidate();}
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
 // One projection update owns both layout resets and resizing. Never carry
 // the preceding orientation's target-plane height into a new layout.
 $effect(()=>{
  const width=$size.width,height=$size.height,lens=fov,key=`${preset}:${resetKey}:${viewKey??'lab'}:${$cameraReset}`;
  untrack(()=>{
   applying=true;
   if(key!==lastKey){
    lastKey=key;const saved=viewKey?get(cameraViews)[viewKey]:undefined;custom=!!saved;
    const aim=controls?.target??target;
    if(saved){
     aim.fromArray(saved.target);const position=new Vector3(...saved.position),direction=position.clone().sub(aim),distance=direction.length();
     project(2*distance*Math.tan((lens||45)*Math.PI/360),direction.normalize());
    }else defaults();
   }else if(lens!==lastFov){
    const direction=previous.position.clone().sub(controls?.target??target).normalize();project(heightAtTarget(),direction);
   }else if(!custom&&preset==='table')defaults();
   else{
    const aspect=Math.max(.1,width/Math.max(1,height));
    if(previous instanceof PerspectiveCamera)previous.aspect=aspect;
    else{const h=previous.top-previous.bottom;previous.left=-h*aspect/2;previous.right=h*aspect/2;}
    previous.updateProjectionMatrix();previous.updateMatrixWorld();report();
   }
   lastFov=lens;applying=false;
  });
 });
 function defaults(){
  const aim=controls?.target??target;aim.set(0,0,.1);
  const angle=(preset==='top'||preset.endsWith('-top')?89.9:preset==='low'||preset.endsWith('-low')?25:preset.startsWith('portrait')?40:preset==='landscape'?45:53)*Math.PI/180;
  project(preset.startsWith('portrait')?2*(preset.startsWith('portrait-tablet')?24:19)*Math.tan((fov||45)*Math.PI/360):preset.startsWith('landscape')?2*25*Math.tan((fov||45)*Math.PI/360):Math.max(16.3,22.7/(size.current.width/Math.max(1,size.current.height))),new Vector3(0,Math.sin(angle),Math.cos(angle)));
 }
 onMount(()=>{controls=new OrbitControls(untrack(()=>active),renderer.domElement);controls.target.copy(target);controls.enabled=interactive;controls.enableDamping=false;controls.minPolarAngle=.001;controls.maxPolarAngle=Math.PI/2-.015;controls.minDistance=2;controls.maxDistance=1000;controls.minZoom=.15;controls.maxZoom=12;controls.screenSpacePanning=true;controls.addEventListener('change',report);controls.update();return()=>{controls?.removeEventListener('change',report);controls?.dispose();};});
 $effect(()=>{const enabled=interactive;if(controls)controls.enabled=enabled;});
 useTask(()=>{controls?.update();},{autoInvalidate:false});
</script>
<T is={active} makeDefault manual />
