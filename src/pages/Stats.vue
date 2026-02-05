<template>
  <div class="min-h-screen bg-gradient-to-br from-background via-background to-muted pb-20">
    <div class="bg-white border-b-2 border-border px-6 py-6 shadow-sm">
      <div class="flex items-center gap-4 mb-6">
        <button
          @click="router.push('/')"
          class="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-secondary active:scale-95 transition-all"
        >
          <i class="pi pi-arrow-left text-xl" />
        </button>
        <div>
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <i class="pi pi-chart-line text-2xl text-primary" />
            </div>
            <div>
              <h1 class="text-3xl font-bold text-foreground">Statistiken</h1>
              <p class="text-sm text-muted-foreground">Spieler-Auswertungen</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="px-6 py-12">
      <div class="bg-white border-2 border-dashed border-border rounded-2xl py-16 px-6 text-center">
        <i class="pi pi-chart-bar text-4xl text-muted-foreground mx-auto mb-4 opacity-40" />
        <p class="text-lg font-semibold text-muted-foreground mb-1">Noch keine Spieler vorhanden</p>
        <p class="text-sm text-muted-foreground">Spiele dein erstes Match!</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>
