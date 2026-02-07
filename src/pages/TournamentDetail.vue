<template>
  <div class="min-h-screen bg-gradient-to-br from-background via-background to-muted pb-20">
    <div class="bg-white border-b-2 border-border px-6 py-6 shadow-sm">
      <div class="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div class="flex items-center gap-3">
          <button
            @click="router.push('/tournaments')"
            class="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-secondary active:scale-95 transition-all"
          >
            <i class="pi pi-arrow-left text-xl" />
          </button>
          <div>
            <h1 class="text-3xl font-bold text-foreground">{{ tournament?.name ?? 'Turnier' }}</h1>
            <p class="text-sm text-muted-foreground">
              {{ modeLabel }} • {{ tournamentStartingScore }} {{ tournament?.settings.doubleOut ? 'Double-Out' : 'Single-Out' }}
            </p>
          </div>
        </div>
        <button
          v-if="tournament"
          @click="confirmDelete"
          class="px-4 py-2 rounded-xl bg-destructive text-destructive-foreground font-bold text-sm hover:opacity-90 transition-all"
        >
          Turnier löschen
        </button>
      </div>

      <div class="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6">
        <button
          v-for="tab in tabs"
          :key="tab"
          @click="activeTab = tab"
          class="px-5 py-2.5 rounded-xl whitespace-nowrap font-bold transition-all border-2"
          :class="activeTab === tab
            ? 'bg-primary text-primary-foreground border-primary shadow-md'
            : 'bg-white border-border text-foreground'"
        >
          {{ tabLabels[tab] }}
        </button>
      </div>
    </div>

    <div class="px-6 py-6 space-y-6">
      <div v-if="activeTab === 'players'" class="bg-white border-2 border-border rounded-2xl p-6">
        <h2 class="text-lg font-bold text-foreground mb-4">Spieler</h2>
        <div v-if="playerList.length === 0" class="text-sm text-muted-foreground">Keine Spieler.</div>
        <div v-else class="space-y-3">
          <div
            v-for="player in playerList"
            :key="player.id"
            class="flex items-center justify-between bg-muted/40 border-2 border-border rounded-xl px-4 py-3"
          >
            <div class="flex items-center gap-3">
              <span class="font-semibold text-foreground">{{ player.name }}</span>
              <span
                v-if="groupCount > 1"
                class="text-[11px] font-semibold text-primary bg-primary/10 px-2 py-1 rounded-full"
              >
                Gruppe {{ groupLabel(player.groupIndex ?? 0) }}
              </span>
            </div>
            <span class="text-xs text-muted-foreground">ID: {{ player.id.slice(0, 6) }}</span>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'matches'" class="space-y-6">
        <div class="bg-white border-2 border-border rounded-2xl p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-bold text-foreground">Offene Paarungen</h2>
            <span class="text-xs font-semibold text-muted-foreground">{{ openMatches.length }} offen</span>
          </div>

          <div v-if="openMatches.length === 0" class="text-sm text-muted-foreground">
            Keine offenen Paarungen. Prüfe abgeschlossene Matches oder K.O.-Phase.
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="match in openMatches"
              :key="match.id"
              class="w-full flex items-center justify-between bg-muted/40 border-2 border-border rounded-xl px-4 py-4 text-left transition-all"
              :class="match.status === 'in_progress' ? 'cursor-pointer hover:shadow-md' : ''"
              @click="handleMatchClick(match)"
            >
              <div>
                <div class="font-bold text-foreground">
                  {{ playerName(match.playerAId) }} vs {{ playerName(match.playerBId) }}
                </div>
                <div class="text-xs text-muted-foreground font-semibold mt-1">
                  {{ phaseLabel(match.phase) }}
                  <span v-if="groupCount > 1 && match.groupIndex !== undefined">
                    · Gruppe {{ groupLabel(match.groupIndex) }}
                  </span>
                  · Runde {{ match.round }}
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button
                  v-if="match.status === 'pending'"
                  @click.stop="startMatch(match.id)"
                  class="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold"
                >
                  Starten
                </button>
                <button
                  v-else-if="canResumeMatch(match)"
                  @click.stop="resumeMatch(match.id)"
                  class="px-3 py-1 rounded-full bg-dart-gold text-white text-xs font-bold"
                >
                  Fortsetzen
                </button>
                <button
                  v-else-if="match.status === 'in_progress'"
                  @click.stop="openLiveMatch(match.id)"
                  class="px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-bold"
                >
                  Live ansehen
                </button>
                <span
                  v-else
                  class="px-3 py-1 rounded-full text-xs font-bold bg-muted text-muted-foreground"
                >
                  bereit
                </span>
              </div>
            </div>
          </div>
          <p v-if="matchActionError" class="text-xs text-destructive mt-3">
            {{ matchActionError }}
          </p>
        </div>

        <div class="bg-white border-2 border-border rounded-2xl p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-bold text-foreground">Abgeschlossene Matches</h2>
            <span class="text-xs font-semibold text-muted-foreground">{{ finishedMatchesDetailed.length }} Gesamt</span>
          </div>
          <div v-if="finishedMatchesDetailed.length === 0" class="text-sm text-muted-foreground">
            Noch keine Ergebnisse.
          </div>
          <div v-else class="space-y-6">
            <div
              v-for="entry in paginatedFinishedMatches"
              :key="entry.match.id"
              class="bg-muted/30 border-2 border-border rounded-2xl p-5 shadow-sm"
            >
              <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div>
                  <div class="text-lg font-bold text-foreground">
                    {{ playerName(entry.match.playerAId) }} vs {{ playerName(entry.match.playerBId) }}
                  </div>
                  <div class="text-xs text-muted-foreground font-semibold">
                    {{ phaseLabel(entry.match.phase) }}
                    <span v-if="groupCount > 1 && entry.match.groupIndex !== undefined">
                      · Gruppe {{ groupLabel(entry.match.groupIndex) }}
                    </span>
                    · Runde {{ entry.match.round }}
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <div class="text-xs text-muted-foreground font-semibold">
                    {{ formatDate(entry.match.endedAt) }}
                  </div>
                  <RouterLink
                    :to="matchLink(entry.match.id)"
                    class="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-xs font-bold shadow-sm hover:shadow-md transition-all"
                  >
                    Details
                  </RouterLink>
                </div>
              </div>

              <div class="grid gap-4">
                <MatchPlayerStatsCard v-for="stat in entry.stats" :key="stat.playerId" :stat="stat" />
              </div>
            </div>
          </div>

          <div v-if="totalFinishedPages > 1" class="flex items-center justify-center gap-2 mt-6 flex-wrap">
            <button
              class="px-4 py-2 rounded-full border-2 text-xs font-bold transition-all"
              :class="finishedPage === 1
                ? 'bg-muted text-muted-foreground border-border'
                : 'bg-white text-foreground border-border hover:border-primary hover:text-primary'"
              :disabled="finishedPage === 1"
              @click="finishedPage = Math.max(1, finishedPage - 1)"
            >
              Zurück
            </button>
            <button
              v-for="page in finishedPageNumbers"
              :key="pageKey(page)"
              class="min-w-[38px] px-3 py-2 rounded-full border-2 text-xs font-bold transition-all"
              :class="finishedPage === page
                ? 'bg-primary text-primary-foreground border-primary shadow-md'
                : 'bg-white text-foreground border-border hover:border-primary hover:text-primary'"
              @click="finishedPage = page"
            >
              {{ page }}
            </button>
            <button
              class="px-4 py-2 rounded-full border-2 text-xs font-bold transition-all"
              :class="finishedPage === totalFinishedPages
                ? 'bg-muted text-muted-foreground border-border'
                : 'bg-white text-foreground border-border hover:border-primary hover:text-primary'"
              :disabled="finishedPage === totalFinishedPages"
              @click="finishedPage = Math.min(totalFinishedPages, finishedPage + 1)"
            >
              Weiter
            </button>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'standings'" class="space-y-6">
        <template v-if="isCombined">
          <div class="bg-white border-2 border-border rounded-2xl p-6 space-y-4">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-bold text-foreground">Gruppenphase</h2>
              <span class="text-xs text-muted-foreground">Round Robin</span>
            </div>
            <div v-if="showGroupStandings" class="space-y-6">
              <TournamentStandingsTable
                v-for="group in groupStandingsList"
                :key="groupKey(group.index)"
                :title="group.title"
                :rows="group.rows"
                :player-name="playerName"
                :qualifier-count="qualifierCount"
              />
            </div>
            <div v-else class="text-sm text-muted-foreground">Noch keine Gruppenspiele gespielt.</div>
          </div>

          <div class="bg-white border-2 border-border rounded-2xl p-6 space-y-4">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-bold text-foreground">K.O.-Phase</h2>
              <span class="text-xs text-muted-foreground">Finalrunde</span>
            </div>
            <div v-if="showKnockoutBracket">
              <TournamentBracket
                :matches="knockoutMatchesForView"
                :player-name="bracketPlayerName"
                :results="tournamentResults"
                :show-details="true"
                :subtitle="bracketSubtitle"
                @details="openMatchDetails"
                title="K.O.-Baum"
              />
            </div>
            <div v-else class="text-sm text-muted-foreground">Noch keine K.O.-Spiele vorhanden.</div>
          </div>
        </template>

        <template v-else>
          <div v-if="showKnockoutBracket">
            <TournamentBracket
              :matches="knockoutMatchesForView"
              :player-name="bracketPlayerName"
              :results="tournamentResults"
              :show-details="true"
              :subtitle="bracketSubtitle"
              @details="openMatchDetails"
              title="K.O.-Baum"
            />
          </div>
          <div v-if="showGroupStandings" class="space-y-6">
            <TournamentStandingsTable
              v-for="group in groupStandingsList"
              :key="groupKey(group.index)"
              :title="group.title"
              :rows="group.rows"
              :player-name="playerName"
              :qualifier-count="qualifierCount"
            />
          </div>
          <TournamentStandingsTable
            v-if="showFinalStandings"
            title="Schlussrangliste"
            :rows="finalStandings"
            :player-name="playerName"
          />
          <div
            v-if="!showGroupStandings && !showFinalStandings && !showKnockoutBracket"
            class="bg-white border-2 border-border rounded-2xl p-6 text-sm text-muted-foreground"
          >
            Noch keine Spiele gespielt.
          </div>
        </template>
      </div>

      <div v-else class="space-y-6">
        <TournamentLeaderboardTable
          v-if="leaderboard.length > 0"
          title="Leaderboard (alle Spiele)"
          :rows="leaderboard"
        />
        <div v-else class="bg-white border-2 border-border rounded-2xl p-6 text-sm text-muted-foreground">
          Noch keine Match-Statistiken verfügbar.
        </div>
      </div>
    </div>
    <LiveMatchModal
      :open="Boolean(liveMatchId)"
      :match="liveMatch"
      :snapshot="liveSnapshot"
      :player-name="playerName"
      :error="liveError"
      @close="closeLiveMatch"
    />
    <MatchDetailsModal
      :open="Boolean(selectedMatchId)"
      :match="selectedMatch"
      :stats="selectedMatchStats"
      :player-name="playerName"
      @close="closeMatchDetails"
    />
    <ConfirmDialog
      :open="showDeleteDialog"
      title="Turnier löschen"
      :message="deleteMessage"
      confirm-label="Löschen"
      cancel-label="Abbrechen"
      tone="danger"
      @confirm="handleDelete"
      @cancel="showDeleteDialog = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePlayersStore } from '@/stores/playersStore'
