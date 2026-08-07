<script setup lang="ts"></script>

<template>
  <div class="min-h-screen">
    <header class="border-b border-bord bg-fond-2">
      <div class="mx-auto max-w-6xl px-4 py-4">
        <RouterLink to="/" class="text-lg font-semibold tracking-tight">
          Archipelago <span class="text-doux font-normal">— liste des jeux</span>
        </RouterLink>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-4 py-8">
      <RouterView />
    </main>
  </div>
</template>
