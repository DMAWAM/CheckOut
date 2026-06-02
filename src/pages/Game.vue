<template>
  <div class="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background pb-6">
    <div v-if="matchFinished" class="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 py-10 sm:py-12">
      <div class="w-20 h-20 sm:w-24 sm:h-24 bg-dart-gold rounded-full flex items-center justify-center mb-6 shadow-xl animate-bounce">
        <i class="pi pi-trophy text-4xl text-white" />
      </div>
      <h1 class="text-4xl sm:text-5xl font-bold mb-3 text-foreground text-center">{{ winnerName ? 'Gewonnen!' : 'Unentschieden' }}</h1>
      <p class="text-2xl sm:text-3xl text-primary font-bold mb-8 text-center break-words max-w-full">{{ winnerName || matchScoreLabel }}</p>

      <div class="grid gap-4 w-full max-w-3xl mb-10">
        <MatchPlayerStatsCard v-for="stat in matchStats" :key="stat.playerId" :stat="stat" />
      </div>

      <button
        @click="goAfterMatch"
        class="bg-primary text-primary-foreground rounded-2xl py-5 px-10 text-xl font-bold shadow-lg hover:shadow-xl transition-all active:scale-98"
      >
        {{ postMatchLabel }}
      </button>
    </div>

    <div v-else>
      <div class="bg-white border-b-2 border-border px-3 sm:px-4 py-3 flex items-center justify-between gap-2 shadow-sm">
        <button
          @click="router.push('/')"
          class="w-11 h-11 shrink-0 flex items-center justify-center rounded-xl hover:bg-secondary active:scale-95 transition-all"
        >
          <i class="pi pi-arrow-left text-lg" />
        </button>
        <div class="text-center flex-1 min-w-0">
          <div class="text-[11px] sm:text-xs font-semibold text-muted-foreground truncate">{{ legLabel }}</div>
          <div class="text-[11px] sm:text-xs font-bold text-foreground mt-1 flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
            <span v-for="player in game.players" :key="player.id" class="flex items-center gap-1.5 sm:gap-2 max-w-[45vw]">
              <span class="w-2 h-2 sm:w-2.5 sm:h-2.5 shrink-0 rounded-full" :class="player.id === game.activePlayerId ? 'bg-primary' : 'bg-dart-gold'" />
              <span class="truncate">{{ player.name }}</span>
              <span class="text-muted-foreground font-semibold shrink-0">
                {{ formatLegSet(player.id) }}
              </span>
            </span>
          </div>
        </div>
        <button
          @click="undo"
          :disabled="game.turns.length === 0"
          class="w-11 h-11 shrink-0 flex items-center justify-center rounded-xl hover:bg-secondary disabled:opacity-30 active:scale-95 transition-all"
        >
          <i class="pi pi-undo text-lg" />
        </button>
      </div>

      <div class="mx-auto w-full sm:max-w-[1200px]">
      <Scoreboard
        :players="game.players"
        :scores="game.scores"
        :active-player-id="game.activePlayerId"
        :stats-by-player="statsByPlayer"
        :checkout-by-player="checkoutByPlayer"
        :match-format="matchFormat"
        :leg-wins="game.legWins"
        :set-wins="game.setWins"
        :set-leg-wins="game.setLegWins"
      />

      <div class="px-4 mb-3">
        <div class="flex gap-2 bg-white rounded-xl p-1 border-2 border-border">
          <button
            @click="setInputMode('total')"
            class="flex-1 py-2.5 rounded-lg font-bold transition-all"
            :disabled="isInputDisabled"
            :class="inputMode === 'total'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'text-muted-foreground'"
          >
            Gesamt
          </button>
          <button
            @click="setInputMode('individual')"
            class="flex-1 py-2.5 rounded-lg font-bold transition-all"
            :disabled="isInputDisabled"
            :class="inputMode === 'individual'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'text-muted-foreground'"
          >
            Einzelpfeile
          </button>
        </div>
      </div>

      <div v-if="inputMode === 'individual'">
        <div class="px-4 mb-3">
          <div class="bg-white border-2 border-border rounded-xl p-4">
            <div class="flex items-center justify-between">
              <div class="flex gap-2">
                <div
                  v-for="index in 3"
                  :key="index"
                  class="w-14 h-14 rounded-lg flex items-center justify-center font-black"
                  :class="currentThrows[index - 1]
                    ? 'bg-primary text-primary-foreground text-sm'
                    : 'bg-muted border-2 border-dashed border-border'"
                >
                  <div v-if="currentThrows[index - 1]" class="text-center leading-tight">
                    <div>
                      <span v-if="currentThrows[index - 1].multiplier > 1">
                        {{ currentThrows[index - 1].multiplier === 2 ? 'D' : 'T' }}
                      </span>
                      {{ currentThrows[index - 1].score }}
                    </div>
                  </div>
                  <span v-else class="text-xl text-muted-foreground">-</span>
                </div>
              </div>
              <div class="text-right">
                <div class="text-4xl font-black text-foreground">{{ currentThrowsTotal }}</div>
                <div class="text-[10px] text-muted-foreground font-semibold">Punkte</div>
              </div>
            </div>
          </div>
        </div>

        <div class="px-4 mb-3">
          <div class="grid grid-cols-3 gap-2">
            <button
              @click="currentMultiplier = 1"
              class="py-3 rounded-xl font-bold transition-all border-2"
              :class="currentMultiplier === 1
                ? 'bg-foreground text-white border-foreground shadow-md scale-105'
                : 'bg-white border-border text-foreground'"
            >
              Single
            </button>
            <button
              @click="currentMultiplier = 2"
              class="py-3 rounded-xl font-bold transition-all border-2"
              :class="currentMultiplier === 2
                ? 'bg-accent text-accent-foreground border-accent shadow-md scale-105'
                : 'bg-white border-border text-foreground'"
            >
              Double
            </button>
            <button
              @click="currentMultiplier = 3"
              class="py-3 rounded-xl font-bold transition-all border-2"
              :class="currentMultiplier === 3
                ? 'bg-dart-gold text-white border-dart-gold shadow-md scale-105'
                : 'bg-white border-border text-foreground'"
            >
              Triple
            </button>
          </div>
        </div>

        <div class="px-3 sm:px-4 mb-3">
          <div class="grid grid-cols-5 gap-1.5 sm:gap-2">
            <button
              v-for="num in dartNumbers"
              :key="num"
              @click="handleDartScore(num)"
              :disabled="currentThrows.length >= 3 || isInputDisabled"
              class="bg-white border-2 border-border rounded-xl py-3 sm:py-4 text-base sm:text-lg font-black text-foreground active:scale-95 transition-all hover:shadow-md hover:border-primary disabled:opacity-40"
            >
              {{ num }}
            </button>
            <button
              @click="handleDartScore(25)"
              :disabled="currentThrows.length >= 3 || isInputDisabled"
              class="col-span-2 bg-white border-2 border-border rounded-xl py-3 sm:py-4 text-base sm:text-lg font-black text-foreground active:scale-95 transition-all hover:shadow-md hover:border-primary disabled:opacity-40"
            >
              Bull
            </button>
            <button
              @click="handleDartScore(0)"
              :disabled="currentThrows.length >= 3 || isInputDisabled"
              class="col-span-2 bg-white border-2 border-border rounded-xl py-3 sm:py-4 text-sm font-black text-muted-foreground active:scale-95 transition-all hover:shadow-md disabled:opacity-40"
            >
              Miss
            </button>
            <button
              @click="clearIndividual"
              :disabled="isInputDisabled"
              class="bg-destructive text-destructive-foreground rounded-xl py-3 sm:py-4 text-sm font-black active:scale-95 transition-all shadow-md"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      <div v-else class="px-4 mb-3">
        <TurnInputKeypad v-model:value="input" :disabled="isInputDisabled" @submit="submitTurn" />
      </div>

      <TurnHistory :turns="recentTurns" :players="game.players" />
    </div>

    <div v-if="showBust" class="fixed inset-0 bg-destructive/95 flex items-center justify-center z-50 animate-in fade-in duration-300 px-6" style="padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom);">
      <div class="text-center">
        <div class="w-24 h-24 sm:w-28 sm:h-28 bg-white rounded-full flex items-center justify-center mx-auto mb-6">
          <i class="pi pi-exclamation-circle text-5xl text-destructive" />
        </div>
        <div class="text-6xl sm:text-7xl font-black text-white">BUST!</div>
      </div>
    </div>

    <div v-if="showCheckout" class="fixed inset-0 bg-primary/95 flex items-center justify-center z-50 animate-in fade-in duration-300 px-6" style="padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom);">
      <div class="text-center">
        <div class="w-24 h-24 sm:w-28 sm:h-28 bg-white rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
          <i class="pi pi-trophy text-5xl text-primary" />
        </div>
        <div class="text-6xl sm:text-7xl font-black text-white">CHECKOUT!</div>
      </div>
    </div>

    <div v-if="showCheckoutDialog" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" style="padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom);">
      <div class="bg-white border-2 border-border rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <h3 class="text-lg font-bold text-foreground mb-2">Checkout bestätigen</h3>
        <p class="text-sm text-muted-foreground mb-5">
          Wie viele Darts hast du für diese Aufnahme gebraucht?
          <span v-if="checkoutRequiresDouble" class="block mt-1">
            (Der letzte Pfeil muss auf einem Doppel gelandet sein.)
          </span>
        </p>
        <div class="grid grid-cols-3 gap-2 mb-3">
          <button
            v-for="darts in plausibleDartCounts"
            :key="`darts-${darts}`"
            class="rounded-xl py-4 font-black text-lg border-2 border-primary bg-primary text-primary-foreground active:scale-95 transition-all"
            @click="confirmCheckout(darts, true)"
          >
            {{ darts }} {{ darts === 1 ? 'Pfeil' : 'Pfeile' }}
          </button>
        </div>
        <button
          v-if="checkoutRequiresDouble"
          class="w-full bg-destructive text-destructive-foreground rounded-xl py-3 font-bold"
          @click="confirmCheckout(3, false)"
        >
          Bust – kein Double getroffen
        </button>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/gameStore'
