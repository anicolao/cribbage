import {test,expect,type Page,type TestInfo} from '@playwright/test';
import {writeFileSync,mkdirSync} from 'node:fs';
import {dirname,join} from 'node:path';
type Verification={spec:string;check:()=>Promise<unknown>};
/** One ordered, illustrated narrative across actor and observer perspectives. */
export class TestStepHelper{
 private steps:string[]=[];
 constructor(private info:TestInfo){}
 async step(id:string,page:Page,player:string,description:string,verifications:Verification[]){
  await test.step(`${player}: ${description}`,async()=>{
   await page.bringToFront();
   for(const verification of verifications)await test.step(verification.spec,verification.check);
   await expect(page.locator('[role=status]')).toHaveAttribute('data-status','synced',{timeout:20_000});
   await page.mouse.move(0,0);
   await page.evaluate(async()=>{await document.fonts.ready;await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));});
   const overflow=await page.evaluate(()=>{
    const failures:string[]=[];
    if(document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight)failures.push('Document scrolls');
    for(const node of document.querySelectorAll<HTMLElement>('[data-e2e-fit],button,input,a[href],polygon[role=button]')){
     if(node.closest('.sr-only'))continue;
     const r=node.getBoundingClientRect();if(!r.width||!r.height||getComputedStyle(node).display==='none')continue;
     if(r.left<0||r.top<0||r.right>innerWidth+.1||r.bottom>innerHeight+.1)failures.push(`${node.tagName} ${node.getAttribute('aria-label')??node.textContent} leaves screen`);
    }
    return failures;
   });expect(overflow).toEqual([]);
   const name=`${String(this.steps.length).padStart(3,'0')}-${id}-${player.toLowerCase()}.png`;
   await expect(page).toHaveScreenshot(name,{timeout:10_000,maxDiffPixels:0,threshold:0});
   this.steps.push(`## ${description}\n\nViewpoint: **${player}**\n\n![${description}](./screenshots/${name.replace('.png',`-${process.platform}.png`)})\n\n${verifications.map(v=>`- [x] ${v.spec}`).join('\n')}`);
  });
 }
 finish(){
  // Baseline generation is explicit and must be followed by a separate comparison run.
  if(this.info.config.updateSnapshots==='none')return;
  const folder=dirname(this.info.file);mkdirSync(folder,{recursive:true});
  writeFileSync(join(folder,`STORY-${process.platform}.md`),`# Four friends at the cribbage table\n\nEvery user action is followed by the actor's view and all seated observers. All captures are 1180×820 at 1×; verification allows zero different pixels.\n\n${this.steps.join('\n\n')}\n`);
 }
}
