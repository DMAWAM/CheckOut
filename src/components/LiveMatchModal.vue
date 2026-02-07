<template>
  <div
    v-if="open && match"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
    @click.self="emit('close')"
  >
    <div class="w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl border-2 border-border shadow-2xl p-6">
      <div class="flex items-center justify-between mb-4">
        <div>
          <div class="text-lg font-bold text-foreground">
            {{ headerTitle }}
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

      <div class="flex items-center justify-between text-xs text-muted-foreground font-semibold mb-4 flex-wrap gap-2">
        <span>Status: {{ statusLabel(match.status) }}</span>
        <span v-if="snapshot?.updatedAt">Live: {{ formatDate(snapshot.updatedAt) }}</span>
      </div>

      <div v-if="loading" class="text-sm text-muted-foreground">Lade Live-Daten ...</div>
      <div v-else-if="error" class="text-sm text-destructive">{{ error }}</div>
      <div v-else-if="!snapshot" class="text-sm text-muted-foreground">
        Keine Live-Daten verfügbar.
      </div>
      <div v-else class="space-y-4">
        <Scoreboard
          :players="players"
          :scores="snapshot.scores"
          :active-player-id="snapshot.activePlayerId"
          :stats-by-player="statsByPlayer"
          :checkout-by-player="checkoutByPlayer"
          :match-format="snapshot.match.format"
          :leg-wins="snapshot.legWins"
          :set-wins="snapshot.setWins"
          :set-leg-wins="snapshot.setLegWins"
        />
        <TurnHistory :turns="recentTurns" :players="players" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TournamentMatch, Player } from '@/domain/models'
import type { LiveMatchSnapshot } from '@/domain/liveMatch'
import { calculateMatchPlayerStats } from '@/domain/statsCalculator'
import { getCheckoutSuggestion } from '@/domain/checkoutTable'
import Scoreboard from '@/components/Scoreboard.vue'
import TurnHistory from '@/components/TurnHistory.vue'

const props = defineProps<{
  open: boolean
  match: TournamentMatch | null
  snapshot: LiveMatchSnapshot | null
  playerName: (playerId: string) => string
  loading?: boolean
  error?: string
}>()

const emit = defineEmits<{ (event: 'close'): void }>()

const fallbackPlayers = computed<Player[]>(() => {
  if (!props.match) return []
  const now = new Date().toISOString()
  return [
    { id: props.match.playerAId, name: props.playerName(props.match.playerAId), createdAt: now },
    { id: props.match.playerBId, name: props.playerName(props.match.playerBId), createdAt: now }
  ]
})

const players = computed(() => props.snapshot?.players ?? fallbackPlayers.value)

const headerTitle = computed(() => {
  if (!props.match) return ''
  return `${props.playerName(props.match.playerAId)} vs ${props.playerName(props.match.playerBId)}`
})

const statsByPlayer = computed(() => {
  const map: Record<string, { average: number; checkoutRate: number }> = {}
  if (!props.snapshot) return map
  players.value.forEach((player) => {
    const turns = props.snapshot?.turns.filter((turn) => turn.playerId === player.id) ?? []
    const stats = calculateMatchPlayerStats(turns)
    map[player.id] = {
      average: Math.round(stats.average * 10) / 10,
      checkoutRate: stats.checkoutRate
    }
  })
  return map
})

const checkoutByPlayer = computed(() => {
  const map: Record<string, string[] | null> = {}
  if (!props.snapshot) return map
  players.value.forEach((player) => {
    const score = props.snapshot?.scores[player.id] ?? 0
    map[player.id] = score <= 170 ? getCheckoutSuggestion(score) : null
  })
  return map
})

const recentTurns = computed(() => {
  if (!props.snapshot) return []
  return [...props.snapshot.turns].slice(-8).reverse()
})

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