import { useTournamentsStore } from '@/stores/tournamentsStore'
import { useGameStore } from '@/stores/gameStore'
import type { TournamentMatch } from '@/domain/models'
import type { MatchPlayerSummary } from '@/domain/matchSummary'
import MatchPlayerStatsCard from '@/components/MatchPlayerStatsCard.vue'
import TournamentStandingsTable from '@/components/TournamentStandingsTable.vue'
import TournamentBracket from '@/components/TournamentBracket.vue'
import MatchDetailsModal from '@/components/MatchDetailsModal.vue'
import LiveMatchModal from '@/components/LiveMatchModal.vue'
import TournamentLeaderboardTable from '@/components/TournamentLeaderboardTable.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import type { LiveMatchSnapshot } from '@/domain/liveMatch'
import { resolveMatchFormat } from '@/domain/tournamentFormat'

const router = useRouter()
const route = useRoute()
const tournamentsStore = useTournamentsStore()
const playersStore = usePlayersStore()
const gameStore = useGameStore()

const activeTab = ref<'players' | 'matches' | 'standings' | 'stats'>('standings')
const tabs = ['players', 'matches', 'standings', 'stats'] as const
const tabLabels = computed<Record<typeof tabs[number], string>>(() => ({
  players: 'Spieler',
  matches: 'Spielplan',
  standings: tournament.value?.mode === 'round_robin' ? 'Tabelle' : 'K.O.-Baum',
  stats: 'Statistiken'
}))

