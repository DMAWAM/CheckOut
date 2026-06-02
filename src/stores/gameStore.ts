import { defineStore } from 'pinia'
import type { GameMode, Leg, Match, MatchFormat, Player, Turn } from '@/domain/models'
import type { LiveMatchSnapshot } from '@/domain/liveMatch'
import type { MatchSummary } from '@/domain/matchSummary'
import { createId } from '@/domain/id'
import { createTurn } from '@/domain/gameRules'
import { calculateMatchPlayerStats } from '@/domain/statsCalculator'
import { useMatchHistoryStore } from '@/stores/matchHistoryStore'
import { useTournamentsStore } from '@/stores/tournamentsStore'
import { useOnlineTournamentsStore } from '@/stores/onlineTournamentsStore'

interface PendingCheckout {
  points: number
  /** true if the checkout-confirmation needs to ask whether the final dart hit
   *  a double (only relevant in double-out matches). */
  requiresDouble: boolean
}

/**
 * Run `fn` up to `attempts` times with exponential backoff. Used for the
 * online recordMatchResult call so a transient network blip / RLS hiccup
 * doesn't strand the tournament in "still in_progress" state on every
 * other player's screen.
 */
const retryAsync = async <T>(
  fn: () => Promise<T>,
  opts: { attempts: number; baseDelayMs: number; label: string }
): Promise<T | undefined> => {
  let lastError: unknown
  for (let attempt = 0; attempt < opts.attempts; attempt += 1) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      const delay = opts.baseDelayMs * Math.pow(2, attempt)
      console.warn(`[${opts.label}] attempt ${attempt + 1} failed`, err, `retrying in ${delay}ms`)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
  console.error(`[${opts.label}] all retries failed`, lastError)
  return undefined
}

/**
 * A match that should be capped at a declared number of legs ("fixed legs"),
 * regardless of who is winning. The canonical signal is `type: 'fixed_legs'`,
 * but `allowDraw` and `fixedLegs` are equally diagnostic (set only by the
 * fixed-legs branch of TournamentCreate.buildFormat) and we accept them too
 * to defend against tournaments where the format type was saved wrong.
 */
const isFixedLegsLike = (format: MatchFormat | undefined): boolean => {
  if (!format) return false
  if (format.type === 'fixed_legs') return true
  if (format.allowDraw === true) return true
  if (format.fixedLegs !== undefined) return true
  return false
}


interface GameState {
  players: Player[]
  match: Match | null
  leg: Leg | null
  legs: Leg[]
  turns: Turn[]
  scores: Record<string, number>
  activePlayerId: string | null
  pendingCheckout: PendingCheckout | null
  legWinnerId: string | null
  legWins: Record<string, number>
  setWins: Record<string, number>
  setLegWins: Record<string, number>
}

const localKey = (matchId: string) => `checkout_live_match_${matchId}`

const loadLocalSnapshot = (matchId: string): LiveMatchSnapshot | null => {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(localKey(matchId))
  if (!raw) return null
  try {
    return JSON.parse(raw) as LiveMatchSnapshot
  } catch {
    return null
  }
}

const saveLocalSnapshot = (matchId: string, snapshot: LiveMatchSnapshot) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(localKey(matchId), JSON.stringify(snapshot))
}

const clearLocalSnapshot = (matchId: string) => {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(localKey(matchId))
}

