<script lang="ts">
 import {onMount} from 'svelte';
 import TableView from './TableView.svelte';
 import {initialState,replay,legalCards,countOwner,type State,type Event,type Intent} from './game/engine';
 import {repository,playerIdentity} from './game/repository';
 import {botIntent} from './game/bot';
 import {cardName,handScore} from './game/cards';
 import {tablePlayers} from './game/layout';
 let game=$state<State>(initialState()),viewer=$state(''),room=$state(''),name=$state(''),busy=$state(false),error=$state(''),ready=$state(false),animating=$state(false),renderedRevision=$state(-1),connected=$state(false);
 let repo:ReturnType<typeof repository>|undefined;
 const seat=$derived(game.players.findIndex(p=>p.id===viewer));
 const own=$derived(seat>=0?game.players[seat]:undefined);
 const gathering=$derived(game.phase==='gathering');
 const isTurn=$derived(seat>=0&&game.turn===seat);
 const invitation=$derived(typeof location==='undefined'?'':`${location.origin}${import.meta.env.BASE_URL}?table=${room}`);
 const countPoints=$derived(game.phase==='count'&&game.cut?handScore(game.countIndex===4?game.crib:game.kept[countOwner(game)],game.cut,game.countIndex===4):0);
 const prompt=$derived(gathering?(own?'': 'Take a seat'):game.phase==='discard'?(seat>=0&&game.discards[seat]===null?'Choose one for the crib':'Waiting for the crib'):game.phase==='cut'?`${game.players[game.turn]?.name} to cut`:game.phase==='pegging'?`${game.total} · ${isTurn?'Your turn':game.players[game.turn]?.name+' to play'}`:game.phase==='count'?`${game.players[game.turn]?.name}${game.countIndex===4?'’s crib':'’s hand'} · ${countPoints} points`:game.phase==='between'?game.message:game.message);
 async function initialize(){
  try{viewer=await playerIdentity();error='';name=localStorage.getItem('cribbage:name')??'';
   const code=new URLSearchParams(location.search).get('table');if(code&&/^[A-Z0-9]{5,8}$/.test(code))room=code;
  }catch{error='Couldn’t reach the table. Try again.';}
 }
 onMount(()=>{void initialize();});
 $effect(()=>{
  if(!room||!viewer)return;
  connected=false;
  repo=repository(room,(events:Event[])=>{game=replay(events);connected=true;error='';},message=>{connected=false;error=message;});
  return()=>repo?.close();
 });
 async function act(intent:Intent,actor=viewer){
  if(busy||animating||!repo)return;busy=true;error='';
  try{await repo.append(actor,intent);}catch(e){error=(e as Error).message;}finally{busy=false;}
 }
 async function join(){
  if(!name.trim())return;
  localStorage.setItem('cribbage:name',name.trim());
  if(!room){room=crypto.randomUUID().replaceAll('-','').slice(0,6).toUpperCase();history.replaceState(null,'',`?table=${room}`);return;}
  await act({type:game.players.length?'join':'create',name});
 }
 // Creating the invitation opens the stream first; the second click is avoided.
 let creating=$state(false);
 async function enter(){if(!name.trim())return;if(!room){creating=true;await join();}else await join();}
 $effect(()=>{if(creating&&connected&&repo){creating=false;void join();}});
 $effect(()=>{
  if(viewer!==game.host||busy||animating||!ready||renderedRevision!==game.revision||error||!connected||gathering||game.phase==='finished')return;
  const index=game.phase==='discard'?game.players.findIndex((p,i)=>p.bot&&game.discards[i]===null):game.turn;
  if(index<0||!game.players[index]?.bot)return;
  const intent=botIntent(game,index);if(!intent)return;
  const timer=setTimeout(()=>void act(intent,game.players[index].id),700);return()=>clearTimeout(timer);
 });
 function play(card:string){void act({type:game.phase==='discard'?'discard':'play',card});}
 async function copy(){try{await navigator.clipboard.writeText(invitation);}catch{error='Select the invitation to share it.';}}
