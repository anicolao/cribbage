export function readWav(b:Buffer){
 let channels=0,rate=0,bits=0,format=0,data=Buffer.alloc(0),root:number|undefined;
 for(let p=12;p+8<=b.length;){const id=b.toString('ascii',p,p+4),n=b.readUInt32LE(p+4),s=p+8;if(id==='fmt '){format=b.readUInt16LE(s);channels=b.readUInt16LE(s+2);rate=b.readUInt32LE(s+4);bits=b.readUInt16LE(s+14);}if(id==='data')data=b.subarray(s,s+n);if(id==='smpl'&&n>=16)root=b.readUInt32LE(s+12);p=s+n+(n%2);}
 if(!rate||!channels||![16,24,32].includes(bits))throw new Error('Unsupported sample');const bytes=bits/8,length=data.length/bytes/channels,mono=new Float32Array(length);
 for(let i=0;i<length;i++){let v=0;for(let c=0;c<channels;c++){const p=(i*channels+c)*bytes;v+=format===3?data.readFloatLE(p):bits===16?data.readInt16LE(p)/32768:bits===24?data.readIntLE(p,3)/8388608:data.readInt32LE(p)/2147483648;}mono[i]=v/channels;}
 return {rate,mono,root};
}
export function pitch(mono:Float32Array,rate:number){
 const down=Math.max(1,Math.floor(rate/11025)),r=rate/down,start=Math.floor(rate*.55),count=2048,s=new Float32Array(count+600);for(let i=0;i<s.length;i++)s[i]=mono[start+i*down]??0;
 const max=Math.min(500,Math.floor(r/75)),d=new Float64Array(max+1);let sum=0;
 for(let lag=1;lag<=max;lag++){for(let i=0;i<count;i++){const v=s[i]-s[i+lag];d[lag]+=v*v;}sum+=d[lag];d[lag]=sum?d[lag]*lag/sum:1;}
 let best=0;for(let lag=Math.floor(r/1600);lag<max-1;lag++)if(d[lag]<.13){while(lag+1<max&&d[lag+1]<d[lag])lag++;best=lag;break;}
 if(!best)throw new Error('No stable sample pitch');return Math.round(69+12*Math.log2(r/best/440));
}
