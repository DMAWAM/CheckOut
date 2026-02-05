import { defineStore } from 'pinia'
import type { GameMode, Leg, Match, MatchFormat, Player, Turn } from '@/domain/models'
import type { MatchSummary } from '@/domain/matchSummary'
import { createId } from '@/domain/id'
import { createTurn } from '@/domain/gameRules'
import { calculateMatchPlayerStats } from '@/domain/statsCalculator'
import { useMatchHistoryStore } from '@/stores/matchHistoryStore'
import { useTournamentsStore } from '@/stores/tournamentsStore'
import { useOnlineTournamentsStore } from '@/stores/onlineTournamentsStore'

interface PendingCheckout {
  points: number
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
    },
    ensureMatch() {
      if (this.match && this.players.length === 2) return
      this.startNewMatch('Player A', 'Player B')
    },
    requestTurn(points: number) {
      if (!this.activePlayerId || !this.leg || !this.match) return
      if (this.pendingCheckout || this.legWinnerId) return

      const startedScore = this.scores[this.activePlayerId]

      if (this.match.doubleOut && startedScore - points === 0) {
        this.pendingCheckout = { points }
        return
      }

      this.applyTurn(points, false)
    },
    confirmCheckout(doubleHit: boolean) {
      if (!this.pendingCheckout) return
      this.applyTurn(this.pendingCheckout.points, doubleHit)
      this.pendingCheckout = null
    },
    submitKnownTurn(points: number, checkoutDouble: boolean) {
      if (!this.activePlayerId || !this.leg || !this.match) return
      this.pendingCheckout = null
      this.applyTurn(points, checkoutDouble)
    },
    cancelPendingCheckout() {
      this.pendingCheckout = null
    },
    applyTurn(points: number, checkoutDouble: boolean) {
      if (!this.activePlayerId || !this.leg || !this.match) return

      const startedScore = this.scores[this.activePlayerId]
      const { turn, nextScore, legWon } = createTurn({
        turnId: createId(),
        legId: this.leg.id,
        playerId: this.activePlayerId,
        turnIndex: this.turns.length + 1,
        startedScore,
        points,
        doubleOut: this.match.doubleOut,
        checkoutDouble
      })

      this.turns.push(turn)
      this.scores[this.activePlayerId] = nextScore

      if (legWon) {
        const winnerId = this.activePlayerId
        this.legWinnerId = winnerId
        this.leg.winnerId = winnerId
        this.leg.endedAt = new Date().toISOString()

        this.updateLegCounters(winnerId)

        if (this.isMatchWon(winnerId)) {
          this.match.status = 'finished'
          this.match.winnerId = winnerId
          this.saveMatchSummary()
        } else {
          this.startNextLeg()
        }
      } else {
        this.activePlayerId = this.nextPlayerId(this.activePlayerId)
      }
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
      if (this.match.format?.useSets) {
        const targetSets = this.match.format.setsToWin ?? 1
        return (this.setWins[winnerId] ?? 0) >= targetSets
      }
      const targetLegs = this.match.format?.legsToWin ?? this.match.legsToWin ?? 1
      return (this.legWins[winnerId] ?? 0) >= targetLegs
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
    },
    saveMatchSummary() {
      if (!this.match) return
      const history = useMatchHistoryStore()
      const tournamentsStore = useTournamentsStore()
      const onlineTournamentsStore = useOnlineTournamentsStore()
      const legWinsByPlayer: Record<string, number> = {}
      let totalLegs = 0
      this.legs.forEach((leg) => {
        if (!leg.winnerId) return
        totalLegs += 1
        legWinsByPlayer[leg.winnerId] = (legWinsByPlayer[leg.winnerId] ?? 0) + 1
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
            isWinner: player.id === this.match?.winnerId,
            legsWon,
            legsLost,
            ...stats
          }
        })
      }
      history.upsertMatch(summary)
      if (this.match.tournamentId) {
        if (this.match.tournamentScope === 'online') {
          onlineTournamentsStore.recordMatchResult(this.match.tournamentId, this.match.id, {
            matchId: this.match.id,
            tournamentId: this.match.tournamentId,
            stats: summary.stats
          })
        } else {
          tournamentsStore.recordMatchResult(this.match.tournamentId, this.match.id, {
            matchId: this.match.id,
            tournamentId: this.match.tournamentId,
            stats: summary.stats
          })
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
    }
  }
})
