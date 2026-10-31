import {test,expect,type Page,type TestInfo} from '@playwright/test';
import {writeFileSync,mkdirSync,readFileSync,existsSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {identicalPixels} from './exact-pixels';
type Verification={spec:string;check:()=>Promise<unknown>};
/** One ordered, illustrated narrative across actor and observer perspectives. */
export class TestStepHelper{
 private steps:string[]=[];
 constructor(private info:TestInfo,private story='STORY'){}
 async step(id:string,page:Page,player:string,description:string,verifications:Verification[],settled=true){
  await test.step(`${player}: ${description}`,async()=>{
   await page.bringToFront();
   if(settled)try{await expect(page.locator('[role=status]')).toHaveAttribute('data-status','synced',{timeout:60_000});}catch(error){
    await this.info.attach('table-readiness',{body:JSON.stringify(await page.evaluate(()=>({main:document.querySelector('main')?.outerHTML.slice(0,1000),table:document.querySelector('[data-table-view]')?.outerHTML.slice(0,1000),status:document.querySelector('[role=status]')?.outerHTML,visibility:document.visibilityState}))),contentType:'application/json'});throw error;
   }
   await page.mouse.move(0,0);
   if(settled)await expect(page.locator('[data-table-view]')).toHaveAttribute('data-motion-idle','true');
   for(const verification of verifications)await test.step(verification.spec,verification.check);
   await page.evaluate(async()=>{await document.fonts.ready;await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));});
   // DOM checks can await a new countdown, which starts the forced-card lift.
   // Wait for that cue too, then paint its settled pose before capturing.
   if(settled){
    await expect(page.locator('[data-table-view]')).toHaveAttribute('data-motion-idle','true');
    await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
   }
   const overflow=await page.evaluate(()=>{
    const failures:string[]=[];
    if(document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight)failures.push('Document scrolls');
    for(const node of document.querySelectorAll<HTMLElement>('[data-e2e-fit],button,input,a[href],polygon[role=button]')){
     if(node.closest('.sr-only'))continue;
     if(node.closest('[data-e2e-scroll]'))continue;
     const r=node.getBoundingClientRect();if(!r.width||!r.height||getComputedStyle(node).display==='none')continue;
     if(r.left<0||r.top<0||r.right>innerWidth+.1||r.bottom>innerHeight+.1)failures.push(`${node.tagName} ${node.getAttribute('aria-label')??node.textContent} leaves screen`);
    }
    return failures;
   });expect(overflow).toEqual([]);
   const name=`${String(this.steps.length).padStart(3,'0')}-${id}-${player.toLowerCase()}.png`;
   const baseline=this.info.snapshotPath(name),capture=await page.screenshot({animations:'disabled',caret:'hide',scale:'css'});
   if(this.info.config.updateSnapshots!=='none'){
    mkdirSync(dirname(baseline),{recursive:true});writeFileSync(baseline,capture);
   }else{
    const same=existsSync(baseline)&&await identicalPixels(capture,readFileSync(baseline));
    if(!same){
     await this.info.attach(`${id}-${player}-actual`,{body:capture,contentType:'image/png'});
     expect(capture).toMatchSnapshot(name,{maxDiffPixels:0,threshold:0});
     expect(same,'Every decoded RGBA byte must match the reviewed reference').toBe(true);
    }
   }
   this.steps.push(`## ${description}\n\nViewpoint: **${player}**\n\n![${description}](./screenshots/${name.replace('.png',`-${process.platform}.png`)})\n\n${verifications.map(v=>`- [x] ${v.spec}`).join('\n')}`);
  });
 }
 finish(){
  // Baseline generation is explicit and must be followed by a separate comparison run.
  const folder=dirname(this.info.file);mkdirSync(folder,{recursive:true});
  const title=this.story==='SETTINGS'?'Personal table settings':this.story==='ANIMATIONS'?'Shared animation review':this.story==='TWO-PLAYERS'?'Two friends at the cribbage table':this.story==='THREE-PLAYERS'?'Three friends at the cribbage table':'Four friends at the cribbage table';
  writeFileSync(join(folder,`${this.story}-${process.platform}.md`),`# ${title}\n\n${this.story==='SETTINGS'?'Personal settings, audio playback and reload are exercised through the visible controls.':this.story==='ANIMATIONS'?'Transitions are paused for review, including the points labels at 1.20 seconds.':"Every user action is followed by the actor's view and all seated observers."} All captures are 1180×820 at 1×; verification allows zero different pixels.\n\n${this.steps.join('\n\n')}\n`);
 }
}
