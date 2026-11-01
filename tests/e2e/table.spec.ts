import {test,expect,type Page} from '@playwright/test';
import {TestStepHelper} from './helpers/test-step-helper';
import {replay,apply,initialState,needsDiscard,cribComplete,cribCards,legalCards,countOwner,isCribCount,type Intent,type Event} from '../../src/game/engine';
import {botIntent} from '../../src/game/bot';
import {animationExamples} from '../../src/presentation/catalog';
import {cardName,handScore} from '../../src/game/cards';

for(const count of [4,2,3])test(count===4?'four friends gather, peg a complete hand, count every hand and crib, and return to their seats':`${count} friends start early, peg and count a complete hand, and deal again`,async({browser},info)=>{
 const helper=new TestStepHelper(info,count===4?'STORY':count===2?'TWO-PLAYERS':'THREE-PLAYERS'),names=['Alex','Rowan','Jules','Ada'].slice(0,count);
 const contexts=await Promise.all(names.map(()=>browser.newContext({baseURL:'http://127.0.0.1:4197',locale:'en-CA',timezoneId:'America/Toronto',viewport:{width:1180,height:820},deviceScaleFactor:1,reducedMotion:'no-preference',permissions:count===2?['clipboard-read','clipboard-write']:[]})));
 const pages=await Promise.all(contexts.map(c=>c.newPage())),errors:string[]=[],ids=names.map((_,i)=>count===4?`player-${i}`:`small-${count}-player-${i}`);
 for(const page of pages){page.on('pageerror',e=>errors.push(e.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});}
 // Predictable invitation entropy and shuffle choices are inputs, never injected game state.
 for(let i=0;i<count;i++)await contexts[i].addInitScript(({id})=>{let n=Number(sessionStorage.getItem('choice-counter')??0);Object.defineProperty(crypto,'randomUUID',{value:()=>{sessionStorage.setItem('choice-counter',String(n+1));return n++===0?id:`${id}-choice-${n}`;}});},{id:ids[i]});
 let wall=Date.UTC(2026,9,31,12);for(const page of pages)await page.clock.setFixedTime(wall);
 let expected=initialState(),room='',action=0;const pegOrigins:Record<string,number>={};let turnStartedAt=wall;const personalWaits:(number|null)[]=Array(count).fill(3);
 function applyExpected(actor:string,intent:Intent){const before=expected,next=apply(before,actor,intent);for(const p of next.players){const old=before.players.find(o=>o.id===p.id);if(!old||intent.type==='begin')pegOrigins[p.id]=-1;else if(p.score!==old.score)pegOrigins[p.id]=old.score;}turnStartedAt=wall;return next;}
 async function advance(ms:number){wall+=ms;for(const page of pages)await page.clock.setFixedTime(wall);}
 async function automatic(actor:number,intent:Intent,ms=3000){await advance(ms);expected=applyExpected(ids[actor],intent);await photograph(actor,`${names[actor]} · ${intent.type==='accept-crib'?'the crib is ready':intent.type==='play'?`plays ${cardName(intent.card)} automatically`:`${intent.type==='count'?'pegs':intent.type} automatically`}`);}
 async function verify(page:Page,viewer:number){
  await expect(page.locator('main')).toHaveAttribute('data-revision',String(expected.revision));
  await expect(page.getByRole('status')).toHaveAttribute('data-status','synced',{timeout:60_000});
  // One atomic DOM read keeps every semantic check without thousands of polling round trips.
  const actual=await page.evaluate(()=>{
   const root=document.querySelector('main')!,table=document.querySelector('[data-table-view]')!,canvas=document.querySelector('canvas')!;
   const text=(selector:string)=>document.querySelector(selector)?.textContent??null;
   return {phase:root.getAttribute('data-phase'),round:root.getAttribute('data-round'),total:text('[data-testid="running-count"]'),crib:text('[data-testid="crib-size"]'),starter:text('[data-testid="starter"]'),prompt:text('[role="status"]'),counts:JSON.parse(table.getAttribute('data-render-counts')??'[]'),scores:JSON.parse(table.getAttribute('data-render-scores')??'[]'),pegs:JSON.parse(table.getAttribute('data-render-pegs')??'[]'),awards:JSON.parse(table.getAttribute('data-render-awards')??'[]'),quality:table.getAttribute('data-render-quality'),buffer:[canvas.width,canvas.height],svg:document.querySelectorAll('svg').length,alerts:document.querySelectorAll('[role="alert"]').length,
    players:Array.from(document.querySelectorAll('[data-player]')).map(area=>({id:area.getAttribute('data-player'),score:area.getAttribute('data-score'),held:area.getAttribute('data-held'),lane:area.getAttribute('data-lane'),cards:Array.from(area.querySelectorAll('[aria-label="Held cards"] li')).map(li=>li.textContent),plays:Array.from(area.querySelectorAll('[aria-label="Played cards"] li')).map(li=>li.textContent)})),
    controls:Array.from(document.querySelectorAll('button[data-card]')).map(card=>({card:card.getAttribute('data-card'),disabled:card.getAttribute('aria-disabled'),label:card.getAttribute('aria-label'),x:Number(card.getAttribute('data-hit-x')),y:Number(card.getAttribute('data-hit-y'))}))};
  });
  expect(actual.phase).toBe(expected.phase);expect(actual.round).toBe(String(expected.round));expect(actual.total).toBe(String(expected.total));expect(actual.crib).toBe(String(cribCards(expected).length));expect(actual.starter).toBe(expected.cut?cardName(expected.cut):null);
  expect(actual.players).toEqual(expected.players.map((player,i)=>{const relative=(i-viewer+expected.players.length)%expected.players.length;return {id:player.id,score:String(player.score),held:String(expected.hands[i].length),lane:String(expected.players.length===2?relative*2:[0,3,2,1][relative]),cards:expected.hands[i].map(c=>i===viewer?cardName(c):'Face down'),plays:expected.plays.filter(p=>p.seat===i).map(p=>cardName(p.card))};}));
  if(expected.phase!=='gathering'){
   expect(actual.controls.map(c=>c.card)).toEqual(expected.hands[viewer]);
   for(const control of actual.controls){const enabled=needsDiscard(expected,viewer)||expected.phase==='pegging'&&expected.turn===viewer&&legalCards(expected,viewer).includes(control.card!);expect(control.disabled).toBe(String(!enabled));expect(control.label).toBe(`${expected.phase==='discard'?'Crib':'Play'} ${cardName(control.card!)}`);expect(control.x).toBeGreaterThan(0);expect(control.x).toBeLessThan(1180);expect(control.y).toBeGreaterThan(0);expect(control.y).toBeLessThan(820);}
  }else{
   await expect(page.getByRole('button',{name:'Deal',exact:true})).toHaveCount(viewer===0&&expected.players.length>=2?1:0);
  }
  if(expected.phase==='discard')expect(actual.prompt).toBe(needsDiscard(expected,viewer)?expected.hands[viewer].length===6?'Choose two for the crib':expected.discards[viewer].length?'Choose one more for the crib':'Choose one for the crib':'Waiting for the crib');
  const sole=expected.phase==='pegging'?legalCards(expected,expected.turn):[];
  const countdown=expected.phase==='cut'?'cut':expected.phase==='count'?'count':expected.phase==='between'?'deal':expected.phase==='pegging'&&sole.length<=1?(sole.length?'play':'go'):undefined;
  if(countdown&&expected.turn===viewer)await expect(page.locator(`[data-countdown="${countdown}"]`)).toHaveAttribute('data-seconds',personalWaits[viewer]===null?'':String(Math.max(0,Math.ceil((personalWaits[viewer]!*1000-(wall-turnStartedAt))/1000))));
  await expect(page.locator('[data-table-view]')).toHaveAttribute('data-forced-card',countdown==='play'&&expected.turn===viewer?sole[0]:'');
  expect(actual.awards).toEqual([]);
  for(const p of expected.players)expect(actual.pegs.filter((peg:{owner:string})=>peg.owner===p.id).map((peg:{score:number})=>peg.score).sort((a:number,b:number)=>a-b)).toEqual([pegOrigins[p.id],p.score].sort((a,b)=>a-b));
  expect(actual.scores).toEqual(expected.players.map(p=>({id:p.id,score:p.score})));
  if(expected.phase==='count'||expected.phase==='between'){
   const crib=expected.phase==='between'||isCribCount(expected),owner=crib?expected.dealer:countOwner(expected),cards=crib?expected.crib:expected.kept[owner];
   expect(actual.counts).toEqual([{id:`${expected.round}:count:${crib?expected.players.length:expected.countIndex}`,owner:ids[owner],points:handScore(cards,expected.cut!,crib),kind:crib?'crib':'hand',cards:cards.map(c=>`${expected.round}:${c}`),awarded:expected.phase==='between',opacity:1}]);
   if(expected.phase==='count')expect(actual.prompt).toBe(`${names[owner]}’s ${crib?'crib':'hand'}`);
  }else expect(actual.counts).toEqual([]);
  await expect(page.getByRole('button',{name:'Undo crib contribution',exact:true})).toHaveCount(expected.pendingDiscards.some(p=>p.seat===viewer)?1:0);
  await expect(page.getByRole('button',{name:/Confirm/})).toHaveCount(0);
  expect(actual.quality).toBe('shared-lab');expect(actual.buffer).toEqual([1180,820]);expect(actual.svg).toBe(0);expect(actual.alerts).toBe(0);expect(errors).toEqual([]);
 }
 async function photograph(actor:number,description:string,viewers=expected.players.map((_,i)=>i)){
  for(const viewer of [actor,...viewers.filter(i=>i!==actor)])await helper.step(`${count===4?'':`${count}p-`}action-${action}`,pages[viewer],names[viewer],`${description} · ${viewer===actor?'actor':'observer'}`,[{spec:'Exact phase, revision, round, count, crib size, clockwise seats, scores, private hands, public plays and legal native-card controls',check:()=>verify(pages[viewer],viewer)}]);
  action++;
 }
 async function perform(actor:number,intent:Intent){
  const page=pages[actor];
  if(intent.type==='discard'||intent.type==='play'){
   const control=page.locator(`button[data-card="${intent.card}"]`);await expect(control).toHaveAttribute('aria-disabled','false');
   const point=()=>control.evaluate(b=>({x:Number(b.getAttribute('data-hit-x')),y:Number(b.getAttribute('data-hit-y'))}));
   let target=await point();await page.mouse.move(target.x,target.y);
   await expect(page.locator('[data-table-view]')).toHaveAttribute('data-hovered-card',await control.getAttribute('data-card-id')??'');
   await expect(page.locator('[data-table-view]')).toHaveAttribute('data-motion-idle','true');
   target=await point();await page.mouse.move(target.x,target.y);
   await expect(page.locator('[data-table-view]')).toHaveAttribute('data-hovered-card',await control.getAttribute('data-card-id')??'');
   await expect(page.locator('[data-table-view]')).toHaveAttribute('data-motion-idle','true');
   await page.mouse.down();await expect(page.locator('[data-table-view]')).toHaveAttribute('data-pressed-card',await control.getAttribute('data-card-id')??'');await page.mouse.up();
  }else if(intent.type==='undo-discard')await page.getByRole('button',{name:'Undo crib contribution',exact:true}).click();
  else await page.getByRole('button',{name:intent.type==='cut'?'Cut':intent.type==='go'?'Go':intent.type==='count'?/^Peg \d+$/: 'Deal',exact:intent.type!=='count'}).click();
  expected=applyExpected(ids[actor],intent);
  const phrase=intent.type==='undo-discard'?'returns a crib card to their hand':intent.type==='play'?`plays ${cardName(intent.card)}`:intent.type==='discard'?`puts ${cardName(intent.card)} in the crib`:intent.type==='go'?'says Go':intent.type==='cut'?'cuts the deck':intent.type==='count'?'counts':'deals the next hand';
  await photograph(actor,`${names[actor]} ${phrase}`);
 }
 try{
  await pages[0].goto('/');await expect(pages[0].locator('main')).toHaveAttribute('data-ready','true',{timeout:30_000});await pages[0].getByRole('textbox',{name:'Your name'}).fill(names[0]);await pages[0].getByRole('button',{name:'Take a seat',exact:true}).click();
  await expect(pages[0].getByRole('link',{name:'Invitation',exact:true})).toBeVisible();room=new URL(pages[0].url()).searchParams.get('table')!;
  expected=applyExpected(ids[0],{type:'create',name:names[0]});await photograph(0,'Alex opens the table');
  for(let i=1;i<count;i++){
   await pages[i].goto(`/?table=${room}`);await expect(pages[i].locator('main')).toHaveAttribute('data-ready','true',{timeout:30_000});await pages[i].getByRole('textbox',{name:'Your name'}).fill(names[i]);await pages[i].getByRole('button',{name:'Take a seat',exact:true}).click();
   expected=applyExpected(ids[i],{type:'join',name:names[i]});await photograph(i,`${names[i]} takes a chair`);
  }
  if(count===2){
   await pages[0].bringToFront();await pages[0].getByRole('button',{name:'Copy invite link',exact:true}).click();await expect(pages[0].getByRole('button',{name:'Link copied',exact:true})).toBeVisible();
   expect(await pages[0].evaluate(()=>navigator.clipboard.readText())).toBe(new URL(`/?table=${room}`,'http://127.0.0.1:4197').href);await photograph(0,'Alex copies the invitation');
  }
  await pages[0].getByRole('button',{name:'Deal',exact:true}).click();await expect(pages[0].locator('main')).toHaveAttribute('data-phase','discard');
  let events=await (await pages[0].request.get(`/api/tables/${room}`)).json() as Event[];
  const begin=events.at(-1)!.intent;expect(begin.type).toBe('begin');expected=applyExpected(ids[0],begin);await photograph(0,`Alex deals ${count===2?'six':'five'} cards to everyone`);
  let discards=0;while(!cribComplete(expected)){
   const actor=expected.players.findIndex((_,i)=>needsDiscard(expected,i)),intent=botIntent(expected,actor)!;await perform(actor,intent);discards++;
   if(count===2&&discards===1&&intent.type==='discard'){
    await advance(6000);await expect(pages[actor].locator('[data-countdown="undo"]')).toHaveAttribute('data-seconds','');
    await photograph(actor,'The first crib card stays undoable after six seconds, with no countdown');
    await perform(actor,{type:'undo-discard',card:intent.card});await perform(actor,intent);
   }
  }
  expect(discards).toBe(count===2?4:count);expect(expected.crib).toHaveLength(4);
  await expect(pages[0].locator('[data-countdown="undo"]')).toHaveAttribute('data-seconds','3');
  if(count===2){
   await pages[1].reload();await expect(pages[1].getByRole('status')).toHaveAttribute('data-status','synced',{timeout:60_000});
   await advance(2000);await expect(pages[0].locator('[data-countdown="undo"]')).toHaveAttribute('data-seconds','1');
   await photograph(0,'One second remains after returning to the table');
   const card=expected.discards[0].at(-1)!;await perform(0,{type:'undo-discard',card});
   for(const page of pages)await expect(page.locator('[data-countdown="undo"]')).toHaveAttribute('data-seconds','');
   await perform(0,{type:'discard',card});await expect(pages[0].locator('[data-countdown="undo"]')).toHaveAttribute('data-seconds','3');
  }
  await automatic(0,{type:'accept-crib'});expect(expected.phase).toBe('cut');await automatic(expected.turn,{type:'cut'});
  let steps=0,autoGo=false,autoCard=false;while(expected.phase==='pegging'&&steps++<40){
   const actor=expected.turn,intent=botIntent(expected,actor)!;
   if(intent.type==='go'&&!autoGo){
    await expect(pages[actor].getByRole('button',{name:'Go',exact:true})).toHaveAttribute('data-seconds','3');
    await advance(2000);await expect(pages[actor].getByRole('button',{name:'Go',exact:true})).toHaveAttribute('data-seconds','1');
    await photograph(actor,'Go will play automatically in one second');await automatic(actor,intent,1000);autoGo=true;
   }else if(intent.type==='go')await automatic(actor,intent);
   else if(intent.type==='play'&&legalCards(expected,actor).length===1){
    if(count===2&&!autoCard){
     const settingsButton=pages[actor].getByRole('button',{name:'Settings',exact:true}),closeSettings=pages[actor].getByRole('button',{name:'Close settings',exact:true});
     const changeWait=async(seconds:number|null)=>{await settingsButton.click();await pages[actor].getByLabel('Auto-play',{exact:true}).selectOption(seconds===null?'manual':String(seconds));personalWaits[actor]=seconds;await closeSettings.click();turnStartedAt=wall;};
     await settingsButton.click();await advance(5000);await expect(pages[actor].locator('main')).toHaveAttribute('data-revision',String(expected.revision));await closeSettings.click();turnStartedAt=wall;
     await expect(pages[actor].locator('[data-countdown="play"]')).toHaveAttribute('data-seconds','3');
     await changeWait(null);await advance(6000);await expect(pages[actor].locator('main')).toHaveAttribute('data-revision',String(expected.revision));await expect(pages[actor].locator('[data-countdown="play"]')).toHaveAttribute('data-seconds','');
     await photograph(actor,'Manual timing leaves the only playable card in your hand');
     await changeWait(5);await expect(pages[actor].locator('[data-countdown="play"]')).toHaveAttribute('data-seconds','5');await advance(2000);

     await pages[actor].reload();await expect(pages[actor].getByRole('status')).toHaveAttribute('data-status','synced',{timeout:60_000});
     await expect(pages[actor].locator('[data-countdown="play"]')).toHaveAttribute('data-seconds','3');
     await changeWait(3);await expect(pages[actor].locator('[data-countdown="play"]')).toHaveAttribute('data-seconds','3');
     await advance(2000);await expect(pages[actor].locator('[data-countdown="play"]')).toHaveAttribute('data-seconds','1');
     await photograph(actor,'The only playable card will play in one second after returning to the table');await automatic(actor,intent,1000);
    }else await automatic(actor,intent);
    autoCard=true;
   }else await perform(actor,intent);
  }
  expect(autoGo).toBe(true);expect(autoCard).toBe(true);
  expect(expected.phase).toBe('count');expect(expected.plays).toHaveLength(count*4);expect(expected.hands.flat()).toEqual([]);
  for(let i=0;i<count+1;i++)await automatic(expected.turn,{type:'count'});
  expect(expected.phase).toBe('between');await automatic(expected.turn,{type:'deal'});expect(expected.round).toBe(1);
  const returning=count===4?2:1;await pages[returning].reload();await photograph(returning,`${names[returning]} returns to the same seat and hand`);
  events=await (await pages[0].request.get(`/api/tables/${room}`)).json() as Event[];expect(replay(events)).toEqual(expected);
  expect(events.every(e=>Object.keys(e.intent).every(key=>['type','name','seed','card'].includes(key)))).toBe(true);expect(errors).toEqual([]);helper.finish();
 }finally{for(const context of contexts)await context.close();}
});

