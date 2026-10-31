import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import {fileURLToPath} from 'node:url';
export default defineConfig({
 base:process.env.PUBLIC_BASE_PATH??'/',
 // Only load the interactivity entry: the extras root eagerly imports unrelated
 // renderers and post-processing components during Vite dependency discovery.
 resolve:{alias:[{find:/^@threlte\/extras$/,replacement:fileURLToPath(new URL('./node_modules/@threlte/extras/dist/interactivity/index.js',import.meta.url))}]},
 plugins:[svelte()],
 server:{proxy:{'/api':'http://127.0.0.1:5198'}}
});
