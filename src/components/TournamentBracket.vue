<template>
  <div class="bracket-wrapper overflow-x-auto">
    <div class="bracket-card">
      <h2 v-if="title" class="bracket-title">{{ title }}</h2>
      <div v-if="rounds.length === 0" class="text-sm text-muted-foreground">
        Noch keine K.O.-Spiele vorhanden.
      </div>
      <div v-else>
        <div class="bracket-grid">
          <div
            v-for="(round, roundIndex) in rounds"
            :key="`round-${round.round}`"
            class="bracket-round"
            :class="roundIndex === rounds.length - 1 ? 'bracket-round--last' : ''"
          >
            <div class="bracket-round-title">
              {{ roundLabel(roundIndex, rounds.length) }}
            </div>
            <div
              class="bracket-round-body"
              :style="{ height: `${roundHeight(roundIndex)}px` }"
            >
              <!-- Match cards -->
              <div
                v-for="(match, matchIndex) in round.matches"
                :key="match.id"
                class="bracket-match-wrap"
                :class="roundIndex === rounds.length - 1 ? 'bracket-match-wrap--last' : ''"
                :style="{ top: `${matchTop(roundIndex, matchIndex)}px` }"
              >
                <span class="bracket-match-number">{{ matchNumber(match) }}</span>
                <div class="bracket-match">
                  <div class="bracket-row" :class="winnerClass(match, match.playerAId)">
                    <span class="bracket-player">{{ playerLabel(match.playerAId) }}</span>
                    <span class="bracket-avg">{{ averageFor(match, match.playerAId) }}</span>
                    <span class="bracket-legs">{{ legsFor(match, match.playerAId) }}</span>
                  </div>
                  <div class="bracket-row" :class="winnerClass(match, match.playerBId)">
                    <span class="bracket-player">{{ playerLabel(match.playerBId, match.playerAId) }}</span>
                    <span class="bracket-avg">{{ averageFor(match, match.playerBId) }}</span>
                    <span class="bracket-legs">{{ legsFor(match, match.playerBId) }}</span>
                  </div>
                  <div class="bracket-match-footer">
                    <span class="bracket-status">{{ statusLabel(match.status) }}</span>
                    <button
                      v-if="showDetails && hasDetails(match)"
                      type="button"
                      class="bracket-details"
                      :class="match.status === 'in_progress' ? 'bracket-details--live' : ''"
                      @click="emit('details', match.id)"
                    >
                      {{ match.status === 'in_progress' ? 'Live ansehen' : 'Details' }}
                    </button>
                  </div>
                </div>
              </div>

              <!-- Pair connectors: vertical line + horizontal line to next round -->
              <template v-if="roundIndex < rounds.length - 1">
                <template v-for="pair in pairConnectors(roundIndex)" :key="`vline-${roundIndex}-${pair.index}`">
                  <span
                    class="bracket-vline"
                    :style="{
                      top: `${pair.top}px`,
                      height: `${pair.height}px`,
                    }"
                  />
                  <span
                    class="bracket-hline-out"
                    :style="{ top: `${pair.middle}px` }"
                  />
                </template>
              </template>
            </div>
          </div>
          <div v-if="championName" class="bracket-champion">
            <div class="bracket-round-title">Champion</div>
            <div
              class="bracket-champion-card"
              :style="{ marginTop: `${championOffset}px` }"
            >
              {{ championName }}
            </div>
          </div>
        </div>

        <div class="bracket-compact">
          <div v-for="(round, index) in rounds" :key="`compact-${round.round}`" class="compact-round">
            <div class="compact-round-header">
              <div>
                <div class="compact-round-title">{{ roundLabel(index, rounds.length) }}</div>
                <div v-if="subtitle" class="compact-round-subtitle">{{ subtitle }}</div>
              </div>
              <span class="compact-round-status">{{ roundStatus(round.matches) }}</span>
            </div>
            <div class="compact-matches">
              <div v-for="match in round.matches" :key="match.id" class="compact-match">
                <div class="compact-match-number">{{ matchNumber(match) }}</div>
                <div class="compact-players">
                  <div class="compact-player" :class="winnerClass(match, match.playerAId)">
                    <span class="compact-name">{{ playerLabel(match.playerAId) }}</span>
                    <span class="compact-avg">{{ averageFor(match, match.playerAId) }}</span>
                    <span class="compact-score">{{ legsFor(match, match.playerAId) }}</span>
                  </div>
                  <div class="compact-player" :class="winnerClass(match, match.playerBId)">
                    <span class="compact-name">{{ playerLabel(match.playerBId, match.playerAId) }}</span>
                    <span class="compact-avg">{{ averageFor(match, match.playerBId) }}</span>
                    <span class="compact-score">{{ legsFor(match, match.playerBId) }}</span>
                  </div>
                </div>
                <button
                  v-if="showDetails && hasDetails(match)"
                  type="button"
                  class="compact-details"
                  :class="match.status === 'in_progress' ? 'compact-details--live' : ''"
                  @click="emit('details', match.id)"
                >
                  {{ match.status === 'in_progress' ? 'Live ansehen' : 'Details' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TournamentMatch, TournamentMatchResult } from '@/domain/models'

const props = defineProps<{
  matches: TournamentMatch[]
  playerName: (playerId: string) => string
  title?: string
  results?: TournamentMatchResult[]
  showDetails?: boolean
  subtitle?: string
}>()

const emit = defineEmits<{ (event: 'details', matchId: string): void }>()

const rounds = computed(() => {
  const byRound = new Map<number, TournamentMatch[]>()
  props.matches
    .filter((match) => match.phase === 'knockout')
    .forEach((match) => {
      const list = byRound.get(match.round) ?? []
      list.push(match)
      byRound.set(match.round, list)
    })
  return Array.from(byRound.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([round, matches]) => ({
      round,
      matches: matches.sort((a, b) => a.order - b.order)
    }))
})

const resultsByMatch = computed(() => {
  const map = new Map<string, TournamentMatchResult>()
  props.results?.forEach((result) => {
    map.set(result.matchId, result)
  })
  return map
})

const matchNumberMap = computed(() => {
  const map = new Map<string, number>()
  let current = 1
  rounds.value.forEach((round) => {
    round.matches.forEach((match) => {
      if (!map.has(match.id)) {
        map.set(match.id, current)
        current += 1
      }
    })
  })
  return map
})

// Reverse lookup: matchNumber → match. Lets a `winner:<ref>`
// placeholder resolve to the actual match it represents in O(1),
// which is how we surface the real winner's name in the next round
// the moment their match ends (even before the opposing match
// finishes).
const matchByNumber = computed(() => {
  const map = new Map<number, TournamentMatch>()
  rounds.value.forEach((round) => {
    round.matches.forEach((match) => {
      const num = matchNumberMap.value.get(match.id)
      if (num !== undefined) map.set(num, match)
    })
  })
  return map
})

const matchById = computed(() => {
  const map = new Map<string, TournamentMatch>()
  rounds.value.forEach((round) => {
    round.matches.forEach((match) => {
      map.set(match.id, match)
    })
  })
  return map
})

const matchNumber = (match: TournamentMatch) => {
  if (match.id.startsWith('game-')) {
    return match.id.replace('game-', '')
  }
  return matchNumberMap.value.get(match.id) ?? '?'
}

// Layout constants. matchHeight is the visual height of one match card;
// firstRoundGap is the vertical gap between consecutive matches in
// round 1 (everything after follows from there because each subsequent
// round's match centers vertically between its two feeder matches).
const matchHeight = 116
const firstRoundGap = 28

// Compute match-CENTER (not top) per match, propagated from round 1.
// A round-k match at index i sits vertically between its two feeders
// (round k-1 matches at indices 2i and 2i+1), which guarantees clean
// L-shaped connectors with no overlaps.
const matchCenters = computed(() => {
  const out: number[][] = []
  rounds.value.forEach((round, roundIndex) => {
    if (roundIndex === 0) {
      const centers = round.matches.map(
        (_, i) => matchHeight / 2 + i * (matchHeight + firstRoundGap)
      )
      out.push(centers)
      return
    }
    const prev = out[roundIndex - 1]
    const centers = round.matches.map((_, i) => {
      const a = prev[i * 2] ?? 0
      const b = prev[i * 2 + 1] ?? a
      return (a + b) / 2
    })
    out.push(centers)
  })
  return out
})

const matchTop = (roundIndex: number, matchIndex: number) =>
  (matchCenters.value[roundIndex]?.[matchIndex] ?? 0) - matchHeight / 2

const roundHeight = (roundIndex: number) => {
  const centers = matchCenters.value[roundIndex] ?? []
  if (centers.length === 0) return matchHeight
  return Math.max(...centers) + matchHeight / 2
}

// Pair-connector geometry: for every pair (m1, m2) in round k that
// feeds a round-(k+1) match, we draw a single vertical line from
// m1's center to m2's center, plus a short horizontal line at the
// midpoint going right into the next round. The match's own
// outgoing half-line on the right is rendered via CSS pseudo-element.
const pairConnectors = (roundIndex: number) => {
  const centers = matchCenters.value[roundIndex] ?? []
  const pairs: Array<{ index: number; top: number; height: number; middle: number }> = []
  for (let i = 0; i < centers.length; i += 2) {
    const a = centers[i]
    const b = centers[i + 1] ?? a
    const top = Math.min(a, b)
    const bottom = Math.max(a, b)
    pairs.push({ index: i / 2, top, height: bottom - top, middle: (a + b) / 2 })
  }
  return pairs
}

// Push the Champion card down so it visually aligns with the centre
// of the final match (which itself centres between the two semifinals).
const championOffset = computed(() => {
  const last = rounds.value[rounds.value.length - 1]
  if (!last || last.matches.length === 0) return 0
  const center = matchCenters.value[rounds.value.length - 1]?.[0] ?? 0
  return Math.max(0, center - matchHeight / 2)
})

const statFor = (match: TournamentMatch, playerId: string) => {
  if (!playerId) return undefined
  const result = resultsByMatch.value.get(match.id)
  if (!result) return undefined
  return result.stats.find((stat) => stat.playerId === playerId)
}

const legsFor = (match: TournamentMatch, playerId: string) => {
  const stat = statFor(match, playerId)
  if (!stat) return '-'
  return String(stat.legsWon)
}

const averageFor = (match: TournamentMatch, playerId: string) => {
  const stat = statFor(match, playerId)
  if (!stat) return ''
  if (stat.average <= 0) return ''
  return stat.average.toFixed(1)
}

const hasDetails = (match: TournamentMatch) =>
  Boolean(resultsByMatch.value.get(match.id)) || match.status === 'in_progress'

const roundLabel = (index: number, total: number) => {
  const firstRound = rounds.value[0]
  const firstRoundSize = firstRound ? firstRound.matches.length * 2 : 0
  const size = firstRoundSize / Math.pow(2, index)
  if (size >= 8) return `Top ${size}`
  if (size === 4) return 'Halbfinale'
  if (size === 2) return 'Finale'
  if (total - index === 1) return 'Finale'
  return 'Finale'
}

const statusLabel = (status: string) => {
  if (status === 'finished') return 'beendet'
  if (status === 'in_progress') return 'läuft'
  return 'bereit'
}

const roundStatus = (matches: TournamentMatch[]) => {
  if (matches.some((match) => match.status === 'in_progress')) return 'Ongoing'
  if (matches.length > 0 && matches.every((match) => match.status === 'finished')) return 'Finished'
  return 'Upcoming'
}

const winnerClass = (match: TournamentMatch, playerId: string) => {
  if (!match.winnerId) return 'bracket-row--neutral'
  return match.winnerId === playerId ? 'bracket-row--winner' : 'bracket-row--loser'
}

const playerLabel = (playerId: string, fallbackId?: string) => {
  if (!playerId || playerId === 'TBD') return 'TBD'
  if (playerId.startsWith('winner:')) {
    const ref = playerId.replace('winner:', '')
    // Resolve the placeholder reference to the actual match it
    // represents. `ref` is either a placeholder id ("game-5") which
    // maps via matchByNumber, or a real UUID which maps via matchById.
    let referencedMatch: TournamentMatch | undefined
    let number: number | undefined
    if (ref.startsWith('game-')) {
      number = Number(ref.replace('game-', ''))
      referencedMatch = !Number.isNaN(number) ? matchByNumber.value.get(number) : undefined
    } else {
      referencedMatch = matchById.value.get(ref)
      number = referencedMatch ? matchNumberMap.value.get(referencedMatch.id) : undefined
    }
    // KEY: if the referenced match already has a winner, show that
    // winner's real name in the next round — even if the opposing
    // match hasn't finished yet. This is the "winner advances early"
    // behaviour: as soon as a player wins their round, their name
    // appears in the next bracket slot, with "Sieger Spiel X" still
    // showing for the side whose feeder match is in progress.
    if (referencedMatch?.winnerId) {
      return props.playerName(referencedMatch.winnerId)
    }
    return number !== undefined ? `Sieger Spiel ${number}` : 'Sieger'
  }
  if (fallbackId && playerId === fallbackId) return `${props.playerName(playerId)} (Freilos)`
  return props.playerName(playerId)
}

const championName = computed(() => {
  if (rounds.value.length === 0) return ''
  const finalRound = rounds.value[rounds.value.length - 1]
  if (!finalRound) return ''
  const finalMatch = finalRound.matches[0]
  if (!finalMatch?.winnerId) return ''
  return props.playerName(finalMatch.winnerId)
})
</script>

<style scoped>
.bracket-wrapper {
  --match-width: 260px;
  --column-gap: 96px;
  --line-color: rgba(148, 163, 184, 0.4);
  --line-thickness: 2px;
  background: linear-gradient(140deg, #0f172a 0%, #111827 40%, #1f2937 100%);
  border-radius: 20px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.35);
}

.bracket-card {
  padding: 20px 24px 28px;
  min-width: max-content;
  background-image:
    radial-gradient(circle at 20% 20%, rgba(34, 197, 94, 0.10) 0%, transparent 45%),
    radial-gradient(circle at 80% 10%, rgba(251, 191, 36, 0.10) 0%, transparent 50%);
}

.bracket-title {
  font-size: 18px;
  font-weight: 700;
  color: #e2e8f0;
  margin-bottom: 20px;
}

.bracket-grid {
  display: flex;
  align-items: flex-start;
  min-width: max-content;
}

.bracket-round {
  display: flex;
  flex-direction: column;
  /* Width includes the column gap on the right so connector lines can
     live in the same coordinate system as the match card. The last
     round drops the trailing gap (no further round to connect to). */
  width: calc(var(--match-width) + var(--column-gap));
  flex-shrink: 0;
}

.bracket-round--last {
  width: var(--match-width);
}

.bracket-round-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(226, 232, 240, 0.65);
  margin-bottom: 16px;
}

