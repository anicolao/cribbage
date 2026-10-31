import {beforeAll,afterAll,test,expect} from 'bun:test';
import {initializeTestEnvironment,assertFails,type RulesTestEnvironment} from '@firebase/rules-unit-testing';
import {readFileSync} from 'node:fs';
import {doc,getDoc,getDocs,collection,writeBatch,deleteDoc,setDoc,type Firestore} from 'firebase/firestore';
import {appendFirestore,watchFirestore,tableRef} from '../../src/game/firestore';
import {initialState,apply,replay,type Event,type Intent} from '../../src/game/engine';
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
 await assertFails(setDoc(doc(root,'events','1'),{version:1,id:'altered',sequence:1,actor:'owner',intent:{type:'create',name:'Replaced'}}));
 await assertFails(deleteDoc(doc(root,'events','1')));
 async function forged(actor:string,intent:unknown,client=owner){
  const target=tableRef(client,'rules','RULE1'),batch=writeBatch(client);
  batch.set(target,{owner:'owner',members:['owner'],bots:[],revision:2});
  batch.set(doc(target,'events','2'),{version:1,id:'forged',sequence:2,actor,intent});batch.set(doc(target,'commands','forged'),{sequence:2});await assertFails(batch.commit());
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
 batch.set(doc(root,'events',String(sequence)),{version:1,id:'spoof-direct',sequence,actor:'bot-b',intent:botIntent(state,2)!});batch.set(doc(root,'commands','spoof-direct'),{sequence});
 await assertFails(batch.commit());
 expect((await getDoc(root)).data()?.revision).toBe(state.revision);
});
