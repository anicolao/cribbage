import {test,expect} from '@playwright/test';
import sharp from 'sharp';
import {TestStepHelper} from './helpers/test-step-helper';
test('camera views lock card gestures and restore each orientation independently',async({page},info)=>{
 const helper=new TestStepHelper(info,'CAMERA'),errors:string[]=[];
 await page.addInitScript(()=>{let n=Number(sessionStorage.getItem('camera-choice')??0);Object.defineProperty(crypto,'randomUUID',{value:()=>{sessionStorage.setItem('camera-choice',String(n+1));return n++===0?'camera-player':n===2?'C4A123':`camera-choice-${n}`;}});});page.on('pageerror',error=>errors.push(error.message));
 // A real game iframe provides genuine orientation/ResizeObserver changes while
 // every illustrated acceptance capture stays at 1180×820, scale 1.
 await page.route('**/camera-review',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><style>body{margin:0;background:#0c1512;color:#eddfbd;font:18px Georgia;text-align:center}h1{font:22px Georgia;margin:12px}.device{position:fixed;inset:58px 0 0;overflow:hidden}iframe{position:absolute;left:50%;top:0;display:block;border:1px solid #ad925b;margin:0;transform:translateX(-50%) scale(.82);transform-origin:top center}</style></head><body><h1>Phone portrait</h1><div class="device"><iframe title="Cribbage device" width="390" height="844" src="/"></iframe></div></body></html>'}));
 await page.goto('/camera-review');const device=page.frameLocator('iframe'),table=device.locator('[data-table-view]');
 const pose=async()=>JSON.parse(await table.getAttribute('data-camera-position')??'[]') as number[];
 const closeTo=async(position:number[])=>expect.poll(async()=>{const actual=await pose();return actual.length===3&&actual.every((v,i)=>Math.abs(v-position[i])<1e-7);}).toBe(true);
 const rotate=async(width:number,height:number,title:string)=>{await page.locator('iframe').evaluate((node,{width,height})=>{node.setAttribute('width',String(width));node.setAttribute('height',String(height));},{width,height});await page.locator('h1').evaluate((node,title)=>{node.textContent=title;},title);};
 const enter=async()=>{await device.getByRole('button',{name:'Settings',exact:true}).click();await device.getByRole('button',{name:'Set Camera',exact:true}).click();await expect(table).toHaveAttribute('data-camera-locked','false');};
 const finish=async()=>{await device.getByRole('button',{name:'Done',exact:true}).click();await expect(table).toHaveAttribute('data-camera-locked','true');};
 const drag=async()=>{const box=await device.locator('canvas').boundingBox();expect(box).not.toBeNull();await page.mouse.move(box!.x+box!.width*.5,box!.y+box!.height*.5);await page.mouse.down();await page.mouse.move(box!.x+box!.width*.6,box!.y+box!.height*.44,{steps:12});await page.mouse.up();};
 await expect(device.locator('main')).toHaveAttribute('data-ready','true');await expect(table).toHaveAttribute('data-layout','phone-portrait');
 await device.getByRole('textbox',{name:'Your name',exact:true}).fill('Alex');await device.getByRole('button',{name:'Take a seat',exact:true}).click();await expect(device.getByRole('link',{name:'Invitation',exact:true})).toBeVisible();
 const room=new URL(await device.getByRole('link',{name:'Invitation',exact:true}).getAttribute('href')??'').searchParams.get('table')!;
 await device.getByRole('button',{name:'Invite companion',exact:true}).click();await device.getByRole('button',{name:'Deal',exact:true}).click();await expect(device.locator('main')).toHaveAttribute('data-phase','discard');await expect.poll(async()=>(await (await page.request.get(`/api/tables/${room}`)).json()).length).toBe(5);await expect(device.getByRole('status')).toHaveAttribute('data-status','synced');
 const initial=await pose();expect(Number(await table.getAttribute('data-camera-distance'))).toBeCloseTo(19,8);await drag();await closeTo(initial);
 await helper.step('camera-locked',page,'Alex','Normal play keeps the portrait camera locked',[{spec:'Dragging does not move the camera or discard a card',check:async()=>{await expect(table).toHaveAttribute('data-camera-locked','true');await expect(device.locator('[data-card][aria-disabled=false]')).toHaveCount(6);const events=await (await page.request.get(`/api/tables/${room}`)).json();expect(events.filter((e:{actor:string;intent:{type:string}})=>e.actor==='camera-player'&&e.intent.type==='discard')).toEqual([]);}}],false);
 await enter();await drag();const portrait=await pose();expect(portrait).not.toEqual(initial);
 const before=(await (await page.request.get(`/api/tables/${room}`)).json()).length;
 await expect(device.locator('[data-card][aria-disabled=false]')).toHaveCount(0);
 await helper.step('camera-adjusting',page,'Alex','Set Camera turns the table without playing cards',[{spec:'Card choices are disabled while camera controls are unlocked',check:async()=>{await expect(table).toHaveAttribute('data-camera-locked','false');expect((await (await page.request.get(`/api/tables/${room}`)).json()).length).toBe(before);}}],false);await finish();
 await rotate(844,390,'Phone landscape');await expect(table).toHaveAttribute('data-layout','phone-landscape');await expect.poll(async()=>Number(await table.getAttribute('data-camera-distance'))).toBeCloseTo(25,8);
 const landscapeDefault=await pose();await enter();await drag();const landscape=await pose();expect(landscape).not.toEqual(landscapeDefault);await finish();
 await helper.step('camera-landscape',page,'Alex','Landscape has its own saved view',[{spec:'Setting landscape leaves the portrait pose intact',check:async()=>{await closeTo(landscape);}}],false);
 for(let i=0;i<3;i++){await rotate(390,844,'Phone portrait');await expect(table).toHaveAttribute('data-layout','phone-portrait');await closeTo(portrait);await rotate(844,390,'Phone landscape');await expect(table).toHaveAttribute('data-layout','phone-landscape');await closeTo(landscape);}
 await helper.step('camera-rotated',page,'Alex','Repeated rotation restores the same landscape view',[{spec:'No camera scale or target drift after three portrait/landscape cycles',check:async()=>{await closeTo(landscape);}}],false);
 await enter();await device.getByRole('button',{name:'Reset View',exact:true}).click();await closeTo(landscapeDefault);await finish();
 // A portrait-to-tablet-landscape jump must fit the destination aspect even
 // before Threlte finishes measuring its new canvas.
 await rotate(390,844,'Phone portrait');await closeTo(portrait);
 await rotate(1180,820,'Tablet landscape');await expect(table).toHaveAttribute('data-layout','table');await expect.poll(async()=>Number(await table.getAttribute('data-camera-distance'))).toBeCloseTo(16.3/(2*Math.tan(Math.PI/8)),8);
 await rotate(844,390,'Phone landscape');await expect(table).toHaveAttribute('data-layout','phone-landscape');await closeTo(landscapeDefault);
 await helper.step('camera-reset',page,'Alex','Reset View restores only landscape',[{spec:'The reviewed default landscape camera returns',check:async()=>{await closeTo(landscapeDefault);}}],false);
 await rotate(390,844,'Phone portrait');await closeTo(portrait);
 const frame=page.frames().find(f=>f.url().includes(`table=${room}`))!;await frame.goto(`/?table=${room}`);await expect(device.locator('main')).toHaveAttribute('data-ready','true');await closeTo(portrait);await expect(table).toHaveAttribute('data-camera-locked','true');
 await helper.step('camera-restored',page,'Alex','Returning restores portrait and locks the controls',[{spec:'Saved camera survives reload, reset in another orientation, and normal play resumes',check:async()=>{expect(errors).toEqual([]);await expect(device.locator('[data-card][aria-disabled=false]')).toHaveCount(6);}}],false);
 const manifestURL=await device.locator('link[rel=manifest]').getAttribute('href'),manifestResponse=await page.request.get(manifestURL!);expect(manifestResponse.ok()).toBe(true);const manifest=await manifestResponse.json();expect(manifest.display).toBe('standalone');
 for(const icon of manifest.icons){const response=await page.request.get('/'+icon.src);expect(response.ok()).toBe(true);const {width,height}=await sharp(await response.body()).metadata();expect(`${width}x${height}`).toBe(icon.sizes);}
 const apple=await device.locator('link[rel=apple-touch-icon]').getAttribute('href');expect((await page.request.get(apple!)).ok()).toBe(true);helper.finish();
});
