import { defineStore } from 'pinia'
import { supabase } from '@/services/supabase'
import type {
  MatchFormat,
  Tournament,
  TournamentMatch,
  TournamentMatchResult,
  TournamentMode,
  TournamentPhase
} from '@/domain/models'
import type { LiveMatchSnapshot } from '@/domain/liveMatch'
import { calculateLeaderboardsFromData, calculateStandingsFromData } from '@/domain/tournamentStats'
import { buildKnockoutSeedPairs, distributePlayersToGroups, generateRoundRobinRounds } from '@/domain/tournamentScheduler'
import { useAuthStore } from '@/stores/authStore'
import { createId } from '@/domain/id'

interface OnlinePlayer {
  id: string
  name: string
  username: string
  groupIndex?: number
}

interface OnlineTournamentState {
  tournaments: Tournament[]
  currentTournament: Tournament | null
  players: OnlinePlayer[]
  matches: TournamentMatch[]
  results: TournamentMatchResult[]
  loginCodes: Array<{ playerId: string; name: string; username: string; code: string }>
  loading: boolean
  inviteCode: string | null
}

const generateInviteCode = () =>
  Math.random().toString(36).replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase()

type MatchInsert = {
  id: string
  tournament_id: string
  phase: TournamentPhase
  round: number
  order: number
  group_index: number | null
  player_a_id: string
  player_b_id: string
  status: string
  started_at: string | null
  ended_at: string | null
  winner_id: string | null
}

const toMatchInsert = (match: TournamentMatch): MatchInsert => ({
  id: match.id,
  tournament_id: match.tournamentId,
  phase: match.phase,
  round: match.round,
  order: match.order,
  group_index: match.groupIndex ?? null,
  player_a_id: match.playerAId,
  player_b_id: match.playerBId,
  status: match.status,
  started_at: match.startedAt ?? null,
  ended_at: match.endedAt ?? null,
  winner_id: match.winnerId ?? null
})