const tournamentId = computed(() => (Array.isArray(route.params.id) ? route.params.id[0] : route.params.id))
const tournament = computed(() => tournamentsStore.getTournament(tournamentId.value))

const playerIds = computed(() => tournamentsStore.getTournamentPlayers(tournamentId.value))
const playerList = computed(() =>
  tournamentsStore.tournamentPlayers
    .filter((entry) => entry.tournamentId === tournamentId.value)
    .map((entry) => ({
      id: entry.playerId,
      name: playersStore.players.find((player) => player.id === entry.playerId)?.name ?? entry.playerId,
      groupIndex: entry.groupIndex ?? 0
    }))
)

const matches = computed(() => tournamentsStore.getAllMatches(tournamentId.value))
const knockoutMatches = computed(() => matches.value.filter((match) => match.phase === 'knockout'))
const isMatchFinished = (match: TournamentMatch) =>
  match.status === 'finished' || Boolean(tournamentsStore.getResultsByMatch(match.id))

const openMatches = computed(() =>
  matches.value
    .filter((match) => !isMatchFinished(match))
    .slice()
    .sort((a, b) => {
      const rank = (status: string) => (status === 'in_progress' ? 0 : 1)
      return rank(a.status) - rank(b.status) || a.order - b.order
    })
)
const finishedMatches = computed(() => matches.value.filter((match) => isMatchFinished(match)))
const tournamentResults = computed(() =>
  tournamentsStore.results.filter((entry) => entry.tournamentId === tournamentId.value)
)
interface FinishedMatchEntry {
  match: TournamentMatch
  stats: MatchPlayerSummary[]
}

