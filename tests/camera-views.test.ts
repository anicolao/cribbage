import {test,expect} from 'bun:test';
import {get} from 'svelte/store';
import {CAMERA_KEY,cameraMode,cameraViews,cameraLayout,normalizeCameraViews,initializeCameraViews,rememberCamera,resetCamera,type CameraView} from '../src/cameraViews';
const portrait:CameraView={position:[-3,15,12],target:[0,0,.1]},landscape:CameraView={position:[4,20,18],target:[1,0,-2]};
test('camera views accept finite above-table poses and reject corrupt or unusable stored views',()=>{
 expect(normalizeCameraViews(null)).toEqual({});
 expect(normalizeCameraViews({'phone-portrait':portrait,'phone-landscape':landscape,unknown:portrait})).toEqual({'phone-portrait':portrait,'phone-landscape':landscape});
 for(const position of [[0,0,0],[0,-10,4],[Infinity,12,4],[0,1001,4],[1,2],['1',2,3]])expect(normalizeCameraViews({table:{position,target:[0,0,0]}})).toEqual({});
});
test('orientation views persist independently, preserve pan, and do not persist camera mode',()=>{
 const data=new Map<string,string>(),storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};
 const stop=initializeCameraViews(storage);rememberCamera('phone-portrait',portrait);rememberCamera('phone-landscape',landscape);
 cameraMode.set(true);expect(JSON.parse(data.get(CAMERA_KEY)!)).toEqual({'phone-portrait':portrait,'phone-landscape':landscape});
 cameraLayout.set('phone-landscape');resetCamera();expect(get(cameraViews)).toEqual({'phone-portrait':portrait});
 rememberCamera('phone-landscape',landscape);stop();cameraViews.set({});const again=initializeCameraViews(storage);
 expect(get(cameraViews)).toEqual({'phone-portrait':portrait,'phone-landscape':landscape});again();cameraMode.set(false);cameraViews.set({});cameraLayout.set('table');
});
test('camera storage failures keep the table usable and invalid JSON restores defaults',()=>{
 const broken={getItem:()=>'{invalid',setItem:()=>{throw Error('storage unavailable');}};
 const stop=initializeCameraViews(broken);expect(get(cameraViews)).toEqual({});rememberCamera('ipad-portrait',portrait);expect(get(cameraViews)['ipad-portrait']).toEqual(portrait);stop();cameraViews.set({});
});
