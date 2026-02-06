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
            v-for="(round, index) in rounds"
            :key="`round-${round.round}`"
            class="bracket-round"
          >
            <div class="bracket-round-title">
              {{ roundLabel(index, rounds.length) }}
            </div>
            <div class="bracket-matches" :style="roundContainerStyle(index)">
              <div
                v-for="(pair, pairIndex) in roundPairs(round.matches)"
                :key="`pair-${round.round}-${pairIndex}`"
                class="bracket-pair"
                :class="pair.length === 1 ? 'bracket-pair--single' : ''"
                :style="pairStyle(index, pairIndex)"
              >
                <div
                  v-for="match in pair"
                  :key="match.id"
                  class="bracket-match"
                >
                  <div class="bracket-game-number">Spiel {{ matchNumber(match) }}</div>
                  <div class="bracket-row" :class="winnerClass(match, match.playerAId)">
                    <span class="bracket-player">{{ playerLabel(match.playerAId) }}</span>
                    <span v-if="match.winnerId === match.playerAId" class="bracket-win">W</span>
                  </div>
                  <div class="bracket-row" :class="winnerClass(match, match.playerBId)">
                    <span class="bracket-player">{{ playerLabel(match.playerBId, match.playerAId) }}</span>
                    <span v-if="match.winnerId === match.playerBId" class="bracket-win">W</span>
                  </div>
                  <div class="bracket-meta">
                    <span v-if="matchScore(match)" class="bracket-score">
                      {{ matchScore(match) }}
                    </span>
                    <span class="bracket-status">{{ statusLabel(match.status) }}</span>
                    <button
                      v-if="showDetails && hasDetails(match)"
                      type="button"
                      class="bracket-details"
                      @click="emit('details', match.id)"
                    >
                      Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="championName" class="bracket-champion">
            <div class="bracket-round-title">Champion</div>
            <div class="bracket-champion-card">
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
                    <span class="compact-score">{{ matchScoreParts(match).a }}</span>
                  </div>
                  <div class="compact-player" :class="winnerClass(match, match.playerBId)">
                    <span class="compact-name">{{ playerLabel(match.playerBId, match.playerAId) }}</span>
                    <span class="compact-score">{{ matchScoreParts(match).b }}</span>
                  </div>
                </div>
                <button
                  v-if="showDetails && hasDetails(match)"
                  type="button"
                  class="compact-details"
                  @click="emit('details', match.id)"
                >
                  Details
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

const matchNumber = (match: TournamentMatch) => {
  if (match.id.startsWith('game-')) {
    return match.id.replace('game-', '')
  }
  return matchNumberMap.value.get(match.id) ?? '?'
}

const matchHeight = 104
const innerPairGap = 24
const pairHeight = matchHeight * 2 + innerPairGap
const baseGap = 32

const pairLayouts = computed(() => {
  const layouts: Array<{ tops: number[]; height: number }> = []
  rounds.value.forEach((round, roundIndex) => {
    const pairs = roundPairs(round.matches)
    if (roundIndex === 0) {
      const tops = pairs.map((_, idx) => idx * (pairHeight + baseGap))
      const height = tops.length ? tops[tops.length - 1] + pairHeight : pairHeight
      layouts.push({ tops, height })
      return
    }
    const prev = layouts[roundIndex - 1]
    const prevCenters = prev.tops.map((top) => top + pairHeight / 2)
    const tops: number[] = []
    for (let i = 0; i < pairs.length; i += 1) {
      const left = prevCenters[i * 2]
      const right = prevCenters[i * 2 + 1] ?? left
      const center = (left + right) / 2
      tops.push(center - pairHeight / 2)
    }
    const height = tops.length ? tops[tops.length - 1] + pairHeight : pairHeight
    layouts.push({ tops, height })
  })
  return layouts
})

const roundContainerStyle = (index: number) => {
  const layout = pairLayouts.value[index]
  if (!layout) return {}
  return { height: `${layout.height}px` }
}

const pairStyle = (roundIndex: number, pairIndex: number) => {
  const layout = pairLayouts.value[roundIndex]
  const top = layout?.tops[pairIndex] ?? 0
  return { top: `${top}px` }
}

const matchScore = (match: TournamentMatch) => {
  const result = resultsByMatch.value.get(match.id)
  if (!result) return ''
  const statA = result.stats.find((stat) => stat.playerId === match.playerAId)
  const statB = result.stats.find((stat) => stat.playerId === match.playerBId)
  if (!statA || !statB) return ''
  return `${statA.legsWon}:${statB.legsWon}`
}

const matchScoreParts = (match: TournamentMatch) => {
  const score = matchScore(match)
  if (!score) return { a: '-', b: '-' }
  const [a, b] = score.split(':')
  return { a: a ?? '-', b: b ?? '-' }
}

