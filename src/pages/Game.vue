<template>
  <!--
    On a real iPhone, #app already pads itself by the safe-area insets
    (Dynamic Island top, home-indicator bottom). 100dvh would therefore
    be safe-top + safe-bottom ≈ 93 px too tall and the keypad's bottom
    row got pushed off-screen. We compute the actually-available content
    height instead so the layout fits flush regardless of device.
  -->
  <div
    class="flex flex-col bg-gradient-to-br from-background via-muted/30 to-background overflow-hidden"
    style="height: calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom));"
  >
    <div v-if="matchFinished" class="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center px-4 sm:px-6 py-10 sm:py-12">
      <div class="w-20 h-20 sm:w-24 sm:h-24 bg-dart-gold rounded-full flex items-center justify-center mb-6 shadow-xl animate-bounce">
        <i class="pi pi-trophy text-4xl text-white" />
      </div>
      <h1 class="text-4xl sm:text-5xl font-bold mb-3 text-foreground text-center">{{ winnerName ? 'Gewonnen!' : 'Unentschieden' }}</h1>
      <p v-if="winnerName" class="text-2xl sm:text-3xl text-primary font-bold mb-3 text-center break-words max-w-full">{{ winnerName }}</p>

      <!-- Endscore line: player names flanking the leg score in big
           tabular numerals. Always visible (winner or draw) so the
           spectator/player always sees the final result of the match. -->
      <div
        v-if="matchScoreParts"
        class="flex items-center justify-center gap-3 sm:gap-4 mb-6 max-w-full"
      >
        <span
          class="text-sm sm:text-base font-bold text-muted-foreground truncate max-w-[35vw] text-right"
          :class="matchScoreParts.winnerId === matchScoreParts.idA ? 'text-primary' : ''"
        >
          {{ matchScoreParts.nameA }}
        </span>
        <span class="text-4xl sm:text-5xl font-black text-foreground tabular-nums leading-none">
          {{ matchScoreParts.legsA }}
        </span>
        <span class="text-3xl sm:text-4xl font-black text-muted-foreground leading-none">:</span>
        <span class="text-4xl sm:text-5xl font-black text-foreground tabular-nums leading-none">
          {{ matchScoreParts.legsB }}
        </span>
        <span
          class="text-sm sm:text-base font-bold text-muted-foreground truncate max-w-[35vw]"
          :class="matchScoreParts.winnerId === matchScoreParts.idB ? 'text-primary' : ''"
        >
          {{ matchScoreParts.nameB }}
        </span>
      </div>

      <div class="grid gap-3 w-full max-w-3xl mb-6">
        <MatchPlayerStatsCard
          v-for="stat in matchStats"
          :key="stat.playerId"
          :stat="stat"
          :double-out="game.match?.doubleOut ?? true"
        />
      </div>

      <button
        @click="goAfterMatch"
        class="bg-primary text-primary-foreground rounded-2xl py-4 px-10 text-lg font-bold shadow-lg hover:shadow-xl transition-all active:scale-98"
      >
        {{ postMatchLabel }}
      </button>
    </div>

    <template v-else>
      <div class="shrink-0 bg-white border-b-2 border-border px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2 shadow-sm">
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
        <div class="flex items-center gap-1 shrink-0">
          <button
            @click="toggleMute"
            class="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-secondary active:scale-95 transition-all"
            :aria-label="muted ? 'Sound einschalten' : 'Sound ausschalten'"
          >
            <i :class="muted ? 'pi pi-volume-off' : 'pi pi-volume-up'" class="text-lg" />
          </button>
          <button
            @click="undo"
            :disabled="game.turns.length === 0"
            class="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-secondary disabled:opacity-30 active:scale-95 transition-all"
          >
            <i class="pi pi-undo text-lg" />
          </button>
        </div>
      </div>

      <div class="flex-1 min-h-0 mx-auto w-full sm:max-w-[1200px] flex flex-col">
      <div class="shrink-0">
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
      </div>

      <div class="px-3 sm:px-4 mb-2 shrink-0">
        <div class="flex gap-2 bg-white rounded-xl p-1 border-2 border-border">
          <button
            @click="setInputMode('total')"
            class="flex-1 py-2 rounded-lg font-bold transition-all text-sm"
            :disabled="isInputDisabled"
            :class="inputMode === 'total'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'text-muted-foreground'"
          >
            Gesamt
          </button>
          <button
            @click="setInputMode('individual')"
            class="flex-1 py-2 rounded-lg font-bold transition-all text-sm"
            :disabled="isInputDisabled"
            :class="inputMode === 'individual'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'text-muted-foreground'"
          >
            Einzelpfeile
          </button>
        </div>
      </div>

      <div v-if="inputMode === 'individual'" class="flex-1 min-h-0 flex flex-col">
        <div class="px-3 sm:px-4 mb-2 shrink-0">
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

        <div class="px-3 sm:px-4 mb-2 shrink-0">
          <div class="grid grid-cols-3 gap-2">
            <button
              @click="currentMultiplier = 1"
              class="py-2 rounded-xl font-bold transition-all border-2 text-sm"
              :class="currentMultiplier === 1
                ? 'bg-foreground text-white border-foreground shadow-md'
                : 'bg-white border-border text-foreground'"
            >
              Single
            </button>
            <button
              @click="currentMultiplier = 2"
              class="py-2 rounded-xl font-bold transition-all border-2 text-sm"
              :class="currentMultiplier === 2
                ? 'bg-accent text-accent-foreground border-accent shadow-md'
                : 'bg-white border-border text-foreground'"
            >
              Double
            </button>
            <button
              @click="currentMultiplier = 3"
              class="py-2 rounded-xl font-bold transition-all border-2 text-sm"
              :class="currentMultiplier === 3
                ? 'bg-dart-gold text-white border-dart-gold shadow-md'
                : 'bg-white border-border text-foreground'"
            >
              Triple
            </button>
          </div>
        </div>

        <div class="flex-1 min-h-0 px-3 sm:px-4 pb-2">
          <div class="h-full grid grid-cols-5 grid-rows-5 gap-1.5 sm:gap-2">
            <button
              v-for="num in dartNumbers"
              :key="num"
              @click="handleDartScore(num)"
              :disabled="currentThrows.length >= 3 || isInputDisabled"
              class="bg-white border-2 border-border rounded-xl text-base sm:text-lg font-black text-foreground active:scale-95 transition-transform hover:shadow-md hover:border-primary disabled:opacity-40 leading-none"
            >
              {{ num }}
            </button>
            <button
              @click="handleDartScore(25)"
              :disabled="currentThrows.length >= 3 || isInputDisabled"
              class="col-span-2 bg-white border-2 border-border rounded-xl text-base sm:text-lg font-black text-foreground active:scale-95 transition-transform hover:shadow-md hover:border-primary disabled:opacity-40 leading-none"
            >
              Bull
            </button>
            <button
              @click="handleDartScore(0)"
              :disabled="currentThrows.length >= 3 || isInputDisabled"
              class="col-span-2 bg-white border-2 border-border rounded-xl text-sm font-black text-muted-foreground active:scale-95 transition-transform hover:shadow-md disabled:opacity-40 leading-none"
            >
              Miss
            </button>
            <button
              @click="clearIndividual"
              :disabled="isInputDisabled"
              class="bg-destructive text-destructive-foreground rounded-xl text-sm font-black active:scale-95 transition-transform shadow-md leading-none"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      <div v-else class="flex-1 min-h-0 px-3 sm:px-4 pb-2">
        <TurnInputKeypad v-model:value="input" :disabled="isInputDisabled" @submit="submitTurn" />
      </div>
    </div>
    </template>

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
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import {
  initSounds,
  isSoundsMuted,
  playBustSound,
  playCheckoutSound,
  playClearSound,
  playClickSound,
  playMissSound,
  playOkSound,
  setSoundsMuted
} from '@/services/sounds'
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

