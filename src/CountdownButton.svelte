<script lang="ts">
 import {cardName} from './game/cards';
 import type {CountdownAction} from './game/countdowns';
 let {action,onactivate=()=>{}}:{action:CountdownAction;onactivate?:()=>void}=$props();
 const label=$derived(action.kind==='undo'?'Undo':action.kind==='go'?'Go':action.kind==='cut'?'Cut':action.kind==='count'?`Peg ${action.points??0}`:action.kind==='deal'?'Deal':'Play');
 const accessible=$derived(action.kind==='undo'?'Undo crib contribution':action.kind==='play'&&action.card?`Play ${cardName(action.card)}`:label);
</script>
<button class="countdown" type="button" aria-label={accessible} title={action.remaining===undefined?'Return your most recent crib card to your hand.':action.kind==='undo'?'Your contribution stands when the countdown ends.':action.kind==='play'&&action.card?`${cardName(action.card)} plays when the countdown ends.`:'Continues automatically when the countdown ends.'} disabled={action.disabled} onclick={onactivate} data-countdown={action.kind} data-seconds={action.remaining??''} data-undo-card={action.kind==='undo'?action.card:undefined}>
 <span>{label}</span>{#if action.remaining!==undefined}<span class="seconds" aria-hidden="true">{action.remaining}</span>{/if}
 {#if action.fraction!==undefined}<span class="progress" aria-hidden="true" style:transform={`scaleX(${Math.min(1,action.fraction)})`}></span>{/if}
</button>
<style>
 .countdown{position:relative;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;gap:16px;min-width:130px;min-height:44px;padding:10px 18px;border:1px solid #e1c58b;border-radius:3px;background:linear-gradient(#dfc393,#b69762);color:#30261b;box-shadow:0 3px 8px #0005;font:20px Georgia,serif;cursor:pointer}.countdown:disabled{opacity:.45;cursor:default}.seconds{font-size:16px;font-variant-numeric:tabular-nums;min-width:12px;opacity:.7}.progress{position:absolute;bottom:0;left:0;width:100%;height:3px;background:#6d5024;transform-origin:left;transition:transform .1s linear}.countdown:focus-visible{outline:2px solid #e4c585;outline-offset:4px}
</style>
