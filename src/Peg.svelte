<script lang="ts">
 import { T } from '@threlte/core';
 import type { Position } from './table';
 let {color,position=[0,0,0],scale=1}:{color:string;position?:Position;scale?:number}=$props();
</script>
<T.Group {position} {scale}>
 <T.Mesh position.y={.09} castShadow><T.CylinderGeometry args={[.039,.028,.23,16]}/><T.MeshStandardMaterial color="#a69775" roughness={.25} metalness={.8}/></T.Mesh>
 <T.Mesh position.y={.235} castShadow><T.CylinderGeometry args={[.058,.045,.2,20]}/><T.MeshStandardMaterial {color} roughness={.24} metalness={.4}/></T.Mesh>
 <T.Mesh position.y={.35} castShadow><T.SphereGeometry args={[.065,20,12]}/><T.MeshStandardMaterial {color} roughness={.22} metalness={.35}/></T.Mesh>
 {#each [.19,.24,.29] as y}<T.Mesh position.y={y} rotation.x={Math.PI/2}><T.TorusGeometry args={[.054,.006,6,20]}/><T.MeshStandardMaterial color="#d3b982" roughness={.24} metalness={.8}/></T.Mesh>{/each}
</T.Group>
