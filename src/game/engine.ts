import {deck,rank,value,handScore,playScore,type Card} from './cards';
import {shuffle,createPrng} from './random';
export const VERSION=1;
export type Intent=
 |{type:'create';name:string}|{type:'join';name:string}|{type:'invite-bot';id:string;name:string}
 |{type:'begin';seed:string}|{type:'discard';card:Card}|{type:'cut'}|{type:'play';card:Card}
 |{type:'go'}|{type:'count'}|{type:'deal'};
export type Event={version:1;id:string;actor:string;sequence:number;intent:Intent};
export type Player={id:string;name:string;bot:boolean;score:number;previous:number};
export type Phase='gathering'|'discard'|'cut'|'pegging'|'count'|'between'|'finished';
export type State={revision:number;players:Player[];host:string;phase:Phase;seed:string;round:number;dealer:number;turn:number;hands:Card[][];kept:Card[][];discards:(Card|null)[];crib:Card[];cut:Card|null;stock:Card[];plays:{seat:number;card:Card}[];segment:Card[];passed:number[];total:number;last:number;countIndex:number;winner:number|null;message:string};
export function initialState():State{return {revision:0,players:[],host:'',phase:'gathering',seed:'',round:0,dealer:0,turn:0,hands:[[],[],[],[]],kept:[[],[],[],[]],discards:[null,null,null,null],crib:[],cut:null,stock:[],plays:[],segment:[],passed:[],total:0,last:-1,countIndex:0,winner:null,message:''};}
const requireChoice=(condition:unknown,message:string)=>{if(!condition)throw new Error(message);};
const nameValid=(name:unknown)=>typeof name==='string'&&name.trim().length>0&&name.trim().length<=24;
/** Reject extra payload fields: computed cards, scores, totals and winners never enter the log. */
export function parseIntent(input:unknown):Intent{
 requireChoice(!!input&&typeof input==='object'&&!Array.isArray(input),'Choose an action.');
 const obj=input as Record<string,unknown>;
 const keys:Record<string,string[]>={create:['name'],join:['name'],'invite-bot':['id','name'],begin:['seed'],discard:['card'],cut:[],play:['card'],go:[],count:[],deal:[]};
 requireChoice(typeof obj.type==='string'&&Object.hasOwn(keys,obj.type),'Choose an action.');
 const fields=['type',...keys[obj.type as string]];
 requireChoice(Object.keys(obj).length===fields.length&&fields.every(key=>Object.hasOwn(obj,key)),'That action has unexpected details.');
 if('name'in obj)requireChoice(nameValid(obj.name),'Choose a name of 1–24 characters.');
 if('id'in obj)requireChoice(typeof obj.id==='string'&&/^bot-[\w-]{1,80}$/.test(obj.id),'Choose a companion.');
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
function deal(state:State){
 const cards=shuffle(deck,`${state.seed}:deal:${state.round}`);
 state.hands=[[],[],[],[]];
 for(let i=0;i<20;i++)state.hands[(state.dealer+1+i)%4].push(cards[i]);
 state.kept=[[],[],[],[]];state.discards=[null,null,null,null];state.crib=[];state.cut=null;state.stock=cards.slice(20);state.plays=[];state.segment=[];state.passed=[];state.total=0;state.last=-1;state.countIndex=0;state.turn=(state.dealer+1)%4;state.phase='discard';state.message='Choose one for the crib';
}
export function legalCards(state:State,seat:number){return state.hands[seat].filter(card=>state.total+value(card)<=31);}
export const countOwner=(state:State)=>state.countIndex===4?state.dealer:(state.dealer+1+state.countIndex)%4;
function advance(state:State,from:number,reset=false){
 if(state.phase==='finished')return;
 if(!reset){
  for(let n=1;n<=4;n++){const next=(from+n)%4;if(state.hands[next].length&&!state.passed.includes(next)){state.turn=next;return;}}
  if(state.last>=0)award(state,state.last,1,'Last card');
  if(state.winner!==null)return;
 }
 state.total=0;state.segment=[];state.passed=[];
 if(state.hands.every(hand=>hand.length===0)){state.phase='count';state.countIndex=0;state.turn=(state.dealer+1)%4;return;}
 for(let n=1;n<=4;n++){const next=(from+n)%4;if(state.hands[next].length){state.turn=next;return;}}
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
  requireChoice(actor===next.host&&next.players.length===4&&(next.phase==='gathering'||next.phase==='finished'),'Wait for everyone to take a seat.');
  next.seed=intent.seed;next.round=0;next.dealer=Math.floor(createPrng(`${intent.seed}:dealer`)()*4);next.winner=null;
  next.players.forEach(p=>{p.score=0;p.previous=-1;});deal(next);
 }else{
  requireChoice(seat>=0,'Take a seat.');
  if(intent.type==='discard'){
   requireChoice(next.phase==='discard'&&next.discards[seat]===null&&next.hands[seat].includes(intent.card),'Choose one card for the crib.');
   next.hands[seat]=next.hands[seat].filter(card=>card!==intent.card);next.kept[seat]=[...next.hands[seat]];next.discards[seat]=intent.card;
   if(next.discards.every(Boolean)){next.crib=next.discards as Card[];next.phase='cut';next.turn=(next.dealer+1)%4;next.message='Cut the deck';}
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
  }else if(intent.type==='go'){
   requireChoice(next.phase==='pegging'&&seat===next.turn&&legalCards(next,seat).length===0,'You can still play.');
   next.passed.push(seat);next.message=`${next.players[seat].name} · Go`;advance(next,seat);
  }else if(intent.type==='count'){
   requireChoice(next.phase==='count'&&seat===countOwner(next),'Wait for your hand.');
   const crib=next.countIndex===4,points=handScore(crib?next.crib:next.kept[seat],next.cut!,crib);
   next.message=`${next.players[seat].name} · ${crib?'Crib':'Hand'} · ${points} points`;award(next,seat,points,crib?'Crib':'Hand');
   if(next.phase!=='finished'){next.countIndex++;if(next.countIndex===5){next.phase='between';next.turn=next.dealer;}else next.turn=countOwner(next);}
  }else if(intent.type==='deal'){
   requireChoice(next.phase==='between'&&seat===next.dealer,'Wait for the dealer.');
   next.round++;next.dealer=(next.dealer+1)%4;deal(next);
  }
 }
 next.revision++;return next;
}
export function replay(events:readonly Event[]):State{
 let state=initialState();const seen=new Set<string>();
 for(const event of events){
  requireChoice(event.version===VERSION&&event.sequence===state.revision+1&&!seen.has(event.id),'This table needs a newer version.');
  seen.add(event.id);state=apply(state,event.actor,event.intent);
 }
 return state;
}
