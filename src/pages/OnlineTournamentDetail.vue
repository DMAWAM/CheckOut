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
            <h1 class="text-3xl font-bold text-foreground">{{ tournament?.name ?? 'Online-Turnier' }}</h1>
            <p class="text-sm text-muted-foreground">
              {{ modeLabel }} • {{ tournamentStartingScore }} {{ tournament?.settings.doubleOut ? 'Double-Out' : 'Single-Out' }}
            </p>
          </div>
        </div>
        <button
          v-if="isAdmin && tournament"
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
      <div v-if="activeTab === 'players'" class="space-y-4">
        <div class="bg-white border-2 border-border rounded-2xl p-6">
          <h2 class="text-lg font-bold text-foreground mb-4">Spieler</h2>
          <div v-if="players.length === 0" class="text-sm text-muted-foreground">Keine Spieler.</div>
          <div v-else class="space-y-3">
            <div
              v-for="player in players"
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
              <span class="text-xs text-muted-foreground">@{{ player.username }}</span>
            </div>
          </div>
        </div>

        <div v-if="isAdmin" class="bg-white border-2 border-border rounded-2xl p-6">
          <h2 class="text-lg font-bold text-foreground mb-3">Invite-Code</h2>
          <div class="flex items-center gap-3">
            <input
              v-model="inviteCode"
              readonly
              class="flex-1 px-4 py-3 border-2 border-border rounded-xl bg-muted/30 text-foreground"
            />
            <button
              @click="copyInvite"
              class="px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold"
            >
              Kopieren
            </button>
          </div>
          <p class="text-xs text-muted-foreground mt-2">
            Teile diesen Code, damit andere dem Turnier beitreten können.
          </p>
        </div>

        <div v-if="isAdmin" class="bg-white border-2 border-border rounded-2xl p-6 space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-bold text-foreground">Spieler-Logins generieren</h2>
            <button
              class="text-xs font-bold text-primary"
              @click="refreshLoginCodes"
            >
              Aktualisieren
            </button>
          </div>
          <p class="text-sm text-muted-foreground">
            Gib die Spielernamen ein (eine Zeile pro Spieler). Wir erstellen Username + Code und erzeugen QR-Codes.
          </p>
          <textarea
            v-model="newPlayersInput"
            rows="6"
            placeholder="Max Mustermann&#10;Mike Beispiel&#10;..."
            class="w-full px-4 py-3 border-2 border-border rounded-xl focus:border-primary focus:outline-none bg-background text-foreground"
          />
          <div class="flex flex-wrap items-center gap-3">
            <button
              @click="generatePlayerLogins"
              class="bg-primary text-primary-foreground rounded-xl px-5 py-3 font-bold"
            >
              Codes generieren
            </button>
            <span v-if="generateInfo" class="text-xs text-muted-foreground">{{ generateInfo }}</span>
          </div>
          <p v-if="generateError" class="text-xs text-destructive">{{ generateError }}</p>
        </div>

        <div v-if="isAdmin && loginCodes.length > 0" class="bg-white border-2 border-border rounded-2xl p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-bold text-foreground">Login-Codes</h2>
            <span class="text-xs text-muted-foreground font-semibold">{{ loginCodes.length }} Spieler</span>
          </div>
          <div class="grid gap-4">
            <div
              v-for="entry in loginCodes"
              :key="entry.playerId"
              class="flex flex-wrap items-center justify-between gap-4 border-2 border-border rounded-xl px-4 py-3 bg-muted/20"
            >
              <div class="space-y-1">
                <div class="font-bold text-foreground">{{ entry.name }}</div>
                <div class="text-xs text-muted-foreground">@{{ entry.username }}</div>
                <div class="text-sm font-semibold text-foreground">Code: <span class="text-primary">{{ entry.code }}</span></div>
                <div class="text-xs text-muted-foreground">
                  Login-Link: {{ loginUrl(entry) }}
                </div>
                <button
                  class="text-xs font-bold text-primary"
                  @click="copyLogin(entry)"
                >
                  Login-Daten kopieren
                </button>
              </div>
              <div class="w-28 h-28 bg-white border-2 border-border rounded-xl flex items-center justify-center">
                <img v-if="qrMap[entry.playerId]" :src="qrMap[entry.playerId]" alt="QR" class="w-24 h-24" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'matches'" class="space-y-6">
        <div v-if="isAdmin && matches.length === 0" class="bg-white border-2 border-border rounded-2xl p-6">
          <h2 class="text-lg font-bold text-foreground mb-3">Spielplan erstellen</h2>
          <p class="text-sm text-muted-foreground mb-4">
            Erstelle den Spielplan, sobald alle Spieler beigetreten sind.
          </p>
          <button
            @click="generateSchedule"
            class="bg-primary text-primary-foreground rounded-xl px-5 py-3 font-bold"
          >
            Spielplan erstellen
          </button>
          <p v-if="scheduleError" class="text-xs text-destructive mt-3">
            {{ scheduleError }}
          </p>
        </div>

        <div class="bg-white border-2 border-border rounded-2xl p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-bold text-foreground">Offene Paarungen</h2>
            <span class="text-xs font-semibold text-muted-foreground">{{ openMatches.length }} offen</span>
          </div>

          <div v-if="openMatches.length === 0" class="text-sm text-muted-foreground">
            Keine offenen Paarungen. Prüfe laufende oder beendete Matches.
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="match in openMatches"
              :key="match.id"
              class="w-full flex items-center justify-between bg-muted/40 border-2 border-border rounded-xl px-4 py-4 text-left"
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
              <div>
                <button
                  v-if="canStartMatch(match)"
                  @click="startMatch(match.id)"
                  class="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold"
                >
                  Starten
                </button>
                <span
                  v-else
                  class="px-3 py-1 rounded-full text-xs font-bold"
                  :class="match.status === 'in_progress'
                    ? 'bg-dart-gold/20 text-dart-gold'
                    : 'bg-muted text-muted-foreground'"
                >
                  {{ match.status === 'in_progress' ? 'läuft' : 'bereit' }}
                </span>
              </div>
            </div>
          </div>
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
                <div class="text-xs text-muted-foreground font-semibold">
                  {{ formatDate(entry.match.endedAt) }}
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
                :results="results"
                :show-details="true"
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
              :results="results"
              :show-details="true"
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
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useOnlineTournamentsStore } from '@/stores/onlineTournamentsStore'
import { useAuthStore } from '@/stores/authStore'
import { useGameStore } from '@/stores/gameStore'
import MatchPlayerStatsCard from '@/components/MatchPlayerStatsCard.vue'
import TournamentStandingsTable from '@/components/TournamentStandingsTable.vue'
import TournamentLeaderboardTable from '@/components/TournamentLeaderboardTable.vue'
import TournamentBracket from '@/components/TournamentBracket.vue'
import MatchDetailsModal from '@/components/MatchDetailsModal.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import QRCode from 'qrcode'
import type { TournamentMatch } from '@/domain/models'
import type { MatchPlayerSummary } from '@/domain/matchSummary'

