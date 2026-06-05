<template>
  <div class="min-h-screen bg-slate-950 text-slate-50">
    <!-- Header -->
    <header class="px-4 sm:px-8 pt-4 pb-3 border-b border-slate-800 flex items-center justify-between gap-4">
      <div class="min-w-0">
        <div class="text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em] text-slate-500">
          Public View
        </div>
        <h1 class="text-2xl sm:text-4xl font-black truncate">
          {{ tournament?.name ?? 'Turnier' }}
        </h1>
      </div>
      <div class="flex items-center gap-3 sm:gap-6 shrink-0">
        <div class="hidden sm:block text-right">
          <div class="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">Status</div>
          <div class="text-sm font-bold text-emerald-400">{{ statusLabel }}</div>
        </div>
        <button
          type="button"
          class="px-3 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-bold"
          @click="rotationPaused = !rotationPaused"
        >
          {{ rotationPaused ? 'Auto' : 'Pause' }}
        </button>
        <div class="flex gap-1">
          <span
            v-for="panel in availablePanels"
            :key="panel"
            class="w-2 h-2 rounded-full transition-colors"
            :class="panel === activePanel ? 'bg-emerald-400' : 'bg-slate-700'"
          />
        </div>
      </div>
    </header>

    <!-- Body -->
    <main class="px-4 sm:px-8 py-6 sm:py-8">
      <div v-if="loadError" class="max-w-3xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
        <i class="pi pi-exclamation-triangle text-5xl text-amber-400" />
        <h2 class="text-2xl font-black mt-4">Turnier nicht verfügbar</h2>
        <p class="text-slate-400 mt-2">
          Dieses Turnier ist nicht (mehr) als laufend markiert oder existiert nicht.
        </p>
      </div>

      <div v-else-if="!tournament" class="text-center text-slate-500 text-lg py-20">
        Lade Turnier…
      </div>

      <template v-else>
        <!-- Live panel -->
        <section v-if="activePanel === 'live'" class="space-y-5 sm:space-y-7">
          <h2 class="text-3xl sm:text-5xl font-black tracking-tight">Aktuelle Matches</h2>
          <div v-if="liveSnapshots.length === 0" class="text-slate-500 text-xl py-12">
            Im Moment läuft kein Match.
          </div>
          <div v-else class="grid gap-5 sm:gap-7 xl:grid-cols-2">
            <PublicLiveMatchCard
              v-for="entry in liveMatchesWithMeta"
              :key="entry.matchId"
              :snapshot="entry.snapshot"
              :player-name="playerName"
              :phase-label="entry.phaseLabel"
              :group-label="entry.groupLabel"
            />
          </div>
        </section>

        <!-- Standings panel (paginated: typically 2 groups per page) -->
        <section v-else-if="activeStandingsPage" class="space-y-5 sm:space-y-7">
          <h2 class="text-3xl sm:text-5xl font-black tracking-tight">
            Tabelle
            <span v-if="activeStandingsPage.subtitle" class="text-slate-500 font-bold">
              · {{ activeStandingsPage.subtitle }}
            </span>
          </h2>
          <!-- Qualifier legend mirrors the admin UI when relevant -->
          <div
            v-if="hasWildcardQualifiers && mode === 'combined'"
            class="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm font-semibold text-slate-400"
          >
            <span class="inline-flex items-center gap-2">
              <span class="h-4 w-1 rounded-full bg-emerald-500 shrink-0" />
              Direkte Qualifikation
            </span>
            <span class="inline-flex items-center gap-2">
              <span class="h-4 w-1 rounded-full bg-amber-400 shrink-0" />
              {{ wildcardLegend }}
            </span>
          </div>
          <div class="public-card-light space-y-5">
            <TournamentStandingsTable
              v-for="group in activeStandingsPage.groups"
              :key="group.index"
              :title="group.title"
              :rows="group.rows"
              :player-name="playerName"
              :qualifier-status="qualifiedPlayerStatus"
            />
          </div>
        </section>

        <!-- Final standings (round_robin with multiple groups) -->
        <section v-else-if="activePanel === 'final-standings'" class="space-y-5 sm:space-y-7">
          <h2 class="text-3xl sm:text-5xl font-black tracking-tight">Schlussrangliste</h2>
          <div class="public-card-light">
            <TournamentStandingsTable
              title="Gesamt"
              :rows="finalStandings"
              :player-name="playerName"
            />
          </div>
        </section>

        <!-- Schedule panel -->
        <section v-else-if="activePanel === 'schedule'" class="space-y-5 sm:space-y-7">
          <h2 class="text-3xl sm:text-5xl font-black tracking-tight">Paarungen</h2>
          <div v-if="nextPairings.length === 0" class="text-slate-500 text-xl py-12">
            Keine offenen Spiele.
          </div>
          <ul v-else class="space-y-3 sm:space-y-4">
            <li
              v-for="match in nextPairings"
              :key="match.id"
              class="bg-slate-900 border rounded-2xl px-5 py-4 sm:px-7 sm:py-5 flex items-center justify-between gap-4"
              :class="match.status === 'in_progress' ? 'border-emerald-500/60' : 'border-slate-800'"
            >
              <div class="min-w-0">
                <div class="text-2xl sm:text-4xl font-black truncate">
                  {{ playerName(match.player_a_id) }}
                  <span class="text-slate-600 mx-2">vs</span>
                  {{ playerName(match.player_b_id) }}
                </div>
                <div class="text-xs sm:text-base font-bold uppercase tracking-widest text-slate-500 mt-1">
                  {{ phaseLabelFor(match) }}
                  <span v-if="groupLabelFor(match)"> · {{ groupLabelFor(match) }}</span>
                  · Runde {{ match.round }}
                </div>
              </div>
              <div
                class="shrink-0 text-[10px] sm:text-xs font-bold uppercase tracking-widest rounded-full px-3 py-1"
                :class="match.status === 'in_progress'
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : 'bg-slate-800 text-slate-400'"
              >
                {{ match.status === 'in_progress' ? 'läuft' : 'bereit' }}
              </div>
            </li>
          </ul>
        </section>

        <!-- Bracket panel (own slide, edge-to-edge so the whole tree fits) -->
        <section v-else-if="activePanel === 'bracket'" class="space-y-3 sm:space-y-4">
          <h2 class="text-2xl sm:text-4xl font-black tracking-tight">K.O.-Baum</h2>
          <div class="public-card-light">
            <TournamentBracket
              :matches="knockoutMatches"
              :player-name="bracketPlayerName"
              :results="resultsAsDomain"
              :show-details="false"
              title=""
            />
          </div>
        </section>

        <!-- Top scorers panel (3×3 grid, fits on a 1080p TV without scrolling) -->
        <section v-else-if="activePanel === 'top'" class="space-y-3 sm:space-y-4">
          <h2 class="text-2xl sm:text-4xl font-black tracking-tight">Top-Scorer</h2>
          <div v-if="leaderboardRows.length === 0" class="text-slate-500 text-xl py-12">
            Noch keine Statistiken.
          </div>
          <div v-else class="public-card-light">
            <TournamentLeaderboardTable title="Leaderboard" :rows="leaderboardRows" compact />
          </div>
        </section>
      </template>
    </main>

    <!-- Footer -->
    <footer class="px-4 sm:px-8 py-3 border-t border-slate-800 text-[10px] sm:text-xs text-slate-600 flex items-center justify-between">
      <span>Stand: {{ lastUpdatedLabel }}</span>
      <span>checkout.app · Public</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '@/services/supabase'
