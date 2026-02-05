import type { Turn } from './models'

export interface CreateTurnParams {
  turnId: string
  legId: string
  playerId: string
  turnIndex: number
  startedScore: number
  points: number
  doubleOut: boolean
  dartsThrown?: number
  checkoutDouble?: boolean
}

export interface CreateTurnResult {
  turn: Turn
  nextScore: number
  legWon: boolean
}

export const isBust = (startedScore: number, points: number, doubleOut: boolean, checkoutDouble: boolean): boolean => {
  const remaining = startedScore - points
  if (remaining < 0) return true
  if (remaining === 1) return true
  if (remaining === 0 && doubleOut && !checkoutDouble) return true
  return false
}

export const createTurn = ({
  turnId,
  legId,
  playerId,
  turnIndex,
  startedScore,
  points,
  doubleOut,
  dartsThrown = 3,
  checkoutDouble = false
}: CreateTurnParams): CreateTurnResult => {
  const remaining = startedScore - points
  const bust = isBust(startedScore, points, doubleOut, checkoutDouble)
  const checkoutHit = !bust && remaining === 0
  const nextScore = bust ? startedScore : remaining

  const turn: Turn = {
    id: turnId,
    legId,
    playerId,
    turnIndex,
    startedScore,
    points,
    bust,
    dartsThrown,
    checkoutHit,
    checkoutValue: checkoutHit ? startedScore : undefined
  }

  return {
    turn,
    nextScore,
    legWon: checkoutHit
  }
}