const finishedMatchesDetailed = computed<FinishedMatchEntry[]>(() => {
  return finishedMatches.value
    .map((match) => {
      const result = tournamentsStore.getResultsByMatch(match.id)
      if (!result) return null
      const stats = result.stats.map((stat) => ({
        ...stat,
        average: stat.average ?? 0,
        checkoutRate: stat.checkoutRate ?? 0,
        checkoutAttempts: stat.checkoutAttempts ?? 0,
        checkoutHits: stat.checkoutHits ?? 0,
        doubleDarts: stat.doubleDarts ?? 0,
        count100Plus: stat.count100Plus ?? 0,
        count140Plus: stat.count140Plus ?? 0,
        count180: stat.count180 ?? 0,
        totalDarts: stat.totalDarts ?? 0,
        totalPoints: stat.totalPoints ?? 0,
        highestCheckout: stat.highestCheckout ?? 0,
        legsWon: stat.legsWon ?? 0,
        legsLost: stat.legsLost ?? 0
      }))
      return { match, stats }
    })
    .filter((entry): entry is FinishedMatchEntry => Boolean(entry))
    .sort((a, b) => {
      const timeA = a.match.endedAt ? new Date(a.match.endedAt).getTime() : 0
      const timeB = b.match.endedAt ? new Date(b.match.endedAt).getTime() : 0
      return timeB - timeA
    })
})

