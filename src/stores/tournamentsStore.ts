import { defineStore } from 'pinia'
import type {
  MatchStatus,
  MatchFormat,
  Tournament,
  TournamentMatch,
  TournamentMatchResult,
  TournamentMode,
  TournamentPhase,
  TournamentPlayer
} from '@/domain/models'
import { createId } from '@/domain/id'
import { buildKnockoutSeedPairs, distributePlayersToGroups, generateRoundRobinRounds } from '@/domain/tournamentScheduler'
import { calculateLeaderboardsFromData, calculateStandingsFromData } from '@/domain/tournamentStats'

interface TournamentStorage {
  tournaments: Tournament[]
  tournamentPlayers: TournamentPlayer[]
  matches: TournamentMatch[]
  results: TournamentMatchResult[]
}

interface TournamentsState extends TournamentStorage {
  storageKey: string
}

const buildKey = (userId?: string | null) =>
  userId ? `checkout_tournaments_${userId}` : 'checkout_tournaments_v2'

const loadStorage = (storageKey: string): TournamentStorage => {
  if (typeof window === 'undefined') {
    return { tournaments: [], tournamentPlayers: [], matches: [], results: [] }
  }
  const raw = window.localStorage.getItem(storageKey)
  if (!raw) return { tournaments: [], tournamentPlayers: [], matches: [], results: [] }
  try {
    const parsed = JSON.parse(raw) as TournamentStorage
    return {
      tournaments: Array.isArray(parsed.tournaments) ? parsed.tournaments : [],
      tournamentPlayers: Array.isArray(parsed.tournamentPlayers) ? parsed.tournamentPlayers : [],
      matches: Array.isArray(parsed.matches) ? parsed.matches : [],
      results: Array.isArray(parsed.results) ? parsed.results : []
    }
  } catch {
    return { tournaments: [], tournamentPlayers: [], matches: [], results: [] }
  }
}

const persistStorage = (storageKey: string, state: TournamentStorage) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(storageKey, JSON.stringify(state))
}