const hasDetails = (match: TournamentMatch) => Boolean(resultsByMatch.value.get(match.id))

const roundPairs = (matches: TournamentMatch[]) => {
  const pairs: TournamentMatch[][] = []
  for (let index = 0; index < matches.length; index += 2) {
    const pair = [matches[index], matches[index + 1]].filter(Boolean) as TournamentMatch[]
    pairs.push(pair)
  }
  return pairs
}

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
  return match.winnerId === playerId ? 'bracket-row--winner' : 'bracket-row--neutral'
}

const playerLabel = (playerId: string, fallbackId?: string) => {
  if (!playerId || playerId === 'TBD') return 'TBD'
  if (playerId.startsWith('winner:')) {
    const ref = playerId.replace('winner:', '')
    const number = ref.startsWith('game-') ? ref.replace('game-', '') : matchNumberMap.value.get(ref)
    return number ? `Sieger Spiel ${number}` : 'Sieger'
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
  background: linear-gradient(140deg, #0f172a 0%, #111827 40%, #1f2937 100%);
  border-radius: 20px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.35);
}

.bracket-card {
  padding: 32px;
  min-width: max-content;
  background-image:
    radial-gradient(circle at 20% 20%, rgba(34, 197, 94, 0.12) 0%, transparent 40%),
    radial-gradient(circle at 80% 10%, rgba(251, 191, 36, 0.12) 0%, transparent 45%);
}

.bracket-title {
  font-size: 18px;
  font-weight: 700;
  color: #e2e8f0;
  margin-bottom: 16px;
}

.bracket-grid {
  display: flex;
  gap: 36px;
  min-width: max-content;
}

.bracket-round {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 280px;
}

.bracket-round-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(226, 232, 240, 0.7);
}

.bracket-matches {
  position: relative;
  min-width: 280px;
}

.bracket-pair {
  position: absolute;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding-right: 36px;
}

.bracket-pair::before {
  content: '';
  position: absolute;
  right: 20px;
  top: 34px;
  bottom: 34px;
  width: 2px;
  background: rgba(226, 232, 240, 0.18);
}

.bracket-pair::after {
  content: '';
  position: absolute;
  right: 0;
  top: 50%;
  width: 34px;
  height: 2px;
  background: rgba(226, 232, 240, 0.18);
}

.bracket-pair--single::before {
  display: none;
}

.bracket-pair--single {
  min-height: 232px;
}

.bracket-match {
  position: relative;
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 16px;
  padding: 14px 14px 18px;
  min-height: 104px;
  backdrop-filter: blur(6px);
}

.bracket-game-number {
  position: absolute;
  top: -10px;
  left: -10px;
  background: rgba(15, 23, 42, 0.9);
  color: rgba(226, 232, 240, 0.85);
  font-size: 10px;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.3);
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
  color: #e2e8f0;
}

.compact-name {
  font-weight: 600;
}

.compact-score {
  font-weight: 700;
  color: rgba(226, 232, 240, 0.8);
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
}

.bracket-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.5);
}

.bracket-row + .bracket-row {
  margin-top: 8px;
}

.bracket-player {
  font-size: 14px;
  font-weight: 600;
  color: #e2e8f0;
  line-height: 1.3;
}

.bracket-win {
  font-size: 11px;
  font-weight: 700;
  color: #22c55e;
}

.bracket-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
  padding: 4px 2px 0;
}

.bracket-status {
  font-size: 11px;
  font-weight: 600;
  color: rgba(226, 232, 240, 0.55);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.bracket-score {
  font-size: 13px;
  font-weight: 700;
  color: rgba(251, 191, 36, 0.9);
}

.bracket-details {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(191, 219, 254, 0.9);
}

.bracket-details:hover {
  color: #93c5fd;
}

.bracket-champion {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
  min-width: 240px;
}

.bracket-champion-card {
  padding: 20px 24px;
  border-radius: 18px;
  border: 2px solid rgba(34, 197, 94, 0.6);
  background: rgba(34, 197, 94, 0.12);
  color: #bbf7d0;
  font-weight: 700;
  text-align: center;
}

.bracket-row--neutral {
  background: rgba(15, 23, 42, 0.45);
  border: 1px solid rgba(148, 163, 184, 0.15);
}

.bracket-row--winner {
  background: rgba(34, 197, 94, 0.18);
  border: 1px solid rgba(34, 197, 94, 0.65);
}

@media (max-width: 640px) {
  .bracket-card {
    padding: 26px;
  }

  .bracket-round {
    min-width: 240px;
  }

  .bracket-match {
    padding: 16px;
    min-height: unset;
  }

  .bracket-row {
    padding: 10px 12px;
  }

  .bracket-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    margin-top: 12px;
  }

  .bracket-status,
  .bracket-score,
  .bracket-details {
    font-size: 12px;
  }
}
</style>