const router = useRouter()
const route = useRoute()
const onlineStore = useOnlineTournamentsStore()
const auth = useAuthStore()
const gameStore = useGameStore()

const activeTab = ref<'players' | 'matches' | 'standings' | 'stats'>('matches')
const tabs = ['players', 'matches', 'standings', 'stats'] as const
const tabLabels = computed<Record<typeof tabs[number], string>>(() => ({
  players: 'Spieler',
  matches: 'Spielplan',
  standings: tournament.value?.mode === 'round_robin' ? 'Tabelle' : 'K.O.-Baum',
  stats: 'Statistiken'
}))

const tournamentId = computed(() => (Array.isArray(route.params.id) ? route.params.id[0] : route.params.id))
const tournament = computed(() => onlineStore.currentTournament)
const players = computed(() => onlineStore.players)
const matches = computed(() => onlineStore.matches)
const results = computed(() => onlineStore.results)
const knockoutMatches = computed(() => matches.value.filter((match) => match.phase === 'knockout'))
const loginCodes = computed(() => onlineStore.loginCodes)

const isAdmin = computed(() => auth.session?.user?.id === tournament.value?.createdBy)
const groupCount = computed(() => tournament.value?.settings.groupCount ?? 1)
const qualifierCount = computed(() => (tournament.value?.mode === 'combined' ? 2 : 0))
const tournamentStartingScore = computed(() => tournament.value?.settings.startingScore ?? 501)

const openMatches = computed(() => matches.value.filter((match) => match.status !== 'finished'))
const finishedMatches = computed(() => matches.value.filter((match) => match.status === 'finished'))

