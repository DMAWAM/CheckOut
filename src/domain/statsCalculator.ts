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
// when they were in finishable territory. We attribute attempts and
// hits per visit based on outcome AND on how many darts the player
// used compared to the theoretical minimum (see `visitCheckoutStats`
// below); only the "Darts auf Doppel" detail (= number of darts
// spent in the single-dart-double zone) is gated on `doubleOut`,
// because that breakdown only makes sense when a double is required.

// All values reachable with a single dart in a standard 20-sector
// dartboard: singles 1–20, doubles 2–40, triples 3–60, SBull (25)
// and Bull (50). Used to derive the minimum-darts-to-checkout for
// any remaining score.
const SINGLE_DART_VALUES: ReadonlySet<number> = (() => {
  const set = new Set<number>()
  for (let i = 1; i <= 20; i += 1) {
    set.add(i)
    set.add(i * 2)
    set.add(i * 3)
  }
  set.add(25)
  set.add(50)
  return set
})()

// Doubles + Bull — the only legal finishing darts in double-out.
const DOUBLE_FINISH_VALUES: ReadonlySet<number> = (() => {
  const set = new Set<number>()
  for (let i = 1; i <= 20; i += 1) set.add(i * 2)
  set.add(50)
  return set
})()

const minDartsCache = new Map<string, number>()

/**
 * Minimum number of darts mathematically required to close the leg
 * from `score`. In double-out the last dart must be a double; in
 * single-out any segment counts. Returns `Infinity` for scores that
 * can't be closed in a single visit (>180 in double-out, similarly
 * unreachable totals in single-out). Memoised because the same
 * scores recur every match.
 */
const minDartsForCheckout = (score: number, doubleOut: boolean): number => {
  if (score < 2 || score > 180) return Infinity
  const key = `${score}|${doubleOut ? 'd' : 's'}`
  const cached = minDartsCache.get(key)
  if (cached !== undefined) return cached

  const finishers = doubleOut ? DOUBLE_FINISH_VALUES : SINGLE_DART_VALUES
  let result = Infinity

  if (finishers.has(score)) {
    result = 1
  } else {
    for (const first of SINGLE_DART_VALUES) {
      if (first >= score) continue
      if (finishers.has(score - first)) {
        result = 2
        break
      }
    }
    if (result === Infinity) {
      outer: for (const first of SINGLE_DART_VALUES) {
        if (first >= score) continue
        for (const second of SINGLE_DART_VALUES) {
          if (first + second >= score) continue
          if (finishers.has(score - first - second)) {
            result = 3
            break outer
          }
        }
      }
    }
  }

  minDartsCache.set(key, result)
  return result
}

/**
 * Per-visit (attempts, hits) contribution to the checkout-% stat.
 *
 *  - Finishing visit (checkoutHit):
 *      attempts = 1 + (dartsThrown − minDartsRequired). Each "excess"
 *      dart counts as a missed attempt — e.g. closing 52 in 3 darts
 *      when min = 2 yields 1 hit + 1 miss = 1/2 = 50%. Closing in the
 *      minimum yields 1/1 = 100%.
 *  - Bust visit at startedScore ≤ 170:
 *      attempts = dartsThrown (every dart was an attempt that didn't
 *      land), hits = 0. Same idea as a finishing visit with maximum
 *      misses, just no hit at the end.
 *  - Anything else (plain scoring / setup visit) contributes 0/0.
 */
const visitCheckoutStats = (
  turn: Turn,
  doubleOut: boolean
): { attempts: number; hits: number } => {
  if (turn.checkoutHit) {
    const min = minDartsForCheckout(turn.startedScore, doubleOut)
    const usable = Number.isFinite(min) ? min : 1
    const excess = Math.max(0, turn.dartsThrown - usable)
    return { attempts: 1 + excess, hits: 1 }
  }
  if (turn.bust && turn.startedScore <= 170) {
    return { attempts: Math.max(1, turn.dartsThrown), hits: 0 }
  }
  return { attempts: 0, hits: 0 }
}

const aggregateCheckout = (turns: Turn[], doubleOut: boolean) => {
  let attempts = 0
  let hits = 0
  for (const turn of turns) {
    const contribution = visitCheckoutStats(turn, doubleOut)
    attempts += contribution.attempts
    hits += contribution.hits
  }
  return { attempts, hits }
}
// `doubleOut` now affects BOTH the checkout-attempt counting (because
// the minimum darts needed to close depends on whether a double is
// required) and the `doubleDarts` breakdown (which is only meaningful
// in double-out matches).
export const calculateBasicStats = (turns: Turn[], doubleOut = true): BasicStats => {
  const totalPoints = turns.reduce((sum, turn) => sum + (turn.bust ? 0 : turn.points), 0)
  const totalDarts = turns.reduce((sum, turn) => sum + turn.dartsThrown, 0)
  const average3Dart = totalDarts === 0 ? 0 : (totalPoints / totalDarts) * 3
  const highestScore = turns.reduce((max, turn) => Math.max(max, turn.points), 0)
  const { attempts: checkoutAttempts, hits: checkoutHits } = aggregateCheckout(turns, doubleOut)
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
  // Checkout-% applies to BOTH modes (see visitCheckoutStats above).
  // doubleDarts is a double-out-specific breakdown of how many darts
  // were spent in the single-dart-double zone (≤40 or =50); it stays
  // zeroed out for single-out matches because the concept doesn't
  // apply there.
  const { attempts: checkoutAttempts, hits: checkoutHits } = aggregateCheckout(turns, doubleOut)
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
