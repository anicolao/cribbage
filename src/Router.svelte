<script lang="ts">
 import Lab from './App.svelte';
 import Game from './GameApp.svelte';
 const lab=location.pathname.slice(import.meta.env.BASE_URL.length).startsWith('dev/')||new URLSearchParams(location.search).has('preview');
</script>
{#if lab}<Lab/>{:else}<Game/>{/if}
