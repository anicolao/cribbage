import {writable} from 'svelte/store';
import type {Preferences} from '../settings';
import {DEFAULT_PREFERENCES} from '../settings';
import {soundCues,type SoundCue} from './cues';
import type {Plan} from '../presentation/motion';
export const audioState=writable<{context:string;music:'off'|'waiting'|'loading'|'playing'|'error';effects:number}>({context:'locked',music:'off',effects:0});
const MUSIC_URL=`${import.meta.env.BASE_URL}music/baize-at-dusk.mp3`;
class TableAudio{
 private context?:AudioContext;private musicGain?:GainNode;private effectsGain?:GainNode;private buffer?:Promise<AudioBuffer>;private music?:AudioBufferSourceNode;
 private preferences:Preferences={...DEFAULT_PREFERENCES};private visible=true;private generation=0;private played=new Set<string>();private voices=new Set<AudioScheduledSourceNode>();private noise?:AudioBuffer;
 private publish(music?:'off'|'waiting'|'loading'|'playing'|'error'){audioState.update(s=>({context:this.context?.state??'locked',music:music??s.music,effects:s.effects}));}
 apply(preferences:Preferences){
  this.preferences=preferences;const c=this.context;
  if(c){this.musicGain!.gain.setTargetAtTime(this.visible?preferences.musicVolume:0,c.currentTime,.03);this.effectsGain!.gain.setTargetAtTime(preferences.effectsVolume,c.currentTime,.015);}
  if(!preferences.effects)this.cancelEffects();
  if(!preferences.music){this.generation++;this.music?.stop();this.music=undefined;this.publish('off');}
  else if(c?.state==='running')void this.startMusic();else this.publish('waiting');
 }
 async unlock(){
  if(!this.preferences.music&&!this.preferences.effects)return;
  try{
   if(!this.context){
    const Constructor=window.AudioContext??(window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext;if(!Constructor)return;
    const c=this.context=new Constructor();this.musicGain=c.createGain();this.effectsGain=c.createGain();this.musicGain.gain.value=this.preferences.musicVolume;this.effectsGain.gain.value=this.preferences.effectsVolume;this.musicGain.connect(c.destination);this.effectsGain.connect(c.destination);
    c.onstatechange=()=>this.publish();
   }
   if(this.context.state!=='running')await this.context.resume();this.publish();if(this.preferences.music)await this.startMusic();
  }catch{this.publish(this.preferences.music?'waiting':'off');}
 }
 private async startMusic(){
  const c=this.context;if(!c||c.state!=='running'||!this.preferences.music||this.music)return;
  const generation=this.generation;this.publish('loading');
  try{
   this.buffer??=fetch(MUSIC_URL).then(r=>{if(!r.ok)throw new Error('Music unavailable');return r.arrayBuffer();}).then(b=>c.decodeAudioData(b)).catch(error=>{this.buffer=undefined;throw error;});
   const buffer=await this.buffer;if(generation!==this.generation||!this.preferences.music||this.music)return;
   const source=c.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(this.musicGain!);this.music=source;source.start();this.publish('playing');
  }catch{if(generation===this.generation&&this.preferences.music)this.publish('error');}
 }
 setVisible(visible:boolean){this.visible=visible;if(this.context)this.musicGain!.gain.setTargetAtTime(visible?this.preferences.musicVolume:0,this.context.currentTime,.06);if(!visible)this.cancelEffects();else if(this.context?.state==='suspended')void this.unlock();}
 private noiseBuffer(){
  const c=this.context!;if(this.noise)return this.noise;const b=c.createBuffer(1,Math.ceil(c.sampleRate*.4),c.sampleRate),data=b.getChannelData(0);let seed=0x719a3;
  for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=seed/2147483648-1;}return this.noise=b;
 }
 private voice(cue:SoundCue,when:number){
  audioState.update(s=>({...s,effects:s.effects+1}));
  const c=this.context!,gain=c.createGain(),filter=c.createBiquadFilter();gain.connect(this.effectsGain!);filter.connect(gain);
  const duration=cue.kind==='shuffle'?.24:cue.kind==='win'?.6:cue.kind==='peg'?.065:.13;
  gain.gain.setValueAtTime(0,when);gain.gain.linearRampToValueAtTime(cue.gain*(cue.kind==='win'?.045:.12),when+.004);gain.gain.exponentialRampToValueAtTime(.00001,when+duration);
  const register=(source:AudioScheduledSourceNode)=>{this.voices.add(source);source.onended=()=>{this.voices.delete(source);source.disconnect();gain.disconnect();filter.disconnect();};source.start(when);source.stop(when+duration+.02);};
  if(cue.kind==='win'){
   // A quiet D-major acknowledgement, separate from the chamber recording.
   for(const [i,f] of [293.6648,369.9944,440].entries()){const o=c.createOscillator();o.type='sine';o.frequency.value=f;const g=c.createGain();g.gain.value=.35;o.connect(g);g.connect(gain);this.voices.add(o);o.onended=()=>{this.voices.delete(o);o.disconnect();g.disconnect();if(i===2){gain.disconnect();filter.disconnect();}};o.start(when+i*.04);o.stop(when+duration);}
  }else{
   const noise=c.createBufferSource();noise.buffer=this.noiseBuffer();filter.type='bandpass';filter.frequency.value=cue.kind==='peg'?1900:cue.kind==='seat'?260:cue.kind==='flip'?1500:850;filter.Q.value=cue.kind==='peg'?2:.65;noise.connect(filter);register(noise);
   if(cue.kind==='peg'||cue.kind==='seat'){const o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.setValueAtTime(cue.kind==='peg'?780:160,when);o.frequency.exponentialRampToValueAtTime(cue.kind==='peg'?460:90,when+.05);g.gain.value=.2;o.connect(g);g.connect(gain);this.voices.add(o);o.onended=()=>{this.voices.delete(o);o.disconnect();g.disconnect();};o.start(when);o.stop(when+duration);}
  }
 }
 plan(plan:Plan,elapsed=0,reset=true){
  this.cancelEffects();if(reset)this.played.clear();else for(const cue of soundCues(plan))if(cue.at>=elapsed)this.played.delete(cue.id);
  if(!this.context||this.context.state!=='running'||!this.preferences.effects||!this.visible)return;
  for(const cue of soundCues(plan))if(cue.at>=elapsed&&!this.played.has(cue.id)){this.played.add(cue.id);this.voice(cue,this.context.currentTime+cue.at-elapsed);}
 }
 review(plan:Plan,from:number,to:number,playing:boolean){
  if(!playing||to<from){this.cancelEffects();this.played.clear();return;}
  if(!this.context||this.context.state!=='running'||!this.preferences.effects||!this.visible)return;
  for(const cue of soundCues(plan))if(cue.at>from&&cue.at<=to&&!this.played.has(cue.id)){this.played.add(cue.id);this.voice(cue,this.context.currentTime);}
 }
 resetCues(){this.cancelEffects();this.played.clear();}
 cancelEffects(){for(const voice of this.voices)try{voice.stop();}catch{}this.voices.clear();}
 destroy(){this.cancelEffects();this.generation++;this.music?.stop();this.music=undefined;void this.context?.close();this.context=undefined;this.buffer=undefined;this.noise=undefined;this.publish('off');}
}
export const tableAudio=new TableAudio();