.bracket-round-body {
  position: relative;
  width: 100%;
}

.bracket-match-wrap {
  position: absolute;
  left: 0;
  width: var(--match-width);
  height: 116px;
}

/* Half-line going right out of the match card to the vertical
   connector at column-gap/2. */
.bracket-match-wrap::after {
  content: '';
  position: absolute;
  left: 100%;
  top: 50%;
  width: calc(var(--column-gap) / 2);
  height: var(--line-thickness);
  background: var(--line-color);
  transform: translateY(-50%);
}

.bracket-match-wrap--last::after {
  display: none;
}

.bracket-match-number {
  position: absolute;
  top: 8px;
  left: -22px;
  width: 18px;
  text-align: right;
  font-size: 11px;
  font-weight: 700;
  color: rgba(226, 232, 240, 0.55);
  letter-spacing: 0.04em;
}

.bracket-match {
  position: relative;
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 14px;
  padding: 8px 10px 6px;
  height: 116px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  backdrop-filter: blur(6px);
}

.bracket-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 9px;
  background: rgba(15, 23, 42, 0.45);
  border: 1px solid rgba(148, 163, 184, 0.12);
  min-height: 32px;
}

.bracket-player {
  font-size: 13px;
  font-weight: 600;
  color: #e2e8f0;
  line-height: 1.25;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bracket-avg {
  font-size: 12px;
  font-weight: 600;
  color: rgba(226, 232, 240, 0.55);
  font-variant-numeric: tabular-nums;
  min-width: 30px;
  text-align: right;
}

.bracket-legs {
  font-size: 14px;
  font-weight: 800;
  color: rgba(226, 232, 240, 0.85);
  font-variant-numeric: tabular-nums;
  min-width: 16px;
  text-align: right;
}

.bracket-row--neutral {
  background: rgba(15, 23, 42, 0.45);
  border-color: rgba(148, 163, 184, 0.15);
}

.bracket-row--winner {
  background: rgba(34, 197, 94, 0.16);
  border-color: rgba(34, 197, 94, 0.55);
}

.bracket-row--winner .bracket-player,
.bracket-row--winner .bracket-legs {
  color: #bbf7d0;
}

.bracket-row--loser {
  background: rgba(15, 23, 42, 0.4);
  border-color: rgba(148, 163, 184, 0.12);
}

.bracket-row--loser .bracket-player,
.bracket-row--loser .bracket-avg,
.bracket-row--loser .bracket-legs {
  color: rgba(226, 232, 240, 0.55);
}

.bracket-match-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: auto;
  padding: 0 2px;
}

