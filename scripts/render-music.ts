import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import score from '../scores/baize-at-dusk.json' with {type:'json'};
import manifest from '../scores/samples.json' with {type:'json'};
import {readWav} from './music-wav';
const rate=44100,eighth=30/score.quarterBpm,length=Math.round(score.measures.length*6*eighth*rate),tail=rate*3,L=new Float32Array(length+tail),R=new Float32Array(length+tail);
const cache=process.env.CRIBBAGE_MUSIC_SAMPLES??'/tmp/cribbage-music-samples';await mkdir(cache,{recursive:true});
const midi=(note:string)=>{const [,letter,accidental,octave]=/^([A-G])([#b]?)(\d)$/.exec(note)!;return (Number(octave)+1)*12+({C:0,D:2,E:4,F:5,G:7,A:9,B:11}[letter as 'C']??0)+(accidental==='#'?1:accidental==='b'?-1:0);};
const samples=await Promise.all(manifest.samples.map(async item=>{
 const path=join(cache,item.file);let b:Buffer;try{b=await readFile(path);}catch{const response=await fetch(`https://raw.githubusercontent.com/sgossner/VSCO-2-CE/${manifest.commit}/${item.path.split('/').map(encodeURIComponent).join('/')}`);if(!response.ok)throw new Error(`Sample unavailable: ${item.path}`);b=Buffer.from(await response.arrayBuffer());await writeFile(path,b);}
 if(createHash('sha256').update(b).digest('hex')!==item.sha256)throw new Error(`Changed sample: ${item.file}`);
 const wav=readWav(b),instrument=item.path.startsWith('Woodwinds')?'flute':item.path.includes('Solo Violin')?'violin':'cello',name=/_([A-G][#b]?\d)_/.exec(item.file)![1],root=midi(name)+(instrument==='violin'?0:12);
 let peak=0;for(const n of wav.mono)peak=Math.max(peak,Math.abs(n));let first=0;while(first<wav.mono.length&&Math.abs(wav.mono[first])<peak*.008)first++;first=Math.max(0,first-Math.round(wav.rate*.04));
 return {...wav,instrument,root,first,normalization:.6/peak};
}));
const parts=[{id:'flute',gain:.27,pan:-.13},{id:'violin',gain:.19,pan:-.38},{id:'cello',gain:.23,pan:.3}] as const;
let notes=0;
for(const [partIndex,part] of parts.entries())for(const [bar,measure] of score.measures.entries()){
 let beat=0;
 for(const token of measure[part.id].split(' ')){
  const [note,beats]=token.split(':'),duration=Number(beats)*eighth;
  if(note!=='r'){
   const pitch=midi(note),sample=samples.filter(s=>s.instrument===part.id).sort((a,b)=>Math.abs(a.root-pitch)-Math.abs(b.root-pitch))[0],ratio=2**((pitch-sample.root)/12)*sample.rate/rate;
   const onset=.08+bar*6*eighth+beat*eighth+(partIndex===1?.009:partIndex===2?.017:0),start=Math.round(onset*rate),end=Math.min(L.length,Math.round((onset+duration*.96+.18)*rate)),attack=part.id==='flute'?.035:.065,release=.18;
   const expression=(.91+.06*Math.sin(bar*1.7+beat*.8+partIndex))*(bar>=16&&bar<32?(part.id==='violin'?1.13:.88):1),gain=part.gain*sample.normalization*expression,lg=Math.cos((part.pan+1)*Math.PI/4)*gain,rg=Math.sin((part.pan+1)*Math.PI/4)*gain;
   for(let i=start;i<end;i++){
    const t=(i-start)/rate,pos=sample.first+(i-start)*ratio,index=Math.floor(pos);if(index+1>=sample.mono.length)break;
    const envelope=Math.min(1,t/attack)*Math.min(1,Math.max(0,(duration*.96+release-t)/release))*(.94+.06*Math.sin(Math.PI*Math.min(1,t/duration)));
    const v=(sample.mono[index]*(1-(pos-index))+sample.mono[index+1]*(pos-index))*envelope;L[i]+=v*lg;R[i]+=v*rg;
   }
   notes++;
  }
  beat+=Number(beats);
 }
 if(beat!==6)throw new Error(`Incomplete measure ${bar+1} ${part.id}`);
}
// A small chamber: early reflections and a diffuse, cross-fed tail.
for(const [delay,gain] of [[.037,.09],[.073,.065],[.113,.04],[.159,.025]]){
 const n=Math.round(delay*rate);for(let i=L.length-1;i>=n;i--){const a=L[i-n],b=R[i-n];L[i]+=b*gain;R[i]+=a*gain;}
}
const wetL=new Float32Array(L.length),wetR=new Float32Array(L.length);
for(const [index,seconds] of [.0297,.0371,.0411,.0437,.0533,.0617].entries()){
 const n=Math.round(seconds*rate),feedback=Math.exp(-6.9*seconds/1.05),left=new Float32Array(n),right=new Float32Array(n+37);
 for(let i=0;i<L.length;i++){const a=left[i%n],b=right[i%right.length];left[i%n]=L[i]+a*feedback;right[i%right.length]=R[i]+b*feedback;wetL[i]+=a/6;wetR[i]+=b/6;}
}
for(let i=0;i<L.length;i++){L[i]+=wetL[i]*.17;R[i]+=wetR[i]*.17;}
// Wrap the decay into the opening so the recording can repeat without a cut tail.
for(let i=length;i<L.length;i++){L[i-length]+=L[i];R[i-length]+=R[i];}
let peak=0,sum=0;for(let i=0;i<length;i++){peak=Math.max(peak,Math.abs(L[i]),Math.abs(R[i]));sum+=L[i]*L[i]+R[i]*R[i];}
const rms=Math.sqrt(sum/length/2),gain=Math.min(.7/peak,.075/rms),wav=Buffer.alloc(44+length*4);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*4,28);wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(length*4,40);
for(let i=0;i<length;i++){wav.writeInt16LE(Math.round(L[i]*gain*32767),44+i*4);wav.writeInt16LE(Math.round(R[i]*gain*32767),46+i*4);}
const output='/tmp/cribbage-baize-at-dusk.wav';await writeFile(output,wav);
const ffmpeg=process.env.CRIBBAGE_FFMPEG??Bun.which('ffmpeg');if(!ffmpeg)throw new Error('Set CRIBBAGE_FFMPEG to an ffmpeg executable');
const processResult=Bun.spawnSync([ffmpeg,'-y','-v','error','-i',output,'-c:a','libmp3lame','-b:a','160k','-metadata',`title=${score.title}`,'-metadata','artist=Cribbage — original chamber score','-metadata','copyright=GPL-3.0-only; VSCO samples CC0-1.0','public/music/baize-at-dusk.mp3']);if(processResult.exitCode)throw new Error(processResult.stderr.toString());
const stats={title:score.title,bars:score.measures.length,meter:'6/8',quarterBpm:score.quarterBpm,seconds:length/rate,notes,parts:parts.map(p=>p.id),sampleRate:rate,peakDb:20*Math.log10(peak*gain),rmsDb:20*Math.log10(rms*gain),sourceCommit:manifest.commit};await writeFile('public/music/baize-at-dusk.json',JSON.stringify(stats,null,2)+'\n');console.log(stats);