const selectedMatchId = ref<string | null>(null)
const selectedMatch = computed(() => matches.value.find((match) => match.id === selectedMatchId.value) ?? null)
const selectedMatchStats = computed(() => {
  if (!selectedMatchId.value) return []
  const result = tournamentsStore.getResultsByMatch(selectedMatchId.value)
  if (!result) return []
  return result.stats.map((stat) => ({
    ...stat,
    average: stat.average ?? 0,
    checkoutRate: stat.checkoutRate ?? 0,
    checkoutAttempts: stat.checkoutAttempts ?? 0,
    checkoutHits: stat.checkoutHits ?? 0,
    doubleDarts: stat.doubleDarts ?? 0,
    count100Plus: stat.count100Plus ?? 0,
    count140Plus: stat.count140Plus ?? 0,
    count180: stat.count180 ?? 0,
    totalDarts: stat.totalDarts ?? 0,
    totalPoints: stat.totalPoints ?? 0,
    highestCheckout: stat.highestCheckout ?? 0,
    legsWon: stat.legsWon ?? 0,
    legsLost: stat.legsLost ?? 0
  }))
})

const liveMatchId = ref<string | null>(null)
const liveSnapshot = ref<LiveMatchSnapshot | null>(null)
const liveError = ref('')
const matchActionError = ref('')

const liveMatch = computed(() => matches.value.find((match) => match.id === liveMatchId.value) ?? null)

const openLiveMatch = (matchId: string) => {
  selectedMatchId.value = null
  liveMatchId.value = matchId
  liveSnapshot.value = gameStore.getLocalSnapshot(matchId)
  liveError.value = liveSnapshot.value ? '' : 'Kein Live-Stand gespeichert.'
}

const closeLiveMatch = () => {
  liveMatchId.value = null
  liveSnapshot.value = null
  liveError.value = ''
}

const openMatchDetails = (matchId: string) => {
  const match = matches.value.find((entry) => entry.id === matchId)
  if (!match) return
  if (isMatchFinished(match)) {
    selectedMatchId.value = matchId
    return
  }
  if (match.status === 'in_progress') {
    openLiveMatch(matchId)
  }
}

const closeMatchDetails = () => {
  selectedMatchId.value = null
}

const finishedPage = ref(1)
const pageSize = 10
const totalFinishedPages = computed(() => Math.max(1, Math.ceil(finishedMatchesDetailed.value.length / pageSize)))
const finishedPageNumbers = computed(() =>
  Array.from({ length: totalFinishedPages.value }, (_, index) => index + 1)
)
const paginatedFinishedMatches = computed(() => {
  const start = (finishedPage.value - 1) * pageSize
  return finishedMatchesDetailed.value.slice(start, start + pageSize)
})

watch(
  () => finishedMatchesDetailed.value.length,
  () => {
    if (finishedPage.value > totalFinishedPages.value) {
      finishedPage.value = totalFinishedPages.value
    }
  }
)

const groupCount = computed(() => tournament.value?.settings.groupCount ?? 1)
const groupStandings = computed(() => tournamentsStore.calculateStandings(tournamentId.value, 'round_robin'))
const finalStandings = computed(() => tournamentsStore.calculateStandings(tournamentId.value, 'all'))
const leaderboard = computed(() => tournamentsStore.calculateLeaderboards(tournamentId.value))
const qualifierCount = computed(() => (tournament.value?.mode === 'combined' ? 2 : 0))

const groupLabel = (index: number) => String.fromCharCode(65 + index)

const groupStandingsList = computed(() => {
  if (!tournament.value || tournament.value.mode === 'knockout') return []
  const count = groupCount.value
  if (count <= 1) {
    return groupStandings.value.length > 0
      ? [{ index: 0, label: 'A', title: 'Rangliste Gruppenphase', rows: groupStandings.value }]
      : []
  }
  return Array.from({ length: count }, (_, index) => {
    const rows = tournamentsStore.calculateStandings(tournamentId.value, 'round_robin', index)
    return {
      index,
      label: groupLabel(index),
      title: `Rangliste Gruppe ${groupLabel(index)}`,
      rows
    }
  }).filter((entry) => entry.rows.length > 0)
})