interface FinishedMatchEntry {
  match: TournamentMatch
  stats: MatchPlayerSummary[]
}

const finishedMatchesDetailed = computed<FinishedMatchEntry[]>(() => {
  return finishedMatches.value
    .map((match) => {
      const result = results.value.find((entry) => entry.matchId === match.id)
      if (!result) return null
      return { match, stats: result.stats as MatchPlayerSummary[] }
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
  const result = results.value.find((entry) => entry.matchId === selectedMatchId.value)
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

const openMatchDetails = (matchId: string) => {
  selectedMatchId.value = matchId
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

const groupLabel = (index: number) => String.fromCharCode(65 + index)

const groupStandingsList = computed(() => {
  if (!tournament.value || tournament.value.mode === 'knockout') return []
  const count = groupCount.value
  if (count <= 1) {
    const rows = onlineStore.standingsByGroup(0)
    return rows.length > 0 ? [{ index: 0, title: 'Rangliste Gruppenphase', rows }] : []
  }
  return Array.from({ length: count }, (_, index) => {
    const rows = onlineStore.standingsByGroup(index)
    return {
      index,
      title: `Rangliste Gruppe ${groupLabel(index)}`,
      rows
    }
  }).filter((entry) => entry.rows.length > 0)
})

const finalStandings = computed(() => onlineStore.finalStandings)
const leaderboard = computed(() => onlineStore.leaderboards)

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
  for (let round = 1; round <= rounds; round += 1) {
    const matchCount = size / Math.pow(2, round)
    for (let index = 0; index < matchCount; index += 1) {
      let playerAId = 'TBD'
      let playerBId = 'TBD'
      if (round === 1) {
        playerAId = seeds[index] ?? 'TBD'
        playerBId = seeds[size - 1 - index] ?? 'TBD'
      }
      matches.push({
        id: `placeholder-${tournamentIdValue}-${round}-${index}`,
        tournamentId: tournamentIdValue,
        phase: 'knockout',
        round,
        order: order++,
        playerAId,
        playerBId,
        status: 'pending'
      })
    }
  }
  return matches
}

const knockoutSeedIds = computed(() => {
  if (isCombined.value) return combinedSeedIds.value
  if (!isKnockout.value) return []
  return players.value.map((player) => player.id)
})

const knockoutMatchesForView = computed(() => {
  if (knockoutMatches.value.length > 0) return knockoutMatches.value
  if (!tournament.value) return knockoutMatches.value
  const seedIds = knockoutSeedIds.value
  if (seedIds.length === 0) return knockoutMatches.value
  return buildPlaceholderMatches(seedIds, tournamentId.value ?? 'preview')
})

const bracketPlayerName = (playerId: string) => {
  if (playerId === 'TBD') return 'TBD'
  return placeholderNameMap.value.get(playerId) ?? playerName(playerId)
}

const inviteCode = ref('')
const scheduleError = ref('')
const newPlayersInput = ref('')
const generateError = ref('')
const generateInfo = ref('')
const qrMap = ref<Record<string, string>>({})

onMounted(async () => {
  if (!tournamentId.value) return
  await onlineStore.fetchTournamentDetail(tournamentId.value)
  if (isAdmin.value && tournamentId.value) {
    const code = await onlineStore.getOrCreateInvite(tournamentId.value)
    inviteCode.value = code ?? ''
    await onlineStore.fetchLoginCodes(tournamentId.value)
  }
})

const copyInvite = async () => {
  if (!inviteCode.value) return
  await navigator.clipboard.writeText(inviteCode.value)
}

const generateSchedule = async () => {
  scheduleError.value = ''
  try {
    await onlineStore.generateSchedule()
  } catch (err) {
    scheduleError.value = (err as Error).message ?? 'Spielplan konnte nicht erstellt werden.'
  }
}

const loginUrl = (entry: { username: string; code: string }) => {
  if (typeof window === 'undefined') return ''
  const origin = window.location.origin
  const base = import.meta.env.BASE_URL ?? '/'
  return `${origin}${base}?u=${encodeURIComponent(entry.username)}&c=${encodeURIComponent(entry.code)}&t=${encodeURIComponent(
    tournamentId.value ?? ''
  )}`
}

const buildQrCodes = async (entries: typeof loginCodes.value) => {
  const nextMap: Record<string, string> = {}
  for (const entry of entries) {
    const url = loginUrl(entry)
    if (!url) continue
    try {
      nextMap[entry.playerId] = await QRCode.toDataURL(url, { width: 192, margin: 1 })
    } catch (err) {
      console.warn('QR generation failed', err)
    }
  }
  qrMap.value = nextMap
}

watch(
  () => loginCodes.value,
  async (entries) => {
    if (entries.length === 0) return
    await buildQrCodes(entries)
  },
  { immediate: true }
)

const parseNames = () =>
  newPlayersInput.value
    .split(/\n|,|;/)
    .map((value) => value.trim())
    .filter(Boolean)

const generatePlayerLogins = async () => {
  generateError.value = ''
  generateInfo.value = ''
  if (!tournamentId.value) return
  const names = parseNames()
  if (names.length === 0) {
    generateError.value = 'Bitte mindestens einen Namen eingeben.'
    return
  }
  try {
    const codes = await onlineStore.generateLoginCodes(tournamentId.value, names)
    generateInfo.value = `${codes.length} Logins erstellt.`
    newPlayersInput.value = ''
    await buildQrCodes(codes)
  } catch (err) {
    generateError.value = (err as Error).message ?? 'Konnte keine Logins erstellen.'
  }
}

const refreshLoginCodes = async () => {
  if (!tournamentId.value) return
  await onlineStore.fetchLoginCodes(tournamentId.value)
  await buildQrCodes(loginCodes.value)
}

const copyLogin = async (entry: { username: string; code: string }) => {
  const text = `Login: ${entry.username}\nCode: ${entry.code}\nLink: ${loginUrl(entry)}`
  await navigator.clipboard.writeText(text)
}

const playerName = (playerId: string) =>
  players.value.find((player) => player.id === playerId)?.name ?? 'Unbekannt'

const phaseLabel = (phase: string) => (phase === 'round_robin' ? 'Round Robin' : 'K.O.-Phase')

const modeLabel = computed(() => {
  if (!tournament.value) return ''
  if (tournament.value.mode === 'round_robin') return 'Round Robin'
  if (tournament.value.mode === 'knockout') return 'K.O.-Phase'
  return 'Kombi'
})

const formatDate = (value?: string) => {
  if (!value) return ''
  const date = new Date(value)
  const day = date.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const time = date.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
  return `${day} · ${time}`
}

const pageKey = (page: number) => `page-${page}`
const groupKey = (groupIndex: number) => `group-${groupIndex}`

const showDeleteDialog = ref(false)
const deleteError = ref('')
const deleteMessage = computed(() => {
  const base = tournament.value ? `Willst du "${tournament.value.name}" wirklich löschen?` : ''
  return deleteError.value ? `${base}\n${deleteError.value}` : base
})

const confirmDelete = () => {
  if (!tournament.value) return
  deleteError.value = ''
  showDeleteDialog.value = true
}

const handleDelete = async () => {
  if (!tournament.value) return
  deleteError.value = ''
  try {
    await onlineStore.deleteTournament(tournament.value.id)
    showDeleteDialog.value = false
    router.push('/tournaments')
  } catch (err) {
    deleteError.value = (err as Error).message ?? 'Turnier konnte nicht gelöscht werden.'
  }
}

const canStartMatch = (match: TournamentMatch) => {
  const userId = auth.session?.user?.id
  if (!userId) return false
  const isParticipant = match.playerAId === userId || match.playerBId === userId
  return isParticipant && match.status === 'pending'
}

const startMatch = async (matchId: string) => {
  const match = matches.value.find((entry) => entry.id === matchId)
  if (!match || !tournament.value) return
  const playerA = players.value.find((player) => player.id === match.playerAId)
  const playerB = players.value.find((player) => player.id === match.playerBId)
  if (!playerA || !playerB) return

  await onlineStore.markMatchInProgress(match.id)
  gameStore.startNewMatch(playerA.name, playerB.name, {
    doubleOut: tournament.value.settings.doubleOut,
    format: tournament.value.settings.format,
    tournamentId: tournament.value.id,
    matchId: match.id,
    startingScore: tournament.value.settings.startingScore ?? 501,
    tournamentScope: 'online',
    playerA: { id: playerA.id, name: playerA.name, createdAt: new Date().toISOString() },
    playerB: { id: playerB.id, name: playerB.name, createdAt: new Date().toISOString() }
  })
  router.push('/game')
}
</script>
