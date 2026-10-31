<script lang="ts">
 import {preferences,settingsOpen} from './settings';
 import {onMount,untrack} from 'svelte';
 import TableView from './TableView.svelte';
 import {initialState,legalCards,needsDiscard,isCribCount,cribCards,type State,type Event,type Intent} from './game/engine';
 import {repository,playerIdentity} from './game/repository';
 import {botIntent} from './game/bot';
 import {cardName} from './game/cards';
 import {tablePlayers} from './game/layout';
 import {replayTable} from './presentation/replay';
 import {statusFor} from './presentation/frame';
 import {BOT_DELAY_MS,TableClock,countdownAction,automaticChoice,automaticIntent,intentForAction,type Windows} from './game/countdowns';
 let game=$state<State>(initialState()),viewer=$state(''),room=$state(''),name=$state(''),busy=$state(false),error=$state(''),ready=$state(false),animating=$state(false),renderedRevision=$state(-1),connected=$state(false),copied=$state(false);
 let pegOrigins=$state<Record<string,number>>({});
 let now=$state(Date.now()),windows=$state.raw<Windows>({discards:[]});
 let clock:TableClock|undefined,clockKey='';const autoAttempts=new Map<string,number>();
 const choiceAction=$derived.by(()=>{const action=countdownAction(game,viewer,windows,Math.max(now,Date.now()),busy||!connected||!ready);return action?{...action,disabled:action.disabled||action.kind!=='undo'&&animating}:undefined;});
 let repo:ReturnType<typeof repository>|undefined;
 const seat=$derived(game.players.findIndex(p=>p.id===viewer));
 const own=$derived(seat>=0?game.players[seat]:undefined);
 const gathering=$derived(game.phase==='gathering');
 const invitation=$derived(typeof location==='undefined'?'':`${location.origin}${import.meta.env.BASE_URL}?table=${room}`);
 const tableStatus=$derived(statusFor(game,viewer,pegOrigins));
 const prompt=$derived(gathering?(own?'':'Take a seat'):tableStatus.primary);
 async function initialize(){
  try{viewer=await playerIdentity();error='';name=localStorage.getItem('cribbage:name')??'';
   const code=new URLSearchParams(location.search).get('table');if(code&&/^[A-Z0-9]{5,8}$/.test(code))room=code;
  }catch{error='Couldn’t reach the table. Try again.';}
 }
 onMount(()=>{void initialize();const ticker=setInterval(()=>now=Date.now(),100);return()=>clearInterval(ticker);});
 $effect(()=>{
  const state=game,key=`cribbage:choice-windows:${import.meta.env.BASE_URL}:${room}:${viewer}`,stamp=Math.max(now,Date.now()),goReady=ready&&!animating&&renderedRevision===game.revision,autoMs=$settingsOpen?null:$preferences.autoSeconds===null?null:$preferences.autoSeconds*1000;
  if(!room||!viewer||!connected)return;
  untrack(()=>{if(key!==clockKey){clockKey=key;clock=new TableClock(localStorage,key);}windows=clock!.observe(state,stamp,goReady,autoMs);});
 });
 $effect(()=>{
  const state=game,active=windows,stamp=Math.max(now,Date.now()),id=viewer,dialog=$settingsOpen,settled=!animating&&renderedRevision===game.revision;
  if(!connected||busy||!ready||error||gathering||game.phase==='finished')return;
  untrack(()=>{const choice=automaticChoice(state,id,active,stamp);if(!choice||choice.intent.type!=='accept-crib'&&(!settled||dialog&&choice.actor===id))return;const last=autoAttempts.get(choice.key)??-Infinity;if(performance.now()-last<300)return;autoAttempts.set(choice.key,performance.now());void act(choice.intent,choice.actor,true);});
 });
 $effect(()=>{
  if(!room||!viewer)return;
  connected=false;
  repo=repository(room,(events:Event[])=>{({game,pegOrigins}=replayTable(events));connected=true;error='';},message=>{connected=false;error=message;});
  return()=>repo?.close();
 });
 async function act(intent:Intent,actor=viewer,automatic=false){
  if(busy||animating&&!automatic&&intent.type!=='undo-discard'||!repo)return;busy=true;error='';
  try{await repo.append(actor,intent);}catch(e){const message=(e as Error).message;if(!automatic||!['The table changed. Try again.','That contribution is no longer waiting.','The crib is not ready.','You can still play.','Finish your last action first.'].includes(message))error=message;}finally{busy=false;}
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
  const index=game.phase==='discard'?game.players.findIndex((p,i)=>p.bot&&needsDiscard(game,i)):game.turn;
  if(index<0||!game.players[index]?.bot)return;
  const intent=botIntent(game,index);if(!intent||intent.type==='accept-crib'||intent.type===automaticIntent(game)?.type)return;
  const timer=setTimeout(()=>void act(intent,game.players[index].id),BOT_DELAY_MS);return()=>clearTimeout(timer);
 });
 function chooseAction(){const intent=intentForAction(choiceAction);if(intent)void act(intent);}
 function play(card:string){void act({type:game.phase==='discard'?'discard':'play',card});}
 async function copy(){try{await navigator.clipboard.writeText(invitation);copied=true;}catch{error='Select the invitation to share it.';}}
