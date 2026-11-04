import {test,expect} from '@playwright/test';
import {TestStepHelper} from './helpers/test-step-helper';
test('URL invitations wait for the host and replay without duplicate seats',async({page,browser},info)=>{
 const story=new TestStepHelper(info,'URL-LAUNCH'),guestContext=await browser.newContext({viewport:{width:1180,height:820},deviceScaleFactor:1,locale:'en-CA',timezoneId:'America/Toronto'}),guest=await guestContext.newPage();
 await page.addInitScript(()=>localStorage.setItem('cribbage:player','url-alex'));
 await guest.addInitScript(()=>localStorage.setItem('cribbage:player','url-sam'));
 const hostUrl='http://127.0.0.1:4197/?table=URL12345&launch=create&name=Alex&returnTo=http%3A%2F%2F127.0.0.1%3A4199%2F%3Froom%3DABC12345';
 const guestUrl=hostUrl.replace('launch=create','launch=join').replace('name=Alex','name=Sam');
 try{
  await guest.goto(guestUrl);
  await story.step('url-guest-waits',guest,'Sam','A guest arriving first waits for the host',[{spec:'The empty table is not claimed by its first visitor',check:async()=>{await expect(guest.getByText('Waiting for your host to open the table…')).toBeVisible();await expect(guest.locator('[data-player]')).toHaveCount(0);}}]);
  await page.goto(hostUrl);
  for(const [view,name] of [[page,'Alex'],[guest,'Sam']] as const)await story.step('url-seated',view,name,'The host creates the table and both friends take a seat',[{spec:'The URL supplies a name, the table has two players, and returning to gameroom is available',check:async()=>{await expect(view.locator('[data-player]')).toHaveCount(2);await expect(view.getByRole('link',{name:'Back to gameroom'})).toBeVisible();await expect(view.getByRole('button',{name:'Deal',exact:true})).toHaveCount(name==='Alex'?1:0);}}]);
  await guest.reload();await page.reload();
  for(const [view,name] of [[page,'Alex'],[guest,'Sam']] as const)await story.step('url-replayed',view,name,'Reload retains the same two seats',[{spec:'Neither create nor join is appended twice',check:async()=>{await expect(view.locator('[data-player]')).toHaveCount(2);const events=await (await page.request.get('/api/tables/URL12345')).json();expect(events.map((e:{intent:{type:string}})=>e.intent.type)).toEqual(['create','join']);}}]);
  story.finish();
 }finally{await guestContext.close();}
});
