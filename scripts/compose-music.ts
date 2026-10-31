import {mkdir,writeFile} from 'node:fs/promises';
const fluteA=[
'F#5:2 E5:1 D5:2 A4:1','B4:2 D5:1 G5:2 F#5:1','E5:1 F#5:1 A5:1 F#5:2 D5:1','C#5:3 E5:2 r:1',
'D5:2 F#5:1 B5:2 A5:1','G5:2 F#5:1 E5:1 D5:2','E5:2 G5:1 F#5:2 E5:1','C#5:3 r:1 E5:1 C#5:1',
'F#5:1 A5:1 F#5:1 E5:1 D5:2','D5:2 G5:1 B5:2 A5:1','F#5:2 D5:1 B4:2 C#5:1','A#4:2 C#5:1 E5:2 F#5:1',
'G5:3 E5:1 D5:1 B4:1','A4:2 D5:1 F#5:2 E5:1','E5:2 G5:1 F#5:1 E5:1 C#5:1','D5:3 r:3'];
const violinA=[
'A3:3 F#4:3','B3:3 D4:3','D4:3 A3:3','E4:3 C#4:3','F#4:3 D4:3','D4:3 B3:3','B3:3 G4:3','E4:3 G4:2 E4:1',
'F#4:2 E4:1 D4:3','B3:3 D4:3','D4:3 F#4:3','C#4:3 A#3:3','B3:3 D4:3','F#4:3 D4:3','G4:2 E4:1 C#4:3','A3:3 F#4:2 r:1'];
const violinB=[
'F#4:2 D4:1 B3:2 D4:1','C#4:2 F#4:1 A4:3','G4:2 F#4:1 E4:2 D4:1','F#4:3 A4:2 r:1',
'G4:1 B4:1 G4:1 F#4:2 E4:1','D4:2 F#4:1 B4:2 A4:1','G#4:1 A#4:1 C#5:1 E5:2 C#5:1','D5:3 B4:2 r:1',
'B4:2 G4:1 D4:3','C#4:2 E4:1 A4:2 G4:1','F#4:2 A4:1 D5:2 C#5:1','B4:3 F#4:3',
'E4:2 G4:1 B4:2 A4:1','G4:2 F#4:1 E4:2 D4:1','C#4:2 E4:1 G4:2 E4:1','C#5:3 r:3'];
const fluteB=['B4:6','r:3 C#5:3','D5:6','r:3 D5:3','B4:3 E5:3','F#5:6','E5:3 C#5:3','F#5:3 r:3','D5:6','E5:6','A5:3 F#5:3','D5:6','G5:3 E5:3','B4:3 D5:3','E5:6','E5:3 C#5:2 r:1'];
const fluteReturn=[...fluteA];fluteReturn[0]='A5:2 F#5:1 E5:2 D5:1';fluteReturn[1]='D5:2 G5:1 B5:2 A5:1';fluteReturn[8]='A5:1 F#5:1 E5:1 D5:2 A4:1';fluteReturn[12]='B5:2 A5:1 G5:2 F#5:1';fluteReturn[15]='D5:3 r:3';
const chordsA=['D','G','D/F#','A','Bm','G','Em','A','D','G','Bm','F#7','G','D/A','A7','D'];
const chordsB=['Bm','F#m','G','D/F#','Em','Bm/F#','F#7','Bm','G','A','D','Bm','Em','G','A7','A'];
const bass:Record<string,string>={D:'D3:3 A2:3',G:'G2:3 D3:3','D/F#':'F#2:3 D3:3',A:'A2:3 E3:3',Bm:'B2:3 F#3:3',Em:'E3:3 B2:3','F#7':'F#2:3 C#3:3','D/A':'A2:3 D3:3',A7:'A2:3 G3:3','F#m':'F#2:3 C#3:3','Bm/F#':'F#2:3 B2:3'};
const measures=[...chordsA,...chordsB,...chordsA].map((chord,i)=>({chord,flute:[...fluteA,...fluteB,...fluteReturn][i],violin:[...violinA,...violinB,...violinA][i],cello:i===15||i===47?'D3:6':i===31?'A2:6':bass[chord]}));
const score={title:'Baize at Dusk',subtitle:'Pastorale for flute, violin and violoncello',license:'GPL-3.0-only',key:'D major',meter:[6,8],quarterBpm:84,measures};
await mkdir('scores',{recursive:true});await mkdir('public/music',{recursive:true});await writeFile('scores/baize-at-dusk.json',JSON.stringify(score,null,2)+'\n');
const notes=(text:string)=>text.split(' ').map(token=>{const [pitch,duration]=token.split(':');return {pitch,duration:Number(duration)};});
const midiPitch=(note:string)=>{const [,letter,accidental,octave]=/^([A-G])([#b]?)(\d)$/.exec(note)!;return (Number(octave)+1)*12+({C:0,D:2,E:4,F:5,G:7,A:9,B:11}[letter as 'C']??0)+(accidental==='#'?1:accidental==='b'?-1:0);};
const parts=[['flute','Flute',73,'G',2],['violin','Violin',40,'G',2],['cello','Violoncello',42,'F',4]] as const;
const xmlParts=parts.map(([id,name,program,clef,line],index)=>`<score-part id="P${index+1}"><part-name>${name}</part-name><part-abbreviation>${name.slice(0,3)}.</part-abbreviation><score-instrument id="I${index+1}"><instrument-name>${name}</instrument-name></score-instrument><midi-instrument id="I${index+1}"><midi-channel>${index+1}</midi-channel><midi-program>${program+1}</midi-program></midi-instrument></score-part>`).join('');
const tracks=parts.map(([id,name,program,clef,line],index)=>`<part id="P${index+1}">${measures.map((m,i)=>`<measure number="${i+1}">${i===0?`<attributes><divisions>2</divisions><key><fifths>2</fifths></key><time><beats>6</beats><beat-type>8</beat-type></time><clef><sign>${clef}</sign><line>${line}</line></clef></attributes><direction><direction-type><words>Andante pastorale · dolce</words></direction-type><sound tempo="84"/></direction><direction><direction-type><dynamics><p/></dynamics></direction-type></direction>`:''}${i===16?'<direction><direction-type><words>Un poco espressivo</words></direction-type></direction>':i===32?'<direction><direction-type><words>Dolce, come prima</words></direction-type></direction>':''}${notes(m[id]).map(n=>{const pitch=n.pitch==='r'?'<rest/>':`<pitch><step>${n.pitch[0]}</step>${n.pitch.includes('#')?'<alter>1</alter>':''}<octave>${n.pitch.at(-1)}</octave></pitch>`;return `<note>${pitch}<duration>${n.duration}</duration><type>${n.duration>=4?'half':n.duration>=2?'quarter':'eighth'}</type>${[3,6].includes(n.duration)?'<dot/>':''}</note>`;}).join('')}${i===47?'<barline location="right"><bar-style>light-heavy</bar-style></barline>':''}</measure>`).join('')}</part>`).join('');
await writeFile('public/music/baize-at-dusk.musicxml',`<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">\n<score-partwise version="4.0"><work><work-title>${score.title}</work-title></work><movement-title>${score.subtitle}</movement-title><identification><creator type="composer">Cribbage — original score</creator><rights>GPL-3.0-only; original composition</rights></identification><part-list>${xmlParts}</part-list>${tracks}</score-partwise>\n`);
function vlq(n:number){const bytes=[n&127];while(n>>=7)bytes.unshift((n&127)|128);return bytes;}
const chunk=(type:string,data:number[])=>{const h=Buffer.alloc(8);h.write(type);h.writeUInt32BE(data.length,4);return Buffer.concat([h,Buffer.from(data)]);};
const midiTracks=parts.map(([id,name,program],channel)=>{const events:{at:number;bytes:number[]}[]=[{at:0,bytes:[0xc0+channel,program]}];if(channel===0){const tempo=Math.round(60000000/84);events.push({at:0,bytes:[0xff,0x51,3,tempo>>16&255,tempo>>8&255,tempo&255]},{at:0,bytes:[0xff,0x58,4,6,3,24,8]});}let tick=0;for(const m of measures)for(const n of notes(m[id])){if(n.pitch!=='r'){const p=midiPitch(n.pitch);events.push({at:tick,bytes:[0x90+channel,p,id==='flute'?65:55]},{at:tick+n.duration*240-12,bytes:[0x80+channel,p,0]});}tick+=n.duration*240;}events.sort((a,b)=>a.at-b.at||a.bytes[0]-b.bytes[0]);let previous=0;const data:number[]=[];for(const e of events){data.push(...vlq(e.at-previous),...e.bytes);previous=e.at;}data.push(...vlq(tick-previous),0xff,0x2f,0);return chunk('MTrk',data);});
await writeFile('public/music/baize-at-dusk.mid',Buffer.concat([chunk('MThd',[0,1,0,3,1,224]),...midiTracks]));
console.log({title:score.title,bars:measures.length,duration:48*6*30/84,parts:parts.map(p=>p[1])});
