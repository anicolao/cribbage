<script lang="ts">
 import { Canvas } from '@threlte/core';
 import { onMount } from 'svelte';
 import Scene from './Scene.svelte';
 import RenderDensity from './RenderDensity.svelte';
 import { seats, countHand } from './table';
 import { displayedScore, PEGGING_DURATION } from './sceneLayout';
 import { PCFShadowMap } from 'three';
 let scenario=$state('tableau'),time=$state(4),speed=$state(1),faceMargin=$state(2.5),backMargin=$state(2.5),lightX=$state(11),lightY=$state(17),lightZ=$state(8),paused=$state(false),fov=$state(45),resetKey=$state(0),preset=$state('table'),cameraInfo=$state({elevation:53,distance:25}),light=$state(.7),reference=$state(false),minimal=$state(false),reduced=$state(false);
 let preview=$state<'desktop'|'ipad'>('desktop');
 let previewStage=$state<HTMLDivElement>();
 let stageSize=$state({width:1180,height:820});
 const previewScale=$derived(Math.min(1,Math.max(1,stageSize.width-32)/1180,Math.max(1,stageSize.height-80)/820));
 $effect(()=>{if(!previewStage)return;const observer=new ResizeObserver(([entry])=>{stageSize={width:entry.contentRect.width,height:entry.contentRect.height};});observer.observe(previewStage);return()=>observer.disconnect();});
 function choosePreview(){const url=new URL(location.href);if(preview==='ipad')url.searchParams.set('preview','ipad');else url.searchParams.delete('preview');history.replaceState(null,'',url);requestAnimationFrame(()=>requestAnimationFrame(()=>resetKey++));}
 const scenarios=[
  {id:'tableau',name:'Ready to play',hint:'Four seats, four individual scoring tracks. Only your hand is visible.',duration:0},
  {id:'deal',name:'Deal four hands',hint:'Cards travel in seat order and settle into four clean fans. Other hands stay concealed.',duration:2.5},
  {id:'play',name:'Play your king',hint:'Play a card into your area of the felt, clear of the board.',duration:1.3},
  ...seats.slice(1).map(seat=>({id:`play-${seat.id}`,name:`Play ${seat.name}’s card`,hint:`${seat.name} reveals a card and plays it in front of their hand.`,duration:1.3})),
  {id:'pegging',name:'Play all four hands',hint:'Sixteen cards are revealed in seat order, collecting in front of each owner. Replay to watch the full pegging layout.',duration:PEGGING_DURATION},
  {id:'pegging-complete',name:'Pegging complete',hint:'Every card is played face up beside its owner. Hands are empty; counting comes next.',duration:0},
  ...seats.map(seat=>({id:`count-${seat.id}`,name:`Count ${seat.id==='you'?'your hand':seat.name+"’s hand"}`,hint:`Pegging is finished. ${seat.name}'s played cards are gathered into a row for counting.`,duration:1.4})),
  {id:'peg',name:'Peg twelve points',hint:'Your turquoise peg lifts and advances twelve holes on your own track.',duration:1.8}
 ];
 const counting=$derived(seats.find(seat=>scenario===`count-${seat.id}`));
 const scores=$derived(seats.map((_,i)=>displayedScore(i,scenario,time)));

 const active=$derived(scenarios.find(s=>s.id===scenario)!);
 const moving=$derived(time<active.duration);
 function reset(play=false){time=play?0:active.duration+.1;paused=false;}
 onMount(()=>{const params=new URLSearchParams(location.search);if(params.get('preview')==='ipad'){preview='ipad';minimal=true;}if(scenarios.some(s=>s.id===params.get('scenario')))scenario=params.get('scenario')!;reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let last=performance.now(),frame=0;function step(now:number){if(!paused)time=Math.min(Math.max(5,active.duration+.1),time+(reduced?5:Math.min((now-last)/1000,.05)*speed));last=now;frame=requestAnimationFrame(step);}frame=requestAnimationFrame(step);return()=>cancelAnimationFrame(frame);});
 function choose(){reset();const url=new URL(location.href);url.searchParams.set('scenario',scenario);history.replaceState(null,'',url);}