export const useOnlineTournamentsStore = defineStore('onlineTournaments', {
  state: (): OnlineTournamentState => ({
    tournaments: [],
    currentTournament: null,
    players: [],
    matches: [],
    results: [],
    loginCodes: [],
    loading: false,
    inviteCode: null
  }),
  getters: {
    standingsByGroup: (state) => (groupIndex?: number) => {
      if (!state.currentTournament) return []
      const playerIds = state.players
        .filter((player) => groupIndex === undefined || (player.groupIndex ?? 0) === groupIndex)
        .map((player) => player.id)
      return calculateStandingsFromData({
        playerIds,
        matches: state.matches,
        results: state.results,
        phase: 'round_robin',
        groupIndex
      })
    },
    finalStandings: (state) => {
      if (!state.currentTournament) return []
      const playerIds = state.players.map((player) => player.id)
      return calculateStandingsFromData({
        playerIds,
        matches: state.matches,
        results: state.results,
        phase: 'all'
      })
    },
    leaderboards: (state) => calculateLeaderboardsFromData(state.results)
  },
  actions: {
    async fetchMyTournaments() {
      const auth = useAuthStore()
      if (!auth.session?.user) return
      this.loading = true
      const { data, error } = await supabase
        .from('tournament_players')
        .select('tournament:tournaments(*)')
        .eq('player_id', auth.session.user.id)
      if (error) {
        console.warn(error)
        this.loading = false
        return
      }
      this.tournaments =
        data?.map((entry: { tournament: any }) => ({
          ...entry.tournament,
          createdBy: entry.tournament.created_by,
          scope: 'online'
        })) ?? []
      this.loading = false
    },
    async createTournament(params: {
      name: string
      date: string
      mode: TournamentMode
      settings: {
        mode501: boolean
        doubleOut: boolean
        format?: MatchFormat
        groupCount?: number
        startingScore?: number
      }
    }) {
      const auth = useAuthStore()
      if (!auth.session?.user) {
        throw new Error('Bitte zuerst einloggen')
      }
      this.loading = true
      const payload = {
        id: createId(),
        name: params.name,
        date: params.date,
        mode: params.mode,
        scope: 'online',
        status: 'active',
        created_by: auth.session.user.id,
        settings: params.settings
      }
      const { data, error } = await supabase.from('tournaments').insert(payload).select().single()
      if (error) {
        this.loading = false
        throw new Error(error.message)
      }
      const { error: playerError } = await supabase.from('tournament_players').insert({
        id: createId(),
        tournament_id: data.id,
        player_id: auth.session.user.id,
        group_index: 0
      })
      if (playerError) {
        console.warn(playerError)
      }
      this.loading = false
      await this.fetchMyTournaments()
      return data.id as string
    },
    async getOrCreateInvite(tournamentId: string) {
      const auth = useAuthStore()
      if (!auth.session?.user) return null
      const { data } = await supabase
        .from('tournament_invites')
        .select('code')
        .eq('tournament_id', tournamentId)
        .maybeSingle()
      if (data?.code) {
        this.inviteCode = data.code
        return data.code
      }
      const code = generateInviteCode()
      const { error } = await supabase.from('tournament_invites').insert({
        id: createId(),
        tournament_id: tournamentId,
        code,
        created_by: auth.session.user.id
      })
      if (!error) {
        this.inviteCode = code
        return code
      }
      return null
    },
    async joinByInvite(code: string) {
      const auth = useAuthStore()
      if (!auth.session?.user) return false
      const { data, error } = await supabase.rpc('join_tournament_by_code', { invite_code: code })
      if (error) {
        console.warn(error)
        return false
      }
      await this.fetchMyTournaments()
      if (data) {
        await this.fetchTournamentDetail(data as string)
      }
      return true
    },
    async fetchTournamentDetail(tournamentId: string) {
      this.loading = true
      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single()
      if (tournamentError) {
        console.warn(tournamentError)
        this.loading = false
        return
      }

      const auth = useAuthStore()
      let { data: playerRows, error: playerError } = await supabase
        .from('tournament_players')
        .select('player_id, group_index')
        .eq('tournament_id', tournamentId)
      if (playerError) {
        console.warn(playerError)
        playerRows = playerRows ?? []
      }

      if (auth.session?.user && tournament?.created_by === auth.session.user.id) {
        const hasCreator = playerRows?.some((row: any) => row.player_id === auth.session?.user?.id)
        if (!hasCreator) {
          await supabase.from('tournament_players').insert({
            id: createId(),
            tournament_id: tournamentId,
            player_id: auth.session.user.id,
            group_index: 0
          })
          const refreshed = await supabase
            .from('tournament_players')
            .select('player_id, group_index')
            .eq('tournament_id', tournamentId)
          if (!refreshed.error) {
            playerRows = refreshed.data ?? playerRows ?? []
          }
        }
      }

      const playerIds = (playerRows ?? []).map((row: any) => row.player_id)
      const { data: profileRows, error: profileError } = playerIds.length
        ? await supabase
          .from('profiles')
          .select('id, username, display_name')
          .in('id', playerIds)
        : { data: [], error: null }
      if (profileError) {
        console.warn(profileError)
      }
      const profileMap = new Map<string, { username?: string; display_name?: string }>(
        (profileRows ?? []).map((row: any) => [row.id, { username: row.username, display_name: row.display_name }])
      )
      if (auth.profile && !profileMap.has(auth.profile.id)) {
        profileMap.set(auth.profile.id, {
          username: auth.profile.username,
          display_name: auth.profile.displayName
        })
      }
      const { data: matches } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', tournamentId)
      const { data: results } = await supabase
        .from('tournament_match_results')
        .select('*')
        .eq('tournament_id', tournamentId)

      const groupIndexMap = new Map<string, number>()
      matches?.forEach((row: any) => {
        if (row.phase !== 'round_robin') return
        const index = row.group_index ?? 0
        if (row.player_a_id) groupIndexMap.set(row.player_a_id, index)
        if (row.player_b_id) groupIndexMap.set(row.player_b_id, index)
      })

      this.currentTournament = {
        ...tournament,
        createdBy: tournament.created_by,
        scope: 'online'
      }
      this.players =
        (playerRows ?? []).map((row: any) => {
          const profile = profileMap.get(row.player_id)
          const inferredGroupIndex = groupIndexMap.get(row.player_id)
          return {
            id: row.player_id,
            name: profile?.display_name ?? profile?.username ?? row.player_id,
            username: profile?.username ?? row.player_id,
            groupIndex: row.group_index ?? inferredGroupIndex ?? 0
          }
        })
      this.matches =
        matches?.map((row: any) => ({
          id: row.id,
          tournamentId: row.tournament_id,
          phase: row.phase,
          round: row.round,
          order: row.order,
          groupIndex: row.group_index ?? undefined,
          playerAId: row.player_a_id,
          playerBId: row.player_b_id,
          status: row.status,
          startedAt: row.started_at ?? undefined,
          endedAt: row.ended_at ?? undefined,
          winnerId: row.winner_id ?? undefined
        })) ?? []
      this.results = (results?.map((row: any) => ({
        matchId: row.match_id,
        tournamentId: row.tournament_id,
        stats: row.stats
      })) as TournamentMatchResult[]) ?? []
      this.loading = false
    },
    async fetchLoginCodes(tournamentId: string) {
      const auth = useAuthStore()
      if (!auth.session?.user) return
      const { data, error } = await supabase
        .from('tournament_login_codes')
        .select('player_id, code, profile:profiles(username, display_name)')
        .eq('tournament_id', tournamentId)
      if (error) {
        console.warn(error)
        return
      }
      this.loginCodes =
        data?.map((row: any) => ({
          playerId: row.player_id,
          code: row.code,
          username: row.profile?.username ?? row.player_id,
          name: row.profile?.display_name ?? row.profile?.username ?? row.player_id
        })) ?? []
    },
    async generateLoginCodes(tournamentId: string, names: string[]) {
      const auth = useAuthStore()
      let token = auth.session?.access_token
      const { data: sessionData } = await supabase.auth.getSession()
      token = sessionData.session?.access_token ?? token
      if (!token) {
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession()
        if (refreshError) {
          throw new Error('Session abgelaufen. Bitte neu einloggen.')
        }
        token = refreshed.session?.access_token
      }
      if (!token) {
        throw new Error('Bitte erneut einloggen und dann Codes generieren.')
      }
      const { error: userError } = await supabase.auth.getUser(token)
      if (userError) {
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession()
        if (refreshError) {
          throw new Error('Session ungültig. Bitte neu einloggen.')
        }
        token = refreshed.session?.access_token
        if (!token) {
          throw new Error('Session ungültig. Bitte neu einloggen.')
        }
      }
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      if (!supabaseUrl || !anonKey) {
        throw new Error('Supabase ENV fehlt (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).')
      }
      const response = await fetch(`${supabaseUrl}/functions/v1/create-tournament-players`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: anonKey
        },
        body: JSON.stringify({
          tournamentId,
          players: names.map((name) => ({ name }))
        })
      })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `Edge Function Error (${response.status})`)
      }
      const data = await response.json()
      if (data?.logins) {
        this.loginCodes = data.logins
      }
      await this.fetchTournamentDetail(tournamentId)
      return this.loginCodes
    },
    async generateSchedule() {
      if (!this.currentTournament) return
      const tournamentId = this.currentTournament.id
      const groupCount = this.currentTournament.settings.groupCount ?? 1
      if (this.players.length < 2) {
        throw new Error('Mindestens 2 Spieler erforderlich')
      }

      const groups = distributePlayersToGroups(this.players.map((p) => p.id), groupCount)
      await Promise.all(
        groups.map((groupPlayers, groupIndex) =>
          Promise.all(
            groupPlayers.map((playerId) =>
              supabase
                .from('tournament_players')
                .update({ group_index: groupIndex })
                .eq('tournament_id', tournamentId)
                .eq('player_id', playerId)
            )
          )
        )
      )

      const existing = this.matches.length > 0
      if (existing) return

      let order = 1
      const inserts: TournamentMatch[] = []

      if (this.currentTournament.mode === 'round_robin' || this.currentTournament.mode === 'combined') {
        groups.forEach((groupPlayers, groupIndex) => {
          if (groupPlayers.length < 2) return
          const rounds = generateRoundRobinRounds(groupPlayers)
          rounds.forEach((round) => {
            round.pairs.forEach(([playerAId, playerBId]) => {
              inserts.push({
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

      if (this.currentTournament.mode === 'knockout') {
        const pairs = buildKnockoutSeedPairs(this.players.map((p) => p.id))
        const now = new Date().toISOString()
        pairs.forEach(([playerAId, playerBId]) => {
          if (!playerBId) {
            inserts.push({
              id: createId(),
              tournamentId,
              phase: 'knockout',
              round: 1,
              order: order++,
              playerAId,
              playerBId: playerAId,
              status: 'finished',
              startedAt: now,
              endedAt: now,
              winnerId: playerAId
            })
          } else {
            inserts.push({
              id: createId(),
              tournamentId,
              phase: 'knockout',
              round: 1,
              order: order++,
              playerAId,
              playerBId,
              status: 'pending'
            })
          }
        })
      }

      if (inserts.length > 0) {
        const payload = inserts.map((match) => toMatchInsert(match))
        const { error } = await supabase.from('tournament_matches').insert(payload)
        if (error) {
          throw new Error(error.message)
        }
      }
      await this.fetchTournamentDetail(tournamentId)
    },
    async markMatchInProgress(matchId: string) {
      await supabase
        .from('tournament_matches')
        .update({ status: 'in_progress', started_at: new Date().toISOString() })
        .eq('id', matchId)
      if (this.currentTournament) {
        await this.fetchTournamentDetail(this.currentTournament.id)
      }
    },
    async recordMatchResult(tournamentId: string, matchId: string, result: TournamentMatchResult) {
      const winnerId = result.stats.find((stat) => stat.isWinner)?.playerId
      await supabase
        .from('tournament_matches')
        .update({ status: 'finished', ended_at: new Date().toISOString(), winner_id: winnerId })
        .eq('id', matchId)
      await supabase.from('tournament_match_results').upsert(
        {
          id: createId(),
          match_id: matchId,
          tournament_id: tournamentId,
          stats: result.stats
        },
        { onConflict: 'match_id' }
      )
      await this.clearLiveState(matchId)
      await this.fetchTournamentDetail(tournamentId)
      await this.ensureKnockoutPhase()
      await this.advanceKnockoutIfReady()
      await this.updateTournamentStatus()
    },
    async revertMatchResult(tournamentId: string, matchId: string) {
      await supabase
        .from('tournament_matches')
        .update({ status: 'in_progress', ended_at: null, winner_id: null })
        .eq('id', matchId)
      await supabase.from('tournament_match_results').delete().eq('match_id', matchId)
      await this.fetchTournamentDetail(tournamentId)
      await this.updateTournamentStatus()
    },
    async ensureKnockoutPhase() {
      if (!this.currentTournament || this.currentTournament.mode !== 'combined') return
      const hasKnockout = this.matches.some((match) => match.phase === 'knockout')
      if (hasKnockout) return
      const rrMatches = this.matches.filter((match) => match.phase === 'round_robin')
      if (rrMatches.some((match) => match.status !== 'finished')) return

      const groupCount = this.currentTournament.settings.groupCount ?? 1
      const qualifiers: Array<{ playerId: string; wins: number; legsDiff: number; average: number }> = []
      for (let groupIndex = 0; groupIndex < groupCount; groupIndex += 1) {
        const playerIds = this.players
          .filter((player) => (player.groupIndex ?? 0) === groupIndex)
          .map((player) => player.id)
        const standings = calculateStandingsFromData({
          playerIds,
          matches: this.matches,
          results: this.results,
          phase: 'round_robin',
          groupIndex
        })
        standings.slice(0, 2).forEach((row) => {
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

      const pairs = buildKnockoutSeedPairs(seeded)
      let order = this.matches.length + 1
      const now = new Date().toISOString()
      const inserts: TournamentMatch[] = []
      pairs.forEach(([playerAId, playerBId]) => {
        if (!playerBId) {
          inserts.push({
            id: createId(),
            tournamentId: this.currentTournament!.id,
            phase: 'knockout',
            round: 1,
            order: order++,
            playerAId,
            playerBId: playerAId,
            status: 'finished',
            startedAt: now,
            endedAt: now,
            winnerId: playerAId
          })
        } else {
          inserts.push({
            id: createId(),
            tournamentId: this.currentTournament!.id,
            phase: 'knockout',
            round: 1,
            order: order++,
            playerAId,
            playerBId,
            status: 'pending'
          })
        }
      })
      if (inserts.length > 0) {
        const payload = inserts.map((match) => toMatchInsert(match))
        const { error } = await supabase.from('tournament_matches').insert(payload)
        if (error) {
          console.warn(error)
        }
        await this.fetchTournamentDetail(this.currentTournament.id)
      }
    },
    async advanceKnockoutIfReady() {
      if (!this.currentTournament) return
      const knockoutMatches = this.matches
        .filter((match) => match.phase === 'knockout')
        .sort((a, b) => a.round - b.round || a.order - b.order)
      if (knockoutMatches.length === 0) return
      const currentRound = Math.max(...knockoutMatches.map((match) => match.round))
      const currentRoundMatches = knockoutMatches.filter((match) => match.round === currentRound)
      if (currentRoundMatches.some((match) => match.status !== 'finished')) return

      const winners = currentRoundMatches
        .map((match) => match.winnerId)
        .filter((winnerId): winnerId is string => Boolean(winnerId))
      if (winners.length <= 1) return

      const nextRoundExists = knockoutMatches.some((match) => match.round === currentRound + 1)
      if (nextRoundExists) return
      const pairs = buildKnockoutSeedPairs(winners)
      let order = this.matches.length + 1
      const now = new Date().toISOString()
      const inserts: TournamentMatch[] = []
      pairs.forEach(([playerAId, playerBId]) => {
        if (!playerBId) {
          inserts.push({
            id: createId(),
            tournamentId: this.currentTournament!.id,
            phase: 'knockout',
            round: currentRound + 1,
            order: order++,
            playerAId,
            playerBId: playerAId,
            status: 'finished',
            startedAt: now,
            endedAt: now,
            winnerId: playerAId
          })
        } else {
          inserts.push({
            id: createId(),
            tournamentId: this.currentTournament!.id,
            phase: 'knockout',
            round: currentRound + 1,
            order: order++,
            playerAId,
            playerBId,
            status: 'pending'
          })
        }
      })
      if (inserts.length > 0) {
        const payload = inserts.map((match) => toMatchInsert(match))
        const { error } = await supabase.from('tournament_matches').insert(payload)
        if (error) {
          console.warn(error)
        }
        await this.fetchTournamentDetail(this.currentTournament.id)
      }
    },
    async updateTournamentStatus() {
      if (!this.currentTournament) return
      const tournamentId = this.currentTournament.id
      const { data, error } = await supabase.rpc('update_tournament_status', { tid: tournamentId })
      if (error) {
        console.warn(error)
        return
      }
      if (typeof data === 'string') {
        this.currentTournament.status = data
        const index = this.tournaments.findIndex((entry) => entry.id === tournamentId)
        if (index >= 0) {
          this.tournaments[index] = { ...this.tournaments[index], status: data }
        }
      }
    },
    async saveLiveState(matchId: string, snapshot: LiveMatchSnapshot) {
      const tournamentId = snapshot.match.tournamentId ?? this.currentTournament?.id
      if (!tournamentId) return
      const { error } = await supabase.from('tournament_match_live').upsert(
        {
          match_id: matchId,
          tournament_id: tournamentId,
          snapshot,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'match_id' }
      )
      if (error) {
        console.warn(error)
      }
    },
    async fetchLiveState(matchId: string) {
      const { data, error } = await supabase
        .from('tournament_match_live')
        .select('snapshot')
        .eq('match_id', matchId)
        .maybeSingle()
      if (error) {
        console.warn(error)
        return null
      }
      return (data?.snapshot as LiveMatchSnapshot) ?? null
    },
    async clearLiveState(matchId: string) {
      const { error } = await supabase.from('tournament_match_live').delete().eq('match_id', matchId)
      if (error) {
        console.warn(error)
      }
    },
    async deleteTournament(tournamentId: string) {
      const auth = useAuthStore()
      if (!auth.session?.user) {
        throw new Error('Bitte zuerst einloggen')
      }
      const { error } = await supabase.from('tournaments').delete().eq('id', tournamentId)
      if (error) {
        throw new Error(error.message)
      }
      if (this.currentTournament?.id === tournamentId) {
        this.currentTournament = null
        this.players = []
        this.matches = []
        this.results = []
        this.loginCodes = []
        this.inviteCode = null
      }
      this.tournaments = this.tournaments.filter((entry) => entry.id !== tournamentId)
    }
  }
})
