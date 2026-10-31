import {test,expect,type Page} from '@playwright/test';
import {TestStepHelper} from './helpers/test-step-helper';
import {replay,apply,initialState,type State,type Intent,type Event} from '../../src/game/engine';
import {botIntent} from '../../src/game/bot';
import {cardName} from '../../src/game/cards';

test('four friends gather, peg a complete hand, count every hand and crib, and return to their seats',async({browser},info)=>{
 const helper=new TestStepHelper(info),names=['Alex','Rowan','Jules','Ada'];
 const contexts=await Promise.all(names.map(()=>browser.newContext({baseURL:'http://127.0.0.1:4197',locale:'en-CA',timezoneId:'America/Toronto',viewport:{width:1180,height:820},deviceScaleFactor:1,reducedMotion:'reduce'})));
 const pages=await Promise.all(contexts.map(c=>c.newPage())),errors:string[]=[];
 for(const page of pages){page.on('pageerror',e=>errors.push(e.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});}
 // These are inputs, not injected state: predictable invitation entropy and the host's shuffle choice.
 for(let i=0;i<4;i++)await contexts[i].addInitScript(({id})=>{let n=0;Object.defineProperty(crypto,'randomUUID',{value:()=>{if(n++===0)return id;return `${id}-choice-${n}`;}});},{id:`player-${i}`});
 let expected=initialState(),room='',action=0;
 const ids=['player-0','player-1','player-2','player-3'];
 async function verify(page:Page,viewer:number){
  await expect(page.locator('main')).toHaveAttribute('data-revision',String(expected.revision));
  await expect(page.locator('main')).toHaveAttribute('data-phase',expected.phase);
  await expect(page.locator('main')).toHaveAttribute('data-round',String(expected.round));
  await expect(page.getByTestId('running-count')).toHaveText(String(expected.total));
  await expect(page.getByTestId('crib-size')).toHaveText(String(expected.discards.filter(Boolean).length));
  await expect(page.locator('[data-player]')).toHaveCount(expected.players.length);
  for(const [i,p] of expected.players.entries()){
   const area=page.locator(`[data-player="${p.id}"]`);
   await expect(area).toHaveAttribute('data-score',String(p.score));
   await expect(area).toHaveAttribute('data-held',String(expected.hands[i].length));
   await expect(area).toHaveAttribute('data-lane',String((viewer-i+4)%4));
   await expect(area.getByRole('list',{name:'Held cards',exact:true}).getByRole('listitem')).toHaveText(expected.hands[i].map(c=>i===viewer?cardName(c):'Face down'));
   await expect(area.getByRole('list',{name:'Played cards',exact:true}).getByRole('listitem')).toHaveText(expected.plays.filter(play=>play.seat===i).map(play=>cardName(play.card)));
  }
  if(expected.cut)await expect(page.getByTestId('starter')).toHaveText(cardName(expected.cut));else await expect(page.getByTestId('starter')).toHaveCount(0);
  const active=expected.players[viewer];
  if(active&&expected.phase!=='gathering')await expect(page.locator('polygon[role=button]')).toHaveCount(expected.hands[viewer].length);
  await expect(page.getByRole('alert')).toHaveCount(0);expect(errors).toEqual([]);
 }
 async function photograph(actor:number,description:string,viewers=expected.players.map((_,i)=>i)){
  for(const viewer of [actor,...viewers.filter(i=>i!==actor)])await helper.step(`action-${action}`,pages[viewer],names[viewer],`${description} · ${viewer===actor?'actor':'observer'}`,[{spec:'Exact phase, revision, round, running count, crib size, seat orientation, scores, held-card privacy and public play order',check:()=>verify(pages[viewer],viewer)}]);
  action++;
 }
 async function perform(actor:number,intent:Intent){
  const page=pages[actor];
  if(intent.type==='discard'||intent.type==='play')await page.locator(`polygon[data-card="${intent.card}"]`).press('Enter');
  else await page.getByRole('button',{name:intent.type==='cut'?'Cut':intent.type==='go'?'Go':intent.type==='count'?/^Peg \d+$/: 'Deal',exact:intent.type!=='count'}).click();
  expected=apply(expected,ids[actor],intent);
  const phrase=intent.type==='play'?`plays ${cardName(intent.card)}`:intent.type==='discard'?`puts ${cardName(intent.card)} in the crib`:intent.type==='go'?'says Go':intent.type==='cut'?'cuts the deck':intent.type==='count'?'counts':'deals the next hand';
  await photograph(actor,`${names[actor]} ${phrase}`);
 }
 try{
  await pages[0].goto('/');await expect(pages[0].locator('main')).toHaveAttribute('data-ready','true',{timeout:30_000});await pages[0].getByRole('textbox',{name:'Your name'}).fill(names[0]);await pages[0].getByRole('button',{name:'Take a seat',exact:true}).click();
  await expect(pages[0].getByRole('link',{name:'Invitation',exact:true})).toBeVisible();room=new URL(pages[0].url()).searchParams.get('table')!;
  expected=apply(expected,ids[0],{type:'create',name:names[0]});await photograph(0,'Alex opens the table');
  for(let i=1;i<4;i++){
   await pages[i].goto(`/?table=${room}`);await expect(pages[i].locator('main')).toHaveAttribute('data-ready','true',{timeout:30_000});await pages[i].getByRole('textbox',{name:'Your name'}).fill(names[i]);await pages[i].getByRole('button',{name:'Take a seat',exact:true}).click();
   expected=apply(expected,ids[i],{type:'join',name:names[i]});await photograph(i,`${names[i]} takes a chair`);
  }
  // Read the host's explicit seed choice after the genuine Deal click; nothing is predealt.
  await pages[0].getByRole('button',{name:'Deal',exact:true}).click();
  await expect(pages[0].locator('main')).toHaveAttribute('data-phase','discard');
  let events=await (await pages[0].request.get(`/api/tables/${room}`)).json() as Event[];
  const begin=events.at(-1)!.intent;expect(begin.type).toBe('begin');expected=apply(expected,ids[0],begin);await photograph(0,'Alex deals five cards to everyone');
  for(let i=0;i<4;i++)await perform(i,botIntent(expected,i)!);
  expect(expected.phase).toBe('cut');await perform(expected.turn,{type:'cut'});
  let steps=0;
  while(expected.phase==='pegging'&&steps++<40){const actor=expected.turn;await perform(actor,botIntent(expected,actor)!);}
  expect(expected.phase).toBe('count');expect(expected.plays.length).toBe(16);expect(expected.hands.flat()).toEqual([]);
  for(let i=0;i<5;i++)await perform(expected.turn,{type:'count'});
  expect(expected.phase).toBe('between');await perform(expected.turn,{type:'deal'});expect(expected.round).toBe(1);
  await pages[2].reload();await photograph(2,'Jules returns to the same seat and hand');
  events=await (await pages[0].request.get(`/api/tables/${room}`)).json() as Event[];
  expect(replay(events)).toEqual(expected);
  expect(events.every(e=>Object.keys(e.intent).every(key=>['type','name','seed','card'].includes(key)))).toBe(true);
  expect(errors).toEqual([]);helper.finish();
 }finally{for(const context of contexts)await context.close();}
});