.bracket-status {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(226, 232, 240, 0.45);
}

.bracket-details {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(191, 219, 254, 0.85);
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
}

.bracket-details:hover {
  color: #93c5fd;
}

/* Vertical connector between the two feeder matches of a pair.
   Positioned at X = match width + column-gap/2. */
.bracket-vline {
  position: absolute;
  left: calc(var(--match-width) + var(--column-gap) / 2);
  width: var(--line-thickness);
  background: var(--line-color);
  transform: translateX(-50%);
}

/* Horizontal half-line from the vertical connector continuing into
   the next round's match card. */
.bracket-hline-out {
  position: absolute;
  left: calc(var(--match-width) + var(--column-gap) / 2);
  width: calc(var(--column-gap) / 2);
  height: var(--line-thickness);
  background: var(--line-color);
  transform: translateY(-50%);
}

.bracket-champion {
  display: flex;
  flex-direction: column;
  min-width: 220px;
  margin-left: 16px;
}

.bracket-champion-card {
  padding: 18px 22px;
  border-radius: 16px;
  border: 2px solid rgba(34, 197, 94, 0.6);
  background: rgba(34, 197, 94, 0.14);
  color: #bbf7d0;
  font-weight: 700;
  text-align: center;
}

.bracket-compact {
  display: none;
  flex-direction: column;
  gap: 16px;
}

