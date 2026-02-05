import type { Turn } from './models'

export interface BasicStats {
  totalPoints: number
  totalDarts: number
  average3Dart: number
  highestScore: number
  checkoutAttempts: number
  checkoutHits: number
  checkoutPercentage: number
  highestCheckout: number
}

export interface MatchPlayerStats {
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
}

export const calculateBasicStats = (turns: Turn[]): BasicStats => {
  const totalPoints = turns.reduce((sum, turn) => sum + (turn.bust ? 0 : turn.points), 0)
  const totalDarts = turns.reduce((sum, turn) => sum + turn.dartsThrown, 0)
  const average3Dart = totalDarts === 0 ? 0 : (totalPoints / totalDarts) * 3
  const highestScore = turns.reduce((max, turn) => Math.max(max, turn.points), 0)
  const checkoutAttempts = turns.filter((turn) => turn.startedScore <= 170).length
  const checkoutHits = turns.filter((turn) => turn.checkoutHit).length
  const checkoutPercentage = checkoutAttempts === 0 ? 0 : checkoutHits / checkoutAttempts
  const highestCheckout = turns.reduce((max, turn) => Math.max(max, turn.checkoutValue ?? 0), 0)

  return {
    totalPoints,
    totalDarts,
    average3Dart,
    highestScore,
    checkoutAttempts,
    checkoutHits,
    checkoutPercentage,
    highestCheckout
  }
}

export const calculateMatchPlayerStats = (turns: Turn[]): MatchPlayerStats => {
  const totalPoints = turns.reduce((sum, turn) => sum + (turn.bust ? 0 : turn.points), 0)
  const totalDarts = turns.reduce((sum, turn) => sum + turn.dartsThrown, 0)
  const average = totalDarts === 0 ? 0 : (totalPoints / totalDarts) * 3
  const checkoutAttempts = turns.filter((turn) => turn.startedScore <= 170).length
  const checkoutHits = turns.filter((turn) => turn.checkoutHit).length
  const checkoutRate = checkoutAttempts === 0 ? 0 : (checkoutHits / checkoutAttempts) * 100
  const doubleDarts = turns.reduce((sum, turn) => {
    const isDoubleZone = turn.startedScore <= 40 || turn.startedScore === 50
    return isDoubleZone ? sum + turn.dartsThrown : sum
  }, 0)
  const count180 = turns.filter((turn) => !turn.bust && turn.points === 180).length
  const count140Plus = turns.filter((turn) => !turn.bust && turn.points >= 140).length
  const count100Plus = turns.filter((turn) => !turn.bust && turn.points >= 100).length
  const highestCheckout = turns.reduce((max, turn) => Math.max(max, turn.checkoutValue ?? 0), 0)

  return {
    average,
    checkoutRate,
    checkoutAttempts,
    checkoutHits,
    doubleDarts,
    count100Plus,
    count140Plus,
    count180,
    totalDarts,
    totalPoints,
    highestCheckout
  }
}