import TournamentStandingsTable from '@/components/TournamentStandingsTable.vue'
import TournamentLeaderboardTable from '@/components/TournamentLeaderboardTable.vue'
import TournamentBracket from '@/components/TournamentBracket.vue'
import PublicLiveMatchCard from '@/components/PublicLiveMatchCard.vue'
import { calculateLeaderboardsFromData, calculateStandingsFromData } from '@/domain/tournamentStats'
import { computeQualifiers } from '@/domain/knockoutSeeding'
import {
  buildCombinedSeedLabels,
  buildPlaceholderMatches,
  buildSeedIds,
  mergeKnockoutMatches
} from '@/domain/placeholderBracket'
import type {
  Tournament,
  TournamentMatch,
  TournamentMatchResult,
  TournamentMode
} from '@/domain/models'

const route = useRoute()

const REFRESH_MS = 5_000
const ROTATE_MS = 12_000
const GROUPS_PER_STANDINGS_PAGE = 2

type QualifierStatus = 'direct' | 'wildcard'

interface RawMatch {
  id: string
  tournament_id: string
  phase: 'round_robin' | 'knockout'
  round: number
  order: number
  group_index: number | null
  player_a_id: string
  player_b_id: string
  status: 'pending' | 'in_progress' | 'finished'
  started_at: string | null
  ended_at: string | null
  winner_id: string | null
}