</script>
<svelte:head><title>Cribbage</title><meta name="description" content="Pull up a chair. A shared wooden cribbage table for four."/></svelte:head>
<main data-e2e-layout data-ready={ready} data-phase={game.phase} data-revision={game.revision} data-round={game.round} aria-label="Cribbage table">
 <div class="table-scene"><TableView {game} {viewer} onReady={()=>ready=true} onMotion={moving=>animating=moving} onSettled={revision=>renderedRevision=revision} onCard={play}/></div>
 {#if gathering}
  <section class="gather" aria-label="Gathering" data-e2e-fit>
   <h1>Cribbage</h1>
   {#if !own&&game.players.length<4}
    <form onsubmit={event=>{event.preventDefault();void enter();}}>
     <label for="your-name" class="sr-only">Your name</label><input id="your-name" placeholder="Your name" bind:value={name} maxlength="24" autocomplete="nickname" disabled={busy}/>
     <button class="brass" type="submit" disabled={busy||!name.trim()||!viewer||!!room&&!connected}>Take a seat</button>
    </form>
   {:else if !own}<p>This table is full.</p>{/if}
   {#if own}
    <div class="invitation"><a href={invitation} aria-label="Invitation">{room}</a><button aria-label="Copy invitation" title="Copy invitation" onclick={copy}>↗</button></div>
    {#if game.players.length<4}<p>{4-game.players.length} {game.players.length===3?'chair':'chairs'} waiting</p>{/if}
    {#if viewer===game.host}
     {#if game.players.length<4}<button class="companion" onclick={()=>act({type:'invite-bot',id:`bot-${crypto.randomUUID()}`,name:['Alex','Rowan','Jules','Ada'][game.players.length]})} disabled={busy||animating} aria-label="Invite companion">＋ <span>Companion</span></button>{/if}
     {#if game.players.length===4}<button class="brass" onclick={()=>act({type:'begin',seed:crypto.randomUUID()})} disabled={busy||animating}>Deal</button>{/if}
    {/if}
   {/if}
  </section>
 {:else}
  <div class="sr-only"><p class="prompt" role="status" data-status={ready&&connected&&!busy&&!animating&&renderedRevision===game.revision?'synced':'waiting'}>{prompt}</p>{#if game.message&&game.message!==prompt&&game.phase!=='discard'&&game.phase!=='count'}<p class="last-play">{game.message}</p>{/if}</div>
  <div class="turn-action" class:arriving={animating} data-e2e-fit>
   {#if isTurn&&game.phase==='cut'}<button class="brass" onclick={()=>act({type:'cut'})} disabled={busy||animating}>Cut</button>
   {:else if isTurn&&game.phase==='pegging'&&legalCards(game,seat).length===0}<button class="brass" onclick={()=>act({type:'go'})} disabled={busy||animating}>Go</button>
   {:else if isTurn&&game.phase==='count'}<button class="brass" onclick={()=>act({type:'count'})} disabled={busy||animating}>Peg {countPoints}</button>
   {:else if isTurn&&game.phase==='between'}<button class="brass" onclick={()=>act({type:'deal'})} disabled={busy||animating}>Deal</button>
   {:else if game.phase==='finished'&&viewer===game.host}<button class="brass" onclick={()=>act({type:'begin',seed:crypto.randomUUID()})} disabled={busy||animating}>Play again</button>{/if}
  </div>
 {/if}
 {#if gathering}<span role="status" class="sr-only" data-status={ready&&connected&&!busy&&!animating&&renderedRevision===game.revision?'synced':'waiting'}>{prompt}</span>{/if}
 {#if error}<div class="error" role="alert">{error} <button onclick={async()=>{busy=true;try{if(!viewer){await initialize();}else{await repo?.retry();error='';}}catch(e){error=(e as Error).message;}finally{busy=false;}}}>Try again</button></div>{/if}
 <section class="sr-only" aria-label="Table details">
  <p data-testid="running-count">{game.total}</p><p data-testid="dealer">{game.players[game.dealer]?.name??''}</p>
  <p data-testid="turn">{game.players[game.turn]?.name??''}</p><p data-testid="crib-size">{game.discards.filter(Boolean).length}</p>
  {#each tablePlayers(game,viewer) as player}
   <section aria-label={`${player.name}'s area`} data-player={player.id} data-score={player.score} data-held={player.cards.length} data-lane={player.lane}>
    <h2>{player.name}</h2><p>{player.score} points</p><p>{player.cards.length} held</p>
    <ul aria-label="Held cards">{#each player.cards as card}<li>{player.id===viewer?cardName(card):'Face down'}</li>{/each}</ul>
    <ol aria-label="Played cards">{#each game.plays.filter(play=>play.seat===player.index) as play}<li>{cardName(play.card)}</li>{/each}</ol>
   </section>
  {/each}
  {#if game.cut}<p data-testid="starter">{cardName(game.cut)}</p>{/if}
  {#if game.phase==='count'&&game.countIndex===4}<ul aria-label="Crib cards">{#each game.crib as card}<li>{cardName(card)}</li>{/each}</ul>{/if}
 </section>
</main>
<style>
 :global(*){box-sizing:border-box}:global(body){margin:0;background:#0e1715;color:#ecdfc0;font-family:Georgia,serif}:global(button),:global(input){font:inherit}main{position:relative;width:100vw;height:100svh;overflow:hidden}.table-scene{position:absolute;inset:0}.gather{position:absolute;left:50%;top:43%;transform:translate(-50%,-50%);width:340px;max-width:90vw;text-align:center;padding:22px 24px;background:#12362ef2;border:1px solid #b89b6159;box-shadow:0 12px 40px #0005;border-radius:8px}h1{font-weight:400;font-size:42px;margin:0 0 22px;letter-spacing:2px}form{display:flex;flex-direction:column;gap:14px}input{min-height:44px;width:100%;background:#0d241e;border:1px solid #b89b6159;color:#f4e7cb;border-radius:3px;padding:10px;text-align:center;font-size:20px}button{cursor:pointer;color:#ead9b7;background:transparent;border:1px solid #b89b6159;border-radius:3px;padding:10px 18px;min-height:44px}button:disabled{opacity:.45;cursor:default}.brass{background:linear-gradient(#dfc393,#b69762);color:#30261b;border:1px solid #e1c58b;box-shadow:0 3px 8px #0005;font-size:20px;min-width:130px}.invitation{display:flex;justify-content:center;align-items:center;gap:12px}.invitation a{color:#e9d1a4;font-size:24px;letter-spacing:4px;text-decoration:none}.invitation button{border:0;font-size:24px;padding:0 10px}.companion{margin-top:8px}.companion span{font-size:16px}.gather p{font-size:16px;color:#c4c8b5}.prompt{font-size:22px;margin:0}.last-play{font-size:15px;color:#b2baa4;margin:10px 0}.turn-action{transition:opacity .18s,transform .18s;position:absolute;bottom:22px;left:50%;transform:translateX(-50%)}.turn-action.arriving{opacity:.25;transform:translateX(-50%) translateY(6px)}.error{position:absolute;top:100px;left:50%;transform:translateX(-50%);padding:12px;background:#3d241a;border:1px solid #bc9361;max-width:90vw}.error button{margin-left:12px}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}:global(button:focus-visible),:global(input:focus-visible),a:focus-visible{outline:2px solid #e4c585;outline-offset:4px}
</style>
