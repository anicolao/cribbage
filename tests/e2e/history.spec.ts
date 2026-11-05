import {test,expect,type Page} from '@playwright/test';
import {TestStepHelper} from './helpers/test-step-helper';
import {initialState,apply,discardActor,countOwner,isCribCount,cribCards,type Intent} from '../../src/game/engine';
import {botIntent} from '../../src/game/bot';
import {handScore} from '../../src/game/cards';
test('hand history reviews counted rounds in player order without changing the table',async({browser,page},info)=>{
 const helper=new TestStepHelper(info,'HISTORY'),room='HST12345',ids=['history-alex','history-rowan','history-jules','history-ada'],names=['Alex','Rowan','Jules','Ada'];
 let state=initialState(),sequence=0;
 const expected:{round:number;starter:string;hands:{owner:string;kind:string;cards:string[];points:number}[]}[]=[];
 let hands:typeof expected[number]['hands']=[];
 async function intent(actor:string,choice:Intent){
  if(choice.type==='count'){const seat=countOwner(state),crib=isCribCount(state),cards=crib?cribCards(state):state.kept[seat];hands.push({owner:ids[seat],kind:crib?'crib':'hand',cards:[...cards],points:handScore(cards,state.cut!,crib)});}
  const response=await page.request.post(`/api/tables/${room}`,{data:{actor,id:`history-event-${sequence+1}`,expectedRevision:sequence,intent:choice}});expect(response.ok()).toBe(true);state=apply(state,actor,choice);sequence++;
  if(state.phase==='between'){expected.push({round:state.round+1,starter:state.cut!,hands});hands=[];}
 }
 // Fixture setup submits only ordinary legal intents through the real relay.
 for(let i=0;i<4;i++)await intent(ids[i],{type:i?'join':'create',name:names[i]});await intent(ids[0],{type:'begin',seed:'history-e2e-v1'});
 while(state.round<2){const seat=state.phase==='discard'?discardActor(state):state.turn;await intent(ids[seat],botIntent(state,seat)!);}
 const contexts=await Promise.all(ids.map(()=>browser.newContext({viewport:{width:1180,height:820},deviceScaleFactor:1,locale:'en-CA',timezoneId:'America/Toronto'}))),pages=await Promise.all(contexts.map(c=>c.newPage())),errors:string[]=[];
 for(let i=0;i<4;i++){await contexts[i].addInitScript(id=>localStorage.setItem('cribbage:player',id),ids[i]);pages[i].on('pageerror',e=>errors.push(e.message));await pages[i].goto(`/?table=${room}`);}
 let step=0;
 const detail=(p:Page)=>p.locator('[data-hand-history]');
 async function verifyHistory(p:Page,round:typeof expected[number]){
  await expect(p.getByRole('region',{name:'Hand history',exact:true})).toBeVisible();await expect(p.getByRole('heading',{name:`Round ${round.round}`,exact:true})).toBeVisible();
  await p.locator('[data-hand-history] img').evaluateAll(images=>Promise.all(images.map(image=>(image as HTMLImageElement).decode())));
  expect(await p.locator('[data-history-owner]').evaluateAll(rows=>rows.map(row=>({owner:row.getAttribute('data-history-owner'),kind:row.getAttribute('data-history-kind'),points:Number(row.getAttribute('data-history-points')),cards:Array.from(row.querySelectorAll('[data-history-card]')).map(card=>card.getAttribute('data-history-card'))})))).toEqual(round.hands);
  await expect(p.locator('.starter img')).toHaveAttribute('src',`/cards/${round.starter}.svg`);
  expect((await (await page.request.get(`/api/tables/${room}`)).json()).length).toBe(sequence);
 }
 async function photograph(actor:number,description:string){for(const viewer of [actor,...[0,1,2,3].filter(i=>i!==actor)])await helper.step(`history-${step}`,pages[viewer],names[viewer],`${description} · ${viewer===actor?'actor':'observer'}`,[{spec:'History is personal; the current deal, revision and concealed opponent cards stay intact',check:async()=>{
  await expect(pages[viewer].locator('main')).toHaveAttribute('data-revision',String(sequence));await expect(pages[viewer].locator('main')).toHaveAttribute('data-round','2');
  const held=pages[viewer].locator('[data-player]').filter({has:pages[viewer].getByRole('heading',{name:names[(viewer+1)%4],exact:true})}).getByRole('list',{name:'Held cards',exact:true});expect(await held.innerText()).toContain('Face down');expect(errors).toEqual([]);
 }}]);step++;}
 try{
  for(const p of pages)await expect(p.getByRole('status')).toHaveAttribute('data-status','synced');
  await detail(pages[0]).locator('summary').click();await verifyHistory(pages[0],expected[1]);await photograph(0,'Alex opens the latest completed round');
  await pages[0].getByRole('button',{name:'Previous round',exact:true}).click();await verifyHistory(pages[0],expected[0]);await expect(pages[0].getByRole('button',{name:'Previous round',exact:true})).toBeDisabled();await photograph(0,'Alex reviews the earlier hands and crib');
  await detail(pages[1]).locator('summary').click();await verifyHistory(pages[1],expected[1]);await verifyHistory(pages[0],expected[0]);await photograph(1,'Rowan reviews the latest round independently');
  await pages[0].getByRole('button',{name:'Next round',exact:true}).click();await verifyHistory(pages[0],expected[1]);await expect(pages[0].getByRole('button',{name:'Next round',exact:true})).toBeDisabled();await photograph(0,'Alex returns to the latest counted round');
  await pages[0].keyboard.press('Escape');await expect(detail(pages[0])).not.toHaveAttribute('open','');await photograph(0,'Alex closes history with Escape');
  await pages[0].reload();await expect(detail(pages[0])).not.toHaveAttribute('open','');await photograph(0,'Returning restores history from the same intent log');
  // Genuine phone viewports in a visible device frame keep every capture 1180×820.
  const p=pages[0];await p.route('**/history-review',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><style>body{margin:0;background:#0c1512;color:#eddfbd;text-align:center;font:18px Georgia}h1{font:22px Georgia;margin:12px}.device{position:fixed;inset:58px 0 0;overflow:hidden}iframe{position:absolute;left:50%;top:0;border:1px solid #ad925b;transform:translateX(-50%) scale(.82);transform-origin:top center}</style><h1>Phone portrait</h1><div class="device"><iframe title="Cribbage device" width="390" height="844" src="/?table=${room}"></iframe></div>`}));await p.goto('/history-review');
  const device=p.frameLocator('iframe');await expect(device.getByRole('status')).toHaveAttribute('data-status','synced');await device.locator('[data-hand-history] summary').click();
  for(const [orientation,width,height] of [['portrait',390,844],['landscape',844,390]] as const){
   await p.locator('iframe').evaluate((node,{width,height})=>{node.setAttribute('width',String(width));node.setAttribute('height',String(height));},{width,height});await p.locator('h1').evaluate((node,text)=>node.textContent=text,`Phone ${orientation}`);
   await device.locator('[data-hand-history] img').evaluateAll(images=>Promise.all(images.map(image=>(image as HTMLImageElement).decode())));
   await helper.step(`history-phone-${orientation}`,p,'Alex',`Review the four hands and crib on phone ${orientation}`,[{spec:'The panel stays inside the device and its card list scrolls without covering navigation',check:async()=>{
    expect(await device.locator('[data-hand-history] .panel').evaluate(panel=>{const r=panel.getBoundingClientRect();return r.left>=0&&r.top>=0&&r.right<=innerWidth+.1&&r.bottom<=innerHeight+.1;})).toBe(true);await expect(device.locator('[data-history-owner]')).toHaveCount(5);
   }}],false);
  }
  const list=await device.locator('ol[data-e2e-scroll]').boundingBox();await p.mouse.move(list!.x+list!.width/2,list!.y+list!.height/2);await p.mouse.wheel(0,500);await expect(device.locator('[data-history-kind=crib]')).toBeInViewport();
  await helper.step('history-phone-crib',p,'Alex','Scroll to the dealer’s crib on phone landscape',[{spec:'The last player and crib remain readable below the fixed round navigation',check:async()=>{await expect(device.getByRole('heading',{name:'Round 2',exact:true})).toBeInViewport();expect((await (await page.request.get(`/api/tables/${room}`)).json()).length).toBe(sequence);}}],false);
  await p.locator('iframe').evaluate((node,src)=>node.setAttribute('src',src),`/?table=${room}&launch=join&name=Alex&returnTo=http%3A%2F%2F127.0.0.1%3A4199%2F`);
  await expect(device.getByRole('link',{name:'Back to gameroom'})).toBeVisible();await expect(device.getByRole('status')).toHaveAttribute('data-status','synced');await device.locator('[data-hand-history] summary').click();await device.locator('[data-hand-history] img').evaluateAll(images=>Promise.all(images.map(image=>(image as HTMLImageElement).decode())));
  await helper.step('history-gameroom',p,'Alex','Review history below the return-to-gameroom link',[{spec:'Return navigation and history never overlap on the short phone viewport, with no duplicate seating intent',check:async()=>{
   const historyBox=await device.locator('[data-hand-history] summary').boundingBox(),returnBox=await device.getByRole('link',{name:'Back to gameroom'}).boundingBox();expect(historyBox!.y).toBeGreaterThan(returnBox!.y+returnBox!.height);expect((await (await page.request.get(`/api/tables/${room}`)).json()).length).toBe(sequence);
  }}],false);
  helper.finish();
 }finally{for(const context of contexts)await context.close();}
});