// Desktop keyboard input — lets the user type their visit score on a
// physical keyboard instead of clicking the on-screen keypad. The
// listener mirrors the keypad's behaviour 1:1:
//   0–9 (top row OR numpad) → append digit (cap 3 chars)
//   Backspace               → pop last digit
//   Enter / Return          → submit (empty = miss, like tapping OK)
//   Escape / Delete         → clear input
// The handler bails out cleanly when:
//   - the match is finished, the keypad would be disabled, or
//     the user is in individual-throw mode (its own keyed UI),
//   - any modifier key is held (so browser/OS shortcuts still work),
//   - focus is in a form field / contentEditable element (so other
//     inputs on the page — e.g. dart-count dialog — keep accepting
//     keyboard input normally).
const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (target.isContentEditable) return true
  return false
}

const onKeydown = (event: KeyboardEvent) => {
  if (event.ctrlKey || event.altKey || event.metaKey) return
  if (isTypingTarget(event.target)) return
  if (matchFinished.value) return
  if (isInputDisabled.value) return
  if (inputMode.value !== 'total') return

  const key = event.key

  // Digit (top-row or numpad). `event.key` is the character so both
  // map to "0".."9" — we don't need event.code.
  if (key.length === 1 && key >= '0' && key <= '9') {
    event.preventDefault()
    if (input.value.length >= 3) return
    const digit = key
    input.value = input.value === '0' ? digit : `${input.value}${digit}`
    playClickSound()
    return
  }

  if (key === 'Backspace') {
    event.preventDefault()
    if (input.value.length === 0) return
    input.value = input.value.slice(0, -1)
    playClickSound()
    return
  }

  if (key === 'Enter' || key === 'Return') {
    event.preventDefault()
    const wasMiss = !input.value
    submitTurn()
    if (wasMiss) {
      playMissSound()
    } else {
      playOkSound()
    }
    return
  }

  if (key === 'Escape' || key === 'Delete') {
    event.preventDefault()
    if (input.value.length === 0) return
    input.value = ''
    playClearSound()
    return
  }
}

