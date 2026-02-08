<template>
  <div class="min-h-screen bg-gradient-to-br from-background via-background to-muted pb-20">
    <div class="bg-white border-b-2 border-border px-6 py-8 shadow-sm">
      <div class="flex items-center gap-3 mb-2">
        <div class="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-md">
          <span class="text-primary-foreground text-xl">🎯</span>
        </div>
        <div>
          <h1 class="text-4xl font-bold text-foreground">CheckOut</h1>
          <p class="text-sm text-muted-foreground">Vereins-Scoring & Statistiken</p>
        </div>
      </div>
    </div>

    <div class="px-6 py-8 space-y-4">
      <RouterLink
        to="/new-game"
        class="w-full bg-primary text-primary-foreground rounded-2xl py-8 px-6 flex items-center justify-between shadow-lg active:scale-98 transition-all hover:shadow-xl"
      >
        <div class="flex items-center gap-4">
          <div class="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
            <i class="pi pi-plus text-2xl" />
          </div>
          <span class="text-2xl font-bold">Neues Spiel</span>
        </div>
      </RouterLink>

      <div class="grid grid-cols-2 gap-4">
        <RouterLink
          to="/tournaments"
          class="bg-white border-2 border-border rounded-2xl py-6 px-4 flex flex-col items-center gap-3 active:scale-98 transition-all hover:shadow-lg"
        >
          <div class="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <i class="pi pi-trophy text-2xl text-primary" />
          </div>
          <span class="font-bold text-lg">Turniere</span>
        </RouterLink>

        <RouterLink
          to="/stats"
          class="bg-white border-2 border-border rounded-2xl py-6 px-4 flex flex-col items-center gap-3 active:scale-98 transition-all hover:shadow-lg"
        >
          <div class="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <i class="pi pi-chart-bar text-2xl text-primary" />
          </div>
          <span class="font-bold text-lg">Statistiken</span>
        </RouterLink>
      </div>
    </div>

    <div class="px-6 py-4">
      <div class="bg-white border-2 border-primary/15 rounded-3xl p-6 shadow-lg">
        <div class="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div class="flex items-center gap-2">
            <i class="pi pi-clock text-muted-foreground" />
            <h2 class="text-xl font-bold text-foreground">Letzte Spiele</h2>
          </div>
          <span class="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">Letzte 10</span>
        </div>

        <div v-if="recentMatches.length === 0" class="bg-white border-2 border-dashed border-border rounded-2xl py-16 px-6 text-center">
          <span class="text-4xl text-muted-foreground mx-auto mb-4 opacity-40">🎯</span>
          <p class="text-lg font-semibold text-muted-foreground mb-1">Noch keine Spiele gespielt</p>
          <p class="text-sm text-muted-foreground">Starte dein erstes Match!</p>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="match in recentMatches"
            :key="match.id"
            class="bg-muted/30 border-2 border-border rounded-2xl p-4 shadow-sm"
          >
            <div class="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div class="text-base font-bold text-foreground">
                  {{ match.players.map((player) => player.name).join(' vs ') }}
                </div>
                <div class="text-xs text-muted-foreground font-semibold">
                  {{ match.startingScore ?? match.mode }} · {{ match.doubleOut ? 'Double-Out' : 'Single-Out' }}
                  <span v-if="matchScore(match)"> · {{ matchScore(match) }}</span>
                </div>
              </div>
              <div class="flex items-center gap-3">
                <div class="text-xs text-muted-foreground font-semibold">{{ formatDate(match.endedAt) }}</div>
                <button
                  class="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-xs font-bold shadow-sm hover:shadow-md transition-all"
                  @click="openMatch(match.id)"
                >
                  Details
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="px-6 py-4">
      <div class="flex items-center gap-2 mb-4">
        <i class="pi pi-user text-muted-foreground" />
        <h2 class="text-xl font-bold text-foreground">Profil</h2>
      </div>

      <div class="bg-white border-2 border-border rounded-xl p-6">
        <div class="flex items-center gap-4 mb-5">
          <div class="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
            <i class="pi pi-user text-2xl text-primary" />
          </div>
          <div>
            <div class="text-lg font-bold text-foreground">{{ auth.profile?.displayName || 'Spieler' }}</div>
            <div class="text-sm text-muted-foreground">@{{ auth.profile?.username || 'user' }}</div>
          </div>
        </div>
        <button
          @click="auth.logout()"
          class="w-full bg-secondary text-secondary-foreground rounded-xl py-4 px-4 flex items-center justify-center gap-2 active:scale-98 transition-all hover:bg-secondary/70 font-bold"
        >
          <i class="pi pi-sign-out" />
          <span>Abmelden</span>
        </button>
      </div>
    </div>
  </div>

  <MatchSummaryModal :open="Boolean(selectedMatch)" :match="selectedMatch" @close="closeMatch" />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useMatchHistoryStore } from '@/stores/matchHistoryStore'
import MatchSummaryModal from '@/components/MatchSummaryModal.vue'
import type { MatchSummary } from '@/domain/matchSummary'

const auth = useAuthStore()
const matchHistory = useMatchHistoryStore()
const recentMatches = computed(() => matchHistory.matches)

const selectedMatchId = ref<string | null>(null)
const selectedMatch = computed<MatchSummary | null>(() => {
  if (!selectedMatchId.value) return null
  return matchHistory.matches.find((match) => match.id === selectedMatchId.value) ?? null
})

const openMatch = (matchId: string) => {
  selectedMatchId.value = matchId
}

const closeMatch = () => {
  selectedMatchId.value = null
}

const matchScore = (match: MatchSummary) => {
  if (!match.stats || match.stats.length < 2) return ''
  const [a, b] = match.stats
  return `${a.legsWon}:${b.legsWon}`
}

const formatDate = (iso: string) => {
  const date = new Date(iso)
  const day = date.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const time = date.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
  return `${day} · ${time}`
}
</script>
