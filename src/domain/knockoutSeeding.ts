import type { StandingsRow } from './tournamentStats'

export interface QualifierEntry {
  playerId: string
  /** 0-based index of the source group */
  groupIndex: number
  /** 1-based rank inside that group (1 = group winner) */
  rankInGroup: number
  points: number
  wins: number
  legsDiff: number
  average: number
}

/**
 * Pick the players that advance from the group stage into a knockout bracket
 * of the requested size.
 *
 * Cases:
 * - bracketSize divides evenly into groupCount → top N from each group
 *   (e.g. 16 / 4 = 4 → top 4 of each group)
 * - bracketSize doesn't divide evenly → top floor(N) from each group, then
 *   fill the remaining slots with the best "rank-(floor(N)+1)" players
 *   across all groups (e.g. 16 / 6 = 2 remainder 4 → top 2 + best 4 thirds)
 *
 * If bracketSize is missing / 0, falls back to the legacy "top 2 per group"
 * behaviour.
 */
export const computeQualifiers = (params: {
  bracketSize?: number
  groupCount: number
  standingsByGroup: Map<number, StandingsRow[]>
}): QualifierEntry[] => {
  const { bracketSize, groupCount, standingsByGroup } = params
  if (groupCount < 1) return []

  // Legacy mode: top 2 per group, no fill-up.
  if (!bracketSize || bracketSize <= 0) {
    const out: QualifierEntry[] = []
    for (let g = 0; g < groupCount; g += 1) {
      const standings = standingsByGroup.get(g) ?? []
      standings.slice(0, 2).forEach((row, idx) => {
        out.push({
          playerId: row.playerId,
          groupIndex: g,
          rankInGroup: idx + 1,
          points: row.points,
          wins: row.wins,
          legsDiff: row.legsDiff,
          average: row.average
        })
      })
    }
    return out
  }

  const baseQualifiers = Math.floor(bracketSize / groupCount)
  const remainingSlots = bracketSize - baseQualifiers * groupCount

  const qualifiers: QualifierEntry[] = []
  const wildcardCandidates: QualifierEntry[] = []

  for (let g = 0; g < groupCount; g += 1) {
    const standings = standingsByGroup.get(g) ?? []
    standings.forEach((row, idx) => {
      const rank = idx + 1
      const entry: QualifierEntry = {
        playerId: row.playerId,
        groupIndex: g,
        rankInGroup: rank,
        points: row.points,
        wins: row.wins,
        legsDiff: row.legsDiff,
        average: row.average
      }
      if (rank <= baseQualifiers) {
        qualifiers.push(entry)
      } else if (rank === baseQualifiers + 1) {
        wildcardCandidates.push(entry)
      }
    })
  }

  if (remainingSlots > 0 && wildcardCandidates.length > 0) {
    wildcardCandidates.sort(
      (a, b) =>
        b.points - a.points ||
        b.wins - a.wins ||
        b.legsDiff - a.legsDiff ||
        b.average - a.average
    )
    qualifiers.push(...wildcardCandidates.slice(0, remainingSlots))
  }

  return qualifiers
}

const compareQualifierStrength = (a: QualifierEntry, b: QualifierEntry) =>
  a.rankInGroup - b.rankInGroup ||
  b.points - a.points ||
  b.wins - a.wins ||
  b.legsDiff - a.legsDiff ||
  b.average - a.average

const nextPowerOfTwo = (value: number) => {
  let result = 1
  while (result < value) result *= 2
  return result
}

/**
 * Standard bracket-seed positions for a power-of-two bracket. e.g. for size
 * 16 this returns [1, 16, 8, 9, 4, 13, 5, 12, 2, 15, 7, 10, 3, 14, 6, 11].
 * Position pairs (0,1), (2,3), ... each form an R1 match in standard tennis
 * seeding so #1 plays #16, #8 plays #9 next to it, etc.
 */
const seedSlots = (size: number): number[] => {
  if (size <= 1) return [1]
  const previous = seedSlots(size / 2)
  const top = size + 1
  const result: number[] = []
  previous.forEach((seed) => {
    result.push(seed)
    result.push(top - seed)
  })
  return result
}