export const useGameStore = defineStore('game', {
  state: (): GameState => ({
    players: [],
    match: null,
    leg: null,
    legs: [],
    turns: [],
    scores: {},
    activePlayerId: null,
    pendingCheckout: null,
    legWinnerId: null,
    legWins: {},
    setWins: {},
    setLegWins: {}
  }),
  getters: {
    activePlayer(state): Player | null {
      return state.players.find((player) => player.id === state.activePlayerId) ?? null
    },
    activeScore(state): number {
      if (!state.activePlayerId) return 0
      return state.scores[state.activePlayerId] ?? 0
    },
    recentTurns(state): Turn[] {
      return [...state.turns].slice(-8).reverse()
    }
  },
  actions: {
    startNewMatch(
      playerAName: string,
      playerBName: string,
      options?: {
        doubleOut?: boolean
        format?: MatchFormat
        tournamentId?: string
        matchId?: string
        playerA?: Player
        playerB?: Player
        startingPlayerId?: string
        startingScore?: number
        tournamentScope?: 'local' | 'online'
      }
    ) {
      const now = new Date().toISOString()
      const playerA: Player = options?.playerA ?? { id: createId(), name: playerAName, createdAt: now }
      const playerB: Player = options?.playerB ?? { id: createId(), name: playerBName, createdAt: now }
      const matchId = options?.matchId ?? createId()
      const legId = createId()
      const startingScore = options?.startingScore ?? 501
      const mode: GameMode = startingScore === 301 ? '301' : startingScore === 701 ? '701' : '501'

      this.players = [playerA, playerB]
      this.match = {
        id: matchId,
        createdAt: now,
        mode,
        startingScore,
        doubleOut: options?.doubleOut ?? true,
        playerIds: [playerA.id, playerB.id],
        legsToWin: options?.format?.legsToWin,
        format: options?.format,
        status: 'in_progress',
        tournamentId: options?.tournamentId,
        tournamentScope: options?.tournamentScope
      }
      this.leg = {
        id: legId,
        matchId,
        legNumber: 1,
        startingPlayerId: options?.startingPlayerId ?? playerA.id
      }
      this.legs = [this.leg]
      this.turns = []
      this.scores = {
        [playerA.id]: startingScore,
        [playerB.id]: startingScore
      }
      this.activePlayerId = options?.startingPlayerId ?? playerA.id
      this.pendingCheckout = null
      this.legWinnerId = null
      this.legWins = { [playerA.id]: 0, [playerB.id]: 0 }
      this.setWins = { [playerA.id]: 0, [playerB.id]: 0 }
      this.setLegWins = { [playerA.id]: 0, [playerB.id]: 0 }
      // Verbose: helps us diagnose "match did not end after N legs" bugs by
      // making the exact format used by this match visible in the console.
      console.info('[gameStore] startNewMatch', {
        matchId,
        format: options?.format,
        doubleOut: this.match.doubleOut,
        tournamentScope: options?.tournamentScope
      })
      if (this.match?.status !== 'finished') {
        this.persistLiveState()
      }
    },
    ensureMatch() {
      if (this.match && this.players.length === 2) return
      this.startNewMatch('Player A', 'Player B')
    },
    requestTurn(points: number) {
      if (!this.activePlayerId || !this.leg || !this.match) return
      if (this.pendingCheckout || this.legWinnerId) return

      const startedScore = this.scores[this.activePlayerId]
      const isCheckout = startedScore - points === 0

      if (isCheckout) {
        // Ask the user how many darts were used and (in double-out) whether
        // the final dart was a double. Both pieces are needed for the
        // checkout-quote and 3-dart-average stats.
        this.pendingCheckout = { points, requiresDouble: this.match.doubleOut }
        return
      }

      this.applyTurn(points, false)
    },
    /**
     * Resolve a pending checkout.
     * @param dartsUsed how many darts the player took for this aufnahme (1-3)
     * @param doubleHit true if the final dart landed in a double (only
     *   relevant for double-out matches; ignored otherwise)
     */
    confirmCheckout(dartsUsed: number, doubleHit: boolean) {
      if (!this.pendingCheckout) return
      const safeDarts = Math.max(1, Math.min(3, Math.round(dartsUsed))) as 1 | 2 | 3
      this.applyTurn(this.pendingCheckout.points, doubleHit, safeDarts)
      this.pendingCheckout = null
    },
    submitKnownTurn(points: number, checkoutDouble: boolean, dartsUsed?: number) {
      if (!this.activePlayerId || !this.leg || !this.match) return
      this.pendingCheckout = null
      this.applyTurn(points, checkoutDouble, dartsUsed)
    },
    cancelPendingCheckout() {
      this.pendingCheckout = null
    },
    applyTurn(points: number, checkoutDouble: boolean, dartsUsed?: number) {
      if (!this.activePlayerId || !this.leg || !this.match) return

      // Recovery safety net: a previous bug (or stale snapshot) could leave
      // the player in a leg beyond the format's leg cap. If we're about to
      // throw a turn in such a leg, abort and finish the match from the
      // existing state. Cures a match that's stuck in "Leg 3" of a 2-leg
      // tournament — the players see the result modal instead of being
      // forced to play another leg.
      if (isFixedLegsLike(this.match.format)) {
        const target = this.match.format.fixedLegs ?? this.match.format.legsToWin ?? 0
        if (target > 0 && this.leg.legNumber > target) {
          console.warn(
            '[gameStore] applyTurn aborted — already past fixed-legs target, finishing match',
            { legNumber: this.leg.legNumber, target, format: this.match.format, legWins: { ...this.legWins } }
          )
          this.finishFixedLegsMatch()
          return
        }
      }

      const startedScore = this.scores[this.activePlayerId]
      const isCheckout = startedScore - points === 0
      const isBustFromMissedDouble = isCheckout && this.match.doubleOut && !checkoutDouble
      // Non-checkout turns always use 3 darts; checkout turns use the
      // player-provided count (or default to 3 if unknown). A bust on the
      // final double also counts as 3 darts thrown (the player took swings).
      const dartsThrown = !isCheckout || isBustFromMissedDouble
        ? 3
        : Math.max(1, Math.min(3, Math.round(dartsUsed ?? 3)))

      const { turn, nextScore, legWon } = createTurn({
        turnId: createId(),
        legId: this.leg.id,
        playerId: this.activePlayerId,
        turnIndex: this.turns.length + 1,
        startedScore,
        points,
        doubleOut: this.match.doubleOut,
        checkoutDouble,
        dartsThrown
      })

      this.turns.push(turn)
      this.scores[this.activePlayerId] = nextScore

      if (legWon) {
        const winnerId = this.activePlayerId
        this.legWinnerId = winnerId
        this.leg.winnerId = winnerId
        this.leg.endedAt = new Date().toISOString()

        this.updateLegCounters(winnerId)

        const fixedDone = this.isFixedLegsComplete()
        const matchWon = !fixedDone && this.isMatchWon(winnerId)
        console.info('[gameStore] leg ended', {
          legNumber: this.leg.legNumber,
          winnerId,
          legWins: { ...this.legWins },
          completedLegs: this.completedLegCount(),
          format: this.match.format,
          decision: fixedDone ? 'finishFixedLegsMatch' : matchWon ? 'finishMatch' : 'startNextLeg'
        })
        if (fixedDone) {
          this.finishFixedLegsMatch()
        } else if (matchWon) {
          this.finishMatch(winnerId)
        } else {
          this.startNextLeg()
        }
      } else {
        this.activePlayerId = this.nextPlayerId(this.activePlayerId)
      }
      this.persistLiveState()
    },
    nextPlayerId(currentId: string): string {
      const other = this.players.find((player) => player.id !== currentId)
      return other?.id ?? currentId
    },
    updateLegCounters(winnerId: string) {
      this.legWins[winnerId] = (this.legWins[winnerId] ?? 0) + 1

      if (this.match?.format?.useSets) {
        this.setLegWins[winnerId] = (this.setLegWins[winnerId] ?? 0) + 1
        const legsPerSet = this.match.format.legsPerSet ?? this.match.format.legsToWin ?? 1
        if (this.setLegWins[winnerId] >= legsPerSet) {
          this.setLegWins = this.resetCounter()
          this.setWins[winnerId] = (this.setWins[winnerId] ?? 0) + 1
        }
      }
    },
    isMatchWon(winnerId: string) {
      if (!this.match) return false
      // A fixed-legs match never ends "via leg wins" — it always plays the
      // declared number of legs. We detect it broadly so a tournament that
      // stored type:'first_to' but with fixedLegs/allowDraw still behaves
      // like fixed legs.
      if (isFixedLegsLike(this.match.format)) return false
      if (this.match.format?.useSets) {
        const targetSets = this.match.format.setsToWin ?? 1
        return (this.setWins[winnerId] ?? 0) >= targetSets
      }
      const targetLegs = this.match.format?.legsToWin ?? this.match.legsToWin ?? 1
      return (this.legWins[winnerId] ?? 0) >= targetLegs
    },
    completedLegCount() {
      // Count from the turn log (source of truth) instead of legs.filter(w)
      // so an undo that cleared this.leg.winnerId on an earlier leg doesn't
      // hide a real checkout from view.
      return this.turns.filter((turn) => turn.checkoutHit).length
    },
    isFixedLegsComplete() {
      if (!this.match || !isFixedLegsLike(this.match.format)) return false
      const targetLegs = this.match.format.fixedLegs ?? this.match.format.legsToWin
      if (!targetLegs || targetLegs <= 0) return false
      return this.completedLegCount() >= targetLegs
    },
    finishFixedLegsMatch() {
      if (!this.match) return
      const [playerA, playerB] = this.players
      const legsA = this.legWins[playerA.id] ?? 0
      const legsB = this.legWins[playerB.id] ?? 0
      const winnerId = legsA === legsB ? undefined : legsA > legsB ? playerA.id : playerB.id
      this.finishMatch(winnerId)
    },
    finishMatch(winnerId?: string) {
      if (!this.match) return
      this.match.status = 'finished'
      this.match.winnerId = winnerId
      this.saveMatchSummary()
      this.clearLiveState()
    },
    resetCounter() {
      const counters: Record<string, number> = {}
      this.players.forEach((player) => {
        counters[player.id] = 0
      })
      return counters
    },
    recalculateCounters() {
      this.legWins = this.resetCounter()
      this.setWins = this.resetCounter()
      this.setLegWins = this.resetCounter()

      if (!this.match) return
      const orderedTurns = [...this.turns].sort((a, b) => a.turnIndex - b.turnIndex)
      const legsPerSet = this.match.format?.legsPerSet ?? this.match.format?.legsToWin ?? 1

      for (const turn of orderedTurns) {
        if (!turn.checkoutHit) continue
        const winnerId = turn.playerId
        this.legWins[winnerId] = (this.legWins[winnerId] ?? 0) + 1

        if (this.match.format?.useSets) {
          this.setLegWins[winnerId] = (this.setLegWins[winnerId] ?? 0) + 1
          if (this.setLegWins[winnerId] >= legsPerSet) {
            this.setLegWins = this.resetCounter()
            this.setWins[winnerId] = (this.setWins[winnerId] ?? 0) + 1
          }
        }
      }
    },
    syncLegAfterUndo(targetLegId: string) {
      if (!this.match) return
      const startingScore = this.match.startingScore ?? 501

      const legHasTurns = (legId: string) => this.turns.some((turn) => turn.legId === legId)
      const currentLegId = this.leg?.id

      if (currentLegId && currentLegId !== targetLegId && !legHasTurns(currentLegId)) {
        this.legs = this.legs.filter((leg) => leg.id !== currentLegId)
      }

      const activeLeg = this.legs.find((leg) => leg.id === targetLegId) ?? this.legs[this.legs.length - 1]
      if (activeLeg) {
        this.leg = activeLeg
      }

      this.scores = this.players.reduce<Record<string, number>>((acc, player) => {
        const lastTurn = [...this.turns]
          .reverse()
          .find((turn) => turn.legId === this.leg?.id && turn.playerId === player.id)
        if (!lastTurn) {
          acc[player.id] = startingScore
          return acc
        }
        acc[player.id] = lastTurn.bust ? lastTurn.startedScore : lastTurn.startedScore - lastTurn.points
        return acc
      }, {})

      const lastLegTurn = [...this.turns].reverse().find((turn) => turn.legId === this.leg?.id)
      if (lastLegTurn) {
        this.activePlayerId = this.nextPlayerId(lastLegTurn.playerId)
      } else if (this.leg) {
        this.activePlayerId = this.leg.startingPlayerId
      }

      if (this.leg) {
        this.leg.winnerId = undefined
        this.leg.endedAt = undefined
      }
    },
    startNextLeg() {
      if (!this.match || !this.leg) return
      // Safety net: in a fixed-legs match (detected broadly, also by
      // allowDraw or fixedLegs even if type was saved as 'first_to') we
      // never start another leg once the cap is reached -- finish instead.
      if (isFixedLegsLike(this.match.format)) {
        const target = this.match.format!.fixedLegs ?? this.match.format!.legsToWin ?? 0
        const completed = this.completedLegCount()
        if (target > 0 && completed >= target) {
          console.warn(
            '[gameStore] startNextLeg called but fixed-legs target was already met — ending match',
            { completed, target, format: this.match.format }
          )
          this.finishFixedLegsMatch()
          return
        }
      }
      // Same safety net for first_to / best_of: if a player already has
      // enough leg wins to clinch the match, end it instead of opening
      // another leg.
      if (this.match.format && !isFixedLegsLike(this.match.format) && !this.match.format.useSets) {
        const target = this.match.format.legsToWin ?? this.match.legsToWin
        if (target && target > 0) {
          const reached = this.players.find((player) => (this.legWins[player.id] ?? 0) >= target)
          if (reached) {
            console.warn(
              '[gameStore] startNextLeg called but a player already has enough leg wins — ending match',
              { winnerId: reached.id, legWins: { ...this.legWins }, target, format: this.match.format }
            )
            this.finishMatch(reached.id)
            return
          }
        }
      }
      const startingScore = this.match.startingScore ?? 501
      const nextLegNumber = this.leg.legNumber + 1
      const nextStarter = this.nextPlayerId(this.leg.startingPlayerId)
      const nextLeg: Leg = {
        id: createId(),
        matchId: this.match.id,
        legNumber: nextLegNumber,
        startingPlayerId: nextStarter
      }
      this.legs.push(nextLeg)
      this.leg = nextLeg
      this.scores = this.players.reduce<Record<string, number>>((acc, player) => {
        acc[player.id] = startingScore
        return acc
      }, {})
      this.activePlayerId = nextStarter
      this.pendingCheckout = null
      this.legWinnerId = null
      this.persistLiveState()
    },
    saveMatchSummary() {
      if (!this.match) return
      const history = useMatchHistoryStore()
      const tournamentsStore = useTournamentsStore()
      const onlineTournamentsStore = useOnlineTournamentsStore()
      // Count leg wins from the turn log instead of this.legs.filter(winnerId).
      // turns.checkoutHit is the single source of truth: every successful
      // checkout adds a checkout-hit turn AND it survives undo (an undone
      // checkout is popped from this.turns). this.legs[i].winnerId can
      // desync from this in edge cases (e.g. syncLegAfterUndo clearing the
      // current leg's winnerId while an earlier checkout turn remains in
      // this.turns), which is what caused a player with 3 visible checkouts
      // to be saved with score 2:0.
      const legWinsByPlayer: Record<string, number> = {}
      let totalLegs = 0
      this.turns.forEach((turn) => {
        if (!turn.checkoutHit) return
        totalLegs += 1
        legWinsByPlayer[turn.playerId] = (legWinsByPlayer[turn.playerId] ?? 0) + 1
      })
      const summary: MatchSummary = {
        id: this.match.id,
        endedAt: new Date().toISOString(),
        mode: this.match.mode,
        startingScore: this.match.startingScore,
        doubleOut: this.match.doubleOut,
        format: this.match.format,
        winnerId: this.match.winnerId,
        players: this.players.map((player) => ({ id: player.id, name: player.name })),
        stats: this.players.map((player) => {
          const turns = this.turns.filter((turn) => turn.playerId === player.id)
          const stats = calculateMatchPlayerStats(turns)
          const legsWon = legWinsByPlayer[player.id] ?? 0
          const legsLost = Math.max(totalLegs - legsWon, 0)
          return {
            playerId: player.id,
            name: player.name,
            isWinner: Boolean(this.match?.winnerId) && player.id === this.match?.winnerId,
            isDraw: !this.match?.winnerId,
            legsWon,
            legsLost,
            ...stats
          }
        })
      }
      history.upsertMatch(summary)
      if (this.match.tournamentId) {
        const tournamentId = this.match.tournamentId
        const matchId = this.match.id
        const payload = { matchId, tournamentId, stats: summary.stats }
        if (this.match.tournamentScope === 'online') {
          // Fire-and-forget intentionally so the player sees the winner
          // screen instantly, but with retry-with-backoff so a flaky
          // network or a temporarily-failing RLS check doesn't leave the
          // tournament stuck in "Fortsetzen" forever on everyone else's
          // device.
          void retryAsync(
            () => onlineTournamentsStore.recordMatchResult(tournamentId, matchId, payload),
            { attempts: 4, baseDelayMs: 800, label: 'recordMatchResult' }
          )
        } else {
          tournamentsStore.recordMatchResult(tournamentId, matchId, payload)
        }
      }
    },
    undoLastTurn() {
      if (!this.activePlayerId || this.turns.length === 0) return

      const lastTurn = this.turns.pop() as Turn
      this.pendingCheckout = null

      if (lastTurn.checkoutHit) {
        const wasFinished = this.match?.status === 'finished'
        this.legWinnerId = null
        if (this.match) {
          this.match.status = 'in_progress'
          this.match.winnerId = undefined
        }
        if (wasFinished && this.match) {
          const history = useMatchHistoryStore()
          history.removeMatch(this.match.id)
          if (this.match.tournamentId) {
            if (this.match.tournamentScope === 'online') {
              const onlineTournamentsStore = useOnlineTournamentsStore()
              onlineTournamentsStore.revertMatchResult(this.match.tournamentId, this.match.id)
            } else {
              const tournamentsStore = useTournamentsStore()
              tournamentsStore.revertMatchResult(this.match.tournamentId, this.match.id)
            }
          }
        }
      }

      this.recalculateCounters()
      this.syncLegAfterUndo(lastTurn.legId)
      this.persistLiveState()
    },
    getSnapshot(): LiveMatchSnapshot | null {
      if (!this.match) return null
      return {
        match: this.match,
        players: this.players,
        leg: this.leg,
        legs: this.legs,
        turns: this.turns,
        scores: this.scores,
        activePlayerId: this.activePlayerId,
        pendingCheckout: this.pendingCheckout,
        legWinnerId: this.legWinnerId,
        legWins: this.legWins,
        setWins: this.setWins,
        setLegWins: this.setLegWins,
        updatedAt: new Date().toISOString()
      }
    },
    applySnapshot(snapshot: LiveMatchSnapshot) {
      this.match = snapshot.match
      this.players = snapshot.players
      this.leg = snapshot.leg
      this.legs = snapshot.legs
      this.turns = snapshot.turns
      this.scores = snapshot.scores
      this.activePlayerId = snapshot.activePlayerId
      this.pendingCheckout = snapshot.pendingCheckout
      this.legWinnerId = snapshot.legWinnerId
      this.legWins = snapshot.legWins
      this.setWins = snapshot.setWins
      this.setLegWins = snapshot.setLegWins
    },
    hasLocalSnapshot(matchId: string) {
      return Boolean(loadLocalSnapshot(matchId))
    },
    getLocalSnapshot(matchId: string) {
      return loadLocalSnapshot(matchId)
    },
    async resumeMatch(params: { matchId: string; tournamentScope?: 'online' | 'local' }) {
      const local = loadLocalSnapshot(params.matchId)
      if (local) {
        this.applySnapshot(local)
        this.reconcileAfterResume()
        return
      }
      if (params.tournamentScope === 'online') {
        const onlineTournamentsStore = useOnlineTournamentsStore()
        const snapshot = await onlineTournamentsStore.fetchLiveState(params.matchId)
        if (snapshot) {
          this.applySnapshot(snapshot as LiveMatchSnapshot)
          this.reconcileAfterResume()
          return
        }
      }
      throw new Error('Kein gespeicherter Spielstand gefunden.')
    },
    /**
     * Called right after applySnapshot during a Fortsetzen flow. If the
     * snapshot was already in the "finished" state when it was saved (which
     * can happen if recordMatchResult's network call failed at the time the
     * match actually ended), push it again now so the tournament view drops
     * the stuck "Fortsetzen" button.
     */
    reconcileAfterResume() {
      if (this.match?.status === 'finished' && this.match.tournamentId) {
        this.saveMatchSummary()
        // Now that the server has the final result, drop the live snapshot
        // so spectators stop being offered the live-modal view.
        this.clearLiveState()
      }
    },
    persistLiveState() {
      const snapshot = this.getSnapshot()
      if (!snapshot || !this.match) return
      // Don't re-publish a snapshot after the match has been declared
      // finished. applyTurn() unconditionally calls persistLiveState() at the
      // end of its tick, even after finishMatch -> clearLiveState ran, which
      // would otherwise race and resurrect the "live" snapshot on the server.
      // That left the schedule showing "Fortsetzen" + the live modal
      // alive even though the match was already over for the player.
      if (this.match.status === 'finished') return
      saveLocalSnapshot(this.match.id, snapshot)
      if (this.match.tournamentScope === 'online') {
        const onlineTournamentsStore = useOnlineTournamentsStore()
        void onlineTournamentsStore.saveLiveState(this.match.id, snapshot)
      }
    },
    clearLiveState() {
      if (!this.match) return
      clearLocalSnapshot(this.match.id)
      if (this.match.tournamentScope === 'online') {
        const onlineTournamentsStore = useOnlineTournamentsStore()
        void onlineTournamentsStore.clearLiveState(this.match.id)
      }
    }
  }
})
