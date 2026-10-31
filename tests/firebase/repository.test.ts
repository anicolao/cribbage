import {beforeAll,afterAll,test,expect} from 'bun:test';
import {initializeTestEnvironment,assertFails,type RulesTestEnvironment} from '@firebase/rules-unit-testing';
import {readFileSync} from 'node:fs';
import {doc,getDoc,getDocs,collection,writeBatch,deleteDoc,setDoc,type Firestore} from 'firebase/firestore';
import {appendFirestore,watchFirestore,tableRef} from '../../src/game/firestore';
import {initialState,apply,replay,VERSION,needsDiscard,type Event,type Intent} from '../../src/game/engine';
import {botIntent} from '../../src/game/bot';
let env:RulesTestEnvironment;
beforeAll(async()=>{
 if(!process.env.FIRESTORE_EMULATOR_HOST)throw new Error('Run with the Firestore emulator.');
 env=await initializeTestEnvironment({projectId:'demo-cribbage',firestore:{host:'127.0.0.1',port:8197,rules:readFileSync('firestore.rules','utf8')}});
});
afterAll(async()=>{await env?.cleanup();});
const db=(uid:string)=>env.authenticatedContext(uid).firestore() as unknown as Firestore;
test('four Firebase clients gather, play and count one hand; observers replay every committed intent',async()=>{
 const clients=[0,1,2,3].map(i=>db(`p${i}`)),views:Event[][]=[[],[],[],[]],failures:string[]=[],waiters:{revision:number;resolve:()=>void}[]=[];
 const stops=clients.map((client,i)=>watchFirestore(client,'pr3','FIRE1',events=>{views[i]=events;for(const waiter of waiters)if(views.every(v=>v.length>=waiter.revision))waiter.resolve();},()=>failures.push('subscription')));
 let state=initialState();
 async function act(seat:number,intent:Intent){
  const pending={id:`event-${state.revision+1}`,actor:`p${seat}`,expectedRevision:state.revision,intent};
  await appendFirestore(clients[seat],'pr3','FIRE1',`p${seat}`,pending,views[seat]);state=apply(state,`p${seat}`,intent);
  if(!views.every(v=>v.length===state.revision))await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Observers did not receive the committed intent')),5000);waiters.push({revision:state.revision,resolve:()=>{clearTimeout(timer);resolve();}});});
  expect(failures).toEqual([]);for(const events of views)expect(replay(events)).toEqual(state);
 }
 try{
  await act(0,{type:'create',name:'Alex'});for(let i=1;i<4;i++)await act(i,{type:'join',name:['Alex','Rowan','Jules','Ada'][i]});
  const retry={id:'event-4',actor:'p3',expectedRevision:3,intent:{type:'join',name:'Ada'} as Intent};
  await appendFirestore(clients[3],'pr3','FIRE1','p3',retry);
  await appendFirestore(clients[3],'pr3','FIRE1','p3',{...retry,intent:{name:'Ada',type:'join'}});
  expect((await getDocs(collection(tableRef(clients[0],'pr3','FIRE1'),'events'))).size).toBe(4);
  await expect(appendFirestore(clients[3],'pr3','FIRE1','p3',{...retry,intent:{type:'join',name:'Changed'}})).rejects.toThrow('already been used');
  await expect(appendFirestore(clients[0],'pr3','FIRE1','p0',{id:'stale',actor:'p0',expectedRevision:3,intent:{type:'begin',seed:'x'}})).rejects.toThrow('table changed');
  await act(0,{type:'begin',seed:'firebase-full-hand'});
  for(let i=0;i<4;i++)await act(i,botIntent(state,i)!);
  await act(state.turn,{type:'cut'});
  let turns=0;while(state.phase==='pegging'&&turns++<40)await act(state.turn,botIntent(state,state.turn)!);
  expect(state.phase).toBe('count');expect(state.plays.length).toBe(16);
  for(let i=0;i<5;i++)await act(state.turn,{type:'count'});
  expect(state.phase).toBe('between');await act(state.turn,{type:'deal'});expect(state.round).toBe(1);
  const log=(await getDocs(collection(tableRef(clients[0],'pr3','FIRE1'),'events'))).docs.map(row=>row.data() as Event).sort((a,b)=>a.sequence-b.sequence);
  expect(replay(log)).toEqual(state);expect(log.every(e=>Object.keys(e).sort().join(',')==='actor,id,intent,sequence,version')).toBe(true);
 }finally{stops.forEach(stop=>stop());}
},60_000);
test('rules reject unauthenticated access, actor spoofing, computed outcomes and mutable logs',async()=>{
 const owner=db('owner'),other=db('other'),root=tableRef(owner,'rules','RULE1');
 await appendFirestore(owner,'rules','RULE1','owner',{id:'create',actor:'owner',expectedRevision:0,intent:{type:'create',name:'Owner'}});
 const stranger=env.unauthenticatedContext().firestore() as unknown as Firestore;
 await assertFails(getDoc(tableRef(stranger,'rules','RULE1')));
 await assertFails(setDoc(doc(root,'events','1'),{version:VERSION,id:'altered',sequence:1,actor:'owner',intent:{type:'create',name:'Replaced'}}));
 await assertFails(deleteDoc(doc(root,'events','1')));
 async function forged(actor:string,intent:unknown,client=owner){
  const target=tableRef(client,'rules','RULE1'),batch=writeBatch(client);
  batch.set(target,{owner:'owner',members:['owner'],bots:[],revision:2});
  batch.set(doc(target,'events','2'),{version:VERSION,id:'forged',sequence:2,actor,intent});batch.set(doc(target,'commands','forged'),{sequence:2});await assertFails(batch.commit());
 }
 await forged('owner',{type:'play',card:'ace_of_clubs',score:121});
 await forged('owner',{type:'begin',seed:'x',hands:[]});
 await forged('owner',{type:'go'},other);
 await forged('bot-not-invited',{type:'go'});
 expect((await getDoc(root)).data()?.revision).toBe(1);
});
test('preview namespaces and simultaneous joins remain isolated and serialized',async()=>{
 const owner=db('host'),a=db('join-a'),b=db('join-b');
 await appendFirestore(owner,'pr3','RACE1','host',{id:'start',actor:'host',expectedRevision:0,intent:{type:'create',name:'Host'}});
 const race=await Promise.allSettled([appendFirestore(a,'pr3','RACE1','join-a',{id:'a',actor:'join-a',expectedRevision:1,intent:{type:'join',name:'A'}}),appendFirestore(b,'pr3','RACE1','join-b',{id:'b',actor:'join-b',expectedRevision:1,intent:{type:'join',name:'B'}})]);
 expect(race.filter(r=>r.status==='fulfilled').length).toBe(1);
 await appendFirestore(owner,'pr4','RACE1','host',{id:'another',actor:'host',expectedRevision:0,intent:{type:'create',name:'Other table'}});
 expect((await getDoc(tableRef(owner,'pr3','RACE1'))).data()?.revision).toBe(2);expect((await getDoc(tableRef(owner,'pr4','RACE1'))).data()?.revision).toBe(1);
});