test('the shared animation lab reviews every real transition at a paused intermediate frame',async({page},info)=>{
 const helper=new TestStepHelper(info,'ANIMATIONS');
 // Observe texture work without altering the renderer, animation clock or output.
 await page.addInitScript(()=>{
  const counts:Record<string,number>={},draw=CanvasRenderingContext2D.prototype.fillText;
  Object.defineProperty(window,'tableTextDraws',{value:counts});
  CanvasRenderingContext2D.prototype.fillText=function(text:string,x:number,y:number,maxWidth?:number){counts[text]=(counts[text]??0)+1;if(maxWidth===undefined)draw.call(this,text,x,y);else draw.call(this,text,x,y,maxWidth);};
 });
 await page.goto('/dev/animations/');
 await expect(page.locator('main')).toHaveAttribute('data-ready','true',{timeout:30_000});
 for(const example of animationExamples.filter(e=>e.id!=='ready'&&!e.id.startsWith('whole-hand'))){
  await page.getByRole('combobox',{name:'Scene',exact:true}).selectOption(example.id);
  const slider=page.locator('#timeline');
  await slider.press('Home');
  const scoring=example.id==='pair'||example.id==='pair-last';
  for(let i=0;i<(scoring?24:10);i++)await slider.press('ArrowRight');
  await helper.step(`motion-${example.id}`,page,'Lab',example.name,[{spec:'Shared full-quality renderer; paused legal transition, native canvas, no SVG interaction overlay',check:async()=>{
   await expect(page.locator('[data-table-view]')).toHaveAttribute('data-render-quality','shared-lab');
   await expect(page.locator('canvas')).toHaveAttribute('width','880');
   await expect(page.locator('svg')).toHaveCount(0);
   await expect(slider).toHaveValue(scoring?'1.2':'0.5');
   if(scoring){const awards=JSON.parse(await page.locator('[data-table-view]').getAttribute('data-render-awards')??'[]');expect(awards.map((a:{points:number;label:string;opacity:number})=>[a.points,a.label,a.opacity])).toEqual(example.id==='pair-last'?[[2,'Pair',1],[1,'Last card',1]]:[[2,'Pair',1]]);}
  }}],false);
  if(example.id==='play-you'){
   const draws=()=>page.evaluate(()=>JSON.stringify((window as unknown as {tableTextDraws:Record<string,number>}).tableTextDraws));
   const before=await draws();for(let i=0;i<5;i++)await slider.press('ArrowRight');
   await expect(slider).toHaveValue('0.75');
   await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
   expect(await draws(),'Moving cards must reuse score and nameplate textures while their text is unchanged').toBe(before);
  }
 }
 // Review each native-resolution device composition inside the same 1180×820
 // capture. Resize through the real controls; keep cards, lighting and motion.
 for(const device of [
  {id:'ipad',layout:'table',width:2360},
  {id:'ipad-portrait',layout:'ipad-portrait',width:1640},
  {id:'phone-portrait',layout:'phone-portrait',width:1170},
  {id:'phone-landscape',layout:'phone-landscape',width:2532},
 ]){
  await page.getByRole('combobox',{name:'Display',exact:true}).selectOption(device.id);
  for(const scene of ['ready','count-start']){
   await page.getByRole('combobox',{name:'Scene',exact:true}).selectOption(scene);
   await page.getByRole('combobox',{name:'Perspective',exact:true}).selectOption('you');
   await page.locator('#timeline').press('End');
   await page.getByRole('button',{name:'Hide lab',exact:true}).click();
   await helper.step(`motion-${device.id}-${scene}`,page,'Lab',`${device.id}: ${scene==='ready'?'ready to play':'pegging finishes and counting spreads'}`,[{spec:'The selected shared layout renders at native device resolution, with counting points beside the revealed hand',check:async()=>{
    await expect(page.locator('[data-table-view]')).toHaveAttribute('data-layout',device.layout);
    await expect(page.locator('canvas')).toHaveAttribute('width',String(device.width));
    await expect(page.locator('[data-table-view]')).toHaveAttribute('data-render-width',String(device.width));
    await expect(page.locator('[data-table-view]')).toHaveAttribute('data-render-quality','shared-lab');
    const counts=JSON.parse(await page.locator('[data-table-view]').getAttribute('data-render-counts')??'[]');
    expect(counts.filter((c:{opacity:number})=>c.opacity>0).length).toBe(scene==='ready'?0:1);
   }}],false);
   await page.getByRole('button',{name:'Show lab',exact:true}).click();
  }
 }

 helper.finish();
});