interface RawResult {
  match_id: string
  tournament_id: string
  stats: TournamentMatchResult['stats']
}

interface RawPlayer {
  player_id: string
  group_index: number | null
  username: string
  display_name: string
}

interface RawLive {
  match_id: string
  snapshot: import('@/domain/liveMatch').LiveMatchSnapshot
  updated_at: string
}

interface PublicPayload {
  tournament: Tournament
  players: RawPlayer[]
  matches: RawMatch[]
  results: RawResult[]
  live: RawLive[]
}

const tournament = ref<Tournament | null>(null)
const rawPlayers = ref<RawPlayer[]>([])
const rawMatches = ref<RawMatch[]>([])
const rawResults = ref<RawResult[]>([])
const liveSnapshots = ref<RawLive[]>([])
const lastUpdated = ref<Date | null>(null)
const loadError = ref(false)
const rotationPaused = ref(false)

const activePanel = ref<string>('live')

let refreshTimer: ReturnType<typeof setInterval> | null = null
let rotateTimer: ReturnType<typeof setInterval> | null = null

const playerMap = computed(() => {
  const map = new Map<string, string>()
  rawPlayers.value.forEach((player) => {
    map.set(player.player_id, player.display_name || player.username)
  })
  return map
})

const playerName = (id: string | null | undefined) => {
  if (!id) return 'TBD'
  return playerMap.value.get(id) ?? '–'
}

const mode = computed<TournamentMode | undefined>(() => tournament.value?.mode)
const hasKnockout = computed(() => mode.value === 'knockout' || mode.value === 'combined')
const hasGroups = computed(() => mode.value === 'round_robin' || mode.value === 'combined')

const groupCount = computed(() => {
  if (!hasGroups.value) return 0
  const fromSettings = tournament.value?.settings?.groupCount ?? 0
  if (fromSettings > 0) return fromSettings
  let max = -1
  rawPlayers.value.forEach((p) => {
    if (p.group_index !== null && p.group_index !== undefined && p.group_index > max) {
      max = p.group_index
    }
  })
  return max >= 0 ? max + 1 : 1
})

const groupLabel = (groupIndex: number) =>
  String.fromCharCode(65 + groupIndex) // 0 → A, 1 → B, …

const matchesAsDomain = computed<TournamentMatch[]>(() =>
  rawMatches.value.map((m) => ({
    id: m.id,
    tournamentId: m.tournament_id,
    phase: m.phase,
    round: m.round,
    order: m.order,
    groupIndex: m.group_index ?? undefined,
    playerAId: m.player_a_id,
    playerBId: m.player_b_id,
    // calculateStandingsFromData only acts on 'finished', so pending maps
    // safely to 'in_progress' for typing purposes.
    status: m.status === 'finished' ? 'finished' : 'in_progress',
    startedAt: m.started_at ?? undefined,
    endedAt: m.ended_at ?? undefined,
    winnerId: m.winner_id ?? undefined
  }))
)

