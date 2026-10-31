import { TextureLoader, RepeatWrapping, SRGBColorSpace, type Texture } from 'three';
export type SurfaceMaps = { color: Texture; normal: Texture; roughness: Texture };
export type MaterialLibrary = { maple: SurfaceMaps; walnut: SurfaceMaps; cloth: { normal: Texture; roughness: Texture } };
export async function loadMaterials(): Promise<MaterialLibrary> {
 const loader=new TextureLoader();
 async function map(name:string,kind:string,repeat:[number,number]=[1,1],rotation=0){
  const t=await loader.loadAsync(`/materials/${name}-${kind}.jpg`);t.anisotropy=16;
  if(kind==='color')t.colorSpace=SRGBColorSpace;
  t.wrapS=t.wrapT=RepeatWrapping;t.repeat.set(...repeat);t.center.set(.5,.5);t.rotation=rotation;
  return t;
 }
 async function surface(name:string,rotation=0):Promise<SurfaceMaps>{
  const [color,normal,roughness]=await Promise.all([map(name,'color'),map(name,'normal',[1,1],rotation),map(name,'roughness',[1,1],rotation)]);return {color,normal,roughness};
 }
 const [maple,walnut,normal,roughness]=await Promise.all([surface('maple',Math.PI/2),surface('walnut'),map('cloth','normal',[22,16]),map('cloth','roughness',[22,16])]);
 return {maple,walnut,cloth:{normal,roughness}};
}
export function disposeMaterials(materials:MaterialLibrary){for(const set of Object.values(materials))for(const t of Object.values(set))t.dispose();}
