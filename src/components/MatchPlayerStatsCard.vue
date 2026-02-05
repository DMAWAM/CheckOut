<template>
  <div class="bg-white border-2 border-border rounded-2xl p-6 shadow-sm">
    <div class="flex items-center justify-between mb-4">
      <div class="text-lg font-bold text-foreground">{{ stat.name }}</div>
      <div class="text-sm font-semibold text-muted-foreground">
        {{ stat.isWinner ? 'Sieger' : 'Spieler' }}
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4 mb-4">
      <div class="bg-muted rounded-xl p-4 text-center">
        <div class="text-sm font-semibold text-muted-foreground">3-Dart Ø</div>
        <div class="text-3xl font-black text-primary">{{ stat.average.toFixed(1) }}</div>
      </div>
      <div class="bg-dart-gold/10 rounded-xl p-4 text-center">
        <div class="text-sm font-semibold text-muted-foreground">Checkout %</div>
        <div class="text-3xl font-black text-dart-gold">{{ stat.checkoutRate.toFixed(0) }}%</div>
        <div class="text-xs text-muted-foreground mt-1">
          {{ stat.checkoutHits }}/{{ stat.checkoutAttempts }} · Darts auf Doppel: {{ stat.doubleDarts }}
        </div>
      </div>
    </div>

    <div class="grid grid-cols-4 gap-3 text-center">
      <div class="bg-white border-2 border-border rounded-xl p-3">
        <div class="text-xs text-muted-foreground font-semibold">100+</div>
        <div class="text-xl font-black text-foreground">{{ stat.count100Plus }}</div>
      </div>
      <div class="bg-white border-2 border-border rounded-xl p-3">
        <div class="text-xs text-muted-foreground font-semibold">140+</div>
        <div class="text-xl font-black text-foreground">{{ stat.count140Plus }}</div>
      </div>
      <div class="bg-white border-2 border-border rounded-xl p-3">
        <div class="text-xs text-muted-foreground font-semibold">180</div>
        <div class="text-xl font-black text-foreground">{{ stat.count180 }}</div>
      </div>
      <div class="bg-white border-2 border-border rounded-xl p-3">
        <div class="text-xs text-muted-foreground font-semibold">Darts</div>
        <div class="text-xl font-black text-foreground">{{ stat.totalDarts }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MatchPlayerSummary } from '@/domain/matchSummary'

defineProps<{
  stat: MatchPlayerSummary
}>()
</script>
