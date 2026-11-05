<script lang="ts">
 import {cardName} from './game/cards';
 import {seats} from './table';
 import type {HistoryRound} from './presentation/handHistory';
 let {rounds}:{rounds:HistoryRound[]}=$props();
 let selected=$state<string>();
 let element=$state<HTMLDetailsElement>(),open=$state(false);
 const index=$derived(Math.max(0,selected?rounds.findIndex(round=>round.id===selected):rounds.length-1));
 const round=$derived(rounds[index]);
 function move(delta:number){selected=rounds[index+delta]?.id??selected;}
</script>
<svelte:window onkeydown={event=>{if(event.key==='Escape'&&open){open=false;element?.querySelector('summary')?.focus();}}} onpointerdown={event=>{if(open&&event.target instanceof Node&&!element?.contains(event.target))open=false;}}/>
{#if round}
 <details bind:this={element} bind:open class="history" data-hand-history ontoggle={event=>{selected=event.currentTarget.open?round.id:undefined;}}>
  <summary aria-label="Hand history"><span class="cards-icon" aria-hidden="true">▤</span> <span class="caption">History</span> <span class="rounds">{rounds.length}</span></summary>
  <section class="panel" aria-label="Hand history" data-e2e-fit>
   <header><button type="button" aria-label="Previous round" disabled={index===0} onclick={()=>move(-1)}>‹</button><h2>{#if rounds.at(-1)!.game>1}<small>Game {round.game}</small>{/if}Round {round.round}</h2><button type="button" aria-label="Next round" disabled={index===rounds.length-1} onclick={()=>move(1)}>›</button><div class="starter"><span>Starter</span><img src={`${import.meta.env.BASE_URL}cards/${round.starter}.svg`} alt={cardName(round.starter)} width="29" height="42"/></div></header>
   <ol data-e2e-scroll>
    {#each round.hands as hand (`${round.id}:${hand.owner}:${hand.kind}`)}
     <li data-history-owner={hand.owner} data-history-kind={hand.kind} data-history-points={hand.points} style:--peg-color={seats[hand.seat].color}>
      <div class="name"><span>{hand.name}{hand.kind==='crib'?'’s crib':''}</span>{#if hand.kind==='hand'&&(hand.pegging||hand.heels)}<small>{#if hand.pegging}Pegging +{hand.pegging}{/if}{#if hand.heels}{hand.pegging?' · ':''}Starter +{hand.heels}{/if}</small>{/if}</div>
      <div class="hand" aria-label={`${hand.name}’s ${hand.kind}`}>
       {#each hand.cards as card}<span class="card"><img data-history-card={card} src={`${import.meta.env.BASE_URL}cards/${card}.svg`} alt={cardName(card)} width="29" height="42"/></span>{/each}
      </div>
      <strong aria-label={`${hand.points} ${hand.points===1?'point':'points'}`}>+{hand.points}</strong>
     </li>
    {/each}
   </ol>
  </section>
 </details>
{/if}
<style>
 .history{position:absolute;top:20px;left:20px;z-index:3;font-family:Georgia,serif;color:#eddfbd;max-width:calc(100vw - 40px)}summary{list-style:none;display:flex;align-items:center;gap:9px;min-height:44px;width:max-content;padding:8px 13px;border:1px solid #b89b6170;border-radius:4px;background:linear-gradient(#243b2e,#10291e);box-shadow:0 2px 8px #0005;font-size:15px;cursor:pointer}summary::-webkit-details-marker{display:none}.cards-icon{color:#d9c695;font-size:21px}.rounds{font-size:12px;color:#c5ad76;border-left:1px solid #b89b6140;padding-left:9px}summary:hover,button:hover:not(:disabled){background:#2c4536}summary:focus-visible,button:focus-visible{outline:2px solid #e4c585;outline-offset:3px}.panel{margin-top:8px;width:380px;max-width:calc(100vw - 40px);max-height:calc(100svh - 92px);display:flex;flex-direction:column;border:1px solid #bda16b;border-radius:6px;background:linear-gradient(120deg,#183026fa,#10251ffa);box-shadow:0 8px 30px #0008;overflow:hidden}header{display:flex;align-items:center;gap:4px;padding:10px 12px;border-bottom:1px solid #bda16b40;flex-shrink:0}h2{font-size:19px;font-weight:400;margin:0 5px;min-width:83px;text-align:center}h2 small{display:block;font-size:11px;color:#b6c0a8;margin-bottom:3px}button{width:44px;height:44px;border:1px solid #bda16b55;border-radius:3px;color:#eddfbd;background:#203b2e;font:25px Georgia,serif;cursor:pointer}button:disabled{opacity:.3;cursor:default}.starter{margin-left:auto;display:flex;align-items:center;gap:8px;font-size:12px;color:#b9c4ac}.starter img,.card{background:#f7eedc;border-radius:3px;border:1px solid #c8bda7;box-shadow:0 1px 3px #0006;padding:1px}.starter img{object-fit:contain}ol{list-style:none;margin:0;padding:4px 14px 10px;overflow-y:auto;overscroll-behavior:contain;scrollbar-color:#8d805b #142b21}li{display:grid;grid-template-columns:minmax(90px,1fr) auto 43px;gap:12px;align-items:center;padding:13px 0;border-bottom:1px solid #bda16b25}li:last-child{border:0}.name{padding-left:9px;border-left:4px solid var(--peg-color);font-size:15px;overflow-wrap:anywhere}.name small{display:block;color:#aab99e;font-size:10px;line-height:1.6;margin-top:3px}.hand{display:flex;align-items:center;padding-left:5px}.card{display:block;transform:rotate(-4deg);margin-left:-5px;line-height:0;flex-shrink:0}.card:nth-child(2){transform:rotate(-1deg)}.card:nth-child(3){transform:rotate(2deg)}.card:nth-child(4){transform:rotate(5deg)}img{display:block}strong{font-size:22px;font-weight:400;text-align:right;color:#f0d599}@media(max-width:600px){summary{position:relative;width:44px;justify-content:center;padding:0}.caption{display:none}.rounds{position:absolute;right:-4px;bottom:-4px;border:1px solid #bda16b70;border-radius:9px;padding:1px 5px;background:#173429;font-size:10px}}@media(max-width:420px){.history{left:12px;top:18px;max-width:calc(100vw - 24px)}.panel{max-width:calc(100vw - 24px)}li{gap:8px;grid-template-columns:minmax(72px,1fr) auto 37px}ol{padding-left:10px;padding-right:10px}header{padding-left:9px;padding-right:9px}}
</style>
