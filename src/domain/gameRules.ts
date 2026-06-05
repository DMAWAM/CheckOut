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
  // Score went past zero → always a bust.
  if (remaining < 0) return true
  // Leaving exactly 1 is only impossible in DOUBLE-OUT (no double has
  // a value of 1, so the player can never finish from there). In
  // SINGLE-OUT a remaining score of 1 is perfectly playable on the
  // next turn (just throw a single 1 / D-anything-that-equals-1
  // doesn't matter), so we must not flag it as bust.
  if (remaining === 1 && doubleOut) return true
  // In double-out, reaching exactly 0 only counts if the finishing
  // dart was a double.
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
