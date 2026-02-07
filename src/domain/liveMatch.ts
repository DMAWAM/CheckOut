import type { Leg, Match, Player, Turn } from './models'

export interface LiveMatchSnapshot {
  match: Match
  players: Player[]
  leg: Leg | null
  legs: Leg[]
  turns: Turn[]
  scores: Record<string, number>
  activePlayerId: string | null
  pendingCheckout: { points: number } | null
  legWinnerId: string | null
  legWins: Record<string, number>
  setWins: Record<string, number>
  setLegWins: Record<string, number>
  updatedAt: string
}
