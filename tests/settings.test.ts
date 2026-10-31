import {test,expect} from 'bun:test';
import {get} from 'svelte/store';
import {DEFAULT_PREFERENCES,normalizePreferences,initializePreferences,preferences,updatePreference,SETTINGS_KEY,ANIMATION_RATES} from '../src/settings';
import {TableClock,automaticChoice,countdownAction,intentForAction} from '../src/game/countdowns';
import {animationExamples,buildTimeline,timelineAt} from '../src/presentation/catalog';
import {sampleMotion,planMotion} from '../src/presentation/motion';
import {retimePlan,retimedStart} from '../src/presentation/timing';
import {soundCues} from '../src/audio/cues';
import composition from '../scores/baize-at-dusk.json' with {type:'json'};
function storage(initial='{}'){const data=new Map([[SETTINGS_KEY,initial]]);return {getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);}};}
test('preferences restore valid choices, reject corrupt data and persist only supported personal settings',()=>{
 expect(normalizePreferences(null)).toEqual(DEFAULT_PREFERENCES);expect(normalizePreferences({autoSeconds:99,animationSpeed:'__proto__',music:'yes',effects:null,musicVolume:NaN,effectsVolume:Infinity})).toEqual(DEFAULT_PREFERENCES);
 expect(normalizePreferences({autoSeconds:null,animationSpeed:'ultra',music:true,effects:false,musicVolume:2,effectsVolume:-1})).toEqual({autoSeconds:null,animationSpeed:'ultra',music:true,effects:false,musicVolume:1,effectsVolume:0});
 const store=storage('{bad json'),stop=initializePreferences(store);expect(get(preferences)).toEqual(DEFAULT_PREFERENCES);updatePreference('autoSeconds',null);updatePreference('animationSpeed','fast');expect(JSON.parse(store.getItem(SETTINGS_KEY)!)).toEqual({...DEFAULT_PREFERENCES,autoSeconds:null,animationSpeed:'fast'});stop();
 const again=initializePreferences(store);expect(get(preferences).autoSeconds).toBeNull();expect(get(preferences).animationSpeed).toBe('fast');again();preferences.set({...DEFAULT_PREFERENCES});
});
for(const seconds of [null,0,1,2,3,4,5])test(`${seconds??'Manual'} timing applies to every mandatory action and sole legal card; companion timing stays independent`,()=>{
 for(const id of ['auto-cut','auto-count','auto-deal','go','forced-fit','last-card']){
  const step=animationExamples.find(e=>e.id===id)!.steps[0],state=step.before,actor=state.players[state.turn].id,store=storage(),clock=new TableClock(store,'turn'),duration=seconds===null?null:seconds*1000;
  const windows=clock.observe(state,10000,true,duration),pending=windows.turn??windows.go!,action=countdownAction(state,actor,windows,10000)!;
  expect(intentForAction(action)).toEqual(step.intent);expect(action.remaining).toBe(seconds??undefined);
  if(seconds===null){expect(pending.deadline).toBe(Infinity);expect(automaticChoice(state,actor,windows,1e12)).toBeUndefined();expect(store.getItem('turn')??'{}').toBe('{}');}
  else{expect(pending.deadline).toBe(10000+seconds*1000);expect(automaticChoice(state,actor,windows,9999+seconds*1000)).toBeUndefined();expect(automaticChoice(state,actor,windows,10000+seconds*1000)?.intent).toEqual(step.intent);}
  const bot=structuredClone(state);bot.players[bot.turn].bot=true;const botWindows=new TableClock(storage(),'bot').observe(bot,10000,true,duration);expect((botWindows.turn??botWindows.go)?.deadline).toBe(10600);expect(automaticChoice(bot,bot.host,botWindows,10600)?.intent).toEqual(step.intent);
 }
});
test('opening settings pauses a personal timer and closing starts a fresh chosen duration; reload keeps an active deadline',()=>{
 const step=animationExamples.find(e=>e.id==='forced-fit')!.steps[0],state=step.before,actor=state.players[state.turn].id,store=storage(),clock=new TableClock(store,'settings-turn');
 const first=clock.observe(state,1000,true,3000);expect(first.turn?.deadline).toBe(4000);
 const paused=clock.observe(state,2000,true,null);expect(automaticChoice(state,actor,paused,50000)).toBeUndefined();expect(countdownAction(state,actor,paused,50000)?.remaining).toBeUndefined();
 const resumed=clock.observe(state,50000,true,5000);expect(resumed.turn?.deadline).toBe(55000);expect(new TableClock(store,'settings-turn').observe(state,52000,true,5000).turn?.deadline).toBe(55000);
 const changed=clock.observe(state,53000,true,1000);expect(changed.turn?.deadline).toBe(54000);expect(automaticChoice(state,actor,resumed,54000)).toBeUndefined();expect(automaticChoice(state,actor,changed,54000)?.intent).toEqual(step.intent);
});
test('Manual on a human seat cannot be overridden by another client’s shorter automatic Go setting',()=>{
 const step=animationExamples.find(e=>e.id==='go')!.steps[0],state=step.before,actor=state.players[state.turn].id;
 const manual=new TableClock(storage(),'manual').observe(state,0,true,null),other=new TableClock(storage(),'host').observe(state,0,true,0);
 expect(automaticChoice(state,actor,manual,999999)).toBeUndefined();for(const viewer of state.players.filter(p=>p.id!==actor))expect(automaticChoice(state,viewer.id,other,999999)).toBeUndefined();
});
test('all animation speeds preserve final poses and scoring while retiming card, peg, label and sound cues together',()=>{
 const e=animationExamples.find(e=>e.id==='pair-last')!,step=e.steps[0],plan=planMotion(step.before,step.after,e.viewer);
 for(const rate of Object.values(ANIMATION_RATES)){
  const scaled=retimePlan(plan,rate);expect(scaled.target).toBe(plan.target);expect(scaled.duration).toBe(plan.duration/rate);expect(sampleMotion(scaled,scaled.duration)).toEqual(plan.target);
  const original=soundCues(plan),sounds=soundCues(scaled);expect(sounds.map(c=>c.kind)).toEqual(original.map(c=>c.kind));for(const [i,c] of sounds.entries())expect(c.at).toBeCloseTo(original[i].at/rate,10);
  for(const t of [.2,.5,1.2])expect(sampleMotion(scaled,t/rate)).toEqual(sampleMotion(plan,t));
 }
});
test('changing speed mid-flight preserves the current pose instead of jumping or restarting',()=>{
 const e=animationExamples.find(e=>e.id==='play-you')!,step=e.steps[0],plan=planMotion(step.before,step.after,e.viewer),now=1500,start=1000;
 const shifted=retimedStart(start,now,1,4);expect(shifted).toBe(1375);expect(sampleMotion(retimePlan(plan,4),(now-shifted)/1000)).toEqual(sampleMotion(plan,(now-start)/1000));
});
test('lab playback keeps chosen human wait times in real seconds at every animation speed',()=>{
 const e=animationExamples.find(e=>e.id==='auto-cut')!;
 for(const rate of [1,2,4]){
  const timeline=buildTimeline(e,e.viewer,{autoMs:5000,animationRate:rate});expect(timeline.plans[0].start).toBe(5);expect(timelineAt(timeline,.5).action?.remaining).toBe(5);expect(timelineAt(timeline,4.5).action?.remaining).toBe(1);
  const manual=buildTimeline(e,e.viewer,{autoMs:null,animationRate:rate});expect(timelineAt(manual,.5).action?.remaining).toBeUndefined();
 }
});
test('paper and peg sound cues stay inside the visible motion, with unique identities and a bounded deal texture',()=>{
 for(const e of animationExamples){const timeline=buildTimeline(e,e.viewer);for(const {plan} of timeline.plans){const cues=soundCues(plan);expect(new Set(cues.map(c=>c.id)).size).toBe(cues.length);for(const c of cues){expect(c.at).toBeGreaterThanOrEqual(0);expect(c.at).toBeLessThanOrEqual(plan.duration);expect(c.gain).toBeLessThanOrEqual(1);}if(plan.kind==='deal'||plan.kind==='next-hand')expect(cues.filter(c=>c.kind==='card').length).toBeLessThanOrEqual(6);}}
});
test('the original chamber score has three complete parts, balanced phrases and no out-of-range pitches',()=>{
 expect(composition.measures).toHaveLength(48);expect(composition.meter).toEqual([6,8]);expect(composition.quarterBpm).toBe(84);
 for(const measure of composition.measures)for(const part of ['flute','violin','cello'] as const){const notes=measure[part].split(' ').map(n=>n.split(':'));expect(notes.reduce((n,[,d])=>n+Number(d),0)).toBe(6);for(const [p] of notes)expect(p==='r'||/^[A-G]#?[2-5]$/.test(p)).toBe(true);}
});
