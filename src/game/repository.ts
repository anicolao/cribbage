import {apply,replay,type Event,type Intent} from './engine';
export type Pending={id:string;actor:string;expectedRevision:number;intent:Intent};
export function repository(room:string,onEvents:(events:Event[])=>void,onError:(message:string)=>void){
 const key=`cribbage:pending:${room}`,url=`/api/tables/${room}`;
 let events:Event[]=[],closed=false;
 const accept=(next:Event[])=>{replay(next);if(next.length>=events.length){events=next;onEvents(events);}};
 const stream=new EventSource(`${url}/events`);
 stream.onmessage=message=>{try{accept(JSON.parse(message.data));}catch{onError('This table needs a newer version.');}};
 stream.onerror=()=>{if(!closed)onError('Rejoining the table…');};
 async function send(pending:Pending){
  try{
   const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(pending)});
   if(!response.ok){const error=await response.json();localStorage.removeItem(key);throw new Error(error.error);}
   const next:Event[]=await response.json();accept(next);localStorage.removeItem(key);
  }catch(error){throw new Error((error as Error).message==='Failed to fetch'?'Your card is still here. Try again.':(error as Error).message);}
 }
 return {
  async append(actor:string,intent:Intent){
   const saved=localStorage.getItem(key);if(saved)throw new Error('Finish your last action first.');
   apply(replay(events),actor,intent);
   const pending:Pending={id:crypto.randomUUID(),actor,expectedRevision:events.length,intent};localStorage.setItem(key,JSON.stringify(pending));await send(pending);
  },
  async retry(){const saved=localStorage.getItem(key);if(saved)await send(JSON.parse(saved));else accept(await (await fetch(url)).json());},
  close(){closed=true;stream.close();}
 };
}