</script>
<svelte:head><title>Cribbage</title><meta name="description" content="Pull up a chair. A shared wooden cribbage table for two, three or four."/></svelte:head>
<main data-e2e-layout data-busy={busy} data-connected={connected} data-animating={animating} data-settled-revision={renderedRevision} data-ready={ready} data-phase={game.phase} data-revision={game.revision} data-round={game.round} aria-label="Cribbage table">
 <div class="table-scene"><TableView {game} {viewer} {pegOrigins} action={choiceAction} onAction={chooseAction} onReady={()=>ready=true} onMotion={moving=>animating=moving} onSettled={revision=>renderedRevision=revision} onCard={play}/></div>
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
    <div class="invitation"><a href={invitation} aria-label="Invitation">{room}</a><button onclick={copy} aria-live="polite">{copied?'Link copied':'Copy invite link'}</button></div>
    {#if game.players.length<4}<p>{game.players.length===1?'3 chairs waiting':`${game.players.length} at the table`}</p>{/if}
    {#if viewer===game.host}
    <div class="gather-actions">
     {#if game.players.length<4}<button class="companion" onclick={()=>act({type:'invite-bot',id:`bot-${crypto.randomUUID()}`,name:['Alex','Rowan','Jules','Ada'][game.players.length]})} disabled={busy||animating} aria-label="Invite companion">＋ <span>Companion</span></button>{/if}
     {#if game.players.length>=(game.protocol===1?4:2)}<button class="brass" onclick={()=>act({type:'begin',seed:crypto.randomUUID()})} disabled={busy||animating}>Deal</button>{/if}
    </div>
    {/if}
   {/if}
  </section>
 {:else}
  <div class="sr-only"><p class="prompt" role="status" data-status={ready&&connected&&!busy&&!animating&&renderedRevision===game.revision?'synced':'waiting'}>{prompt}</p>{#if tableStatus.secondary}<p class="last-play">{tableStatus.secondary}</p>{/if}</div>
  <div class="turn-action" class:arriving={animating} data-e2e-fit>
   {#if game.phase==='finished'&&viewer===game.host}<button class="brass" onclick={()=>act({type:'begin',seed:crypto.randomUUID()})} disabled={busy||animating}>Play again</button>{/if}
  </div>
 {/if}
 {#if gathering}<span role="status" class="sr-only" data-status={ready&&connected&&!busy&&!animating&&renderedRevision===game.revision?'synced':'waiting'}>{prompt}</span>{/if}
 {#if error}<div class="error" role="alert">{error} <button onclick={async()=>{busy=true;try{if(!viewer){await initialize();}else{await repo?.retry();error='';}}catch(e){error=(e as Error).message;}finally{busy=false;}}}>Try again</button></div>{/if}
 <section class="sr-only" aria-label="Table details">
  <p data-testid="running-count">{game.total}</p><p data-testid="dealer">{game.players[game.dealer]?.name??''}</p>
  <p data-testid="turn">{game.players[game.turn]?.name??''}</p><p data-testid="crib-size">{cribCards(game).length}</p>
  {#each tablePlayers(game,viewer) as player}
   <section aria-label={`${player.name}'s area`} data-player={player.id} data-score={player.score} data-held={player.cards.length} data-lane={player.lane}>
    <h2>{player.name}</h2><p>{player.score} points</p><p>{player.cards.length} held</p>
    <ul aria-label="Held cards">{#each player.cards as card}<li>{player.id===viewer?cardName(card):'Face down'}</li>{/each}</ul>
    <ol aria-label="Played cards">{#each game.plays.filter(play=>play.seat===player.index) as play}<li>{cardName(play.card)}</li>{/each}</ol>
   </section>
  {/each}
  {#if game.cut}<p data-testid="starter">{cardName(game.cut)}</p>{/if}
  {#if game.phase==='count'&&isCribCount(game)}<ul aria-label="Crib cards">{#each game.crib as card}<li>{cardName(card)}</li>{/each}</ul>{/if}
 </section>
</main>
<style>
 :global(*){box-sizing:border-box}:global(body){margin:0;background:#0e1715;color:#ecdfc0;font-family:Georgia,serif}:global(button),:global(input){font:inherit}main{position:relative;width:100vw;height:100svh;overflow:hidden}.table-scene{position:absolute;inset:0}.gather{position:absolute;left:50%;top:43%;transform:translate(-50%,-50%);width:340px;max-width:90vw;text-align:center;padding:22px 24px;background:#12362ef2;border:1px solid #b89b6159;box-shadow:0 12px 40px #0005;border-radius:8px}h1{font-weight:400;font-size:42px;margin:0 0 22px;letter-spacing:2px}form{display:flex;flex-direction:column;gap:14px}input{min-height:44px;width:100%;background:#0d241e;border:1px solid #b89b6159;color:#f4e7cb;border-radius:3px;padding:10px;text-align:center;font-size:20px}button{cursor:pointer;color:#ead9b7;background:transparent;border:1px solid #b89b6159;border-radius:3px;padding:10px 18px;min-height:44px}button:disabled{opacity:.45;cursor:default}.brass{background:linear-gradient(#dfc393,#b69762);color:#30261b;border:1px solid #e1c58b;box-shadow:0 3px 8px #0005;font-size:20px;min-width:130px}.invitation{display:flex;justify-content:center;align-items:center;gap:12px}.invitation a{color:#e9d1a4;font-size:24px;letter-spacing:4px;text-decoration:none}.invitation button{font-size:15px;padding:8px 12px;min-width:132px}.gather-actions{display:flex;gap:10px;margin-top:16px;justify-content:center}.gather-actions button{min-width:0;flex:1;font-size:17px;padding:10px}.companion{margin-top:0}.companion span{font-size:16px}.gather p{font-size:16px;color:#c4c8b5}.prompt{font-size:22px;margin:0}.last-play{font-size:15px;color:#b2baa4;margin:10px 0}.turn-action{transition:opacity .18s,transform .18s;position:absolute;bottom:22px;left:50%;transform:translateX(-50%)}.turn-action.arriving{opacity:.25;transform:translateX(-50%) translateY(6px)}.error{position:absolute;top:100px;left:50%;transform:translateX(-50%);padding:12px;background:#3d241a;border:1px solid #bc9361;max-width:90vw}.error button{margin-left:12px}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}:global(button:focus-visible),:global(input:focus-visible),a:focus-visible{outline:2px solid #e4c585;outline-offset:4px}
</style>