.compact-round {
  border: 1px solid rgba(34, 197, 94, 0.35);
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.65);
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.4);
  overflow: hidden;
}

.compact-round-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(34, 197, 94, 0.12);
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
}

.compact-round-title {
  font-size: 15px;
  font-weight: 700;
  color: #e2e8f0;
}

.compact-round-subtitle {
  font-size: 12px;
  color: rgba(226, 232, 240, 0.7);
  margin-top: 2px;
}

.compact-round-status {
  font-size: 11px;
  font-weight: 700;
  color: #22c55e;
  text-transform: uppercase;
}

.compact-matches {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
}

.compact-match {
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 14px;
  padding: 10px 12px;
  display: grid;
  grid-template-columns: 32px 1fr auto;
  gap: 10px;
  align-items: center;
}

.compact-match-number {
  font-size: 12px;
  font-weight: 700;
  color: rgba(226, 232, 240, 0.7);
}

.compact-players {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.compact-player {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #e2e8f0;
  padding: 4px 8px;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.45);
  border: 1px solid rgba(148, 163, 184, 0.12);
}

.compact-name {
  font-weight: 600;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.compact-avg {
  font-size: 11px;
  font-weight: 600;
  color: rgba(226, 232, 240, 0.55);
  font-variant-numeric: tabular-nums;
}

.compact-score {
  font-size: 14px;
  font-weight: 800;
  color: rgba(226, 232, 240, 0.85);
  font-variant-numeric: tabular-nums;
  min-width: 16px;
  text-align: right;
}

.compact-player.bracket-row--winner {
  background: rgba(34, 197, 94, 0.16);
  border-color: rgba(34, 197, 94, 0.55);
}

.compact-player.bracket-row--winner .compact-name,
.compact-player.bracket-row--winner .compact-score {
  color: #bbf7d0;
}

.compact-player.bracket-row--loser .compact-name,
.compact-player.bracket-row--loser .compact-avg,
.compact-player.bracket-row--loser .compact-score {
  color: rgba(226, 232, 240, 0.55);
}

.compact-details {
  font-size: 11px;
  font-weight: 700;
  color: #22c55e;
  background: transparent;
  border: none;
  cursor: pointer;
}

@media (max-width: 900px) {
  .bracket-grid {
    display: none;
  }

  .bracket-compact {
    display: flex;
  }

  /* Compact view fits the viewport on its own — the desktop's
     `overflow-x-auto` + `min-width: max-content` combo would
     otherwise force the card to be as wide as its widest inner
     element (long player names, etc.), giving the user a
     horizontally-scrollable bracket on iPhone. Drop both so the
     compact layout shrinks to fit the screen. */
  .bracket-wrapper {
    overflow-x: hidden;
  }

  .bracket-card {
    min-width: 0;
  }

  /* Allow long names to truncate inside the compact match rows
     instead of pushing the card wider than the screen. */
  .compact-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

@media (max-width: 640px) {
  .bracket-card {
    padding: 16px;
  }
}
</style>
