import {expect,test} from 'bun:test';
import {CardTap,canvasPointer} from '../src/presentation/cardTap';
const point=(x=120,y=700,pointerId=1)=>({clientX:x,clientY:y,pointerId,button:0,isPrimary:true});

test('a tap belongs to the initial mesh, even if animated geometry changes the release hit',()=>{
 const tap=new CardTap();expect(tap.begin('left-card',point())).toBe(true);
 tap.move(point(124,702));
 // The release does not select a fresh mesh underneath the same finger.
 expect(tap.end(point(124,702))).toBe('left-card');
 expect(tap.end(point())).toBeUndefined();
});
test('dragging out and back, cancellation, second fingers and secondary buttons never play a card',()=>{
 const tap=new CardTap();tap.begin('ace',point());tap.move(point(135,700));tap.move(point());expect(tap.end(point())).toBeUndefined();
 tap.begin('ace',point());tap.cancel();expect(tap.end(point())).toBeUndefined();
 tap.begin('ace',point());expect(tap.begin('king',point(120,700,2))).toBe(false);expect(tap.end(point())).toBeUndefined();
 expect(tap.begin('ace',{...point(),button:2})).toBe(false);expect(tap.begin('ace',{...point(),isPrimary:false})).toBe(false);
});
test('another pointer cannot complete the pending gesture',()=>{
 const tap=new CardTap();tap.begin('ace',point());expect(tap.end(point(120,700,2))).toBeUndefined();expect(tap.end(point())).toBe('ace');
});
test('client coordinates match the displayed canvas at any DPR, offset or CSS preview scale',()=>{
 for(const rect of [{left:0,top:0,width:390,height:844},{left:31,top:48,width:390,height:844},{left:450,top:100,width:195,height:422}]){
  expect(canvasPointer({clientX:rect.left+rect.width*.25,clientY:rect.top+rect.height*.75},rect)).toEqual({x:-.5,y:-.5});
 }
 expect(canvasPointer(point(),{left:0,top:0,width:0,height:844})).toBeUndefined();
});
