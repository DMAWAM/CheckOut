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
  count60Plus: number
  count100Plus: number
  count140Plus: number
  count180: number
  totalDarts: number
  totalPoints: number
  highestScore: number
  highestCheckout: number
  bestLegDarts: number
}

// Checkout-% is a meaningful skill metric in BOTH single-out and
// double-out matches: it measures how often the player closed a leg
// when they were in finishable territory. We count an attempt the
// same way in both modes (see `isCheckoutAttempt` below); only the
// "Darts auf Doppel" detail (= number of darts spent in the
// single-dart-double zone) is gated on `doubleOut`, because that
// breakdown only makes sense when a double is required.

/**
 * A turn counts as a "checkout attempt" when there's evidence the
 * player tried to finish the leg on that visit:
 *
 *  - checkoutHit  → they hit it (the leg-winning dart).
 *  - bust && startedScore ≤ 170 → they tried to finish and went over
 *    (in double-out: aimed a double and overshot; in single-out:
 *    aimed at a sector that would have closed the leg and bust the
 *    remaining-1 / negative-remaining check).
 *
 * Plain low-scoring setup visits ("72 remaining → scored 5") are NOT
 * counted in either mode, matching the standard pro-darts notion
 * that the player must have actually engaged with a closing attempt.
 */
const isCheckoutAttempt = (turn: Turn): boolean => {
  if (turn.checkoutHit) return true
  if (turn.bust && turn.startedScore <= 170) return true
  return false
}
// The `doubleOut` parameter is still accepted by both functions for
// API compatibility, but it only affects the `doubleDarts` counter
// (which is a double-out-specific breakdown). Checkout %, attempts
// and hits are computed identically in both modes.
export const calculateBasicStats = (turns: Turn[], _doubleOut = true): BasicStats => {
  void _doubleOut
  const totalPoints = turns.reduce((sum, turn) => sum + (turn.bust ? 0 : turn.points), 0)
  const totalDarts = turns.reduce((sum, turn) => sum + turn.dartsThrown, 0)
  const average3Dart = totalDarts === 0 ? 0 : (totalPoints / totalDarts) * 3
  const highestScore = turns.reduce((max, turn) => Math.max(max, turn.points), 0)
  const checkoutAttempts = turns.filter(isCheckoutAttempt).length
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

export const calculateMatchPlayerStats = (turns: Turn[], doubleOut = true): MatchPlayerStats => {
  const totalPoints = turns.reduce((sum, turn) => sum + (turn.bust ? 0 : turn.points), 0)
  const totalDarts = turns.reduce((sum, turn) => sum + turn.dartsThrown, 0)
  const average = totalDarts === 0 ? 0 : (totalPoints / totalDarts) * 3
  // Checkout-% applies to BOTH modes (see isCheckoutAttempt header).
  // doubleDarts is a double-out-specific breakdown of how many darts
  // were spent in the single-dart-double zone (≤40 or =50); it stays
  // zeroed out for single-out matches because the concept doesn't
  // apply there.
  const checkoutAttempts = turns.filter(isCheckoutAttempt).length
  const checkoutHits = turns.filter((turn) => turn.checkoutHit).length
  const checkoutRate = checkoutAttempts === 0 ? 0 : (checkoutHits / checkoutAttempts) * 100
  const doubleDarts = doubleOut
    ? turns.reduce((sum, turn) => {
        const isDoubleZone = turn.startedScore <= 40 || turn.startedScore === 50
        return isDoubleZone ? sum + turn.dartsThrown : sum
      }, 0)
    : 0
  // Disjoint buckets: every aufnahme is counted in exactly ONE band. A 140
  // counts only in count140Plus, not also in count100Plus. The labels stay
  // "100+ / 140+" out of dart-culture habit, but the numbers are now
  // "100-139", "140-179", etc. so the four counters per player partition
  // the player's >=60 aufnahmen cleanly.
  const count180 = turns.filter((turn) => !turn.bust && turn.points === 180).length
  const count140Plus = turns.filter(
    (turn) => !turn.bust && turn.points >= 140 && turn.points < 180
  ).length
  const count100Plus = turns.filter(
    (turn) => !turn.bust && turn.points >= 100 && turn.points < 140
  ).length
  const count60Plus = turns.filter(
    (turn) => !turn.bust && turn.points >= 60 && turn.points < 100
  ).length
  const highestScore = turns.reduce((max, turn) => Math.max(max, turn.bust ? 0 : turn.points), 0)
  const highestCheckout = turns.reduce((max, turn) => Math.max(max, turn.checkoutValue ?? 0), 0)
  const dartsByLeg = turns.reduce<Record<string, number>>((acc, turn) => {
    acc[turn.legId] = (acc[turn.legId] ?? 0) + turn.dartsThrown
    return acc
  }, {})
  const wonLegDarts = turns
    .filter((turn) => turn.checkoutHit)
    .map((turn) => dartsByLeg[turn.legId] ?? 0)
    .filter((darts) => darts > 0)
  const bestLegDarts = wonLegDarts.length === 0 ? 0 : Math.min(...wonLegDarts)

  return {
    average,
    checkoutRate,
    checkoutAttempts,
    checkoutHits,
    doubleDarts,
    count60Plus,
    count100Plus,
    count140Plus,
    count180,
    totalDarts,
    totalPoints,
    highestScore,
    highestCheckout,
    bestLegDarts
  }
}