import { calculateBasicStats, calculateMatchPlayerStats } from '@/domain/statsCalculator'
import { getCheckoutSuggestion } from '@/domain/checkoutTable'
import Scoreboard from '@/components/Scoreboard.vue'
import TurnInputKeypad from '@/components/TurnInputKeypad.vue'
import TurnHistory from '@/components/TurnHistory.vue'
import MatchPlayerStatsCard from '@/components/MatchPlayerStatsCard.vue'

const router = useRouter()
const game = useGameStore()
const input = ref('')

const inputMode = ref<'total' | 'individual'>('total')
const currentThrows = ref<Array<{ score: number; multiplier: 1 | 2 | 3 }>>([])
const currentMultiplier = ref<1 | 2 | 3>(1)

const showBust = ref(false)
const showCheckout = ref(false)

const dartNumbers = Array.from({ length: 20 }, (_, i) => i + 1)
const currentThrowsTotal = computed(() =>
  currentThrows.value.reduce((sum, t) => sum + t.score * t.multiplier, 0)
)

onMounted(() => {
  game.ensureMatch()
})

const startingScore = computed(() => game.match?.startingScore ?? 501)
const legLabel = computed(() => {
  const outLabel = game.match?.doubleOut ? 'Double-Out' : 'Single-Out'
  return `Leg ${game.leg?.legNumber ?? 1} • ${startingScore.value} ${outLabel}`
})
const matchFormat = computed(() => game.match?.format ?? null)
const targetSets = computed(() => matchFormat.value?.setsToWin ?? 1)
const targetLegsPerSet = computed(() =>
  matchFormat.value?.legsPerSet ?? matchFormat.value?.legsToWin ?? 1
)
const targetLegsOnly = computed(() => matchFormat.value?.fixedLegs ?? matchFormat.value?.legsToWin ?? 1)
const matchFinished = computed(() => game.match?.status === 'finished')
const winnerName = computed(() => {
  const winnerId = game.match?.winnerId
  return game.players.find((player) => player.id === winnerId)?.name ?? ''
})
const matchScoreLabel = computed(() =>
  game.players.map((player) => `${player.name} ${game.legWins[player.id] ?? 0}`).join(' · ')
)
const postMatchRoute = computed(() => {
  if (!game.match?.tournamentId) return '/'
  if (game.match.tournamentScope === 'online') {
    return `/tournaments/online/${game.match.tournamentId}`
  }
  return `/tournaments/${game.match.tournamentId}`
})
const postMatchLabel = computed(() => (game.match?.tournamentId ? 'Zurück zum Turnier' : 'Zum Hauptmenü'))

