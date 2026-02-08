<template>
  <div
    v-if="open && match"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
    @click.self="emit('close')"
  >
    <div class="w-full max-w-3xl bg-white rounded-2xl border-2 border-border shadow-2xl p-6">
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
        <span>Status: beendet</span>
        <span v-if="match.endedAt">Beendet: {{ formatDate(match.endedAt) }}</span>
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
  if (format.type === 'best_of') {
    const bestOf = format.bestOf ?? (format.legsToWin ? format.legsToWin * 2 - 1 : undefined)
    return bestOf ? `Best of ${bestOf}` : `${startingScore}`
  }
  const legs = format.legsToWin
  return legs ? `Race to ${legs}` : `${startingScore}`
})

const formatDate = (value: string) => {
  const date = new Date(value)
  const day = date.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const time = date.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
  return `${day} · ${time}`
}
</script>
