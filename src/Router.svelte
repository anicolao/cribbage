<script lang="ts">
 import Lab from './App.svelte';
 import Game from './GameApp.svelte';
 const lab=location.pathname.startsWith('/dev/')||new URLSearchParams(location.search).has('preview');
</script>
{#if lab}<Lab/>{:else}<Game/>{/if}
