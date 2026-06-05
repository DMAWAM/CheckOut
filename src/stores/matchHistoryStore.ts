import { defineStore } from 'pinia'
import type { MatchSummary, MatchPlayerSummary } from '@/domain/matchSummary'
import type { GameMode } from '@/domain/models'
import { supabase } from '@/services/supabase'

interface MatchHistoryState {
  matches: MatchSummary[]
  storageKey: string
}

// Bumping STORAGE_VERSION effectively clears every user's locally-
// cached "Letzte Spiele" list on the next app load. Use this when you
// need to invalidate stale history across the whole user base (e.g.
// after wiping the test data ahead of a live tournament). The legacy
// keys (without a version suffix) are also actively swept below.
const STORAGE_VERSION = 'v2'
const STORAGE_PREFIX = `checkout_recent_matches_${STORAGE_VERSION}`

const buildKey = (userId?: string | null) =>
  userId ? `${STORAGE_PREFIX}_${userId}` : STORAGE_PREFIX

/**
 * One-time migration: delete every match-history key written by an
 * earlier version of the app so users don't carry over a pre-launch
 * test-data history. Runs at most once per device (gated by the
 * `checkout_history_migrated` flag).
 */
const sweepLegacyHistoryKeys = () => {
  if (typeof window === 'undefined') return
  try {
    if (window.localStorage.getItem('checkout_history_migrated') === STORAGE_VERSION) return
    const toRemove: string[] = []
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i)
      if (!key) continue
      // Legacy keys had no version suffix: `checkout_recent_matches` or
      // `checkout_recent_matches_<userId>`. The new keys carry the
      // version segment (`checkout_recent_matches_v2...`), so any key
      // that starts with the old prefix but NOT with the new prefix
      // is stale and must go.
      if (key.startsWith('checkout_recent_matches') && !key.startsWith(STORAGE_PREFIX)) {
        toRemove.push(key)
      }
    }
    toRemove.forEach((key) => window.localStorage.removeItem(key))
    window.localStorage.setItem('checkout_history_migrated', STORAGE_VERSION)
  } catch {
    /* localStorage may be blocked / quota exceeded → ignore */
  }
}

sweepLegacyHistoryKeys()

const loadMatches = (storageKey: string): MatchSummary[] => {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as MatchSummary[]
  } catch {
    return []
  }
}

const persistMatches = (storageKey: string, matches: MatchSummary[]) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(storageKey, JSON.stringify(matches))
}

/**
 * Build a MatchSummary from the rows joined out of Supabase. The
 * tournament_match_results.stats jsonb already contains the per-player
 * MatchPlayerSummary objects we use locally, so we can mostly pass them
 * through and just enrich with the format/doubleOut/startingScore stored
 * on the parent tournament.
 */
const summaryFromOnlineRow = (params: {
  matchId: string
  endedAt: string | null
  winnerId: string | null
  stats: MatchPlayerSummary[]
  startingScore?: number
  doubleOut: boolean
}): MatchSummary => {
  const startingScore = params.startingScore ?? 501
  const mode: GameMode = startingScore === 301 ? '301' : startingScore === 701 ? '701' : '501'
  return {
    id: params.matchId,
    endedAt: params.endedAt ?? new Date().toISOString(),
    mode,
    startingScore,
    doubleOut: params.doubleOut,
    winnerId: params.winnerId ?? undefined,
    players: params.stats.map((stat) => ({ id: stat.playerId, name: stat.name })),
    stats: params.stats
  }
}

const sortMatches = (matches: MatchSummary[]): MatchSummary[] =>
  [...matches].sort((a, b) => (a.endedAt < b.endedAt ? 1 : -1))

const dedupeAndSort = (entries: MatchSummary[]): MatchSummary[] => {
  const seen = new Map<string, MatchSummary>()
  for (const entry of entries) {
    seen.set(entry.id, entry)
  }
  return sortMatches(Array.from(seen.values()))
}

