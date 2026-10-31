import { Shape, ShapeGeometry, ExtrudeGeometry } from 'three';
export function roundedShape(width: number, height: number, radius: number) {
  const s = new Shape(), x = -width/2, y = -height/2, r = radius;
  s.moveTo(x+r,y); s.lineTo(x+width-r,y); s.quadraticCurveTo(x+width,y,x+width,y+r);
  s.lineTo(x+width,y+height-r); s.quadraticCurveTo(x+width,y+height,x+width-r,y+height);
  s.lineTo(x+r,y+height); s.quadraticCurveTo(x,y+height,x,y+height-r);
  s.lineTo(x,y+r); s.quadraticCurveTo(x,y,x+r,y); return s;
}
export function faceGeometry(shape: Shape, width: number, height: number) {
  const geometry = new ShapeGeometry(shape, 10), pos = geometry.getAttribute('position'), uv = geometry.getAttribute('uv');
  for(let i=0;i<pos.count;i++) uv.setXY(i,pos.getX(i)/width+.5,pos.getY(i)/height+.5);
  return geometry;
}
// One closed solid, with separate top (0), underside (1), and edge (2)
// materials. Texture the actual caps instead of adding near-coplanar faces.
export function slabGeometry(shape: Shape, width: number, height: number, depth: number) {
  const geometry = new ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 10 });
  const positions=geometry.getAttribute('position'),normals=geometry.getAttribute('normal'),uv=geometry.getAttribute('uv');
  geometry.clearGroups();
  let start=0,material=-1;
  for(let i=0;i<positions.count;i+=3){
    const normal=normals.getZ(i),next=normal>.5?0:normal<-.5?1:2;
    if(next!==material){if(material>=0)geometry.addGroup(start,i-start,material);start=i;material=next;}
    if(next!==2)for(let j=i;j<i+3;j++)uv.setXY(j,positions.getX(j)/width+.5,positions.getY(j)/height+.5);
  }
  geometry.addGroup(start,positions.count-start,material);
  return geometry;
}
