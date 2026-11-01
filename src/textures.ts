import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from 'three';
import { BOARD_WIDTH, BOARD_DEPTH, TRACK_COLORS, holePoint, trackOutline, FINISH_POINT, seats, starter, cribCards } from './table';
function canvas(w:number,h:number) {const c=document.createElement('canvas');c.width=w;c.height=h;return {c,g:c.getContext('2d')!};}
function noise(initial=731){let seed=initial;return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
function texture(c:HTMLCanvasElement){const t=new CanvasTexture(c);t.colorSpace=SRGBColorSpace;t.anisotropy=16;return t;}
export function wood(light=false){
 const rand=noise();
 const {c,g}=canvas(2048,1024),pixels=g.createImageData(2048,1024);
 for(let y=0;y<1024;y++)for(let x=0;x<2048;x++){
  const warp=y+7*Math.sin(x/410+y/180)+2*Math.sin(x/113+y/100);
  const grain=Math.sin(warp*.8+Math.sin(x/190))*1.8+Math.sin(warp*.12)*3+Math.sin(warp*2.6)*1.2+(rand()-.5)*5;
  const figure=Math.sin(x/530+y/160)*Math.sin(y/220)*4;
  const i=(y*2048+x)*4,base=light?[207,165,107]:[65,38,24];
  pixels.data[i]=base[0]+grain+figure;pixels.data[i+1]=base[1]+grain*.8+figure;pixels.data[i+2]=base[2]+grain*.5+figure;pixels.data[i+3]=255;
 }g.putImageData(pixels,0,0);return texture(c);
}
export function felt(){
 const rand=noise();
 const {c,g}=canvas(512,512),data=g.createImageData(512,512);
 for(let y=0;y<512;y++)for(let x=0;x<512;x++){
  const weave=Math.sin(x*Math.PI)*1.2+Math.sin(y*Math.PI/2)*1.1;
  const n=(rand()-.5)*15+weave,i=(y*512+x)*4;
  data.data[i]=19+n*.55;data.data[i+1]=65+n;data.data[i+2]=54+n*.85;data.data[i+3]=255;
 }g.putImageData(data,0,0);
 for(let i=0;i<32000;i++){const x=rand()*512,y=rand()*512;g.strokeStyle=`rgba(163,192,153,${rand()*.055})`;g.lineWidth=.45;g.beginPath();g.moveTo(x,y);g.lineTo(x+rand()*2-1,y+2);g.stroke();}
 const t=texture(c);t.wrapS=t.wrapT=RepeatWrapping;t.repeat.set(9,7);return t;
}
export function paper(){const rand=noise();const {c,g}=canvas(128,128),data=g.createImageData(128,128);for(let i=0;i<data.data.length;i+=4){const n=225+rand()*25;data.data[i]=data.data[i+1]=data.data[i+2]=n;data.data[i+3]=255;}g.putImageData(data,0,0);const t=texture(c);t.wrapS=t.wrapT=RepeatWrapping;t.repeat.set(4,6);return t;}
export function board(scannedWood?:CanvasImageSource){
 const {c,g}=canvas(1152,3072);
 if(scannedWood){g.save();g.translate(c.width/2,c.height/2);g.rotate(Math.PI/2);g.drawImage(scannedWood,-c.height/2,-c.width/2,c.height,c.width);g.restore();}
 else {const maple=wood(true);g.drawImage(maple.image,0,0,c.width,c.height);maple.dispose();}
 const X=(x:number)=>(x/BOARD_WIDTH+.5)*c.width,Y=(z:number)=>(z/BOARD_DEPTH+.5)*c.height;
 g.strokeStyle='#71553399';g.lineWidth=2;g.beginPath();g.roundRect(22,22,c.width-44,c.height-44,35);g.stroke();
 for(let lane=0;lane<4;lane++){
  g.beginPath();trackOutline(lane).forEach(([x,z],i)=>{i?g.lineTo(X(x),Y(z)):g.moveTo(X(x),Y(z));});
  g.strokeStyle=TRACK_COLORS[lane]+'bb';g.lineWidth=23;g.stroke();
 }
 // A group boundary always falls between actual numbered holes, including turns.
 for(let score=5;score<120;score+=5){
  const centers=[0,1,2,3].map(lane=>{const a=holePoint(score,lane),b=holePoint(score+1,lane);return score===90?a:[(a[0]+b[0])/2,(a[1]+b[1])/2];});
  const first=centers[0],last=centers[3],dx=last[0]-first[0],dz=last[1]-first[1],length=Math.hypot(dx,dz);
  g.strokeStyle=score===90?'#823d2c':'#745b3a66';g.lineWidth=score===90?7:1.5;
  g.beginPath();g.moveTo(X(first[0]-dx/length*.09),Y(first[1]-dz/length*.09));g.lineTo(X(last[0]+dx/length*.09),Y(last[1]+dz/length*.09));g.stroke();
 }
 g.strokeStyle='#806443';g.lineWidth=3;g.beginPath();g.arc(X(FINISH_POINT[0]),Y(FINISH_POINT[1]),.085*c.width/BOARD_WIDTH,0,Math.PI*2);g.stroke();
 g.textAlign='center';g.fillStyle='#5b452c';g.font='bold 30px Georgia';
 g.fillText('START',X(-1.3),Y(4.75));
 g.fillStyle='#24170e';g.font='bold 34px Georgia';
 g.fillText('121',X(0),Y(-3.85));
 // Follow the blue lane on the same side through both turns and the final leg.
 for(let score=5;score<=120;score+=5){
  const [x,z]=holePoint(score,0),gap=.23;
  let dx=score<=35||score>=86?-gap:gap, dz=.035;
  if(score>35&&score<=45){
   const angle=Math.PI+(score-35)/10*Math.PI;
   dx=Math.cos(angle)*gap;dz=Math.sin(angle)*gap+.035;
  }else if(score>80&&score<=85){
   const angle=(score-80)/5*Math.PI;
   dx=Math.cos(angle)*gap;dz=Math.sin(angle)*gap+.035;
  }
  g.fillText(String(score),X(x+dx),Y(z+dz));
 }
 return texture(c);
}
export function nameplateTexture(name:string,score?:number,compact=false){
 const rand=noise();
 const {c,g}=canvas(1024,164);
 const brass=g.createLinearGradient(0,0,0,164);brass.addColorStop(0,'#cfaf72');brass.addColorStop(.32,'#dec18a');brass.addColorStop(1,'#b68d53');
 g.fillStyle=brass;g.fillRect(0,0,1024,164);
 for(let y=0;y<164;y++){g.strokeStyle=`rgba(81,52,18,${rand()*.05})`;g.lineWidth=.5;g.beginPath();g.moveTo(0,y);g.lineTo(1024,y+rand()*.6);g.stroke();}
 g.strokeStyle='#785b32';g.lineWidth=2;g.strokeRect(12,12,1000,140);g.strokeStyle='#f0d6a3';g.lineWidth=1;g.strokeRect(16,16,992,132);
 g.fillStyle='#352717';g.textAlign='center';g.textBaseline='middle';
 const text=name.toUpperCase();g.font=`${compact?112:score===undefined?58:56}px Georgia`;
 if(compact){const maximum=score===undefined?920:510,width=g.measureText(text).width;if(width>maximum)g.font=`${112*maximum/width}px Georgia`;}
 // Modest letter spacing gives the original engraved serif nameplate feel.
 const spacing=3,total=[...text].reduce((sum,ch)=>sum+g.measureText(ch).width,0)+(text.length-1)*spacing;
 let x=(score===undefined?512:440)-total/2;
 for(const ch of text){g.textAlign='left';g.fillText(ch,x,86);x+=g.measureText(ch).width+spacing;}
 if(score!==undefined){
  g.strokeStyle='#967442';g.lineWidth=1.5;g.beginPath();g.moveTo(752,32);g.lineTo(752,132);g.stroke();
  g.textAlign='center';g.font=`${compact?124:68}px Georgia`;g.fillText(String(score),871,87);
  // The real coloured peg is mounted at this position on the brass plate.
  g.strokeStyle='#6c512d';g.lineWidth=2;g.beginPath();g.arc(87,82,13,0,Math.PI*2);g.stroke();
 }
 return texture(c);
}
async function cardBack(){
 const source=new Image();source.src=import.meta.env.BASE_URL+'cards/card-back-classic-v1.png';await source.decode();
 return paddedCard(source,CARD_BACK_INSET,'back');
}
// Face and back artwork share identical canvases and update independently.
export const CARD_FACE_INSET=.025;
export const CARD_BACK_INSET=.025;
function paintCard(c:HTMLCanvasElement,source:CanvasImageSource,margin:number){
 const g=c.getContext('2d')!,x=c.width*margin,y=c.height*margin;
 g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(source,x,y,c.width-2*x,c.height-2*y);
}
function paddedCard(source:CanvasImageSource,margin:number,kind:'face'|'back'){
 const {c}=canvas(768,1116);paintCard(c,source,margin);
 const t=texture(c);t.userData.cardSource=source;t.userData.marginKind=kind;t.userData.cardMargin=margin;return t;
}
export function updateCardMargins(cards:Record<string,Texture>,faceMargin:number,backMargin:number){
 for(const t of Object.values(cards)){
  const source=t.userData.cardSource as CanvasImageSource|undefined;
  const inset=Math.max(0,Math.min(.1,t.userData.marginKind==='back'?backMargin:faceMargin));
  if(source&&t.userData.cardMargin!==inset){paintCard(t.image as HTMLCanvasElement,source,inset);t.userData.cardMargin=inset;t.needsUpdate=true;}
 }
}
export async function cardTextures(ids=[...new Set([...seats.flatMap(s=>s.cards),starter,...cribCards])]):Promise<Record<string,Texture>>{
 const entries=await Promise.all(ids.map(async id=>{
  const response=await fetch(import.meta.env.BASE_URL+'cards/'+id+'.svg');if(!response.ok)throw new Error(`Card artwork could not load: ${id}`);
  const document=new DOMParser().parseFromString(await response.text(),'image/svg+xml');
  // The source outline describes a physical card. Our solid already supplies
  // that edge; retaining it would print a second card outline inside the margin.
  document.getElementById('path5')?.remove();
  document.documentElement.setAttribute('width','768');document.documentElement.setAttribute('height','1116');
  const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(document.documentElement)],{type:'image/svg+xml'}));
  try{const source=new Image();source.src=url;await source.decode();return [id,paddedCard(source,CARD_FACE_INSET,'face')] as const;}
  finally{URL.revokeObjectURL(url);}
 }));
 return Object.fromEntries([...entries,['back',await cardBack()]]);
}
export function tableStitch(){const {c,g}=canvas(2048,1450);g.strokeStyle='#b5b68755';g.lineWidth=2;g.setLineDash([4,5]);g.beginPath();g.roundRect(32,32,1984,1386,60);g.stroke();g.setLineDash([]);g.strokeStyle='#092d25';g.lineWidth=5;g.beginPath();g.roundRect(19,19,2010,1412,65);g.stroke();return texture(c);}
