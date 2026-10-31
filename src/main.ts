import {initializePreferences} from './settings';
import { mount } from 'svelte';
import App from './Router.svelte';
try{initializePreferences(localStorage);}catch{}
mount(App, { target: document.getElementById('app')! });
