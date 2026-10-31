// Keep depth precision around the tabletop even when a narrow lens moves the
// camera hundreds of units away. The visible table fits within this envelope.
export function cameraClipRange(distance:number){
 return {near:Math.max(.05,distance*.1,distance-24),far:distance+32};
}
