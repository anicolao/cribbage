import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/e2e',fullyParallel:false,workers:1,forbidOnly:true,retries:0,timeout:600_000,updateSnapshots:'none',
 reporter:[['list'],['html',{open:'never'}]],
 use:{baseURL:'http://127.0.0.1:4197',viewport:{width:1180,height:820},deviceScaleFactor:1,locale:'en-CA',timezoneId:'America/Toronto',contextOptions:{reducedMotion:'reduce'},actionTimeout:5000,navigationTimeout:10_000,trace:{mode:'retain-on-failure',screenshots:false},launchOptions:{args:['--disable-gpu','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-skia-runtime-opts','--num-raster-threads=2','--run-all-compositor-stages-before-draw','--disable-checker-imaging','--font-render-hinting=none','--disable-font-subpixel-positioning','--disable-lcd-text','--force-device-scale-factor=1','--disable-partial-raster']}},
 projects:[{name:'ipad',use:{browserName:'chromium'}}],
 snapshotPathTemplate:'{testDir}/{testFileDir}/screenshots/{arg}-{platform}{ext}',
 expect:{timeout:10_000,toHaveScreenshot:{maxDiffPixels:0,threshold:0,animations:'disabled',caret:'hide',scale:'css'}},
 webServer:{command:'bun run build && PORT=4197 CRIBBAGE_DB=:memory: bun run server/start.ts',url:'http://127.0.0.1:4197/api/health',reuseExistingServer:false,timeout:120_000}
});
