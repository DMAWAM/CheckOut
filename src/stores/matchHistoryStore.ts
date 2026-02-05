import { defineStore } from 'pinia'
import type { MatchSummary } from '@/domain/matchSummary'

interface MatchHistoryState {
  matches: MatchSummary[]
  storageKey: string
}

const buildKey = (userId?: string | null) =>
  userId ? `checkout_recent_matches_${userId}` : 'checkout_recent_matches'

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

export const useMatchHistoryStore = defineStore('matchHistory', {
  state: (): MatchHistoryState => ({
    matches: [],
    storageKey: buildKey()
  }),
  actions: {
    setUserScope(userId: string | null) {
      this.storageKey = buildKey(userId)
      this.matches = userId ? loadMatches(this.storageKey) : []
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
    }
  }
})