const showGroupStandings = computed(() => {
  if (!tournament.value) return false
  if (tournament.value.mode === 'knockout') return false
  return groupStandingsList.value.length > 0
})

const showFinalStandings = computed(() => {
  if (!tournament.value) return false
  if (tournament.value.mode !== 'round_robin') return false
  return finalStandings.value.length > 0
})

const showKnockoutBracket = computed(() => {
  if (!tournament.value) return false
  if (tournament.value.mode === 'round_robin') return false
  return true
})

const isCombined = computed(() => tournament.value?.mode === 'combined')
const isKnockout = computed(() => tournament.value?.mode === 'knockout')

const combinedSeedLabels = computed(() => {
  if (!isCombined.value) return []
  const labels: string[] = []
  for (let index = 0; index < groupCount.value; index += 1) {
    const label = groupLabel(index)
    labels.push(`1. Gruppe ${label}`)
    labels.push(`2. Gruppe ${label}`)
  }
  return labels
})

const combinedSeedIds = computed(() => combinedSeedLabels.value.map((_, index) => `seed-${index}`))

const placeholderNameMap = computed(() => {
  const map = new Map<string, string>()
  combinedSeedLabels.value.forEach((label, index) => {
    map.set(`seed-${index}`, label)
  })
  return map
})

const buildPlaceholderMatches = (seedIds: string[], tournamentIdValue: string) => {
  const size = Math.pow(2, Math.ceil(Math.log2(Math.max(seedIds.length, 2))))
  const seeds = [...seedIds]
  while (seeds.length < size) seeds.push('TBD')
  const rounds = Math.max(1, Math.log2(size))
  const matches: TournamentMatch[] = []
  let order = 1
  let gameNumber = 1
  let previousRoundIds: string[] = []

  for (let round = 1; round <= rounds; round += 1) {
    const matchCount = size / Math.pow(2, round)
    const currentRoundIds: string[] = []
    for (let index = 0; index < matchCount; index += 1) {
      let playerAId = 'TBD'
      let playerBId = 'TBD'
      if (round === 1) {
        playerAId = seeds[index] ?? 'TBD'
        playerBId = seeds[size - 1 - index] ?? 'TBD'
      } else {
        const left = previousRoundIds[index * 2]
        const right = previousRoundIds[index * 2 + 1]
        playerAId = left ? `winner:${left}` : 'TBD'
        playerBId = right ? `winner:${right}` : 'TBD'
      }
      const id = `game-${gameNumber}`
      currentRoundIds.push(id)
      matches.push({
        id,
        tournamentId: tournamentIdValue,
        phase: 'knockout',
        round,
        order: order++,
        playerAId,
        playerBId,
        status: 'pending'
      })
      gameNumber += 1
    }
    previousRoundIds = currentRoundIds
  }
  return matches
}

const knockoutSeedIds = computed(() => {
  if (isCombined.value) return combinedSeedIds.value
  if (!isKnockout.value) return []
  return playerList.value.map((player) => player.id)
})

const knockoutMatchesForView = computed(() => {
  if (!tournament.value) return knockoutMatches.value
  const seedIds = knockoutSeedIds.value
  if (seedIds.length === 0) return knockoutMatches.value
  const placeholder = buildPlaceholderMatches(seedIds, tournamentId.value ?? 'preview')
  if (knockoutMatches.value.length === 0) return placeholder

  const placeholderByRound = new Map<number, TournamentMatch[]>()
  placeholder.forEach((match) => {
    const list = placeholderByRound.get(match.round) ?? []
    list.push(match)
    placeholderByRound.set(match.round, list)
  })
  placeholderByRound.forEach((list) => list.sort((a, b) => a.order - b.order))

  const actualByRound = new Map<number, TournamentMatch[]>()
  knockoutMatches.value.forEach((match) => {
    const list = actualByRound.get(match.round) ?? []
    list.push(match)
    actualByRound.set(match.round, list)
  })
  actualByRound.forEach((list) => list.sort((a, b) => a.order - b.order))

  const merged = [...placeholder]
  actualByRound.forEach((list, round) => {
    const placeholders = placeholderByRound.get(round) ?? []
    list.forEach((match, index) => {
      const target = placeholders[index]
      if (!target) {
        merged.push(match)
        return
      }
      const targetIndex = merged.findIndex((entry) => entry.id === target.id)
      if (targetIndex >= 0) merged[targetIndex] = match
    })
  })
  return merged
})