export const useMatchHistoryStore = defineStore('matchHistory', {
  state: (): MatchHistoryState => ({
    matches: [],
    storageKey: buildKey()
  }),
  actions: {
    setUserScope(userId: string | null) {
      this.storageKey = buildKey(userId)
      this.matches = userId ? loadMatches(this.storageKey) : []
      if (userId) {
        // Fire-and-forget: merge in any online matches the user appears in
        // as a participant but didn't physically record from this account.
        void this.fetchOnlineMatchHistory(userId)
      }
    },
    upsertMatch(summary: MatchSummary) {
      const filtered = this.matches.filter((match) => match.id !== summary.id)
      this.matches = [summary, ...filtered].slice(0, 10)
      persistMatches(this.storageKey, this.matches)
    },
    removeMatch(matchId: string) {
      this.matches = this.matches.filter((match) => match.id !== matchId)
      persistMatches(this.storageKey, this.matches)
    },
    clearMatches() {
      this.matches = []
      persistMatches(this.storageKey, this.matches)
    },
    /**
     * Pull finished tournament matches in which the current user appears as
     * a participant (player_a or player_b) but might not have been the
     * account that recorded the result. This way the loser-side / spectator-
     * side / "the other guy played on his laptop" matches still show up in
     * the home screen's "Letzte Spiele" list.
     */
    async fetchOnlineMatchHistory(userId: string) {
      try {
        const { data: matches, error: matchesErr } = await supabase
          .from('tournament_matches')
          .select('id, tournament_id, ended_at, winner_id, status, player_a_id, player_b_id')
          .or(`player_a_id.eq.${userId},player_b_id.eq.${userId}`)
          .eq('status', 'finished')
          .order('ended_at', { ascending: false })
          .limit(20)
        if (matchesErr || !matches || matches.length === 0) return

        const matchIds = matches.map((row: any) => row.id as string)
        const tournamentIds = Array.from(
          new Set(matches.map((row: any) => row.tournament_id as string).filter(Boolean))
        )

        const [resultsResp, tournamentsResp] = await Promise.all([
          supabase
            .from('tournament_match_results')
            .select('match_id, stats')
            .in('match_id', matchIds),
          tournamentIds.length > 0
            ? supabase
                .from('tournaments')
                .select('id, settings')
                .in('id', tournamentIds)
            : Promise.resolve({ data: [], error: null })
        ])

        const resultByMatch = new Map<string, MatchPlayerSummary[]>()
        ;(resultsResp.data ?? []).forEach((row: any) => {
          resultByMatch.set(row.match_id as string, (row.stats ?? []) as MatchPlayerSummary[])
        })

        const settingsByTournament = new Map<string, { startingScore?: number; doubleOut: boolean }>()
        ;(tournamentsResp.data ?? []).forEach((row: any) => {
          const settings = row.settings ?? {}
          settingsByTournament.set(row.id as string, {
            startingScore: settings.startingScore ?? (settings.mode501 === false ? 301 : 501),
            doubleOut: Boolean(settings.doubleOut)
          })
        })

        const onlineSummaries = matches
          .map((row: any) => {
            const stats = resultByMatch.get(row.id as string)
            if (!stats || stats.length === 0) return null
            const settings = settingsByTournament.get(row.tournament_id as string) ?? {
              doubleOut: true
            }
            return summaryFromOnlineRow({
              matchId: row.id as string,
              endedAt: row.ended_at as string | null,
              winnerId: row.winner_id as string | null,
              stats,
              startingScore: settings.startingScore,
              doubleOut: settings.doubleOut
            })
          })
          .filter((summary): summary is MatchSummary => summary !== null)

        // Merge into local matches. dedupeAndSort keeps the freshest endedAt
        // first and avoids duplicates with locally-recorded summaries.
        const merged = dedupeAndSort([...this.matches, ...onlineSummaries]).slice(0, 10)
        this.matches = merged
        persistMatches(this.storageKey, this.matches)
      } catch (err) {
        console.warn('fetchOnlineMatchHistory failed', err)
      }
    }
  }
})
