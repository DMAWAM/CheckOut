<template>
  <div
    class="bg-white border-2 rounded-2xl p-6 shadow-sm"
    :class="stat.isWinner
      ? 'border-primary/70 shadow-lg shadow-primary/20'
      : stat.isDraw
        ? 'border-dart-gold/60 bg-dart-gold/5'
        : 'border-border'"
  >
    <div class="flex items-center justify-between mb-4">
      <div
        class="text-lg font-bold"
        :class="stat.isWinner ? 'text-primary' : stat.isDraw ? 'text-dart-gold' : 'text-foreground'"
      >
        {{ stat.name }}
      </div>
      <div
        class="text-sm font-semibold flex items-center gap-1"
        :class="stat.isWinner ? 'text-primary' : stat.isDraw ? 'text-dart-gold' : 'text-muted-foreground'"
      >
        <i v-if="stat.isWinner" class="pi pi-trophy text-dart-gold" />
        <i v-else-if="stat.isDraw" class="pi pi-equals" />
        {{ stat.isWinner ? 'Sieger' : stat.isDraw ? 'Remis' : 'Spieler' }}
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4 mb-4">
      <div class="bg-muted rounded-xl p-4 text-center">
        <div class="text-sm font-semibold text-muted-foreground">3-Dart Ø</div>
        <div class="text-3xl font-black text-primary">{{ stat.average.toFixed(1) }}</div>
      </div>
      <div class="bg-dart-gold/10 rounded-xl p-4 text-center">
        <div class="text-sm font-semibold text-muted-foreground">Checkout %</div>
        <div class="text-3xl font-black text-dart-gold">
          <!-- Checkout-% is now computed in BOTH single- and double-out
               matches. "—" only shows when there were genuinely no
               attempts (no checkout hits, no bust trying to finish). -->
          <template v-if="stat.checkoutAttempts === 0">—</template>
          <template v-else>{{ stat.checkoutRate.toFixed(0) }}%</template>
        </div>
        <div class="text-xs text-muted-foreground mt-1">
          <template v-if="stat.checkoutAttempts === 0">
            {{ doubleOut ? 'Double-Out' : 'Single-Out' }}
          </template>
          <template v-else-if="doubleOut">
            {{ stat.checkoutHits }}/{{ stat.checkoutAttempts }} · Darts auf Doppel: {{ stat.doubleDarts }}
          </template>
          <template v-else>
            {{ stat.checkoutHits }}/{{ stat.checkoutAttempts }} · Single-Out
          </template>
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

withDefaults(
  defineProps<{
    stat: MatchPlayerSummary
    /** Whether the match the stat was recorded in used double-out
     *  rules. Drives the small mode chip under the Checkout-% tile
     *  and whether the "Darts auf Doppel" detail is rendered.
     *  Defaults to `true` for backwards compatibility with callers
     *  that pre-date the single/double-out distinction. */
    doubleOut?: boolean
  }>(),
  { doubleOut: true }
)
</script>