const resultsAsDomain = computed<TournamentMatchResult[]>(() =>
  rawResults.value.map((r) => ({
    matchId: r.match_id,
    tournamentId: r.tournament_id,
    stats: r.stats
  }))
)

interface GroupStanding {
  index: number
  title: string
  rows: ReturnType<typeof calculateStandingsFromData>
  isFinished: boolean
}

const groupStandingsList = computed<GroupStanding[]>(() => {
  if (!hasGroups.value) return []
  const list: GroupStanding[] = []
  for (let i = 0; i < groupCount.value; i += 1) {
    const playerIds = rawPlayers.value
      .filter((p) => (p.group_index ?? 0) === i)
      .map((p) => p.player_id)
    if (playerIds.length === 0) continue
    const groupMatches = rawMatches.value.filter(
      (m) => m.phase === 'round_robin' && (m.group_index ?? 0) === i
    )
    const isFinished =
      groupMatches.length > 0 && groupMatches.every((m) => m.status === 'finished')
    const rows = calculateStandingsFromData({
      playerIds,
      matches: matchesAsDomain.value,
      results: resultsAsDomain.value,
      phase: 'round_robin',
      groupIndex: i
    })
    list.push({
      index: i,
      title: groupCount.value > 1 ? `Gruppe ${groupLabel(i)}` : 'Rangliste',
      rows,
      isFinished
    })
  }
  return list
})

const allGroupsFinished = computed(
  () => groupStandingsList.value.length > 0 && groupStandingsList.value.every((g) => g.isFinished)
)

const bracketSize = computed(() => tournament.value?.settings?.koBracketSize ?? 0)

const baseQualifiers = computed(() =>
  bracketSize.value > 0 ? Math.floor(bracketSize.value / Math.max(1, groupCount.value)) : 2
)

const qualifiedPlayerStatus = computed<Record<string, QualifierStatus>>(() => {
  if (mode.value !== 'combined') return {}
  const standingsByGroup = new Map<number, ReturnType<typeof calculateStandingsFromData>>()
  groupStandingsList.value.forEach((entry) => standingsByGroup.set(entry.index, entry.rows))

  const qualifiers = computeQualifiers({
    bracketSize: bracketSize.value,
    groupCount: groupCount.value,
    standingsByGroup
  })

  const status: Record<string, QualifierStatus> = {}
  qualifiers.forEach((q) => {
    status[q.playerId] = q.rankInGroup <= baseQualifiers.value ? 'direct' : 'wildcard'
  })

  // Wildcard cusp preview while the group phase is still in progress:
  // colour every rank-(baseQualifiers+1) player gold so spectators see
  // who is currently in line. Once all groups are done, only the
  // qualifiers that computeQualifiers actually returned stay gold.
  if (!allGroupsFinished.value) {
    const cuspRank = baseQualifiers.value + 1
    groupStandingsList.value.forEach((entry) => {
      const cuspRow = entry.rows[cuspRank - 1]
      if (cuspRow && status[cuspRow.playerId] === undefined) {
        status[cuspRow.playerId] = 'wildcard'
      }
    })
  }

  return status
})

const hasWildcardQualifiers = computed(() =>
  Object.values(qualifiedPlayerStatus.value).some((status) => status === 'wildcard')
)

const wildcardLegend = computed(() => {
  if (bracketSize.value <= 0) return 'Wildcard'
  const remaining = bracketSize.value - baseQualifiers.value * groupCount.value
  if (remaining <= 0) return 'Wildcard'
  if (baseQualifiers.value === 2) {
    return `Beste ${remaining} Gruppendritte`
  }
  return `Beste ${remaining} Wildcards`
})

interface StandingsPage {
  key: string
  subtitle: string
  groups: GroupStanding[]
}

const standingsPages = computed<StandingsPage[]>(() => {
  const groups = groupStandingsList.value
  if (groups.length === 0) return []
  const pages: StandingsPage[] = []
  for (let i = 0; i < groups.length; i += GROUPS_PER_STANDINGS_PAGE) {
    const slice = groups.slice(i, i + GROUPS_PER_STANDINGS_PAGE)
    const labels = slice.map((g) => groupLabel(g.index)).join(' + ')
    pages.push({
      key: `standings:${i}`,
      subtitle: groups.length > 1 ? `Gruppe ${labels}` : '',
      groups: slice
    })
  }
  return pages
})

