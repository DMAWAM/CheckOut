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
      <div v-if="activeTab === 'info'" class="space-y-6">
        <div class="bg-white border-2 border-border rounded-2xl p-6">
          <h2 class="text-lg font-bold text-foreground mb-4">Turnier-Info</h2>
          <div class="grid sm:grid-cols-2 gap-4">
            <div
              v-for="row in infoRows"
              :key="row.label"
              class="flex items-center justify-between bg-muted/30 border-2 border-border rounded-xl px-4 py-3"
            >
              <span class="text-sm font-semibold text-muted-foreground">{{ row.label }}</span>
              <span class="text-sm font-bold text-foreground text-right">{{ row.value }}</span>
            </div>
          </div>
        </div>

        <div class="bg-white border-2 border-border rounded-2xl p-6">
          <h3 class="text-lg font-bold text-foreground mb-3">Spiel-Format</h3>
          <div class="space-y-3">
            <div
              v-for="row in formatSummaryRows"
              :key="row.label"
              class="flex items-center justify-between bg-muted/20 border-2 border-border rounded-xl px-4 py-3"
            >
              <span class="text-sm font-semibold text-muted-foreground">{{ row.label }}</span>
              <span class="text-sm font-bold text-foreground text-right">{{ row.value }}</span>
            </div>
          </div>
        </div>

        <div class="bg-white border-2 border-border rounded-2xl p-6">
          <h3 class="text-lg font-bold text-foreground mb-3">Beschreibung</h3>
          <p class="text-sm text-foreground whitespace-pre-line">
            {{ tournamentDescription || 'Keine Beschreibung hinterlegt.' }}
          </p>
        </div>
      </div>

      <div v-else-if="activeTab === 'players'" class="space-y-4">
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
                  {{ playerGroupBadge(player.groupIndex) }}
                </span>
              </div>
              <span class="text-xs text-muted-foreground">@{{ player.username }}</span>
            </div>
          </div>
        </div>

        <GroupAssignmentPanel
          v-if="tournament && tournament.mode !== 'knockout'"
          :players="players"
          :group-count="groupCount"
          :max-groups="maxGroupCount"
          :can-edit="isAdmin"
          :can-delete-players="isAdmin && !scheduleGenerated"
          :locked="scheduleGenerated"
          :schedule-generated="scheduleGenerated"
          :show-generate-button="isAdmin"
          :error="groupAssignmentError || scheduleError"
          @assign="assignPlayerGroup"
          @bulk-assign="bulkAssignPlayerGroups"
          @group-count="changeGroupCount"
          @generate="generateSchedule"
          @delete-player="confirmDeleteTournamentPlayer"
        />

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
              class="px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold transition-colors"
              :class="inviteCopied ? '!bg-green-600' : ''"
            >
              {{ inviteCopied ? 'Kopiert' : 'Kopieren' }}
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
            Gib die Spielernamen ein oder kopiere Gruppenzeilen aus Excel. Wir erstellen Username + Code,
            erzeugen QR-Codes und übernehmen erkannte Gruppenzuteilungen.
          </p>
          <textarea
            v-model="newPlayersInput"
            rows="6"
            class="w-full px-4 py-3 border-2 border-border rounded-xl focus:border-primary focus:outline-none bg-background text-foreground"
          />
          <div class="flex flex-wrap items-center gap-3">
            <button
              @click="generatePlayerLogins"
              :disabled="generatingLogins"
              class="bg-primary text-primary-foreground rounded-xl px-5 py-3 font-bold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {{ generatingLogins ? 'Generiere…' : 'Codes generieren' }}
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
                <button
                  v-if="isAdmin && !scheduleGenerated"
                  class="ml-3 text-xs font-bold text-destructive"
                  @click="confirmDeleteTournamentPlayer(entry.playerId)"
                >
                  Spieler entfernen
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
            <h2 class="text-lg font-bold text-foreground">Spielplan</h2>
            <span class="text-xs font-semibold text-muted-foreground">{{ openMatches.length }} offen</span>
          </div>

          <div v-if="openMatches.length === 0" class="text-sm text-muted-foreground">
            Keine offenen Paarungen. Prüfe laufende oder beendete Matches.
          </div>

          <div v-else class="space-y-5">
            <section
              v-for="section in scheduleSections"
              :key="section.key"
              class="rounded-2xl border-2 p-4"
              :class="section.isOwnGroup ? 'border-primary bg-primary/5' : 'border-border bg-muted/20'"
            >
              <div class="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h3 class="font-bold text-foreground">{{ section.title }}</h3>
                  <p
                    v-if="section.subtitle"
                    class="text-xs text-muted-foreground font-semibold mt-1"
                  >
                    {{ section.subtitle }}
                  </p>
                </div>
                <span class="text-xs font-bold rounded-full bg-white border-2 border-border px-3 py-1">
                  {{ section.matches.length }} offen
                </span>
              </div>

              <div class="space-y-3">
                <div
                  v-for="match in section.matches"
                  :key="match.id"
                  class="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border-2 border-border rounded-xl px-4 py-4 text-left transition-all"
                  :class="match.status === 'in_progress' ? 'cursor-pointer hover:shadow-md hover:border-primary/60' : ''"
                  @click="handleMatchClick(match)"
                >
                  <div>
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="text-xs font-bold text-muted-foreground">#{{ groupSequenceNumber(match) }}</span>
                      <span class="font-bold text-foreground">
                        {{ playerName(match.playerAId) }} vs {{ playerName(match.playerBId) }}
                      </span>
                    </div>
                    <div class="text-xs text-muted-foreground font-semibold mt-1">
                      {{ phaseLabel(match.phase) }}
                      <span v-if="groupCount > 1 && match.groupIndex !== undefined">
                        · Gruppe {{ groupLabel(match.groupIndex) }}
                      </span>
                      · Runde {{ match.round }}
                      <span v-if="!isMatchUnlocked(match)" class="text-dart-gold">
                        · wartet auf vorheriges Spiel
                      </span>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      v-if="canStartMatch(match)"
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
                      v-else-if="!isMatchUnlocked(match)"
                      class="px-3 py-1 rounded-full text-xs font-bold bg-muted text-muted-foreground"
                    >
                      Gesperrt
                    </span>
                    <span
                      v-else
                      class="px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary"
                    >
                      bereit
                    </span>
                  </div>
                </div>
              </div>
            </section>
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
          <div v-else class="space-y-3">
            <div
              v-for="entry in paginatedFinishedMatches"
              :key="entry.match.id"
              class="bg-muted/30 border-2 border-border rounded-2xl p-4 shadow-sm"
            >
              <div class="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div class="text-base font-bold text-foreground">
                    {{ playerName(entry.match.playerAId) }} vs {{ playerName(entry.match.playerBId) }}
                  </div>
                  <div class="text-xs text-muted-foreground font-semibold">
                    {{ phaseLabel(entry.match.phase) }}
                    <span v-if="groupCount > 1 && entry.match.groupIndex !== undefined">
                      · Gruppe {{ groupLabel(entry.match.groupIndex) }}
                    </span>
                    · Runde {{ entry.match.round }}
                    <span v-if="matchScore(entry)"> · {{ matchScore(entry) }}</span>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <div class="text-xs text-muted-foreground font-semibold">
                    {{ formatDate(entry.match.endedAt) }}
                  </div>
                  <button
                    class="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-xs font-bold shadow-sm hover:shadow-md transition-all"
                    @click="openMatchDetails(entry.match.id)"
                  >
                    Details
                  </button>
                </div>
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
              :results="results"
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
      :loading="liveLoading"
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
    <ConfirmDialog
      :open="Boolean(deletePlayerTarget)"
      title="Spieler entfernen"
      :message="deletePlayerMessage"
      confirm-label="Entfernen"
      cancel-label="Abbrechen"
      tone="danger"
      @confirm="handleDeletePlayer"
      @cancel="deletePlayerTarget = null"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useOnlineTournamentsStore } from '@/stores/onlineTournamentsStore'