const goAfterMatch = () => {
  router.push(postMatchRoute.value)
}

const showCheckoutDialog = computed(() => game.pendingCheckout !== null)
const checkoutRequiresDouble = computed(() => game.pendingCheckout?.requiresDouble ?? false)
const isInputDisabled = computed(() => game.legWinnerId !== null)

// Which dart counts (1/2/3) can physically have produced this checkout score?
// We surface only the plausible ones so 81 with one dart or 140 with two darts
// (both impossible) don't appear as choices.
const isPlausibleDartCount = (score: number, darts: 1 | 2 | 3, doubleOut: boolean): boolean => {
  if (score < 1) return false
  if (darts === 1) {
    if (doubleOut) {
      // Must land on a double — D1..D20 or DBull
      return (score >= 2 && score <= 40 && score % 2 === 0) || score === 50
    }
    // Single dart can hit any segment value; this is the achievable set.
    const achievable = new Set([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
      21, 22, 24, 25, 26, 27, 28, 30, 32, 33, 34, 36, 38, 39, 40, 42, 45, 48,
      50, 51, 54, 57, 60
    ])
    return achievable.has(score)
  }
  if (darts === 2) {
    // 2-dart double-out max = T20 + DBull = 110; single-out max = T20 + T20 = 120
    return doubleOut ? score >= 2 && score <= 110 : score >= 2 && score <= 120
  }
  // 3 darts: any standard checkout-able score (the dialog only opens for these)
  return doubleOut ? score >= 2 && score <= 170 : score >= 1 && score <= 180
}

