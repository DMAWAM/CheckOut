import type { GameMode, MatchFormat } from './models'
import type { MatchPlayerStats } from './statsCalculator'

export interface MatchPlayerSummary extends MatchPlayerStats {
  playerId: string
  name: string
  isWinner: boolean
  legsWon: number
  legsLost: number
}

export interface MatchSummary {
  id: string
  endedAt: string
  mode: GameMode
  startingScore?: number
  doubleOut: boolean
  format?: MatchFormat
  winnerId?: string
  players: Array<{ id: string; name: string }>
  stats: MatchPlayerSummary[]
}
