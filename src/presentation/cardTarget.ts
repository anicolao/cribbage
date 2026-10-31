import {CARD_WIDTH} from '../sceneLayout';
import {rotate,type CardVisual} from './frame';
/** Prefer the exposed centre of the top card; lower cards expose their left edge. */
export function cardTarget(card:CardVisual,last:boolean){
 const offset=rotate([last?0:-CARD_WIDTH*.4,.015,0],card.rotation);
 return rotate([card.position[0]+offset[0],card.position[1]+offset[1],card.position[2]+offset[2]],.055);
}
