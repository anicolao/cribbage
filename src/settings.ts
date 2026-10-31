import {get,writable} from 'svelte/store';
export type AnimationSpeed='standard'|'fast'|'ultra';
export type Preferences={autoSeconds:number|null;animationSpeed:AnimationSpeed;music:boolean;musicVolume:number;effects:boolean;effectsVolume:number};
export const ANIMATION_RATES:Record<AnimationSpeed,number>={standard:1,fast:2,ultra:4};
export const DEFAULT_PREFERENCES:Preferences={autoSeconds:3,animationSpeed:'standard',music:false,musicVolume:.3,effects:true,effectsVolume:.45};
export const SETTINGS_KEY='cribbage:settings:v1';
export const preferences=writable<Preferences>({...DEFAULT_PREFERENCES});
export const settingsOpen=writable(false);
export function normalizePreferences(value:unknown):Preferences{
 const p=value&&typeof value==='object'?value as Partial<Preferences>:{},volume=(v:unknown,fallback:number)=>typeof v==='number'&&Number.isFinite(v)?Math.min(1,Math.max(0,v)):fallback;
 return {autoSeconds:p.autoSeconds===null?null:typeof p.autoSeconds==='number'&&Number.isInteger(p.autoSeconds)&&p.autoSeconds>=0&&p.autoSeconds<=5?p.autoSeconds:3,animationSpeed:p.animationSpeed&&Object.hasOwn(ANIMATION_RATES,p.animationSpeed)?p.animationSpeed:'standard',music:typeof p.music==='boolean'?p.music:false,musicVolume:volume(p.musicVolume,.3),effects:typeof p.effects==='boolean'?p.effects:true,effectsVolume:volume(p.effectsVolume,.45)};
}
export function updatePreference<K extends keyof Preferences>(key:K,value:Preferences[K]){preferences.update(p=>normalizePreferences({...p,[key]:value}));}
export function initializePreferences(storage:Pick<Storage,'getItem'|'setItem'>){
 try{preferences.set(normalizePreferences(JSON.parse(storage.getItem(SETTINGS_KEY)??'{}')));}catch{preferences.set({...DEFAULT_PREFERENCES});}
 return preferences.subscribe(p=>{try{storage.setItem(SETTINGS_KEY,JSON.stringify(p));}catch{}});
}
export const currentPreferences=()=>get(preferences);