const activeStandingsPage = computed<StandingsPage | null>(() => {
  if (!activePanel.value.startsWith('standings:')) return null
  return standingsPages.value.find((p) => p.key === activePanel.value) ?? null
})

const finalStandings = computed(() => {
  if (mode.value !== 'round_robin') return []
  const playerIds = rawPlayers.value.map((p) => p.player_id)
  return calculateStandingsFromData({
    playerIds,
    matches: matchesAsDomain.value,
    results: resultsAsDomain.value,
    phase: 'round_robin'
  })
})

const showFinalStandings = computed(
  () => mode.value === 'round_robin' && groupCount.value > 1 && finalStandings.value.length > 0
)

// One pairing per (phase, group). Prefer an in-progress match; otherwise
// fall back to the earliest pending one. Finished groups contribute nothing.
// Knockout matches without a group_index get bucketed by round so each KO
// round contributes its currently-relevant pairing too.
const nextPairings = computed(() => {
  const buckets = new Map<string, RawMatch>()
  const candidates = rawMatches.value
    .filter((m) => m.status !== 'finished')
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'in_progress' ? -1 : 1
      if (a.round !== b.round) return a.round - b.round
      return a.order - b.order
    })
  candidates.forEach((m) => {
    const bucketKey =
      m.phase === 'knockout'
        ? `ko:round-${m.round}`
        : `rr:${m.group_index ?? 0}`
    if (!buckets.has(bucketKey)) buckets.set(bucketKey, m)
  })
  return Array.from(buckets.values()).sort((a, b) => {
    if (a.phase !== b.phase) return a.phase === 'round_robin' ? -1 : 1
    if (a.phase === 'round_robin') {
      return (a.group_index ?? 0) - (b.group_index ?? 0)
    }
    return a.round - b.round
  })
})

const realKnockoutMatches = computed<TournamentMatch[]>(() =>
  matchesAsDomain.value.filter((m) => m.phase === 'knockout')
)

// Visual bracket: virtual placeholder slots + real matches merged in.
// Renders even before any real KO match exists, so spectators see the
// structure ("1. Gruppensieger" vs "1. bester Drittplatzierter" etc.).
const placeholderBracketLabels = computed(() =>
  mode.value === 'combined'
    ? buildCombinedSeedLabels(groupCount.value, bracketSize.value)
    : []
)

const placeholderNameMap = computed(() => {
  const map = new Map<string, string>()
  placeholderBracketLabels.value.forEach((label, index) => {
    map.set(`seed-${index}`, label)
  })
  return map
})

const knockoutMatches = computed<TournamentMatch[]>(() => {
  if (!hasKnockout.value || !tournament.value) return realKnockoutMatches.value
  const seedIds = buildSeedIds({
    mode: mode.value as 'knockout' | 'combined',
    groupCount: groupCount.value,
    bracketSize: bracketSize.value,
    knockoutPlayerIds: rawPlayers.value.map((p) => p.player_id)
  })
  if (seedIds.length === 0) return realKnockoutMatches.value
  const pairingMode: 'consecutive' | 'first-last' =
    mode.value === 'combined' && bracketSize.value > 0 ? 'consecutive' : 'first-last'
  const placeholder = buildPlaceholderMatches(
    seedIds,
    tournament.value.id ?? 'preview',
    pairingMode
  )
  return mergeKnockoutMatches(placeholder, realKnockoutMatches.value)
})

const bracketPlayerName = (id: string | null | undefined) => {
  if (!id) return 'TBD'
  return placeholderNameMap.value.get(id) ?? playerName(id)
}

const leaderboardRows = computed(() =>
  calculateLeaderboardsFromData(
    resultsAsDomain.value,
    rawPlayers.value.map((p) => ({ playerId: p.player_id, name: p.display_name || p.username }))
  )
)

