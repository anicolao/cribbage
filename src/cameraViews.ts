import {get,writable} from 'svelte/store';
import type {TableLayout} from './presentation/responsive';
export type CameraView={position:[number,number,number];target:[number,number,number]};
export type CameraInfo=CameraView&{elevation:number;distance:number};
export const CAMERA_KEY='cribbage:camera:v1';
export const cameraMode=writable(false),cameraReset=writable(0),cameraLayout=writable<TableLayout>('table');
export const cameraViews=writable<Partial<Record<TableLayout,CameraView>>>({});
export function normalizeCameraViews(value:unknown):Partial<Record<TableLayout,CameraView>>{
 const result:Partial<Record<TableLayout,CameraView>>={};
 if(!value||typeof value!=='object')return result;
 const vector=(v:unknown):v is [number,number,number]=>Array.isArray(v)&&v.length===3&&v.every(n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=1000);
 for(const key of ['table','ipad-portrait','phone-portrait','phone-landscape'] as const){
  const view=(value as Record<string,CameraView>)[key];if(!view||!vector(view.position)||!vector(view.target))continue;
  const offset=view.position.map((n,i)=>n-view.target[i]),distance=Math.hypot(...offset);
  if(distance<2||distance>1000||offset[1]<=0)continue;
  result[key]={position:[...view.position],target:[...view.target]};
 }
 return result;
}
export function rememberCamera(layout:TableLayout,view:CameraView){cameraViews.update(views=>normalizeCameraViews({...views,[layout]:view}));}
export function resetCamera(){const key=get(cameraLayout);cameraViews.update(views=>{const next={...views};delete next[key];return next;});cameraReset.update(n=>n+1);}
export function initializeCameraViews(storage:Pick<Storage,'getItem'|'setItem'>){
 try{cameraViews.set(normalizeCameraViews(JSON.parse(storage.getItem(CAMERA_KEY)??'{}')));}catch{cameraViews.set({});}
 return cameraViews.subscribe(views=>{try{storage.setItem(CAMERA_KEY,JSON.stringify(views));}catch{}});
}
