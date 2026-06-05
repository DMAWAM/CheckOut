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

// Checkout-% is only a meaningful skill metric in double-out matches:
// the player has to land on a specific double to finish the leg, so
// "attempts" and "hits" measure something real. In single-out matches
// any dart that drops the remaining score to 0 wins the leg, so the
// concept doesn't apply — counting them would yield misleading numbers
// like "0% on 0/3" for a player who never aimed at a double in the
// first place. Pass `doubleOut` and the calculator returns zero
// checkout counters when the match wasn't played to a double, which
// the UI then renders as "—" instead of "0%".

/**
 * A turn only counts as a "checkout attempt" if the player
 * demonstrably threw at a double during the visit. Without
 * per-dart data we can only know this from the turn outcome:
 *
 *  - checkoutHit  → they hit a double to finish the leg.
 *  - bust && startedScore ≤ 170 → they tried to finish and went
 *    over (e.g. on 32 they aimed D16, hit S16, then tried to
 *    finish on a different double and overshot).
 *
 * Plain low-scoring visits ("72 remaining → scored 5") are NOT
 * counted, which matches the standard pro-darts definition. Before
 * this fix the calculator counted every visit with startedScore ≤ 170
 * as an attempt, so a player's checkout-% dropped after a setup-only
 * scoring visit even though no double was thrown — the bug the user
 * reported (29% → 25% after scoring 5 from a 72 rest).
 */
const isCheckoutAttempt = (turn: Turn): boolean => {
  if (turn.checkoutHit) return true
  if (turn.bust && turn.startedScore <= 170) return true
  return false
}
export const calculateBasicStats = (turns: Turn[], doubleOut = true): BasicStats => {
  const totalPoints = turns.reduce((sum, turn) => sum + (turn.bust ? 0 : turn.points), 0)
  const totalDarts = turns.reduce((sum, turn) => sum + turn.dartsThrown, 0)
  const average3Dart = totalDarts === 0 ? 0 : (totalPoints / totalDarts) * 3
  const highestScore = turns.reduce((max, turn) => Math.max(max, turn.points), 0)
  const checkoutAttempts = doubleOut
    ? turns.filter(isCheckoutAttempt).length
    : 0
  const checkoutHits = doubleOut ? turns.filter((turn) => turn.checkoutHit).length : 0
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
  // Single-out → no checkout-% (see header comment). doubleDarts counts
  // darts thrown in the double-zone score range (≤40 or =50); also
  // meaningless without a double-out rule, so we zero it out too.
  const checkoutAttempts = doubleOut
    ? turns.filter(isCheckoutAttempt).length
    : 0
  const checkoutHits = doubleOut ? turns.filter((turn) => turn.checkoutHit).length : 0
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