/**
 * Build the first round of a knockout bracket from a set of qualifiers,
 * trying hard to avoid pairing players from the same group in R1.
 *
 * Tier rule:
 * - the strongest qualifier per group ("rank 1") meets the weakest
 *   qualifier from a DIFFERENT group ("rank N"), the second-best meets
 *   the second-weakest of a different group, and so on.
 *
 * Returns:
 * - `pairs`: ordered [a, b] pairs ready to be inserted as R1 matches.
 *   `b === null` means a bye through to R2.
 * - `seedOrder`: the input qualifiers re-sorted into the standard
 *   seeded slot order, useful for downstream UI hints.
 */
export const buildSeededKnockoutPairsAvoidingSameGroup = (
  qualifiers: QualifierEntry[]
): { pairs: Array<[string, string | null]>; seedOrder: Array<QualifierEntry | null> } => {
  if (qualifiers.length < 2) return { pairs: [], seedOrder: qualifiers }

  const bracketSize = nextPowerOfTwo(qualifiers.length)

  // Bucket by rank-in-group so we know which "tier" each player is in.
  const byRank = new Map<number, QualifierEntry[]>()
  qualifiers.forEach((q) => {
    const bucket = byRank.get(q.rankInGroup) ?? []
    bucket.push(q)
    byRank.set(q.rankInGroup, bucket)
  })
  // Sort each rank bucket by strength so the strongest rank-1 player goes
  // to seed-slot #1, etc.
  byRank.forEach((list) =>
    list.sort(
      (a, b) =>
        b.points - a.points ||
        b.wins - a.wins ||
        b.legsDiff - a.legsDiff ||
        b.average - a.average
    )
  )

  // Walk the bracket from outside in (seed #1 vs #last, seed #2 vs
  // #second-last, ...). For each pair, draw one player from the "strong"
  // tier and one from the "weak" tier, both from DIFFERENT groups when
  // possible.
  const rankBucketsAsc: QualifierEntry[][] = [...byRank.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, list]) => list)
  // Strong-half and weak-half tiers: rank 1 with rank N, rank 2 with rank
  // N-1, etc.
  const tierCount = rankBucketsAsc.length
  const strongTiers = rankBucketsAsc.slice(0, Math.ceil(tierCount / 2))
  const weakTiers = rankBucketsAsc.slice(Math.ceil(tierCount / 2)).reverse()

  // Flattened strong queue: strongest-tier first (rank 1), then rank 2, ...
  const strongQueue: QualifierEntry[] = strongTiers.flatMap((tier) => [...tier])
  const weakQueue: QualifierEntry[] = weakTiers.flatMap((tier) => [...tier])

  // Pull the next weak entry whose group differs from `excludeGroup`. If
  // none fits, fall back to the first remaining entry so we still build a
  // complete bracket — even if a same-group pair sneaks in, the rest of R1
  // stays cross-group.
  const pullWeak = (excludeGroup: number): QualifierEntry | null => {
    const idx = weakQueue.findIndex((entry) => entry.groupIndex !== excludeGroup)
    if (idx === -1) {
      return weakQueue.shift() ?? null
    }
    return weakQueue.splice(idx, 1)[0] ?? null
  }

  const pairs: Array<[QualifierEntry | null, QualifierEntry | null]> = []
  const slotCount = bracketSize / 2
  for (let i = 0; i < slotCount; i += 1) {
    const strong = strongQueue.shift() ?? null
    const weak = strong ? pullWeak(strong.groupIndex) : weakQueue.shift() ?? null
    pairs.push([strong, weak])
  }

  // Reorder the R1 pairs into the canonical bracket layout (#1 vs #16,
  // #8 vs #9, #4 vs #13, ...) so the bracket renderer places matches
  // correctly in the visual tree.
  const order = seedSlots(slotCount)
  const reorderedPairs: Array<[string, string | null]> = order.map((seedIndex) => {
    const pair = pairs[seedIndex - 1]
    if (!pair) return ['', null] as [string, string | null]
    const [a, b] = pair
    return [a?.playerId ?? '', b?.playerId ?? null]
  })

  // Flat seed order for UI / downstream consumers.
  const seedOrder: Array<QualifierEntry | null> = []
  order.forEach((seedIndex) => {
    const pair = pairs[seedIndex - 1]
    seedOrder.push(pair?.[0] ?? null)
    seedOrder.push(pair?.[1] ?? null)
  })

  // Drop empty-strong (no qualifier) shells that the renderer doesn't need
  // — those happen when qualifiers.length isn't a clean power of two.
  const cleanPairs = reorderedPairs.filter(([a]) => a !== '')

  // Suppress unused warning while keeping the helper handy for inspection.
  void compareQualifierStrength

  return { pairs: cleanPairs, seedOrder }
}
