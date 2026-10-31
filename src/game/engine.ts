import {deck,rank,value,handScore,playScore,type Card} from './cards';
import {shuffle,createPrng} from './random';
export const VERSION=3;
export type Protocol=1|2|3;
export type Intent=
 |{type:'create';name:string}|{type:'join';name:string}|{type:'invite-bot';id:string;name:string}
 |{type:'begin';seed:string}|{type:'discard';card:Card}|{type:'cut'}|{type:'play';card:Card}
 |{type:'go'}|{type:'count'}|{type:'deal'}
 |{type:'undo-discard';card:Card}|{type:'accept-crib'}|{type:'auto-go';player:string};
export type Event={version:Protocol;id:string;actor:string;sequence:number;intent:Intent};
export type Player={id:string;name:string;bot:boolean;score:number;previous:number};
export type Phase='gathering'|'discard'|'cut'|'pegging'|'count'|'between'|'finished';
export type PendingDiscard={seat:number;card:Card;revision:number};
export type State={protocol:Protocol;revision:number;players:Player[];host:string;phase:Phase;seed:string;round:number;dealer:number;turn:number;hands:Card[][];kept:Card[][];discards:Card[][];pendingDiscards:PendingDiscard[];crib:Card[];cut:Card|null;stock:Card[];plays:{seat:number;card:Card}[];segment:Card[];passed:number[];total:number;last:number;countIndex:number;winner:number|null;message:string};
export function initialState(protocol:Protocol=VERSION):State{return {protocol,revision:0,players:[],host:'',phase:'gathering',seed:'',round:0,dealer:0,turn:0,hands:[[],[],[],[]],kept:[[],[],[],[]],discards:[[],[],[],[]],pendingDiscards:[],crib:[],cut:null,stock:[],plays:[],segment:[],passed:[],total:0,last:-1,countIndex:0,winner:null,message:''};}
const requireChoice=(condition:unknown,message:string)=>{if(!condition)throw new Error(message);};
const nameValid=(name:unknown)=>typeof name==='string'&&name.trim().length>0&&name.trim().length<=24;
/** Reject extra payload fields: computed cards, scores, totals and winners never enter the log. */
export function parseIntent(input:unknown):Intent{
 requireChoice(!!input&&typeof input==='object'&&!Array.isArray(input),'Choose an action.');
 const obj=input as Record<string,unknown>;
 const keys:Record<string,string[]>={create:['name'],join:['name'],'invite-bot':['id','name'],begin:['seed'],discard:['card'],'undo-discard':['card'],'accept-crib':[],'auto-go':['player'],cut:[],play:['card'],go:[],count:[],deal:[]};
 requireChoice(typeof obj.type==='string'&&Object.hasOwn(keys,obj.type),'Choose an action.');
 const fields=['type',...keys[obj.type as string]];
 requireChoice(Object.keys(obj).length===fields.length&&fields.every(key=>Object.hasOwn(obj,key)),'That action has unexpected details.');
 if('name'in obj)requireChoice(nameValid(obj.name),'Choose a name of 1–24 characters.');
 if('id'in obj)requireChoice(typeof obj.id==='string'&&/^bot-[\w-]{1,80}$/.test(obj.id),'Choose a companion.');
 if('player'in obj)requireChoice(typeof obj.player==='string'&&/^[\w-]{1,128}$/.test(obj.player),'Choose a player.');
 if('seed'in obj)requireChoice(typeof obj.seed==='string'&&obj.seed.length>0&&obj.seed.length<=96,'Shuffle again.');
 if('card'in obj)requireChoice(typeof obj.card==='string'&&deck.includes(obj.card),'Choose a card.');
 return obj as Intent;
}
function award(state:State,seat:number,points:number,label:string){
 if(!points)return;
 const player=state.players[seat];player.previous=player.score;player.score=Math.min(121,player.score+points);
 state.message=`${player.name} · ${label} · ${points} ${points===1?'point':'points'}`;
 if(player.score===121){state.winner=seat;state.phase='finished';state.message=`${player.name} wins`;}
}
export const handSize=(state:State)=>state.players.length===2?6:5;
export const needsDiscard=(state:State,seat:number)=>state.phase==='discard'&&(state.hands[seat]?.length??0)>4;
export const isCribCount=(state:State)=>state.countIndex===state.players.length;
export const cribCards=(state:State)=>state.protocol===1?state.discards.flat():state.crib;
function deal(state:State){
 const count=state.players.length,cards=shuffle(deck,`${state.seed}:deal:${state.round}`),dealt=count*handSize(state);
 state.hands=[[],[],[],[]];
 for(let i=0;i<dealt;i++)state.hands[(state.dealer+1+i)%count].push(cards[i]);
 state.kept=[[],[],[],[]];state.discards=[[],[],[],[]];state.pendingDiscards=[];state.crib=count===3?[cards[dealt]]:[];state.cut=null;state.stock=cards.slice(dealt+(count===3?1:0));state.plays=[];state.segment=[];state.passed=[];state.total=0;state.last=-1;state.countIndex=0;state.turn=(state.dealer+1)%count;state.phase='discard';state.message=count===2?'Choose two for the crib':'Choose one for the crib';
}
/** The next deterministic choice for fixtures/bots; UI deadlines stay outside replay. */
export function discardActor(state:State){const needing=state.players.findIndex((_,i)=>needsDiscard(state,i));return needing>=0?needing:state.pendingDiscards.length?state.players.findIndex(p=>p.id===state.host):-1;}
export const cribComplete=(state:State)=>state.phase==='discard'&&state.crib.length===4&&state.players.every((_,i)=>state.hands[i].length===4);
function readyCrib(state:State){
 if(state.players.every((_,i)=>state.hands[i].length===4)&&state.pendingDiscards.length===0){
  if(state.protocol===1)state.crib=state.discards.flat();state.phase='cut';state.turn=(state.dealer+1)%state.players.length;state.message='Cut the deck';
 }
}
export function legalCards(state:State,seat:number){return state.hands[seat].filter(card=>state.total+value(card)<=31);}
export const countOwner=(state:State)=>isCribCount(state)?state.dealer:(state.dealer+1+state.countIndex)%state.players.length;
function advance(state:State,from:number,reset=false){
 if(state.phase==='finished')return;
 if(!reset){
  for(let n=1;n<=state.players.length;n++){const next=(from+n)%state.players.length;if(state.hands[next].length&&!state.passed.includes(next)){state.turn=next;return;}}
  if(state.last>=0)award(state,state.last,1,'Last card');
  if(state.winner!==null)return;
 }
 state.total=0;state.segment=[];state.passed=[];
 if(state.hands.every(hand=>hand.length===0)){state.phase='count';state.countIndex=0;state.turn=(state.dealer+1)%state.players.length;return;}
 for(let n=1;n<=state.players.length;n++){const next=(from+n)%state.players.length;if(state.hands[next].length){state.turn=next;return;}}
}
export function apply(state:State,actor:string,input:Intent):State{
 const intent=parseIntent(input),next=structuredClone(state),seat=next.players.findIndex(p=>p.id===actor);
 requireChoice(/^[\w-]{1,128}$/.test(actor),'Take a seat.');
 if(intent.type==='create'||intent.type==='join'){
  requireChoice(next.phase==='gathering','The game has begun.');
  requireChoice(intent.type==='create'?next.players.length===0:next.players.length>0,'That table is not available.');
  requireChoice(seat<0&&next.players.length<4,'That seat is taken.');
  if(intent.type==='create')next.host=actor;
  next.players.push({id:actor,name:intent.name.trim(),bot:false,score:0,previous:-1});
 }else if(intent.type==='invite-bot'){
  requireChoice(actor===next.host&&next.phase==='gathering'&&next.players.length<4&&!next.players.some(p=>p.id===intent.id),'That seat is not available.');
  next.players.push({id:intent.id,name:intent.name.trim(),bot:true,score:0,previous:-1});
 }else if(intent.type==='begin'){
  requireChoice(actor===next.host&&next.players.length>=(next.protocol===1?4:2)&&next.players.length<=4&&(next.phase==='gathering'||next.phase==='finished'),'Wait for everyone to take a seat.');
  next.seed=intent.seed;next.round=0;next.dealer=Math.floor(createPrng(`${intent.seed}:dealer`)()*next.players.length);next.winner=null;
  next.players.forEach(p=>{p.score=0;p.previous=-1;});deal(next);
 }else{
  requireChoice(seat>=0,'Take a seat.');
  if(intent.type==='discard'){
   requireChoice(needsDiscard(next,seat)&&next.hands[seat].includes(intent.card),'Choose one card for the crib.');
   next.hands[seat]=next.hands[seat].filter(card=>card!==intent.card);next.discards[seat].push(intent.card);
   if(next.hands[seat].length===4)next.kept[seat]=[...next.hands[seat]];
   if(next.protocol>=2)next.crib.push(intent.card);
   if(next.protocol===3)next.pendingDiscards.push({seat,card:intent.card,revision:state.revision+1});
   readyCrib(next);
  }else if(intent.type==='undo-discard'){
   const pending=next.pendingDiscards.find(p=>p.card===intent.card&&p.seat===seat);
   requireChoice(next.protocol===3&&next.phase==='discard'&&pending,'That contribution is already in the crib.');
   next.pendingDiscards=next.pendingDiscards.filter(p=>p!==pending);next.discards[seat]=next.discards[seat].filter(card=>card!==intent.card);next.crib=next.crib.filter(card=>card!==intent.card);
   const order=shuffle(deck,`${next.seed}:deal:${next.round}`).filter((_,i)=>i<next.players.length*handSize(next)&&(next.dealer+1+i)%next.players.length===seat);
   next.hands[seat].push(intent.card);next.hands[seat].sort((a,b)=>order.indexOf(a)-order.indexOf(b));next.kept[seat]=next.hands[seat].length===4?[...next.hands[seat]]:[];
  }else if(intent.type==='accept-crib'){
   requireChoice(next.protocol===3&&cribComplete(next)&&next.pendingDiscards.length>0,'The crib is not ready.');
   next.pendingDiscards=[];readyCrib(next);
  }else if(intent.type==='cut'){
   requireChoice(next.phase==='cut'&&seat===next.turn,'Wait for the cut.');
   next.cut=next.stock[0];next.stock=next.stock.slice(1);next.phase='pegging';next.message='Play a card';
   if(rank(next.cut)===11)award(next,next.dealer,2,'His heels');
  }else if(intent.type==='play'){
   requireChoice(next.phase==='pegging'&&seat===next.turn&&legalCards(next,seat).includes(intent.card),'Choose a card that keeps the count at 31 or less.');
   const points=playScore(next.segment,intent.card);
   next.hands[seat]=next.hands[seat].filter(card=>card!==intent.card);next.plays.push({seat,card:intent.card});next.segment.push(intent.card);next.total+=value(intent.card);next.last=seat;next.message=`${next.players[seat].name} · ${next.total}`;
   award(next,seat,points,`${next.total}`);
   if(next.phase!=='finished')advance(next,seat,next.total===31);
  }else if(intent.type==='go'||intent.type==='auto-go'){
   const passing=intent.type==='go'?seat:next.turn;
   if(intent.type==='auto-go')requireChoice(next.protocol===3&&actor===next.host&&next.players[passing]?.id===intent.player,'Wait for that player.');
   requireChoice(next.phase==='pegging'&&passing===next.turn&&legalCards(next,passing).length===0,'You can still play.');
   next.passed.push(passing);next.message=`${next.players[passing].name} · Go`;advance(next,passing);
  }else if(intent.type==='count'){
   requireChoice(next.phase==='count'&&seat===countOwner(next),'Wait for your hand.');
   const crib=isCribCount(next),points=handScore(crib?next.crib:next.kept[seat],next.cut!,crib);
   next.message=`${next.players[seat].name} · ${crib?'Crib':'Hand'} · ${points} points`;award(next,seat,points,crib?'Crib':'Hand');
   if(next.phase!=='finished'){next.countIndex++;if(next.countIndex===next.players.length+1){next.phase='between';next.turn=next.dealer;}else next.turn=countOwner(next);}
  }else if(intent.type==='deal'){
   requireChoice(next.phase==='between'&&seat===next.dealer,'Wait for the dealer.');
   next.round++;next.dealer=(next.dealer+1)%next.players.length;deal(next);
  }
 }
 next.revision++;return next;
}
export function replay(events:readonly Event[],visit?:(before:State,after:State,event:Event)=>void):State{
 const protocol=events[0]?.version??VERSION;requireChoice([1,2,3].includes(protocol),'This table needs a newer version.');
 let state=initialState(protocol);const seen=new Set<string>();
 for(const event of events){
  requireChoice(event.version===state.protocol&&event.sequence===state.revision+1&&!seen.has(event.id),'This table needs a newer version.');
  seen.add(event.id);const before=state;state=apply(state,event.actor,event.intent);visit?.(before,state,event);
 }
 return state;
}