export const useTournamentsStore = defineStore('tournaments', {
  state: (): TournamentsState => {
    const storageKey = buildKey()
    return {
      storageKey,
      ...loadStorage(storageKey)
    }
  },
  getters: {
    getTournament: (state) => (tournamentId: string) =>
      state.tournaments.find((tournament) => tournament.id === tournamentId),
    getTournamentPlayers: (state) => (tournamentId: string) =>
      state.tournamentPlayers.filter((entry) => entry.tournamentId === tournamentId).map((entry) => entry.playerId),
    getTournamentPlayersByGroup: (state) => (tournamentId: string, groupIndex: number) =>
      state.tournamentPlayers
        .filter((entry) => entry.tournamentId === tournamentId && (entry.groupIndex ?? 0) === groupIndex)
        .map((entry) => entry.playerId),
    getTournamentMatches: (state) => (tournamentId: string) =>
      state.matches
        .filter((match) => match.tournamentId === tournamentId)
        .sort((a, b) => a.order - b.order),
    getResultsByMatch: (state) => (matchId: string) =>
      state.results.find((result) => result.matchId === matchId),
    getOpenMatches: (state) => (tournamentId: string) =>
      state.matches
        .filter((match) => match.tournamentId === tournamentId && match.status === 'pending')
        .sort((a, b) => a.order - b.order),
    getPendingMatches: (state) => (tournamentId: string) =>
      state.matches
        .filter((match) => match.tournamentId === tournamentId && match.status === 'pending')
        .sort((a, b) => a.order - b.order),
    getReadyMatches: (state) => (tournamentId: string) =>
      state.matches
        .filter((match) => match.tournamentId === tournamentId && match.status === 'pending')
        .sort((a, b) => a.order - b.order),
    getAllMatches: (state) => (tournamentId: string) =>
      state.matches
        .filter((match) => match.tournamentId === tournamentId)
        .sort((a, b) => a.order - b.order)
  },
  actions: {
    setUserScope(userId: string | null) {
      this.storageKey = buildKey(userId)
      if (userId) {
        const loaded = loadStorage(this.storageKey)
        this.tournaments = loaded.tournaments
        this.tournamentPlayers = loaded.tournamentPlayers
        this.matches = loaded.matches
        this.results = loaded.results
      } else {
        this.tournaments = []
        this.tournamentPlayers = []
        this.matches = []
        this.results = []
      }
    },
    persist() {
      persistStorage(this.storageKey, {
        tournaments: this.tournaments,
        tournamentPlayers: this.tournamentPlayers,
        matches: this.matches,
        results: this.results
      })
    },
    createTournament(params: {
      name: string
      date: string
      mode: TournamentMode
      settings: {
        mode501: boolean
        doubleOut: boolean
        format?: MatchFormat
        groupCount?: number
      }
      playerIds: string[]
    }) {
      const id = createId()
      const playerCount = params.playerIds.length
      const maxGroups = Math.max(1, Math.floor(playerCount / 2))
      const requestedGroups = params.settings.groupCount ?? 1
      const normalizedGroupCount = params.mode === 'knockout' ? 1 : Math.min(requestedGroups, maxGroups)
      const tournament: Tournament = {
        id,
        name: params.name,
        date: params.date,
        mode: params.mode,
        scope: 'local',
        settings: params.settings,
        status: 'active'
      }
      tournament.settings.groupCount = normalizedGroupCount
      this.tournaments.push(tournament)
      const groups = distributePlayersToGroups(params.playerIds, normalizedGroupCount)
      groups.forEach((groupPlayers, groupIndex) => {
        groupPlayers.forEach((playerId) => {
          this.tournamentPlayers.push({ tournamentId: id, playerId, groupIndex })
        })
      })
      this.generateMatches(id, params.mode, params.playerIds, normalizedGroupCount)
      this.persist()
      return id
    },
    generateMatches(tournamentId: string, mode: TournamentMode, playerIds: string[], groupCount = 1) {
      const existing = this.matches.some((match) => match.tournamentId === tournamentId)
      if (existing) return

      if (mode === 'round_robin' || mode === 'combined') {
        const groups = distributePlayersToGroups(playerIds, groupCount)
        let order = this.matches.length + 1
        groups.forEach((groupPlayers, groupIndex) => {
          if (groupPlayers.length < 2) return
          const rounds = generateRoundRobinRounds(groupPlayers)
          rounds.forEach((round) => {
            round.pairs.forEach(([playerAId, playerBId]) => {
              this.matches.push({
                id: createId(),
                tournamentId,
                phase: 'round_robin',
                round: round.round,
                order: order++,
                groupIndex,
                playerAId,
                playerBId,
                status: 'pending'
              })
            })
          })
        })
      }

      if (mode === 'knockout') {
        this.createKnockoutRound(tournamentId, playerIds, 1, 'knockout')
      }

      this.persist()
    },
    createKnockoutRound(tournamentId: string, seededPlayers: string[], round: number, phase: TournamentPhase) {
      const pairs = buildKnockoutSeedPairs(seededPlayers)
      let order = this.matches.length + 1
      const now = new Date().toISOString()
      pairs.forEach(([playerAId, playerBId]) => {
        if (!playerBId) {
          this.matches.push({
            id: createId(),
            tournamentId,
            phase,
            round,
            order: order++,
            playerAId,
            playerBId: playerAId,
            status: 'finished',
            startedAt: now,
            endedAt: now,
            winnerId: playerAId
          })
        } else {
          this.matches.push({
            id: createId(),
            tournamentId,
            phase,
            round,
            order: order++,
            playerAId,
            playerBId,
            status: 'pending'
          })
        }
      })
    },
    markMatchInProgress(matchId: string) {
      const match = this.matches.find((entry) => entry.id === matchId)
      if (!match) return
      match.status = 'in_progress'
      match.startedAt = new Date().toISOString()
      this.persist()
    },
    recordMatchResult(tournamentId: string, matchId: string, result: TournamentMatchResult) {
      const match = this.matches.find((entry) => entry.id === matchId)
      if (!match) return
      match.status = 'finished'
      match.endedAt = new Date().toISOString()
      match.winnerId = result.stats.find((stat) => stat.isWinner)?.playerId
      const existingIndex = this.results.findIndex((entry) => entry.matchId === matchId)
      if (existingIndex >= 0) {
        this.results[existingIndex] = result
      } else {
        this.results.push(result)
      }

      this.ensureKnockoutPhase(tournamentId)
      this.advanceKnockoutIfReady(tournamentId)
      this.updateTournamentStatus(tournamentId)
      this.persist()
    },
    revertMatchResult(tournamentId: string, matchId: string) {
      const match = this.matches.find((entry) => entry.id === matchId)
      if (match) {
        match.status = 'in_progress'
        match.winnerId = undefined
        match.endedAt = undefined
      }
      this.results = this.results.filter((entry) => entry.matchId !== matchId)
      this.updateTournamentStatus(tournamentId)
      this.persist()
    },
    ensureKnockoutPhase(tournamentId: string) {
      const tournament = this.tournaments.find((entry) => entry.id === tournamentId)
      if (!tournament || tournament.mode !== 'combined') return
      const hasKnockout = this.matches.some(
        (match) => match.tournamentId === tournamentId && match.phase === 'knockout'
      )
      if (hasKnockout) return
      const rrMatches = this.matches.filter(
        (match) => match.tournamentId === tournamentId && match.phase === 'round_robin'
      )
      if (rrMatches.some((match) => match.status !== 'finished')) return
      const groupCount = tournament.settings.groupCount ?? 1
      if (groupCount <= 1) {
        const standings = this.calculateStandings(tournamentId, 'round_robin')
        const seeded = standings.map((row) => row.playerId)
        if (seeded.length < 2) return
        this.createKnockoutRound(tournamentId, seeded, 1, 'knockout')
        return
      }

      const qualifiers: Array<{ playerId: string; wins: number; legsDiff: number; average: number }> = []
      for (let groupIndex = 0; groupIndex < groupCount; groupIndex += 1) {
        const groupStandings = this.calculateStandings(tournamentId, 'round_robin', groupIndex)
        groupStandings.slice(0, 2).forEach((row) => {
          qualifiers.push({
            playerId: row.playerId,
            wins: row.wins,
            legsDiff: row.legsDiff,
            average: row.average
          })
        })
      }
      const seeded = qualifiers
        .sort((a, b) => b.wins - a.wins || b.legsDiff - a.legsDiff || b.average - a.average)
        .map((row) => row.playerId)
      if (seeded.length < 2) return
      this.createKnockoutRound(tournamentId, seeded, 1, 'knockout')
    },
    advanceKnockoutIfReady(tournamentId: string) {
      const tournament = this.tournaments.find((entry) => entry.id === tournamentId)
      if (!tournament) return
      const knockoutMatches = this.matches
        .filter((match) => match.tournamentId === tournamentId && match.phase === 'knockout')
        .sort((a, b) => a.round - b.round || a.order - b.order)
      if (knockoutMatches.length === 0) return

      const currentRound = knockoutMatches.reduce((max, match) => Math.max(max, match.round), 1)
      const currentRoundMatches = knockoutMatches.filter((match) => match.round === currentRound)
      if (currentRoundMatches.some((match) => match.status !== 'finished')) return

      const winners = currentRoundMatches
        .map((match) => match.winnerId)
        .filter((winnerId): winnerId is string => Boolean(winnerId))
      if (winners.length <= 1) return
      const nextRoundExists = knockoutMatches.some((match) => match.round === currentRound + 1)
      if (nextRoundExists) return

      this.createKnockoutRound(tournamentId, winners, currentRound + 1, 'knockout')
    },
    updateTournamentStatus(tournamentId: string) {
      const tournament = this.tournaments.find((entry) => entry.id === tournamentId)
      if (!tournament) return
      const remaining = this.matches.some(
        (match) => match.tournamentId === tournamentId && match.status !== 'finished'
      )
      tournament.status = remaining ? 'active' : 'finished'
    },
    calculateStandings(tournamentId: string, phase: TournamentPhase | 'all' = 'all', groupIndex?: number) {
      const playerIds = groupIndex === undefined
        ? this.getTournamentPlayers(tournamentId)
        : this.getTournamentPlayersByGroup(tournamentId, groupIndex)
      const matches = this.matches.filter((match) => match.tournamentId === tournamentId)
      const results = this.results.filter((result) => result.tournamentId === tournamentId)
      return calculateStandingsFromData({
        playerIds,
        matches,
        results,
        phase,
        groupIndex
      })
    },
    calculateLeaderboards(tournamentId: string) {
      const resultEntries = this.results.filter((entry) => entry.tournamentId === tournamentId)
      return calculateLeaderboardsFromData(resultEntries)
    }
  }
})
