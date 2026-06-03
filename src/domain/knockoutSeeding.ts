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

const compareQualifierWeakness = (a: QualifierEntry, b: QualifierEntry) =>
  b.rankInGroup - a.rankInGroup ||
  a.points - b.points ||
  a.wins - b.wins ||
  a.legsDiff - b.legsDiff ||
  a.average - b.average

const nextPowerOfTwo = (value: number) => {
  let result = 1
  while (result < value) result *= 2
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
  const slotCount = bracketSize / 2

  const remaining = qualifiers.slice().sort(compareQualifierStrength)
  const rankValues = Array.from(new Set(qualifiers.map((qualifier) => qualifier.rankInGroup))).sort(
    (a, b) => a - b
  )
  const wildcardRanks = rankValues.filter((rank) => rank > 2)

  const removeEntry = (entry: QualifierEntry) => {
    const index = remaining.findIndex((candidate) => candidate.playerId === entry.playerId)
    if (index >= 0) remaining.splice(index, 1)
  }

  const preferredRankIndex = (preferredRanks: number[], candidate: QualifierEntry) => {
    const index = preferredRanks.indexOf(candidate.rankInGroup)
    return index === -1 ? Number.MAX_SAFE_INTEGER : index
  }

  const pickOpponent = (
    anchor: QualifierEntry,
    preferredRanks: number[],
    strictPreferred: boolean
  ): QualifierEntry | null => {
    const candidates = remaining.filter((candidate) => {
      if (candidate.playerId === anchor.playerId) return false
      return !strictPreferred || preferredRanks.includes(candidate.rankInGroup)
    })
    if (candidates.length === 0) return null

    candidates.sort((a, b) => {
      const sameGroupScore =
        Number(a.groupIndex === anchor.groupIndex) - Number(b.groupIndex === anchor.groupIndex)
      if (sameGroupScore !== 0) return sameGroupScore

      const preferredScore =
        Number(!preferredRanks.includes(a.rankInGroup)) -
        Number(!preferredRanks.includes(b.rankInGroup))
      if (preferredScore !== 0) return preferredScore

      const preferredOrder =
        preferredRankIndex(preferredRanks, a) - preferredRankIndex(preferredRanks, b)
      if (preferredOrder !== 0) return preferredOrder

      return compareQualifierWeakness(a, b)
    })

    return candidates[0] ?? null
  }

  const pairEntries: Array<[QualifierEntry, QualifierEntry | null]> = []
  const addPair = (anchor: QualifierEntry, opponent: QualifierEntry | null) => {
    removeEntry(anchor)
    if (opponent) removeEntry(opponent)
    pairEntries.push([anchor, opponent])
  }

  // First pass: group winners should preferably meet one of the best
  // third-placed qualifiers. For 6x6 -> Top 16 this creates exactly the
  // intended "1st vs 3rd" pairings while avoiding same-group rematches.
  if (wildcardRanks.length > 0) {
    const groupWinners = remaining
      .filter((qualifier) => qualifier.rankInGroup === 1)
      .sort(compareQualifierStrength)
    groupWinners.forEach((winner) => {
      if (pairEntries.length >= slotCount) return
      if (!remaining.some((entry) => entry.playerId === winner.playerId)) return
      const opponent = pickOpponent(winner, wildcardRanks, true)
      if (opponent) addPair(winner, opponent)
    })
  }

  while (remaining.length > 0 && pairEntries.length < slotCount) {
    const anchor = remaining[0]
    const preferredRanks =
      anchor.rankInGroup === 1
        ? [...wildcardRanks, 2]
        : anchor.rankInGroup === 2
          ? [1, 2, ...wildcardRanks]
          : [1, 2, ...wildcardRanks]
    const opponent = pickOpponent(anchor, preferredRanks, false)
    addPair(anchor, opponent)
  }

  const pairs: Array<[string, string | null]> = pairEntries.map(([a, b]) => [
    a.playerId,
    b?.playerId ?? null
  ])
  const seedOrder = pairEntries.flatMap(([a, b]) => [a, b])

  return { pairs, seedOrder }
}