test('only the host can invite and play companion seats',async()=>{
 const host=db('captain'),friend=db('friend');let state=initialState(),n=0;
 async function act(actor:string,intent:Intent,client=host,uid='captain'){
  await appendFirestore(client,'bots','BOTS1',uid,{id:`bot-action-${++n}`,actor,expectedRevision:state.revision,intent});state=apply(state,actor,intent);
 }
 await act('captain',{type:'create',name:'Captain'});
 await act('captain',{type:'invite-bot',id:'bot-a',name:'Rowan'});
 await act('captain',{type:'invite-bot',id:'bot-b',name:'Jules'});
 await act('friend',{type:'join',name:'Friend'},friend,'friend');
 await act('captain',{type:'begin',seed:'companion-seats'});
 await act('bot-a',botIntent(state,1)!);
 await expect(appendFirestore(friend,'bots','BOTS1','friend',{id:'spoof-bot',actor:'bot-b',expectedRevision:state.revision,intent:botIntent(state,2)!})).rejects.toThrow('own seat');
 const root=tableRef(friend,'bots','BOTS1'),batch=writeBatch(friend),sequence=state.revision+1;
 batch.set(root,{owner:'captain',members:state.players.map(p=>p.id),bots:['bot-a','bot-b'],revision:sequence});
 batch.set(doc(root,'events',String(sequence)),{version:VERSION,id:'spoof-direct',sequence,actor:'bot-b',intent:botIntent(state,2)!});batch.set(doc(root,'commands','spoof-direct'),{sequence});
 await assertFails(batch.commit());
 expect((await getDoc(root)).data()?.revision).toBe(state.revision);
});