const plausibleDartCounts = computed<Array<1 | 2 | 3>>(() => {
  const points = game.pendingCheckout?.points ?? 0
  const requiresDouble = checkoutRequiresDouble.value
  const candidates: Array<1 | 2 | 3> = [1, 2, 3]
  const plausible = candidates.filter((darts) => isPlausibleDartCount(points, darts, requiresDouble))
  // Safety net — if nothing matches (shouldn't happen for a real checkout),
  // fall back to "3 darts" so the user can still resolve the dialog.
  return plausible.length > 0 ? plausible : [3]
})

const statsByPlayer = computed(() => {
  const statsMap: Record<string, { average: number; checkoutRate: number }> = {}
  for (const player of game.players) {
    const turns = game.turns.filter((turn) => turn.playerId === player.id)
    const stats = calculateBasicStats(turns)
    statsMap[player.id] = {
      average: Math.round(stats.average3Dart * 10) / 10,
      checkoutRate: stats.checkoutPercentage * 100
    }
  }
  return statsMap
})

const checkoutByPlayer = computed(() => {
  const checkoutMap: Record<string, string[] | null> = {}
  for (const player of game.players) {
    const score = game.scores[player.id] ?? 0
    checkoutMap[player.id] = score <= 170 ? getCheckoutSuggestion(score) : null
  }
  return checkoutMap
})

const recentTurns = computed(() => game.recentTurns.slice(0, 4))

const formatLegSet = (playerId: string) => {
  if (matchFormat.value?.useSets) {
    const sets = game.setWins[playerId] ?? 0
    const legs = game.setLegWins[playerId] ?? 0
    return `S${sets}/${targetSets.value} · L${legs}/${targetLegsPerSet.value}`
  }
  const legs = game.legWins[playerId] ?? 0
  return `L${legs}/${targetLegsOnly.value}`
}

