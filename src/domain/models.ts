export type GameMode = '301' | '501' | '701'
export type TournamentMode = 'round_robin' | 'knockout' | 'combined'
export type TournamentPhase = 'round_robin' | 'knockout'
export type TournamentScope = 'local' | 'online'
export type MatchStatus = 'in_progress' | 'finished'
export type TournamentStatus = 'draft' | 'active' | 'finished'
export type MatchFormatType = 'first_to' | 'best_of'

export interface Player {
  id: string
  name: string
  createdAt: string
}

export interface Match {
  id: string
  createdAt: string
  mode: GameMode
  startingScore: number
  doubleOut: boolean
  playerIds: string[]
  tournamentId?: string
  tournamentScope?: TournamentScope
  legsToWin?: number
  format?: MatchFormat
  status: MatchStatus
  winnerId?: string
}

export interface MatchFormat {
  type: MatchFormatType
  legsToWin: number
  bestOf?: number
  useSets: boolean
  setsToWin?: number
  legsPerSet?: number
}

export interface Leg {
  id: string
  matchId: string
  legNumber: number
  startingPlayerId: string
  winnerId?: string
  endedAt?: string
}

export interface Turn {
  id: string
  legId: string
  playerId: string
  turnIndex: number
  startedScore: number
  points: number
  bust: boolean
  dartsThrown: number
  checkoutHit: boolean
  checkoutValue?: number
}

export interface Tournament {
  id: string
  name: string
  date: string
  mode: TournamentMode
  scope?: TournamentScope
  createdBy?: string
  settings: {
    mode501: boolean
    doubleOut: boolean
    format?: MatchFormat
    formatByPhase?: {
      roundRobin?: MatchFormat
      knockout?: MatchFormat
      knockoutRounds?: Record<string, MatchFormat>
    }
    groupCount?: number
    startingScore?: number
  }
  status: TournamentStatus
}

export interface TournamentMatch {
  id: string
  tournamentId: string
  phase: TournamentPhase
  round: number
  order: number
  groupIndex?: number
  playerAId: string
  playerBId: string
  status: MatchStatus
  startedAt?: string
  endedAt?: string
  winnerId?: string
}

export interface TournamentMatchResult {
  matchId: string
  tournamentId: string
  stats: Array<{
    playerId: string
    name: string
    isWinner: boolean
    average: number
    checkoutRate: number
    checkoutAttempts: number
    checkoutHits: number
    doubleDarts: number
    count100Plus: number
    count140Plus: number
    count180: number
    totalDarts: number
    totalPoints: number
    highestCheckout: number
    legsWon: number
    legsLost: number
  }>
}

export interface TournamentPlayer {
  tournamentId: string
  playerId: string
  groupIndex?: number
}

export interface TournamentMatchLink {
  tournamentId: string
  matchId: string
}
