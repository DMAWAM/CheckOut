<template>
  <div
    v-if="open && match"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
    @click.self="emit('close')"
  >
    <div class="w-full max-w-2xl bg-white rounded-2xl border-2 border-border shadow-2xl p-6">
      <div class="flex items-center justify-between mb-4">
        <div>
          <div class="text-lg font-bold text-foreground">
            {{ playerName(match.playerAId) }} vs {{ playerName(match.playerBId) }}
          </div>
          <div class="text-xs text-muted-foreground font-semibold">
            {{ phaseLabel(match.phase) }} · Runde {{ match.round }}
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
        <span>Status: {{ statusLabel(match.status) }}</span>
        <span v-if="match.endedAt">Beendet: {{ formatDate(match.endedAt) }}</span>
      </div>

      <div v-if="stats.length === 0" class="text-sm text-muted-foreground">
        Für dieses Match sind noch keine Statistiken verfügbar.
      </div>
      <div v-else class="grid gap-4">
        <MatchPlayerStatsCard v-for="stat in stats" :key="stat.playerId" :stat="stat" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import MatchPlayerStatsCard from '@/components/MatchPlayerStatsCard.vue'
import type { TournamentMatch } from '@/domain/models'
import type { MatchPlayerSummary } from '@/domain/matchSummary'

const props = defineProps<{
  open: boolean
  match: TournamentMatch | null
  stats: MatchPlayerSummary[]
  playerName: (playerId: string) => string
}>()

const emit = defineEmits<{ (event: 'close'): void }>()

const phaseLabel = (phase: string) => (phase === 'round_robin' ? 'Round Robin' : 'K.O.-Phase')

const statusLabel = (status: string) => {
  if (status === 'finished') return 'beendet'
  if (status === 'in_progress') return 'läuft'
  return 'bereit'
}

const formatDate = (value: string) => {
  const date = new Date(value)
  const day = date.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const time = date.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
  return `${day} · ${time}`
}
</script>