const matchStats = computed(() => {
  const legWinsByPlayer: Record<string, number> = {}
  let totalLegs = 0
  game.legs.forEach((leg) => {
    if (!leg.winnerId) return
    totalLegs += 1
    legWinsByPlayer[leg.winnerId] = (legWinsByPlayer[leg.winnerId] ?? 0) + 1
  })

  return game.players.map((player) => {
    const turns = game.turns.filter((turn) => turn.playerId === player.id)
    const stats = calculateMatchPlayerStats(turns)
    const legsWon = legWinsByPlayer[player.id] ?? 0
    const legsLost = Math.max(totalLegs - legsWon, 0)

    return {
      playerId: player.id,
      name: player.name,
      isWinner: Boolean(game.match?.winnerId) && player.id === game.match?.winnerId,
      isDraw: !game.match?.winnerId,
      legsWon,
      legsLost,
      ...stats
    }
  })
})

const submitTurn = () => {
  if (isInputDisabled.value) return
  const points = Number.parseInt(input.value, 10)
  if (Number.isNaN(points) || points < 0 || points > 180) {
    input.value = ''
    return
  }
  game.requestTurn(points)
  input.value = ''
}

const undo = () => {
  game.undoLastTurn()
}

const confirmCheckout = (dartsUsed: number, doubleHit: boolean) => {
  game.confirmCheckout(dartsUsed, doubleHit)
}

const setInputMode = (mode: 'total' | 'individual') => {
  if (isInputDisabled.value) return
  inputMode.value = mode
  input.value = ''
  currentThrows.value = []
  currentMultiplier.value = 1
}

const handleDartScore = (score: number) => {
  if (isInputDisabled.value) return
  if (currentThrows.value.length >= 3) return
  const multiplier = score === 25 && currentMultiplier.value === 3 ? 2 : currentMultiplier.value
  const newThrows = [...currentThrows.value, { score, multiplier }]
  currentThrows.value = newThrows

  const startedScore = game.activePlayerId ? (game.scores[game.activePlayerId] ?? 0) : 0
  const total = newThrows.reduce((sum, t) => sum + t.score * t.multiplier, 0)
  const remaining = startedScore - total
  const requiresDouble = game.match?.doubleOut ?? true
  const lastIsDouble = multiplier === 2
  const isCheckout = remaining === 0 && (!requiresDouble || lastIsDouble)

  if (isCheckout) {
    submitIndividualTurn(newThrows, lastIsDouble)
    return
  }

  if (newThrows.length === 3) {
    submitIndividualTurn(newThrows, lastIsDouble)
  }
}

const submitIndividualTurn = (
  throws: Array<{ score: number; multiplier: 1 | 2 | 3 }>,
  checkoutDouble = false
) => {
  const total = throws.reduce((sum, t) => sum + t.score * t.multiplier, 0)
  // Individual mode already knows exactly how many darts were thrown — pass
  // it through so the checkout-quote / 3-dart-average use the real count.
  game.submitKnownTurn(total, checkoutDouble, throws.length)
  currentThrows.value = []
  currentMultiplier.value = 1
}

const clearIndividual = () => {
  if (isInputDisabled.value) return
  currentThrows.value = []
  currentMultiplier.value = 1
}

watch(
  () => game.turns.length,
  () => {
    const lastTurn = game.turns[game.turns.length - 1]
    if (!lastTurn) return
    if (lastTurn.bust) {
      showBust.value = true
      setTimeout(() => (showBust.value = false), 1500)
    }
    if (lastTurn.checkoutHit) {
      showCheckout.value = true
      setTimeout(() => (showCheckout.value = false), 2000)
    }
  }
)

watch(
  () => game.leg?.id,
  () => {
    input.value = ''
    currentThrows.value = []
    currentMultiplier.value = 1
    inputMode.value = 'total'
  }
)
</script>
