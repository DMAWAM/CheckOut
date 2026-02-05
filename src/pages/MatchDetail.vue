<template>
  <div class="min-h-screen bg-gradient-to-br from-background via-background to-muted pb-20">
    <div class="bg-white border-b-2 border-border px-6 py-6 shadow-sm">
      <div class="flex items-center gap-4">
        <button
          @click="router.push('/')"
          class="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-secondary active:scale-95 transition-all"
        >
          <i class="pi pi-arrow-left text-xl" />
        </button>
        <div>
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <i class="pi pi-flag text-2xl text-primary" />
            </div>
            <div>
              <h1 class="text-3xl font-bold text-foreground">Match-Details</h1>
              <p class="text-sm text-muted-foreground">Statistiken & Ergebnis</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="px-6 py-8">
      <div v-if="!match" class="bg-white border-2 border-dashed border-border rounded-2xl py-16 px-6 text-center">
        <i class="pi pi-info-circle text-4xl text-muted-foreground mx-auto mb-4 opacity-40" />
        <p class="text-lg font-semibold text-muted-foreground mb-1">Match nicht gefunden</p>
        <p class="text-sm text-muted-foreground">Dieses Match ist nicht mehr im Verlauf.</p>
        <button
          @click="router.push('/')"
          class="mt-6 bg-primary text-primary-foreground rounded-xl py-3 px-6 font-bold"
        >
          Zurück zum Dashboard
        </button>
      </div>

      <div v-else class="space-y-6">
        <div class="bg-white border-2 border-border rounded-2xl p-6 shadow-sm">
          <div class="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div class="text-xl font-bold text-foreground">
                {{ match.players.map((player) => player.name).join(' vs ') }}
              </div>
              <div class="text-sm text-muted-foreground font-semibold">
                {{ match.startingScore ?? match.mode }} · {{ match.doubleOut ? 'Double-Out' : 'Single-Out' }}
              </div>
              <div class="text-xs text-muted-foreground font-semibold mt-1">{{ formatLabel }}</div>
            </div>
            <div class="text-right">
              <div class="text-xs text-muted-foreground font-semibold">Beendet am</div>
              <div class="text-sm font-bold text-foreground">{{ formatDate(match.endedAt) }}</div>
            </div>
          </div>
          <div v-if="winnerName" class="mt-4 bg-primary/10 text-primary rounded-xl px-4 py-2 font-semibold">
            Sieger: {{ winnerName }}
          </div>
        </div>

        <div class="grid gap-4">
          <MatchPlayerStatsCard v-for="stat in match.stats" :key="stat.playerId" :stat="stat" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMatchHistoryStore } from '@/stores/matchHistoryStore'
import MatchPlayerStatsCard from '@/components/MatchPlayerStatsCard.vue'

const route = useRoute()
const router = useRouter()
const history = useMatchHistoryStore()

const matchId = computed(() => Array.isArray(route.params.id) ? route.params.id[0] : route.params.id)
const match = computed(() => history.matches.find((item) => item.id === matchId.value))

const winnerName = computed(() => {
  if (!match.value?.winnerId) return ''
  return match.value.players.find((player) => player.id === match.value?.winnerId)?.name ?? ''
})

const formatLabel = computed(() => {
  const format = match.value?.format
  if (!format) return 'Standard'
  if (format.useSets) {
    const sets = format.setsToWin ?? 1
    const legsPerSet = format.legsPerSet ?? format.legsToWin ?? 1
    return `${format.type === 'best_of' ? 'Best-of' : 'First-to'} ${sets} Sets · ${legsPerSet} Legs/Set`
  }
  const legs = format.type === 'best_of'
    ? (format.bestOf ?? format.legsToWin ?? 1)
    : format.legsToWin
  return `${format.type === 'best_of' ? 'Best-of' : 'First-to'} ${legs} Legs`
})

const formatDate = (iso: string) => {
  const date = new Date(iso)
  const day = date.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const time = date.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
  return `${day} · ${time}`
}
</script>
