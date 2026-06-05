<template>
  <div
    v-if="open && match"
    class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-0 sm:px-4"
    @click.self="emit('close')"
    style="padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom);"
  >
    <div class="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-2xl border-t-2 sm:border-2 border-border shadow-2xl p-4 sm:p-6">
      <div class="flex items-center justify-between mb-4">
        <div>
          <div class="text-lg font-bold text-foreground">
            {{ match.players.map((player) => player.name).join(' vs ') }}
          </div>
          <div class="text-xs text-muted-foreground font-semibold">
            {{ formatLabel }} · {{ match.doubleOut ? 'Double-Out' : 'Single-Out' }}
          </div>
        </div>
        <button
          class="w-10 h-10 rounded-xl border-2 border-border flex items-center justify-center hover:bg-muted"
          @click="emit('close')"
        >
          <i class="pi pi-times" />
        </button>
      </div>

      <div class="flex items-center justify-between text-xs text-muted-foreground font-semibold mb-4">
        <span>{{ resultLabel }}</span>
        <span v-if="match.endedAt">Beendet: {{ formatDate(match.endedAt) }}</span>
      </div>

      <!-- Endscore display: "Name A — 2 : 1 — Name B" with the winner's
           name in primary green. Mirrors the post-match screen in the
           Game view so the spectator sees the same final score here. -->
      <div
        v-if="scoreParts"
        class="flex items-center justify-center gap-3 sm:gap-4 mb-4 max-w-full"
      >
        <span
          class="text-sm sm:text-base font-bold truncate max-w-[35vw] text-right"
          :class="scoreParts.winnerId === scoreParts.idA ? 'text-primary' : 'text-muted-foreground'"
        >
          {{ scoreParts.nameA }}
        </span>
        <span class="text-3xl sm:text-4xl font-black text-foreground tabular-nums leading-none">
          {{ scoreParts.legsA }}
        </span>
        <span class="text-2xl sm:text-3xl font-black text-muted-foreground leading-none">:</span>
        <span class="text-3xl sm:text-4xl font-black text-foreground tabular-nums leading-none">
          {{ scoreParts.legsB }}
        </span>
        <span
          class="text-sm sm:text-base font-bold truncate max-w-[35vw]"
          :class="scoreParts.winnerId === scoreParts.idB ? 'text-primary' : 'text-muted-foreground'"
        >
          {{ scoreParts.nameB }}
        </span>
      </div>

      <div v-if="match.stats.length === 0" class="text-sm text-muted-foreground">
        Für dieses Match sind noch keine Statistiken verfügbar.
      </div>
      <div v-else class="grid gap-4">
        <MatchPlayerStatsCard v-for="stat in match.stats" :key="stat.playerId" :stat="stat" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MatchPlayerStatsCard from '@/components/MatchPlayerStatsCard.vue'
import type { MatchSummary } from '@/domain/matchSummary'

const props = defineProps<{
  open: boolean
  match: MatchSummary | null
}>()

const emit = defineEmits<{ (event: 'close'): void }>()

const formatLabel = computed(() => {
  if (!props.match) return ''
  const startingScore = props.match.startingScore ?? props.match.mode
  if (!props.match.format) return `${startingScore}`
  const format = props.match.format
  if (format.type === 'fixed_legs') {
    return `${format.fixedLegs ?? format.legsToWin} fixe Legs`
  }
  if (format.type === 'best_of') {
    const bestOf = format.bestOf ?? (format.legsToWin ? format.legsToWin * 2 - 1 : undefined)
    return bestOf ? `Best of ${bestOf}` : `${startingScore}`
  }
  const legs = format.legsToWin
  return legs ? `Race to ${legs}` : `${startingScore}`
})

const resultLabel = computed(() => {
  if (!props.match) return 'Status: beendet'
  const winner = props.match.players.find((player) => player.id === props.match?.winnerId)
  return winner ? `Sieger: ${winner.name}` : 'Resultat: Unentschieden'
})

// Pair up the two players with their leg counts so the template can
// render a big "Name A — 2 : 1 — Name B" line. Reads legsWon from the
// per-player stats already persisted on the MatchSummary.
const scoreParts = computed(() => {
  if (!props.match) return null
  const [a, b] = props.match.players
  if (!a || !b) return null
  const statA = props.match.stats.find((stat) => stat.playerId === a.id)
  const statB = props.match.stats.find((stat) => stat.playerId === b.id)
  return {
    idA: a.id,
    idB: b.id,
    nameA: a.name,
    nameB: b.name,
    legsA: statA?.legsWon ?? 0,
    legsB: statB?.legsWon ?? 0,
    winnerId: props.match.winnerId ?? null
  }
})

const formatDate = (value: string) => {
  const date = new Date(value)
  const day = date.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const time = date.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
  return `${day} · ${time}`
}
</script>