onMounted(() => {
  game.ensureMatch()
  initSounds()
  muted.value = isSoundsMuted()
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', onKeydown)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onKeydown)
  }
})

const muted = ref(false)
const toggleMute = () => {
  muted.value = !muted.value
  setSoundsMuted(muted.value)
  if (!muted.value) {
    // Tiny click on the way back on so the user knows audio is back.
    playClickSound()
  }
}

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
// Structured version of the same data, used to render the big
// "Name A — 2 : 1 — Name B" line on the post-match screen.
const matchScoreParts = computed(() => {
  const [a, b] = game.players
  if (!a || !b) return null
  return {
    idA: a.id,
    idB: b.id,
    nameA: a.name,
    nameB: b.name,
    legsA: game.legWins[a.id] ?? 0,
    legsB: game.legWins[b.id] ?? 0,
    winnerId: game.match?.winnerId ?? null
  }
})
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
  const statsMap: Record<
    string,
    { average: number; checkoutRate: number; checkoutAttempts: number }
  > = {}
  for (const player of game.players) {
    const turns = game.turns.filter((turn) => turn.playerId === player.id)
    const stats = calculateBasicStats(turns, game.match?.doubleOut ?? true)
    statsMap[player.id] = {
      average: Math.round(stats.average3Dart * 10) / 10,
      checkoutRate: stats.checkoutPercentage * 100,
      checkoutAttempts: stats.checkoutAttempts
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
    const stats = calculateMatchPlayerStats(turns, game.match?.doubleOut ?? true)
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
  // Empty input → treat as a 0-point "miss" so the user can advance
  // to the next player with a single OK tap when the visit scored
  // nothing worth typing.
  const raw = input.value.trim()
  const points = raw === '' ? 0 : Number.parseInt(raw, 10)
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

// iOS Safari sometimes fires a touch-derived click AND a synthetic mouse
// click ~50-100ms apart for the same tap, so a real "tap S20, tap S20"
// turned into "S20, S20, S20" (=60). Ignore repeat inputs that land within
// this cooldown.
const INPUT_COOLDOWN_MS = 80
let lastDartInputAt = 0

const handleDartScore = (score: number) => {
  if (isInputDisabled.value) return
  if (currentThrows.value.length >= 3) return
  const now = performance.now()
  if (now - lastDartInputAt < INPUT_COOLDOWN_MS) return
  lastDartInputAt = now
  if (score === 0) {
    playMissSound()
  } else {
    playClickSound()
  }
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
  playClearSound()
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
      playBustSound()
      setTimeout(() => (showBust.value = false), 1500)
    }
    if (lastTurn.checkoutHit) {
      showCheckout.value = true
      playCheckoutSound()
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