import { useAuthStore } from '@/stores/authStore'
import { useGameStore } from '@/stores/gameStore'
import TournamentStandingsTable from '@/components/TournamentStandingsTable.vue'
import TournamentLeaderboardTable from '@/components/TournamentLeaderboardTable.vue'
import TournamentBracket from '@/components/TournamentBracket.vue'
import MatchDetailsModal from '@/components/MatchDetailsModal.vue'
import LiveMatchModal from '@/components/LiveMatchModal.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import GroupAssignmentPanel from '@/components/GroupAssignmentPanel.vue'
import QRCode from 'qrcode'
import type { MatchFormat, TournamentMatch } from '@/domain/models'
import type { MatchPlayerSummary } from '@/domain/matchSummary'
import type { LiveMatchSnapshot } from '@/domain/liveMatch'
import { resolveMatchDoubleOut, resolveMatchFormat } from '@/domain/tournamentFormat'
import { normalizeImportedName, parseGroupedPlayerImport } from '@/domain/groupImport'

const router = useRouter()
const route = useRoute()
const onlineStore = useOnlineTournamentsStore()
const auth = useAuthStore()
const gameStore = useGameStore()

const activeTab = ref<'info' | 'players' | 'matches' | 'standings' | 'stats'>('matches')
const tabs = ['info', 'players', 'matches', 'standings', 'stats'] as const
const tabLabels = computed<Record<typeof tabs[number], string>>(() => ({
  info: 'Info',
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
const maxGroupCount = computed(() => (tournament.value?.mode === 'knockout' ? 1 : 32))
const scheduleGenerated = computed(() => matches.value.length > 0)
const qualifierCount = computed(() => (tournament.value?.mode === 'combined' ? 2 : 0))
const tournamentStartingScore = computed(() => tournament.value?.settings.startingScore ?? 501)
const tournamentDescription = computed(() => tournament.value?.settings.description ?? '')
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

const formatLabel = (format?: MatchFormat) => {
  if (!format) return 'Standard'
  if (format.type === 'fixed_legs') {
    return `${format.fixedLegs ?? format.legsToWin} fixe Legs${format.allowDraw ? ' · Remis möglich' : ''}`
  }
  if (format.useSets) {
    const setsTarget = format.setsToWin ?? format.legsToWin ?? 1
    const legsPerSet = format.legsPerSet ?? 1
    const base = format.type === 'best_of'
      ? `Best of ${format.bestOf ?? setsTarget * 2 - 1}`
      : `Race to ${setsTarget}`
    return `${base} Sets · ${legsPerSet} Legs/Set`
  }
  if (format.type === 'best_of') {
    const bestOf = format.bestOf ?? (format.legsToWin ? format.legsToWin * 2 - 1 : undefined)
    return bestOf ? `Best of ${bestOf} Legs` : 'Best-of'
  }
  return format.legsToWin ? `Race to ${format.legsToWin} Legs` : 'Race to'
}

const knockoutRoundLabel = (round: number) => {
  const firstRoundMatches = knockoutMatches.value.filter((match) => match.round === 1)
  const firstRoundSize = firstRoundMatches.length * 2
  if (!firstRoundSize) return `Runde ${round}`
  const size = firstRoundSize / Math.pow(2, round - 1)
  if (size >= 8) return `Top ${size}`
  if (size === 4) return 'Halbfinale'
  if (size === 2) return 'Finale'
  return `Runde ${round}`
}

const formatSummaryRows = computed(() => {
  if (!tournament.value) return []
  const settings = tournament.value.settings
  const byPhase = settings.formatByPhase
  const rows: Array<{ label: string; value: string }> = []
  if (tournament.value.mode !== 'knockout') {
    rows.push({
      label: 'Gruppenphase',
      value: formatLabel(byPhase?.roundRobin ?? settings.format)
    })
    rows.push({
      label: 'Out Gruppenphase',
      value: (settings.outByPhase?.roundRobin ?? settings.doubleOut) ? 'Double-Out' : 'Single-Out'
    })
  }
  if (tournament.value.mode !== 'round_robin') {
    rows.push({
      label: 'K.O.-Phase',
      value: formatLabel(byPhase?.knockout ?? settings.format)
    })
    rows.push({
      label: 'Out K.O. Standard',
      value: (settings.outByPhase?.knockout ?? settings.doubleOut) ? 'Double-Out' : 'Single-Out'
    })
    const overrides = byPhase?.knockoutRounds ?? {}
    Object.keys(overrides)
      .map((round) => Number(round))
      .sort((a, b) => a - b)
      .forEach((round) => {
        const value = formatLabel(overrides[String(round)])
        rows.push({ label: knockoutRoundLabel(round), value })
      })
    const outOverrides = settings.outByPhase?.knockoutRounds ?? {}
    Object.keys(outOverrides)
      .map((round) => Number(round))
      .sort((a, b) => a - b)
      .forEach((round) => {
        rows.push({
          label: `Out ${knockoutRoundLabel(round)}`,
          value: outOverrides[String(round)] ? 'Double-Out' : 'Single-Out'
        })
      })
  }
  if (rows.length === 0) {
    rows.push({ label: 'Match-Format', value: formatLabel(settings.format) })
  }
  return rows
})

const infoRows = computed(() => {
  if (!tournament.value) return []
  const scopeLabel = tournament.value.scope === 'online' ? 'Online' : 'Lokal'
  const groupSizes = Array.from({ length: tournament.value.mode === 'knockout' ? 1 : groupCount.value }, (_, index) => ({
    label: groupLabel(index),
    count: players.value.filter((player) => player.groupIndex === index).length
  }))
  const groups = tournament.value.mode === 'knockout'
    ? '1'
    : `${groupCount.value}${groupSizes.some((group) => group.count > 0)
      ? ` (${groupSizes.map((group) => `${group.label}:${group.count}`).join(', ')})`
      : ''}`
  return [
    { label: 'Turnierart', value: scopeLabel },
    { label: 'Modus', value: modeLabel.value },
    { label: 'Gruppen', value: groups },
    { label: 'Teilnehmer', value: `${players.value.length}` },
    {
      label: 'Spielmodus',
      value: `${tournamentStartingScore.value} · ${tournament.value.settings.doubleOut ? 'Double-Out' : 'Single-Out'}`
    }
  ]
})

const isMatchFinished = (match: TournamentMatch) =>
  match.status === 'finished' || results.value.some((entry) => entry.matchId === match.id)

const openMatches = computed(() =>
  matches.value
    .filter((match) => !isMatchFinished(match))
    .slice()
    .sort((a, b) => {
      const rank = (status: string) => (status === 'in_progress' ? 0 : 1)
      return rank(a.status) - rank(b.status) || a.order - b.order
    })
)

interface ScheduleSection {
  key: string
  title: string
  subtitle?: string
  matches: TournamentMatch[]
  isOwnGroup?: boolean
}

const sortMatchesChronologically = (entries: TournamentMatch[]) =>
  entries.slice().sort((a, b) => a.round - b.round || a.order - b.order)

const userGroupIndex = computed(() => {
  const userId = auth.session?.user?.id
  if (!userId) return undefined
  return players.value.find((player) => player.id === userId)?.groupIndex
})

const roundRobinOpenMatchesByGroup = computed(() => {
  const groups = new Map<number, TournamentMatch[]>()
  openMatches.value
    .filter((match) => match.phase === 'round_robin')
    .forEach((match) => {
      const groupIndex = match.groupIndex ?? 0
      const groupMatches = groups.get(groupIndex) ?? []
      groupMatches.push(match)
      groups.set(groupIndex, groupMatches)
    })
  return groups
})

const knockoutOpenMatches = computed(() =>
  sortMatchesChronologically(openMatches.value.filter((match) => match.phase === 'knockout'))
)

const scheduleSections = computed<ScheduleSection[]>(() => {
  const sections: ScheduleSection[] = []
  const userGroup = userGroupIndex.value

  if (userGroup !== undefined) {
    const ownMatches = roundRobinOpenMatchesByGroup.value.get(userGroup)
    if (ownMatches?.length) {
      sections.push({
        key: `own-group-${userGroup}`,
        title: `Deine Gruppe ${groupLabel(userGroup)}`,
        matches: sortMatchesChronologically(ownMatches),
        isOwnGroup: true
      })
    }
  }

  Array.from(roundRobinOpenMatchesByGroup.value.entries())
    .filter(([groupIndex]) => groupIndex !== userGroup)
    .sort(([groupA], [groupB]) => groupA - groupB)
    .forEach(([groupIndex, groupMatches]) => {
      sections.push({
        key: `group-${groupIndex}`,
        title: `Gruppe ${groupLabel(groupIndex)}`,
        matches: sortMatchesChronologically(groupMatches)
      })
    })

  if (knockoutOpenMatches.value.length) {
    sections.push({
      key: 'knockout',
      title: 'K.O.-Phase',
      subtitle: 'K.O.-Spiele nach Turnierbaum',
      matches: knockoutOpenMatches.value
    })
  }

  return sections
})

const groupSequenceNumber = (match: TournamentMatch) => {
  if (match.phase !== 'round_robin') return match.order
  const groupMatches = sortMatchesChronologically(
    matches.value.filter((entry) => entry.phase === 'round_robin' && (entry.groupIndex ?? 0) === (match.groupIndex ?? 0))
  )
  const index = groupMatches.findIndex((entry) => entry.id === match.id)
  return index >= 0 ? index + 1 : match.order
}

const isMatchUnlocked = (match: TournamentMatch) => {
  if (match.status === 'in_progress' || isMatchFinished(match)) return true
  if (match.phase !== 'round_robin') return true
  const groupMatches = sortMatchesChronologically(
    matches.value.filter((entry) => entry.phase === 'round_robin' && (entry.groupIndex ?? 0) === (match.groupIndex ?? 0))
  )
  const currentIndex = groupMatches.findIndex((entry) => entry.id === match.id)
  if (currentIndex <= 0) return true
  return groupMatches.slice(0, currentIndex).every((entry) => isMatchFinished(entry))
}
const finishedMatches = computed(() => matches.value.filter((match) => isMatchFinished(match)))

interface FinishedMatchEntry {
  match: TournamentMatch
  stats: MatchPlayerSummary[]
}

const finishedMatchesDetailed = computed<FinishedMatchEntry[]>(() => {
  return finishedMatches.value
    .map((match) => {
      const result = results.value.find((entry) => entry.matchId === match.id)
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
        highestScore: stat.highestScore ?? 0,
        highestCheckout: stat.highestCheckout ?? 0,
        bestLegDarts: stat.bestLegDarts ?? 0,
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
    highestScore: stat.highestScore ?? 0,
    highestCheckout: stat.highestCheckout ?? 0,
    bestLegDarts: stat.bestLegDarts ?? 0,
    legsWon: stat.legsWon ?? 0,
    legsLost: stat.legsLost ?? 0
  }))
})

const liveMatchId = ref<string | null>(null)
const liveSnapshot = ref<LiveMatchSnapshot | null>(null)
const liveLoading = ref(false)
const liveError = ref('')
let livePollTimer: number | null = null

const liveMatch = computed(() => matches.value.find((match) => match.id === liveMatchId.value) ?? null)

const fetchLiveSnapshot = async () => {
  if (!liveMatchId.value) return
  liveLoading.value = true
  liveError.value = ''
  try {
    liveSnapshot.value = await onlineStore.fetchLiveState(liveMatchId.value)
  } catch (err) {
    console.warn(err)
    liveError.value = 'Live-Daten konnten nicht geladen werden.'
  } finally {
    liveLoading.value = false
  }
}

const startLivePolling = () => {
  if (livePollTimer) window.clearInterval(livePollTimer)
  livePollTimer = window.setInterval(() => {
    void fetchLiveSnapshot()
  }, 4000)
}

const stopLivePolling = () => {
  if (livePollTimer) {
    window.clearInterval(livePollTimer)
    livePollTimer = null
  }
}

const openLiveMatch = async (matchId: string) => {
  selectedMatchId.value = null
  liveMatchId.value = matchId
  liveError.value = ''
  await fetchLiveSnapshot()
  startLivePolling()
}

const closeLiveMatch = () => {
  liveMatchId.value = null
  liveSnapshot.value = null
  liveError.value = ''
  liveLoading.value = false
  stopLivePolling()
}

const openMatchDetails = (matchId: string) => {
  const match = matches.value.find((entry) => entry.id === matchId)
  if (!match) return
  if (isMatchFinished(match)) {
    selectedMatchId.value = matchId
    return
  }
  if (match.status === 'in_progress') {
    void openLiveMatch(matchId)
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

const groupLabel = (index: number) => String.fromCharCode(65 + index)
const playerGroupBadge = (groupIndex?: number) =>
  groupIndex === undefined ? 'Nicht zugeteilt' : `Gruppe ${groupLabel(groupIndex)}`

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
  return players.value.map((player) => player.id)
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

const inviteCode = ref('')
const scheduleError = ref('')
const groupAssignmentError = ref('')
const matchActionError = ref('')
const newPlayersInput = ref('')
const generateError = ref('')
const generateInfo = ref('')
const generatingLogins = ref(false)
const qrMap = ref<Record<string, string>>({})
const deletePlayerTarget = ref<{ id: string; name: string } | null>(null)

const loadTournament = async (id?: string) => {
  if (!id) return
  stopLivePolling()
  scheduleError.value = ''
  groupAssignmentError.value = ''
  matchActionError.value = ''
  generateError.value = ''
  generateInfo.value = ''
  deletePlayerTarget.value = null
  await onlineStore.fetchTournamentDetail(id)
  if (isAdmin.value) {
    const code = await onlineStore.getOrCreateInvite(id)
    inviteCode.value = code ?? ''
    await onlineStore.fetchLoginCodes(id)
  } else {
    inviteCode.value = ''
  }
}

watch(
  () => tournamentId.value,
  (id) => {
    void loadTournament(id)
  },
  { immediate: true }
)

onUnmounted(() => {
  stopLivePolling()
})

const inviteCopied = ref(false)
let inviteCopiedTimeout: ReturnType<typeof setTimeout> | null = null
const copyInvite = async () => {
  if (!inviteCode.value) return
  await navigator.clipboard.writeText(inviteCode.value)
  inviteCopied.value = true
  if (inviteCopiedTimeout) clearTimeout(inviteCopiedTimeout)
  inviteCopiedTimeout = setTimeout(() => {
    inviteCopied.value = false
  }, 1800)
}

const generateSchedule = async () => {
  scheduleError.value = ''
  groupAssignmentError.value = ''
  try {
    await onlineStore.generateSchedule()
  } catch (err) {
    scheduleError.value = (err as Error).message ?? 'Spielplan konnte nicht erstellt werden.'
  }
}

const changeGroupCount = async (nextGroupCount: number) => {
  if (!tournamentId.value) return
  groupAssignmentError.value = ''
  try {
    await onlineStore.setTournamentGroupCount(tournamentId.value, nextGroupCount)
  } catch (err) {
    groupAssignmentError.value = (err as Error).message ?? 'Gruppenzahl konnte nicht geändert werden.'
  }
}

const assignPlayerGroup = async (payload: { playerId: string; groupIndex?: number }) => {
  if (!tournamentId.value) return
  groupAssignmentError.value = ''
  try {
    await onlineStore.setPlayerGroup(tournamentId.value, payload.playerId, payload.groupIndex)
  } catch (err) {
    groupAssignmentError.value = (err as Error).message ?? 'Spieler konnte nicht verschoben werden.'
  }
}

const bulkAssignPlayerGroups = async (payload: {
  groupCount: number
  assignments: Array<{ playerId: string; groupIndex: number }>
}) => {
  if (!tournamentId.value) return
  groupAssignmentError.value = ''
  try {
    if (payload.groupCount !== groupCount.value) {
      await onlineStore.setTournamentGroupCount(tournamentId.value, payload.groupCount)
    }
    for (const assignment of payload.assignments) {
      await onlineStore.setPlayerGroup(tournamentId.value, assignment.playerId, assignment.groupIndex)
    }
  } catch (err) {
    groupAssignmentError.value = (err as Error).message ?? 'Zuteilung konnte nicht übernommen werden.'
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

const parsePlayerImport = () => {
  const parsed = parseGroupedPlayerImport(newPlayersInput.value, {
    maxGroupCount: maxGroupCount.value,
    initialGroupCount: groupCount.value
  })
  const existingByName = new Map<string, string>()
  players.value.forEach((player) => {
    const key = normalizeImportedName(player.name)
    if (!existingByName.has(key)) existingByName.set(key, player.id)
  })
  const namesToCreate = parsed.names.filter((name) => !existingByName.has(normalizeImportedName(name)))
  return { ...parsed, namesToCreate }
}

const generatePlayerLogins = async () => {
  generateError.value = ''
  generateInfo.value = ''
  if (generatingLogins.value) return
  if (!tournamentId.value) {
    generateError.value = 'Turnier-ID fehlt. Seite bitte neu laden.'
    return
  }
  generatingLogins.value = true
  try {
    const imported = parsePlayerImport()
    if (imported.names.length === 0) {
      generateError.value = 'Bitte mindestens einen Namen eingeben. Aus Excel: Gruppen-Label (A, B, …) gefolgt von Tabs und Namen.'
      return
    }
    let createdCount = 0
    let creationError: Error | null = null
    if (imported.namesToCreate.length > 0) {
      try {
        const codes = await onlineStore.generateLoginCodes(tournamentId.value, imported.namesToCreate)
        createdCount = codes.length
      } catch (err) {
        creationError = err as Error
        const partial = (err as any)?.logins as
          | Array<{ playerId: string; name: string; username: string; code: string }>
          | undefined
        if (partial) createdCount = partial.length
      }
    } else {
      await onlineStore.fetchTournamentDetail(tournamentId.value)
      await onlineStore.fetchLoginCodes(tournamentId.value)
    }
    if (imported.assignments.length > 0) {
      if (imported.requiredGroupCount !== groupCount.value) {
        await onlineStore.setTournamentGroupCount(tournamentId.value, imported.requiredGroupCount)
      }
      const playersByName = new Map<string, string>()
      onlineStore.players.forEach((player) => {
        const key = normalizeImportedName(player.name)
        if (!playersByName.has(key)) playersByName.set(key, player.id)
      })
      for (const assignment of imported.assignments) {
        const playerId = playersByName.get(normalizeImportedName(assignment.name))
        if (playerId) {
          await onlineStore.setPlayerGroup(tournamentId.value, playerId, assignment.groupIndex)
        }
      }
    }
    await onlineStore.fetchTournamentDetail(tournamentId.value)
    await onlineStore.fetchLoginCodes(tournamentId.value)
    await buildQrCodes(loginCodes.value)
    if (creationError) {
      generateError.value = creationError.message
      if (createdCount > 0) generateInfo.value = `${createdCount} Logins erstellt, übrige Namen bleiben oben stehen.`
      return
    }
    const existingMatches = imported.names.length - imported.namesToCreate.length
    generateInfo.value =
      `${createdCount} neue Logins erstellt` +
      `${existingMatches ? `, ${existingMatches} bestehende Spieler erkannt` : ''}` +
      `${imported.assignments.length ? ' und Gruppen zugeteilt' : ''}.`
    newPlayersInput.value = ''
  } catch (err) {
    console.error('generatePlayerLogins failed', err)
    generateError.value = (err as Error)?.message ?? 'Konnte keine Logins erstellen.'
  } finally {
    generatingLogins.value = false
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

const matchScore = (entry: FinishedMatchEntry) => {
  if (entry.stats.length < 2) return ''
  const [a, b] = entry.stats
  return `${a.legsWon}:${b.legsWon}`
}

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

const playerDeleteError = ref('')
const deletePlayerMessage = computed(() => {
  if (!deletePlayerTarget.value) return ''
  const base = `Willst du "${deletePlayerTarget.value.name}" wirklich aus diesem Turnier entfernen? Der Login-Code wird ebenfalls aus der Turnierliste entfernt.`
  return playerDeleteError.value ? `${base}\n\nFehler: ${playerDeleteError.value}` : base
})

const confirmDeleteTournamentPlayer = (playerId: string) => {
  const player = players.value.find((entry) => entry.id === playerId)
  if (!player) return
  generateError.value = ''
  groupAssignmentError.value = ''
  playerDeleteError.value = ''
  deletePlayerTarget.value = { id: player.id, name: player.name }
}

const handleDeletePlayer = async () => {
  if (!tournamentId.value || !deletePlayerTarget.value) return
  playerDeleteError.value = ''
  try {
    await onlineStore.removeTournamentPlayer(tournamentId.value, deletePlayerTarget.value.id)
    deletePlayerTarget.value = null
    await buildQrCodes(loginCodes.value)
  } catch (err) {
    const message = (err as Error).message ?? 'Spieler konnte nicht entfernt werden.'
    playerDeleteError.value = message
    groupAssignmentError.value = message
  }
}

const canStartMatch = (match: TournamentMatch) => {
  const userId = auth.session?.user?.id
  if (!userId) return false
  const isParticipant = match.playerAId === userId || match.playerBId === userId
  return isParticipant && match.status === 'pending' && isMatchUnlocked(match)
}

const canResumeMatch = (match: TournamentMatch) => {
  const userId = auth.session?.user?.id
  if (!userId) return false
  const isParticipant = match.playerAId === userId || match.playerBId === userId
  return isParticipant && match.status === 'in_progress' && !isMatchFinished(match)
}

const handleMatchClick = (match: TournamentMatch) => {
  if (match.status !== 'in_progress') return
  if (canResumeMatch(match)) {
    void resumeMatch(match.id)
  } else {
    void openLiveMatch(match.id)
  }
}

const resumeMatch = async (matchId: string) => {
  matchActionError.value = ''
  try {
    await gameStore.resumeMatch({ matchId, tournamentScope: 'online' })
    router.push('/game')
  } catch (err) {
    matchActionError.value = (err as Error).message ?? 'Match konnte nicht fortgesetzt werden.'
  }
}

const startMatch = async (matchId: string) => {
  matchActionError.value = ''
  const match = matches.value.find((entry) => entry.id === matchId)
  if (!match || !tournament.value) return
  if (!isMatchUnlocked(match)) {
    matchActionError.value = 'Dieses Gruppenspiel ist noch gesperrt. Bitte zuerst das vorherige Spiel dieser Gruppe abschliessen.'
    return
  }
  const playerA = players.value.find((player) => player.id === match.playerAId)
  const playerB = players.value.find((player) => player.id === match.playerBId)
  if (!playerA || !playerB) return

  try {
    await onlineStore.markMatchInProgress(match.id)
    const matchFormat = resolveMatchFormat(tournament.value, match)
    const matchDoubleOut = resolveMatchDoubleOut(tournament.value, match)
    gameStore.startNewMatch(playerA.name, playerB.name, {
      doubleOut: matchDoubleOut,
      format: matchFormat,
      tournamentId: tournament.value.id,
      matchId: match.id,
      startingScore: tournament.value.settings.startingScore ?? 501,
      tournamentScope: 'online',
      playerA: { id: playerA.id, name: playerA.name, createdAt: new Date().toISOString() },
      playerB: { id: playerB.id, name: playerB.name, createdAt: new Date().toISOString() }
    })
    router.push('/game')
  } catch (err) {
    matchActionError.value = (err as Error).message ?? 'Match konnte nicht gestartet werden.'
  }
}
</script>