</script>
<svelte:head><title>Cribbage · Animation room</title><meta name="description" content="A Threlte cribbage animation and material study, inspired by a warm wooden tabletop."/></svelte:head>
<header class="workspace-toolbar" aria-label="Preview tools">
 <label for="preview-device">Display<select id="preview-device" bind:value={preview} onchange={choosePreview}><option value="desktop">Desktop · fill window</option><option value="ipad">iPad landscape · 2360 × 1640</option></select></label>
 <button onclick={()=>minimal=!minimal}>{minimal?'Show lab':'Hide lab'}</button>
</header>
<div class="app" class:minimal>
 <aside aria-label="Animation lab" class="sidebar">
  <a class="wordmark" href="/">c<span>♧</span>ribbage<span class="dot">.</span></a>
  <p class="lab-title">Animation lab</p>

  <section><div class="section-heading"><span>Motion</span><span class="status"><i class:moving></i>{paused?'Paused':moving?'Playing':'Settled'}</span></div>
   <label for="scenario">Scene</label><select id="scenario" bind:value={scenario} onchange={choose}>{#each scenarios as s}<option value={s.id}>{s.name}</option>{/each}</select>
   <p class="hint">{active.hint}</p>
   <div class="actions"><button class="primary" onclick={()=>reset(true)} disabled={active.duration===0}>↻ &nbsp;Replay</button><button onclick={()=>paused=!paused} disabled={active.duration===0}>{paused?'▶ Resume':'Ⅱ Pause'}</button><button aria-label="Reset scene" title="Reset scene" onclick={()=>reset()}>⟲</button></div>
   <div class="speed"><span>Playback</span>{#each [.25,.5,1,2] as s}<button class:selected={speed===s} onclick={()=>speed=s}>{s===.25?'¼':s===.5?'½':s}×</button>{/each}</div>
   <div class="progress" role="progressbar" aria-label="Animation progress" aria-valuenow={Math.round((active.duration?Math.min(1,time/active.duration):1)*100)}><div style:width={`${(active.duration?Math.min(1,time/active.duration):1)*100}%`}></div></div>
  </section>
  <section><div class="section-heading">Cards</div><label for="card-margin">Face margin <span>{Number(faceMargin).toFixed(2).replace(/\.?0+$/,'')}%</span></label><input id="card-margin" type="range" min="0" max="10" step="0.25" bind:value={faceMargin}/><label for="back-margin">Back margin <span>{Number(backMargin).toFixed(2).replace(/\.?0+$/,'')}%</span></label><input id="back-margin" type="range" min="0" max="10" step="0.25" bind:value={backMargin}/></section>
  <section><div class="section-heading">Main light</div>
   <label for="light-x">Left / right (X) <span>{lightX}</span></label><input id="light-x" type="range" min="-14" max="14" step="0.5" bind:value={lightX}/>
   <label for="light-y">Height (Y) <span>{lightY}</span></label><input id="light-y" type="range" min="6" max="22" step="0.5" bind:value={lightY}/>
   <label for="light-z">Back / front (Z) <span>{lightZ}</span></label><input id="light-z" type="range" min="-14" max="14" step="0.5" bind:value={lightZ}/>
   <button onclick={()=>{lightX=11;lightY=17;lightZ=8;}}>Reset light</button>
  </section>
  <section class="camera-section"><div class="section-heading">Camera</div>
   <p class="orbit-help">Drag to orbit · Scroll to zoom<br/>Right-drag to pan · Touch: one finger orbit, two pan/zoom</p>
   <label for="projection">Perspective / field of view <span>{fov===0?'Orthographic':`${fov}°`}</span></label><input id="projection" type="range" min="0" max="100" step="1" bind:value={fov}/>
   <div class="projection-ends"><span>0 · parallel</span><span>100° · wide angle</span></div>
   <p class="lens-help">Lens changes keep the table’s size at the orbit target. Higher FOV exaggerates near/far scale.</p>
   <div class="camera-presets">{#each [{id:'table',name:'Reset view'},{id:'top',name:'Top'},{id:'low',name:'Low'}] as view}<button onclick={()=>{preset=view.id;resetKey++;}}>{view.name}</button>{/each}<button onclick={()=>fov=0}>Ortho</button><button onclick={()=>fov=45}>45°</button></div>
   <div class="camera-readout">Elevation {cameraInfo.elevation.toFixed(1)}° · Distance {cameraInfo.distance.toFixed(1)}</div><label for="light">Warm light <span>{Number(light).toFixed(1)}</span></label><input id="light" type="range" min=".5" max="1.5" step=".1" bind:value={light}/></section>
  <button class="reference" onclick={()=>reference=!reference}><span>↗ &nbsp;Original mockup</span></button>
  {#if reduced}<p class="hint">System reduced motion is enabled. Replays settle immediately.</p>{/if}

 </aside>
 <div class="preview-stage" class:ipad={preview==='ipad'} bind:this={previewStage} style:--preview-scale={previewScale}>
 {#if preview==='ipad'}<div class="preview-caption">iPad landscape · 1180 × 820 points · 2360 × 1640 pixels · Light {Number(light).toFixed(1)}</div>{/if}
 <main aria-label="Cribbage table preview">
  <div class="viewport"><Canvas shadows={PCFShadowMap} dpr={1}><RenderDensity width={preview==='ipad'?2360:undefined}/><Scene {time} {scenario} {light} {fov} {resetKey} {preset} {faceMargin} {backMargin} {lightX} {lightY} {lightZ} onCameraChange={info=>cameraInfo=info}/></Canvas></div>

  <div class="sr-only" aria-label="Player scores">{#each seats as seat,i}<span>{seat.name}: {scores[i]} points. </span>{/each}</div>
  <div class="table-note" role="status">{counting?`${counting.id==='you'?'Your hand':counting.name+'’s hand'} · ${time>=1.4?countHand(counting.cards)+' points':'Counting…'}`:scenario==='peg'&&time>=1.8?'You · twelve points':scenario==='play'&&time>=1.3?'King of hearts · played':scenario==='deal'&&time>=2.5?'':scenario==='pegging-complete'||scenario==='pegging'&&time>=PEGGING_DURATION?'Pegging complete · ready to count':scenario==='pegging'?'Pegging':scenario.startsWith('play-')?'Card played':'Your turn'}</div>
 </main>
 </div>
</div>
{#if reference}<div class="modal" role="presentation" onclick={(e)=>{if(e.target===e.currentTarget)reference=false;}}><div role="dialog" aria-modal="true" aria-label="Original mockup" tabindex="-1"><button class="close" onclick={()=>reference=false}>Close ×</button><img src="/cribmock.png" alt="Original cribbage mockup: green felt, long wooden board, traditional cards and warm tabletop lighting"/></div></div>{/if}
<style>:global(*){box-sizing:border-box}:global(body){margin:0;background:#14251d;color:#e9e3d3;font-family:Arial,sans-serif;font-size:13px}:global(button),:global(select){font:inherit}:global(button){cursor:pointer}:global(button:focus-visible),:global(select:focus-visible),:global(input:focus-visible){outline:2px solid #e5b971;outline-offset:4px}.app{display:flex;min-height:100svh}.sidebar{max-height:100svh;overflow-y:auto;width:300px;flex-shrink:0;background:#14251d;padding:32px 27px 22px;display:flex;flex-direction:column;border-right:1px solid #ffffff13;z-index:2}.wordmark{font:36px Georgia,serif;letter-spacing:-1.8px;color:#f0e6ce;text-decoration:none}.wordmark>span:first-child{font-size:25px;margin:0 1px}.dot{color:#c79553}section{padding:22px 0;border-top:1px solid #ffffff17}.section-heading{font-size:9px;letter-spacing:1.9px;color:#b49a6c;display:flex;justify-content:space-between;margin-bottom:20px}.status{letter-spacing:.2px;color:#a5b5a2;display:flex;align-items:center;gap:6px}.status i{display:inline-block;width:5px;height:5px;background:#9bb38c;border-radius:50%}.status i.moving{background:#e7b96e;box-shadow:0 0 8px #e7b96e}label{display:flex;justify-content:space-between;font-size:11px;color:#b6c0b0;margin:16px 0 9px}label span{color:#d9c39c}select{width:100%;color:#f0e9d6;background:#203429;border:1px solid #ffffff20;padding:11px 10px;border-radius:3px}.hint{font-size:11px;color:#8e9f91;line-height:1.6;min-height:35px;margin:10px 0 18px}.actions{display:flex;gap:6px}button{border:1px solid #ffffff20;background:transparent;color:#d3d9c9;border-radius:3px;padding:9px 12px}.primary{background:#ceb080;color:#18261e;border-color:#ceb080;flex:1}button:disabled{opacity:.35;cursor:default}.speed{display:flex;align-items:center;gap:2px;margin-top:17px;font-size:10px;color:#879888}.speed>span{flex:1}.speed button{border:0;padding:6px 8px;font-size:10px}.speed .selected{background:#ffffff12;color:#f1c582}.progress{height:2px;background:#ffffff0c;margin-top:14px}.progress>div{background:#a78b5d;height:100%}input[type=range]{width:100%;height:3px;accent-color:#d6b780;margin:7px 0 12px}.reference{display:flex;justify-content:space-between;font-size:10px;padding:13px 0;border:0;border-top:1px solid #ffffff17;color:#b5bba8;border-radius:0}main{position:relative;flex:1;min-width:0;height:100svh;background:#251c13;overflow:hidden}.viewport{position:absolute;inset:0}.table-note{position:absolute;bottom:66px;left:32px;font:italic 14px Georgia;color:#e9dcc5a0;pointer-events:none}.minimal .sidebar{display:none}.modal{position:fixed;inset:0;z-index:5;background:#000c;display:grid;place-items:center;padding:35px}.modal>div{position:relative;max-width:1100px}.modal img{max-width:100%;max-height:87svh;display:block;border-radius:4px}.close{position:absolute;right:10px;top:10px;background:#14251d;box-shadow:0 3px 15px #0008}@media(max-height:850px) and (min-width:761px){.sidebar{padding-top:22px}section{padding:18px 0}.section-heading{margin-bottom:12px}}@media(max-width:1000px){.sidebar{width:255px;padding-left:20px;padding-right:20px}}@media(max-width:760px){.app{flex-direction:column}.sidebar{order:2;width:100%;padding:22px;display:grid;grid-template-columns:1fr 1fr;gap:16px}.wordmark{font-size:30px}.sidebar section{grid-column:span 1}.reference{grid-column:span 2}main{flex:none;height:68svh;min-height:440px}.table-note{left:20px}.minimal main{height:100svh}}.orbit-help,.lens-help{font-size:10px;line-height:1.6;color:#9daa9b;margin:0 0 12px}.lens-help{margin:10px 0}.projection-ends{display:flex;justify-content:space-between;font-size:9px;color:#9baa98}.camera-presets{display:flex;gap:4px;flex-wrap:wrap}.camera-presets button{font-size:10px;padding:7px 8px}.camera-readout{font:10px monospace;color:#c5b18b;margin:12px 0 20px}.viewport{touch-action:none}@media(max-width:760px){.sidebar{max-height:none}}@media(max-width:760px){}.table-note{bottom:24px}.lab-title{font-size:11px;letter-spacing:1px;color:#9cae9d;margin:18px 0 28px}
 .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
 .preview-stage{position:relative;flex:1;min-width:0;height:100svh;overflow:hidden;background:#0c1512}.preview-stage>main{width:100%;height:100%}.preview-stage.ipad>main{position:absolute;width:1180px;height:820px;left:50%;top:calc(50% + 20px);transform:translate(-50%,-50%) scale(var(--preview-scale));transform-origin:center;outline:1px solid #a7906144;border-radius:12px;box-shadow:0 14px 50px #0007;overflow:hidden}.preview-caption{position:absolute;top:16px;left:16px;right:16px;color:#c7cbb7;font:11px/1.5 Arial,sans-serif;text-align:center;letter-spacing:.5px}@media(max-width:760px){.preview-stage{flex:none;height:68svh;min-height:440px}.minimal .preview-stage{height:100svh}}
 .preview-stage.ipad :global(canvas){width:100%!important;height:100%!important}
 .workspace-toolbar{height:48px;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:0 16px;background:#13231c;border-bottom:1px solid #a9905930;color:#d1d7c5}.workspace-toolbar label{display:flex;align-items:center;gap:12px;margin:0;font-size:12px}.workspace-toolbar select{width:auto;min-width:220px;padding:6px 10px}.workspace-toolbar button{padding:6px 12px;font-size:12px}.app{min-height:calc(100svh - 48px)}.sidebar{max-height:calc(100svh - 48px)}.preview-stage{height:calc(100svh - 48px)}@media(max-width:760px){.minimal .preview-stage{height:calc(100svh - 48px)}}
</style>
