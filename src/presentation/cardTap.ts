type PointerSample={pointerId:number;clientX:number;clientY:number;button:number;isPrimary:boolean};
/** Keep the mesh selected at finger-down even while its feedback animation moves. */
export class CardTap {
 private pending:{card:string;id:number;x:number;y:number;cancelled:boolean}|undefined;
 begin(card:string,e:PointerSample){
  if(this.pending){this.pending.cancelled=true;return false;}
  if(e.button!==0||!e.isPrimary)return false;
  this.pending={card,id:e.pointerId,x:e.clientX,y:e.clientY,cancelled:false};return true;
 }
 move(e:Pick<PointerSample,'pointerId'|'clientX'|'clientY'>){
  const p=this.pending;if(p&&p.id===e.pointerId&&Math.hypot(e.clientX-p.x,e.clientY-p.y)>8)p.cancelled=true;
 }
 end(e:Pick<PointerSample,'pointerId'|'clientX'|'clientY'>){
  const p=this.pending;if(!p||p.id!==e.pointerId)return;
  this.move(e);this.pending=undefined;return p.cancelled?undefined:p.card;
 }
 cancel(){this.pending=undefined;}
}

/** CSS coordinates, independent of backing-buffer DPR and preview transforms. */
export function canvasPointer(point:{clientX:number;clientY:number},rect:{left:number;top:number;width:number;height:number}){
 if(rect.width<=0||rect.height<=0)return;
 return {x:(point.clientX-rect.left)/rect.width*2-1,y:1-(point.clientY-rect.top)/rect.height*2};
}