const phaseLabelFor = (m: { phase: string }) =>
  m.phase === 'knockout' ? 'K.O.' : 'Gruppenphase'

const groupLabelFor = (m: { group_index?: number | null }) => {
  const idx = m.group_index ?? undefined
  if (idx === null || idx === undefined) return ''
  if (groupCount.value <= 1) return ''
  return `Gruppe ${groupLabel(idx)}`
}

const liveMatchesWithMeta = computed(() =>
  liveSnapshots.value.map((entry) => {
    const meta = rawMatches.value.find((m) => m.id === entry.match_id)
    return {
      matchId: entry.match_id,
      snapshot: entry.snapshot,
      phaseLabel: meta ? phaseLabelFor(meta) : 'Match',
      groupLabel: meta ? groupLabelFor(meta) : ''
    }
  })
)

const statusLabel = computed(() => {
  if (loadError.value) return 'inaktiv'
  if (!tournament.value) return '–'
  return 'läuft'
})

const lastUpdatedLabel = computed(() => {
  if (!lastUpdated.value) return '–'
  return lastUpdated.value.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
})

const availablePanels = computed<string[]>(() => {
  const list: string[] = []
  if (liveSnapshots.value.length > 0) list.push('live')
  standingsPages.value.forEach((p) => list.push(p.key))
  if (showFinalStandings.value) list.push('final-standings')
  if (nextPairings.value.length > 0) list.push('schedule')
  if (hasKnockout.value && knockoutMatches.value.length > 0) list.push('bracket')
  if (leaderboardRows.value.length > 0) list.push('top')
  return list
})

const fetchView = async () => {
  const id = route.params.id as string | undefined
  if (!id) {
    loadError.value = true
    return
  }
  const { data, error } = await supabase.rpc('get_public_tournament_view', { p_tid: id })
  if (error) {
    console.warn('get_public_tournament_view failed', error)
    loadError.value = true
    return
  }
  if (!data) {
    loadError.value = true
    tournament.value = null
    return
  }
  const payload = data as PublicPayload
  loadError.value = false
  tournament.value = payload.tournament
  rawPlayers.value = payload.players ?? []
  rawMatches.value = payload.matches ?? []
  rawResults.value = payload.results ?? []
  liveSnapshots.value = payload.live ?? []
  lastUpdated.value = new Date()

  // Ensure the active panel is one that currently has content.
  if (availablePanels.value.length > 0 && !availablePanels.value.includes(activePanel.value)) {
    activePanel.value = availablePanels.value[0]
  }
}

const rotatePanel = () => {
  if (rotationPaused.value) return
  const panels = availablePanels.value
  if (panels.length === 0) return
  const idx = panels.indexOf(activePanel.value)
  const next = panels[(idx + 1) % panels.length]
  activePanel.value = next
}

const handleVisibility = () => {
  if (document.hidden) {
    stopTimers()
  } else {
    startTimers()
    fetchView()
  }
}

const startTimers = () => {
  if (!refreshTimer) refreshTimer = setInterval(fetchView, REFRESH_MS)
  if (!rotateTimer) rotateTimer = setInterval(rotatePanel, ROTATE_MS)
}

const stopTimers = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
  if (rotateTimer) {
    clearInterval(rotateTimer)
    rotateTimer = null
  }
}

onMounted(() => {
  fetchView()
  startTimers()
  document.addEventListener('visibilitychange', handleVisibility)
})

onUnmounted(() => {
  stopTimers()
  document.removeEventListener('visibilitychange', handleVisibility)
})
</script>

<style scoped>
/* Standings & Leaderboard components ship a light-on-white look. Wrap them
   in a "card" frame that fits the dark TV theme without forcing changes to
   the shared components. */
.public-card-light :deep(.bg-white) {
  background-color: rgb(248 250 252); /* slate-50 */
}
.public-card-light :deep(.text-foreground) {
  color: rgb(15 23 42); /* slate-900 */
}
</style>