const bracketPlayerName = (playerId: string) =>
  placeholderNameMap.value.get(playerId) ?? playerName(playerId)

const playerName = (playerId: string) =>
  playersStore.players.find((player) => player.id === playerId)?.name ?? 'Unbekannt'

const phaseLabel = (phase: string) => (phase === 'round_robin' ? 'Round Robin' : 'K.O.-Phase')

const modeLabel = computed(() => {
  if (!tournament.value) return ''
  if (tournament.value.mode === 'round_robin') return 'Round Robin'
  if (tournament.value.mode === 'knockout') return 'K.O.-Phase'
  return 'Kombi'
})
const tournamentStartingScore = computed(() => tournament.value?.settings.startingScore ?? 501)
const hasKnockoutRoundOverrides = computed(() => {
  const overrides = tournament.value?.settings.formatByPhase?.knockoutRounds
  return overrides ? Object.keys(overrides).length > 0 : false
})

const bracketSubtitle = computed(() => {
  if (hasKnockoutRoundOverrides.value) {
    return 'Format je Runde'
  }
  const format =
    tournament.value?.settings.formatByPhase?.knockout ??
    tournament.value?.settings.format
  if (!format) return ''
  if (format.type === 'best_of') {
    const bestOf = format.bestOf ?? (format.legsToWin ? format.legsToWin * 2 - 1 : undefined)
    return bestOf ? `Best of ${bestOf}` : ''
  }
  const legs = format.legsToWin ?? format.bestOf
  return legs ? `Race to ${legs} legs` : ''
})

const formatDate = (value?: string) => {
  if (!value) return ''
  const date = new Date(value)
  const day = date.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const time = date.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
  return `${day} · ${time}`
}

const showDeleteDialog = ref(false)
const confirmDelete = () => {
  if (!tournament.value) return
  showDeleteDialog.value = true
}

const deleteMessage = computed(() =>
  tournament.value ? `Willst du "${tournament.value.name}" wirklich löschen?` : ''
)

const matchLink = (matchId: string) => `/matches/${matchId}`
const pageKey = (page: number) => `page-${page}`
const groupKey = (groupIndex: number) => `group-${groupIndex}`

const handleDelete = () => {
  if (!tournament.value) return
  tournamentsStore.deleteTournament(tournament.value.id)
  showDeleteDialog.value = false
  router.push('/tournaments')
}

const canResumeMatch = (match: TournamentMatch) =>
  match.status === 'in_progress' && !isMatchFinished(match)

const handleMatchClick = (match: TournamentMatch) => {
  if (match.status !== 'in_progress') return
  openLiveMatch(match.id)
}

const resumeMatch = async (matchId: string) => {
  matchActionError.value = ''
  try {
    await gameStore.resumeMatch({ matchId, tournamentScope: 'local' })
    router.push('/game')
  } catch (err) {
    matchActionError.value = (err as Error).message ?? 'Match konnte nicht fortgesetzt werden.'
  }
}

const startMatch = (matchId: string) => {
  matchActionError.value = ''
  const match = matches.value.find((entry) => entry.id === matchId)
  if (!match || !tournament.value) return
  const playerA = playersStore.players.find((player) => player.id === match.playerAId)
  const playerB = playersStore.players.find((player) => player.id === match.playerBId)
  if (!playerA || !playerB) return

  tournamentsStore.markMatchInProgress(match.id)
  const matchFormat = resolveMatchFormat(tournament.value, match)
  gameStore.startNewMatch(playerA.name, playerB.name, {
    doubleOut: tournament.value.settings.doubleOut,
    format: matchFormat,
    tournamentId: tournament.value.id,
    matchId: match.id,
    playerA,
    playerB,
    startingScore: tournament.value.settings.startingScore ?? 501,
    tournamentScope: 'local'
  })
  router.push('/game')
}
</script>
