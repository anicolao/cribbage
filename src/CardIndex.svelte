<script lang="ts">
 import {cardName,suit} from './game/cards';
 let {card}:{card:string}=$props();
 const rank=$derived(({ace:'A',jack:'J',queen:'Q',king:'K'} as Record<string,string>)[card.split('_')[0]]??card.split('_')[0]);
 const symbol=$derived(({clubs:'♣',diamonds:'♦',hearts:'♥',spades:'♠'} as Record<string,string>)[suit(card)]);
 const red=$derived(suit(card)==='hearts'||suit(card)==='diamonds');
</script>
<span class="index" class:red role="img" aria-label={cardName(card)} data-history-card={card}><b aria-hidden="true">{rank}</b><span aria-hidden="true">{symbol}</span></span>
<style>
 .index{display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;width:35px;height:49px;border:1px solid #c8bda7;border-radius:4px;background:linear-gradient(130deg,#fffaf0,#eee3cc);box-shadow:0 1px 3px #0006;color:#19201c;font-family:Georgia,serif;line-height:1}.index.red{color:#ac202a}b{font-size:23px;font-weight:700;letter-spacing:-1px}span span{font-size:21px;margin-top:2px}
</style>