for(const count of [2,3])test(`${count} Firebase players start early, complete a hand and crib, and rotate the deal`,async()=>{
 const scope=`small-${count}`,room=`SMALL${count}`,clients=Array.from({length:count},(_,i)=>db(`small-${count}-${i}`)),ids=clients.map((_,i)=>`small-${count}-${i}`);let state=initialState(),events:Event[]=[];
 async function act(seat:number,intent:Intent){
  await appendFirestore(clients[seat],scope,room,ids[seat],{id:`small-${state.revision+1}`,actor:ids[seat],expectedRevision:state.revision,intent},events);
  state=apply(state,ids[seat],intent);
  events=(await getDocs(collection(tableRef(clients[0],scope,room),'events'))).docs.map(r=>r.data() as Event).sort((a,b)=>a.sequence-b.sequence);
  expect(events.every(e=>e.version===VERSION)).toBe(true);expect(replay(events)).toEqual(state);
 }
 await act(0,{type:'create',name:'Alex'});for(let i=1;i<count;i++)await act(i,{type:'join',name:`Friend ${i}`});
 await expect(appendFirestore(clients[1],scope,room,ids[1],{id:'guest-start',actor:ids[1],expectedRevision:state.revision,intent:{type:'begin',seed:'guest'}})).rejects.toThrow();
 await act(0,{type:'begin',seed:`firebase-${count}-players`});
 expect(state.crib).toHaveLength(count===3?1:0);
 let actions=0;
 while(state.phase!=='between'&&actions++<60){const seat=state.phase==='discard'?state.players.findIndex((_,i)=>needsDiscard(state,i)):state.turn;await act(seat,botIntent(state,seat)!);}
 expect(state.phase).toBe('between');expect(state.plays).toHaveLength(count*4);expect(state.crib).toHaveLength(4);
 const dealer=state.dealer;await act(state.turn,{type:'deal'});expect(state.dealer).toBe((dealer+1)%count);expect(state.round).toBe(1);
},60_000);

test('existing v1 tables retain v1 append semantics and rules reject mixed-version logs',async()=>{
 const legacy=(await import('../fixtures/v1-hand.json')).default.events as Event[],scope='legacy',room='OLDV1',client=db('p0');
 await env.withSecurityRulesDisabled(async context=>{
  const root=tableRef(context.firestore() as unknown as Firestore,scope,room),batch=writeBatch(context.firestore() as unknown as Firestore);
  batch.set(root,{owner:'p0',members:['p0','p1','p2','p3'],bots:[],revision:legacy.length});
  for(const e of legacy){batch.set(doc(root,'events',String(e.sequence)),e);batch.set(doc(root,'commands',e.id),{sequence:e.sequence});}
  await batch.commit();
 });
 const state=replay(legacy),intent:Intent={type:'discard',card:state.hands[0][0]};
 await appendFirestore(client,scope,room,'p0',{id:'continue-legacy',actor:'p0',expectedRevision:legacy.length,intent},legacy);
 const root=tableRef(client,scope,room),saved=(await getDoc(doc(root,'events',String(legacy.length+1)))).data() as Event;
 expect(saved.version).toBe(1);expect(saved.intent).toEqual(intent);
 const revision=legacy.length+2,batch=writeBatch(client);
 batch.set(root,{owner:'p0',members:['p0','p1','p2','p3'],bots:[],revision});
 batch.set(doc(root,'events',String(revision)),{version:2,id:'mixed-version',sequence:revision,actor:'p0',intent:{type:'go'}});
 batch.set(doc(root,'commands','mixed-version'),{sequence:revision});await assertFails(batch.commit());
});

test('v1 hosts can still start with four, but neither client nor rules can start a v1 table with two',async()=>{
 const fixture=(await import('../fixtures/v1-hand.json')).default.events as Event[],client=db('p0');
 for(const count of [2,4]){
  const room=`V1BEGIN${count}`,prefix=fixture.slice(0,count);
  await env.withSecurityRulesDisabled(async context=>{
   const store=context.firestore() as unknown as Firestore,root=tableRef(store,'v1-start',room),batch=writeBatch(store);
   batch.set(root,{owner:'p0',members:prefix.map(e=>e.actor),bots:[],revision:count});
   for(const e of prefix){batch.set(doc(root,'events',String(e.sequence)),e);batch.set(doc(root,'commands',e.id),{sequence:e.sequence});}await batch.commit();
  });
  const intent:Intent={type:'begin',seed:'legacy-start'};
  if(count===4){
   await appendFirestore(client,'v1-start',room,'p0',{id:'legacy-deal',actor:'p0',expectedRevision:4,intent},prefix);
   expect((await getDoc(doc(tableRef(client,'v1-start',room),'events','5'))).data()?.version).toBe(1);
  }else{
   await expect(appendFirestore(client,'v1-start',room,'p0',{id:'too-early',actor:'p0',expectedRevision:2,intent},prefix)).rejects.toThrow();
   const root=tableRef(client,'v1-start',room),batch=writeBatch(client);
   batch.set(root,{owner:'p0',members:['p0','p1'],bots:[],revision:3});batch.set(doc(root,'events','3'),{version:1,id:'too-early',sequence:3,actor:'p0',intent});batch.set(doc(root,'commands','too-early'),{sequence:3});await assertFails(batch.commit());
  }
 }
});
